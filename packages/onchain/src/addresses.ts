import type { Hex } from 'viem';

import { firstBloodContestAbi } from './abi/first-blood-contest';
import type { AddressOptions, AddressOverrides, ContractConfig } from './types';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const satisfies Hex;

const STATIC_ADDRESSES: AddressOverrides = {
  // Anvil (local) - deterministic address from DeployLocal.s.sol
  // Deployer 0xf39F...2266 with nonce 1 always produces this address
  31337: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  11155111: '0x165b72265a69f01a8C1fFF2764FF84A0392F78CA', // Sepolia (testnet) - VRF enabled
  8453: ZERO_ADDRESS, // Base (mainnet)
};

const getProcessEnv = (): Record<string, string | undefined> | undefined => {
  if (typeof process === 'undefined') {
    return undefined;
  }
  return process.env;
};

const CHAIN_NAMES: Record<number, string> = {
  31337: '31337',
  11155111: 'SEPOLIA',
  8453: 'BASE',
};

const readEnvAddress = (
  chainId: number,
  env?: Record<string, string | undefined>,
): Hex | undefined => {
  if (!env) {
    return undefined;
  }

  const chainName = CHAIN_NAMES[chainId] ?? chainId.toString();
  const exactKey = `FIRST_BLOOD_CONTEST_ADDRESS_${chainName}`;
  const nextKey = `NEXT_PUBLIC_FIRST_BLOOD_CONTEST_ADDRESS_${chainName}`;

  return (env[exactKey] ?? env[nextKey]) as Hex | undefined;
};

export const getFirstBloodContestAddress = (chainId: number, options: AddressOptions = {}): Hex => {
  const envSource = options.env ?? getProcessEnv();
  const resolved =
    options.overrides?.[chainId] ?? readEnvAddress(chainId, envSource) ?? STATIC_ADDRESSES[chainId];

  if (!resolved || resolved === ZERO_ADDRESS) {
    const envKey = `NEXT_PUBLIC_FIRST_BLOOD_CONTEST_ADDRESS_${chainId}`;
    throw new Error(
      `FirstBloodContest address not configured for chain ${chainId}. Set ${envKey} in .env.local`,
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
