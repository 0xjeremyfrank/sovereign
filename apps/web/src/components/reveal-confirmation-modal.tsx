'use client';

import { formatEther } from 'viem';

import { CURRENCY } from '../lib/chain-config';

interface RevealConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  contestId: bigint;
  depositPaid: bigint;
  potentialReward: bigint;
  expectedRank: number;
}

export const RevealConfirmationModal = ({
  isOpen,
  onConfirm,
  onCancel,
  contestId,
  depositPaid,
  potentialReward,
  expectedRank,
}: RevealConfirmationModalProps) => {
  if (!isOpen) return null;

  const deposit = formatEther(depositPaid);
  const reward = formatEther(potentialReward);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
        <h2 className="text-2xl font-bold mb-4">Confirm Reveal</h2>

        <div className="space-y-4 mb-6">
          <p className="text-slate-700">
            You are about to reveal your solution to Contest #{contestId.toString()}.
          </p>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="font-semibold text-green-800 mb-1">Potential Reward</p>
            <p className="text-2xl font-bold text-green-600">{reward} {CURRENCY.symbol}</p>
            <p className="text-sm text-green-700 mt-1">
              You will be winner #{expectedRank} if your solution is valid.
            </p>
          </div>

          {depositPaid > 0n && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="font-semibold text-amber-800 mb-1">Deposit Refund</p>
              <p className="text-2xl font-bold text-amber-600">{deposit} {CURRENCY.symbol}</p>
              <p className="text-sm text-amber-700 mt-1">
                This deposit will be refunded on valid reveal.
              </p>
            </div>
          )}

          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="font-semibold text-red-800 mb-2">Warning</p>
            <ul className="text-sm text-red-700 space-y-1 list-disc pl-5">
              <li>Invalid solutions will forfeit your deposit</li>
              <li>Make sure your solution matches your commitment</li>
              <li>This action cannot be undone</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 bg-slate-200 text-slate-800 rounded-lg font-medium hover:bg-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Confirm & Reveal
          </button>
        </div>
      </div>
    </div>
  );
};
