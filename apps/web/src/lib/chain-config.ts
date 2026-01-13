import { sepolia, base } from 'wagmi/chains';

// Toggle this to switch between testnet and mainnet
export const SUPPORTED_CHAIN = sepolia;

// Chain IDs for reference
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
