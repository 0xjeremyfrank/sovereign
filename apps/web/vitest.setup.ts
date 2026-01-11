/* eslint-disable @typescript-eslint/no-explicit-any */
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock Worker for tests (not available in Node.js environment)
(globalThis as any).Worker = vi.fn().mockImplementation(() => ({
  postMessage: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  terminate: vi.fn(),
}));

// Mock MessageEvent for tests
(globalThis as any).MessageEvent = ((type: string, data: unknown) => ({ type, data })) as any;

// Mock next/navigation for tests
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

// Mock wagmi for tests
vi.mock('wagmi', () => ({
  useConnection: () => ({
    address: undefined,
    status: 'disconnected',
    chain: undefined,
    chainId: undefined,
  }),
  useConnectors: () => [],
  useConnect: () => ({
    connect: vi.fn(),
    isPending: false,
  }),
  useDisconnect: () => ({
    disconnect: vi.fn(),
  }),
  useSwitchChain: () => ({
    switchChain: vi.fn(),
  }),
  useChainId: () => 1,
  useBlockNumber: () => ({ data: undefined }),
  useReadContract: () => ({ data: undefined, isLoading: false }),
  useWriteContract: () => ({
    writeContract: vi.fn(),
    data: undefined,
    isPending: false,
    error: null,
  }),
  useWaitForTransactionReceipt: () => ({
    isLoading: false,
    isSuccess: false,
  }),
}));
