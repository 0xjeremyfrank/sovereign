#!/bin/bash
# Deployment helper script for FirstBloodContest
# Usage: ./script/deploy.sh <network>
# Example: ./script/deploy.sh anvil
# Example: ./script/deploy.sh chronos
#
# Note: For Autonomys networks, use --skip-simulation flag if you encounter gas estimation errors
# See: https://develop.autonomys.xyz/evm/introduction#gas-estimation-limitations

set -e

NETWORK=${1:-anvil}

if [ -z "$PRIVATE_KEY" ] && [ "$NETWORK" != "anvil" ]; then
  echo "Error: PRIVATE_KEY environment variable not set"
  echo "Set it with: export PRIVATE_KEY=your_private_key"
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
    CHAIN_ID="490000"
    ;;
  autonomys|mainnet)
    RPC_URL="https://auto-evm.mainnet.autonomys.xyz/ws"
    CHAIN_ID="870"
    ;;
  *)
    echo "Error: Unknown network '$NETWORK'"
    echo "Supported networks: anvil, chronos, autonomys (or mainnet)"
    exit 1
    ;;
esac

echo "Deploying FirstBloodContest to $NETWORK..."

CMD="forge script script/DeployFirstBloodContest.s.sol:DeployFirstBloodContest --rpc-url $RPC_URL --broadcast"

if [ "$NETWORK" != "anvil" ]; then
  CMD="$CMD --skip-simulation"
fi

if [ "$NETWORK" == "anvil" ]; then
  # Use default Anvil private key for local deployment
  CMD="$CMD --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
fi

eval $CMD

echo ""
echo "Deployment complete!"
echo "Set address: export FIRST_BLOOD_CONTEST_ADDRESS_${CHAIN_ID}=0x..."
