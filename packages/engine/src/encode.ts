import type { BoardState } from './types';

export const encodeBoard = (board: BoardState): string => {
  // Simple JSON string for v1; can move to bitpacking later
  return Buffer.from(JSON.stringify(board.sovereigns)).toString('base64url');
};

export const decodeBoard = (encoded: string, size: number): BoardState => {
  const raw = Buffer.from(encoded, 'base64url').toString('utf8');
  const arr = JSON.parse(raw) as number[];
  const sovereigns = Array.from({ length: size }, (_, r) => arr[r] ?? -1);
  return { size, sovereigns };
};
