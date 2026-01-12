'use client';

import { formatEther } from 'viem';

import { CURRENCY } from '../lib/chain-config';

interface CommitConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  entryDepositWei: bigint;
  contestId: bigint;
}

export const CommitConfirmationModal = ({
  isOpen,
  onConfirm,
  onCancel,
  entryDepositWei,
  contestId,
}: CommitConfirmationModalProps) => {
  if (!isOpen) return null;

  const entryDeposit = formatEther(entryDepositWei);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
        <h2 className="text-2xl font-bold mb-4">Confirm Commit</h2>

        <div className="space-y-4 mb-6">
          <p className="text-slate-700">
            You are about to commit your solution to Contest #{contestId.toString()}.
          </p>

          {entryDepositWei > 0n && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="font-semibold text-amber-800 mb-1">Entry Deposit</p>
              <p className="text-2xl font-bold text-amber-600">{entryDeposit} {CURRENCY.symbol}</p>
              <p className="text-sm text-amber-700 mt-1">
                This deposit will be refunded on valid reveal, or forfeited otherwise.
              </p>
            </div>
          )}

          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="font-semibold text-red-800 mb-2">⚠️ Important</p>
            <ul className="text-sm text-red-700 space-y-1 list-disc pl-5">
              <li>Your secret salt will be stored in your browser&apos;s local storage</li>
              <li>Do not clear your browser data before revealing your solution</li>
              <li>Download a backup of your salt for safekeeping</li>
              <li>You will need the salt to reveal your solution later</li>
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
            Confirm & Commit
          </button>
        </div>
      </div>
    </div>
  );
};
