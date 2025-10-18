import { describe, expect, it } from 'vitest';
import { decodeBoard, encodeBoard } from '../src/encode';
import { createEmptyBoard, placeSovereign } from '../src/board';

describe('encode/decode', () => {
  it('round-trips', () => {
    const size = 5;
    let board = createEmptyBoard(size);
    board = placeSovereign(board, 0, 1);
    board = placeSovereign(board, 2, 3);
    board = placeSovereign(board, 3, 0);
    board = placeSovereign(board, 4, 4);

    const encoded = encodeBoard(board);
    const decoded = decodeBoard(encoded, size);

    // Compare only cells (history may differ)
    expect(decoded.size).toBe(board.size);
    expect(decoded.cells).toEqual(board.cells);
  });

  it('ignores marked cells when encoding', () => {
    const size = 3;
    const board = createEmptyBoard(size);

    // Manually set some marked cells and some sovereign cells
    board.cells[0] = 'sovereign'; // (0,0)
    board.cells[4] = 'marked'; // (1,1) - should be ignored
    board.cells[8] = 'sovereign'; // (2,2)

    const encoded = encodeBoard(board);
    const decoded = decodeBoard(encoded, size);

    expect(decoded.cells[0]).toBe('sovereign');
    expect(decoded.cells[4]).toBe('blank'); // marked cell becomes blank
    expect(decoded.cells[8]).toBe('sovereign');
  });
});
