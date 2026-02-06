'use client';

import { use, useEffect, useRef } from 'react';
import Link from 'next/link';
import { formatEther } from 'viem';
import { useBlockNumber, useChainId } from 'wagmi';

import { CURRENCY } from '../../../../lib/chain-config';
import { useContest } from '../../../../hooks/use-contests';
import { useBoard } from '../../../../hooks/use-board';
import { useSolvedBoardStorage } from '../../../../hooks/use-solved-board-storage';
import { ConnectWallet } from '../../../../components/connect-wallet';
import { Grid } from '../../../../components/grid';
import { Legend } from '../../../../components/legend';
import { BlockCountdown } from '../../../../components/block-countdown';
import { IconCrown, IconUndo } from '../../../../components/icons';

export const dynamic = 'force-dynamic';

type ContestParams = {
  generatorCodeCid: string;
  engineVersion: string;
  size: number;
  releaseBlock: bigint;
  commitWindow: bigint;
  commitBuffer: bigint;
  revealWindow: bigint;
  topN: number;
  entryDepositWei: bigint;
  prizePoolWei: bigint;
  sponsor: `0x${string}`;
};

type ContestStateData = {
  state: number;
  globalSeed: `0x${string}`;
  puzzleHash: `0x${string}`;
  randomnessCapturedAt: bigint;
  commitWindowEndsAt: bigint;
  revealWindowEndsAt: bigint;
  winnerCount: number;
  remainingPrizeWei: bigint;
  forfeitedDepositsWei: bigint;
};

const ContestPlayPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params);
  const contestId = BigInt(id);

  const chainId = useChainId();
  const { data: currentBlock } = useBlockNumber({ chainId, watch: true });
  const { data: contestData, isLoading, error } = useContest(contestId);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-amber-50 to-slate-100 text-slate-900">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
          <div className="text-center py-20 text-slate-600">Loading contest...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !contestData) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-amber-50 to-slate-100 text-slate-900">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
          <div className="text-center py-20 text-red-600">Failed to load contest #{id}</div>
        </div>
      </div>
    );
  }

  const [contestParams, contestState] = contestData as [ContestParams, ContestStateData];

  // Check if randomness has been captured (state >= 2 means CommitOpen or later)
  if (contestState.state < 2) {
    return (
      <AwaitingRandomnessView
        contestId={id}
        contestParams={contestParams}
        contestState={contestState}
        currentBlock={currentBlock}
      />
    );
  }

  // Randomness captured - show the puzzle
  return <PuzzleView contestId={id} contestParams={contestParams} contestState={contestState} />;
};

// View shown when waiting for randomness to be captured
const AwaitingRandomnessView = ({
  contestId,
  contestParams,
  contestState,
  currentBlock,
}: {
  contestId: string;
  contestParams: ContestParams;
  contestState: ContestStateData;
  currentBlock: bigint | undefined;
}) => {
  const releaseBlockReached = currentBlock && currentBlock >= contestParams.releaseBlock;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-amber-50 to-slate-100 text-slate-900">
      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
        <header className="mb-6 sm:mb-8">
          <Link
            href={`/contests/${contestId}`}
            className="min-h-[44px] inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors mb-4"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back to Contest #{contestId}
          </Link>
        </header>

        <div className="rounded-2xl bg-white/80 backdrop-blur shadow-xl ring-1 ring-black/5 p-6 sm:p-8 text-center">
          <div className="text-5xl sm:text-6xl mb-4">⏳</div>
          <h1 className="text-xl sm:text-2xl font-bold mb-2">Puzzle Not Yet Available</h1>

          {contestState.state === 0 && !releaseBlockReached && (
            <>
              <p className="text-slate-600 mb-6">
                Waiting for the release block to be reached. Once the release block is reached,
                randomness will be captured and the puzzle will be generated.
              </p>
              <div className="max-w-xs mx-auto">
                <BlockCountdown
                  label="Release Block"
                  targetBlock={contestParams.releaseBlock}
                  status="pending"
                />
              </div>
            </>
          )}

          {contestState.state === 0 && releaseBlockReached && (
            <>
              <p className="text-slate-600 mb-6">
                The release block has been reached! Waiting for randomness to be requested. Someone
                needs to call <code className="bg-slate-100 px-1 rounded">requestRandomness</code>.
              </p>
              <div className="flex items-center justify-center gap-3 text-amber-600">
                <div className="animate-pulse h-3 w-3 rounded-full bg-amber-500" />
                <span>Ready for randomness request</span>
              </div>
            </>
          )}

          {contestState.state === 1 && (
            <>
              <p className="text-slate-600 mb-6">
                VRF randomness requested. Waiting for Chainlink to fulfill the request...
              </p>
              <div className="flex items-center justify-center gap-3 text-yellow-600">
                <div className="animate-pulse h-3 w-3 rounded-full bg-yellow-500" />
                <span>Waiting for VRF fulfillment...</span>
              </div>
            </>
          )}

          <Link
            href={`/contests/${contestId}`}
            className="inline-block mt-8 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            View Contest Details
          </Link>
        </div>
      </div>
    </div>
  );
};

// Main puzzle view when randomness is captured
const PuzzleView = ({
  contestId,
  contestParams,
  contestState,
}: {
  contestId: string;
  contestParams: ContestParams;
  contestState: ContestStateData;
}) => {
  // Generate puzzle using the contest's globalSeed
  const { board, regionMap, validation, isGenerating, onCycleCell, onMarkCell, onClear, onUndo } =
    useBoard(contestState.globalSeed, contestParams.size);

  const { storeSolvedBoard } = useSolvedBoardStorage();
  const contestIdBigInt = BigInt(contestId);
  const wasSolvedRef = useRef(false);

  // Save solved board to localStorage when puzzle is solved
  useEffect(() => {
    const isPuzzleSolved = validation.isComplete && validation.isValid;
    if (isPuzzleSolved && !wasSolvedRef.current) {
      wasSolvedRef.current = true;
      storeSolvedBoard(contestIdBigInt, board, contestParams.size);
    } else if (!isPuzzleSolved) {
      wasSolvedRef.current = false;
    }
  }, [
    validation.isComplete,
    validation.isValid,
    board,
    contestIdBigInt,
    contestParams.size,
    storeSolvedBoard,
  ]);

  const prizePool = formatEther(contestParams.prizePoolWei);
  const entryDeposit =
    contestParams.entryDepositWei > 0n ? formatEther(contestParams.entryDepositWei) : null;

  const canUndo = board.history.length > 0;
  const isPuzzleSolved = validation.isComplete && validation.isValid;

  // Contest state labels
  const stateLabels: Record<number, string> = {
    2: 'Commit Open',
    3: 'Reveal Open',
    4: 'Closed',
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-amber-50 to-slate-100 text-slate-900">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
        {/* Header */}
        <header className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:justify-between gap-4">
          <div>
            <Link
              href={`/contests/${contestId}`}
              className="min-h-[44px] inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors mb-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5L8.25 12l7.5-7.5"
                />
              </svg>
              Back to Contest
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex flex-wrap items-center gap-2 sm:gap-3">
              Contest #{contestId}
              <span className="inline-flex items-center gap-2 text-sm sm:text-base font-medium text-slate-600">
                <IconCrown className="text-slate-800" /> {contestParams.size}×{contestParams.size}{' '}
                puzzle
              </span>
            </h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-sm text-slate-600">
              <span className="font-semibold text-amber-600">
                {prizePool} {CURRENCY.symbol} Prize
              </span>
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  contestState.state === 2
                    ? 'bg-green-100 text-green-700'
                    : contestState.state === 3
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-600'
                }`}
              >
                {stateLabels[contestState.state] || 'Unknown'}
              </span>
            </div>
          </div>
          <div className="w-full sm:w-auto flex justify-center sm:justify-end">
            <ConnectWallet />
          </div>
        </header>

        {/* Main Card */}
        <div className="rounded-2xl bg-white/80 backdrop-blur shadow-xl ring-1 ring-black/5 p-3 sm:p-5 md:p-6">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
            <div className="text-sm text-slate-600">Solve this puzzle to compete for the prize</div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={onClear}
                aria-label="Clear board"
                className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-900 text-white text-sm shadow hover:bg-slate-800 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={onUndo}
                disabled={!canUndo}
                aria-label="Undo last move"
                className="min-h-[44px] px-3 py-2 rounded-xl bg-white text-slate-800 text-sm border border-slate-200 shadow-sm hover:bg-slate-50 inline-flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <IconUndo /> Undo
              </button>
            </div>
          </div>

          {isGenerating || !regionMap ? (
            <div className="p-10 sm:p-20 text-center text-slate-600">Generating puzzle...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {/* Board */}
              <div className="md:col-span-2 relative">
                {isPuzzleSolved && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                    <div className="bg-gradient-to-br from-amber-400 to-amber-600 text-white px-6 py-4 sm:px-8 sm:py-6 rounded-2xl shadow-2xl transform animate-pulse border-4 border-white/50">
                      <div className="text-center">
                        <div className="text-4xl sm:text-5xl font-bold mb-2">🎉</div>
                        <div className="text-3xl sm:text-4xl font-bold tracking-tight">Solved!</div>
                        <div className="text-base sm:text-lg mt-2 opacity-90">Ready to Commit</div>
                      </div>
                    </div>
                  </div>
                )}
                <Grid
                  board={board}
                  regionMap={regionMap}
                  validation={validation}
                  onCycleCell={onCycleCell}
                  onMarkCell={onMarkCell}
                  isLocked={isPuzzleSolved}
                />
              </div>

              {/* Side panel */}
              <aside className="space-y-4">
                {/* Status */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <Legend validation={validation} board={board} size={contestParams.size} />
                </div>

                {/* Entry Deposit Info */}
                {entryDeposit && (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <h3 className="font-semibold text-amber-800 mb-1">Entry Deposit</h3>
                    <p className="text-2xl font-bold text-amber-600">
                      {entryDeposit} {CURRENCY.symbol}
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      Refunded on valid reveal, forfeited otherwise
                    </p>
                  </div>
                )}

                {/* Timing */}
                <div className="space-y-2">
                  {contestState.state === 2 && contestState.commitWindowEndsAt > 0n && (
                    <BlockCountdown
                      label="Commit Window Ends"
                      targetBlock={contestState.commitWindowEndsAt}
                      status="active"
                    />
                  )}
                  {contestState.state === 3 && contestState.revealWindowEndsAt > 0n && (
                    <BlockCountdown
                      label="Reveal Window Ends"
                      targetBlock={contestState.revealWindowEndsAt}
                      status="active"
                    />
                  )}
                </div>

                {/* Commit CTA */}
                {isPuzzleSolved && contestState.state === 2 && (
                  <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                    <h3 className="font-semibold text-green-800 mb-2">Ready to Submit!</h3>
                    <p className="text-sm text-green-700 mb-3">
                      You&apos;ve solved the puzzle. Commit your solution to compete for the prize.
                    </p>
                    <Link
                      href={`/contests/${contestId}`}
                      className="block w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium text-center hover:bg-green-700 transition-colors"
                    >
                      Commit Solution →
                    </Link>
                  </div>
                )}

                {/* Rules */}
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

                {/* How to Play */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <h3 className="font-semibold mb-2">How to Play</h3>
                  <p className="text-sm text-slate-700">
                    Click cells to cycle through: blank → mark (×) → sovereign (crown).
                  </p>
                </div>
              </aside>
            </div>
          )}
        </div>

        {/* Warning Banner */}
        <div className="mt-6 p-4 rounded-xl bg-slate-100 border border-slate-200">
          <p className="text-sm text-slate-600">
            <span className="font-semibold">⚠️ Important:</span> This puzzle is deterministically
            generated from the contest&apos;s on-chain randomness. All participants see the exact
            same puzzle. Your solution must match this specific board to be valid.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ContestPlayPage;
