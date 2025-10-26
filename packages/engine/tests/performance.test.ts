import { describe, it } from 'vitest';
import { performance } from 'perf_hooks';
import { generateLogicSolvablePuzzle } from '../src/optimizer';
import { hasAtMostSolutions } from '../src/solver';
import { areRegionsContiguous } from '../src/region';
import { isLogicSolvable } from '../src/logic-solver';

describe('Full Cycle Performance Tests', () => {
  it('measures complete puzzle generation time across sizes', () => {
    const sizes = [5, 6, 7, 8, 9, 10, 11, 12];
    const results: Array<{
      size: number;
      avgTime: number;
      minTime: number;
      maxTime: number;
      totalTime: number;
    }> = [];

    for (const size of sizes) {
      const trials = 5; // Test with 5 puzzles per size
      const times: number[] = [];

      for (let i = 0; i < trials; i++) {
        const seed = `perf-test-${size}x${size}-${i}`;

        const start = performance.now();
        const puzzle = generateLogicSolvablePuzzle(seed, size, {
          maxOptimizationIterations: 500,
          requireLogicSolvable: true,
          maxRetries: 100,
        });
        const duration = performance.now() - start;

        // Verify the puzzle meets all requirements
        const isUnique = hasAtMostSolutions(puzzle, 1);
        const isContiguous = areRegionsContiguous(puzzle);
        const isSolvable = isLogicSolvable(puzzle);

        if (!isUnique) {
          console.warn(`Warning: ${size}x${size} puzzle ${i} is not unique`);
        }
        if (!isContiguous) {
          console.warn(`Warning: ${size}x${size} puzzle ${i} has non-contiguous regions`);
        }
        if (!isSolvable) {
          console.warn(`Warning: ${size}x${size} puzzle ${i} is not logic-solvable`);
        }

        // Only record times for puzzles that meet all requirements
        if (isUnique && isContiguous && isSolvable) {
          times.push(duration);
        }
      }

      if (times.length > 0) {
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        const totalTime = times.reduce((a, b) => a + b, 0);

        results.push({
          size,
          avgTime,
          minTime,
          maxTime,
          totalTime,
        });

        console.log(
          `${size}x${size}: avg ${avgTime.toFixed(2)}ms (min: ${minTime.toFixed(2)}ms, max: ${maxTime.toFixed(2)}ms) - ${times.length}/${trials} successful`,
        );
      } else {
        console.log(`${size}x${size}: FAILED - No successful puzzles generated`);
      }
    }

    // Summary
    console.log('\n=== Performance Summary ===');
    console.log('Size | Avg Time | Min Time | Max Time | Total Time');
    console.log('-----|----------|----------|----------|-----------');
    for (const result of results) {
      console.log(
        `${result.size}x${result.size} | ${result.avgTime.toFixed(2)}ms | ${result.minTime.toFixed(2)}ms | ${result.maxTime.toFixed(2)}ms | ${result.totalTime.toFixed(2)}ms`,
      );
    }

    // Performance assertions - should complete in reasonable time
    for (const result of results) {
      if (result.size <= 8) {
        expect(result.avgTime).toBeLessThan(1000); // < 1s for up to 8x8
      } else if (result.size <= 10) {
        expect(result.avgTime).toBeLessThan(5000); // < 5s for up to 10x10
      } else {
        expect(result.avgTime).toBeLessThan(30000); // < 30s for 11x11 and 12x12
      }
    }
  });

  it('measures generation time with different optimization levels', () => {
    const size = 6;
    const optimizationLevels = [
      { iterations: 100, name: 'Fast' },
      { iterations: 500, name: 'Default' },
      { iterations: 1000, name: 'Quality' },
    ];

    console.log(`\n=== Optimization Level Comparison (${size}x${size}) ===`);

    for (const level of optimizationLevels) {
      const times: number[] = [];
      const trials = 3;

      for (let i = 0; i < trials; i++) {
        const seed = `opt-test-${level.name}-${i}`;

        const start = performance.now();
        const puzzle = generateLogicSolvablePuzzle(seed, size, {
          maxOptimizationIterations: level.iterations,
          requireLogicSolvable: true,
          maxRetries: 100,
        });
        const duration = performance.now() - start;

        if (hasAtMostSolutions(puzzle, 1) && isLogicSolvable(puzzle)) {
          times.push(duration);
        }
      }

      if (times.length > 0) {
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        console.log(
          `${level.name} (${level.iterations} iter): avg ${avgTime.toFixed(2)}ms (${times.length}/${trials} successful)`,
        );
      }
    }
  });
});
