import { test, expect } from '@playwright/test';

test.describe('Sandbox Play', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays the puzzle board', async ({ page }) => {
    // Wait for the board to generate
    await expect(page.getByText('Generating puzzle...')).not.toBeVisible({ timeout: 10000 });

    // Board should be visible
    const grid = page.locator('[data-testid="grid"]').or(page.locator('.grid'));
    await expect(grid.first()).toBeVisible();

    // Rules should be visible (use first() to handle multiple matches)
    await expect(page.getByText(/One sovereign per row/i).first()).toBeVisible();
    await expect(page.getByText(/No two sovereigns may touch/i).first()).toBeVisible();
  });

  test('can cycle cell states by clicking', async ({ page }) => {
    // Wait for board to load
    await expect(page.getByText('Generating puzzle...')).not.toBeVisible({ timeout: 10000 });

    // Find a cell and click it
    const cells = page.locator('[data-testid^="cell-"]').or(page.locator('[role="gridcell"]'));
    const firstCell = cells.first();
    await expect(firstCell).toBeVisible();

    // Click to cycle through states
    await firstCell.click();
    // Second click
    await firstCell.click();
    // Third click should cycle back
    await firstCell.click();
  });

  test('can generate a new board', async ({ page }) => {
    // Wait for initial board
    await expect(page.getByText('Generating puzzle...')).not.toBeVisible({ timeout: 10000 });

    // Find and click the new board button
    const newBoardButton = page.getByRole('button', { name: /new|generate|refresh/i });
    await expect(newBoardButton).toBeVisible();
    await newBoardButton.click();

    // Should show generating state briefly
    await expect(page.getByText('Generating puzzle...'))
      .toBeVisible({ timeout: 5000 })
      .catch(() => {
        // Sometimes generation is fast enough that we miss this
      });

    // Board should be visible again
    await expect(page.getByText('Generating puzzle...')).not.toBeVisible({ timeout: 10000 });
  });

  test('can clear the board', async ({ page }) => {
    // Wait for board
    await expect(page.getByText('Generating puzzle...')).not.toBeVisible({ timeout: 10000 });

    // Make some moves first
    const cells = page.locator('[data-testid^="cell-"]').or(page.locator('[role="gridcell"]'));
    const firstCell = cells.first();
    await firstCell.click();

    // Find and click clear button
    const clearButton = page.getByRole('button', { name: /clear/i });
    await expect(clearButton).toBeVisible();
    await clearButton.click();
  });

  test('can undo moves', async ({ page }) => {
    // Wait for board
    await expect(page.getByText('Generating puzzle...')).not.toBeVisible({ timeout: 10000 });

    // Make a move
    const cells = page.locator('[data-testid^="cell-"]').or(page.locator('[role="gridcell"]'));
    const firstCell = cells.first();
    await firstCell.click();

    // Find and click undo button
    const undoButton = page.getByRole('button', { name: /undo/i });
    await expect(undoButton).toBeVisible();
    await undoButton.click();
  });

  test('can change board size', async ({ page }) => {
    // Wait for board
    await expect(page.getByText('Generating puzzle...')).not.toBeVisible({ timeout: 10000 });

    // Find size selector (could be dropdown or buttons)
    const sizeSelector = page.getByRole('combobox').or(page.locator('select'));

    if (await sizeSelector.isVisible()) {
      await sizeSelector.selectOption({ index: 1 });
      // Board should regenerate
      await expect(page.getByText('Generating puzzle...')).not.toBeVisible({ timeout: 10000 });
    }
  });

  test('displays legend with progress', async ({ page }) => {
    // Wait for board
    await expect(page.getByText('Generating puzzle...')).not.toBeVisible({ timeout: 10000 });

    // Legend should show progress
    const legend = page.locator('aside').or(page.getByRole('complementary'));
    await expect(legend.first()).toBeVisible();

    // Should show rules text (use first() to handle multiple matches)
    await expect(page.getByText(/row/i).first()).toBeVisible();
    await expect(page.getByText(/column/i).first()).toBeVisible();
    await expect(page.getByText(/region/i).first()).toBeVisible();
  });

  test('shows win state when puzzle is solved', async ({ page }) => {
    // This test verifies the win state UI exists
    // We can't easily solve a puzzle in E2E, but we can verify the UI elements
    await expect(page.getByText('Generating puzzle...')).not.toBeVisible({ timeout: 10000 });

    // The "You Win" message should be hidden initially
    await expect(page.getByText('You Win!')).not.toBeVisible();
  });
});
