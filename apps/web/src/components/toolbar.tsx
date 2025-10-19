import React from 'react';
import type { BoardState } from '@sovereign/engine';
import { useShare } from '../hooks/use-share';

interface Props {
  board: BoardState;
  onClear: () => void;
  onUndo: () => void;
}

export const Toolbar: React.FC<Props> = ({ board, onClear, onUndo }) => {
  const { url, copy, copied } = useShare(board);
  const canUndo = board.history.length > 0;

  return (
    <div
      style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '12px 0', flexWrap: 'wrap' }}
    >
      <button onClick={onClear} aria-label="Clear board">
        Clear
      </button>
      <button onClick={onUndo} disabled={!canUndo} aria-label="Undo last move">
        Undo
      </button>
      <button onClick={copy}>Share</button>
      <input readOnly value={url} style={{ flex: 1, minWidth: 200 }} aria-label="Share URL" />
      {copied ? <span aria-live="polite">Copied!</span> : null}
    </div>
  );
};
