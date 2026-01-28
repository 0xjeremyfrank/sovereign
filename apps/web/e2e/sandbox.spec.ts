import { test, expect } from '@playwright/test';

test.describe('Sandbox Play', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays the puzzle board', async ({ page }) => {
    // Wait for the board to generate
    await expect(page.getByText('Generating puzzle...')).not.toBeVisible({ timeout: 10000 });

    // Board should be visible (use role-based selector)
    const grid = page.locator('[role="grid"]').or(page.locator('.grid'));
    await expect(grid.first()).toBeVisible();

    // Rules should be visible (use first() to handle multiple matches)
    await expect(page.getByText(/One sovereign per row/i).first()).toBeVisible();
    await expect(page.getByText(/No two sovereigns may touch/i).first()).toBeVisible();
  });

  test('can cycle cell states by clicking', async ({ page }) => {
    // Wait for board to load
    await expect(page.getByText('Generating puzzle...')).not.toBeVisible({ timeout: 10000 });

    // Find a cell and click it
    const cells = page.locator('[role="gridcell"]');
    const firstCell = cells.first();
    await expect(firstCell).toBeVisible();

    // Get initial state
    const initialClass = await firstCell.getAttribute('class');

    // Click to cycle through states - verify class changes
    await firstCell.click();
    const afterFirstClick = await firstCell.getAttribute('class');
    expect(afterFirstClick).not.toBe(initialClass);

    // Second click
    await firstCell.click();
    const afterSecondClick = await firstCell.getAttribute('class');
    expect(afterSecondClick).not.toBe(afterFirstClick);

    // Third click should cycle back to initial state
    await firstCell.click();
    const afterThirdClick = await firstCell.getAttribute('class');
    expect(afterThirdClick).toBe(initialClass);
  });

  test('can generate a new board', async ({ page }) => {
    // Wait for initial board
    await expect(page.getByText('Generating puzzle...')).not.toBeVisible({ timeout: 10000 });

    // Find and click the new board button
    const newBoardButton = page.getByRole('button', { name: /new|generate|refresh/i });
    await expect(newBoardButton).toBeVisible();
    await newBoardButton.click();

    // Should show generating state briefly (may be too fast to observe)
    const generatingMessage = page.getByText('Generating puzzle...');
    await generatingMessage.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);

    // Board should be visible again
    await expect(page.getByText('Generating puzzle...')).not.toBeVisible({ timeout: 10000 });
  });

  test('can clear the board', async ({ page }) => {
    // Wait for board
    await expect(page.getByText('Generating puzzle...')).not.toBeVisible({ timeout: 10000 });

    // Get initial state of first cell
    const cells = page.locator('[role="gridcell"]');
    const firstCell = cells.first();
    const initialClass = await firstCell.getAttribute('class');

    // Make a move
    await firstCell.click();
    const afterClickClass = await firstCell.getAttribute('class');
    expect(afterClickClass).not.toBe(initialClass);

    // Find and click clear button
    const clearButton = page.getByRole('button', { name: /clear/i });
    await expect(clearButton).toBeVisible();
    await clearButton.click();

    // Verify cell was cleared back to initial state
    const afterClearClass = await firstCell.getAttribute('class');
    expect(afterClearClass).toBe(initialClass);
  });

  test('can undo moves', async ({ page }) => {
    // Wait for board
    await expect(page.getByText('Generating puzzle...')).not.toBeVisible({ timeout: 10000 });

    // Get initial state of first cell
    const cells = page.locator('[role="gridcell"]');
    const firstCell = cells.first();
    const initialClass = await firstCell.getAttribute('class');

    // Make a move
    await firstCell.click();
    const afterClickClass = await firstCell.getAttribute('class');
    expect(afterClickClass).not.toBe(initialClass);

    // Find and click undo button
    const undoButton = page.getByRole('button', { name: /undo/i });
    await expect(undoButton).toBeVisible();
    await undoButton.click();

    // Verify undo reverted the cell to initial state
    const afterUndoClass = await firstCell.getAttribute('class');
    expect(afterUndoClass).toBe(initialClass);
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

  test('hides win message initially', async ({ page }) => {
    // Verify the win state UI is hidden when puzzle is not solved
    await expect(page.getByText('Generating puzzle...')).not.toBeVisible({ timeout: 10000 });

    // The "You Win" message should be hidden initially
    await expect(page.getByText('You Win!')).not.toBeVisible();
  });
});
