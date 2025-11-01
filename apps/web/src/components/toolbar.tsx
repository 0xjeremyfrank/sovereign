import React from 'react';
import type { BoardState } from '@sovereign/engine';

interface Props {
  board: BoardState;
  onClear: () => void;
  onUndo: () => void;
  onNewBoard: () => void;
  size: number;
  onSizeChange: (size: number) => void;
}

export const Toolbar: React.FC<Props> = ({
  board,
  onClear,
  onUndo,
  onNewBoard,
  size,
  onSizeChange,
}) => {
  const canUndo = board.history.length > 0;

  return (
    <div
      style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '12px 0', flexWrap: 'wrap' }}
    >
      <button onClick={onNewBoard} aria-label="Generate new board">
        New Board
      </button>
      <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        Size:
        <select
          value={size}
          onChange={(e) => onSizeChange(Number(e.target.value))}
          aria-label="Board size"
        >
          <option value={5}>5×5</option>
          <option value={6}>6×6</option>
          <option value={7}>7×7</option>
          <option value={8}>8×8</option>
          <option value={9}>9×9</option>
          <option value={10}>10×10</option>
        </select>
      </label>
      <button onClick={onClear} aria-label="Clear board">
        Clear
      </button>
      <button onClick={onUndo} disabled={!canUndo} aria-label="Undo last move">
        Undo
      </button>
    </div>
  );
};
