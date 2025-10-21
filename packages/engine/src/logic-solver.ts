import type { RegionMap } from './types';

const inBounds = (n: number, r: number, c: number): boolean => r >= 0 && r < n && c >= 0 && c < n;

export const isLogicSolvable = (regionMap: RegionMap): boolean => {
  const n = regionMap.width;
  const regions = regionMap.regions;

  // candidates[r][c] indicates if cell (r,c) is currently allowed
  const candidates: boolean[][] = Array.from({ length: n }, () => Array(n).fill(true));
  const placedCols: number[] = Array(n).fill(-1);
  const usedCols: boolean[] = Array(n).fill(false);
  const usedRegions: boolean[] = Array(n).fill(false);

  const linear = (r: number, c: number) => r * n + c;

  const eliminateNeighbors = (r: number, c: number): void => {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const rr = r + dr;
        const cc = c + dc;
        if (inBounds(n, rr, cc)) candidates[rr]![cc] = false;
      }
    }
  };

  const place = (r: number, c: number): void => {
    placedCols[r] = c;
    usedCols[c] = true;
    usedRegions[regions[linear(r, c)]!] = true;

    // enforce row uniqueness
    for (let k = 0; k < n; k++) candidates[r]![k] = false;
    candidates[r]![c] = true;

    // enforce column uniqueness
    for (let rr = 0; rr < n; rr++) candidates[rr]![c] = false;
    candidates[r]![c] = true;

    // enforce region uniqueness
    const reg = regions[linear(r, c)]!;
    for (let rr = 0; rr < n; rr++) {
      for (let cc = 0; cc < n; cc++) {
        if (regions[linear(rr, cc)]! === reg && !(rr === r && cc === c)) {
          candidates[rr]![cc] = false;
        }
      }
    }

    eliminateNeighbors(r, c);
  };

  const pruneByUsedSets = (): void => {
    for (let r = 0; r < n; r++) {
      if (placedCols[r] !== -1) continue;
      for (let c = 0; c < n; c++) {
        if (!candidates[r]![c]) continue;
        if (usedCols[c]) {
          candidates[r]![c] = false;
          continue;
        }
        const reg = regions[linear(r, c)]!;
        if (usedRegions[reg]) {
          candidates[r]![c] = false;
          continue;
        }

        // adjacency with already placed queens
        for (let rr = 0; rr < n; rr++) {
          const pc = placedCols[rr] ?? -1;
          if (pc === -1) continue;
          if (Math.abs(rr - r) <= 1 && Math.abs(pc - c) <= 1) {
            candidates[r]![c] = false;
            break;
          }
        }
      }
    }
  };

  const rowSingles = (): boolean => {
    let progressed = false;
    for (let r = 0; r < n; r++) {
      if (placedCols[r] !== -1) continue;
      let cnt = 0;
      let lastC = -1;
      for (let c = 0; c < n; c++)
        if (candidates[r]![c]) {
          cnt++;
          lastC = c;
        }
      if (cnt === 0) return false; // contradiction
      if (cnt === 1) {
        place(r, lastC);
        progressed = true;
      }
    }
    return progressed ? true : (null as unknown as boolean); // use tri-state via null cast
  };

  const colSingles = (): boolean => {
    let progressed = false;
    for (let c = 0; c < n; c++) {
      let cnt = 0;
      let lastR = -1;
      for (let r = 0; r < n; r++)
        if (placedCols[r] === -1 && candidates[r]![c]) {
          cnt++;
          lastR = r;
        }
      if (cnt === 1 && placedCols[lastR] === -1) {
        place(lastR, c);
        progressed = true;
      }
    }
    return progressed;
  };

  const regionSingles = (): boolean => {
    let progressed = false;
    for (let reg = 0; reg < n; reg++) {
      let cnt = 0;
      let lastR = -1;
      let lastC = -1;
      for (let r = 0; r < n; r++) {
        if (placedCols[r] !== -1) continue;
        for (let c = 0; c < n; c++) {
          if (regions[linear(r, c)]! !== reg) continue;
          if (!candidates[r]![c]) continue;
          cnt++;
          lastR = r;
          lastC = c;
        }
      }
      if (cnt === 0 && usedRegions[reg]) continue; // region already placed via some row
      if (cnt === 0 && !usedRegions[reg]) return false; // contradiction: no candidate for this region
      if (cnt === 1 && placedCols[lastR] === -1) {
        place(lastR, lastC);
        progressed = true;
      }
    }
    return progressed;
  };

  // Iteratively apply rules
  let progress = true;
  while (progress) {
    progress = false;
    pruneByUsedSets();

    // Row singles (with contradiction detection)
    const rowRes = rowSingles();
    if (rowRes === false) return false;
    if (rowRes === true) {
      progress = true;
      continue;
    }

    // Column singles
    if (colSingles()) {
      progress = true;
      continue;
    }

    // Region singles
    if (regionSingles()) {
      progress = true;
      continue;
    }

    // No progress this pass
  }

  // Success if all rows placed
  for (let r = 0; r < n; r++) if (placedCols[r] === -1) return false;
  return true;
};
