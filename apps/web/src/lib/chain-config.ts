import { sepolia, base } from 'wagmi/chains';
import { defineChain } from 'viem';

// Anvil local chain (chain ID 31337) - single source of truth
export const anvil = defineChain({
  id: 31337,
  name: 'Anvil',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['http://localhost:8545'] },
  },
});

// Chain selection based on environment
const CHAIN_MAP = {
  local: anvil,
  sepolia,
  base,
} as const;

type ChainKey = keyof typeof CHAIN_MAP;

const getChainKey = (): ChainKey => {
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_CHAIN) {
    const envChain = process.env.NEXT_PUBLIC_CHAIN as ChainKey;
    if (envChain in CHAIN_MAP) {
      return envChain;
    }
  }
  return 'sepolia';
};

const chainKey = getChainKey();

export const SUPPORTED_CHAIN = CHAIN_MAP[chainKey];
export const IS_LOCAL = chainKey === 'local';

// Chain IDs for reference
export const ANVIL_CHAIN_ID = anvil.id;
export const SEPOLIA_CHAIN_ID = sepolia.id;
export const BASE_CHAIN_ID = base.id;

// Currency configuration
export const CURRENCY = {
  symbol: SUPPORTED_CHAIN.nativeCurrency.symbol,
  decimals: SUPPORTED_CHAIN.nativeCurrency.decimals,
  name: SUPPORTED_CHAIN.nativeCurrency.name,
};

// Explorer URL helpers
export const getExplorerUrl = (hash: string, type: 'tx' | 'address' = 'tx'): string => {
  const baseUrl = SUPPORTED_CHAIN.blockExplorers?.default.url ?? 'https://etherscan.io';
  return `${baseUrl}/${type}/${hash}`;
};

export const getExplorerTxUrl = (hash: string): string => getExplorerUrl(hash, 'tx');

export const getExplorerAddressUrl = (address: string): string => getExplorerUrl(address, 'address');
