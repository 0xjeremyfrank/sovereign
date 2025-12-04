#!/bin/bash
# Helper script to schedule a test contest
# Usage: ./script/schedule-contest.sh <network> [options]
# Example: ./script/schedule-contest.sh chronos

set -e

# Change to contracts directory (works whether run from root or contracts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$CONTRACTS_DIR"

NETWORK=${1:-anvil}

if [ -z "$PRIVATE_KEY" ] && [ "$NETWORK" != "anvil" ]; then
  echo "Error: PRIVATE_KEY environment variable not set"
  exit 1
fi

if [ -z "$CONTEST_ADDRESS" ]; then
  echo "Error: CONTEST_ADDRESS environment variable not set"
  echo "Set it with: export CONTEST_ADDRESS=0xYourContractAddress"
  exit 1
fi

RPC_URL=""
case $NETWORK in
  anvil)
    RPC_URL="http://localhost:8545"
    ;;
  chronos)
    RPC_URL="https://auto-evm.chronos.autonomys.xyz"
    ;;
  autonomys|mainnet)
    RPC_URL="https://auto-evm.mainnet.autonomys.xyz"
    ;;
  *)
    echo "Error: Unknown network '$NETWORK'"
    exit 1
    ;;
esac

CMD="forge script script/ScheduleContest.s.sol:ScheduleContest --rpc-url $RPC_URL --broadcast"

if [ "$NETWORK" != "anvil" ]; then
  CMD="$CMD --skip-simulation --legacy"
fi

if [ "$NETWORK" == "anvil" ]; then
  CMD="$CMD --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
fi

eval $CMD

echo ""
echo "Contest scheduled! Check the output above for the contest ID."

