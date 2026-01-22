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

# Track fulfilled requests to avoid duplicates
declare -A FULFILLED

# Poll for new requests
while true; do
    # Check request IDs 1-100 (reasonable range for local dev)
    for REQUEST_ID in $(seq 1 100); do
        # Skip if already fulfilled
        if [ -n "${FULFILLED[$REQUEST_ID]}" ]; then
            continue
        fi

        # Check if this request exists (has a consumer)
        CONSUMER=$(cast call "$VRF_ADDRESS" "requestConsumer(uint256)(address)" "$REQUEST_ID" --rpc-url "$RPC_URL" 2>/dev/null)

        # If consumer is not zero address, this is a pending request
        if [ -n "$CONSUMER" ] && [ "$CONSUMER" != "0x0000000000000000000000000000000000000000" ]; then
            echo "Found pending VRF request $REQUEST_ID from $CONSUMER"
            echo "  Fulfilling..."

            # Fulfill the request using the mock's fulfillRandomWordsWithDefault
            RESULT=$(cast send "$VRF_ADDRESS" "fulfillRandomWordsWithDefault(uint256)" "$REQUEST_ID" \
                --rpc-url "$RPC_URL" \
                --private-key "$PRIVATE_KEY" 2>&1)

            if echo "$RESULT" | grep -q "transactionHash"; then
                echo "  Request $REQUEST_ID fulfilled successfully"
                FULFILLED[$REQUEST_ID]=1
            else
                echo "  Failed to fulfill request $REQUEST_ID: $RESULT"
            fi
        fi
    done

    # Wait before next poll
    sleep 2
done
