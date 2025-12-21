import { useMemo } from 'react';
import { useChainId } from 'wagmi';

const getContractAddress = (chainId: number): `0x${string}` | null => {
  const envKeys: Record<number, string> = {
    8700: 'NEXT_PUBLIC_FIRST_BLOOD_CONTEST_ADDRESS_8700',
    870: 'NEXT_PUBLIC_FIRST_BLOOD_CONTEST_ADDRESS_870',
    31337: 'NEXT_PUBLIC_FIRST_BLOOD_CONTEST_ADDRESS_31337',
  };

  const envKey = envKeys[chainId];
  if (!envKey) return null;

  const address = process.env[envKey] as `0x${string}` | undefined;
  if (!address || address === '0x0000000000000000000000000000000000000000') {
    return null;
  }

  return address;
};

export const useContractAddress = (): `0x${string}` | null => {
  const chainId = useChainId();

  return useMemo(() => getContractAddress(chainId), [chainId]);
};
