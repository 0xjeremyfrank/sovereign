import { test, expect } from '@playwright/test';

test.describe('Wallet Connection UI', () => {
  test('shows connect wallet button when not connected', async ({ page }) => {
    await page.goto('/');

    // Look for connect wallet button in nav
    const connectButton = page.getByRole('button', { name: /connect/i });

    // Connect button should be visible
    await expect(connectButton.first()).toBeVisible();
  });

  test('admin page shows connect prompt when not connected', async ({ page }) => {
    await page.goto('/admin');

    // Should show connect wallet message
    await expect(
      page.getByText(/connect.*wallet.*admin/i).or(page.getByText(/connect wallet to access/i)),
    ).toBeVisible();
  });

  test('connect button opens wallet modal', async ({ page }) => {
    await page.goto('/');

    // Find and click connect button
    const connectButton = page.getByRole('button', { name: /connect/i });
    await expect(connectButton.first()).toBeVisible();
    await connectButton.first().click();

    // Modal should appear - look for dialog role or modal class
    const modal = page.locator('[role="dialog"]').or(page.locator('[class*="modal"]'));
    await expect(modal.first()).toBeVisible({ timeout: 5000 });
  });
});

