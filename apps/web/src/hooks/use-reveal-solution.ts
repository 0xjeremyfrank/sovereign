import { useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { firstBloodContestAbi } from '@sovereign/onchain';
import { useContractAddress } from './use-contract-address';

export const useRevealSolution = () => {
  const chainId = useChainId();
  const contractAddress = useContractAddress();

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const reveal = (contestId: bigint, encodedSolution: `0x${string}`, salt: `0x${string}`) => {
    if (!contractAddress) {
      throw new Error(`Contract address not configured for chain ${chainId}`);
    }

    writeContract({
      address: contractAddress as `0x${string}`,
      abi: firstBloodContestAbi,
      functionName: 'revealSolution',
      args: [contestId, encodedSolution, salt],
    });
  };

  return {
    reveal,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
};
