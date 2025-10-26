import { describe, expect, it } from 'vitest';
import { performance } from 'perf_hooks';
import { generateRegionMapWithConstraints, areRegionsContiguous } from '../src/region';
import { hasAtMostSolutions } from '../src/solver';

describe('region generation', () => {
  it('is deterministic for same seed/size', () => {
    const a = generateRegionMapWithConstraints('seed-1', 6);
    const b = generateRegionMapWithConstraints('seed-1', 6);
    expect(a).toEqual(b);
  });

  it('changes with seed or size', () => {
    const a = generateRegionMapWithConstraints('seed-1', 6);
    const b = generateRegionMapWithConstraints('seed-2', 6);
    const c = generateRegionMapWithConstraints('seed-1', 7);
    expect(a.regions).not.toEqual(b.regions);
    expect(a.regions).not.toEqual(c.regions);
  });

  it('generates contiguous regions', () => {
    // Reduced test coverage for faster CI (uniqueness enforcement is expensive on larger boards)
    const sizes = [5, 6];
    const seeds = ['test-1', 'test-2'];

    for (const size of sizes) {
      for (const seed of seeds) {
        const regionMap = generateRegionMapWithConstraints(seed, size);
        expect(areRegionsContiguous(regionMap)).toBe(true);
      }
    }
  });

  it('has correct number of regions', () => {
    const regionMap = generateRegionMapWithConstraints('test', 6);
    const uniqueRegions = new Set(regionMap.regions);
    expect(uniqueRegions.size).toBe(6); // One region per row/column
  });
});

describe('constraint-aware region generation', () => {
  it('is deterministic for same seed/size', () => {
    const a = generateRegionMapWithConstraints('seed-1', 5);
    const b = generateRegionMapWithConstraints('seed-1', 5);
    expect(a).toEqual(b);
  });

  it('generates contiguous regions', () => {
    const sizes = [5, 6];
    const seeds = ['test-1', 'test-2'];

    for (const size of sizes) {
      for (const seed of seeds) {
        const regionMap = generateRegionMapWithConstraints(seed, size);
        expect(areRegionsContiguous(regionMap)).toBe(true);
      }
    }
  });

  it('has correct number of regions', () => {
    const regionMap = generateRegionMapWithConstraints('test', 5);
    const uniqueRegions = new Set(regionMap.regions);
    expect(uniqueRegions.size).toBe(5);
  });

  it('has high uniqueness rate', () => {
    // Method 1 has 100% success for 5x5, ~72% for 6x6
    // Test 10 seeds to verify high success rate
    const seeds = Array.from({ length: 10 }, (_, i) => `uniqueness-test-${i}`);
    let uniqueCount = 0;

    for (const seed of seeds) {
      const regionMap = generateRegionMapWithConstraints(seed, 5);
      const isUnique = hasAtMostSolutions(regionMap, 1);
      if (isUnique) {
        uniqueCount++;
      }
    }

    // Should have high success rate for 5x5
    expect(uniqueCount).toBeGreaterThanOrEqual(8); // At least 80% success
  });

  it('produces deterministic results for same seed', () => {
    const seed = 'deterministic-test';
    const size = 5;

    const map1 = generateRegionMapWithConstraints(seed, size);
    const map2 = generateRegionMapWithConstraints(seed, size);

    // Should be deterministic - same seed produces same result
    expect(map1).toEqual(map2);

    // Should be contiguous
    expect(areRegionsContiguous(map1)).toBe(true);
  });

  it('performance comparison', () => {
    const seed = 'perf-test';
    const size = 5;
    const iterations = 10;

    // Benchmark constraint-aware method
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      generateRegionMapWithConstraints(`${seed}-${i}`, size);
    }
    const duration = performance.now() - start;

    // Should complete in reasonable time (< 100ms for 10 iterations of 5x5)
    expect(duration).toBeLessThan(100);

    console.log(`Average time per 5x5 puzzle: ${(duration / iterations).toFixed(2)}ms`);
  });
});

describe('areRegionsContiguous', () => {
  it('detects non-contiguous regions', () => {
    // Create a region map with non-contiguous region 0
    const nonContiguous = {
      width: 3,
      height: 3,
      regions: [
        0,
        1,
        0, // region 0 is split
        1,
        1,
        1,
        2,
        2,
        2,
      ],
    };
    expect(areRegionsContiguous(nonContiguous)).toBe(false);
  });

  it('accepts contiguous regions', () => {
    const contiguous = {
      width: 3,
      height: 3,
      regions: [0, 0, 1, 0, 1, 1, 2, 2, 2],
    };
    expect(areRegionsContiguous(contiguous)).toBe(true);
  });
});
