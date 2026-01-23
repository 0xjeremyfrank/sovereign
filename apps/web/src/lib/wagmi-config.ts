import { createConfig, http } from 'wagmi';
import { sepolia, base } from 'wagmi/chains';
import { injected } from '@wagmi/connectors';

import { SUPPORTED_CHAIN, IS_LOCAL, ANVIL_CHAIN_ID, anvil } from './chain-config';

// Configure wagmi with supported chains
const chains = IS_LOCAL ? [anvil, sepolia, base] as const : [sepolia, base] as const;

export const wagmiConfig = createConfig({
  chains,
  connectors: [injected()],
  transports: {
    [anvil.id]: http('http://localhost:8545'),
    [sepolia.id]: http('https://ethereum-sepolia-rpc.publicnode.com'),
    [base.id]: http('https://base-rpc.publicnode.com'),
  },
});

// Re-export from chain-config for backwards compatibility
export { SUPPORTED_CHAIN, IS_LOCAL, ANVIL_CHAIN_ID };
export const SEPOLIA_CHAIN_ID = sepolia.id;
export const BASE_CHAIN_ID = base.id;

