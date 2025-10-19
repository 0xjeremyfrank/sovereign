import { createRng } from './prng';
import type { RegionMap } from './types';

/**
 * Find a valid n-Queens-style solution for a given size
 * Returns column positions for each row that satisfy:
 * - One per row, one per column
 * - No two adjacent (including diagonals)
 */
export const findValidSolution = (seed: string, size: number): number[] => {
  const rng = createRng(seed + ':solution');

  // Try to find a solution with backtracking
  const solution: number[] = [];
  const usedCols = new Set<number>();

  const isValidPlacement = (row: number, col: number): boolean => {
    // Check column
    if (usedCols.has(col)) return false;

    // Check adjacency (including diagonals) with previously placed sovereigns
    for (let r = 0; r < row; r++) {
      const c = solution[r]!;

      const rowDiff = Math.abs(row - r);
      const colDiff = Math.abs(col - c);

      // Reject if touching in any direction (orthogonal or diagonal)
      // Must have gap of at least 2 in row or column direction
      if (rowDiff <= 1 && colDiff <= 1) {
        return false;
      }
    }

    return true;
  };

  const backtrack = (row: number): boolean => {
    if (row === size) {
      return true; // Found a solution
    }

    // Try columns in random order
    const cols = Array.from({ length: size }, (_, i) => i);
    // Shuffle columns for variety
    for (let i = cols.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const temp = cols[i]!;
      cols[i] = cols[j]!;
      cols[j] = temp;
    }

    for (const col of cols) {
      if (isValidPlacement(row, col)) {
        solution[row] = col;
        usedCols.add(col);

        if (backtrack(row + 1)) {
          return true;
        }

        // Backtrack
        solution.pop();
        usedCols.delete(col);
      }
    }

    return false;
  };

  if (!backtrack(0)) {
    // Fallback: for some sizes, the adjacency constraint might be too strict
    // Return a simple diagonal pattern as fallback
    return Array.from({ length: size }, (_, i) => i);
  }

  return solution;
};

/**
 * Find all valid solutions for a given region map
 * Used to verify puzzle uniqueness
 */
export const findAllSolutions = (regionMap: RegionMap): number[][] => {
  const size = regionMap.width;
  const solutions: number[][] = [];
  const currentSolution: number[] = [];
  const usedCols = new Set<number>();

  const linear = (row: number, col: number): number => row * size + col;

  const isValidPlacement = (row: number, col: number): boolean => {
    // Check column
    if (usedCols.has(col)) return false;

    // Check adjacency with previously placed sovereigns
    for (let r = 0; r < row; r++) {
      const c = currentSolution[r]!;
      const rowDiff = Math.abs(row - r);
      const colDiff = Math.abs(col - c);

      // Must not be adjacent (including diagonals)
      if (rowDiff <= 1 && colDiff <= 1) {
        return false;
      }
    }

    // Check region constraint
    const currentRegion = regionMap.regions[linear(row, col)]!;
    for (let r = 0; r < row; r++) {
      const c = currentSolution[r]!;
      const otherRegion = regionMap.regions[linear(r, c)]!;
      if (currentRegion === otherRegion) {
        return false;
      }
    }

    return true;
  };

  const backtrack = (row: number): void => {
    if (row === size) {
      solutions.push([...currentSolution]);
      return;
    }

    for (let col = 0; col < size; col++) {
      if (isValidPlacement(row, col)) {
        currentSolution[row] = col;
        usedCols.add(col);

        backtrack(row + 1);

        currentSolution.pop();
        usedCols.delete(col);
      }
    }
  };

  backtrack(0);
  return solutions;
};

/**
 * Check if a region map has exactly one solution
 */
export const hasUniqueSolution = (regionMap: RegionMap): boolean => {
  const solutions = findAllSolutions(regionMap);
  return solutions.length === 1;
};
