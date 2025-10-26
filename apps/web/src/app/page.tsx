'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Grid } from '../components/grid';
import { Toolbar } from '../components/toolbar';
import { useBoard } from '../hooks/use-board';

const Home = () => {
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const initial = params.get('state');

  // Use a stable initial seed to avoid hydration mismatches
  const [seed, setSeed] = useState('initial-seed');
  const [size, setSize] = useState(8);

  // Generate a random seed on client mount only
  useEffect(() => {
    setSeed(`seed-${Math.random().toString(36).substring(2, 9)}`);
  }, []);

  const { board, regionMap, validation, isGenerating, onCycleCell, onClear, onUndo } = useBoard(
    seed,
    size,
    initial,
  );

  const handleNewBoard = useCallback(() => {
    // Generate a new random seed
    setSeed(`seed-${Math.random().toString(36).substring(2, 9)}`);
  }, []);

  const handleSizeChange = useCallback((newSize: number) => {
    setSize(newSize);
  }, []);

  return (
    <main style={{ padding: 16 }}>
      <h1>Sovereign</h1>
      <Toolbar
        board={board}
        onClear={onClear}
        onUndo={onUndo}
        onNewBoard={handleNewBoard}
        size={size}
        onSizeChange={handleSizeChange}
      />
      {isGenerating || !regionMap ? (
        <div style={{ padding: 20, textAlign: 'center' }}>Generating puzzle...</div>
      ) : (
        <Grid
          board={board}
          regionMap={regionMap}
          validation={validation}
          onCycleCell={onCycleCell}
        />
      )}
    </main>
  );
};

export default Home;
