import { useMemo, useState, useCallback, useEffect } from 'react';
import {
  createEmptyBoard,
  cycleCellState,
  markCell,
  clearBoard,
  undoMove,
  validateBoard,
  decodeBoard,
  type BoardState,
  type RegionMap,
  type ValidationResult,
} from '@sovereign/engine';
import { usePuzzleWorker } from './use-puzzle-worker';

export const useBoard = (seed: string, size: number, initialEncoded?: string | null) => {
  // Adjust generation options based on board size to prevent blocking on large boards
  // Always require logic-solvable puzzles with enough retries to ensure success
  const generationOptions = useMemo(() => {
    const iterations = size <= 8 ? 50 : 30;
    const retries = size <= 8 ? 5 : size === 9 ? 3 : 2;
    return {
      maxOptimizationIterations: iterations,
      requireLogicSolvable: true,
      maxRetries: retries,
    };
  }, [size]);

  // Async puzzle generation using Web Worker to prevent UI blocking
  const [regionMap, setRegionMap] = useState<RegionMap | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);

  // Use Web Worker for puzzle generation
  const { generatePuzzle } = usePuzzleWorker({
    onSuccess: (puzzle) => {
      setRegionMap(puzzle);
      setIsGenerating(false);
    },
    onError: (error) => {
      console.error('[Puzzle Gen] Failed to generate puzzle:', error);
      generatePuzzle(
        seed,
        size,
        { maxOptimizationIterations: 30, requireLogicSolvable: true, maxRetries: 10 },
        true,
      );
    },
  });

  useEffect(() => {
    // Reset loading state when seed or size changes
    setIsGenerating(true);
    setRegionMap(null);

    // Generate puzzle using Web Worker
    generatePuzzle(seed, size, generationOptions);
  }, [seed, size, generationOptions, generatePuzzle]);

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

  const validation: ValidationResult = useMemo(() => {
    if (!regionMap) {
      return { isValid: true, isComplete: false, violations: [] };
    }
    return validateBoard(board, regionMap);
  }, [board, regionMap]);

  const onCycleCell = useCallback((row: number, col: number) => {
    setBoard((b: BoardState) => cycleCellState(b, row, col));
  }, []);

  const onMarkCell = useCallback((row: number, col: number) => {
    setBoard((b: BoardState) => markCell(b, row, col));
  }, []);

  const onClear = useCallback(() => {
    setBoard((b: BoardState) => clearBoard(b));
  }, []);

  const onUndo = useCallback(() => {
    setBoard((b: BoardState) => undoMove(b));
  }, []);

  return { board, regionMap, validation, isGenerating, onCycleCell, onMarkCell, onClear, onUndo };
};
