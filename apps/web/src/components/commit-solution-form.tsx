'use client';

import { useState, useEffect, useRef } from 'react';
import { formatEther } from 'viem';
import { useConnection } from 'wagmi';
import Link from 'next/link';
import { toast } from 'sonner';

import { useCommitStorage, generateSalt } from '../hooks/use-commit-storage';
import { generateCommitHashFromBoard } from '../lib/commit-hash';
import { useCommitSolution } from '../hooks/use-commit-solution';
import { useSolvedBoardStorage } from '../hooks/use-solved-board-storage';
import { CommitConfirmationModal } from './commit-confirmation-modal';
import { SaltBackupButton } from './salt-backup-button';
import { Grid } from './grid';
import { Spinner } from './spinner';
import { useBoard } from '../hooks/use-board';
import { decodeBoard, type BoardState } from '@sovereign/engine';
import { getExplorerTxUrl, CURRENCY } from '../lib/chain-config';

interface Commitment {
  commitHash: `0x${string}`;
  committedAt: bigint;
  depositPaid: bigint;
}

interface CommitSolutionFormProps {
  contestId: bigint;
  entryDepositWei: bigint;
  contestState: number; // Contest state (2 = CommitOpen)
  globalSeed: `0x${string}`;
  size: number;
  onChainCommitment?: Commitment;
}

const extractErrorReason = (error: Error | null, entryDepositWei: bigint): string => {
  if (!error) return 'Unknown error';
  const message = error.message || String(error);

  // Map contract errors to user-friendly messages
  if (message.includes('CommitsNotOpen') || message.includes('ContestNotCommitOpen')) {
    return 'The commit window is not currently open for this contest.';
  }
  if (message.includes('CommitWindowClosed') || message.includes('CommitWindowEnded')) {
    return 'The commit window has ended. You can no longer submit solutions.';
  }
  if (message.includes('AlreadyCommitted')) {
    return 'You have already committed a solution to this contest.';
  }
  if (message.includes('IncorrectDeposit')) {
    return `Please send exactly ${formatEther(entryDepositWei)} ${CURRENCY.symbol} as your entry deposit.`;
  }
  if (message.includes('insufficient funds') || message.includes('insufficient balance')) {
    return `Insufficient balance. You need at least ${formatEther(entryDepositWei)} ${CURRENCY.symbol}.`;
  }

  return message;
};

export const CommitSolutionForm = ({
  contestId,
  entryDepositWei,
  contestState,
  globalSeed,
  size,
  onChainCommitment,
}: CommitSolutionFormProps) => {
  const { address, status } = useConnection();
  const isConnected = status === 'connected';

  const { getSolvedBoard } = useSolvedBoardStorage();
  const { storeCommitData } = useCommitStorage();
  const { commit, hash, isPending, isConfirming, isSuccess, error } = useCommitSolution();

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [decodedBoard, setDecodedBoard] = useState<BoardState | null>(null);

  // Track previous values to detect state changes
  const prevSuccess = useRef(false);

  // Toast notifications for commit
  useEffect(() => {
    if (isSuccess && hash && !prevSuccess.current) {
      toast.success('Solution committed!', {
        description: `Your solution for Contest #${contestId.toString()} has been submitted.`,
        action: {
          label: 'View',
          onClick: () => window.open(getExplorerTxUrl(hash), '_blank'),
        },
      });
    }
    prevSuccess.current = isSuccess;
  }, [isSuccess, hash, contestId]);

  useEffect(() => {
    if (error) {
      toast.error('Failed to commit solution', {
        description: extractErrorReason(error, entryDepositWei),
      });
    }
  }, [error, entryDepositWei]);

  const {
    board: puzzleBoard,
    regionMap: puzzleRegionMap,
    validation: puzzleValidation,
  } = useBoard(globalSeed, size);

  useEffect(() => {
    const solvedBoardData = getSolvedBoard(contestId);
    if (solvedBoardData) {
      try {
        const decoded = decodeBoard(solvedBoardData.encodedBoard, size);
        setDecodedBoard(decoded);
      } catch (error) {
        console.error('[CommitForm] Failed to decode stored board:', error);
      }
    } else {
      setDecodedBoard(null);
    }
  }, [contestId, getSolvedBoard, size]);

  const solvedBoardData = getSolvedBoard(contestId);
  const hasStoredSolution = solvedBoardData !== null;

  const displayBoard = decodedBoard || puzzleBoard;
  const displayRegionMap = puzzleRegionMap;

  const isSolutionValid = decodedBoard
    ? true
    : puzzleValidation.isComplete && puzzleValidation.isValid;

  const isCommitWindowOpen = contestState === 2;
  // Use on-chain commitment as authoritative source (local storage is only for salt backup)
  const hasCommittedOnChain = onChainCommitment && onChainCommitment.committedAt > 0n;
  const entryDeposit = formatEther(entryDepositWei);

  const handleCommit = () => {
    if (!isConnected || !address) {
      return;
    }

    const solvedBoardData = getSolvedBoard(contestId);
    if (!solvedBoardData || !decodedBoard || !isSolutionValid) {
      return;
    }

    setShowConfirmation(true);
  };

  const handleConfirmCommit = () => {
    if (!isConnected || !address) {
      return;
    }

    const solvedBoardData = getSolvedBoard(contestId);
    if (!solvedBoardData || !decodedBoard || !isSolutionValid) {
      return;
    }

    const salt = generateSalt();
    const commitHash = generateCommitHashFromBoard(contestId, address, decodedBoard, salt);

    storeCommitData(contestId, decodedBoard, salt, commitHash);
    commit(contestId, commitHash, entryDepositWei);

    setShowConfirmation(false);
  };

  if (isSuccess && hash) {
    const explorerUrl = getExplorerTxUrl(hash);
    return (
      <div className="rounded-xl bg-white/80 backdrop-blur shadow-lg ring-1 ring-black/5 p-6">
        <div className="text-center space-y-4">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-600">Commit Successful!</h2>
          <p className="text-slate-600">
            Your solution has been committed to Contest #{contestId.toString()}.
          </p>
          {entryDepositWei > 0n && (
            <p className="text-sm text-slate-500">Entry deposit: {entryDeposit} {CURRENCY.symbol}</p>
          )}
          <div className="flex gap-3 justify-center pt-4">
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm"
            >
              View on Explorer →
            </a>
            <SaltBackupButton contestId={contestId} />
          </div>
        </div>
      </div>
    );
  }

  if (hasCommittedOnChain) {
    return (
      <div className="rounded-xl bg-white/80 backdrop-blur shadow-lg ring-1 ring-black/5 p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-600">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="font-semibold">Already Committed</span>
          </div>
          <p className="text-sm text-slate-600">
            You committed your solution at block {onChainCommitment.committedAt.toString()}.
          </p>
          <SaltBackupButton contestId={contestId} />
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="rounded-xl bg-white/80 backdrop-blur shadow-lg ring-1 ring-black/5 p-6">
        <p className="text-slate-500 text-center">Connect wallet to participate</p>
      </div>
    );
  }

  if (!isCommitWindowOpen) {
    return (
      <div className="rounded-xl bg-white/80 backdrop-blur shadow-lg ring-1 ring-black/5 p-6">
        <p className="text-slate-500 text-center">
          The commit window is not currently open for this contest.
        </p>
      </div>
    );
  }

  return (
    <>
      <CommitConfirmationModal
        isOpen={showConfirmation}
        onConfirm={handleConfirmCommit}
        onCancel={() => setShowConfirmation(false)}
        entryDepositWei={entryDepositWei}
        contestId={contestId}
      />

      <div className="rounded-xl bg-white/80 backdrop-blur shadow-lg ring-1 ring-black/5 p-6">
        <h2 className="text-xl font-semibold mb-4">Submit Your Solution</h2>

        {displayRegionMap && (
          <div className="mb-6">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <Grid
                board={displayBoard}
                regionMap={displayRegionMap}
                validation={puzzleValidation}
                onCycleCell={() => {}}
                onMarkCell={() => {}}
                isLocked={true}
              />
            </div>
          </div>
        )}

        <div className="mb-6 space-y-2">
          <div className="flex items-center gap-2">
            {isSolutionValid ? (
              <>
                <span className="text-green-600">✓</span>
                <span className="text-sm text-slate-700">Board complete and valid</span>
              </>
            ) : (
              <>
                <span className="text-red-600">✗</span>
                <span className="text-sm text-red-700">
                  {!hasStoredSolution
                    ? 'Please solve the puzzle first'
                    : 'Solution incomplete or invalid'}
                </span>
              </>
            )}
          </div>
        </div>

        {!hasStoredSolution && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800 mb-2">
              You need to solve the puzzle before committing. Go to the puzzle page to solve it.
            </p>
            <Link
              href={`/contests/${contestId}/play`}
              className="inline-block px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium"
            >
              Solve Puzzle →
            </Link>
          </div>
        )}

        {hasStoredSolution && (
          <>
            <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <h3 className="font-semibold mb-3">Transaction Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Entry Deposit</span>
                  <span className="font-semibold">{entryDeposit} {CURRENCY.symbol}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Est. Gas</span>
                  <span>~0.002 {CURRENCY.symbol}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-semibold">~{entryDeposit} {CURRENCY.symbol}</span>
                </div>
              </div>
            </div>

            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 mb-2">
                <span className="font-semibold">⚠️ Important:</span> Your secret salt will be stored
                in your browser&apos;s local storage. Do not clear your browser data before
                revealing your solution.
              </p>
              <SaltBackupButton contestId={contestId} />
            </div>

            <button
              onClick={handleCommit}
              disabled={!isSolutionValid || isPending || isConfirming}
              className="w-full px-6 py-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {(isPending || isConfirming) && <Spinner size="md" />}
              {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Commit Solution'}
            </button>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-700 mb-1">Transaction Failed</p>
                <p className="text-sm text-red-600 font-mono break-all">
                  {extractErrorReason(error, entryDepositWei)}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};
