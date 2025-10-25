import { useMemo, useState, useCallback, useEffect } from 'react';
import {
  createEmptyBoard,
  generateLogicSolvablePuzzle,
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
  // Adjust generation options based on board size to prevent blocking on large boards
  const generationOptions = useMemo(() => {
    if (size <= 8) {
      return { maxOptimizationIterations: 500, requireLogicSolvable: true, maxRetries: 100 };
    } else if (size === 9) {
      return { maxOptimizationIterations: 200, requireLogicSolvable: true, maxRetries: 50 };
    } else {
      // size === 10
      return { maxOptimizationIterations: 100, requireLogicSolvable: true, maxRetries: 20 };
    }
  }, [size]);

  // Use optimized logic-solvable puzzle generation
  const regionMap: RegionMap = useMemo(
    () => generateLogicSolvablePuzzle(seed, size, generationOptions),
    [seed, size, generationOptions],
  );

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

  // Reset board when seed or size changes (but ignore initialEncoded after first load)
  useEffect(() => {
    setBoard(createEmptyBoard(size));
  }, [seed, size]);

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
