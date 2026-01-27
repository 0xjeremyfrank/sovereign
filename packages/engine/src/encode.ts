import type { BoardState, CellState } from './types';

const linear = (row: number, col: number, size: number): number => row * size + col;

/**
 * Encode board state as packed bytes (hex string).
 * Each byte represents the column index for that row's sovereign.
 * Format: 0x{col0}{col1}{col2}... where each is a single hex byte
 *
 * @example
 * // For a 5x5 board with sovereigns at columns [2, 4, 0, 3, 1]:
 * encodeBoard(board) // Returns "0x0204000301"
 */
export const encodeBoard = (board: BoardState): `0x${string}` => {
  const columns = extractSovereignColumns(board);
  return columnsToHex(columns);
};

/**
 * Encode board state as a Uint8Array (packed bytes).
 * Each byte represents the column index for that row's sovereign.
 */
export const encodeBoardAsBytes = (board: BoardState): Uint8Array => {
  const columns = extractSovereignColumns(board);
  return new Uint8Array(columns.map((c) => (c === -1 ? 255 : c)));
};

/**
 * Extract sovereign column indices from board state.
 * Returns array where index is row and value is column (-1 if no sovereign in row).
 */
export const extractSovereignColumns = (board: BoardState): number[] => {
  const sovereigns: number[] = [];

  for (let row = 0; row < board.size; row++) {
    let colWithSovereign = -1;
    for (let col = 0; col < board.size; col++) {
      const idx = linear(row, col, board.size);
      if (board.cells[idx] === 'sovereign') {
        colWithSovereign = col;
        break;
      }
    }
    sovereigns.push(colWithSovereign);
  }

  return sovereigns;
};

/**
 * Convert column indices to hex string (packed bytes format).
 */
export const columnsToHex = (columns: number[]): `0x${string}` => {
  const bytes = columns.map((c) => (c === -1 ? 255 : c));
  const hex = bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `0x${hex}` as `0x${string}`;
};

/**
 * Decode board state from encoded string.
 * Supports both new hex format (0x...) and legacy base64 JSON format.
 *
 * @example
 * decodeBoard("0x0204000301", 5) // Hex format
 * decodeBoard("WzIsNCwwLDMsMV0", 5) // Legacy base64 format
 */
export const decodeBoard = (encoded: string, size: number): BoardState => {
  // Detect format: hex starts with 0x, legacy is base64
  const isHexFormat = encoded.startsWith('0x');

  const columns = isHexFormat ? hexToColumns(encoded) : legacyDecodeColumns(encoded);

  const cells: CellState[] = Array.from({ length: size * size }, () => 'blank');

  for (let row = 0; row < size; row++) {
    const col = columns[row];
    if (col !== undefined && col >= 0 && col < size) {
      const idx = linear(row, col, size);
      cells[idx] = 'sovereign';
    }
  }

  return { size, cells, history: [] };
};

/**
 * Decode legacy base64 JSON format to column indices.
 */
const legacyDecodeColumns = (encoded: string): number[] => {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '==='.slice((base64.length + 3) % 4);
  const json = atob(padded);
  return JSON.parse(json) as number[];
};

/**
 * Convert hex string to column indices.
 */
export const hexToColumns = (hex: string): number[] => {
  // Remove 0x prefix if present
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;

  const columns: number[] = [];
  for (let i = 0; i < cleanHex.length; i += 2) {
    const byte = parseInt(cleanHex.slice(i, i + 2), 16);
    columns.push(byte === 255 ? -1 : byte);
  }

  return columns;
};

// Legacy format support for backwards compatibility during transition
// TODO: Remove after migration complete

/**
 * @deprecated Use encodeBoard() which returns hex format
 */
export const encodeBoardLegacy = (board: BoardState): string => {
  const sovereigns = extractSovereignColumns(board);
  const json = JSON.stringify(sovereigns);
  const base64 = btoa(json);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

/**
 * @deprecated Use decodeBoard() which accepts hex format
 */
export const decodeBoardLegacy = (encoded: string, size: number): BoardState => {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '==='.slice((base64.length + 3) % 4);
  const json = atob(padded);
  const sovereigns = JSON.parse(json) as number[];

  const cells: CellState[] = Array.from({ length: size * size }, () => 'blank');

  for (let row = 0; row < size; row++) {
    const col = sovereigns[row];
    if (col !== undefined && col >= 0) {
      const idx = linear(row, col, size);
      cells[idx] = 'sovereign';
    }
  }

  return { size, cells, history: [] };
};
