# Contracts

Solidity smart contracts using Foundry with Chainlink VRF integration.

## Commands

```bash
forge build                  # Compile
forge test                   # Run tests
forge test -vvv              # Verbose test output
forge fmt                    # Format Solidity
forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast
```

## Architecture

- `FirstBloodContest.sol` — Main contest contract
- Uses Chainlink VRF v2.5 for verifiable randomness
- Commit-reveal pattern for solution verification

## Contest State Flow

```
Scheduled(0) → RandomnessPending(1) → CommitOpen(2) → RevealOpen(3) → Closed(4) → Finalized(5)
```

IMPORTANT: State indices shifted with VRF integration. Update any hardcoded checks.

## Key Functions

- `scheduleContest()` — Admin creates new contest
- `requestRandomness(contestId)` — Triggers VRF request (was `captureRandomness`)
- `commitSolution(contestId, hash)` — Player commits solution hash
- `revealSolution(contestId, solution, salt)` — Player reveals solution

## Chainlink Config (Sepolia)

- VRF Coordinator: `0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B`
- Key Hash and Subscription ID in deployment script

## After Changes

Regenerate ABI: copy from `out/` to `packages/onchain/src/abi/`
