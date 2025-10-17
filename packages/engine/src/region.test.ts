import { describe, expect, it } from 'vitest';
import { generateRegionMap } from './region';

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
});
