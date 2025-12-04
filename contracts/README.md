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

## Deployment

### Setup

1. Set your private key as an environment variable:
   ```shell
   export PRIVATE_KEY=your_private_key_here
   ```

2. **For Autonomys Testnet (Chronos)**: Get testnet tokens (tAI3) from the [Autonomys faucet](https://develop.autonomys.xyz/evm/faucet)

3. Configure MetaMask or your wallet for Autonomys networks:
   - **Chronos (Testnet)**: RPC `https://auto-evm.chronos.autonomys.xyz/ws`, Chain ID `490000`, Symbol `tAI3`
   - **Mainnet**: RPC `https://auto-evm.mainnet.autonomys.xyz/ws`, Chain ID `870`, Symbol `AI3`

### Deploy to Local (Anvil)

```shell
# Start Anvil in another terminal
anvil

# Deploy
forge script script/DeployFirstBloodContest.s.sol:DeployFirstBloodContest \
  --rpc-url http://localhost:8545 \
  --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

### Deploy to Autonomys Testnet (Chronos)

**Using the helper script (recommended):**
```shell
./script/deploy.sh chronos
```

**Using forge directly:**
```shell
forge script script/DeployFirstBloodContest.s.sol:DeployFirstBloodContest \
  --rpc-url chronos \
  --broadcast \
  --skip-simulation
```

> **Note**: The `--skip-simulation` flag is required for Autonomys networks due to [gas estimation limitations](https://develop.autonomys.xyz/evm/introduction#gas-estimation-limitations). If you encounter gas estimation errors, add `--gas-limit 300000` or higher.

### Deploy to Autonomys Mainnet

**Using the helper script (recommended):**
```shell
./script/deploy.sh autonomys
```

**Using forge directly:**
```shell
forge script script/DeployFirstBloodContest.s.sol:DeployFirstBloodContest \
  --rpc-url autonomys \
  --broadcast \
  --skip-simulation
```

### Gas Estimation on Autonomys

Autonomys EVM has known gas estimation limitations. If you encounter errors like `"No manual gas limit set"` or `"Gas estimation failed"`:

1. Use `--skip-simulation` flag (automatically added by the helper script)
2. Manually set gas limit: `--gas-limit 300000` (adjust as needed)
3. See the [Autonomys documentation](https://develop.autonomys.xyz/evm/introduction#gas-estimation-limitations) for more details

### After Deployment

1. Copy the deployed address from the console output
2. Set it in your environment:
   ```shell
   export FIRST_BLOOD_CONTEST_ADDRESS_490000=0x...  # Chronos (testnet)
   export FIRST_BLOOD_CONTEST_ADDRESS_870=0x...      # Autonomys (mainnet)
   ```

3. View your contract on the [Autonomys Block Explorer](https://explorer.autonomys.xyz)

## Scheduling Test Contests

After deploying the contract, you can schedule test contests for UI testing.

### Quick Start

```shell
# Set the deployed contract address
export CONTEST_ADDRESS=0xYourDeployedAddress

# Schedule a contest (default: 1 ETH prize, releases in 10 blocks)
./script/schedule-contest.sh chronos
```

### Custom Parameters

You can override default parameters via environment variables:

```shell
export CONTEST_ADDRESS=0xYourDeployedAddress
export PRIZE_POOL_WEI=1000000000000000000  # 1 ETH (in wei)
export RELEASE_BLOCK_OFFSET=50              # Release in 50 blocks
export SIZE=8                               # 8x8 board
export TOP_N=5                              # Top 5 winners
export COMMIT_WINDOW=200                    # 200 blocks commit window
export REVEAL_WINDOW=300                    # 300 blocks reveal window
export ENTRY_DEPOSIT_WEI=1000000000000000   # 0.001 ETH deposit (optional)

./script/schedule-contest.sh chronos
```

### After Scheduling

1. Note the contest ID from the output
2. Wait for `releaseBlock` to be reached
3. Call `captureRandomness(contestId)` to open commits
4. View the contest in the UI at `/contests`

### Example: Full Test Flow

```shell
# 1. Deploy contract
./script/deploy.sh chronos
# Copy address: 0x1234...

# 2. Set address
export CONTEST_ADDRESS=0x1234...

# 3. Schedule contest
./script/schedule-contest.sh chronos
# Contest ID: 0, Release block: 12345

# 4. Wait for release block, then capture randomness
# (You'll need to call captureRandomness via cast or UI)
```
