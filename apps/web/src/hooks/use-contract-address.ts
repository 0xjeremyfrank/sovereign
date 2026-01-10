import { useMemo } from 'react';
import { useChainId } from 'wagmi';
import { firstBloodContestAddressBook } from '@sovereign/onchain';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export const useContractAddress = (): `0x${string}` | null => {
  const chainId = useChainId();

  return useMemo(() => {
    const address = firstBloodContestAddressBook[chainId];
    if (!address || address === ZERO_ADDRESS) {
      return null;
    }
    return address as `0x${string}`;
  }, [chainId]);
};
