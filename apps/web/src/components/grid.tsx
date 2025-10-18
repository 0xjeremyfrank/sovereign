import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { BoardState, RegionMap, ValidationResult } from '@sovereign/engine';

interface Props {
  board: BoardState;
  regionMap: RegionMap;
  validation: ValidationResult;
  onPlace: (row: number, col: number) => void;
  onRemove: (row: number) => void;
}

export const Grid: React.FC<Props> = ({ board, regionMap, validation, onPlace, onRemove }) => {
  const size = board.size;
  const cellRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [focusIdx, setFocusIdx] = useState(0);

  const isViolationIdx = useCallback(
    (idx: number) => validation.violations.some((v) => v.cells.includes(idx)),
    [validation.violations],
  );

  const statusText = useMemo(
    () => `Valid: ${String(validation.isValid)} | Complete: ${String(validation.isComplete)}`,
    [validation.isValid, validation.isComplete],
  );

  const focusCell = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(size * size - 1, idx));
      setFocusIdx(clamped);
      const btn = cellRefs.current[clamped];
      if (btn) btn.focus();
    },
    [size],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const row = Math.floor(focusIdx / size);
      const col = focusIdx % size;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        focusCell(row * size + ((col + 1) % size));
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        focusCell(row * size + ((col - 1 + size) % size));
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nr = (row + 1) % size;
        focusCell(nr * size + col);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const nr = (row - 1 + size) % size;
        focusCell(nr * size + col);
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const has = board.sovereigns[row] === col;
        if (has) onRemove(row);
        else onPlace(row, col);
        return;
      }
    },
    [board.sovereigns, focusIdx, onPlace, onRemove, size, focusCell],
  );

  // When the container receives focus, move focus to the current active cell
  const onContainerFocus = useCallback(() => {
    focusCell(focusIdx);
  }, [focusCell, focusIdx]);

  return (
    <div>
      <div
        role="grid"
        aria-label="Puzzle grid"
        aria-describedby="grid-status"
        tabIndex={0}
        onFocus={onContainerFocus}
        onKeyDown={onKeyDown}
        style={{ display: 'inline-grid', gridTemplateColumns: `repeat(${size}, 32px)`, gap: 2 }}
      >
        {Array.from({ length: size * size }, (_, idx) => {
          const r = Math.floor(idx / size);
          const c = idx % size;
          const has = board.sovereigns[r] === c;
          const regionId = regionMap.regions[idx] ?? 0;
          const bg = `hsl(${(regionId * 47) % 360} 60% 90%)`;
          const violation = isViolationIdx(idx);
          return (
            <button
              key={idx}
              ref={(el) => {
                cellRefs.current[idx] = el;
              }}
              id={`cell-${r}-${c}`}
              role="gridcell"
              aria-rowindex={r + 1}
              aria-colindex={c + 1}
              aria-selected={has}
              aria-invalid={violation || undefined}
              aria-label={`row ${r + 1} column ${c + 1}${has ? ' has piece' : ''}${violation ? ' violating' : ''}`}
              tabIndex={focusIdx === idx ? 0 : -1}
              onClick={() => (has ? onRemove(r) : onPlace(r, c))}
              style={{
                width: 32,
                height: 32,
                background: has ? '#333' : bg,
                color: has ? 'white' : 'black',
                border: violation ? '2px solid red' : '1px solid #ccc',
                cursor: 'pointer',
                outlineOffset: 2,
              }}
            >
              {has ? '●' : ''}
            </button>
          );
        })}
      </div>
      <p id="grid-status" aria-live="polite" style={{ marginTop: 8 }}>
        {statusText}
      </p>
    </div>
  );
};
