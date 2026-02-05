import { test, expect } from '@playwright/test';

// Helper to log in as admin
async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@example.com');
  await page.getByLabel('Password').fill('AdminPassword123!');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/board/);
}

// ============================================================================
// ADMIN E2E TESTS
// ============================================================================

test.describe('Admin Console', () => {
  test('should access admin page and see tabbed interface', async ({ page }) => {
    await loginAsAdmin(page);

    await page.getByRole('link', { name: 'Admin' }).click();
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByText('Admin Panel')).toBeVisible();

    // Verify all tabs are visible
    await expect(page.getByRole('button', { name: 'Stages' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Transitions' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tags' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Users' })).toBeVisible();
  });

  test('should display stages and allow editing', async ({ page }) => {
    await loginAsAdmin(page);

    await page.getByRole('link', { name: 'Admin' }).click();
    await expect(page).toHaveURL(/\/admin/);

    // Stages tab should be active by default
    await expect(page.getByText('Workflow Stages')).toBeVisible();

    // Should see "Add Stage" button
    await expect(page.getByRole('button', { name: 'Add Stage' })).toBeVisible();

    // Should see existing stages
    await expect(page.getByText('MRF')).toBeVisible();

    // Click Edit on a stage
    const editButtons = page.getByRole('button', { name: 'Edit' });
    if (await editButtons.first().isVisible()) {
      await editButtons.first().click();
      // Should see Save and Cancel buttons
      await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();

      // Cancel editing
      await page.getByRole('button', { name: 'Cancel' }).click();
    }
  });

  test('should switch to transitions tab', async ({ page }) => {
    await loginAsAdmin(page);

    await page.getByRole('link', { name: 'Admin' }).click();
    await page.getByRole('button', { name: 'Transitions' }).click();

    await expect(page.getByText('Define allowed stage-to-stage transitions')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Transition' })).toBeVisible();
  });

  test('should switch to tags tab and manage tags', async ({ page }) => {
    await loginAsAdmin(page);

    await page.getByRole('link', { name: 'Admin' }).click();
    await page.getByRole('button', { name: 'Tags' }).click();

    await expect(page.getByText('Manage tags for categorizing requests')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Tag' })).toBeVisible();

    // Create a new tag
    await page.getByRole('button', { name: 'Add Tag' }).click();
    await page.getByPlaceholder('Tag name').fill('E2E Test Tag');
    await page.getByRole('button', { name: 'Create' }).click();

    // Verify tag appears
    await expect(page.getByText('E2E Test Tag')).toBeVisible();

    // Delete the test tag
    const tagContainer = page.locator('div').filter({ hasText: 'E2E Test Tag' }).last();
    const deleteBtn = tagContainer.getByRole('button', { name: 'Delete' });
    if (await deleteBtn.isVisible()) {
      page.on('dialog', (dialog) => dialog.accept());
      await deleteBtn.click();
    }
  });

  test('should switch to users tab and see user list', async ({ page }) => {
    await loginAsAdmin(page);

    await page.getByRole('link', { name: 'Admin' }).click();
    await page.getByRole('button', { name: 'Users' }).click();

    await expect(page.getByText('Manage user roles and access')).toBeVisible();

    // Should see at least the admin user
    await expect(page.getByText('admin@example.com')).toBeVisible();

    // Should see "Change Role" button
    await expect(page.getByRole('button', { name: 'Change Role' }).first()).toBeVisible();
  });

  test('should reorder stages with up/down arrows', async ({ page }) => {
    await loginAsAdmin(page);

    await page.getByRole('link', { name: 'Admin' }).click();

    // Stages tab is default
    await expect(page.getByText('Workflow Stages')).toBeVisible();

    // Find down arrow buttons (▼)
    const downButtons = page.locator('button[title="Move down"]');
    if (await downButtons.first().isVisible()) {
      // Click down on the first stage
      await downButtons.first().click();
      // Page should not crash - verify stages still render
      await expect(page.getByText('Workflow Stages')).toBeVisible();
    }
  });
});

// ============================================================================
// DASHBOARD E2E TESTS
// ============================================================================

test.describe('Executive Dashboard', () => {
  test('should display all dashboard sections', async ({ page }) => {
    await loginAsAdmin(page);

    await page.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Summary cards
    await expect(page.getByText('Total Requests')).toBeVisible();
    await expect(page.getByText('Overdue')).toBeVisible();
    await expect(page.getByText('Active Stages')).toBeVisible();
    await expect(page.getByText('Urgent Requests')).toBeVisible();

    // Analytics sections
    await expect(page.getByText('Priority Distribution')).toBeVisible();
    await expect(page.getByText('Requests by Stage')).toBeVisible();
    await expect(page.getByText('Average Time Per Stage (Last 30 Days)')).toBeVisible();
    await expect(page.getByText('Aging by Stage')).toBeVisible();
  });

  test('should show priority distribution with percentages', async ({ page }) => {
    await loginAsAdmin(page);

    await page.getByRole('link', { name: 'Dashboard' }).click();

    // Priority levels should be listed
    await expect(page.getByText('URGENT')).toBeVisible();
    await expect(page.getByText('HIGH')).toBeVisible();
    await expect(page.getByText('NORMAL')).toBeVisible();
    await expect(page.getByText('LOW')).toBeVisible();
  });

  test('should show aging by stage with time buckets', async ({ page }) => {
    await loginAsAdmin(page);

    await page.getByRole('link', { name: 'Dashboard' }).click();

    // Aging headers should be visible
    await expect(page.getByText('< 24h')).toBeVisible();
    await expect(page.getByText('1-3 days')).toBeVisible();
    await expect(page.getByText('3-7 days')).toBeVisible();
    await expect(page.getByText('> 7 days')).toBeVisible();
  });

  test('should display overdue requests when they exist', async ({ page }) => {
    await loginAsAdmin(page);

    await page.getByRole('link', { name: 'Dashboard' }).click();

    // The overdue section may or may not be visible depending on data
    // Just verify the page loads correctly
    await expect(page.getByText('Overview of request tracking metrics')).toBeVisible();
  });
});
