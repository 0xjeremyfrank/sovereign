import type { BoardState, RegionMap, ValidationResult, ValidationViolation } from './types';

const linear = (r: number, c: number, size: number) => r * size + c;

export const validateBoard = (board: BoardState, region: RegionMap): ValidationResult => {
  const size = board.size;
  const colsToCells = new Map<number, number[]>();
  const regionToCells = new Map<number, number[]>();
  const occupied = new Set<number>();
  const violations: ValidationViolation[] = [];

  // Extract sovereign positions from cells array (ignore 'marked' cells, treat as blank)
  const positions: Array<[number, number]> = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const idx = linear(r, c, size);
      const cellState = board.cells[idx];

      // Only process 'sovereign' cells; 'marked' and 'blank' are ignored
      if (cellState === 'sovereign') {
        positions.push([r, c]);
        occupied.add(idx);

        // track column cells
        const colCells = colsToCells.get(c) ?? [];
        colCells.push(idx);
        colsToCells.set(c, colCells);

        // track region cells
        const regId = region.regions[idx]!;
        const regCells = regionToCells.get(regId) ?? [];
        regCells.push(idx);
        regionToCells.set(regId, regCells);
      }
    }
  }

  // column uniqueness: mark all cells in conflicting columns
  for (const [, cells] of colsToCells) {
    if (cells.length > 1) {
      violations.push({ rule: 'column', cells: Array.from(new Set(cells)) });
    }
  }

  // region uniqueness: mark all cells in conflicting regions
  for (const [, cells] of regionToCells) {
    if (cells.length > 1) {
      violations.push({ rule: 'region', cells: Array.from(new Set(cells)) });
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
