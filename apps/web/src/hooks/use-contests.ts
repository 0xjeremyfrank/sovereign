import { useReadContract, useReadContracts } from 'wagmi';
import { usePublicClient } from 'wagmi';
import { useMemo } from 'react';
import type { Abi } from 'viem';
import { createFirstBloodContestContract } from '@sovereign/onchain';
import { autonomysChronos } from '../lib/wagmi-config';

const CHAIN_ID = autonomysChronos.id;

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

export const useNextContestId = () => {
  const publicClient = usePublicClient();
  const contract = useMemo(() => {
    if (!publicClient) return null;
    try {
      return createFirstBloodContestContract(publicClient, CHAIN_ID);
    } catch {
      return null;
    }
  }, [publicClient]);

  return useReadContract({
    address: contract?.address,
    abi: contract?.abi,
    functionName: 'nextContestId',
    chainId: CHAIN_ID,
    query: {
      enabled: !!contract,
    },
  });
};

export const useContest = (contestId: bigint | undefined) => {
  const publicClient = usePublicClient();
  const contract = useMemo(() => {
    if (!publicClient) return null;
    try {
      return createFirstBloodContestContract(publicClient, CHAIN_ID);
    } catch {
      return null;
    }
  }, [publicClient]);

  return useReadContract({
    address: contract?.address,
    abi: contract?.abi,
    functionName: 'getContest',
    args: contestId !== undefined ? [contestId] : undefined,
    chainId: CHAIN_ID,
    query: {
      enabled: contestId !== undefined && !!contract,
    },
  });
};

export const useContests = () => {
  const { data: nextContestId, isLoading: isLoadingNextId } = useNextContestId();

  const contestIds = useMemo(() => {
    if (!nextContestId || typeof nextContestId !== 'bigint' || nextContestId === 0n) return [];
    const ids: bigint[] = [];
    for (let i = 0n; i < nextContestId; i += 1n) {
      ids.push(i);
    }
    return ids;
  }, [nextContestId]);

  const publicClient = usePublicClient();
  const contract = useMemo(() => {
    if (!publicClient) return null;
    try {
      return createFirstBloodContestContract(publicClient, CHAIN_ID);
    } catch {
      return null;
    }
  }, [publicClient]);

  const contracts = useMemo(() => {
    if (!contract || contestIds.length === 0) return [];
    return contestIds.map((id) => ({
      address: contract.address,
      abi: contract.abi as Abi,
      functionName: 'getContest' as const,
      args: [id] as const,
      chainId: CHAIN_ID,
    }));
  }, [contract, contestIds]);

  const { data: contestsData, isLoading } = useReadContracts({
    contracts,
    query: {
      enabled: contracts.length > 0,
    },
  });

  const contests = useMemo(() => {
    if (!contestsData || !contestIds.length) return [];
    return contestsData
      .map((result, index) => {
        if (result.status !== 'success' || !result.result || index >= contestIds.length)
          return null;
        const [params, state] = result.result as [ContestParams, ContestStateData];
        return {
          contestId: contestIds[index]!,
          params,
          state,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);
  }, [contestsData, contestIds]);

  return {
    contests,
    isLoading: isLoadingNextId || isLoading,
  };
};
