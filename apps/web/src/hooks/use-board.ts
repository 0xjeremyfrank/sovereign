import { useMemo, useState, useCallback } from 'react';
import {
  createEmptyBoard,
  generateRegionMap,
  cycleCellState,
  clearBoard,
  undoMove,
  validateBoard,
  decodeBoard,
  type BoardState,
  type RegionMap,
  type ValidationResult,
} from '@sovereign/engine';

export const useBoard = (seed: string, size: number, initialEncoded?: string | null) => {
  const regionMap: RegionMap = useMemo(() => generateRegionMap(seed, size), [seed, size]);
  const [board, setBoard] = useState<BoardState>(() => {
    if (initialEncoded) {
      try {
        return decodeBoard(initialEncoded, size);
      } catch {
        // fall through to empty
      }
    }
    return createEmptyBoard(size);
  });
  const validation: ValidationResult = useMemo(
    () => validateBoard(board, regionMap),
    [board, regionMap],
  );

  const onCycleCell = useCallback((row: number, col: number) => {
    setBoard((b) => cycleCellState(b, row, col));
  }, []);

  const onClear = useCallback(() => {
    setBoard((b) => clearBoard(b));
  }, []);

  const onUndo = useCallback(() => {
    setBoard((b) => undoMove(b));
  }, []);

  return { board, regionMap, validation, onCycleCell, onClear, onUndo };
};
