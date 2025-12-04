import { createConfig, http } from 'wagmi';
import { defineChain } from 'viem';
import { injected } from '@wagmi/connectors';

export const autonomysChronos = defineChain({
  id: 8700,
  name: 'Autonomys Chronos',
  nativeCurrency: {
    name: 'Testnet AI3',
    symbol: 'tAI3',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://auto-evm.chronos.autonomys.xyz'],
      webSocket: ['wss://auto-evm.chronos.autonomys.xyz/ws'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Autonomys Explorer',
      url: 'https://explorer.autonomys.xyz',
    },
  },
});

export const autonomysMainnet = defineChain({
  id: 870,
  name: 'Autonomys',
  nativeCurrency: {
    name: 'AI3',
    symbol: 'AI3',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://auto-evm.mainnet.autonomys.xyz'],
      webSocket: ['wss://auto-evm.mainnet.autonomys.xyz/ws'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Autonomys Explorer',
      url: 'https://explorer.autonomys.xyz',
    },
  },
});

const chains = [autonomysChronos, autonomysMainnet] as const;

export const wagmiConfig = createConfig({
  chains,
  connectors: [injected()],
  transports: {
    [autonomysChronos.id]: http(),
    [autonomysMainnet.id]: http(),
  },
});

