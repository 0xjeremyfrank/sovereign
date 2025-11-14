# Sovereign Onchain Contracts

Smart contracts for the Sovereign puzzle game onchain contest system.

## Overview

**FirstBloodContest** - Trust-minimized single-puzzle race where the first N valid solution reveals earn rewards. Uses commit-reveal protocol to prevent front-running.

**Key Features:**

- Commit-reveal protocol with buffer period
- Deterministic puzzle generation (MVP: blockhash, production: Autonomys Proof of Time or Chainlink VRF)
- Prize distribution to top N winners
- Optional entry deposits (refunded on valid reveal, forfeited on invalid)

## Development

**Prerequisites:** [Foundry](https://book.getfoundry.sh/getting-started/installation)

```shell
# Build
forge build

# Test (28 tests)
forge test

# Format
forge fmt

# Snapshot
forge snapshot

# Local node
anvil
```
