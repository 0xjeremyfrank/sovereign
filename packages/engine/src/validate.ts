import type { BoardState, RegionMap, ValidationResult, ValidationViolation } from './types';

const linear = (r: number, c: number, size: number) => r * size + c;

export const validateBoard = (board: BoardState, region: RegionMap): ValidationResult => {
  const size = board.size;
  const cols = new Map<number, number>();
  const regions = new Map<number, number>();
  const occupied = new Set<number>();
  const violations: ValidationViolation[] = [];

  // place coordinates
  const positions: Array<[number, number]> = [];
  for (let r = 0; r < size; r++) {
    const cMaybe = board.sovereigns[r];
    if (typeof cMaybe === 'number' && cMaybe >= 0) {
      const c = cMaybe;
      positions.push([r, c]);
      occupied.add(linear(r, c, size));
    }
  }

  // column & region uniqueness
  for (const [r, c] of positions) {
    const colCount = (cols.get(c) ?? 0) + 1;
    cols.set(c, colCount);
    if (colCount > 1) {
      violations.push({ rule: 'column', cells: [linear(r, c, size)] });
    }
    const regionId = region.regions[linear(r, c, size)]!;
    const regCount = (regions.get(regionId) ?? 0) + 1;
    regions.set(regionId, regCount);
    if (regCount > 1) {
      violations.push({ rule: 'region', cells: [linear(r, c, size)] });
    }
  }

  // adjacency (including diagonals)
  const dirs: ReadonlyArray<readonly [number, number]> = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ] as const;
  for (const [r, c] of positions) {
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
      if (occupied.has(linear(nr, nc, size))) {
        violations.push({ rule: 'adjacent', cells: [linear(r, c, size), linear(nr, nc, size)] });
      }
    }
  }

  const isComplete = positions.length === size && violations.length === 0;
  return { isValid: violations.length === 0, isComplete, violations };
};
