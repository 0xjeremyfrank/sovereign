'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatEther } from 'viem';

import { CURRENCY } from '../lib/chain-config';

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

type Contest = {
  contestId: bigint;
  params: ContestParams;
  state: ContestStateData;
};

const CONTEST_STATE_NAMES: Record<number, string> = {
  0: 'Scheduled',
  1: 'RandomnessPending',
  2: 'CommitOpen',
  3: 'RevealOpen',
  4: 'Closed',
  5: 'Finalized',
};

const getStateColor = (state: number): string => {
  switch (state) {
    case 0:
      return 'bg-slate-100 text-slate-700';
    case 1:
      return 'bg-yellow-100 text-yellow-700';
    case 2:
      return 'bg-blue-100 text-blue-700';
    case 3:
      return 'bg-green-100 text-green-700';
    case 4:
      return 'bg-gray-100 text-gray-700';
    case 5:
      return 'bg-purple-100 text-purple-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
};

export const ContestCard = ({ contest }: { contest: Contest }) => {
  const router = useRouter();
  const stateName = CONTEST_STATE_NAMES[contest.state.state] || 'Unknown';
  const prizePool = formatEther(contest.params.prizePoolWei);
  const entryDeposit =
    contest.params.entryDepositWei > 0n ? formatEther(contest.params.entryDepositWei) : null;

  return (
    <Link href={`/contests/${contest.contestId.toString()}`}>
      <div className="rounded-xl bg-white/80 backdrop-blur shadow-lg ring-1 ring-black/5 p-6 hover:shadow-xl transition-shadow cursor-pointer">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold">Contest #{contest.contestId.toString()}</h3>
            <p className="text-sm text-slate-500 mt-1">
              Size: {contest.params.size}x{contest.params.size}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${getStateColor(contest.state.state)}`}
          >
            {stateName}
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-sm text-slate-600">Prize Pool</p>
            <p className="text-2xl font-bold text-amber-600">
              {prizePool} {CURRENCY.symbol}
            </p>
          </div>

          {entryDeposit && (
            <div>
              <p className="text-sm text-slate-600">Entry Deposit</p>
              <p className="text-lg font-semibold">
                {entryDeposit} {CURRENCY.symbol}
              </p>
            </div>
          )}

          <div>
            <p className="text-sm text-slate-600">Winners</p>
            <p className="text-lg font-semibold">
              {contest.state.winnerCount} / {contest.params.topN}
            </p>
          </div>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <p className="text-xs text-slate-500">Engine: {contest.params.engineVersion}</p>
            {(contest.state.state === 2 || contest.state.state === 3) && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(`/contests/${contest.contestId.toString()}/play`);
                }}
                className="px-3 py-1.5 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600 transition-colors"
              >
                Play →
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};
