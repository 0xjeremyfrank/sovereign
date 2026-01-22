// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

/// @title MockVRFCoordinatorV2Plus
/// @notice A simple mock VRF Coordinator for testing FirstBloodContest
contract MockVRFCoordinatorV2Plus {
    uint256 private _nextRequestId = 1;

    // Stores pending requests for manual fulfillment
    mapping(uint256 => address) public requestConsumer;

    /// @notice Emitted when a random words request is made
    event RandomWordsRequested(uint256 indexed requestId, address indexed consumer);

    /// @notice Request random words (mock implementation)
    function requestRandomWords(VRFV2PlusClient.RandomWordsRequest calldata) external returns (uint256 requestId) {
        requestId = _nextRequestId++;
        requestConsumer[requestId] = msg.sender;
        emit RandomWordsRequested(requestId, msg.sender);
    }

    /// @notice Fulfill randomness for a pending request
    /// @param requestId The request ID to fulfill
    /// @param randomWord The random word to return
    function fulfillRandomWords(uint256 requestId, uint256 randomWord) external {
        address consumer = requestConsumer[requestId];
        require(consumer != address(0), "Request not found");

        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = randomWord;

        // Call the consumer's rawFulfillRandomWords function
        (bool success,) =
            consumer.call(abi.encodeWithSignature("rawFulfillRandomWords(uint256,uint256[])", requestId, randomWords));
        require(success, "Fulfillment failed");
    }

    /// @notice Fulfill with a deterministic random word based on requestId
    function fulfillRandomWordsWithDefault(uint256 requestId) external {
        uint256 randomWord = uint256(keccak256(abi.encodePacked(requestId, block.timestamp, block.prevrandao)));

        address consumer = requestConsumer[requestId];
        require(consumer != address(0), "Request not found");

        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = randomWord;

        (bool success,) =
            consumer.call(abi.encodeWithSignature("rawFulfillRandomWords(uint256,uint256[])", requestId, randomWords));
        require(success, "Fulfillment failed");
    }
}
