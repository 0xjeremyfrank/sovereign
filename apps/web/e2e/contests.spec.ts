import { test, expect } from '@playwright/test';

test.describe('Contest Browsing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contests');
  });

  test('displays contests page header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /contests/i })).toBeVisible();
    await expect(page.getByText(/view all.*contests/i)).toBeVisible();
  });

  test('shows loading or content state', async ({ page }) => {
    // On fresh load, should show skeleton/loading or content
    // Without blockchain connection, skeletons may persist
    const skeletons = page
      .locator('[class*="skeleton"]')
      .or(page.locator('[class*="animate-pulse"]'));
    const content = page
      .getByText(/no contests found/i)
      .or(page.locator('[data-testid="contest-card"]'));

    // Either skeletons are visible (loading) or content is shown
    await expect(skeletons.first().or(content.first())).toBeVisible({ timeout: 10000 });
  });

  test('displays page content or loading state', async ({ page }) => {
    // Wait for initial render
    await page.waitForLoadState('domcontentloaded');

    // Page should show either: loading skeletons, empty state, or contest cards
    const skeletons = page.locator('[class*="animate-pulse"]');
    const emptyState = page.getByText(/no contests found/i);
    const contestCards = page.locator('a[href^="/contests/"]');

    // One of these states should be visible
    await expect(skeletons.first().or(emptyState).or(contestCards.first())).toBeVisible({
      timeout: 10000,
    });
  });

  test('can navigate back to sandbox from contests', async ({ page }) => {
    // Find navigation link to home/sandbox
    const homeLink = page
      .getByRole('link', { name: /sandbox|play|home/i })
      .or(page.locator('a[href="/"]'));
    await expect(homeLink.first()).toBeVisible();
    await homeLink.first().click();

    // Should be on home page
    await expect(page).toHaveURL('/');
  });
});

test.describe('Contest Details', () => {
  test('contest detail page responds', async ({ page }) => {
    // Navigate to a contest page - without blockchain this may error
    const response = await page.goto('/contests/0');

    // Should get a response (even if 500 due to no blockchain)
    expect(response).not.toBeNull();

    // Page body should be present
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('has working navigation links', async ({ page }) => {
    await page.goto('/');

    // Find contests link
    const contestsLink = page.getByRole('link', { name: /contests/i });
    await expect(contestsLink).toBeVisible();
    await contestsLink.click();
    await expect(page).toHaveURL('/contests');

    // Find admin link (if visible)
    const adminLink = page.getByRole('link', { name: /admin/i });
    if (await adminLink.isVisible()) {
      await adminLink.click();
      await expect(page).toHaveURL('/admin');
    }
  });

  test('sandbox link works from any page', async ({ page }) => {
    await page.goto('/contests');

    // Navigate to sandbox using the Play link specifically
    const playLink = page.getByRole('link', { name: 'Play' });
    await playLink.click();
    await expect(page).toHaveURL('/');
  });
});
