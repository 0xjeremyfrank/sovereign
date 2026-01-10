import { useMemo } from 'react';
import { useChainId } from 'wagmi';

const getContractAddress = (chainId: number): `0x${string}` | null => {
  const envKeys: Record<number, string> = {
    11155111: 'NEXT_PUBLIC_FIRST_BLOOD_CONTEST_ADDRESS_SEPOLIA', // Sepolia
    8453: 'NEXT_PUBLIC_FIRST_BLOOD_CONTEST_ADDRESS_BASE', // Base
    31337: 'NEXT_PUBLIC_FIRST_BLOOD_CONTEST_ADDRESS_31337', // Anvil (local)
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
