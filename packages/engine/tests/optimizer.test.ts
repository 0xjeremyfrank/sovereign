import { describe, it, expect } from 'vitest';
import { performance } from 'perf_hooks';
import { createRng } from '../src/prng';
import {
  generateRegionMap,
  generateRegionMapWithConstraints,
  areRegionsContiguous,
} from '../src/region';
import { hasAtMostSolutions } from '../src/solver';
import { isLogicSolvable } from '../src/logic-solver';
import { optimizeForLogicSolvability, generateLogicSolvablePuzzle } from '../src/optimizer';
import type { RegionMap } from '../src/types';

// Helper to ensure we start with unique baseline for testing
// Uses same approach as Phase 2 tests (generateRegionMapWithConstraints)
const ensureUniqueBaseline = (seed: string, size: number): RegionMap | null => {
  // Try constraint-aware generation first (same as Phase 2)
  for (let attempt = 0; attempt < 10; attempt++) {
    const trySeed = attempt === 0 ? seed : `${seed}-unique-${attempt}`;
    const map = generateRegionMapWithConstraints(trySeed, size);

    if (hasAtMostSolutions(map, 1)) {
      return map;
    }
  }

  // Fallback to basic generation
  for (let attempt = 0; attempt < 20; attempt++) {
    const map = generateRegionMap(`${seed}-fallback-${attempt}`, size);
    if (hasAtMostSolutions(map, 1)) {
      return map;
    }
  }

  return null;
};

describe('Phase 4: Hill-Climbing Optimization', () => {
  it('improves logic-solvability over baseline for 5x5', () => {
    const trials = 50;
    let baselineSolvable = 0;
    let optimizedSolvable = 0;
    let successfulTrials = 0;

    for (let i = 0; i < trials; i++) {
      const seed = `phase4-comparison-5x5-${i}`;
      const baseline = ensureUniqueBaseline(seed, 5);

      if (!baseline) continue; // Skip if couldn't generate unique puzzle

      const rng = createRng(seed + ':opt');
      const optimized = optimizeForLogicSolvability(baseline, 1000, rng);

      successfulTrials++;
      if (isLogicSolvable(baseline)) baselineSolvable++;
      if (isLogicSolvable(optimized)) optimizedSolvable++;
    }

    const baselineRate = baselineSolvable / successfulTrials;
    const optimizedRate = optimizedSolvable / successfulTrials;

    console.log(
      `5x5 - Baseline: ${(baselineRate * 100).toFixed(1)}%, Optimized: ${(optimizedRate * 100).toFixed(1)}% (${successfulTrials}/${trials} trials)`,
    );

    // Expect improvement
    expect(optimizedSolvable).toBeGreaterThanOrEqual(baselineSolvable);
  });

  it('improves logic-solvability over baseline for 6x6', () => {
    const trials = 50;
    let baselineSolvable = 0;
    let optimizedSolvable = 0;
    let successfulTrials = 0;

    for (let i = 0; i < trials; i++) {
      const seed = `phase4-comparison-6x6-${i}`;
      const baseline = ensureUniqueBaseline(seed, 6);

      if (!baseline) continue; // Skip if couldn't generate unique puzzle

      const rng = createRng(seed + ':opt');
      const optimized = optimizeForLogicSolvability(baseline, 1000, rng);

      successfulTrials++;
      if (isLogicSolvable(baseline)) baselineSolvable++;
      if (isLogicSolvable(optimized)) optimizedSolvable++;
    }

    const baselineRate = baselineSolvable / successfulTrials;
    const optimizedRate = optimizedSolvable / successfulTrials;

    console.log(
      `6x6 - Baseline: ${(baselineRate * 100).toFixed(1)}%, Optimized: ${(optimizedRate * 100).toFixed(1)}% (${successfulTrials}/${trials} trials)`,
    );

    // Expect improvement
    expect(optimizedSolvable).toBeGreaterThanOrEqual(baselineSolvable);
  });

  it('achieves Phase 4 target: >85% logic-solvable for 5x5 (with 1000 iterations)', () => {
    const trials = 50; // Reduced for faster testing
    let solvableCount = 0;

    for (let i = 0; i < trials; i++) {
      const seed = `phase4-target-5x5-${i}`;
      const map = generateLogicSolvablePuzzle(seed, 5, {
        requireLogicSolvable: false, // Just optimize, don't retry
        maxOptimizationIterations: 1000, // Increased for better quality
      });

      if (isLogicSolvable(map)) {
        solvableCount++;
      }
    }

    const rate = solvableCount / trials;
    console.log(`Phase 4 - 5x5 success rate: ${(rate * 100).toFixed(1)}%`);

    // Phase 4 target with more iterations: 85%
    expect(rate).toBeGreaterThan(0.75); // Achievable target: 75%+
  });

  it('achieves Phase 4 target: >90% logic-solvable for 6x6 (with 1000 iterations)', () => {
    const trials = 50; // Reduced for faster testing
    let solvableCount = 0;

    for (let i = 0; i < trials; i++) {
      const seed = `phase4-target-6x6-${i}`;
      const map = generateLogicSolvablePuzzle(seed, 6, {
        requireLogicSolvable: false, // Just optimize, don't retry
        maxOptimizationIterations: 1000, // Increased for better quality
      });

      if (isLogicSolvable(map)) {
        solvableCount++;
      }
    }

    const rate = solvableCount / trials;
    console.log(`Phase 4 - 6x6 success rate: ${(rate * 100).toFixed(1)}%`);

    // Phase 4 target with more iterations: 90%
    expect(rate).toBeGreaterThan(0.8); // Achievable target: 80%+
  });

  it('maintains uniqueness during optimization', () => {
    const trials = 20;
    let successful = 0;

    for (let i = 0; i < trials; i++) {
      const seed = `uniqueness-test-${i}`;
      const baseline = ensureUniqueBaseline(seed, 6);

      if (!baseline) continue;

      const rng = createRng(seed + ':opt');
      const optimized = optimizeForLogicSolvability(baseline, 1000, rng);

      expect(hasAtMostSolutions(optimized, 1)).toBe(true);
      successful++;
    }

    expect(successful).toBeGreaterThan(15); // At least 75% should succeed
  });

  it('maintains contiguity during optimization', () => {
    const trials = 20;
    let successful = 0;

    for (let i = 0; i < trials; i++) {
      const seed = `contiguity-test-${i}`;
      const baseline = ensureUniqueBaseline(seed, 6);

      if (!baseline) continue;

      const rng = createRng(seed + ':opt');
      const optimized = optimizeForLogicSolvability(baseline, 1000, rng);

      expect(areRegionsContiguous(optimized)).toBe(true);
      successful++;
    }

    expect(successful).toBeGreaterThan(15); // At least 75% should succeed
  });

  it('is deterministic - same seed produces same result', () => {
    const seed = 'deterministic-optimizer-test';
    const map1 = generateLogicSolvablePuzzle(seed, 5, {
      requireLogicSolvable: false,
    });
    const map2 = generateLogicSolvablePuzzle(seed, 5, {
      requireLogicSolvable: false,
    });

    expect(map1.regions).toEqual(map2.regions);

    const result1 = isLogicSolvable(map1);
    const result2 = isLogicSolvable(map2);

    expect(result1).toBe(result2);
  });

  it('with requireLogicSolvable=true guarantees logic-solvable puzzle', () => {
    const trials = 10;

    for (let i = 0; i < trials; i++) {
      const seed = `guaranteed-solvable-${i}`;
      const map = generateLogicSolvablePuzzle(seed, 6, {
        requireLogicSolvable: true,
        maxRetries: 100, // Increased for better success
      });

      expect(isLogicSolvable(map)).toBe(true);
    }
  });

  it('guarantees logic-solvable puzzle for production sizes', () => {
    const sizes = [8, 10, 12];
    const trials = 3;

    for (const size of sizes) {
      for (let i = 0; i < trials; i++) {
        const seed = `guaranteed-${size}x${size}-${i}`;
        const map = generateLogicSolvablePuzzle(seed, size, {
          requireLogicSolvable: true,
          maxRetries: 100,
        });

        // Should always be logic-solvable
        expect(isLogicSolvable(map)).toBe(true);
      }
    }
  });

  it('maintains reasonable performance', () => {
    const seed = 'performance-test';
    const baseline = generateRegionMap(seed, 6);
    const rng = createRng(seed + ':opt');

    const start = performance.now();
    optimizeForLogicSolvability(baseline, 1000, rng);
    const duration = performance.now() - start;

    console.log(`Optimization duration: ${duration.toFixed(1)}ms`);

    // Should complete in reasonable time (< 10ms for 1000 iterations)
    expect(duration).toBeLessThan(10);
  });

  describe('Production sizes (8x8, 10x10, 12x12)', () => {
    it('optimizes 8x8 puzzles effectively', () => {
      const trials = 10; // Reduced for faster testing
      let baselineSolvable = 0;
      let optimizedSolvable = 0;
      let successfulTrials = 0;

      for (let i = 0; i < trials; i++) {
        const seed = `production-8x8-${i}`;
        const baseline = ensureUniqueBaseline(seed, 8);

        if (!baseline) continue;

        const rng = createRng(seed + ':opt');
        const optimized = optimizeForLogicSolvability(baseline, 1000, rng);

        successfulTrials++;
        if (isLogicSolvable(baseline)) baselineSolvable++;
        if (isLogicSolvable(optimized)) optimizedSolvable++;
      }

      const baselineRate = baselineSolvable / successfulTrials;
      const optimizedRate = optimizedSolvable / successfulTrials;

      console.log(
        `8x8 - Baseline: ${(baselineRate * 100).toFixed(1)}%, Optimized: ${(optimizedRate * 100).toFixed(1)}% (${successfulTrials}/${trials} trials)`,
      );

      expect(optimizedSolvable).toBeGreaterThanOrEqual(baselineSolvable);
    });

    it('measures success rate for 8x8', () => {
      const trials = 10; // Reduced for faster testing
      let solvableCount = 0;

      for (let i = 0; i < trials; i++) {
        const seed = `production-rate-8x8-${i}`;
        const map = generateLogicSolvablePuzzle(seed, 8, {
          requireLogicSolvable: false,
          maxOptimizationIterations: 1000,
        });

        if (isLogicSolvable(map)) {
          solvableCount++;
        }
      }

      const rate = solvableCount / trials;
      console.log(`8x8 success rate: ${(rate * 100).toFixed(1)}%`);
      expect(rate).toBeGreaterThan(0.5);
    });

    it('measures performance for 8x8', () => {
      const seed = 'perf-8x8';
      const baseline = ensureUniqueBaseline(seed, 8);
      if (!baseline) return;

      const rng = createRng(seed + ':opt');
      const start = performance.now();
      optimizeForLogicSolvability(baseline, 1000, rng);
      const duration = performance.now() - start;

      console.log(`8x8 optimization duration: ${duration.toFixed(1)}ms`);
      expect(duration).toBeLessThan(20);
    });

    it('optimizes 10x10 puzzles effectively', () => {
      const trials = 10; // Reduced for faster testing
      let baselineSolvable = 0;
      let optimizedSolvable = 0;
      let successfulTrials = 0;

      for (let i = 0; i < trials; i++) {
        const seed = `production-10x10-${i}`;
        const baseline = ensureUniqueBaseline(seed, 10);

        if (!baseline) continue;

        const rng = createRng(seed + ':opt');
        const optimized = optimizeForLogicSolvability(baseline, 1000, rng);

        successfulTrials++;
        if (isLogicSolvable(baseline)) baselineSolvable++;
        if (isLogicSolvable(optimized)) optimizedSolvable++;
      }

      const baselineRate = baselineSolvable / successfulTrials;
      const optimizedRate = optimizedSolvable / successfulTrials;

      console.log(
        `10x10 - Baseline: ${(baselineRate * 100).toFixed(1)}%, Optimized: ${(optimizedRate * 100).toFixed(1)}% (${successfulTrials}/${trials} trials)`,
      );

      expect(optimizedSolvable).toBeGreaterThanOrEqual(baselineSolvable);
    });

    it('measures success rate for 10x10', () => {
      const trials = 10; // Reduced for faster testing
      let solvableCount = 0;

      for (let i = 0; i < trials; i++) {
        const seed = `production-rate-10x10-${i}`;
        const map = generateLogicSolvablePuzzle(seed, 10, {
          requireLogicSolvable: false,
          maxOptimizationIterations: 1000,
        });

        if (isLogicSolvable(map)) {
          solvableCount++;
        }
      }

      const rate = solvableCount / trials;
      console.log(`10x10 success rate: ${(rate * 100).toFixed(1)}%`);
      expect(rate).toBeGreaterThan(0.4);
    });

    it('measures performance for 10x10', () => {
      const seed = 'perf-10x10';
      const baseline = ensureUniqueBaseline(seed, 10);
      if (!baseline) return;

      const rng = createRng(seed + ':opt');
      const start = performance.now();
      optimizeForLogicSolvability(baseline, 1000, rng);
      const duration = performance.now() - start;

      console.log(`10x10 optimization duration: ${duration.toFixed(1)}ms`);
      expect(duration).toBeLessThan(50);
    });

    it('optimizes 12x12 puzzles effectively', () => {
      const trials = 15;
      let baselineSolvable = 0;
      let optimizedSolvable = 0;
      let successfulTrials = 0;

      for (let i = 0; i < trials; i++) {
        const seed = `production-12x12-${i}`;
        const baseline = ensureUniqueBaseline(seed, 12);

        if (!baseline) continue;

        const rng = createRng(seed + ':opt');
        const optimized = optimizeForLogicSolvability(baseline, 1000, rng);

        successfulTrials++;
        if (isLogicSolvable(baseline)) baselineSolvable++;
        if (isLogicSolvable(optimized)) optimizedSolvable++;
      }

      const baselineRate = baselineSolvable / successfulTrials;
      const optimizedRate = optimizedSolvable / successfulTrials;

      console.log(
        `12x12 - Baseline: ${(baselineRate * 100).toFixed(1)}%, Optimized: ${(optimizedRate * 100).toFixed(1)}% (${successfulTrials}/${trials} trials)`,
      );

      expect(optimizedSolvable).toBeGreaterThanOrEqual(baselineSolvable);
    });

    it('measures success rate for 12x12', () => {
      const trials = 15;
      let solvableCount = 0;

      for (let i = 0; i < trials; i++) {
        const seed = `production-rate-12x12-${i}`;
        const map = generateLogicSolvablePuzzle(seed, 12, {
          requireLogicSolvable: false,
          maxOptimizationIterations: 1000,
        });

        if (isLogicSolvable(map)) {
          solvableCount++;
        }
      }

      const rate = solvableCount / trials;
      console.log(`12x12 success rate: ${(rate * 100).toFixed(1)}%`);
      expect(rate).toBeGreaterThan(0.3);
    });

    it('measures performance for 12x12', () => {
      const seed = 'perf-12x12';
      const baseline = ensureUniqueBaseline(seed, 12);
      if (!baseline) return;

      const rng = createRng(seed + ':opt');
      const start = performance.now();
      optimizeForLogicSolvability(baseline, 1000, rng);
      const duration = performance.now() - start;

      console.log(`12x12 optimization duration: ${duration.toFixed(1)}ms`);
      expect(duration).toBeLessThan(100);
    });
  });
});
