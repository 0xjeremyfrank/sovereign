# Sovereign

Blockchain-native logic puzzle inspired by the classic n-Queens problem.

- Daily deterministic puzzles with on-chain verification
- Commit–reveal verification and collectible rewards (NFT/SBT)

## Monorepo Structure (planned)

- apps/web — Next.js UI
- packages/engine — Puzzle engine (TypeScript)
- packages/config — Shared lint/TS configs

## Blockchain integration (planned)

- contracts — Solidity (Foundry), deployed on Autonomys Network (Auto EVM)
- storage - Autonomys Network (Auto Drive)

## Development

- Node 20 (see .nvmrc): `nvm use`
- Yarn (pinned): `yarn -v` should match repo setting
- Install: `corepack enable && yarn install`
- Scripts: `yarn build`, `yarn test`, `yarn lint`, `yarn format`
- Web tests: `yarn workspace web test`; e2e: `yarn workspace web e2e`
