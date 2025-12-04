import type { Hex } from 'viem';

import { firstBloodContestAbi } from './abi/first-blood-contest';
import type { AddressOptions, AddressOverrides, ContractConfig } from './types';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const satisfies Hex;

const STATIC_ADDRESSES: AddressOverrides = {
  31337: ZERO_ADDRESS, // Anvil (local)
  8700: ZERO_ADDRESS, // Autonomys Chronos (testnet)
  870: ZERO_ADDRESS, // Autonomys Mainnet
};

const getProcessEnv = (): Record<string, string | undefined> | undefined => {
  if (typeof process === 'undefined') {
    return undefined;
  }

  // In browser, Next.js exposes NEXT_PUBLIC_* vars via process.env
  // In Node.js, process.env has all vars
  // Next.js replaces process.env.NEXT_PUBLIC_* at build time
  const env = process.env;

  // Debug: log available env vars (only in development)
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const relevantKeys = Object.keys(env).filter((key) =>
      key.includes('FIRST_BLOOD_CONTEST_ADDRESS'),
    );
    if (relevantKeys.length > 0) {
      console.log('[onchain] Available contract address env vars:', relevantKeys);
    }
  }

  return env;
};

const readEnvAddress = (
  chainId: number,
  env?: Record<string, string | undefined>,
): Hex | undefined => {
  if (!env) {
    return undefined;
  }

  const exactKey = `FIRST_BLOOD_CONTEST_ADDRESS_${chainId}`;
  const nextKey = `NEXT_PUBLIC_FIRST_BLOOD_CONTEST_ADDRESS_${chainId}`;

  return (env[exactKey] ?? env[nextKey]) as Hex | undefined;
};

export const getFirstBloodContestAddress = (chainId: number, options: AddressOptions = {}): Hex => {
  const envSource = options.env ?? getProcessEnv();
  const resolved =
    options.overrides?.[chainId] ?? readEnvAddress(chainId, envSource) ?? STATIC_ADDRESSES[chainId];

  if (!resolved || resolved === ZERO_ADDRESS) {
    const envKey = `NEXT_PUBLIC_FIRST_BLOOD_CONTEST_ADDRESS_${chainId}`;
    const envSourceKeys = envSource
      ? Object.keys(envSource).filter((k) => k.includes('FIRST_BLOOD'))
      : [];
    console.error('[onchain] Failed to resolve contract address:', {
      chainId,
      envKey,
      availableKeys: envSourceKeys,
      resolved,
      envSourceExists: !!envSource,
    });
    throw new Error(
      `FirstBloodContest address not configured for chain ${chainId}. ` +
        `Set ${envKey} in your .env.local file and restart the dev server. ` +
        `Available env keys: ${envSourceKeys.join(', ') || 'none'}`,
    );
  }

  return resolved;
};

export const createFirstBloodContestConfig = (
  chainId: number,
  options?: AddressOptions,
): ContractConfig<typeof firstBloodContestAbi> => {
  return {
    chainId,
    address: getFirstBloodContestAddress(chainId, options),
    abi: firstBloodContestAbi,
  };
};

export const firstBloodContestAddressBook = STATIC_ADDRESSES;
