'use client';

import React from 'react';
import { Grid } from '../components/grid';
import { Toolbar } from '../components/toolbar';
import { useBoard } from '../hooks/use-board';

const Home = () => {
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const initial = params.get('state');
  const { board, regionMap, validation, onCycleCell, onClear, onUndo } = useBoard(
    'demo-seed',
    5,
    initial,
  );
  return (
    <main style={{ padding: 16 }}>
      <h1>Sovereign</h1>
      <Toolbar board={board} onClear={onClear} onUndo={onUndo} />
      <Grid board={board} regionMap={regionMap} validation={validation} onCycleCell={onCycleCell} />
    </main>
  );
};

export default Home;
