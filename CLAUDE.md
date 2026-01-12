# Sovereign

Blockchain-native logic puzzle game. On-chain verification via Chainlink VRF and commit-reveal.

## Structure

- `apps/web` — Next.js 14 (App Router) frontend with Wagmi
- `contracts/` — Solidity smart contracts (Foundry)
- `packages/engine` — Puzzle validation logic
- `packages/onchain` — ABIs and contract addresses

## Setup

```bash
nvm use                      # Node 20 (see .nvmrc)
corepack enable && yarn      # Install dependencies
```

## Commands

```bash
yarn dev                     # Start dev server
yarn build                   # Build all
yarn test                    # Test all
yarn workspace web test      # Web unit tests
forge test                   # Contract tests (from contracts/)
```

## Code Style

- TypeScript strict mode, prefer `interface` over `type`
- Functional components only, custom hooks prefixed with `use`
- Named exports, no default exports
- 2-space indent, single quotes, trailing commas
- kebab-case files, PascalCase components
- Import order: external → @sovereign/* → relative
- Use `@/` alias for web app imports
- Prefer functional style code over object oriented, declarative over imperative

## Patterns

- Add `'use client'` directive for interactive components
- Use `useConnection()` for wallet state, `useReadContract()`/`useWriteContract()` for contracts
- Import ABIs from `@sovereign/onchain`
- Shared utilities go in `@/lib/utils`

## Testing

- Vitest for web (`*.test.tsx`)
- Mock wagmi and next/navigation in `vitest.setup.ts`
- Foundry for contracts

## Git Workflow

- Branch naming: `feat/`, `fix/`, `chore/`

