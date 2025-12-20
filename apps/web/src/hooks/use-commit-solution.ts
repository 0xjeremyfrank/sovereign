import { useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { useMemo } from 'react';
import { firstBloodContestAbi } from '@sovereign/onchain';

const getContractAddress = (chainId: number): string | null => {
  let address: string | undefined;

  if (chainId === 8700) {
    address = process.env.NEXT_PUBLIC_FIRST_BLOOD_CONTEST_ADDRESS_8700;
  } else if (chainId === 870) {
    address = process.env.NEXT_PUBLIC_FIRST_BLOOD_CONTEST_ADDRESS_870;
  } else if (chainId === 31337) {
    address = process.env.NEXT_PUBLIC_FIRST_BLOOD_CONTEST_ADDRESS_31337;
  }

  if (!address || address === '0x0000000000000000000000000000000000000000') {
    return null;
  }

  return address;
};

export const useCommitSolution = () => {
  const chainId = useChainId();
  const contractAddress = useMemo(() => getContractAddress(chainId), [chainId]);

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const commit = (contestId: bigint, commitHash: `0x${string}`, entryDepositWei: bigint) => {
    if (!contractAddress) {
      throw new Error(`Contract address not configured for chain ${chainId}`);
    }

    writeContract({
      address: contractAddress as `0x${string}`,
      abi: firstBloodContestAbi,
      functionName: 'commitSolution',
      args: [contestId, commitHash],
      value: entryDepositWei,
    });
  };

  return {
    commit,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
};
