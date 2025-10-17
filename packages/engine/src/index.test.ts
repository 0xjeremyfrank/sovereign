import { describe, expect, it } from 'vitest';
import { createEmptyBoard } from './index';

describe('engine', () => {
  it('creates an empty board of given size', () => {
    const board = createEmptyBoard(5);
    expect(board.size).toBe(5);
    expect(board.sovereigns).toHaveLength(5);
    expect(board.sovereigns.every((c) => c === -1)).toBe(true);
  });
});
