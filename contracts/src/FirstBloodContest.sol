// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title FirstBloodContest
/// @notice Single contract managing all contests keyed by contestId
contract FirstBloodContest {
  // ============ Types ============

  enum ContestState {
    Scheduled,
    RandomnessPending,
    CommitOpen,
    RevealOpen,
    Closed,
    Finalized
  }

  struct ContestParams {
    string generatorCodeCid; // Auto Drive CID
    string engineVersion; // Semver string
    uint8 size; // Board dimension (5-10)
    uint256 releaseBlock;
    uint256 commitWindow; // Duration in blocks
    uint256 commitBuffer; // Duration in blocks (commits-only period)
    uint256 revealWindow; // Duration in blocks
    uint8 topN; // Number of winners
    uint256 entryDepositWei; // 0 = no deposit required
    uint256 prizePoolWei;
    address sponsor; // Prize pool depositor
  }

  struct ContestStateData {
    ContestState state;
    bytes32 globalSeed; // Derived from blockhash(releaseBlock) for MVP, Autonomys Proof of Time or Chainlink VRFfor production
    bytes32 puzzleHash; // keccak256(regionMap) for verification
    uint256 randomnessCapturedAt; // Block number when seed was captured
    uint256 commitWindowEndsAt; // Block number
    uint256 revealWindowEndsAt; // Block number
    uint8 winnerCount; // Current number of valid reveals
    uint256 remainingPrizeWei;
    uint256 forfeitedDepositsWei;
  }

  struct Commitment {
    bytes32 commitHash;
    uint256 committedAt; // Block number
    uint256 depositPaid;
  }

  struct Winner {
    address solver;
    uint256 rewardWei;
    uint256 revealedAt; // Block number
    uint8 rank; // 1-indexed
  }

  // ============ Storage ============

  mapping(uint256 => ContestParams) public contests;
  mapping(uint256 => ContestStateData) public contestStates;
  mapping(uint256 => mapping(address => Commitment)) public commits; // contestId => solver => commitment
  mapping(uint256 => Winner[]) public winners; // contestId => ordered winners
  mapping(uint256 => mapping(address => bool)) public hasRevealed; // contestId => solver => revealed

  uint256 public nextContestId;

  // ============ Events ============

  event ContestScheduled(
    uint256 indexed contestId,
    string generatorCodeCid,
    string engineVersion,
    uint256 releaseBlock,
    uint256 commitWindow,
    uint256 revealWindow,
    uint8 topN,
    uint256 entryDepositWei
  );

  event RandomnessCaptured(uint256 indexed contestId, bytes32 globalSeedSource);

  event PuzzlePublished(uint256 indexed contestId, bytes32 puzzleHash, string regionMapCid);

  event SolutionCommitted(uint256 indexed contestId, address indexed solver, bytes32 commitHash);

  event SolutionRevealed(
    uint256 indexed contestId,
    address indexed solver,
    uint8 rank,
    uint256 rewardWei,
    bool isValid
  );

  event ContestClosed(
    uint256 indexed contestId,
    uint8 totalWinners,
    uint256 prizeRemaining,
    uint256 forfeitedDeposits
  );

  event PrizeWithdrawn(uint256 indexed contestId, address indexed solver, uint256 amount);

  // ============ Modifiers ============

  modifier onlySponsor(uint256 contestId) {
    require(contests[contestId].sponsor == msg.sender, 'FirstBloodContest: not sponsor');
    _;
  }

  // ============ Core Functions ============

  /// @notice Schedule a new contest
  /// @param params Contest parameters
  /// @return contestId The ID of the newly scheduled contest
  function scheduleContest(ContestParams memory params) external payable returns (uint256 contestId) {
    require(params.prizePoolWei > 0, 'FirstBloodContest: prize pool required');
    require(msg.value >= params.prizePoolWei, 'FirstBloodContest: insufficient prize deposit');
    require(params.size >= 5 && params.size <= 10, 'FirstBloodContest: invalid size');
    require(params.topN > 0, 'FirstBloodContest: topN must be > 0');
    require(params.releaseBlock > block.number, 'FirstBloodContest: releaseBlock must be future');

    contestId = nextContestId++;
    contests[contestId] = params;
    contestStates[contestId] = ContestStateData({
      state: ContestState.Scheduled,
      globalSeed: bytes32(0),
      puzzleHash: bytes32(0),
      randomnessCapturedAt: 0,
      commitWindowEndsAt: 0,
      revealWindowEndsAt: 0,
      winnerCount: 0,
      remainingPrizeWei: params.prizePoolWei,
      forfeitedDepositsWei: 0
    });

    emit ContestScheduled(
      contestId,
      params.generatorCodeCid,
      params.engineVersion,
      params.releaseBlock,
      params.commitWindow,
      params.revealWindow,
      params.topN,
      params.entryDepositWei
    );
  }

  /// @notice Capture randomness at releaseBlock (MVP: derive from blockhash)
  /// @dev TODO: Replace with Autonomys Proof of Time randomness provider
  function captureRandomness(uint256 contestId) external {
    ContestStateData storage state = contestStates[contestId];
    ContestParams memory params = contests[contestId];

    require(state.state == ContestState.Scheduled, 'FirstBloodContest: not scheduled');
    require(block.number >= params.releaseBlock, 'FirstBloodContest: releaseBlock not reached');

    // MVP: derive seed from blockhash
    // TODO: Replace with Autonomys Proof of Time randomness
    bytes32 seedSource = blockhash(params.releaseBlock);
    require(seedSource != bytes32(0), 'FirstBloodContest: blockhash unavailable');

    state.globalSeed = keccak256(abi.encodePacked(seedSource, contestId));
    state.randomnessCapturedAt = block.number;
    state.commitWindowEndsAt = block.number + params.commitWindow;
    state.revealWindowEndsAt = state.commitWindowEndsAt + params.revealWindow;
    state.state = ContestState.CommitOpen;

    emit RandomnessCaptured(contestId, seedSource);
  }

  /// @notice Commit a solution hash
  function commitSolution(uint256 contestId, bytes32 commitHash) external payable {
    ContestStateData storage state = contestStates[contestId];
    ContestParams memory params = contests[contestId];

    require(
      state.state == ContestState.CommitOpen || state.state == ContestState.RevealOpen,
      'FirstBloodContest: commits not open'
    );
    require(block.number < state.commitWindowEndsAt, 'FirstBloodContest: commit window closed');
    require(commits[contestId][msg.sender].commitHash == bytes32(0), 'FirstBloodContest: already committed');

    if (params.entryDepositWei > 0) {
      require(msg.value == params.entryDepositWei, 'FirstBloodContest: incorrect deposit');
    }

    commits[contestId][msg.sender] = Commitment({
      commitHash: commitHash,
      committedAt: block.number,
      depositPaid: msg.value
    });

    emit SolutionCommitted(contestId, msg.sender, commitHash);
  }

  /// @notice Reveal a solution
  /// @param contestId Contest ID
  /// @param encodedSolution Base64 JSON encoded solution (column array)
  /// @param salt Salt used in commit hash
  function revealSolution(uint256 contestId, bytes memory encodedSolution, bytes32 salt) external {
    ContestStateData storage state = contestStates[contestId];
    ContestParams memory params = contests[contestId];
    Commitment memory commitment = commits[contestId][msg.sender];

    require(commitment.commitHash != bytes32(0), 'FirstBloodContest: no commitment found');
    require(!hasRevealed[contestId][msg.sender], 'FirstBloodContest: already revealed');
    require(
      state.state == ContestState.RevealOpen || state.state == ContestState.CommitOpen,
      'FirstBloodContest: reveals not open'
    );

    // Check commit buffer: reveals only allowed after buffer period
    uint256 bufferEndsAt = state.randomnessCapturedAt + params.commitBuffer;
    require(block.number >= bufferEndsAt, 'FirstBloodContest: commit buffer active');

    // Verify commit hash
    bytes32 solutionHash = keccak256(encodedSolution);
    bytes32 expectedCommit = keccak256(abi.encodePacked(contestId, msg.sender, solutionHash, salt));
    require(expectedCommit == commitment.commitHash, 'FirstBloodContest: commit mismatch');

    // TODO: Decode encodedSolution and validate board
    // For now, stub validation
    bool isValid = _validateSolution(contestId, encodedSolution);

    hasRevealed[contestId][msg.sender] = true;

    if (isValid && state.winnerCount < params.topN) {
      // Winner!
      state.winnerCount++;
      uint8 rank = state.winnerCount;

      // Calculate reward (flat split for MVP)
      uint256 rewardWei = params.prizePoolWei / params.topN;
      state.remainingPrizeWei -= rewardWei;

      winners[contestId].push(Winner({ solver: msg.sender, rewardWei: rewardWei, revealedAt: block.number, rank: rank }));

      // Transfer reward immediately
      (bool success,) = payable(msg.sender).call{ value: rewardWei }('');
      require(success, 'FirstBloodContest: reward transfer failed');

      // Refund deposit if any
      if (commitment.depositPaid > 0) {
        (success,) = payable(msg.sender).call{ value: commitment.depositPaid }('');
        require(success, 'FirstBloodContest: deposit refund failed');
      }

      emit SolutionRevealed(contestId, msg.sender, rank, rewardWei, true);

      // Check if contest should close (all winners found)
      if (state.winnerCount >= params.topN) {
        _closeContest(contestId);
      }
    } else {
      // Invalid solution or contest full
      if (commitment.depositPaid > 0) {
        state.forfeitedDepositsWei += commitment.depositPaid;
      }
      emit SolutionRevealed(contestId, msg.sender, 0, 0, false);
    }
  }

  /// @notice Close contest (called automatically when topN reached or window expires)
  function closeContest(uint256 contestId) external {
    ContestStateData storage state = contestStates[contestId];
    require(state.state != ContestState.Closed && state.state != ContestState.Finalized, 'FirstBloodContest: already closed');

    bool shouldClose = false;
    if (state.winnerCount >= contests[contestId].topN) {
      shouldClose = true;
    } else if (block.number >= state.revealWindowEndsAt) {
      shouldClose = true;
    }

    require(shouldClose, 'FirstBloodContest: contest not ready to close');
    _closeContest(contestId);
  }

  /// @notice Sponsor can withdraw remaining prize after contest closes
  function withdrawRemainingPrize(uint256 contestId) external onlySponsor(contestId) {
    ContestStateData storage state = contestStates[contestId];
    require(state.state == ContestState.Closed, 'FirstBloodContest: contest not closed');

    uint256 amount = state.remainingPrizeWei;
    require(amount > 0, 'FirstBloodContest: no remaining prize');

    state.remainingPrizeWei = 0;
    (bool success,) = payable(contests[contestId].sponsor).call{ value: amount }('');
    require(success, 'FirstBloodContest: withdrawal failed');

    emit PrizeWithdrawn(contestId, contests[contestId].sponsor, amount);
  }

  // ============ Internal Functions ============

  function _closeContest(uint256 contestId) internal {
    ContestStateData storage state = contestStates[contestId];
    state.state = ContestState.Closed;

    emit ContestClosed(contestId, state.winnerCount, state.remainingPrizeWei, state.forfeitedDepositsWei);
  }

  /// @notice Validate solution (stub - TODO: implement full validation)
  function _validateSolution(uint256 /* contestId */, bytes memory encodedSolution) internal pure returns (bool) {
    // TODO: Decode base64 JSON, validate board constraints
    // For MVP, accept any non-empty solution
    return encodedSolution.length > 0;
  }

  // ============ View Functions ============

  function getContest(uint256 contestId) external view returns (ContestParams memory, ContestStateData memory) {
    return (contests[contestId], contestStates[contestId]);
  }

  function getWinners(uint256 contestId) external view returns (Winner[] memory) {
    return winners[contestId];
  }

  function getCommitment(uint256 contestId, address solver) external view returns (Commitment memory) {
    return commits[contestId][solver];
  }
}

