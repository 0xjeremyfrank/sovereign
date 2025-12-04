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

RPC_URL=""
CHAIN_ID=""
case $NETWORK in
  anvil)
    RPC_URL="http://localhost:8545"
    CHAIN_ID="31337"
    ;;
  chronos)
    RPC_URL="https://auto-evm.chronos.autonomys.xyz/ws"
    CHAIN_ID="8700"
    ;;
  autonomys|mainnet)
    RPC_URL="https://auto-evm.mainnet.autonomys.xyz/ws"
    CHAIN_ID="870"
    ;;
  *)
    echo "Error: Unknown network '$NETWORK'"
    exit 1
    ;;
esac

CONTEST_ADDRESS_VAR="FIRST_BLOOD_CONTEST_ADDRESS_${CHAIN_ID}"
GENERIC_VAR="CONTEST_ADDRESS"

if [ -n "${!GENERIC_VAR}" ]; then
  CONTEST_ADDRESS="${!GENERIC_VAR}"
elif [ -n "${!CONTEST_ADDRESS_VAR}" ]; then
  CONTEST_ADDRESS="${!CONTEST_ADDRESS_VAR}"
fi

if [ -z "$CONTEST_ADDRESS" ]; then
  echo "Error: Contract address not set"
  echo "Set it with: export $CONTEST_ADDRESS_VAR=0xYourContractAddress"
  echo "Or use generic: export CONTEST_ADDRESS=0xYourContractAddress"
  exit 1
fi

export CONTEST_ADDRESS

CMD="forge script script/ScheduleContest.s.sol:ScheduleContest --rpc-url $RPC_URL --broadcast"

if [ "$NETWORK" != "anvil" ]; then
  CMD="$CMD --skip-simulation --block-prevrandao 0x0000000000000000000000000000000000000000000000000000000000000000"
fi

if [ "$NETWORK" == "anvil" ]; then
  CMD="$CMD --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
fi

eval $CMD

echo ""
echo "Contest scheduled! Check the output above for the contest ID."

