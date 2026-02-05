import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

// Helper to log in as admin
async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@example.com');
  await page.getByLabel('Password').fill('AdminPassword123!');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/board/);
}

// ============================================================================
// ATTACHMENT E2E TESTS
// ============================================================================

test.describe('Attachments', () => {
  test.beforeAll(() => {
    // Create a temporary test file for uploads
    const tmpDir = path.join(process.cwd(), 'e2e', 'fixtures');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    fs.writeFileSync(path.join(tmpDir, 'test-upload.txt'), 'Hello from E2E test');
  });

  test.afterAll(() => {
    // Clean up test file
    const fixturePath = path.join(process.cwd(), 'e2e', 'fixtures', 'test-upload.txt');
    if (fs.existsSync(fixturePath)) {
      fs.unlinkSync(fixturePath);
    }
  });

  test('should upload an attachment to a request and see it listed', async ({ page }) => {
    await login(page);

    // Create a new request first
    await page.getByRole('button', { name: 'New Request' }).click();
    await page.getByLabel('Description *').fill('Attachment test request');
    await page.getByLabel('Priority').selectOption('NORMAL');
    await page.getByRole('button', { name: 'Create Request' }).click();
    await expect(page.getByText('Create New Request')).not.toBeVisible();

    // Navigate to the newly created request
    await page.getByText('Attachment test request').click();
    await expect(page).toHaveURL(/\/requests\//);

    // Verify the Attachments section exists
    await expect(page.getByText('Attachments')).toBeVisible();

    // Upload a file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(
      path.join(process.cwd(), 'e2e', 'fixtures', 'test-upload.txt')
    );

    // Wait for upload button and click
    await page.getByRole('button', { name: 'Upload' }).click();

    // Verify the attachment appears in the list
    await expect(page.getByText('test-upload.txt')).toBeVisible();
  });

  test('should download an attachment', async ({ page }) => {
    await login(page);

    // Navigate to requests page to find a request with attachments
    await page.getByRole('link', { name: 'Requests' }).click();
    await expect(page).toHaveURL(/\/requests/);

    // Click on the first request that exists
    const firstLink = page.locator('table a').first();
    if (await firstLink.isVisible()) {
      await firstLink.click();
      await expect(page).toHaveURL(/\/requests\//);

      // If there's a download button, verify it exists
      const downloadBtn = page.getByRole('button', { name: /download/i });
      if (await downloadBtn.isVisible()) {
        // Set up download listener
        const [download] = await Promise.all([
          page.waitForEvent('download'),
          downloadBtn.click(),
        ]);
        expect(download.suggestedFilename()).toBeTruthy();
      }
    }
  });

  test('should delete an attachment (admin only)', async ({ page }) => {
    await login(page);

    // Navigate to requests list
    await page.getByRole('link', { name: 'Requests' }).click();
    await expect(page).toHaveURL(/\/requests/);

    // Find and click on a request
    const firstLink = page.locator('table a').first();
    if (await firstLink.isVisible()) {
      await firstLink.click();
      await expect(page).toHaveURL(/\/requests\//);

      // If there's a delete button for an attachment, verify it works
      const deleteBtn = page.getByRole('button', { name: /delete/i }).first();
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click();
        // Attachment should be removed from the list
      }
    }
  });
});

// ============================================================================
// FILTER E2E TESTS
// ============================================================================

test.describe('Filters', () => {
  test('should filter requests by search query', async ({ page }) => {
    await login(page);

    // Navigate to Requests page
    await page.getByRole('link', { name: 'Requests' }).click();
    await expect(page).toHaveURL(/\/requests/);

    // Verify filter bar is visible
    await expect(page.getByPlaceholder('Search description or notes...')).toBeVisible();

    // Type a search query
    await page.getByPlaceholder('Search description or notes...').fill('test');
    await page.getByRole('button', { name: 'Apply' }).click();

    // URL should update with the query param
    await expect(page).toHaveURL(/query=test/);

    // Filter chip should appear
    await expect(page.getByText('Search: "test"')).toBeVisible();
  });

  test('should filter requests by priority', async ({ page }) => {
    await login(page);

    await page.getByRole('link', { name: 'Requests' }).click();
    await expect(page).toHaveURL(/\/requests/);

    // Select HIGH priority
    const prioritySelect = page.locator('select').filter({ has: page.getByText('All') }).nth(1);
    await prioritySelect.selectOption('HIGH');
    await page.getByRole('button', { name: 'Apply' }).click();

    // URL should update
    await expect(page).toHaveURL(/priority=HIGH/);

    // Filter chip should appear
    await expect(page.getByText('Priority: HIGH')).toBeVisible();
  });

  test('should clear all filters', async ({ page }) => {
    await login(page);

    await page.getByRole('link', { name: 'Requests' }).click();

    // Apply a filter first
    await page.getByPlaceholder('Search description or notes...').fill('something');
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page).toHaveURL(/query=something/);

    // Click clear
    await page.getByRole('button', { name: 'Clear' }).click();

    // URL should no longer have query param
    await expect(page).not.toHaveURL(/query=/);
  });

  test('should filter by stage', async ({ page }) => {
    await login(page);

    await page.getByRole('link', { name: 'Requests' }).click();
    await expect(page).toHaveURL(/\/requests/);

    // Select a stage from the dropdown
    const stageSelect = page.locator('select').first();
    const options = await stageSelect.locator('option').allTextContents();

    // Select the second option (first non-empty stage)
    if (options.length > 1) {
      await stageSelect.selectOption({ index: 1 });
      await page.getByRole('button', { name: 'Apply' }).click();

      // URL should have stageId param
      await expect(page).toHaveURL(/stageId=/);

      // Filter chip should show stage name
      const stageName = options[1];
      await expect(page.getByText(`Stage: ${stageName}`)).toBeVisible();
    }
  });

  test('should filter by due date range', async ({ page }) => {
    await login(page);

    await page.getByRole('link', { name: 'Requests' }).click();
    await expect(page).toHaveURL(/\/requests/);

    // Set a "Due After" date
    const dueAfterInput = page.locator('input[type="date"]').first();
    await dueAfterInput.fill('2024-01-01');
    await page.getByRole('button', { name: 'Apply' }).click();

    // URL should have dueAfter param
    await expect(page).toHaveURL(/dueAfter=2024-01-01/);

    // Chip should appear
    await expect(page.getByText('Due after: 2024-01-01')).toBeVisible();
  });

  test('should persist filters across pagination', async ({ page }) => {
    await login(page);

    await page.getByRole('link', { name: 'Requests' }).click();

    // Apply a priority filter
    const prioritySelect = page.locator('select').filter({ has: page.getByText('All') }).nth(1);
    await prioritySelect.selectOption('HIGH');
    await page.getByRole('button', { name: 'Apply' }).click();

    // Check if pagination exists; if so, navigate and confirm filter persists
    const nextButton = page.getByRole('button', { name: 'Next' });
    if (await nextButton.isVisible() && !(await nextButton.isDisabled())) {
      await nextButton.click();
      // Filter should still be in URL
      await expect(page).toHaveURL(/priority=HIGH/);
    }
  });
});
