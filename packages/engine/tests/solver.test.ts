import { describe, expect, it } from 'vitest';
import { findValidSolution, hasAtMostSolutions, findAllSolutions } from '../src/solver';
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

describe('hasAtMostSolutions', () => {
  it('should return true when solution count is under cap', () => {
    const regionMap = generateRegionMap('test-seed', 5);
    const result = hasAtMostSolutions(regionMap, 10);
    expect(result).toBe(true);
  });

  it('should return false when solution count exceeds cap', () => {
    // Create a region map that has multiple solutions
    const regionMap = generateRegionMap('test-seed', 6);
    const result = hasAtMostSolutions(regionMap, 1);
    expect(result).toBe(false);
  });

  it('should work correctly for uniqueness check (cap = 1)', () => {
    // Test with a region map that has exactly 1 solution
    const regionMap = generateRegionMap('test-seed', 5);
    const result = hasAtMostSolutions(regionMap, 1);
    expect(result).toBe(true);

    // Test with a region map that has multiple solutions
    const regionMap2 = generateRegionMap('test-seed', 6);
    const result2 = hasAtMostSolutions(regionMap2, 1);
    expect(result2).toBe(false);
  });

  it('should match findAllSolutions.length when cap is high', () => {
    const regionMap = generateRegionMap('test-seed', 5);
    const allSolutions = findAllSolutions(regionMap);
    const actualCount = allSolutions.length;

    // Test with cap just above actual count
    expect(hasAtMostSolutions(regionMap, actualCount)).toBe(true);
    expect(hasAtMostSolutions(regionMap, actualCount - 1)).toBe(false);
  });

  it('should exit early when count exceeds cap', () => {
    const regionMap = generateRegionMap('test-seed', 6);

    // This should return false because the region map has more than 3 solutions
    const result = hasAtMostSolutions(regionMap, 3);
    expect(result).toBe(false);

    // Verify it actually has more than 3 solutions
    const allSolutions = findAllSolutions(regionMap);
    expect(allSolutions.length).toBeGreaterThan(3);
  });

  it('should handle edge cases', () => {
    // Test with cap of 0 (should return false unless no solutions)
    const regionMap = generateRegionMap('test-seed', 5);
    const result = hasAtMostSolutions(regionMap, 0);
    expect(result).toBe(false);

    // Test with very high cap
    const result2 = hasAtMostSolutions(regionMap, 1000);
    expect(result2).toBe(true);
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
