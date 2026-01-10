import { createConfig, http } from 'wagmi';
import { sepolia, base } from 'wagmi/chains';
import { injected } from '@wagmi/connectors';

// Use Sepolia for testnet, Base for mainnet
const chains = [sepolia, base] as const;

export const wagmiConfig = createConfig({
  chains,
  connectors: [injected()],
  transports: {
    [sepolia.id]: http('https://ethereum-sepolia-rpc.publicnode.com'),
    [base.id]: http('https://base-rpc.publicnode.com'),
  },
});

// Re-export chain IDs for convenience
export const SEPOLIA_CHAIN_ID = sepolia.id; // 11155111
export const BASE_CHAIN_ID = base.id; // 8453

