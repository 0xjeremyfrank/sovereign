// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from 'forge-std/Test.sol';
import { FirstBloodContest } from '../src/FirstBloodContest.sol';

contract FirstBloodContestTest is Test {
  FirstBloodContest public contest;

  address public sponsor = address(0x1);
  address public solver1 = address(0x2);
  address public solver2 = address(0x3);
  address public solver3 = address(0x4);

  uint256 public constant PRIZE_POOL = 10 ether;
  uint256 public constant ENTRY_DEPOSIT = 0.001 ether;
  uint256 public constant COMMIT_WINDOW = 100;
  uint256 public constant COMMIT_BUFFER = 5;
  uint256 public constant REVEAL_WINDOW = 200;

  function setUp() public {
    contest = new FirstBloodContest();
    vm.deal(sponsor, 100 ether);
    vm.deal(solver1, 10 ether);
    vm.deal(solver2, 10 ether);
    vm.deal(solver3, 10 ether);
  }

  // ============ Helper Functions ============

  function createContestParams(uint256 releaseBlock) internal pure returns (FirstBloodContest.ContestParams memory) {
    return FirstBloodContest.ContestParams({
      generatorCodeCid: 'QmTest123',
      engineVersion: '1.0.0',
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

  function createCommitHash(
    uint256 contestId,
    address solver,
    bytes memory solution,
    bytes32 salt
  ) internal pure returns (bytes32) {
    bytes32 solutionHash = keccak256(solution);
    return keccak256(abi.encodePacked(contestId, solver, solutionHash, salt));
  }

  /// @notice Helper to advance to release block and capture randomness
  /// @dev Must advance past releaseBlock to access blockhash
  function advanceAndCaptureRandomness(uint256 contestId, uint256 releaseBlock) internal {
    vm.roll(releaseBlock);
    vm.roll(releaseBlock + 1); // Advance one more to access blockhash
    contest.captureRandomness(contestId);
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

    uint256 contestId = contest.scheduleContest{ value: PRIZE_POOL }(params);

    assertEq(contestId, 0);
    (FirstBloodContest.ContestParams memory storedParams, FirstBloodContest.ContestStateData memory state) = contest
      .getContest(contestId);
    assertEq(storedParams.prizePoolWei, PRIZE_POOL);
    assertEq(uint256(state.state), uint256(FirstBloodContest.ContestState.Scheduled));
    assertEq(state.remainingPrizeWei, PRIZE_POOL);
  }

  function test_ScheduleContest_RequiresPrizePool() public {
    FirstBloodContest.ContestParams memory params = createContestParams(block.number + 10);
    params.prizePoolWei = 0;

    vm.prank(sponsor);
    vm.expectRevert(FirstBloodContest.PrizePoolRequired.selector);
    contest.scheduleContest{ value: 0 }(params);
  }

  function test_ScheduleContest_RequiresSufficientDeposit() public {
    FirstBloodContest.ContestParams memory params = createContestParams(block.number + 10);

    vm.prank(sponsor);
    vm.expectRevert(
      abi.encodeWithSelector(FirstBloodContest.InsufficientPrizeDeposit.selector, PRIZE_POOL, PRIZE_POOL - 1)
    );
    contest.scheduleContest{ value: PRIZE_POOL - 1 }(params);
  }

  function test_ScheduleContest_RequiresValidSize() public {
    FirstBloodContest.ContestParams memory params = createContestParams(block.number + 10);
    params.size = 4; // Too small

    vm.prank(sponsor);
    vm.expectRevert(abi.encodeWithSelector(FirstBloodContest.InvalidSize.selector, uint8(4)));
    contest.scheduleContest{ value: PRIZE_POOL }(params);

    params.size = 11; // Too large
    vm.expectRevert(abi.encodeWithSelector(FirstBloodContest.InvalidSize.selector, uint8(11)));
    contest.scheduleContest{ value: PRIZE_POOL }(params);
  }

  function test_ScheduleContest_RequiresFutureReleaseBlock() public {
    FirstBloodContest.ContestParams memory params = createContestParams(block.number - 1);

    vm.prank(sponsor);
    vm.expectRevert(
      abi.encodeWithSelector(FirstBloodContest.ReleaseBlockMustBeFuture.selector, block.number - 1, block.number)
    );
    contest.scheduleContest{ value: PRIZE_POOL }(params);
  }

  function test_ScheduleContest_MultipleContests() public {
    uint256 releaseBlock = block.number + 10;
    FirstBloodContest.ContestParams memory params1 = createContestParams(releaseBlock);
    params1.sponsor = sponsor;

    FirstBloodContest.ContestParams memory params2 = createContestParams(releaseBlock + 100);
    params2.sponsor = sponsor;

    vm.prank(sponsor);
    uint256 contestId1 = contest.scheduleContest{ value: PRIZE_POOL }(params1);
    assertEq(contestId1, 0);

    vm.prank(sponsor);
    uint256 contestId2 = contest.scheduleContest{ value: PRIZE_POOL }(params2);
    assertEq(contestId2, 1);
  }

  // ============ Capture Randomness Tests ============

  function test_CaptureRandomness_Success() public {
    uint256 releaseBlock = block.number + 5;
    FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
    params.sponsor = sponsor;

    vm.prank(sponsor);
    uint256 contestId = contest.scheduleContest{ value: PRIZE_POOL }(params);

    // Advance to release block, then one more to access blockhash
    vm.roll(releaseBlock);
    vm.roll(releaseBlock + 1);

    // Store blockhash for verification (now accessible since we're past releaseBlock)
    bytes32 expectedSeedSource = blockhash(releaseBlock);
    bytes32 expectedGlobalSeed = keccak256(abi.encodePacked(expectedSeedSource, contestId));

    vm.expectEmit(true, false, false, true);
    emit FirstBloodContest.RandomnessCaptured(contestId, expectedSeedSource);

    contest.captureRandomness(contestId);

    (, FirstBloodContest.ContestStateData memory state) = contest.getContest(contestId);
    assertEq(state.globalSeed, expectedGlobalSeed);
    assertEq(uint256(state.state), uint256(FirstBloodContest.ContestState.CommitOpen));
    assertEq(state.randomnessCapturedAt, releaseBlock + 1);
    assertEq(state.commitWindowEndsAt, releaseBlock + 1 + COMMIT_WINDOW);
    assertEq(state.revealWindowEndsAt, releaseBlock + 1 + COMMIT_WINDOW + REVEAL_WINDOW);
  }

  function test_CaptureRandomness_RequiresScheduledState() public {
    uint256 releaseBlock = block.number + 5;
    FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
    params.sponsor = sponsor;

    vm.prank(sponsor);
    uint256 contestId = contest.scheduleContest{ value: PRIZE_POOL }(params);

    // Try to capture before release block
    vm.expectRevert(
      abi.encodeWithSelector(FirstBloodContest.ReleaseBlockNotReached.selector, releaseBlock, block.number)
    );
    contest.captureRandomness(contestId);

    // Advance and capture (need to advance past releaseBlock to access blockhash)
    advanceAndCaptureRandomness(contestId, releaseBlock);

    // Try to capture again (should fail since state is now CommitOpen)
    vm.expectRevert(abi.encodeWithSelector(FirstBloodContest.NotScheduled.selector, contestId));
    contest.captureRandomness(contestId);
  }

  function test_CaptureRandomness_BlockhashUnavailable() public {
    uint256 releaseBlock = block.number + 5;
    FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
    params.sponsor = sponsor;

    vm.prank(sponsor);
    uint256 contestId = contest.scheduleContest{ value: PRIZE_POOL }(params);

    // Advance too far (blockhash only available for last 256 blocks)
    vm.roll(releaseBlock + 257);

    vm.expectRevert(abi.encodeWithSelector(FirstBloodContest.BlockhashUnavailable.selector, releaseBlock));
    contest.captureRandomness(contestId);
  }

  // ============ Commit Solution Tests ============

  function test_CommitSolution_Success() public {
    uint256 releaseBlock = block.number + 5;
    FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
    params.sponsor = sponsor;

    vm.prank(sponsor);
    uint256 contestId = contest.scheduleContest{ value: PRIZE_POOL }(params);

    advanceAndCaptureRandomness(contestId, releaseBlock);

    bytes memory solution = 'test solution';
    bytes32 salt = keccak256('salt');
    bytes32 commitHash = createCommitHash(contestId, solver1, solution, salt);

    vm.prank(solver1);
    vm.expectEmit(true, true, false, true);
    emit FirstBloodContest.SolutionCommitted(contestId, solver1, commitHash);

    contest.commitSolution{ value: ENTRY_DEPOSIT }(contestId, commitHash);

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
    uint256 contestId = contest.scheduleContest{ value: PRIZE_POOL }(params);

    advanceAndCaptureRandomness(contestId, releaseBlock);

    bytes32 commitHash = keccak256('test');

    vm.prank(solver1);
    vm.expectRevert(abi.encodeWithSelector(FirstBloodContest.IncorrectDeposit.selector, ENTRY_DEPOSIT, ENTRY_DEPOSIT - 1));
    contest.commitSolution{ value: ENTRY_DEPOSIT - 1 }(contestId, commitHash);

    vm.prank(solver1);
    vm.expectRevert(abi.encodeWithSelector(FirstBloodContest.IncorrectDeposit.selector, ENTRY_DEPOSIT, ENTRY_DEPOSIT + 1));
    contest.commitSolution{ value: ENTRY_DEPOSIT + 1 }(contestId, commitHash);
  }

  function test_CommitSolution_NoDepositRequired() public {
    uint256 releaseBlock = block.number + 5;
    FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
    params.entryDepositWei = 0; // No deposit
    params.sponsor = sponsor;

    vm.prank(sponsor);
    uint256 contestId = contest.scheduleContest{ value: PRIZE_POOL }(params);

    advanceAndCaptureRandomness(contestId, releaseBlock);

    bytes32 commitHash = keccak256('test');

    vm.prank(solver1);
    contest.commitSolution{ value: 0 }(contestId, commitHash);

    FirstBloodContest.Commitment memory commitment = contest.getCommitment(contestId, solver1);
    assertEq(commitment.depositPaid, 0);
  }

  function test_CommitSolution_RequiresOpenState() public {
    uint256 releaseBlock = block.number + 5;
    FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
    params.sponsor = sponsor;

    vm.prank(sponsor);
    uint256 contestId = contest.scheduleContest{ value: PRIZE_POOL }(params);

    bytes32 commitHash = keccak256('test');

    vm.prank(solver1);
    vm.expectRevert(
      abi.encodeWithSelector(FirstBloodContest.CommitsNotOpen.selector, contestId, FirstBloodContest.ContestState.Scheduled)
    );
    contest.commitSolution{ value: ENTRY_DEPOSIT }(contestId, commitHash);
  }

  function test_CommitSolution_PreventsDoubleCommit() public {
    uint256 releaseBlock = block.number + 5;
    FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
    params.sponsor = sponsor;

    vm.prank(sponsor);
    uint256 contestId = contest.scheduleContest{ value: PRIZE_POOL }(params);

    advanceAndCaptureRandomness(contestId, releaseBlock);

    bytes32 commitHash = keccak256('test');

    vm.prank(solver1);
    contest.commitSolution{ value: ENTRY_DEPOSIT }(contestId, commitHash);

    vm.prank(solver1);
    vm.expectRevert(abi.encodeWithSelector(FirstBloodContest.AlreadyCommitted.selector, contestId, solver1));
    contest.commitSolution{ value: ENTRY_DEPOSIT }(contestId, commitHash);
  }

  function test_CommitSolution_CommitWindowClosed() public {
    uint256 releaseBlock = block.number + 5;
    FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
    params.sponsor = sponsor;

    vm.prank(sponsor);
    uint256 contestId = contest.scheduleContest{ value: PRIZE_POOL }(params);

    advanceAndCaptureRandomness(contestId, releaseBlock);

    // Advance past commit window
    uint256 windowEndsAt = releaseBlock + 1 + COMMIT_WINDOW;
    vm.roll(windowEndsAt + 1);

    bytes32 commitHash = keccak256('test');

    vm.prank(solver1);
    vm.expectRevert(abi.encodeWithSelector(FirstBloodContest.CommitWindowClosed.selector, contestId, windowEndsAt + 1, windowEndsAt));
    contest.commitSolution{ value: ENTRY_DEPOSIT }(contestId, commitHash);
  }

  // ============ Reveal Solution Tests ============

  function test_RevealSolution_Success() public {
    uint256 releaseBlock = block.number + 5;
    FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
    params.sponsor = sponsor;

    vm.prank(sponsor);
    uint256 contestId = contest.scheduleContest{ value: PRIZE_POOL }(params);

    advanceAndCaptureRandomness(contestId, releaseBlock);

    bytes memory solution = 'valid solution';
    bytes32 salt = keccak256('salt');
    bytes32 commitHash = createCommitHash(contestId, solver1, solution, salt);

    vm.prank(solver1);
    contest.commitSolution{ value: ENTRY_DEPOSIT }(contestId, commitHash);

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
    FirstBloodContest.Winner[] memory winners = contest.getWinners(contestId);
    assertEq(winners.length, 1);
    assertEq(winners[0].solver, solver1);
    assertEq(winners[0].rewardWei, expectedReward);
    assertEq(winners[0].rank, 1);

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
    uint256 contestId = contest.scheduleContest{ value: PRIZE_POOL }(params);

    advanceAndCaptureRandomness(contestId, releaseBlock);

    bytes memory solution = 'valid solution';
    bytes32 salt = keccak256('salt');
    bytes32 commitHash = createCommitHash(contestId, solver1, solution, salt);

    vm.prank(solver1);
    contest.commitSolution{ value: ENTRY_DEPOSIT }(contestId, commitHash);

    // Try to reveal before buffer ends
    vm.roll(releaseBlock + 1 + COMMIT_BUFFER - 1); // +1 for randomness capture block

    uint256 bufferEndsAt = releaseBlock + 1 + COMMIT_BUFFER;
    vm.prank(solver1);
    vm.expectRevert(abi.encodeWithSelector(FirstBloodContest.CommitBufferActive.selector, contestId, bufferEndsAt - 1, bufferEndsAt));
    contest.revealSolution(contestId, solution, salt);
  }

  function test_RevealSolution_InvalidCommitHash() public {
    uint256 releaseBlock = block.number + 5;
    FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
    params.sponsor = sponsor;

    vm.prank(sponsor);
    uint256 contestId = contest.scheduleContest{ value: PRIZE_POOL }(params);

    advanceAndCaptureRandomness(contestId, releaseBlock);

    bytes memory solution = 'valid solution';
    bytes32 salt = keccak256('salt');
    bytes32 commitHash = createCommitHash(contestId, solver1, solution, salt);

    vm.prank(solver1);
    contest.commitSolution{ value: ENTRY_DEPOSIT }(contestId, commitHash);

    vm.roll(releaseBlock + 1 + COMMIT_BUFFER + 1); // +1 for randomness capture block

    // Wrong salt
    bytes32 wrongSalt = keccak256('wrong salt');
    vm.prank(solver1);
    vm.expectRevert(abi.encodeWithSelector(FirstBloodContest.CommitMismatch.selector, contestId, solver1));
    contest.revealSolution(contestId, solution, wrongSalt);
  }

  function test_RevealSolution_NoCommitment() public {
    uint256 releaseBlock = block.number + 5;
    FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
    params.sponsor = sponsor;

    vm.prank(sponsor);
    uint256 contestId = contest.scheduleContest{ value: PRIZE_POOL }(params);

    advanceAndCaptureRandomness(contestId, releaseBlock);
    vm.roll(releaseBlock + 1 + COMMIT_BUFFER + 1); // +1 for randomness capture block

    bytes memory solution = 'solution';
    bytes32 salt = keccak256('salt');

    vm.prank(solver1);
    vm.expectRevert(abi.encodeWithSelector(FirstBloodContest.NoCommitmentFound.selector, contestId, solver1));
    contest.revealSolution(contestId, solution, salt);
  }

  function test_RevealSolution_PreventsDoubleReveal() public {
    uint256 releaseBlock = block.number + 5;
    FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
    params.sponsor = sponsor;

    vm.prank(sponsor);
    uint256 contestId = contest.scheduleContest{ value: PRIZE_POOL }(params);

    advanceAndCaptureRandomness(contestId, releaseBlock);

    bytes memory solution = 'valid solution';
    bytes32 salt = keccak256('salt');
    bytes32 commitHash = createCommitHash(contestId, solver1, solution, salt);

    vm.prank(solver1);
    contest.commitSolution{ value: ENTRY_DEPOSIT }(contestId, commitHash);

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
    uint256 contestId = contest.scheduleContest{ value: PRIZE_POOL }(params);

    advanceAndCaptureRandomness(contestId, releaseBlock);

    uint256 expectedReward = PRIZE_POOL / params.topN;

    // Commit and reveal for 3 winners
    for (uint256 i = 0; i < 3; i++) {
      address solver = i == 0 ? solver1 : (i == 1 ? solver2 : solver3);
      bytes memory solution = abi.encodePacked('solution', i);
      bytes32 salt = keccak256(abi.encodePacked('salt', i));
      bytes32 commitHash = createCommitHash(contestId, solver, solution, salt);

      vm.prank(solver);
      contest.commitSolution{ value: ENTRY_DEPOSIT }(contestId, commitHash);
    }

    vm.roll(releaseBlock + 1 + COMMIT_BUFFER + 1); // +1 for randomness capture block

    // Reveal in order
    for (uint256 i = 0; i < 3; i++) {
      address solver = i == 0 ? solver1 : (i == 1 ? solver2 : solver3);
      bytes memory solution = abi.encodePacked('solution', i);
      bytes32 salt = keccak256(abi.encodePacked('salt', i));

      vm.prank(solver);
      contest.revealSolution(contestId, solution, salt);
    }

    FirstBloodContest.Winner[] memory winners = contest.getWinners(contestId);
    assertEq(winners.length, 3);
    assertEq(winners[0].solver, solver1);
    assertEq(winners[0].rank, 1);
    assertEq(winners[1].solver, solver2);
    assertEq(winners[1].rank, 2);
    assertEq(winners[2].solver, solver3);
    assertEq(winners[2].rank, 3);

    // Contest should be closed
    (, FirstBloodContest.ContestStateData memory state) = contest.getContest(contestId);
    assertEq(uint256(state.state), uint256(FirstBloodContest.ContestState.Closed));
  }

  function test_RevealSolution_InvalidSolutionForfeitsDeposit() public {
    uint256 releaseBlock = block.number + 5;
    FirstBloodContest.ContestParams memory params = createContestParams(releaseBlock);
    params.sponsor = sponsor;

    vm.prank(sponsor);
    uint256 contestId = contest.scheduleContest{ value: PRIZE_POOL }(params);

    advanceAndCaptureRandomness(contestId, releaseBlock);

    // Commit with empty solution (will fail validation)
    bytes memory solution = '';
    bytes32 salt = keccak256('salt');
    bytes32 commitHash = createCommitHash(contestId, solver1, solution, salt);

    vm.prank(solver1);
    contest.commitSolution{ value: ENTRY_DEPOSIT }(contestId, commitHash);

    vm.roll(releaseBlock + 1 + COMMIT_BUFFER + 1); // +1 for randomness capture block

    uint256 contractBalanceBefore = address(contest).balance;
    // Balance already includes prize pool + deposit from commit

    vm.prank(solver1);
    vm.expectEmit(true, true, false, true);
    emit FirstBloodContest.SolutionRevealed(contestId, solver1, 0, 0, false);

    contest.revealSolution(contestId, solution, salt);

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
    uint256 contestId = contest.scheduleContest{ value: PRIZE_POOL }(params);

    advanceAndCaptureRandomness(contestId, releaseBlock);

    // Commit and reveal 2 solutions
    for (uint256 i = 0; i < 2; i++) {
      address solver = i == 0 ? solver1 : solver2;
      bytes memory solution = abi.encodePacked('solution', i);
      bytes32 salt = keccak256(abi.encodePacked('salt', i));
      bytes32 commitHash = createCommitHash(contestId, solver, solution, salt);

      vm.prank(solver);
      contest.commitSolution{ value: ENTRY_DEPOSIT }(contestId, commitHash);
    }

    vm.roll(releaseBlock + 1 + COMMIT_BUFFER + 1); // +1 for randomness capture block

    // Reveal both - contest should auto-close
    for (uint256 i = 0; i < 2; i++) {
      address solver = i == 0 ? solver1 : solver2;
      bytes memory solution = abi.encodePacked('solution', i);
      bytes32 salt = keccak256(abi.encodePacked('salt', i));

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
    uint256 contestId = contest.scheduleContest{ value: PRIZE_POOL }(params);

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
    uint256 contestId = contest.scheduleContest{ value: PRIZE_POOL }(params);

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
    uint256 contestId = contest.scheduleContest{ value: PRIZE_POOL }(params);

    advanceAndCaptureRandomness(contestId, releaseBlock);

    // Only reveal 1 solution (should leave remaining prize)
    bytes memory solution = 'solution';
    bytes32 salt = keccak256('salt');
    bytes32 commitHash = createCommitHash(contestId, solver1, solution, salt);

    vm.prank(solver1);
    contest.commitSolution{ value: ENTRY_DEPOSIT }(contestId, commitHash);

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
    uint256 contestId = contest.scheduleContest{ value: PRIZE_POOL }(params);

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
    uint256 contestId = contest.scheduleContest{ value: PRIZE_POOL }(params);

    (, FirstBloodContest.ContestStateData memory state) = contest.getContest(contestId);
    vm.prank(sponsor);
    vm.expectRevert(abi.encodeWithSelector(FirstBloodContest.ContestNotClosed.selector, contestId, state.state));
    contest.withdrawRemainingPrize(contestId);
  }
}

