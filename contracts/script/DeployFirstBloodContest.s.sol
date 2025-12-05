// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {FirstBloodContest} from "../src/FirstBloodContest.sol";

/// @notice Deployment script for FirstBloodContest
/// @dev Usage:
///   forge script script/DeployFirstBloodContest.s.sol:DeployFirstBloodContest --rpc-url <RPC_URL> --broadcast --verify
///   For local: forge script script/DeployFirstBloodContest.s.sol:DeployFirstBloodContest --rpc-url http://localhost:8545 --broadcast
contract DeployFirstBloodContest is Script {
    function run() external returns (address) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        FirstBloodContest contest = new FirstBloodContest();

        vm.stopBroadcast();

        console.log("FirstBloodContest deployed at:", address(contest));
        return address(contest);
    }
}

