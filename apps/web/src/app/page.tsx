'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Grid } from '../components/grid';
import { Toolbar } from '../components/toolbar';
import { Legend } from '../components/legend';
import { IconCrown } from '../components/icons';
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
    <div className="min-h-screen w-full bg-gradient-to-br from-amber-50 to-slate-100 text-slate-900">
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              Sovereign <span className="text-slate-400">•</span>
              <span className="inline-flex items-center gap-2 text-base font-medium text-slate-600">
                <IconCrown className="text-slate-800" /> logic puzzle
              </span>
            </h1>
            <p className="text-slate-600 mt-1">
              Place one sovereign per row, column, and region. No touching, even diagonally.
            </p>
          </div>
        </header>

        {/* Card */}
        <div className="rounded-2xl bg-white/80 backdrop-blur shadow-xl ring-1 ring-black/5 p-5 md:p-6">
          <Toolbar
            board={board}
            onClear={onClear}
            onUndo={onUndo}
            onNewBoard={handleNewBoard}
            size={size}
            onSizeChange={handleSizeChange}
          />

          {isGenerating || !regionMap ? (
            <div className="p-20 text-center text-slate-600">Generating puzzle...</div>
          ) : (
            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Board */}
              <div className="md:col-span-2">
                <Grid
                  board={board}
                  regionMap={regionMap}
                  validation={validation}
                  onCycleCell={onCycleCell}
                />
              </div>

              {/* Side panel */}
              <aside className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <Legend validation={validation} />
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <h3 className="font-semibold mb-2">Rules</h3>
                  <ul className="text-sm text-slate-700 space-y-1 list-disc pl-5">
                    <li>
                      One sovereign per <span className="font-medium">row</span> and{' '}
                      <span className="font-medium">column</span>.
                    </li>
                    <li>
                      One sovereign per <span className="font-medium">region</span>.
                    </li>
                    <li>No two sovereigns may touch, even diagonally.</li>
                  </ul>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <h3 className="font-semibold mb-2">How to Play</h3>
                  <p className="text-sm text-slate-700">
                    Click cells to cycle through: blank → mark (×) → sovereign (●).
                  </p>
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
