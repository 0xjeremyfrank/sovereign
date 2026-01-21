// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Test} from "forge-std/Test.sol";
import {FirstBloodContest} from "../src/FirstBloodContest.sol";
import {MockVRFCoordinatorV2Plus} from "./mocks/MockVRFCoordinatorV2Plus.sol";

contract FirstBloodContestTest is Test {
    FirstBloodContest public contest;
    MockVRFCoordinatorV2Plus public vrfCoordinator;

    address public sponsor = address(0x1);
    address public solver1 = address(0x2);
    address public solver2 = address(0x3);
    address public solver3 = address(0x4);

    uint256 public constant PRIZE_POOL = 10 ether;
    uint256 public constant ENTRY_DEPOSIT = 0.001 ether;
    uint256 public constant COMMIT_WINDOW = 100;
    uint256 public constant COMMIT_BUFFER = 5;
    uint256 public constant REVEAL_WINDOW = 200;

    // VRF configuration
    uint256 public constant VRF_SUBSCRIPTION_ID = 1;
    bytes32 public constant VRF_KEY_HASH = keccak256("test_key_hash");
    uint32 public constant VRF_CALLBACK_GAS_LIMIT = 100000;
    uint16 public constant VRF_REQUEST_CONFIRMATIONS = 3;

    function setUp() public {
        // Deploy mock VRF Coordinator
        vrfCoordinator = new MockVRFCoordinatorV2Plus();

        // Deploy FirstBloodContest with VRF config
        contest = new FirstBloodContest(
            address(vrfCoordinator),
            VRF_SUBSCRIPTION_ID,
            VRF_KEY_HASH,
            VRF_CALLBACK_GAS_LIMIT,
            VRF_REQUEST_CONFIRMATIONS
        );

        vm.deal(sponsor, 100 ether);
        vm.deal(solver1, 10 ether);
        vm.deal(solver2, 10 ether);
        vm.deal(solver3, 10 ether);
    }

    // ============ Helper Functions ============

    function createContestParams(uint256 releaseBlock) internal pure returns (FirstBloodContest.ContestParams memory) {
        return FirstBloodContest.ContestParams({
            generatorCodeCid: "QmTest123",
            engineVersion: "1.0.0",
            size: 6,
            releaseBlock: releaseBlock,
            commitWindow: COMMIT_WINDOW,
            commitBuffer: COMMIT_BUFFER,
            revealWindow: REVEAL_WINDOW,
            topN: 3,
            entryDepositWei: ENTRY_DEPOSIT,
            prizePoolWei: PRIZE_POOL,
            sponsor: address(0) // Will be set by caller
        });
    }

    /// @notice Create a test region map for a 6x6 board where each row is a region
    /// @dev Region i contains all cells in row i (simple layout for testing)
    function createTestRegionMap() internal pure returns (bytes memory) {
        bytes memory regionMap = new bytes(36);
        for (uint256 row = 0; row < 6; row++) {
            for (uint256 col = 0; col < 6; col++) {
                regionMap[row * 6 + col] = bytes1(uint8(row));
            }
        }
        return regionMap;
    }

    /// @notice Create a valid solution for the test region map
    /// @dev Solution [0, 2, 4, 1, 3, 5] - unique columns, unique regions, no adjacency
    function createValidSolution() internal pure returns (bytes memory) {
        bytes memory solution = new bytes(6);
        solution[0] = bytes1(uint8(0));
        solution[1] = bytes1(uint8(2));
        solution[2] = bytes1(uint8(4));
        solution[3] = bytes1(uint8(1));
        solution[4] = bytes1(uint8(3));
        solution[5] = bytes1(uint8(5));
        return solution;
    }

    /// @notice Create a unique solution with a different index to avoid duplicate commits
    function createValidSolutionVariant(uint256 index) internal pure returns (bytes memory) {
        // Different valid solutions: rotations that maintain the no-adjacency rule
        bytes memory solution = new bytes(6);
        if (index == 0) {
            // [0, 2, 4, 1, 3, 5]
            solution[0] = bytes1(uint8(0));
            solution[1] = bytes1(uint8(2));
            solution[2] = bytes1(uint8(4));
            solution[3] = bytes1(uint8(1));
            solution[4] = bytes1(uint8(3));
            solution[5] = bytes1(uint8(5));
        } else if (index == 1) {
            // [1, 3, 5, 0, 2, 4]
            solution[0] = bytes1(uint8(1));
            solution[1] = bytes1(uint8(3));
            solution[2] = bytes1(uint8(5));
            solution[3] = bytes1(uint8(0));
            solution[4] = bytes1(uint8(2));
            solution[5] = bytes1(uint8(4));
        } else {
            // [2, 4, 0, 3, 5, 1] - for index >= 2
            solution[0] = bytes1(uint8(2));
            solution[1] = bytes1(uint8(4));
            solution[2] = bytes1(uint8(0));
            solution[3] = bytes1(uint8(3));
            solution[4] = bytes1(uint8(5));
            solution[5] = bytes1(uint8(1));
        }
        return solution;
    }

    function createCommitHash(uint256 contestId, address solver, bytes memory solution, bytes32 salt)
        internal
        pure
        returns (bytes32)
    {
        bytes32 solutionHash = keccak256(solution);
        return keccak256(abi.encodePacked(contestId, solver, solutionHash, salt));
    }

    /// @notice Helper to advance to release block and request/fulfill VRF randomness
    /// @dev Requests VRF randomness and immediately fulfills it with the mock coordinator
    function advanceAndCaptureRandomness(uint256 contestId, uint256 releaseBlock) internal {
        vm.roll(releaseBlock);
        vm.roll(releaseBlock + 1); // Advance one more for safety

        // Request randomness
        uint256 requestId = contest.requestRandomness(contestId);

        // Fulfill with mock coordinator
        vrfCoordinator.fulfillRandomWordsWithDefault(requestId);
    }

    /// @notice Helper to publish the test puzzle after VRF fulfillment
    function publishTestPuzzle(uint256 contestId) internal {
        vm.prank(sponsor);
        contest.publishPuzzle(contestId, createTestRegionMap(), "QmTestPuzzle");
    }

    /// @notice Helper to advance, capture randomness, and publish puzzle
    function advanceAndPublishPuzzle(uint256 contestId, uint256 releaseBlock) internal {
        advanceAndCaptureRandomness(contestId, releaseBlock);
        publishTestPuzzle(contestId);
    }

    // ============ Schedule Contest Tests ============

    function test_ScheduleContest_Success() public {
        uint256 releaseBlock = block.number + 10;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        vm.expectEmit(true, false, false, true);
        emit FirstBloodContest.ContestScheduled(
            0,
            params.generatorCodeCid,
            params.engineVersion,
            releaseBlock,
            COMMIT_WINDOW,
            REVEAL_WINDOW,
            3,
            ENTRY_DEPOSIT
        );

        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        assertEq(contestId, 0);
        (FirstBloodContest.ContestParams memory storedParams, FirstBloodContest.ContestStateData memory state) =
            contest.getContest(contestId);
        assertEq(storedParams.prizePoolWei, PRIZE_POOL);
        assertEq(uint256(state.state), uint256(FirstBloodContest.ContestState.Scheduled));
        assertEq(state.remainingPrizeWei, PRIZE_POOL);
    }

    function test_ScheduleContest_RequiresPrizePool() public {
        FirstBloodContest.ContestParams memory params = createContestParams(block.number + 10);
        params.prizePoolWei = 0;

        vm.prank(sponsor);
        vm.expectRevert(FirstBloodContest.PrizePoolRequired.selector);
        contest.scheduleContest{value: 0}(params);
    }

    function test_ScheduleContest_RequiresExactDeposit() public {
        FirstBloodContest.ContestParams memory params = createContestParams(block.number + 10);

        vm.prank(sponsor);
        vm.expectRevert(
            abi.encodeWithSelector(FirstBloodContest.PrizeFundingMismatch.selector, PRIZE_POOL, PRIZE_POOL - 1)
        );
        contest.scheduleContest{value: PRIZE_POOL - 1}(params);

        vm.prank(sponsor);
        vm.expectRevert(
            abi.encodeWithSelector(FirstBloodContest.PrizeFundingMismatch.selector, PRIZE_POOL, PRIZE_POOL + 1)
        );
        contest.scheduleContest{value: PRIZE_POOL + 1}(params);
    }

    function test_ScheduleContest_RequiresValidSize() public {
        FirstBloodContest.ContestParams memory params = createContestParams(block.number + 10);
        params.size = 4; // Too small

        vm.prank(sponsor);
        vm.expectRevert(abi.encodeWithSelector(FirstBloodContest.InvalidSize.selector, uint8(4)));
        contest.scheduleContest{value: PRIZE_POOL}(params);

        params.size = 11; // Too large
        vm.expectRevert(abi.encodeWithSelector(FirstBloodContest.InvalidSize.selector, uint8(11)));
        contest.scheduleContest{value: PRIZE_POOL}(params);
    }

    function test_ScheduleContest_RequiresFutureReleaseBlock() public {
        FirstBloodContest.ContestParams memory params = createContestParams(block.number - 1);

        vm.prank(sponsor);
        vm.expectRevert(
            abi.encodeWithSelector(FirstBloodContest.ReleaseBlockMustBeFuture.selector, block.number - 1, block.number)
        );
        contest.scheduleContest{value: PRIZE_POOL}(params);
    }

    function test_ScheduleContest_MultipleContests() public {
        uint256 releaseBlock = block.number + 10;
        FirstBloodContest.ContestParams memory params1 = createContestParams(releaseBlock);
        params1.sponsor = sponsor;

        FirstBloodContest.ContestParams memory params2 = createContestParams(releaseBlock + 100);
        params2.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId1 = contest.scheduleContest{value: PRIZE_POOL}(params1);
        assertEq(contestId1, 0);

        vm.prank(sponsor);
        uint256 contestId2 = contest.scheduleContest{value: PRIZE_POOL}(params2);
        assertEq(contestId2, 1);
    }

    // ============ VRF Randomness Tests ============

    function test_RequestRandomness_Success() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        // Advance to release block
        vm.roll(releaseBlock);
        vm.roll(releaseBlock + 1);

        // Request randomness
        vm.expectEmit(true, true, false, false);
        emit FirstBloodContest.RandomnessRequested(contestId, 1); // requestId will be 1

        uint256 requestId = contest.requestRandomness(contestId);
        assertEq(requestId, 1);

        // Check state is RandomnessPending
        (, FirstBloodContest.ContestStateData memory state) = contest.getContest(contestId);
        assertEq(uint256(state.state), uint256(FirstBloodContest.ContestState.RandomnessPending));

        // Fulfill randomness
        uint256 randomWord = 12345;
        bytes32 expectedGlobalSeed = keccak256(abi.encodePacked(randomWord, contestId));

        vm.expectEmit(true, true, false, true);
        emit FirstBloodContest.RandomnessFulfilled(contestId, requestId, expectedGlobalSeed);

        vrfCoordinator.fulfillRandomWords(requestId, randomWord);

        // Check final state
        (, state) = contest.getContest(contestId);
        assertEq(state.globalSeed, expectedGlobalSeed);
        assertEq(uint256(state.state), uint256(FirstBloodContest.ContestState.CommitOpen));
        assertEq(state.randomnessCapturedAt, releaseBlock + 1);
        assertEq(state.commitWindowEndsAt, releaseBlock + 1 + COMMIT_WINDOW);
        assertEq(state.revealWindowEndsAt, releaseBlock + 1 + COMMIT_WINDOW + REVEAL_WINDOW);
    }

    function test_RequestRandomness_RequiresScheduledState() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        // Try to request before release block
        vm.expectRevert(
            abi.encodeWithSelector(FirstBloodContest.ReleaseBlockNotReached.selector, releaseBlock, block.number)
        );
        contest.requestRandomness(contestId);

        // Advance and request/fulfill randomness
        advanceAndCaptureRandomness(contestId, releaseBlock);

        // Try to request again (should fail since state is now CommitOpen)
        vm.expectRevert(abi.encodeWithSelector(FirstBloodContest.NotScheduled.selector, contestId));
        contest.requestRandomness(contestId);
    }

    function test_RequestRandomness_CanRequestAfterReleaseBlock() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        // Advance far past release block (VRF doesn't have the 256 block limitation)
        vm.roll(releaseBlock + 1000);

        // Should still work since VRF doesn't depend on blockhash
        uint256 requestId = contest.requestRandomness(contestId);
        assertEq(requestId, 1);

        (, FirstBloodContest.ContestStateData memory state) = contest.getContest(contestId);
        assertEq(uint256(state.state), uint256(FirstBloodContest.ContestState.RandomnessPending));
    }

    // ============ Commit Solution Tests ============

    function test_CommitSolution_Success() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        advanceAndPublishPuzzle(contestId, releaseBlock);

        bytes memory solution = createValidSolution();
        bytes32 salt = keccak256("salt");
        bytes32 commitHash = createCommitHash(contestId, solver1, solution, salt);

        vm.prank(solver1);
        vm.expectEmit(true, true, false, true);
        emit FirstBloodContest.SolutionCommitted(contestId, solver1, commitHash);

        contest.commitSolution{value: ENTRY_DEPOSIT}(contestId, commitHash);

        FirstBloodContest.Commitment memory commitment = contest.getCommitment(contestId, solver1);
        assertEq(commitment.commitHash, commitHash);
        assertEq(commitment.committedAt, releaseBlock + 1);
        assertEq(commitment.depositPaid, ENTRY_DEPOSIT);
    }

    function test_CommitSolution_RequiresCorrectDeposit() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        advanceAndPublishPuzzle(contestId, releaseBlock);

        bytes32 commitHash = keccak256("test");

        vm.prank(solver1);
        vm.expectRevert(
            abi.encodeWithSelector(FirstBloodContest.IncorrectDeposit.selector, ENTRY_DEPOSIT, ENTRY_DEPOSIT - 1)
        );
        contest.commitSolution{value: ENTRY_DEPOSIT - 1}(contestId, commitHash);

        vm.prank(solver1);
        vm.expectRevert(
            abi.encodeWithSelector(FirstBloodContest.IncorrectDeposit.selector, ENTRY_DEPOSIT, ENTRY_DEPOSIT + 1)
        );
        contest.commitSolution{value: ENTRY_DEPOSIT + 1}(contestId, commitHash);
    }

    function test_CommitSolution_NoDepositRequired() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.entryDepositWei = 0; // No deposit
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        advanceAndPublishPuzzle(contestId, releaseBlock);

        bytes32 commitHash = keccak256("test");

        vm.prank(solver1);
        contest.commitSolution{value: 0}(contestId, commitHash);

        FirstBloodContest.Commitment memory commitment = contest.getCommitment(contestId, solver1);
        assertEq(commitment.depositPaid, 0);
    }

    function test_CommitSolution_RequiresOpenState() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        bytes32 commitHash = keccak256("test");

        vm.prank(solver1);
        vm.expectRevert(
            abi.encodeWithSelector(
                FirstBloodContest.CommitsNotOpen.selector, contestId, FirstBloodContest.ContestState.Scheduled
            )
        );
        contest.commitSolution{value: ENTRY_DEPOSIT}(contestId, commitHash);
    }

    function test_CommitSolution_PreventsDoubleCommit() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        advanceAndPublishPuzzle(contestId, releaseBlock);

        bytes32 commitHash = keccak256("test");

        vm.prank(solver1);
        contest.commitSolution{value: ENTRY_DEPOSIT}(contestId, commitHash);

        vm.prank(solver1);
        vm.expectRevert(abi.encodeWithSelector(FirstBloodContest.AlreadyCommitted.selector, contestId, solver1));
        contest.commitSolution{value: ENTRY_DEPOSIT}(contestId, commitHash);
    }

    function test_CommitSolution_CommitWindowClosed() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        advanceAndCaptureRandomness(contestId, releaseBlock);

        // Advance past commit window
        uint256 windowEndsAt = releaseBlock + 1 + COMMIT_WINDOW;
        vm.roll(windowEndsAt + 1);

        bytes32 commitHash = keccak256("test");

        vm.prank(solver1);
        vm.expectRevert(
            abi.encodeWithSelector(
                FirstBloodContest.CommitWindowClosed.selector, contestId, windowEndsAt + 1, windowEndsAt
            )
        );
        contest.commitSolution{value: ENTRY_DEPOSIT}(contestId, commitHash);
    }

    // ============ Reveal Solution Tests ============

    function test_RevealSolution_Success() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        advanceAndPublishPuzzle(contestId, releaseBlock);

        bytes memory solution = createValidSolution();
        bytes32 salt = keccak256("salt");
        bytes32 commitHash = createCommitHash(contestId, solver1, solution, salt);

        vm.prank(solver1);
        contest.commitSolution{value: ENTRY_DEPOSIT}(contestId, commitHash);

        // Advance past commit buffer
        uint256 revealBlock = releaseBlock + 1 + COMMIT_BUFFER + 1; // +1 for randomness capture block
        vm.roll(revealBlock);

        uint256 expectedReward = PRIZE_POOL / params.topN;
        uint256 solver1BalanceBefore = solver1.balance;

        vm.prank(solver1);
        vm.expectEmit(true, true, false, true);
        emit FirstBloodContest.SolutionRevealed(contestId, solver1, 1, expectedReward, true);

        contest.revealSolution(contestId, solution, salt);

        // Check winner was recorded
        FirstBloodContest.Winner[] memory contestWinners = contest.getWinners(contestId);
        assertEq(contestWinners.length, 1);
        assertEq(contestWinners[0].solver, solver1);
        assertEq(contestWinners[0].rewardWei, expectedReward);
        assertEq(contestWinners[0].rank, 1);

        // Check balance increased (reward + deposit refund)
        assertEq(solver1.balance, solver1BalanceBefore + expectedReward + ENTRY_DEPOSIT);

        // Check state
        (, FirstBloodContest.ContestStateData memory state) = contest.getContest(contestId);
        assertEq(state.winnerCount, 1);
        assertEq(state.remainingPrizeWei, PRIZE_POOL - expectedReward);
    }

    function test_RevealSolution_CommitBufferActive() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        advanceAndPublishPuzzle(contestId, releaseBlock);

        bytes memory solution = createValidSolution();
        bytes32 salt = keccak256("salt");
        bytes32 commitHash = createCommitHash(contestId, solver1, solution, salt);

        vm.prank(solver1);
        contest.commitSolution{value: ENTRY_DEPOSIT}(contestId, commitHash);

        // Try to reveal before buffer ends
        vm.roll(releaseBlock + 1 + COMMIT_BUFFER - 1); // +1 for randomness capture block

        uint256 bufferEndsAt = releaseBlock + 1 + COMMIT_BUFFER;
        vm.prank(solver1);
        vm.expectRevert(
            abi.encodeWithSelector(
                FirstBloodContest.CommitBufferActive.selector, contestId, bufferEndsAt - 1, bufferEndsAt
            )
        );
        contest.revealSolution(contestId, solution, salt);
    }

    function test_RevealSolution_InvalidCommitHash() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        advanceAndPublishPuzzle(contestId, releaseBlock);

        bytes memory solution = createValidSolution();
        bytes32 salt = keccak256("salt");
        bytes32 commitHash = createCommitHash(contestId, solver1, solution, salt);

        vm.prank(solver1);
        contest.commitSolution{value: ENTRY_DEPOSIT}(contestId, commitHash);

        vm.roll(releaseBlock + 1 + COMMIT_BUFFER + 1); // +1 for randomness capture block

        // Wrong salt
        bytes32 wrongSalt = keccak256("wrong salt");
        vm.prank(solver1);
        vm.expectRevert(abi.encodeWithSelector(FirstBloodContest.CommitMismatch.selector, contestId, solver1));
        contest.revealSolution(contestId, solution, wrongSalt);
    }

    function test_RevealSolution_NoCommitment() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        advanceAndCaptureRandomness(contestId, releaseBlock);
        vm.roll(releaseBlock + 1 + COMMIT_BUFFER + 1); // +1 for randomness capture block

        bytes memory solution = "solution";
        bytes32 salt = keccak256("salt");

        vm.prank(solver1);
        vm.expectRevert(abi.encodeWithSelector(FirstBloodContest.NoCommitmentFound.selector, contestId, solver1));
        contest.revealSolution(contestId, solution, salt);
    }

    function test_RevealSolution_PreventsDoubleReveal() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        advanceAndPublishPuzzle(contestId, releaseBlock);

        bytes memory solution = createValidSolution();
        bytes32 salt = keccak256("salt");
        bytes32 commitHash = createCommitHash(contestId, solver1, solution, salt);

        vm.prank(solver1);
        contest.commitSolution{value: ENTRY_DEPOSIT}(contestId, commitHash);

        vm.roll(releaseBlock + 1 + COMMIT_BUFFER + 1); // +1 for randomness capture block

        vm.prank(solver1);
        contest.revealSolution(contestId, solution, salt);

        // Try to reveal again
        vm.prank(solver1);
        vm.expectRevert(abi.encodeWithSelector(FirstBloodContest.AlreadyRevealed.selector, contestId, solver1));
        contest.revealSolution(contestId, solution, salt);
    }

    function test_RevealSolution_MultipleWinners() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        advanceAndPublishPuzzle(contestId, releaseBlock);

        // Commit and reveal for 3 winners
        for (uint256 i = 0; i < 3; i++) {
            address solver = i == 0 ? solver1 : (i == 1 ? solver2 : solver3);
            bytes memory solution = createValidSolutionVariant(i);
            bytes32 salt = keccak256(abi.encodePacked("salt", i));
            bytes32 commitHash = createCommitHash(contestId, solver, solution, salt);

            vm.prank(solver);
            contest.commitSolution{value: ENTRY_DEPOSIT}(contestId, commitHash);
        }

        vm.roll(releaseBlock + 1 + COMMIT_BUFFER + 1); // +1 for randomness capture block

        // Reveal in order
        for (uint256 i = 0; i < 3; i++) {
            address solver = i == 0 ? solver1 : (i == 1 ? solver2 : solver3);
            bytes memory solution = createValidSolutionVariant(i);
            bytes32 salt = keccak256(abi.encodePacked("salt", i));

            vm.prank(solver);
            contest.revealSolution(contestId, solution, salt);
        }

        FirstBloodContest.Winner[] memory contestWinners = contest.getWinners(contestId);
        assertEq(contestWinners.length, 3);
        assertEq(contestWinners[0].solver, solver1);
        assertEq(contestWinners[0].rank, 1);
        assertEq(contestWinners[1].solver, solver2);
        assertEq(contestWinners[1].rank, 2);
        assertEq(contestWinners[2].solver, solver3);
        assertEq(contestWinners[2].rank, 3);

        // Contest should be closed
        (, FirstBloodContest.ContestStateData memory state) = contest.getContest(contestId);
        assertEq(uint256(state.state), uint256(FirstBloodContest.ContestState.Closed));
    }

    function test_RevealSolution_InvalidSolutionForfeitsDeposit() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        advanceAndPublishPuzzle(contestId, releaseBlock);

        // Commit with invalid solution (duplicate columns: [0, 0, 4, 1, 3, 5])
        bytes memory invalidSolution = new bytes(6);
        invalidSolution[0] = bytes1(uint8(0));
        invalidSolution[1] = bytes1(uint8(0)); // Duplicate column!
        invalidSolution[2] = bytes1(uint8(4));
        invalidSolution[3] = bytes1(uint8(1));
        invalidSolution[4] = bytes1(uint8(3));
        invalidSolution[5] = bytes1(uint8(5));

        bytes32 salt = keccak256("salt");
        bytes32 commitHash = createCommitHash(contestId, solver1, invalidSolution, salt);

        vm.prank(solver1);
        contest.commitSolution{value: ENTRY_DEPOSIT}(contestId, commitHash);

        vm.roll(releaseBlock + 1 + COMMIT_BUFFER + 1); // +1 for randomness capture block

        uint256 contractBalanceBefore = address(contest).balance;
        // Balance already includes prize pool + deposit from commit

        vm.prank(solver1);
        vm.expectEmit(true, true, false, true);
        emit FirstBloodContest.SolutionRevealed(contestId, solver1, 0, 0, false);

        contest.revealSolution(contestId, invalidSolution, salt);

        // Deposit should be forfeited (stays in contract)
        (, FirstBloodContest.ContestStateData memory state) = contest.getContest(contestId);
        assertEq(state.forfeitedDepositsWei, ENTRY_DEPOSIT);
        // Balance should be unchanged (deposit already in contract, now forfeited)
        assertEq(address(contest).balance, contractBalanceBefore);
    }

    // ============ Close Contest Tests ============

    function test_CloseContest_AfterTopNReached() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.topN = 2; // Only 2 winners needed
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        advanceAndPublishPuzzle(contestId, releaseBlock);

        // Commit and reveal 2 solutions
        for (uint256 i = 0; i < 2; i++) {
            address solver = i == 0 ? solver1 : solver2;
            bytes memory solution = createValidSolutionVariant(i);
            bytes32 salt = keccak256(abi.encodePacked("salt", i));
            bytes32 commitHash = createCommitHash(contestId, solver, solution, salt);

            vm.prank(solver);
            contest.commitSolution{value: ENTRY_DEPOSIT}(contestId, commitHash);
        }

        vm.roll(releaseBlock + 1 + COMMIT_BUFFER + 1); // +1 for randomness capture block

        // Reveal both - contest should auto-close
        for (uint256 i = 0; i < 2; i++) {
            address solver = i == 0 ? solver1 : solver2;
            bytes memory solution = createValidSolutionVariant(i);
            bytes32 salt = keccak256(abi.encodePacked("salt", i));

            vm.prank(solver);
            contest.revealSolution(contestId, solution, salt);
        }

        (, FirstBloodContest.ContestStateData memory state) = contest.getContest(contestId);
        assertEq(uint256(state.state), uint256(FirstBloodContest.ContestState.Closed));
    }

    function test_CloseContest_AfterRevealWindow() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        advanceAndCaptureRandomness(contestId, releaseBlock);

        // Advance past reveal window
        uint256 revealWindowEnd = releaseBlock + COMMIT_WINDOW + REVEAL_WINDOW;
        vm.roll(revealWindowEnd + 1);

        vm.expectEmit(true, false, false, true);
        emit FirstBloodContest.ContestClosed(contestId, 0, PRIZE_POOL, 0);

        contest.closeContest(contestId);

        (, FirstBloodContest.ContestStateData memory state) = contest.getContest(contestId);
        assertEq(uint256(state.state), uint256(FirstBloodContest.ContestState.Closed));
    }

    function test_CloseContest_RequiresReady() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        advanceAndCaptureRandomness(contestId, releaseBlock);

        // Try to close before window ends
        (, FirstBloodContest.ContestStateData memory state) = contest.getContest(contestId);
        vm.expectRevert(
            abi.encodeWithSelector(
                FirstBloodContest.ContestNotReadyToClose.selector,
                contestId,
                state.winnerCount,
                params.topN,
                block.number,
                state.revealWindowEndsAt
            )
        );
        contest.closeContest(contestId);
    }

    // ============ Withdraw Remaining Prize Tests ============

    function test_WithdrawRemainingPrize_Success() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.topN = 3;
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        advanceAndPublishPuzzle(contestId, releaseBlock);

        // Only reveal 1 solution (should leave remaining prize)
        bytes memory solution = createValidSolution();
        bytes32 salt = keccak256("salt");
        bytes32 commitHash = createCommitHash(contestId, solver1, solution, salt);

        vm.prank(solver1);
        contest.commitSolution{value: ENTRY_DEPOSIT}(contestId, commitHash);

        vm.roll(releaseBlock + 1 + COMMIT_BUFFER + 1); // +1 for randomness capture block

        vm.prank(solver1);
        contest.revealSolution(contestId, solution, salt);

        // Close contest
        vm.roll(releaseBlock + 1 + COMMIT_WINDOW + REVEAL_WINDOW + 1); // +1 for randomness capture block
        contest.closeContest(contestId);

        uint256 expectedRemaining = PRIZE_POOL - (PRIZE_POOL / params.topN);
        uint256 sponsorBalanceBefore = sponsor.balance;

        vm.prank(sponsor);
        vm.expectEmit(true, true, false, true);
        emit FirstBloodContest.PrizeWithdrawn(contestId, sponsor, expectedRemaining);

        contest.withdrawRemainingPrize(contestId);

        assertEq(sponsor.balance, sponsorBalanceBefore + expectedRemaining);
    }

    function test_WithdrawRemainingPrize_OnlySponsor() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        advanceAndCaptureRandomness(contestId, releaseBlock);
        vm.roll(releaseBlock + 1 + COMMIT_WINDOW + REVEAL_WINDOW + 1); // +1 for randomness capture block
        contest.closeContest(contestId);

        vm.prank(solver1);
        vm.expectRevert(abi.encodeWithSelector(FirstBloodContest.NotSponsor.selector, contestId, solver1));
        contest.withdrawRemainingPrize(contestId);
    }

    function test_WithdrawRemainingPrize_RequiresClosed() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        (, FirstBloodContest.ContestStateData memory state) = contest.getContest(contestId);
        vm.prank(sponsor);
        vm.expectRevert(abi.encodeWithSelector(FirstBloodContest.ContestNotClosed.selector, contestId, state.state));
        contest.withdrawRemainingPrize(contestId);
    }

    // ============ Puzzle Publication Tests ============

    function test_PublishPuzzle_Success() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        advanceAndCaptureRandomness(contestId, releaseBlock);

        bytes memory regionMap = createTestRegionMap();
        bytes32 expectedHash = keccak256(regionMap);

        vm.prank(sponsor);
        vm.expectEmit(true, false, false, true);
        emit FirstBloodContest.PuzzlePublished(contestId, expectedHash, "QmTestPuzzle");

        contest.publishPuzzle(contestId, regionMap, "QmTestPuzzle");

        (, FirstBloodContest.ContestStateData memory state) = contest.getContest(contestId);
        assertEq(state.puzzleHash, expectedHash);
    }

    function test_PublishPuzzle_OnlySponsor() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        advanceAndCaptureRandomness(contestId, releaseBlock);

        vm.prank(solver1);
        vm.expectRevert(abi.encodeWithSelector(FirstBloodContest.NotSponsor.selector, contestId, solver1));
        contest.publishPuzzle(contestId, createTestRegionMap(), "QmTestPuzzle");
    }

    function test_PublishPuzzle_RequiresCommitOpenState() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        // Try to publish before VRF fulfilled (state is Scheduled)
        vm.prank(sponsor);
        vm.expectRevert(
            abi.encodeWithSelector(
                FirstBloodContest.CommitsNotOpen.selector, contestId, FirstBloodContest.ContestState.Scheduled
            )
        );
        contest.publishPuzzle(contestId, createTestRegionMap(), "QmTestPuzzle");
    }

    function test_PublishPuzzle_CannotPublishTwice() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        advanceAndCaptureRandomness(contestId, releaseBlock);

        vm.prank(sponsor);
        contest.publishPuzzle(contestId, createTestRegionMap(), "QmTestPuzzle");

        // Try to publish again
        vm.prank(sponsor);
        vm.expectRevert(abi.encodeWithSelector(FirstBloodContest.PuzzleAlreadyPublished.selector, contestId));
        contest.publishPuzzle(contestId, createTestRegionMap(), "QmTestPuzzle2");
    }

    function test_PublishPuzzle_DeadlinePassed() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        advanceAndCaptureRandomness(contestId, releaseBlock);

        // Get the deadline
        (, FirstBloodContest.ContestStateData memory state) = contest.getContest(contestId);
        uint256 deadline = state.puzzlePublishDeadline;

        // Advance past deadline
        vm.roll(deadline + 1);

        vm.prank(sponsor);
        vm.expectRevert(abi.encodeWithSelector(FirstBloodContest.PuzzlePublishDeadlinePassed.selector, contestId, deadline));
        contest.publishPuzzle(contestId, createTestRegionMap(), "QmTestPuzzle");
    }

    function test_PublishPuzzle_InvalidRegionMapLength() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        advanceAndCaptureRandomness(contestId, releaseBlock);

        // Create wrong-sized region map (35 instead of 36 for 6x6)
        bytes memory wrongSizeMap = new bytes(35);

        vm.prank(sponsor);
        vm.expectRevert(abi.encodeWithSelector(FirstBloodContest.InvalidRegionMapLength.selector, 35, 36));
        contest.publishPuzzle(contestId, wrongSizeMap, "QmTestPuzzle");
    }

    function test_PublishPuzzle_InvalidRegionId() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        advanceAndCaptureRandomness(contestId, releaseBlock);

        // Create region map with invalid region ID (6 is out of range for 6x6)
        bytes memory invalidMap = createTestRegionMap();
        invalidMap[10] = bytes1(uint8(6)); // Region 6 is invalid (max is 5)

        vm.prank(sponsor);
        vm.expectRevert(abi.encodeWithSelector(FirstBloodContest.InvalidRegionId.selector, 10, 6, 6));
        contest.publishPuzzle(contestId, invalidMap, "QmTestPuzzle");
    }

    function test_CommitSolution_RequiresPuzzlePublished() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        advanceAndCaptureRandomness(contestId, releaseBlock);
        // Note: NOT publishing puzzle

        bytes32 commitHash = keccak256("test");

        vm.prank(solver1);
        vm.expectRevert(abi.encodeWithSelector(FirstBloodContest.PuzzleNotPublished.selector, contestId));
        contest.commitSolution{value: ENTRY_DEPOSIT}(contestId, commitHash);
    }

    // ============ Solution Validation Tests ============

    function test_ValidateSolution_AcceptsValid() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        advanceAndPublishPuzzle(contestId, releaseBlock);

        bytes memory solution = createValidSolution();
        bytes32 salt = keccak256("salt");
        bytes32 commitHash = createCommitHash(contestId, solver1, solution, salt);

        vm.prank(solver1);
        contest.commitSolution{value: ENTRY_DEPOSIT}(contestId, commitHash);

        vm.roll(releaseBlock + 1 + COMMIT_BUFFER + 1);

        vm.prank(solver1);
        contest.revealSolution(contestId, solution, salt);

        // Should have recorded a winner
        FirstBloodContest.Winner[] memory contestWinners = contest.getWinners(contestId);
        assertEq(contestWinners.length, 1);
    }

    function test_ValidateSolution_RejectsDuplicateColumn() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        advanceAndPublishPuzzle(contestId, releaseBlock);

        // Invalid: duplicate column 0
        bytes memory solution = new bytes(6);
        solution[0] = bytes1(uint8(0));
        solution[1] = bytes1(uint8(0)); // Duplicate!
        solution[2] = bytes1(uint8(4));
        solution[3] = bytes1(uint8(1));
        solution[4] = bytes1(uint8(3));
        solution[5] = bytes1(uint8(5));

        bytes32 salt = keccak256("salt");
        bytes32 commitHash = createCommitHash(contestId, solver1, solution, salt);

        vm.prank(solver1);
        contest.commitSolution{value: ENTRY_DEPOSIT}(contestId, commitHash);

        vm.roll(releaseBlock + 1 + COMMIT_BUFFER + 1);

        vm.prank(solver1);
        contest.revealSolution(contestId, solution, salt);

        // Should NOT have recorded a winner (invalid solution)
        FirstBloodContest.Winner[] memory contestWinners = contest.getWinners(contestId);
        assertEq(contestWinners.length, 0);
    }

    function test_ValidateSolution_RejectsAdjacentSovereigns() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        advanceAndPublishPuzzle(contestId, releaseBlock);

        // Invalid: adjacent sovereigns (columns 0 and 1 in consecutive rows)
        bytes memory solution = new bytes(6);
        solution[0] = bytes1(uint8(0));
        solution[1] = bytes1(uint8(1)); // Adjacent to row 0 col 0!
        solution[2] = bytes1(uint8(4));
        solution[3] = bytes1(uint8(2));
        solution[4] = bytes1(uint8(5));
        solution[5] = bytes1(uint8(3));

        bytes32 salt = keccak256("salt");
        bytes32 commitHash = createCommitHash(contestId, solver1, solution, salt);

        vm.prank(solver1);
        contest.commitSolution{value: ENTRY_DEPOSIT}(contestId, commitHash);

        vm.roll(releaseBlock + 1 + COMMIT_BUFFER + 1);

        vm.prank(solver1);
        contest.revealSolution(contestId, solution, salt);

        // Should NOT have recorded a winner (invalid solution)
        FirstBloodContest.Winner[] memory contestWinners = contest.getWinners(contestId);
        assertEq(contestWinners.length, 0);
    }

    function test_ValidateSolution_RejectsWrongLength() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        advanceAndPublishPuzzle(contestId, releaseBlock);

        // Invalid: wrong length (5 instead of 6)
        bytes memory solution = new bytes(5);
        solution[0] = bytes1(uint8(0));
        solution[1] = bytes1(uint8(2));
        solution[2] = bytes1(uint8(4));
        solution[3] = bytes1(uint8(1));
        solution[4] = bytes1(uint8(3));

        bytes32 salt = keccak256("salt");
        bytes32 commitHash = createCommitHash(contestId, solver1, solution, salt);

        vm.prank(solver1);
        contest.commitSolution{value: ENTRY_DEPOSIT}(contestId, commitHash);

        vm.roll(releaseBlock + 1 + COMMIT_BUFFER + 1);

        vm.prank(solver1);
        contest.revealSolution(contestId, solution, salt);

        // Should NOT have recorded a winner (invalid solution)
        FirstBloodContest.Winner[] memory contestWinners = contest.getWinners(contestId);
        assertEq(contestWinners.length, 0);
    }

    // ============ Cancellation Tests ============

    function test_CancelUnpublishedContest_Success() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        advanceAndCaptureRandomness(contestId, releaseBlock);
        // Note: NOT publishing puzzle

        // Get the deadline
        (, FirstBloodContest.ContestStateData memory state) = contest.getContest(contestId);
        uint256 deadline = state.puzzlePublishDeadline;

        // Advance past deadline
        vm.roll(deadline + 1);

        vm.expectEmit(true, false, false, true);
        emit FirstBloodContest.ContestCancelled(contestId, FirstBloodContest.CancelReason.PuzzleNotPublished);

        contest.cancelUnpublishedContest(contestId);

        (, state) = contest.getContest(contestId);
        assertEq(uint256(state.state), uint256(FirstBloodContest.ContestState.Cancelled));
    }

    function test_CancelUnpublishedContest_DeadlineNotPassed() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        advanceAndCaptureRandomness(contestId, releaseBlock);

        // Get the deadline
        (, FirstBloodContest.ContestStateData memory state) = contest.getContest(contestId);
        uint256 deadline = state.puzzlePublishDeadline;

        // Try to cancel before deadline
        vm.expectRevert(
            abi.encodeWithSelector(FirstBloodContest.PuzzlePublishDeadlineNotPassed.selector, contestId, deadline)
        );
        contest.cancelUnpublishedContest(contestId);
    }

    function test_CancelUnpublishedContest_PuzzleAlreadyPublished() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        advanceAndPublishPuzzle(contestId, releaseBlock);

        // Get the deadline
        (, FirstBloodContest.ContestStateData memory state) = contest.getContest(contestId);
        uint256 deadline = state.puzzlePublishDeadline;

        // Advance past deadline
        vm.roll(deadline + 1);

        // Try to cancel after puzzle published
        vm.expectRevert(abi.encodeWithSelector(FirstBloodContest.PuzzleAlreadyPublished.selector, contestId));
        contest.cancelUnpublishedContest(contestId);
    }

    function test_RefundCancelledDeposit_NoDeposit() public {
        // Note: The refundCancelledDeposit function exists for a scenario where
        // the puzzle publication deadline window is long enough that players
        // might commit before the sponsor publishes. However, with the current
        // design, commits require puzzle to be published first.
        // This test verifies the "no deposit to refund" error path.

        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        advanceAndCaptureRandomness(contestId, releaseBlock);
        // Note: NOT publishing puzzle

        // Get the deadline and advance past it
        (, FirstBloodContest.ContestStateData memory state) = contest.getContest(contestId);
        vm.roll(state.puzzlePublishDeadline + 1);

        // Cancel the contest
        contest.cancelUnpublishedContest(contestId);

        // Try to refund when there's no deposit (solver1 never committed)
        vm.prank(solver1);
        vm.expectRevert(abi.encodeWithSelector(FirstBloodContest.NoDepositToRefund.selector, contestId, solver1));
        contest.refundCancelledDeposit(contestId);
    }

    function test_RefundCancelledDeposit_RequiresCancelledState() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        advanceAndPublishPuzzle(contestId, releaseBlock);

        // Try to refund when contest is not cancelled
        vm.prank(solver1);
        vm.expectRevert(abi.encodeWithSelector(FirstBloodContest.ContestNotCancelled.selector, contestId));
        contest.refundCancelledDeposit(contestId);
    }

    function test_WithdrawCancelledPrize_Success() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        advanceAndCaptureRandomness(contestId, releaseBlock);
        // Note: NOT publishing puzzle

        // Get the deadline
        (, FirstBloodContest.ContestStateData memory state) = contest.getContest(contestId);
        uint256 deadline = state.puzzlePublishDeadline;

        // Advance past deadline and cancel
        vm.roll(deadline + 1);
        contest.cancelUnpublishedContest(contestId);

        uint256 sponsorBalanceBefore = sponsor.balance;

        vm.prank(sponsor);
        vm.expectEmit(true, true, false, true);
        emit FirstBloodContest.PrizeWithdrawn(contestId, sponsor, PRIZE_POOL);

        contest.withdrawCancelledPrize(contestId);

        assertEq(sponsor.balance, sponsorBalanceBefore + PRIZE_POOL);
    }

    function test_WithdrawCancelledPrize_OnlySponsor() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        advanceAndCaptureRandomness(contestId, releaseBlock);

        (, FirstBloodContest.ContestStateData memory state) = contest.getContest(contestId);
        vm.roll(state.puzzlePublishDeadline + 1);
        contest.cancelUnpublishedContest(contestId);

        vm.prank(solver1);
        vm.expectRevert(abi.encodeWithSelector(FirstBloodContest.NotSponsor.selector, contestId, solver1));
        contest.withdrawCancelledPrize(contestId);
    }

    function test_WithdrawCancelledPrize_RequiresCancelledState() public {
        uint256 releaseBlock = block.number + 5;
        FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
        params.sponsor = sponsor;

        vm.prank(sponsor);
        uint256 contestId = contest.scheduleContest{value: PRIZE_POOL}(params);

        advanceAndPublishPuzzle(contestId, releaseBlock);

        // Try to withdraw cancelled prize when contest is not cancelled
        vm.prank(sponsor);
        vm.expectRevert(abi.encodeWithSelector(FirstBloodContest.ContestNotCancelled.selector, contestId));
        contest.withdrawCancelledPrize(contestId);
    }
}
