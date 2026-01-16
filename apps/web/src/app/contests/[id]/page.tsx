'use client';

import { use, useEffect, useRef } from 'react';
import Link from 'next/link';
import { formatEther } from 'viem';
import {
  useConnection,
  useBlockNumber,
  useChainId,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { toast } from 'sonner';

import { firstBloodContestAbi } from '@sovereign/onchain';
import { CURRENCY, getExplorerTxUrl } from '../../../lib/chain-config';
import { useContest, useContestCommitment, useContestWinners } from '../../../hooks/use-contests';
import { useContractAddress } from '../../../hooks/use-contract-address';
import { ConnectWallet } from '../../../components/connect-wallet';
import { ContestTimeline } from '../../../components/contest-timeline';
import { BlockCountdown } from '../../../components/block-countdown';
import { CommitSolutionForm } from '../../../components/commit-solution-form';
import { Spinner } from '../../../components/spinner';
import { ContestDetailSkeleton, SidebarSkeleton, Skeleton } from '../../../components/skeleton';

export const dynamic = 'force-dynamic';

const ContestDetailPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params);
  const contestId = BigInt(id);
  const { address, status } = useConnection();
  const isConnected = status === 'connected';

  const chainId = useChainId();
  const { data: currentBlock } = useBlockNumber({ chainId, watch: true });
  const { data: contestData, isLoading, error } = useContest(contestId);
  const { data: commitment } = useContestCommitment(contestId, address);
  const { data: winners } = useContestWinners(contestId);

  const contractAddress = useContractAddress();
  const {
    writeContract: writeCaptureRandomness,
    data: captureHash,
    isPending: isCapturePending,
    error: captureError,
  } = useWriteContract();
  const { isLoading: isCaptureConfirming, isSuccess: isCaptureSuccess } =
    useWaitForTransactionReceipt({
      hash: captureHash,
    });

  const {
    writeContract: writeCloseContest,
    data: closeHash,
    isPending: isClosePending,
    error: closeError,
  } = useWriteContract();
  const { isLoading: isCloseConfirming, isSuccess: isCloseSuccess } = useWaitForTransactionReceipt({
    hash: closeHash,
  });

  // Track previous values to detect state changes
  const prevCaptureSuccess = useRef(false);
  const prevCloseSuccess = useRef(false);

  // Toast notifications for randomness request
  useEffect(() => {
    if (isCaptureSuccess && captureHash && !prevCaptureSuccess.current) {
      toast.success('Randomness requested!', {
        description: 'Waiting for VRF fulfillment...',
        action: {
          label: 'View',
          onClick: () => window.open(getExplorerTxUrl(captureHash), '_blank'),
        },
      });
    }
    prevCaptureSuccess.current = isCaptureSuccess;
  }, [isCaptureSuccess, captureHash]);

  useEffect(() => {
    if (captureError) {
      toast.error('Failed to request randomness', {
        description: captureError.message.slice(0, 100),
      });
    }
  }, [captureError]);

  // Toast notifications for close contest
  useEffect(() => {
    if (isCloseSuccess && closeHash && !prevCloseSuccess.current) {
      toast.success('Contest closed!', {
        description: 'The contest has been finalized.',
        action: {
          label: 'View',
          onClick: () => window.open(getExplorerTxUrl(closeHash), '_blank'),
        },
      });
    }
    prevCloseSuccess.current = isCloseSuccess;
  }, [isCloseSuccess, closeHash]);

  useEffect(() => {
    if (closeError) {
      toast.error('Failed to close contest', {
        description: closeError.message.slice(0, 100),
      });
    }
  }, [closeError]);

  const handleRequestRandomness = () => {
    if (!contractAddress) return;
    writeCaptureRandomness({
      address: contractAddress,
      abi: firstBloodContestAbi,
      functionName: 'requestRandomness',
      args: [contestId],
    });
  };

  const handleCloseContest = () => {
    if (!contractAddress) return;
    writeCloseContest({
      address: contractAddress,
      abi: firstBloodContestAbi,
      functionName: 'closeContest',
      args: [contestId],
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-amber-50 to-slate-100 text-slate-900">
        <div className="max-w-4xl mx-auto px-4 py-10">
          {/* Header skeleton */}
          <header className="mb-8 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div>
                <Skeleton className="h-9 w-40 mb-2" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
            <Skeleton className="h-10 w-32 rounded-lg" />
          </header>

          {/* Timeline skeleton */}
          <div className="mb-8">
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ContestDetailSkeleton />
            </div>
            <div>
              <SidebarSkeleton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !contestData) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-amber-50 to-slate-100 text-slate-900">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="text-center py-20 text-red-600">Failed to load contest #{id}</div>
        </div>
      </div>
    );
  }

  const [params_, state] = contestData as [ContestParams, ContestStateData];
  const prizePool = formatEther(params_.prizePoolWei);
  const remainingPrize = formatEther(state.remainingPrizeWei);
  const entryDeposit = params_.entryDepositWei > 0n ? formatEther(params_.entryDepositWei) : null;
  const forfeitedDeposits = formatEther(state.forfeitedDepositsWei);

  const hasCommitted = commitment && commitment.committedAt > 0n;
  const commitBufferEndsAt = hasCommitted ? commitment.committedAt + params_.commitBuffer : 0n;

  // Check if randomness can be requested (VRF has no time limit after release block)
  const canCaptureRandomness =
    state.state === 0 && currentBlock && currentBlock >= params_.releaseBlock;

  // Check if contest can be closed
  const canCloseContest =
    (state.state === 2 || state.state === 3) &&
    currentBlock &&
    (state.winnerCount >= params_.topN || currentBlock >= state.revealWindowEndsAt);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-amber-50 to-slate-100 text-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Link
              href="/contests"
              className="mt-1.5 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/50 transition-colors"
              aria-label="Back to Contests"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5L8.25 12l7.5-7.5"
                />
              </svg>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Contest #{id}</h1>
              <p className="text-slate-600 mt-1">
                {params_.size}×{params_.size} puzzle
              </p>
            </div>
          </div>
          <ConnectWallet />
        </header>

        {/* Timeline */}
        <ContestTimeline
          state={state.state}
          releaseBlock={params_.releaseBlock}
          randomnessCapturedAt={state.randomnessCapturedAt}
          commitWindowEndsAt={state.commitWindowEndsAt}
          revealWindowEndsAt={state.revealWindowEndsAt}
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          {/* Left Column - Contest Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Prize Pool Card */}
            <div className="rounded-xl bg-white/80 backdrop-blur shadow-lg ring-1 ring-black/5 p-6">
              <h2 className="text-lg font-semibold mb-4">Prize Pool</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Total Prize</p>
                  <p className="text-2xl font-bold text-amber-600">{prizePool} {CURRENCY.symbol}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Remaining</p>
                  <p className="text-2xl font-bold text-slate-700">{remainingPrize} {CURRENCY.symbol}</p>
                </div>
                {entryDeposit && (
                  <div>
                    <p className="text-sm text-slate-500">Entry Deposit</p>
                    <p className="text-lg font-semibold">{entryDeposit} {CURRENCY.symbol}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-slate-500">Top Winners</p>
                  <p className="text-lg font-semibold">{params_.topN}</p>
                </div>
              </div>
            </div>

            {/* Randomness Card */}
            <div className="rounded-xl bg-white/80 backdrop-blur shadow-lg ring-1 ring-black/5 p-6">
              <h2 className="text-lg font-semibold mb-4">Randomness</h2>
              {state.state === 0 && currentBlock && currentBlock >= params_.releaseBlock ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-amber-600">
                    <div className="animate-pulse h-3 w-3 rounded-full bg-amber-500" />
                    <span>Ready to request randomness</span>
                  </div>
                  <p className="text-sm text-slate-500">
                    Release block reached. Call{' '}
                    <code className="bg-slate-100 px-1 rounded">requestRandomness({id})</code> to
                    request VRF and start commits.
                  </p>
                  {isConnected && contractAddress && (
                    <div className="space-y-2">
                      <button
                        onClick={handleRequestRandomness}
                        disabled={isCapturePending || isCaptureConfirming || !canCaptureRandomness}
                        className="w-full px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                      >
                        {(isCapturePending || isCaptureConfirming) && <Spinner size="sm" />}
                        {isCapturePending
                          ? 'Confirming...'
                          : isCaptureConfirming
                            ? 'Processing...'
                            : 'Request Randomness'}
                      </button>
                      {isCaptureSuccess && captureHash && (
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-green-600">
                            Randomness requested! Waiting for VRF fulfillment...
                          </p>
                          <a
                            href={getExplorerTxUrl(captureHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-amber-600 hover:text-amber-700"
                          >
                            View →
                          </a>
                        </div>
                      )}
                      {captureError && (
                        <div className="p-2 bg-red-50 rounded-lg">
                          <p className="text-xs font-medium text-red-700">Transaction Failed</p>
                          <p className="text-xs text-red-600 mt-1 font-mono break-all">
                            {captureError.message}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : state.state === 0 ? (
                <div className="flex items-center gap-3 text-yellow-600">
                  <div className="animate-pulse h-3 w-3 rounded-full bg-yellow-500" />
                  <span>Awaiting release block ({params_.releaseBlock.toString()})</span>
                </div>
              ) : state.state === 1 ? (
                <div className="flex items-center gap-3 text-yellow-600">
                  <div className="animate-pulse h-3 w-3 rounded-full bg-yellow-500" />
                  <span>Waiting for VRF fulfillment...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-green-600">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    <span>Randomness captured</span>
                  </div>
                  <div className="bg-slate-100 rounded-lg p-3 font-mono text-xs break-all">
                    <p className="text-slate-500 mb-1">Global Seed:</p>
                    <p>{state.globalSeed}</p>
                  </div>
                  {state.puzzleHash !==
                    '0x0000000000000000000000000000000000000000000000000000000000000000' && (
                    <div className="bg-slate-100 rounded-lg p-3 font-mono text-xs break-all">
                      <p className="text-slate-500 mb-1">Puzzle Hash:</p>
                      <p>{state.puzzleHash}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Engine Metadata Card */}
            <div className="rounded-xl bg-white/80 backdrop-blur shadow-lg ring-1 ring-black/5 p-6">
              <h2 className="text-lg font-semibold mb-4">Engine Metadata</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-slate-500">Engine Version</p>
                  <p className="font-mono">{params_.engineVersion}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Generator Code CID</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm truncate">{params_.generatorCodeCid}</p>
                    {params_.generatorCodeCid && (
                      <a
                        href={`https://ai3.storage/cid/${params_.generatorCodeCid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-600 hover:text-amber-700 text-sm whitespace-nowrap"
                      >
                        View on Auto Drive →
                      </a>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Sponsor</p>
                  <p className="font-mono text-sm">{params_.sponsor}</p>
                </div>
              </div>
            </div>

            {/* Winners Table */}
            {winners && winners.length > 0 && (
              <div className="rounded-xl bg-white/80 backdrop-blur shadow-lg ring-1 ring-black/5 p-6">
                <h2 className="text-lg font-semibold mb-4">
                  Winners ({state.winnerCount}/{params_.topN})
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-slate-500 border-b border-slate-200">
                        <th className="pb-2">Rank</th>
                        <th className="pb-2">Solver</th>
                        <th className="pb-2">Reward</th>
                        <th className="pb-2">Revealed At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {winners.map((winner, idx) => (
                        <tr
                          key={idx}
                          className={`border-b border-slate-100 ${
                            winner.solver === address ? 'bg-amber-50' : ''
                          }`}
                        >
                          <td className="py-3 font-semibold">#{winner.rank}</td>
                          <td className="py-3 font-mono text-sm">
                            {winner.solver.slice(0, 6)}...{winner.solver.slice(-4)}
                            {winner.solver === address && (
                              <span className="ml-2 text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded">
                                You
                              </span>
                            )}
                          </td>
                          <td className="py-3 font-semibold text-amber-600">
                            {formatEther(winner.rewardWei)} {CURRENCY.symbol}
                          </td>
                          <td className="py-3 text-slate-600">
                            Block {winner.revealedAt.toString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Actions & Status */}
          <div className="space-y-6">
            {/* Countdown Card */}
            <div className="rounded-xl bg-white/80 backdrop-blur shadow-lg ring-1 ring-black/5 p-6">
              <h2 className="text-lg font-semibold mb-4">Timing</h2>
              <div className="space-y-4">
                {state.state < 2 && (
                  <BlockCountdown
                    label="Release Block"
                    targetBlock={params_.releaseBlock}
                    status={state.state === 0 ? 'pending' : 'reached'}
                  />
                )}
                {state.commitWindowEndsAt > 0n && (
                  <BlockCountdown
                    label="Commit Window Ends"
                    targetBlock={state.commitWindowEndsAt}
                    status={state.state === 2 ? 'active' : state.state > 2 ? 'reached' : 'pending'}
                  />
                )}
                {state.revealWindowEndsAt > 0n && (
                  <BlockCountdown
                    label="Reveal Window Ends"
                    targetBlock={state.revealWindowEndsAt}
                    status={state.state === 3 ? 'active' : state.state > 3 ? 'reached' : 'pending'}
                  />
                )}
              </div>
            </div>

            {/* Play Puzzle Card */}
            {state.state >= 2 && (
              <div className="rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 shadow-lg ring-1 ring-amber-200 p-6">
                <h2 className="text-lg font-semibold mb-2 text-amber-900">Play Puzzle</h2>
                <p className="text-sm text-amber-800 mb-4">
                  Solve the {params_.size}×{params_.size} puzzle to compete for the prize.
                </p>
                <Link
                  href={`/contests/${id}/play`}
                  className="block w-full px-4 py-3 bg-amber-500 text-white rounded-lg font-medium text-center hover:bg-amber-600 transition-colors shadow-sm"
                >
                  Play Puzzle →
                </Link>
              </div>
            )}

            {/* Commit Solution Form */}
            {state.state >= 2 &&
              state.globalSeed !==
                '0x0000000000000000000000000000000000000000000000000000000000000000' && (
                <CommitSolutionForm
                  contestId={contestId}
                  entryDepositWei={params_.entryDepositWei}
                  contestState={state.state}
                  globalSeed={state.globalSeed}
                  size={params_.size}
                  {...(commitment ? { onChainCommitment: commitment } : {})}
                />
              )}

            {/* Your Status Card */}
            <div className="rounded-xl bg-white/80 backdrop-blur shadow-lg ring-1 ring-black/5 p-6">
              <h2 className="text-lg font-semibold mb-4">Your Status</h2>
              {!isConnected ? (
                <p className="text-slate-500 text-sm">Connect wallet to participate</p>
              ) : !hasCommitted ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-600">
                    <div className="h-2 w-2 rounded-full bg-slate-400" />
                    <span>Not committed</span>
                  </div>
                  {state.state === 2 && (
                    <p className="text-sm text-slate-500">
                      Solve the puzzle first, then commit your solution.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-600">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span>Committed at block {commitment?.committedAt.toString()}</span>
                  </div>
                  {commitment && commitment.depositPaid > 0n && (
                    <p className="text-sm text-slate-500">
                      Deposit: {formatEther(commitment.depositPaid)} {CURRENCY.symbol}
                    </p>
                  )}
                  {state.state === 3 && (
                    <button
                      disabled
                      className="w-full px-4 py-3 bg-green-500 text-white rounded-lg font-medium opacity-50 cursor-not-allowed"
                    >
                      Reveal Solution (Coming Soon)
                    </button>
                  )}
                  {state.state === 2 && commitBufferEndsAt > 0n && (
                    <p className="text-xs text-slate-500">
                      Reveal opens after block {commitBufferEndsAt.toString()}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Contest Actions Card */}
            {canCloseContest && (
              <div className="rounded-xl bg-white/80 backdrop-blur shadow-lg ring-1 ring-black/5 p-6">
                <h2 className="text-lg font-semibold mb-4">Contest Actions</h2>
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    {state.winnerCount >= params_.topN
                      ? 'All winners have been found. Close the contest to finalize.'
                      : 'Reveal window has ended. Close the contest to finalize.'}
                  </p>
                  {isConnected && contractAddress && (
                    <div className="space-y-2">
                      <button
                        onClick={handleCloseContest}
                        disabled={isClosePending || isCloseConfirming}
                        className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                      >
                        {(isClosePending || isCloseConfirming) && <Spinner size="sm" />}
                        {isClosePending
                          ? 'Confirming...'
                          : isCloseConfirming
                            ? 'Processing...'
                            : 'Close Contest'}
                      </button>
                      {isCloseSuccess && closeHash && (
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-green-600">Contest closed successfully!</p>
                          <a
                            href={getExplorerTxUrl(closeHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-amber-600 hover:text-amber-700"
                          >
                            View →
                          </a>
                        </div>
                      )}
                      {closeError && (
                        <div className="p-2 bg-red-50 rounded-lg">
                          <p className="text-xs font-medium text-red-700">Transaction Failed</p>
                          <p className="text-xs text-red-600 mt-1 font-mono break-all">
                            {closeError.message}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  {!isConnected && (
                    <p className="text-sm text-slate-500">Connect wallet to close contest</p>
                  )}
                </div>
              </div>
            )}

            {/* Forfeited Deposits */}
            {state.forfeitedDepositsWei > 0n && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-700">
                  <span className="font-semibold">Forfeited Deposits:</span> {forfeitedDeposits} {CURRENCY.symbol}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

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

export default ContestDetailPage;
