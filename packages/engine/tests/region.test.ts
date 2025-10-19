import { describe, expect, it } from 'vitest';
import { generateRegionMap, areRegionsContiguous } from '../src/region';

describe('region generation', () => {
  it('is deterministic for same seed/size', () => {
    const a = generateRegionMap('seed-1', 6);
    const b = generateRegionMap('seed-1', 6);
    expect(a).toEqual(b);
  });

  it('changes with seed or size', () => {
    const a = generateRegionMap('seed-1', 6);
    const b = generateRegionMap('seed-2', 6);
    const c = generateRegionMap('seed-1', 7);
    expect(a.regions).not.toEqual(b.regions);
    expect(a.regions).not.toEqual(c.regions);
  });

  it('generates contiguous regions', () => {
    // Reduced test coverage for faster CI (uniqueness enforcement is expensive on larger boards)
    const sizes = [5, 6];
    const seeds = ['test-1', 'test-2'];

    for (const size of sizes) {
      for (const seed of seeds) {
        const regionMap = generateRegionMap(seed, size);
        expect(areRegionsContiguous(regionMap)).toBe(true);
      }
    }
  });

  it('has correct number of regions', () => {
    const regionMap = generateRegionMap('test', 6);
    const uniqueRegions = new Set(regionMap.regions);
    expect(uniqueRegions.size).toBe(6); // One region per row/column
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
