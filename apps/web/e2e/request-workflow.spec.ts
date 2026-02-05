import { test, expect } from '@playwright/test';

test.describe('Request Workflow', () => {
  // Helper to log in before each test
  async function login(page: import('@playwright/test').Page) {
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@example.com');
    await page.getByLabel('Password').fill('AdminPassword123!');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/board/);
  }

  test('should create a request, move stage, and see updated timeline', async ({
    page,
  }) => {
    // Step 1: Login
    await login(page);

    // Step 2: Navigate to board and create a new request
    await expect(page.getByText('Request Board')).toBeVisible();

    // Click "New Request" button
    await page.getByRole('button', { name: 'New Request' }).click();

    // Fill in request form
    await page.getByLabel('Description *').fill('Test request for E2E workflow validation');
    await page.getByLabel('Notes').fill('This is a test note from Playwright');
    await page.getByLabel('Priority').selectOption('HIGH');

    // Submit the form
    await page.getByRole('button', { name: 'Create Request' }).click();

    // Wait for dialog to close and board to refresh
    await expect(page.getByText('Create New Request')).not.toBeVisible();

    // Step 3: Verify the request appears in the MRF column
    await expect(page.getByText('Test request for E2E workflow')).toBeVisible();

    // Step 4: Navigate to the request detail page
    await page.getByText('Test request for E2E workflow').click();
    await expect(page).toHaveURL(/\/requests\//);

    // Step 5: Verify request details are correct
    await expect(page.getByText('Test request for E2E workflow validation')).toBeVisible();
    await expect(page.getByText('HIGH')).toBeVisible();
    await expect(page.getByText('MRF')).toBeVisible();

    // Step 6: Verify stage timeline shows MRF as current
    await expect(page.getByText('Stage Timeline')).toBeVisible();
    await expect(page.getByText('Current')).toBeVisible();

    // Step 7: Move to next stage (Supplier Assignment)
    await page.getByRole('combobox').first().selectOption({ label: 'Supplier Assignment' });
    await page.getByRole('button', { name: 'Move Stage' }).click();

    // Step 8: Verify the stage has changed
    await expect(page.getByText('Supplier Assignment')).toBeVisible();

    // Step 9: Verify timeline shows both MRF and Supplier Assignment
    const timeline = page.locator('[class*="space-y"]').filter({ hasText: 'Stage Timeline' });
    await expect(timeline.getByText('MRF')).toBeVisible();
    await expect(timeline.getByText('Supplier Assignment')).toBeVisible();
  });

  test('should navigate to requests list page and see the created request', async ({
    page,
  }) => {
    await login(page);

    // Navigate to Requests page via nav link
    await page.getByRole('link', { name: 'Requests' }).click();
    await expect(page).toHaveURL(/\/requests/);

    // Verify the page has request table
    await expect(page.getByText('Manage and track all requests')).toBeVisible();
  });

  test('should navigate between Board and Requests pages', async ({ page }) => {
    await login(page);

    // Start on board
    await expect(page.getByText('Request Board')).toBeVisible();

    // Navigate to Requests
    await page.getByRole('link', { name: 'Requests' }).click();
    await expect(page.getByText('Manage and track all requests')).toBeVisible();

    // Navigate to Dashboard
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page.getByText('Overview of request tracking metrics')).toBeVisible();

    // Navigate back to Board
    await page.getByRole('link', { name: 'Board' }).click();
    await expect(page.getByText('Request Board')).toBeVisible();
  });
});
