import { useMemo } from 'react';
import { useChainId } from 'wagmi';
import { firstBloodContestAddressBook } from '@sovereign/onchain';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const getEnvAddress = (chainId: number): `0x${string}` | undefined => {
  if (typeof window === 'undefined') return undefined;
  const key = `NEXT_PUBLIC_FIRST_BLOOD_CONTEST_ADDRESS_${chainId}`;
  const value = process.env[key];
  return value as `0x${string}` | undefined;
};

export const useContractAddress = (): `0x${string}` | null => {
  const chainId = useChainId();

  return useMemo(() => {
    // Check env var first (for local dev), then fall back to static addresses
    const envAddress = getEnvAddress(chainId);
    if (envAddress && envAddress !== ZERO_ADDRESS) {
      return envAddress;
    }

    const address = firstBloodContestAddressBook[chainId];
    if (!address || address === ZERO_ADDRESS) {
      return null;
    }
    return address as `0x${string}`;
  }, [chainId]);
};
