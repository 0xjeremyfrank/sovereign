import React, { useCallback, useRef, useState, useEffect } from 'react';
import type { BoardState, RegionMap, ValidationResult, CellState } from '@sovereign/engine';

interface Props {
  board: BoardState;
  regionMap: RegionMap | null;
  validation: ValidationResult;
  onCycleCell: (row: number, col: number) => void;
  onMarkCell: (row: number, col: number) => void;
}

const PASTELS = [
  'bg-rose-200/70',
  'bg-amber-200/70',
  'bg-emerald-200/70',
  'bg-sky-200/70',
  'bg-indigo-200/70',
  'bg-fuchsia-200/70',
  'bg-teal-200/70',
  'bg-lime-200/70',
  'bg-orange-200/70',
  'bg-cyan-200/70',
];

const classNames = (...classes: (string | false | undefined)[]) =>
  classes.filter(Boolean).join(' ');

export const Grid: React.FC<Props> = ({
  board,
  regionMap,
  validation,
  onCycleCell,
  onMarkCell,
}) => {
  const size = board.size;
  const [isDragging, setIsDragging] = useState(false);
  const lastProcessedCellRef = useRef<{ row: number; col: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const hasMovedRef = useRef(false);
  const initialCellRef = useRef<{ row: number; col: number } | null>(null);

  const isViolationIdx = useCallback(
    (idx: number) => validation.violations.some((v) => v.cells.includes(idx)),
    [validation.violations],
  );

  const getCellFromPoint = useCallback(
    (clientX: number, clientY: number): { row: number; col: number } | null => {
      if (!gridRef.current) return null;

      const rect = gridRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      // Account for gap between cells (gap-1.5 = 6px)
      const cellSize = (rect.width - (size - 1) * 6) / size;
      const col = Math.floor(x / (cellSize + 6));
      const row = Math.floor(y / (cellSize + 6));

      if (row >= 0 && row < size && col >= 0 && col < size) {
        return { row, col };
      }
      return null;
    },
    [size],
  );

  const hasSovereign = useCallback(
    (row: number, col: number): boolean => {
      if (row < 0 || row >= size || col < 0 || col >= size) return false;
      const idx = row * size + col;
      return board.cells[idx] === 'sovereign';
    },
    [board.cells, size],
  );

  // Document-level mouse handlers for dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();

      // Mark the initial cell on first move
      if (!hasMovedRef.current && initialCellRef.current) {
        hasMovedRef.current = true;
        // Don't mark if it has a sovereign
        if (!hasSovereign(initialCellRef.current.row, initialCellRef.current.col)) {
          onMarkCell(initialCellRef.current.row, initialCellRef.current.col);
        }
      }

      const cell = getCellFromPoint(e.clientX, e.clientY);
      if (cell) {
        const last = lastProcessedCellRef.current;
        // Only process if it's a different cell and doesn't have a sovereign
        if (
          (!last || last.row !== cell.row || last.col !== cell.col) &&
          !hasSovereign(cell.row, cell.col)
        ) {
          lastProcessedCellRef.current = cell;
          onMarkCell(cell.row, cell.col);
        }
      }
    };

    const handleMouseUp = () => {
      const wasDragging = isDraggingRef.current && hasMovedRef.current;
      setIsDragging(false);
      isDraggingRef.current = false;
      lastProcessedCellRef.current = null;
      hasMovedRef.current = false;

      // If it was just a click (no movement), cycle the initial cell
      if (!wasDragging && initialCellRef.current) {
        onCycleCell(initialCellRef.current.row, initialCellRef.current.col);
      }
      initialCellRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, getCellFromPoint, onMarkCell, onCycleCell, hasSovereign]);

  // Document-level touch handlers for dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleTouchMove = (e: globalThis.TouchEvent) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();

      // Mark the initial cell on first move
      if (!hasMovedRef.current && initialCellRef.current) {
        hasMovedRef.current = true;
        // Don't mark if it has a sovereign
        if (!hasSovereign(initialCellRef.current.row, initialCellRef.current.col)) {
          onMarkCell(initialCellRef.current.row, initialCellRef.current.col);
        }
      }

      const touch = e.touches[0];
      if (touch) {
        const cell = getCellFromPoint(touch.clientX, touch.clientY);
        if (cell) {
          const last = lastProcessedCellRef.current;
          // Only process if it's a different cell and doesn't have a sovereign
          if (
            (!last || last.row !== cell.row || last.col !== cell.col) &&
            !hasSovereign(cell.row, cell.col)
          ) {
            lastProcessedCellRef.current = cell;
            onMarkCell(cell.row, cell.col);
          }
        }
      }
    };

    const handleTouchEnd = () => {
      const wasDragging = isDraggingRef.current && hasMovedRef.current;
      setIsDragging(false);
      isDraggingRef.current = false;
      lastProcessedCellRef.current = null;
      hasMovedRef.current = false;

      // If it was just a tap (no movement), cycle the initial cell
      if (!wasDragging && initialCellRef.current) {
        onCycleCell(initialCellRef.current.row, initialCellRef.current.col);
      }
      initialCellRef.current = null;
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isDragging, getCellFromPoint, onMarkCell, onCycleCell, hasSovereign]);

  // Grid-level start handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const cell = getCellFromPoint(e.clientX, e.clientY);
      if (cell) {
        setIsDragging(true);
        isDraggingRef.current = true;
        hasMovedRef.current = false;
        initialCellRef.current = cell;
        lastProcessedCellRef.current = cell;
        // Don't mark immediately - wait to see if it's a drag
      }
    },
    [getCellFromPoint],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) {
        const cell = getCellFromPoint(touch.clientX, touch.clientY);
        if (cell) {
          setIsDragging(true);
          isDraggingRef.current = true;
          hasMovedRef.current = false;
          initialCellRef.current = cell;
          lastProcessedCellRef.current = cell;
          // Don't mark immediately - wait to see if it's a drag
        }
      }
    },
    [getCellFromPoint],
  );

  if (!regionMap) {
    return <div>Loading...</div>;
  }

  return (
    <div
      ref={gridRef}
      role="grid"
      aria-label="Puzzle grid"
      tabIndex={0}
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {Array.from({ length: size * size }, (_, idx) => {
        const r = Math.floor(idx / size);
        const c = idx % size;
        const cellState: CellState = board.cells[idx] ?? 'blank';
        const regionId = regionMap.regions[idx] ?? 0;
        const pastel = PASTELS[regionId % PASTELS.length];
        const violation = isViolationIdx(idx);

        return (
          <button
            key={idx}
            id={`cell-${r}-${c}`}
            role="gridcell"
            aria-rowindex={r + 1}
            aria-colindex={c + 1}
            aria-selected={cellState === 'sovereign'}
            aria-invalid={violation || undefined}
            aria-label={`row ${r + 1} column ${c + 1}${cellState === 'sovereign' ? ' has sovereign' : cellState === 'marked' ? ' marked' : ''}${violation ? ' violating' : ''}`}
            onClick={(e) => {
              // Prevent click if we were dragging
              if (hasMovedRef.current) {
                e.preventDefault();
                return;
              }
              // Normal click handling is done in mouseup handler
            }}
            className={classNames(
              'relative flex items-center justify-center aspect-square select-none',
              'transition-transform duration-150 ease-out',
              'border border-white/50 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]',
              'hover:scale-[1.02] active:scale-[0.98]',
              'rounded-md',
              pastel,
              violation && 'ring-2 ring-red-500',
            )}
          >
            {cellState === 'marked' && (
              <span className="text-sm font-semibold text-slate-700/80">×</span>
            )}
            {cellState === 'sovereign' && (
              <span className="flex items-center gap-1 text-slate-800">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-900/90" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
