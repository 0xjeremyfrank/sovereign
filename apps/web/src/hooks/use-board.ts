import { useMemo, useState, useCallback } from 'react';
import {
  createEmptyBoard,
  generateRegionMap,
  placeSovereign,
  removeSovereign,
  validateBoard,
  type BoardState,
  type RegionMap,
  type ValidationResult,
} from '@sovereign/engine';

export const useBoard = (seed: string, size: number) => {
  const regionMap: RegionMap = useMemo(() => generateRegionMap(seed, size), [seed, size]);
  const [board, setBoard] = useState<BoardState>(() => createEmptyBoard(size));
  const validation: ValidationResult = useMemo(
    () => validateBoard(board, regionMap),
    [board, regionMap],
  );

  const onPlace = useCallback((row: number, col: number) => {
    setBoard((b) => placeSovereign(b, row, col));
  }, []);

  const onRemove = useCallback((row: number) => {
    setBoard((b) => removeSovereign(b, row));
  }, []);

  return { board, regionMap, validation, onPlace, onRemove };
};
