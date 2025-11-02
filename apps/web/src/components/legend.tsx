import React from 'react';
import type { ValidationResult } from '@sovereign/engine';

const classNames = (...classes: (string | false | undefined)[]) =>
  classes.filter(Boolean).join(' ');

interface Props {
  validation: ValidationResult;
}

export const Legend: React.FC<Props> = ({ validation }) => {
  return (
    <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
      <div className="inline-flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-slate-900" /> <span>Sovereign</span>
      </div>
      <div className="inline-flex items-center gap-2">
        <span className="text-slate-700/80">×</span> <span>Mark</span>
      </div>
      <span
        className={classNames(
          'px-2 py-1 rounded-lg text-xs font-medium inline-flex items-center',
          validation.isValid
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-rose-100 text-rose-700',
        )}
      >
        Valid: {String(validation.isValid)}
      </span>
      <span
        className={classNames(
          'px-2 py-1 rounded-lg text-xs font-medium inline-flex items-center',
          validation.isComplete
            ? 'bg-indigo-100 text-indigo-700'
            : 'bg-slate-100 text-slate-600',
        )}
      >
        Complete: {String(validation.isComplete)}
      </span>
    </div>
  );
};

