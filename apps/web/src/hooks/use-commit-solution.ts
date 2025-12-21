import { useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { firstBloodContestAbi } from '@sovereign/onchain';
import { useContractAddress } from './use-contract-address';

export const useCommitSolution = () => {
  const chainId = useChainId();
  const contractAddress = useContractAddress();

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
