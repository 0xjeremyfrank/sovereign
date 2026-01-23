#!/bin/bash
# VRF Auto-Fulfillment Watcher for Local Development
# Watches for VRF requests and auto-fulfills them using the mock coordinator

VRF_ADDRESS=$1
PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
RPC_URL="http://localhost:8545"

if [ -z "$VRF_ADDRESS" ]; then
    echo "Usage: $0 <vrf_coordinator_address>"
    exit 1
fi

echo "VRF Watcher started"
echo "  Coordinator: $VRF_ADDRESS"
echo "  RPC: $RPC_URL"
echo ""

# Track fulfilled requests using a temp file (bash 3.x compatible)
FULFILLED_FILE="/tmp/vrf-fulfilled-$$"
touch "$FULFILLED_FILE"
trap "rm -f $FULFILLED_FILE" EXIT

is_fulfilled() {
    grep -q "^$1$" "$FULFILLED_FILE" 2>/dev/null
}

mark_fulfilled() {
    echo "$1" >> "$FULFILLED_FILE"
}

# Poll for new requests
while true; do
    for REQUEST_ID in $(seq 1 100); do
        if is_fulfilled "$REQUEST_ID"; then
            continue
        fi

        CONSUMER=$(cast call "$VRF_ADDRESS" "requestConsumer(uint256)(address)" "$REQUEST_ID" --rpc-url "$RPC_URL" 2>/dev/null)

        if [ -n "$CONSUMER" ] && [ "$CONSUMER" != "0x0000000000000000000000000000000000000000" ]; then
            echo "Fulfilling VRF request $REQUEST_ID..."

            RESULT=$(cast send "$VRF_ADDRESS" "fulfillRandomWordsWithDefault(uint256)" "$REQUEST_ID" \
                --rpc-url "$RPC_URL" \
                --private-key "$PRIVATE_KEY" 2>&1)

            if echo "$RESULT" | grep -q "transactionHash"; then
                echo "  Request $REQUEST_ID fulfilled"
                mark_fulfilled "$REQUEST_ID"
            else
                echo "  Failed: $RESULT"
            fi
        fi
    done

    sleep 2
done
