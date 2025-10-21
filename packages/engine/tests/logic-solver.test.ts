import { describe, it, expect } from 'vitest';
import { generateRegionMapWithConstraints } from '../src/region';
import { isLogicSolvable } from '../src/logic-solver';
import type { RegionMap } from '../src/types';

describe('logic solver - basic behavior', () => {
  it('finds at least one logic-solvable puzzle per size (5x5, 6x6)', () => {
    const sizes = [5, 6];
    const seeds = ['ls-seed-1', 'ls-seed-2', 'ls-seed-3', 'ls-seed-4', 'ls-seed-5'];
    for (const n of sizes) {
      let found = false;
      for (const seed of seeds) {
        const map = generateRegionMapWithConstraints(seed, n);
        if (isLogicSolvable(map)) {
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
    }
  });

  it('detects contradictions (no candidates)', () => {
    // Construct a trivial contradiction: all cells in a row belong to same region already placed
    const n = 5;
    const base = generateRegionMapWithConstraints('ls-contradict', n);
    const regions = [...base.regions];
    // Force two rows to share the same single-region exclusively (impossible for one-per-region)
    const firstRegion = regions[0]!;
    for (let c = 0; c < n; c++) regions[c] = firstRegion;
    const badMap: RegionMap = { width: n, height: n, regions };
    expect(isLogicSolvable(badMap)).toBe(false);
  });

  it('is deterministic - same input produces same result', () => {
    const seed = 'deterministic-test';
    const map1 = generateRegionMapWithConstraints(seed, 5);
    const map2 = generateRegionMapWithConstraints(seed, 5);

    const result1 = isLogicSolvable(map1);
    const result2 = isLogicSolvable(map2);

    expect(result1).toBe(result2);
  });

  it('measures baseline success rate on 5x5 boards', () => {
    const n = 5;
    const trials = 100;
    let solvableCount = 0;

    for (let i = 0; i < trials; i++) {
      const map = generateRegionMapWithConstraints(`5x5-trial-${i}`, n);
      if (isLogicSolvable(map)) {
        solvableCount++;
      }
    }

    const successRate = solvableCount / trials;
    // NOTE: Current baseline is ~56%. Target of 95% will be achieved in Phases 3-5
    // through enhanced region growth and hill-climbing optimization.
    console.log(`5x5 logic-solvable rate: ${(successRate * 100).toFixed(1)}%`);
    expect(successRate).toBeGreaterThan(0.5); // Baseline threshold
  });

  it('measures baseline success rate on 6x6 boards', () => {
    const n = 6;
    const trials = 100;
    let solvableCount = 0;

    for (let i = 0; i < trials; i++) {
      const map = generateRegionMapWithConstraints(`6x6-trial-${i}`, n);
      if (isLogicSolvable(map)) {
        solvableCount++;
      }
    }

    const successRate = solvableCount / trials;
    // NOTE: Current baseline is ~57%. Target of 95% will be achieved in Phases 3-5
    // through enhanced region growth and hill-climbing optimization.
    console.log(`6x6 logic-solvable rate: ${(successRate * 100).toFixed(1)}%`);
    expect(successRate).toBeGreaterThan(0.5); // Baseline threshold
  });

  it('runs efficiently on 5x5 (< 5ms per puzzle)', () => {
    const n = 5;
    const map = generateRegionMapWithConstraints('perf-5x5', n);

    const start = performance.now();
    isLogicSolvable(map);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(5);
  });

  it('runs efficiently on 6x6 (< 15ms per puzzle)', () => {
    const n = 6;
    const map = generateRegionMapWithConstraints('perf-6x6', n);

    const start = performance.now();
    isLogicSolvable(map);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(15);
  });
});

// Phase 3: Heuristic-Based Region Growth - SKIPPED
// Testing revealed that aggressive shape heuristics (narrow regions, chokepoints)
// made uniqueness harder to achieve (12% vs 56% baseline for 5x5).
// See .product/phase3-findings.md for detailed analysis.
// Proceeding directly to Phase 4: Hill-Climbing Optimization.
