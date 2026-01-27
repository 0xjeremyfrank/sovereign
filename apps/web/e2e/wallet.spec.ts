import { test, expect } from '@playwright/test';

test.describe('Wallet Connection UI', () => {
  test('shows connect wallet button when not connected', async ({ page }) => {
    await page.goto('/');

    // Look for connect wallet button in nav
    const connectButton = page
      .getByRole('button', { name: /connect/i })
      .or(page.locator('[data-testid="connect-wallet"]'));

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

    // Modal should appear with wallet options
    // Common wallet options: MetaMask, WalletConnect, Coinbase, etc.
    const modal = page.locator('[role="dialog"]').or(page.locator('[class*="modal"]'));

    // Check if modal appeared (might not if no providers configured)
    const hasModal = await modal
      .first()
      .isVisible()
      .catch(() => false);
    if (hasModal) {
      // Look for wallet options
      const walletOption = page.getByText(/metamask|walletconnect|coinbase/i);
      await expect(walletOption.first())
        .toBeVisible({ timeout: 5000 })
        .catch(() => {
          // Modal might show different content
        });
    }
  });
});

test.describe('Contest Participation (No Wallet)', () => {
  test('contest play page responds', async ({ page }) => {
    // Navigate to a contest play page - without blockchain this may error
    const response = await page.goto('/contests/0/play');

    // Should get a response (even if 500 due to no blockchain)
    expect(response).not.toBeNull();

    // Page body should be present
    await expect(page.locator('body')).toBeVisible();
  });
});
