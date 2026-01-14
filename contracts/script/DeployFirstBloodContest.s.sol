// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {FirstBloodContest} from "../src/FirstBloodContest.sol";

/// @notice Deployment script for FirstBloodContest
/// @dev Usage:
///   forge script script/DeployFirstBloodContest.s.sol:DeployFirstBloodContest --rpc-url <RPC_URL> --broadcast --verify
///   For local: forge script script/DeployFirstBloodContest.s.sol:DeployFirstBloodContest --rpc-url http://localhost:8545 --broadcast
///
/// Environment variables required:
///   VRF_SUBSCRIPTION_ID - Chainlink VRF subscription ID
///   VRF_COORDINATOR - VRF Coordinator address (chain-specific)
///   VRF_KEY_HASH - VRF key hash / gas lane (chain-specific)
contract DeployFirstBloodContest is Script {
    // Sepolia VRF Configuration
    address constant SEPOLIA_VRF_COORDINATOR = 0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B;
    bytes32 constant SEPOLIA_KEY_HASH = 0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae;

    // Base VRF Configuration
    address constant BASE_VRF_COORDINATOR = 0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634;
    bytes32 constant BASE_KEY_HASH = 0x00b81b5a830cb0a0ae0277958529042caa3acba0b84a835c8db082ded8854f28; // 150 gwei lane

    // Common VRF settings
    uint32 constant CALLBACK_GAS_LIMIT = 300000;
    uint16 constant REQUEST_CONFIRMATIONS = 3;

    function run() external returns (address) {
        uint256 subscriptionId = vm.envUint("VRF_SUBSCRIPTION_ID");

        // Determine chain and use appropriate config
        uint256 chainId = block.chainid;
        address vrfCoordinator;
        bytes32 keyHash;

        if (chainId == 11155111) {
            // Sepolia
            vrfCoordinator = SEPOLIA_VRF_COORDINATOR;
            keyHash = SEPOLIA_KEY_HASH;
            console.log("Deploying to Sepolia...");
        } else if (chainId == 8453) {
            // Base Mainnet
            vrfCoordinator = BASE_VRF_COORDINATOR;
            keyHash = BASE_KEY_HASH;
            console.log("Deploying to Base...");
        } else {
            // Allow override via environment for other chains
            vrfCoordinator = vm.envAddress("VRF_COORDINATOR");
            keyHash = vm.envBytes32("VRF_KEY_HASH");
            console.log("Deploying to chain:", chainId);
        }

        console.log("VRF Coordinator:", vrfCoordinator);
        console.log("Subscription ID:", subscriptionId);

        vm.startBroadcast();

        FirstBloodContest contest =
            new FirstBloodContest(vrfCoordinator, subscriptionId, keyHash, CALLBACK_GAS_LIMIT, REQUEST_CONFIRMATIONS);

        vm.stopBroadcast();

        console.log("FirstBloodContest deployed at:", address(contest));
        console.log("");
        console.log("IMPORTANT: Add this contract as a consumer to your VRF subscription!");
        console.log("Visit: https://vrf.chain.link");

        return address(contest);
    }
}

