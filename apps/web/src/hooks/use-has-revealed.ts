import { useMemo } from 'react';
import { useReadContract, useChainId, usePublicClient } from 'wagmi';
import { createFirstBloodContestContract } from '@sovereign/onchain';
import { useContractAddress } from './use-contract-address';

export const useHasRevealed = (
  contestId: bigint | undefined,
  solver: `0x${string}` | undefined,
) => {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const contractAddress = useContractAddress();

  const contract = useMemo(() => {
    if (!publicClient || !contractAddress) return null;
    return createFirstBloodContestContract(publicClient, chainId, {
      overrides: { [chainId]: contractAddress as `0x${string}` },
    });
  }, [publicClient, contractAddress, chainId]);

  return useReadContract({
    address: contract?.address,
    abi: contract?.abi,
    functionName: 'hasRevealed',
    args: contestId !== undefined && solver ? [contestId, solver] : undefined,
    chainId,
    query: {
      enabled: contestId !== undefined && !!solver && !!contract,
      refetchInterval: 12000,
    },
  }) as { data: boolean | undefined; isLoading: boolean; error: Error | null; refetch: () => void };
};
