import { createConfig, http } from 'wagmi';
import { sepolia, base } from 'wagmi/chains';
import { injected } from '@wagmi/connectors';

import { SUPPORTED_CHAIN } from './chain-config';

// Configure wagmi with supported chains
const chains = [sepolia, base] as const;

export const wagmiConfig = createConfig({
  chains,
  connectors: [injected()],
  transports: {
    [sepolia.id]: http('https://ethereum-sepolia-rpc.publicnode.com'),
    [base.id]: http('https://base-rpc.publicnode.com'),
  },
});

// Re-export from chain-config for backwards compatibility
export { SUPPORTED_CHAIN };
export const SEPOLIA_CHAIN_ID = sepolia.id;
export const BASE_CHAIN_ID = base.id;

