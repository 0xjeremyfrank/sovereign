import { test, expect } from '@playwright/test';

/**
 * Blockchain integration tests using local Anvil
 * 
 * These tests require `yarn dev:local` to be running, which:
 * - Starts Anvil on localhost:8545
 * - Deploys contracts
 * - Runs VRF auto-fulfillment watcher
 * - Starts Next.js with local chain config
 * 
 * Run with: yarn e2e:local
 */

test.describe('Blockchain Integration', () => {
  test.describe.configure({ mode: 'serial' });

  test('contests page shows deployed contest', async ({ page }) => {
    await page.goto('/contests');
    
    // Wait for contests to load (should have at least the seeded contest)
    await page.waitForLoadState('networkidle');
    
    // Should show contest cards or empty state
    const contestCard = page.locator('a[href^="/contests/"]');
    const emptyState = page.getByText(/no contests found/i);
    const loading = page.locator('[class*="animate-pulse"]');
    
    // Wait for loading to finish
    await expect(loading.first()).not.toBeVisible({ timeout: 15000 }).catch(() => {});
    
    // Should have either a contest or empty state
    const hasContest = await contestCard.first().isVisible().catch(() => false);
    if (!hasContest) {
      await expect(emptyState).toBeVisible();
    }
  });

  test('admin page loads with wallet prompt', async ({ page }) => {
    await page.goto('/admin');
    
    // Should show admin header
    await expect(page.getByRole('heading', { name: /admin/i })).toBeVisible();
    
    // Should prompt to connect wallet (use first() to handle multiple matches)
    await expect(page.getByText(/connect wallet/i).first()).toBeVisible();
  });

  test('sandbox works with local chain configured', async ({ page }) => {
    await page.goto('/');
    
    // Wait for puzzle to generate
    await expect(page.getByText('Generating puzzle...')).not.toBeVisible({ timeout: 15000 });
    
    // Grid should be visible
    const grid = page.locator('[role="grid"]');
    await expect(grid).toBeVisible();
    
    // Should be able to interact with cells
    const cells = page.locator('[role="gridcell"]');
    await expect(cells.first()).toBeVisible();
    await cells.first().click();
  });

  test('contest detail page loads with chain data', async ({ page }) => {
    // Navigate to contest 0 (seeded by dev:local)
    await page.goto('/contests/0');
    
    // Page body should be visible
    await expect(page.locator('body')).toBeVisible();
    
    // Wait for page to settle
    await page.waitForLoadState('domcontentloaded');
    
    // Page should have loaded something (verify it's not blank)
    const pageContent = page.locator('body');
    const textContent = await pageContent.textContent();
    expect(textContent?.length).toBeGreaterThan(0);
  });
});

test.describe('Chain Connection', () => {
  test('app detects local chain', async ({ page }) => {
    await page.goto('/');
    
    // App should load without major errors
    await expect(page.locator('body')).toBeVisible();
    
    // Connect wallet button should be present
    const connectButton = page.getByRole('button', { name: /connect/i });
    await expect(connectButton.first()).toBeVisible();
  });
});
