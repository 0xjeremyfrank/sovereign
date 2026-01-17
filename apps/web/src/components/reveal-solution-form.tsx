'use client';

import { useState, useEffect, useRef } from 'react';
import { formatEther, toHex } from 'viem';
import { useConnection, useBlockNumber, useChainId } from 'wagmi';
import { toast } from 'sonner';

import { useCommitStorage } from '../hooks/use-commit-storage';
import { useRevealSolution } from '../hooks/use-reveal-solution';
import { useHasRevealed } from '../hooks/use-has-revealed';
import { RevealConfirmationModal } from './reveal-confirmation-modal';
import { Spinner } from './spinner';
import { BlockCountdown } from './block-countdown';
import { getExplorerTxUrl, CURRENCY } from '../lib/chain-config';

interface RevealSolutionFormProps {
  contestId: bigint;
  contestState: number;
  prizePoolWei: bigint;
  topN: number;
  winnerCount: number;
  randomnessCapturedAt: bigint;
  commitBuffer: bigint;
  revealWindowEndsAt: bigint;
  depositPaid: bigint;
}

const extractErrorReason = (error: Error | null): string => {
  if (!error) return 'Unknown error';
  const message = error.message || String(error);

  if (message.includes('NoCommitmentFound')) {
    return 'No commitment found for your address.';
  }
  if (message.includes('AlreadyRevealed')) {
    return 'You have already revealed your solution.';
  }
  if (message.includes('CommitBufferActive')) {
    return 'The commit buffer period is still active. Please wait.';
  }
  if (message.includes('CommitMismatch')) {
    return "Your solution doesn't match your commitment. Make sure you're using the same solution and salt.";
  }
  if (message.includes('RevealsNotOpen')) {
    return 'The reveal window is not currently open.';
  }
  if (message.includes('RevealWindowClosed') || message.includes('RevealWindowEnded')) {
    return 'The reveal window has ended.';
  }
  if (message.includes('ContestFull') || message.includes('AllWinnersFound')) {
    return 'All winner slots have been filled.';
  }
  if (message.includes('insufficient funds') || message.includes('insufficient balance')) {
    return 'Insufficient balance for gas fees.';
  }

  return message;
};

export const RevealSolutionForm = ({
  contestId,
  contestState,
  prizePoolWei,
  topN,
  winnerCount,
  randomnessCapturedAt,
  commitBuffer,
  revealWindowEndsAt,
  depositPaid,
}: RevealSolutionFormProps) => {
  const { address, status } = useConnection();
  const isConnected = status === 'connected';
  const chainId = useChainId();
  const { data: currentBlock } = useBlockNumber({ chainId, watch: true });

  const { getCommitData } = useCommitStorage();
  const { reveal, hash, isPending, isConfirming, isSuccess, isReady, error } = useRevealSolution();
  const { data: hasRevealedOnChain, refetch: refetchHasRevealed } = useHasRevealed(contestId, address);

  const [showConfirmation, setShowConfirmation] = useState(false);

  const prevSuccess = useRef(false);
  const prevError = useRef<Error | null>(null);

  useEffect(() => {
    if (isSuccess && hash && !prevSuccess.current) {
      toast.success('Solution revealed!', {
        description: `Your solution for Contest #${contestId.toString()} has been verified.`,
        action: {
          label: 'View',
          onClick: () => window.open(getExplorerTxUrl(hash), '_blank'),
        },
      });
      refetchHasRevealed();
    }
    prevSuccess.current = isSuccess;
  }, [isSuccess, hash, contestId, refetchHasRevealed]);

  useEffect(() => {
    if (error && error !== prevError.current) {
      toast.error('Failed to reveal solution', {
        description: extractErrorReason(error),
      });
    }
    prevError.current = error;
  }, [error]);

  const commitData = getCommitData(contestId);
  const hasCommitData = commitData !== null;

  // Defensive check for invalid contest data
  if (topN === 0) {
    return null;
  }

  const commitBufferEndsAt = randomnessCapturedAt > 0n ? randomnessCapturedAt + commitBuffer : 0n;
  const isCommitBufferActive = currentBlock && commitBufferEndsAt > 0n && currentBlock < commitBufferEndsAt;
  const isRevealWindowOpen = contestState === 3 || (contestState === 2 && !isCommitBufferActive);
  const isRevealWindowEnded = currentBlock && revealWindowEndsAt > 0n && currentBlock >= revealWindowEndsAt;
  const isContestFull = winnerCount >= topN;

  const potentialReward = prizePoolWei / BigInt(topN);
  // Note: This is an estimated rank that may differ due to concurrent reveals
  const potentialRank = winnerCount + 1;

  const handleReveal = () => {
    if (!isConnected || !address || !commitData) {
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirmReveal = () => {
    if (!isConnected || !address || !commitData) {
      return;
    }

    const { encodedSolution, salt } = commitData;
    const solutionBytes = toHex(encodedSolution);

    reveal(contestId, solutionBytes, salt as `0x${string}`);
    setShowConfirmation(false);
  };

  if (isSuccess && hash) {
    const explorerUrl = getExplorerTxUrl(hash);
    return (
      <div className="rounded-xl bg-white/80 backdrop-blur shadow-lg ring-1 ring-black/5 p-6">
        <div className="text-center space-y-4">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-green-600">Reveal Successful!</h2>
          <p className="text-slate-600">
            Your solution for Contest #{contestId.toString()} has been verified!
          </p>
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700 mb-1">Potential Rank</p>
            <p className="text-2xl font-bold text-green-600">#{potentialRank}</p>
            <p className="text-sm text-green-700 mt-2">Reward</p>
            <p className="text-xl font-bold text-green-600">{formatEther(potentialReward)} {CURRENCY.symbol}</p>
          </div>
          <div className="flex gap-3 justify-center pt-4">
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm"
            >
              View on Explorer →
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (hasRevealedOnChain) {
    return (
      <div className="rounded-xl bg-white/80 backdrop-blur shadow-lg ring-1 ring-black/5 p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-600">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="font-semibold">Already Revealed</span>
          </div>
          <p className="text-sm text-slate-600">
            You have already revealed your solution for this contest.
          </p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="rounded-xl bg-white/80 backdrop-blur shadow-lg ring-1 ring-black/5 p-6">
        <p className="text-slate-500 text-center">Connect wallet to reveal</p>
      </div>
    );
  }

  if (!hasCommitData) {
    return (
      <div className="rounded-xl bg-white/80 backdrop-blur shadow-lg ring-1 ring-black/5 p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-red-600">
            <span className="text-xl">⚠️</span>
            <span className="font-semibold">Missing Commit Data</span>
          </div>
          <p className="text-sm text-slate-600">
            Unable to find your commit data in local storage. This may happen if you:
          </p>
          <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1">
            <li>Cleared your browser data</li>
            <li>Are using a different browser or device</li>
            <li>Never committed to this contest</li>
          </ul>
          <p className="text-sm text-slate-600">
            If you have a backup of your salt, you may be able to restore your commit data.
          </p>
        </div>
      </div>
    );
  }

  if (isContestFull) {
    return (
      <div className="rounded-xl bg-white/80 backdrop-blur shadow-lg ring-1 ring-black/5 p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-slate-600">
            <div className="h-2 w-2 rounded-full bg-slate-400" />
            <span className="font-semibold">Contest Full</span>
          </div>
          <p className="text-sm text-slate-600">
            All {topN} winner slots have been filled. No more reveals are accepted.
          </p>
        </div>
      </div>
    );
  }

  if (isRevealWindowEnded) {
    return (
      <div className="rounded-xl bg-white/80 backdrop-blur shadow-lg ring-1 ring-black/5 p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-slate-600">
            <div className="h-2 w-2 rounded-full bg-slate-400" />
            <span className="font-semibold">Reveal Window Closed</span>
          </div>
          <p className="text-sm text-slate-600">
            The reveal window has ended. No more reveals are accepted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <RevealConfirmationModal
        isOpen={showConfirmation}
        onConfirm={handleConfirmReveal}
        onCancel={() => setShowConfirmation(false)}
        contestId={contestId}
        depositPaid={depositPaid}
        potentialReward={potentialReward}
        potentialRank={potentialRank}
      />

      <div className="rounded-xl bg-white/80 backdrop-blur shadow-lg ring-1 ring-black/5 p-6">
        <h2 className="text-xl font-semibold mb-4">Reveal Your Solution</h2>

        {isCommitBufferActive && commitBufferEndsAt > 0n && (
          <div className="mb-6">
            <BlockCountdown
              label="Commit Buffer Ends"
              targetBlock={commitBufferEndsAt}
              status="active"
            />
            <p className="text-sm text-amber-700 mt-2">
              You must wait until the commit buffer ends before revealing.
            </p>
          </div>
        )}

        {!isCommitBufferActive && revealWindowEndsAt > 0n && (
          <div className="mb-6">
            <BlockCountdown
              label="Reveal Window Ends"
              targetBlock={revealWindowEndsAt}
              status="active"
            />
          </div>
        )}

        <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <h3 className="font-semibold mb-3">Reveal Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Potential Reward</span>
              <span className="font-semibold text-green-600">{formatEther(potentialReward)} {CURRENCY.symbol}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Potential Rank</span>
              <span className="font-semibold">#{potentialRank} of {topN}</span>
            </div>
            {depositPaid > 0n && (
              <div className="flex justify-between">
                <span className="text-slate-600">Deposit Refund</span>
                <span className="font-semibold text-amber-600">{formatEther(depositPaid)} {CURRENCY.symbol}</span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between">
              <span className="font-semibold">Total Payout</span>
              <span className="font-semibold text-green-600">
                {formatEther(potentialReward + depositPaid)} {CURRENCY.symbol}
              </span>
            </div>
          </div>
        </div>

        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <span className="font-semibold">Note:</span> Your stored solution and salt will be
            submitted to the contract. Make sure this is your correct solution.
          </p>
        </div>

        <button
          onClick={handleReveal}
          disabled={!isReady || isCommitBufferActive || isPending || isConfirming || !isRevealWindowOpen}
          className="w-full px-6 py-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {(isPending || isConfirming) && <Spinner size="md" />}
          {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Reveal Solution'}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-medium text-red-700 mb-1">Transaction Failed</p>
            <p className="text-sm text-red-600 font-mono break-all">
              {extractErrorReason(error)}
            </p>
          </div>
        )}
      </div>
    </>
  );
};
