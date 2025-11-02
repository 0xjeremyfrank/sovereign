import React from 'react';
import type { BoardState } from '@sovereign/engine';
import { IconUndo } from './icons';

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
    <div className="flex flex-wrap items-center gap-3">
      <div className="inline-flex items-center gap-2">
        <button
          onClick={onNewBoard}
          aria-label="Generate new board"
          className="px-3 py-2 rounded-xl shadow-sm bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-sm transition-colors"
        >
          New Board
        </button>
        <select
          className="px-3 py-2 rounded-xl shadow-sm bg-white border border-slate-200 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          value={size}
          onChange={(e) => onSizeChange(Number(e.target.value))}
          aria-label="Board size"
        >
          {[5, 6, 7, 8, 9, 10].map((k) => (
            <option key={k} value={k}>
              {k}×{k}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={onClear}
          aria-label="Clear board"
          className="px-3 py-2 rounded-xl bg-slate-900 text-white text-sm shadow hover:bg-slate-800 transition-colors"
        >
          Clear
        </button>
        <button
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo last move"
          className="px-3 py-2 rounded-xl bg-white text-slate-800 text-sm border border-slate-200 shadow-sm hover:bg-slate-50 inline-flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <IconUndo /> Undo
        </button>
      </div>
    </div>
  );
};
