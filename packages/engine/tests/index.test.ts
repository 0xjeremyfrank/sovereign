import { describe, expect, it } from 'vitest';
import { createEmptyBoard } from '../src/index';

describe('engine', () => {
  it('creates an empty board of given size', () => {
    const board = createEmptyBoard(5);
    expect(board.size).toBe(5);
    expect(board.cells).toHaveLength(25);
    expect(board.cells.every((c) => c === 'blank')).toBe(true);
  });
});
