import type { BoardState, CellState } from './types';

const linear = (row: number, col: number, size: number): number => row * size + col;

export const createEmptyBoard = (size: number): BoardState => ({
  size,
  cells: Array.from({ length: size * size }, () => 'blank' as CellState),
  history: [],
});

const saveHistory = (board: BoardState): CellState[][] => {
  return [...board.history, board.cells.slice()];
};

export const cycleCellState = (board: BoardState, row: number, col: number): BoardState => {
  if (row < 0 || row >= board.size) return board;
  if (col < 0 || col >= board.size) return board;

  const idx = linear(row, col, board.size);
  const current = board.cells[idx];

  let next: CellState;
  if (current === 'blank') {
    next = 'marked';
  } else if (current === 'marked') {
    next = 'sovereign';
  } else {
    next = 'blank';
  }

  const newCells = board.cells.slice();
  newCells[idx] = next;

  return {
    ...board,
    cells: newCells,
    history: saveHistory(board),
  };
};

export const clearBoard = (board: BoardState): BoardState => {
  return {
    ...board,
    cells: Array.from({ length: board.size * board.size }, () => 'blank' as CellState),
    history: saveHistory(board),
  };
};

export const undoMove = (board: BoardState): BoardState => {
  if (board.history.length === 0) return board;

  const newHistory = board.history.slice();
  const previousCells = newHistory.pop()!;

  return {
    ...board,
    cells: previousCells,
    history: newHistory,
  };
};

// Legacy functions for backward compatibility (to be deprecated)
export const placeSovereign = (board: BoardState, row: number, col: number): BoardState => {
  if (row < 0 || row >= board.size) return board;
  if (col < 0 || col >= board.size) return board;

  const idx = linear(row, col, board.size);
  const newCells = board.cells.slice();
  newCells[idx] = 'sovereign';

  return {
    ...board,
    cells: newCells,
    history: saveHistory(board),
  };
};

export const removeSovereign = (board: BoardState, row: number): BoardState => {
  if (row < 0 || row >= board.size) return board;

  const newCells = board.cells.slice();
  for (let col = 0; col < board.size; col++) {
    const idx = linear(row, col, board.size);
    if (newCells[idx] === 'sovereign') {
      newCells[idx] = 'blank';
    }
  }

  return {
    ...board,
    cells: newCells,
    history: saveHistory(board),
  };
};
