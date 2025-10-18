import type { BoardState, CellState } from './types';

const linear = (row: number, col: number, size: number): number => row * size + col;

export const encodeBoard = (board: BoardState): string => {
  // Extract sovereign positions and encode as [col_for_row_0, col_for_row_1, ...]
  // Only 'sovereign' cells are encoded; 'marked' cells are treated as blank
  const sovereigns: number[] = [];

  for (let row = 0; row < board.size; row++) {
    let colWithSovereign = -1;
    for (let col = 0; col < board.size; col++) {
      const idx = linear(row, col, board.size);
      if (board.cells[idx] === 'sovereign') {
        colWithSovereign = col;
        break;
      }
    }
    sovereigns.push(colWithSovereign);
  }

  const json = JSON.stringify(sovereigns);
  const base64 = btoa(json);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

export const decodeBoard = (encoded: string, size: number): BoardState => {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '==='.slice((base64.length + 3) % 4);
  const json = atob(padded);
  const sovereigns = JSON.parse(json) as number[];

  // Create cells array from sovereign positions
  const cells: CellState[] = Array.from({ length: size * size }, () => 'blank');

  for (let row = 0; row < size; row++) {
    const col = sovereigns[row];
    if (col !== undefined && col >= 0) {
      const idx = linear(row, col, size);
      cells[idx] = 'sovereign';
    }
  }

  return { size, cells, history: [] };
};
