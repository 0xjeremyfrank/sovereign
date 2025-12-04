# Connecting the UI to the FirstBloodContest Contract

## Quick Start

### 1. Deploy the Contract

Deploy to Autonomys Chronos (testnet):

```bash
cd contracts
export PRIVATE_KEY=your_private_key_here
./script/deploy.sh chronos
```

After deployment, copy the contract address from the output.

### 2. Set the Contract Address

Create a `.env.local` file in `apps/web/`:

```bash
# For Chronos testnet
NEXT_PUBLIC_FIRST_BLOOD_CONTEST_ADDRESS_8700=0xYourDeployedAddressHere
```

Or for local development with Anvil:

```bash
# Start Anvil in one terminal
anvil

# Deploy in another terminal
cd contracts
./script/deploy.sh anvil

# Copy the address and set in apps/web/.env.local
NEXT_PUBLIC_FIRST_BLOOD_CONTEST_ADDRESS_31337=0xYourDeployedAddressHere
```

### 3. Connect Your Wallet

1. Start the dev server:

   ```bash
   yarn workspace web dev
   ```

2. Open http://localhost:3000

3. Click "Connect Wallet" (you'll need to add this button) or use your browser's wallet extension

4. Switch to the Autonomys Chronos network:
   - Network Name: Autonomys EVM
   - RPC URL: https://auto-evm.chronos.autonomys.xyz/ws
   - Chain ID: 8700
   - Currency Symbol: tAI3

5. Get testnet tokens from the [Autonomys faucet](https://develop.autonomys.xyz/evm/faucet)

### 4. Schedule a Test Contest

Before viewing contests, you need to schedule at least one contest:

```bash
cd contracts
export PRIVATE_KEY=your_private_key_here

# Set contract address (chain-specific, matches deploy output)
export FIRST_BLOOD_CONTEST_ADDRESS_8700=0xYourDeployedAddress

# Or use generic variable
export CONTEST_ADDRESS=0xYourDeployedAddress

# Schedule with defaults (1 ETH prize, releases in 10 blocks)
./script/schedule-contest.sh chronos

# Or customize parameters
export PRIZE_POOL_WEI=1000000000000000000  # 1 ETH
export SIZE=8                               # 8x8 board
export TOP_N=3                              # Top 3 winners
./script/schedule-contest.sh chronos
```

After scheduling, note the contest ID and release block from the output.

### 5. Capture Randomness (Open Commits)

Once the release block is reached, capture randomness to open the commit window:

```bash
# Using cast (from foundry)
cast send $CONTEST_ADDRESS "captureRandomness(uint256)" 0 \
  --rpc-url https://auto-evm.chronos.autonomys.xyz \
  --private-key $PRIVATE_KEY
```

Or wait for the release block and call `captureRandomness` via the UI (once implemented).

### 6. View Contests

Navigate to `/contests` to see the contest list. If the contract address is set correctly, you should see:

- Loading state while fetching
- List of contests (if any exist)
- "No contests found" if `nextContestId` is 0

## Troubleshooting

### "FirstBloodContest address not configured"

- Make sure `.env.local` exists in `apps/web/`
- Check that the variable name matches: `NEXT_PUBLIC_FIRST_BLOOD_CONTEST_ADDRESS_8700`
- Restart the dev server after changing env variables

### "No contests found"

- This is normal if no contests have been scheduled yet
- Deploy a test contest using the contract's `scheduleContest` function

### Wallet Connection Issues

- Make sure MetaMask (or your wallet) is installed
- Add the Autonomys Chronos network manually if it doesn't auto-detect
- Check that you have tAI3 tokens for gas

## Environment Variables

The UI reads contract addresses from environment variables. For Next.js, use `NEXT_PUBLIC_` prefix so they're available in the browser:

- `NEXT_PUBLIC_FIRST_BLOOD_CONTEST_ADDRESS_8700` - Chronos testnet
- `NEXT_PUBLIC_FIRST_BLOOD_CONTEST_ADDRESS_870` - Autonomys mainnet
- `NEXT_PUBLIC_FIRST_BLOOD_CONTEST_ADDRESS_31337` - Local Anvil

The code falls back to `ZERO_ADDRESS` if not set, which will cause contract calls to fail gracefully.
