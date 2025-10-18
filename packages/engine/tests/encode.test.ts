import { describe, expect, it } from 'vitest';
import { decodeBoard, encodeBoard } from '../src/encode';

describe('encode/decode', () => {
  it('round-trips', () => {
    const size = 5;
    const sovereigns = [1, -1, 3, 0, 4];
    const encoded = encodeBoard({ size, sovereigns });
    const decoded = decodeBoard(encoded, size);
    expect(decoded).toEqual({ size, sovereigns });
  });
});
