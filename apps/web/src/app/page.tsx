'use client';

import React from 'react';
import { Grid } from '../components/grid';
import { useBoard } from '../hooks/use-board';

const Home = () => {
  const { board, regionMap, validation, onPlace, onRemove } = useBoard('demo-seed', 6);
  return (
    <main style={{ padding: 16 }}>
      <h1>Sovereign</h1>
      <Grid
        board={board}
        regionMap={regionMap}
        validation={validation}
        onPlace={onPlace}
        onRemove={onRemove}
      />
      <p style={{ marginTop: 8 }}>
        Valid: {String(validation.isValid)} | Complete: {String(validation.isComplete)}
      </p>
    </main>
  );
};

export default Home;
