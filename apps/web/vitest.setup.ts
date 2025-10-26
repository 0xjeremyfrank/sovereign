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
