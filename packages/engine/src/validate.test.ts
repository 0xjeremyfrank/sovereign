import { describe, expect, it } from 'vitest';
import { validateBoard } from './validate';
import { createEmptyBoard, placeSovereign } from './board';

const makeRegion = (size: number) => ({
  width: size,
  height: size,
  regions: Array.from({ length: size * size }, (_, i) => Math.floor(i / size)),
});

describe('validate', () => {
  it('is valid for non-conflicting placements', () => {
    const size = 4;
    const board = [
      placeSovereign(createEmptyBoard(size), 0, 1),
      placeSovereign(createEmptyBoard(size), 1, 3),
      placeSovereign(createEmptyBoard(size), 2, 0),
      placeSovereign(createEmptyBoard(size), 3, 2),
    ].reduce((_, b) => b);
    const region = makeRegion(size);
    const res = validateBoard(board, region);
    expect(res.isValid).toBe(true);
  });

  it('flags column conflicts', () => {
    const size = 3;
    let board = createEmptyBoard(size);
    board = placeSovereign(board, 0, 0);
    board = placeSovereign(board, 1, 0);
    const region = makeRegion(size);
    const res = validateBoard(board, region);
    expect(res.isValid).toBe(false);
    expect(res.violations.some((v) => v.rule === 'column')).toBe(true);
  });

  it('flags adjacency conflicts', () => {
    const size = 3;
    let board = createEmptyBoard(size);
    board = placeSovereign(board, 1, 1);
    board = placeSovereign(board, 2, 2); // diagonal touch
    const region = makeRegion(size);
    const res = validateBoard(board, region);
    expect(res.isValid).toBe(false);
    expect(res.violations.some((v) => v.rule === 'adjacent')).toBe(true);
  });
});
