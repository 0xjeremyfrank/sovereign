'use client';

import Link from 'next/link';
import { IconTrophy, IconPlus, IconCrown } from './icons';

export const ContestsEmptyState = () => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {/* Illustration */}
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-amber-100 flex items-center justify-center">
          <IconTrophy className="w-12 h-12 text-amber-500" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center ring-4 ring-white">
          <IconCrown className="w-4 h-4 text-slate-400" />
        </div>
      </div>

      {/* Copy */}
      <h2 className="text-xl font-semibold text-slate-900 mb-2">No contests yet</h2>
      <p className="text-slate-600 text-center max-w-md mb-6">
        Contests are on-chain competitions where you race to solve puzzles first. Winners earn
        prizes through verified smart contract payouts.
      </p>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors"
        >
          <IconCrown className="w-4 h-4" />
          Practice in Sandbox
        </Link>
        <Link
          href="/admin"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white text-slate-700 rounded-lg font-medium ring-1 ring-slate-200 hover:bg-slate-50 transition-colors"
        >
          <IconPlus className="w-4 h-4" />
          Create Contest
        </Link>
      </div>

      {/* Helper text */}
      <p className="text-sm text-slate-500 mt-4">Check back soon for upcoming contests</p>
    </div>
  );
};
