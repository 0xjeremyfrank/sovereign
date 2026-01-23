// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {FirstBloodContest} from "../src/FirstBloodContest.sol";
import {MockVRFCoordinatorV2Plus} from "../test/mocks/MockVRFCoordinatorV2Plus.sol";

/// @notice Deployment script for local development with Anvil
/// @dev Usage:
///   forge script script/DeployLocal.s.sol:DeployLocal \
///     --rpc-url http://localhost:8545 \
///     --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
///     --broadcast
contract DeployLocal is Script {
    function run() external {
        vm.startBroadcast();

        // Deploy mock VRF coordinator
        MockVRFCoordinatorV2Plus vrfCoordinator = new MockVRFCoordinatorV2Plus();
        console.log("VRF_COORDINATOR=%s", address(vrfCoordinator));

        // Deploy contest contract pointing to mock VRF
        // For local testing, we use placeholder values for VRF config
        FirstBloodContest contest = new FirstBloodContest(
            address(vrfCoordinator),
            1, // subscriptionId (unused in mock)
            bytes32(0), // keyHash (unused in mock)
            300000, // callbackGasLimit
            1 // requestConfirmations
        );
        console.log("FIRST_BLOOD_CONTEST=%s", address(contest));

        // Schedule a test contest with reasonable parameters for local dev
        uint256 releaseBlock = block.number + 5; // Starts in 5 blocks
        FirstBloodContest.ContestParams memory params = FirstBloodContest.ContestParams({
            generatorCodeCid: "QmLocalTestContest",
            engineVersion: "1.0.0",
            size: 5,
            releaseBlock: releaseBlock,
            commitWindow: 1000, // ~33 minutes at 2s blocks
            commitBuffer: 5,
            revealWindow: 500, // ~16 minutes at 2s blocks
            topN: 3,
            entryDepositWei: 0,
            prizePoolWei: 1 ether,
            sponsor: address(0)
        });

        uint256 contestId = contest.scheduleContest{value: 1 ether}(params);
        console.log("CONTEST_ID=%d", contestId);
        console.log("RELEASE_BLOCK=%d", releaseBlock);

        vm.stopBroadcast();

        console.log("");
        console.log("Local deployment complete!");
        console.log("  VRF Coordinator: %s", address(vrfCoordinator));
        console.log("  FirstBloodContest: %s", address(contest));
        console.log("  Contest ID: %d", contestId);
        console.log("  Release block: %d", releaseBlock);
    }
}
