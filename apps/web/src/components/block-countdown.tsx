'use client';

import { useBlockNumber } from 'wagmi';

import { autonomysChronos } from '../lib/wagmi-config';

type BlockCountdownProps = {
  label: string;
  targetBlock: bigint;
  status: 'pending' | 'active' | 'reached';
};

export const BlockCountdown = ({ label, targetBlock, status }: BlockCountdownProps) => {
  const { data: currentBlock } = useBlockNumber({
    chainId: autonomysChronos.id,
    watch: true,
  });

  const blocksRemaining = currentBlock ? targetBlock - currentBlock : null;
  const isReached = blocksRemaining !== null && blocksRemaining <= 0n;

  return (
    <div
      className={`rounded-lg p-3 ${
        status === 'active'
          ? 'bg-amber-50 border border-amber-200'
          : status === 'reached'
            ? 'bg-green-50 border border-green-200'
            : 'bg-slate-50 border border-slate-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-sm font-medium ${
            status === 'active'
              ? 'text-amber-700'
              : status === 'reached'
                ? 'text-green-700'
                : 'text-slate-600'
          }`}
        >
          {label}
        </span>
        {status === 'reached' || isReached ? (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">
            Reached
          </span>
        ) : status === 'active' ? (
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium animate-pulse">
            Active
          </span>
        ) : null}
      </div>

      <div className="mt-2 space-y-1">
        <p className="font-mono text-lg font-semibold">Block {targetBlock.toString()}</p>
        {blocksRemaining !== null && blocksRemaining > 0n && (
          <p className="text-sm text-slate-500">{blocksRemaining.toString()} blocks remaining</p>
        )}
        {currentBlock && (
          <p className="text-xs text-slate-400">Current: {currentBlock.toString()}</p>
        )}
      </div>
    </div>
  );
};
