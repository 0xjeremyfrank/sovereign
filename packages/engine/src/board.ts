import type { BoardState } from './types';

export const createEmptyBoard = (size: number): BoardState => ({
  size,
  sovereigns: Array.from({ length: size }, () => -1),
});

export const placeSovereign = (board: BoardState, row: number, col: number): BoardState => {
  if (row < 0 || row >= board.size) return board;
  if (col < 0 || col >= board.size) return board;
  const next = board.sovereigns.slice();
  next[row] = col;
  return { ...board, sovereigns: next };
};

export const removeSovereign = (board: BoardState, row: number): BoardState => {
  if (row < 0 || row >= board.size) return board;
  const next = board.sovereigns.slice();
  next[row] = -1;
  return { ...board, sovereigns: next };
};
