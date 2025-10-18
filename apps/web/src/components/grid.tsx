import React from 'react';
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

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${size}, 32px)`, gap: 2 }}>
      {Array.from({ length: size * size }, (_, idx) => {
        const r = Math.floor(idx / size);
        const c = idx % size;
        const has = board.sovereigns[r] === c;
        const regionId = regionMap.regions[idx] ?? 0;
        const bg = `hsl(${(regionId * 47) % 360} 60% 90%)`;
        const isViolation = validation.violations.some((v) => v.cells.includes(idx));
        return (
          <button
            key={idx}
            aria-label={`cell-${r}-${c}`}
            onClick={() => (has ? onRemove(r) : onPlace(r, c))}
            style={{
              width: 32,
              height: 32,
              background: has ? '#333' : bg,
              color: has ? 'white' : 'black',
              border: isViolation ? '2px solid red' : '1px solid #ccc',
              cursor: 'pointer',
            }}
          >
            {has ? '●' : ''}
          </button>
        );
      })}
    </div>
  );
};
