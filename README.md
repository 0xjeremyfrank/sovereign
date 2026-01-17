# Sovereign

Blockchain-native logic puzzle inspired by the classic n-Queens problem.

- Daily deterministic puzzles with on-chain verification
- Commit–reveal verification and collectible rewards (NFT/SBT)

## Structure

- `apps/web` — Next.js 14 (App Router) frontend
- `packages/engine` — Puzzle generation and validation
- `packages/onchain` — ABIs and contract addresses
- `contracts/` — Solidity smart contracts (Foundry)
- `docs/` — Documentation

## Blockchain Integration (planned)

- Chainlink VRF for verifiable random seed generation
- Chainlink Automation for scheduled puzzle releases

## Development

- Node 20 (see .nvmrc): `nvm use`
- Yarn (pinned): `yarn -v` should match repo setting
- Install: `corepack enable && yarn install`
- Scripts: `yarn build`, `yarn test`, `yarn lint`, `yarn format`
- Web tests: `yarn workspace web test`; e2e: `yarn workspace web e2e`
