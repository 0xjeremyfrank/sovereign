import type { BoardState } from './types';

export const encodeBoard = (board: BoardState): string => {
  const json = JSON.stringify(board.sovereigns);
  const base64 = btoa(json);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

export const decodeBoard = (encoded: string, size: number): BoardState => {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '==='.slice((base64.length + 3) % 4);
  const json = atob(padded);
  const arr = JSON.parse(json) as number[];
  const sovereigns = Array.from({ length: size }, (_, r) => arr[r] ?? -1);
  return { size, sovereigns };
};
