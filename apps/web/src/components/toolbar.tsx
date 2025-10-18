import React from 'react';
import type { BoardState } from '@sovereign/engine';
import { useShare } from '../hooks/use-share';

interface Props {
  board: BoardState;
}

export const Toolbar: React.FC<Props> = ({ board }) => {
  const { url, copy, copied } = useShare(board);
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '12px 0' }}>
      <button onClick={copy}>Share</button>
      <input readOnly value={url} style={{ flex: 1 }} aria-label="Share URL" />
      {copied ? <span aria-live="polite">Copied!</span> : null}
    </div>
  );
};
