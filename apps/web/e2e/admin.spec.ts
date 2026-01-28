import { test, expect } from '@playwright/test';

test.describe('Admin Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin');
  });

  test('displays admin page header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /admin/i })).toBeVisible();
    await expect(page.getByText(/manage contests/i)).toBeVisible();
  });

  test('shows connect wallet message when not connected', async ({ page }) => {
    await expect(page.getByText(/connect wallet to access admin/i)).toBeVisible();
  });

  test('has navigation back to other pages', async ({ page }) => {
    // Can navigate to sandbox
    const sandboxLink = page
      .getByRole('link', { name: /sandbox|play/i })
      .or(page.locator('a[href="/"]'));
    await expect(sandboxLink.first()).toBeVisible();

    // Can navigate to contests
    const contestsLink = page.getByRole('link', { name: /contests/i });
    await expect(contestsLink).toBeVisible();
  });
});

