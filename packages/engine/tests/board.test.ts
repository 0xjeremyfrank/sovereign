import { describe, expect, it } from 'vitest';
import { createEmptyBoard, cycleCellState, clearBoard, undoMove } from '../src/board';

describe('board operations', () => {
  describe('createEmptyBoard', () => {
    it('creates a board with all blank cells', () => {
      const board = createEmptyBoard(5);
      expect(board.size).toBe(5);
      expect(board.cells).toHaveLength(25);
      expect(board.cells.every((c) => c === 'blank')).toBe(true);
      expect(board.history).toHaveLength(0);
    });
  });

  describe('cycleCellState', () => {
    it('cycles from blank to marked to sovereign to blank', () => {
      let board = createEmptyBoard(3);

      // blank → marked
      board = cycleCellState(board, 0, 0);
      expect(board.cells[0]).toBe('marked');
      expect(board.history).toHaveLength(1);

      // marked → sovereign
      board = cycleCellState(board, 0, 0);
      expect(board.cells[0]).toBe('sovereign');
      expect(board.history).toHaveLength(2);

      // sovereign → blank
      board = cycleCellState(board, 0, 0);
      expect(board.cells[0]).toBe('blank');
      expect(board.history).toHaveLength(3);
    });

    it('handles out of bounds gracefully', () => {
      const board = createEmptyBoard(3);
      const unchanged1 = cycleCellState(board, -1, 0);
      const unchanged2 = cycleCellState(board, 0, 5);
      expect(unchanged1).toBe(board);
      expect(unchanged2).toBe(board);
    });
  });

  describe('clearBoard', () => {
    it('resets all cells to blank and saves history', () => {
      let board = createEmptyBoard(3);
      board = cycleCellState(board, 0, 0);
      board = cycleCellState(board, 1, 1);
      board = cycleCellState(board, 2, 2);

      expect(board.cells.some((c) => c !== 'blank')).toBe(true);

      board = clearBoard(board);
      expect(board.cells.every((c) => c === 'blank')).toBe(true);
      expect(board.history.length).toBeGreaterThan(0);
    });
  });

  describe('undoMove', () => {
    it('undoes the last move', () => {
      let board = createEmptyBoard(3);
      board = cycleCellState(board, 1, 1);

      expect(board.cells[4]).toBe('marked'); // cell at (1,1) in a 3x3 grid
      expect(board.history).toHaveLength(1);

      board = undoMove(board);
      expect(board.cells[4]).toBe('blank');
      expect(board.history).toHaveLength(0);
    });

    it('does nothing if history is empty', () => {
      const board = createEmptyBoard(3);
      const unchanged = undoMove(board);
      expect(unchanged).toBe(board);
    });

    it('can undo multiple moves in sequence', () => {
      let board = createEmptyBoard(3);
      board = cycleCellState(board, 0, 0);
      board = cycleCellState(board, 1, 1);
      board = cycleCellState(board, 2, 2);

      expect(board.history).toHaveLength(3);

      board = undoMove(board);
      expect(board.history).toHaveLength(2);

      board = undoMove(board);
      expect(board.history).toHaveLength(1);

      board = undoMove(board);
      expect(board.history).toHaveLength(0);
    });
  });
});
