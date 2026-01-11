import React from 'react';
import type { ValidationResult, BoardState } from '@sovereign/engine';
import { IconCrown, IconCheck, IconX } from './icons';
import { classNames } from '@/lib/utils';

interface Props {
  validation: ValidationResult;
  board: BoardState;
  size: number;
}

export const Legend: React.FC<Props> = ({ validation, board, size }) => {
  // Count sovereigns placed
  const sovereignCount = board.cells.filter((cell) => cell === 'sovereign').length;

  return (
    <div className="space-y-3">
      {/* Symbol legend */}
      <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
        <div className="inline-flex items-center gap-2">
          <IconCrown className="text-slate-900 w-6 h-6" /> <span>Sovereign</span>
        </div>
        <div className="inline-flex items-center gap-2">
          <span className="text-2xl text-slate-700/80">×</span> <span>Mark</span>
        </div>
      </div>

      {/* Progress counter */}
      <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-slate-100">
        <IconCrown className="text-amber-600 w-5 h-5" />
        <span className="text-sm font-medium text-slate-700">
          {sovereignCount} / {size}
        </span>
        <span className="text-xs text-slate-500">placed</span>
      </div>

      {/* Status indicators */}
      <div className="grid grid-cols-2 gap-2">
        <div
          className={classNames(
            'px-3 py-2 rounded-lg text-xs font-medium inline-flex items-center gap-1.5',
            validation.isValid
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-rose-100 text-rose-700',
          )}
        >
          {validation.isValid ? (
            <IconCheck className="w-3.5 h-3.5" />
          ) : (
            <IconX className="w-3.5 h-3.5" />
          )}
          {validation.isValid ? 'Valid' : 'Invalid'}
        </div>
        <div
          className={classNames(
            'px-3 py-2 rounded-lg text-xs font-medium inline-flex items-center gap-1.5',
            validation.isComplete
              ? 'bg-indigo-100 text-indigo-700'
              : 'bg-slate-100 text-slate-500',
          )}
        >
          {validation.isComplete ? (
            <IconCheck className="w-3.5 h-3.5" />
          ) : (
            <span className="w-3.5 h-3.5 rounded-full border-2 border-current" />
          )}
          {validation.isComplete ? 'Complete' : 'In progress'}
        </div>
      </div>
    </div>
  );
};

