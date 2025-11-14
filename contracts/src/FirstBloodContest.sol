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

  // ============ Errors ============

  error NotSponsor(uint256 contestId, address caller);
  error PrizePoolRequired();
  error InsufficientPrizeDeposit(uint256 required, uint256 provided);
  error InvalidSize(uint8 size);
  error TopNMustBeGreaterThanZero();
  error ReleaseBlockMustBeFuture(uint256 releaseBlock, uint256 currentBlock);
  error NotScheduled(uint256 contestId);
  error ReleaseBlockNotReached(uint256 releaseBlock, uint256 currentBlock);
  error BlockhashUnavailable(uint256 blockNumber);
  error CommitsNotOpen(uint256 contestId, ContestState state);
  error CommitWindowClosed(uint256 contestId, uint256 currentBlock, uint256 windowEndsAt);
  error AlreadyCommitted(uint256 contestId, address solver);
  error IncorrectDeposit(uint256 required, uint256 provided);
  error NoCommitmentFound(uint256 contestId, address solver);
  error AlreadyRevealed(uint256 contestId, address solver);
  error RevealsNotOpen(uint256 contestId, ContestState state);
  error CommitBufferActive(uint256 contestId, uint256 currentBlock, uint256 bufferEndsAt);
  error CommitMismatch(uint256 contestId, address solver);
  error RewardTransferFailed(address recipient, uint256 amount);
  error DepositRefundFailed(address recipient, uint256 amount);
  error AlreadyClosed(uint256 contestId);
  error ContestNotReadyToClose(uint256 contestId, uint8 winnerCount, uint8 topN, uint256 currentBlock, uint256 revealWindowEndsAt);
  error ContestNotClosed(uint256 contestId, ContestState state);
  error NoRemainingPrize(uint256 contestId);
  error WithdrawalFailed(address recipient, uint256 amount);

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
    if (contests[contestId].sponsor != msg.sender) {
      revert NotSponsor(contestId, msg.sender);
    }
    _;
  }

  // ============ Core Functions ============

  /// @notice Schedule a new contest
  /// @param params Contest parameters
  /// @return contestId The ID of the newly scheduled contest
  function scheduleContest(ContestParams memory params) external payable returns (uint256 contestId) {
    if (params.prizePoolWei == 0) revert PrizePoolRequired();
    if (msg.value < params.prizePoolWei) revert InsufficientPrizeDeposit(params.prizePoolWei, msg.value);
    if (params.size < 5 || params.size > 10) revert InvalidSize(params.size);
    if (params.topN == 0) revert TopNMustBeGreaterThanZero();
    if (params.releaseBlock <= block.number) revert ReleaseBlockMustBeFuture(params.releaseBlock, block.number);

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

    if (state.state != ContestState.Scheduled) revert NotScheduled(contestId);
    if (block.number < params.releaseBlock) revert ReleaseBlockNotReached(params.releaseBlock, block.number);

    // MVP: derive seed from blockhash
    // TODO: Replace with Autonomys Proof of Time randomness
    bytes32 seedSource = blockhash(params.releaseBlock);
    if (seedSource == bytes32(0)) revert BlockhashUnavailable(params.releaseBlock);

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

    if (state.state != ContestState.CommitOpen && state.state != ContestState.RevealOpen) {
      revert CommitsNotOpen(contestId, state.state);
    }
    if (block.number >= state.commitWindowEndsAt) {
      revert CommitWindowClosed(contestId, block.number, state.commitWindowEndsAt);
    }
    if (commits[contestId][msg.sender].commitHash != bytes32(0)) {
      revert AlreadyCommitted(contestId, msg.sender);
    }

    if (params.entryDepositWei > 0) {
      if (msg.value != params.entryDepositWei) revert IncorrectDeposit(params.entryDepositWei, msg.value);
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

    if (commitment.commitHash == bytes32(0)) revert NoCommitmentFound(contestId, msg.sender);
    if (hasRevealed[contestId][msg.sender]) revert AlreadyRevealed(contestId, msg.sender);
    if (state.state != ContestState.RevealOpen && state.state != ContestState.CommitOpen) {
      revert RevealsNotOpen(contestId, state.state);
    }

    // Check commit buffer: reveals only allowed after buffer period
    uint256 bufferEndsAt = state.randomnessCapturedAt + params.commitBuffer;
    if (block.number < bufferEndsAt) revert CommitBufferActive(contestId, block.number, bufferEndsAt);

    // Verify commit hash
    bytes32 solutionHash = keccak256(encodedSolution);
    bytes32 expectedCommit = keccak256(abi.encodePacked(contestId, msg.sender, solutionHash, salt));
    if (expectedCommit != commitment.commitHash) revert CommitMismatch(contestId, msg.sender);

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
      if (!success) revert RewardTransferFailed(msg.sender, rewardWei);

      // Refund deposit if any
      if (commitment.depositPaid > 0) {
        (success,) = payable(msg.sender).call{ value: commitment.depositPaid }('');
        if (!success) revert DepositRefundFailed(msg.sender, commitment.depositPaid);
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
    if (state.state == ContestState.Closed || state.state == ContestState.Finalized) {
      revert AlreadyClosed(contestId);
    }

    bool shouldClose = false;
    if (state.winnerCount >= contests[contestId].topN) {
      shouldClose = true;
    } else if (block.number >= state.revealWindowEndsAt) {
      shouldClose = true;
    }

    if (!shouldClose) {
      revert ContestNotReadyToClose(
        contestId,
        state.winnerCount,
        contests[contestId].topN,
        block.number,
        state.revealWindowEndsAt
      );
    }
    _closeContest(contestId);
  }

  /// @notice Sponsor can withdraw remaining prize after contest closes
  function withdrawRemainingPrize(uint256 contestId) external onlySponsor(contestId) {
    ContestStateData storage state = contestStates[contestId];
    if (state.state != ContestState.Closed) revert ContestNotClosed(contestId, state.state);

    uint256 amount = state.remainingPrizeWei;
    if (amount == 0) revert NoRemainingPrize(contestId);

    state.remainingPrizeWei = 0;
    (bool success,) = payable(contests[contestId].sponsor).call{ value: amount }('');
    if (!success) revert WithdrawalFailed(contests[contestId].sponsor, amount);

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

