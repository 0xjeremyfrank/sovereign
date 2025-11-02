import React, { useCallback } from 'react';
import type { BoardState, RegionMap, ValidationResult, CellState } from '@sovereign/engine';

interface Props {
  board: BoardState;
  regionMap: RegionMap | null;
  validation: ValidationResult;
  onCycleCell: (row: number, col: number) => void;
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

export const Grid: React.FC<Props> = ({ board, regionMap, validation, onCycleCell }) => {
  const size = board.size;

  const isViolationIdx = useCallback(
    (idx: number) => validation.violations.some((v) => v.cells.includes(idx)),
    [validation.violations],
  );

  if (!regionMap) {
    return <div>Loading...</div>;
  }

  return (
    <div
      role="grid"
      aria-label="Puzzle grid"
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
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
            onClick={() => onCycleCell(r, c)}
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
