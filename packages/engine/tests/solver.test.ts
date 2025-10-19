import { describe, expect, it } from 'vitest';
import { findValidSolution } from '../src/solver';
import { generateRegionMap } from '../src/region';
import { validateBoard, createEmptyBoard, placeSovereign } from '../src';

describe('solver', () => {
  it('finds valid solutions for various sizes', () => {
    // Note: Sizes below 5 may not have valid solutions with strict adjacency rules
    const sizes = [5, 6, 8, 10];

    for (const size of sizes) {
      const solution = findValidSolution('test', size);

      expect(solution).toHaveLength(size);

      // Check one per row (implicit in solution array)
      // Check one per column
      const usedCols = new Set(solution);
      expect(usedCols.size).toBe(size);

      // Check no adjacency violations (including diagonals)
      for (let r1 = 0; r1 < size; r1++) {
        const c1 = solution[r1]!;
        for (let r2 = r1 + 1; r2 < size; r2++) {
          const c2 = solution[r2]!;
          const rowDiff = Math.abs(r1 - r2);
          const colDiff = Math.abs(c1 - c2);
          // Should not be adjacent (within 1 step in any direction)
          expect(rowDiff <= 1 && colDiff <= 1).toBe(false);
        }
      }
    }
  });

  it('is deterministic for same seed', () => {
    const a = findValidSolution('seed-1', 6);
    const b = findValidSolution('seed-1', 6);
    expect(a).toEqual(b);
  });
});

describe('puzzle solvability', () => {
  it('generated puzzles have at least one solution', () => {
    const sizes = [5, 6];
    const seeds = ['test-1', 'test-2'];

    for (const size of sizes) {
      for (const seed of seeds) {
        // Generate region map
        const regionMap = generateRegionMap(seed, size);

        // Get the solution used during generation
        const solution = findValidSolution(seed, size);

        // Build board from solution
        let board = createEmptyBoard(size);
        for (let row = 0; row < size; row++) {
          const col = solution[row]!;
          board = placeSovereign(board, row, col);
        }

        // Validate that this solution is valid for the generated regions
        const validation = validateBoard(board, regionMap);

        expect(validation.isValid).toBe(true);
        expect(validation.isComplete).toBe(true);
      }
    }
  });
});
