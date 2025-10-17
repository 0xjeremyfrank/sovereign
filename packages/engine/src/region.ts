import { createRng } from './prng';
import type { RegionMap } from './types';

export const generateRegionMap = (seed: string, size: number): RegionMap => {
  const rng = createRng(seed + ':' + size);
  const numRegions = Math.max(2, Math.floor(size / 2));
  const regions: number[] = new Array(size * size);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const v = Math.floor(rng() * numRegions);
      regions[r * size + c] = v;
    }
  }
  return { width: size, height: size, regions };
};
