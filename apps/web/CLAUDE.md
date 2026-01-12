# Web App

Next.js 14 App Router frontend with Wagmi for wallet integration.

## Commands

```bash
yarn dev                     # Start dev server (port 3000)
yarn test                    # Run unit tests
yarn e2e                     # Run e2e tests
yarn lint                    # Lint
```

## Patterns

- Add `'use client'` for components using hooks or browser APIs
- Use `@/` path alias for imports (e.g., `@/lib/utils`, `@/components/nav`)
- Wallet state: `useConnection()` returns `{ address, status, chainId }`
- Contract reads: `useReadContract({ abi, address, functionName, args })`
- Contract writes: `useWriteContract()` returns `{ mutate, status, data }`
- Import ABIs from `@sovereign/onchain`

## Testing

- Unit tests: `*.test.tsx` with Vitest
- Mocks for wagmi and next/navigation are in `vitest.setup.ts`
- Add new hook mocks there as needed

## Current Chain

- Sepolia testnet (chainId: 11155111)
- Contract address in `hooks/use-contract-address.ts`
