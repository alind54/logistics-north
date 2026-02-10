import { test, expect, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

// ============================================================================
// Performance instrumentation
// ============================================================================

const timings: Array<{ action: string; durationMs: number; category: string }> = [];

async function perf(action: string, category: string, fn: () => Promise<void>): Promise<number> {
  const start = Date.now();
  await fn();
  const duration = Date.now() - start;
  timings.push({ action, durationMs: duration, category });
  return duration;
}

async function perfApi(
  page: Page,
  action: string,
  category: string,
  urlPattern: string | RegExp,
  triggerFn: () => Promise<void>,
): Promise<number> {
  const start = Date.now();
  await Promise.all([page.waitForResponse(urlPattern), triggerFn()]);
  const duration = Date.now() - start;
  timings.push({ action, durationMs: duration, category });
  return duration;
}

// ============================================================================
// Helpers
// ============================================================================

const PROD_CREDS = { email: 'manager@test.com', password: '12345678Aa' };
const TEST_PREFIX = 'PROD-TEST-';

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(PROD_CREDS.email);
  await page.getByLabel('Password').fill(PROD_CREDS.password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/board/, { timeout: 30_000 });
}

// ============================================================================
// AUTH FLOW
// ============================================================================

test.describe.serial('Auth Flow', () => {
  test('Login page renders', async ({ page }) => {
    await perf('login-page-load', 'auth', async () => {
      await page.goto('/');
      await expect(page).toHaveURL(/\/login/);
      await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
    });
  });

  test('Invalid credentials show error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('invalid@example.com');
    await page.getByLabel('Password').fill('wrongpassword123');
    await perf('login-invalid-attempt', 'auth', async () => {
      await page.getByRole('button', { name: 'Sign In' }).click();
      await expect(page.getByText('Invalid email or password')).toBeVisible();
    });
  });

  test('Successful login and redirect', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(PROD_CREDS.email);
    await page.getByLabel('Password').fill(PROD_CREDS.password);
    await perfApi(page, 'login-api', 'auth', /\/api\/auth\/login/, async () => {
      await page.getByRole('button', { name: 'Sign In' }).click();
    });
    await expect(page).toHaveURL(/\/board/);
    await expect(page.getByText('Project Board')).toBeVisible();
  });

  test('Logout flow', async ({ page }) => {
    await login(page);
    await perfApi(page, 'logout-api', 'auth', /\/api\/auth\/logout/, async () => {
      await page.getByRole('button', { name: 'Sign Out' }).click();
    });
    await expect(page).toHaveURL(/\/login/);
  });
});

// ============================================================================
// BOARD PAGE
// ============================================================================

test.describe.serial('Board Page', () => {
  test('Board loads with columns', async ({ page }) => {
    await login(page);
    await perf('board-page-load', 'board', async () => {
      await expect(page.getByText('Project Board')).toBeVisible();
      // Verify at least one stage column renders
      await expect(page.locator('[role="region"]').first()).toBeVisible();
    });
  });

  test('Switch to CONTRACT flow', async ({ page }) => {
    await login(page);
    await perfApi(page, 'board-switch-contract', 'board', /\/api\/board\?flowType=CONTRACT/, async () => {
      await page.locator('select').first().selectOption('CONTRACT');
    });
    // Verify columns reloaded (Contract-specific stages)
    await expect(page.locator('[role="region"]').first()).toBeVisible();
  });

  test('Switch back to ORDER flow', async ({ page }) => {
    await login(page);
    // Switch to CONTRACT first
    await page.locator('select').first().selectOption('CONTRACT');
    await page.waitForResponse(/\/api\/board/);
    // Now switch back
    await perfApi(page, 'board-switch-order', 'board', /\/api\/board\?flowType=ORDER/, async () => {
      await page.locator('select').first().selectOption('ORDER');
    });
    await expect(page.locator('[role="region"]').first()).toBeVisible();
  });

  test('Create a new request', async ({ page }) => {
    await login(page);
    const testDesc = `${TEST_PREFIX}${Date.now()}`;

    await page.getByRole('button', { name: 'New Project' }).click();
    await expect(page.getByText('Create New Project')).toBeVisible();

    await page.getByLabel('Description *').fill(testDesc);
    await page.getByLabel('Notes').fill('Automated production test');
    await page.getByLabel('Priority').selectOption('HIGH');

    await perfApi(page, 'create-request', 'board', /\/api\/requests/, async () => {
      await page.getByRole('button', { name: 'Create Project' }).click();
    });

    await expect(page.getByText('Create New Project')).not.toBeVisible();
    // Verify card appears on board
    await expect(page.getByText(testDesc.substring(0, 50))).toBeVisible({ timeout: 10_000 });
  });

  test('Verify card renders with details', async ({ page }) => {
    await login(page);
    await perf('verify-card-details', 'board', async () => {
      // Check that MRF numbers are visible (format MRF-XXX)
      await expect(page.locator('text=/MRF-\\d+/').first()).toBeVisible();
    });
  });

  test('Move request via button', async ({ page }) => {
    await login(page);
    // Find a PROD-TEST card's Move button
    const card = page.locator('.group').filter({ hasText: TEST_PREFIX }).first();
    if (await card.isVisible()) {
      await card.hover();
      const moveBtn = card.getByRole('button', { name: 'Move' });
      await moveBtn.click();
      // Click the first stage in the dropdown
      const stageOption = page.locator('.absolute button').first();
      if (await stageOption.isVisible()) {
        await perfApi(page, 'move-request-button', 'board', /\/move-stage/, async () => {
          await stageOption.click();
        });
      }
    }
  });

  test('Delete request', async ({ page }) => {
    await login(page);
    // Find a PROD-TEST card with delete button
    const card = page.locator('.group').filter({ hasText: TEST_PREFIX }).first();
    if (await card.isVisible()) {
      await card.hover();
      const deleteBtn = card.getByRole('button', { name: 'Delete' });
      if (await deleteBtn.isVisible()) {
        page.on('dialog', (dialog) => dialog.accept());
        await perfApi(page, 'delete-request', 'board', /\/api\/requests\//, async () => {
          await deleteBtn.click();
        });
      }
    }
  });

  test('Clear Done (if available)', async ({ page }) => {
    await login(page);
    const clearBtn = page.getByRole('button', { name: /Clear Done/ });
    if (await clearBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      page.on('dialog', (dialog) => dialog.accept());
      await perfApi(page, 'clear-done', 'board', /\/api\/requests\/clear-done/, async () => {
        await clearBtn.click();
      });
    }
  });
});

// ============================================================================
// REQUESTS LIST PAGE
// ============================================================================

test.describe.serial('Requests List Page', () => {
  test('List page loads', async ({ page }) => {
    await login(page);
    await perf('requests-list-load', 'requests', async () => {
      await page.getByRole('link', { name: 'Projects' }).click();
      await expect(page).toHaveURL(/\/requests/);
      await expect(page.getByText('Projects')).toBeVisible();
    });
  });

  test('Search filter', async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: 'Projects' }).click();
    await expect(page).toHaveURL(/\/requests/);

    await perf('filter-search', 'requests', async () => {
      const searchInput = page.getByPlaceholder('Search description or notes...');
      await searchInput.click();
      await searchInput.pressSequentially('test', { delay: 50 });
      // Filters auto-apply via 300ms debounce — wait for filter chip or URL update
      await expect(page.getByText('Search: "test"')).toBeVisible({ timeout: 15_000 });
    });
  });

  test('Priority filter', async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: 'Projects' }).click();
    await expect(page).toHaveURL(/\/requests/);

    await perf('filter-priority', 'requests', async () => {
      // Trigger React onChange by selecting via evaluate + dispatchEvent
      const prioritySelect = page.locator('select').nth(1);
      await prioritySelect.evaluate((el: HTMLSelectElement) => {
        el.value = 'HIGH';
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
      // Verify filter chip appears (confirms React state updated and router.push fired)
      await expect(page.getByText('Priority: HIGH')).toBeVisible({ timeout: 15_000 });
    });
  });

  test('Stage filter', async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: 'Projects' }).click();
    await expect(page).toHaveURL(/\/requests/);

    await perf('filter-stage', 'requests', async () => {
      const stageSelect = page.locator('select').first();
      const options = await stageSelect.locator('option').allTextContents();
      if (options.length > 1) {
        const optionValues = await stageSelect.locator('option').evaluateAll(
          (els: HTMLOptionElement[]) => els.map(e => e.value)
        );
        const targetValue = optionValues[1] ?? '';
        await stageSelect.evaluate((el: HTMLSelectElement, val: string) => {
          el.value = val;
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, targetValue);
        // Verify filter chip appears
        await expect(page.getByText(/Stage:/)).toBeVisible({ timeout: 15_000 });
      }
    });
  });

  test('Due date filter', async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: 'Projects' }).click();
    await expect(page).toHaveURL(/\/requests/);

    await perf('filter-due-date', 'requests', async () => {
      const dueAfterInput = page.locator('input[type="date"]').first();
      await dueAfterInput.fill('2024-01-01');
      // Verify filter chip appears (date inputs trigger onChange directly)
      await expect(page.getByText('Due after: 2024-01-01')).toBeVisible({ timeout: 15_000 });
    });
  });

  test('Clear filters', async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: 'Projects' }).click();
    // Apply a filter first (auto-applies via debounce)
    const searchInput = page.getByPlaceholder('Search description or notes...');
    await searchInput.click();
    await searchInput.pressSequentially('something', { delay: 50 });
    await expect(page.getByText('Search: "something"')).toBeVisible({ timeout: 15_000 });

    await perf('clear-filters', 'requests', async () => {
      await page.getByRole('button', { name: 'Clear' }).click();
      await expect(page).not.toHaveURL(/query=/);
    });
  });

  test('Pagination', async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: 'Projects' }).click();
    await expect(page).toHaveURL(/\/requests/);

    const nextButton = page.getByRole('button', { name: 'Next' });
    if (await nextButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      if (!(await nextButton.isDisabled())) {
        await perf('pagination-next', 'requests', async () => {
          await nextButton.click();
          await expect(page).toHaveURL(/page=2/);
        });
      }
    }
  });
});

// ============================================================================
// REQUEST DETAIL PAGE
// ============================================================================

test.describe.serial('Request Detail Page', () => {
  let testRequestId: string | null = null;

  test('Create test request and open detail', async ({ page }) => {
    await login(page);
    const testDesc = `${TEST_PREFIX}DETAIL-${Date.now()}`;

    // Create a request
    await page.getByRole('button', { name: 'New Project' }).click();
    await page.getByLabel('Description *').fill(testDesc);
    await page.getByLabel('Priority').selectOption('HIGH');
    await page.getByRole('button', { name: 'Create Project' }).click();
    await expect(page.getByText('Create New Project')).not.toBeVisible();

    // Click into the request
    await perf('request-detail-load', 'detail', async () => {
      await page.getByText(testDesc.substring(0, 50)).click();
      await expect(page).toHaveURL(/\/requests\//);
    });

    // Extract request ID from URL
    const url = page.url();
    const match = url.match(/\/requests\/([a-f0-9-]+)/);
    testRequestId = match ? match[1]! : null;

    // Verify details visible
    await expect(page.locator('text=/MRF-\\d+/')).toBeVisible();
  });

  test('Timeline tab', async ({ page }) => {
    await login(page);
    if (!testRequestId) return;
    await page.goto(`/requests/${testRequestId}`);

    await perf('timeline-tab-load', 'detail', async () => {
      await page.getByRole('button', { name: 'Timeline' }).click();
      // Should show at least the initial stage entry (use .first() — MRF appears multiple times)
      await expect(page.getByText('MRF').first()).toBeVisible();
    });
  });

  test('Move stage via dropdown', async ({ page }) => {
    await login(page);
    if (!testRequestId) return;
    await page.goto(`/requests/${testRequestId}`);

    // Select a transition from the Move to... dropdown
    const moveSelect = page.locator('select').filter({ has: page.getByText('Move to...') });
    if (await moveSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      const options = await moveSelect.locator('option').allTextContents();
      if (options.length > 1) {
        await moveSelect.selectOption({ index: 1 });
        await perfApi(page, 'move-stage-detail', 'detail', /\/move-stage/, async () => {
          await page.getByRole('button', { name: 'Move' }).click();
        });
        // Wait for page to refresh
        await page.waitForTimeout(2000);
      }
    }
  });

  test('Edit request fields', async ({ page }) => {
    await login(page);
    if (!testRequestId) return;
    await page.goto(`/requests/${testRequestId}`);

    const editBtn = page.getByRole('button', { name: 'Edit' });
    if (await editBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editBtn.click();

      // Modify fields
      const descInput = page.getByLabel('Description');
      if (await descInput.isVisible()) {
        await descInput.fill(`${TEST_PREFIX}EDITED-${Date.now()}`);
      }

      await perfApi(page, 'edit-request', 'detail', /\/api\/requests\//, async () => {
        await page.getByRole('button', { name: 'Save Changes' }).click();
      });
    }
  });

  test('Documents tab', async ({ page }) => {
    await login(page);
    if (!testRequestId) return;
    await page.goto(`/requests/${testRequestId}`);

    await perf('documents-tab-load', 'detail', async () => {
      await page.getByRole('button', { name: /Documents/ }).click();
      // The tab content should render (may or may not have attachments)
      await page.waitForTimeout(1000);
    });
  });

  test('Upload attachment', async ({ page }) => {
    await login(page);
    if (!testRequestId) return;
    await page.goto(`/requests/${testRequestId}`);

    // Create test fixture file
    const tmpDir = path.join(process.cwd(), 'e2e', 'fixtures');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const testFile = path.join(tmpDir, 'prod-test-upload.txt');
    fs.writeFileSync(testFile, 'Production E2E test file content');

    await page.getByRole('button', { name: /Documents/ }).click();
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await fileInput.setInputFiles(testFile);
      const uploadBtn = page.getByRole('button', { name: 'Upload' });
      if (await uploadBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await perfApi(page, 'upload-attachment', 'detail', /\/attachments/, async () => {
          await uploadBtn.click();
        });
      }
    }

    // Cleanup fixture
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
  });

  test('Activity tab', async ({ page }) => {
    await login(page);
    if (!testRequestId) return;
    await page.goto(`/requests/${testRequestId}`);

    const activityTab = page.getByRole('button', { name: 'Activity' });
    if (await activityTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await perf('activity-tab-load', 'detail', async () => {
        await activityTab.click();
        await page.waitForTimeout(1000);
      });
    }
  });

  test('Cleanup: delete test request', async ({ page }) => {
    if (!testRequestId) return;
    await login(page);
    // Delete via API to clean up
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === 'request-tracker-session');
    if (sessionCookie) {
      await page.request.delete(`/api/requests/${testRequestId}`, {
        headers: { Cookie: `request-tracker-session=${sessionCookie.value}` },
      });
    }
  });
});

// ============================================================================
// TODOS PAGE
// ============================================================================

test.describe.serial('Todos Page', () => {
  test('Todos page loads', async ({ page }) => {
    await login(page);
    await perf('todos-page-load', 'todos', async () => {
      await page.getByRole('link', { name: 'To-Do List' }).click();
      await expect(page.getByText('To-Do List')).toBeVisible();
    });
  });

  test('Create a todo', async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: 'To-Do List' }).click();
    await expect(page.getByText('To-Do List')).toBeVisible();

    await page.getByRole('button', { name: 'New To-Do' }).click();
    const taskInput = page.getByPlaceholder('What needs to be done?');
    await taskInput.fill(`${TEST_PREFIX}TODO-${Date.now()}`);

    await perfApi(page, 'create-todo', 'todos', /\/api\/todos/, async () => {
      await page.getByRole('button', { name: 'Add' }).click();
    });
  });

  test('Toggle todo complete', async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: 'To-Do List' }).click();
    await expect(page.getByText('To-Do List')).toBeVisible();

    const checkbox = page.getByLabel('Mark complete').first();
    if (await checkbox.isVisible({ timeout: 5000 }).catch(() => false)) {
      await perfApi(page, 'toggle-todo', 'todos', /\/api\/todos\//, async () => {
        await checkbox.click();
      });
    }
  });

  test('Delete todo', async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: 'To-Do List' }).click();
    await expect(page.getByText('To-Do List')).toBeVisible();

    // Find a PROD-TEST todo and delete it
    const todoItem = page.locator('li, div').filter({ hasText: TEST_PREFIX }).first();
    if (await todoItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      const deleteBtn = todoItem.getByRole('button', { name: 'Delete' });
      if (await deleteBtn.isVisible()) {
        page.on('dialog', (dialog) => dialog.accept());
        await perfApi(page, 'delete-todo', 'todos', /\/api\/todos\//, async () => {
          await deleteBtn.click();
        });
      }
    }
  });

  test('Clear completed (if available)', async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: 'To-Do List' }).click();
    await expect(page.getByText('To-Do List')).toBeVisible();

    const clearBtn = page.getByRole('button', { name: /Clear Completed/ });
    if (await clearBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      page.on('dialog', (dialog) => dialog.accept());
      await perfApi(page, 'clear-completed-todos', 'todos', /\/api\/todos\/clear-completed/, async () => {
        await clearBtn.click();
      });
    }
  });
});

// ============================================================================
// DASHBOARD
// ============================================================================

test.describe('Dashboard Page', () => {
  test('Dashboard loads with all sections', async ({ page }) => {
    await login(page);
    await perf('dashboard-load', 'dashboard', async () => {
      await page.getByRole('link', { name: 'Dashboard' }).click();
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.getByText('Dashboard')).toBeVisible();
      await expect(page.getByText('Total Projects')).toBeVisible();
      await expect(page.getByText('Overdue')).toBeVisible();
      await expect(page.getByText('Active Stages')).toBeVisible();
      await expect(page.getByText('Urgent Projects')).toBeVisible();
    });
  });

  test('Priority distribution', async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await perf('priority-distribution', 'dashboard', async () => {
      await expect(page.getByText('Priority Distribution')).toBeVisible();
    });
  });

  test('Stage distribution', async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await perf('stage-distribution', 'dashboard', async () => {
      await expect(page.getByText('Projects by Stage')).toBeVisible();
    });
  });

  test('CSV export', async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    const exportBtn = page.getByRole('link', { name: /Export/ }).or(page.getByRole('button', { name: /Export/ }));
    if (await exportBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await perf('csv-export', 'dashboard', async () => {
        const [download] = await Promise.all([
          page.waitForEvent('download').catch(() => null),
          exportBtn.click(),
        ]);
        if (download) {
          expect(download.suggestedFilename()).toContain('.csv');
        }
      });
    }
  });
});

// ============================================================================
// ADMIN PANEL
// ============================================================================

test.describe.serial('Admin Panel', () => {
  test('Admin panel loads', async ({ page }) => {
    await login(page);
    await perf('admin-load', 'admin', async () => {
      await page.getByRole('link', { name: 'Admin' }).click();
      await expect(page).toHaveURL(/\/admin/);
      await expect(page.getByRole('heading', { name: 'Admin Panel' })).toBeVisible({ timeout: 30_000 });
      await expect(page.getByRole('button', { name: 'Stages' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Transitions' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Tags' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Users' })).toBeVisible();
    });
  });

  test('Stages tab', async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: 'Admin' }).click();
    await expect(page).toHaveURL(/\/admin/);

    await perf('stages-tab', 'admin', async () => {
      await expect(page.getByRole('heading', { name: 'Workflow Stages' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Add Stage' })).toBeVisible();
      await expect(page.getByText('MRF').first()).toBeVisible();
    });
  });

  test('Transitions tab', async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: 'Admin' }).click();
    await expect(page).toHaveURL(/\/admin/);

    await perf('transitions-tab', 'admin', async () => {
      await page.getByRole('button', { name: 'Transitions' }).click();
      await expect(page.getByText('Define allowed stage-to-stage transitions')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Add Transition' })).toBeVisible();
    });
  });

  test('Tags CRUD', async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: 'Admin' }).click();
    await page.getByRole('button', { name: 'Tags' }).click();
    await expect(page.getByText('Manage tags for categorizing requests')).toBeVisible();

    const tagName = `${TEST_PREFIX}TAG-${Date.now()}`;

    // Create tag
    await page.getByRole('button', { name: 'Add Tag' }).click();
    await page.getByPlaceholder('Tag name').fill(tagName);
    await perfApi(page, 'create-tag', 'admin', /\/api\/admin\/tags/, async () => {
      await page.getByRole('button', { name: 'Create' }).click();
    });
    await expect(page.getByText(tagName)).toBeVisible();

    // Delete tag
    const tagContainer = page.locator('div').filter({ hasText: tagName }).last();
    const deleteBtn = tagContainer.getByRole('button', { name: 'Delete' });
    if (await deleteBtn.isVisible()) {
      page.on('dialog', (dialog) => dialog.accept());
      await perfApi(page, 'delete-tag', 'admin', /\/api\/admin\/tags\//, async () => {
        await deleteBtn.click();
      });
    }
  });

  test('Users tab', async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: 'Admin' }).click();
    await page.getByRole('button', { name: 'Users' }).click();

    await perf('users-tab', 'admin', async () => {
      await expect(page.getByText('Manage user roles and access')).toBeVisible();
    });
  });

  test('Stage reorder', async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: 'Admin' }).click();
    await expect(page.getByRole('heading', { name: 'Workflow Stages' })).toBeVisible();

    const downButtons = page.locator('button[title="Move down"]');
    if (await downButtons.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await perfApi(page, 'reorder-stage', 'admin', /\/api\/admin\/stages\/reorder/, async () => {
        await downButtons.first().click();
      });
      await expect(page.getByRole('heading', { name: 'Workflow Stages' })).toBeVisible();
    }
  });

  test('Notifications bell', async ({ page }) => {
    await login(page);

    const bell = page.getByLabel(/Notifications/);
    if (await bell.isVisible({ timeout: 5000 }).catch(() => false)) {
      await perf('notifications-open', 'admin', async () => {
        await bell.click();
        await expect(page.getByText('Notifications').nth(0)).toBeVisible();
      });

      // Mark all read if available
      const markAllBtn = page.getByText('Mark all read');
      if (await markAllBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await perfApi(page, 'mark-all-read', 'admin', /\/api\/notifications/, async () => {
          await markAllBtn.click();
        });
      }
    }
  });
});

// ============================================================================
// PERFORMANCE SUMMARY REPORT
// ============================================================================

test('Performance Report', () => {
  if (timings.length === 0) {
    console.log('\nNo performance data collected (tests may have run in separate workers).\n');
    return;
  }

  console.log('\n' + '='.repeat(80));
  console.log('  PRODUCTION PERFORMANCE REPORT');
  console.log('  ' + new Date().toISOString());
  console.log('='.repeat(80));
  console.log(
    '  ' + 'Action'.padEnd(35) + 'Category'.padEnd(15) + 'Duration (ms)'.padStart(15),
  );
  console.log('  ' + '-'.repeat(65));

  for (const t of timings) {
    console.log(
      '  ' +
        t.action.padEnd(35) +
        t.category.padEnd(15) +
        String(t.durationMs).padStart(15),
    );
  }

  console.log('  ' + '-'.repeat(65));

  const totalMs = timings.reduce((sum, t) => sum + t.durationMs, 0);
  const avgMs = Math.round(totalMs / timings.length);
  const maxEntry = timings.reduce((max, t) => (t.durationMs > max.durationMs ? t : max), timings[0]!);

  console.log(`  Total: ${totalMs}ms | Avg: ${avgMs}ms | Slowest: ${maxEntry.action} (${maxEntry.durationMs}ms)`);
  console.log('');

  // Group by category
  const byCategory = new Map<string, number[]>();
  for (const t of timings) {
    const arr = byCategory.get(t.category) ?? [];
    arr.push(t.durationMs);
    byCategory.set(t.category, arr);
  }

  console.log('  ' + 'Category'.padEnd(20) + 'Avg (ms)'.padStart(12) + 'Max (ms)'.padStart(12) + 'Count'.padStart(8));
  console.log('  ' + '-'.repeat(52));
  for (const [cat, durations] of byCategory) {
    const avg = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    const max = Math.max(...durations);
    console.log(
      '  ' +
        cat.padEnd(20) +
        String(avg).padStart(12) +
        String(max).padStart(12) +
        String(durations.length).padStart(8),
    );
  }
  console.log('='.repeat(80) + '\n');
});
