// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {ReentrancyGuard} from "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

/// @title FirstBloodContest
/// @notice Single contract managing all contests keyed by contestId
contract FirstBloodContest is ReentrancyGuard, VRFConsumerBaseV2Plus {
    // ============ Types ============

    enum ContestState {
        Scheduled,
        RandomnessPending,
        CommitOpen,
        RevealOpen,
        Closed,
        Finalized,
        Cancelled
    }

    enum CancelReason {
        PuzzleNotPublished
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
        uint256 puzzlePublishDeadline; // Block number deadline for puzzle publication
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
    mapping(uint256 => bytes) public regionMaps; // contestId => packed region IDs (1 byte per cell)

    uint256 public nextContestId;

    // ============ Constants ============

    /// @notice Blocks after VRF fulfillment for sponsor to publish puzzle
    uint256 public constant PUZZLE_PUBLISH_WINDOW = 100;

    // ============ VRF Configuration ============

    /// @notice Chainlink VRF subscription ID
    uint256 public s_subscriptionId;

    /// @notice Key hash for VRF (gas lane)
    bytes32 public s_keyHash;

    /// @notice Callback gas limit for VRF fulfillment
    uint32 public s_callbackGasLimit;

    /// @notice Number of confirmations before VRF response
    uint16 public s_requestConfirmations;

    /// @notice Mapping from VRF requestId to contestId
    /// @dev Stores contestId + 1 so that 0 can be used as a sentinel for "not set" without conflicting with contest ID 0
    mapping(uint256 => uint256) public s_vrfRequestToContest;

    // ============ Errors ============

    error NotSponsor(uint256 contestId, address caller);
    error PrizePoolRequired();
    error PrizeFundingMismatch(uint256 required, uint256 provided);
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
    error ContestNotReadyToClose(
        uint256 contestId, uint8 winnerCount, uint8 topN, uint256 currentBlock, uint256 revealWindowEndsAt
    );
    error ContestNotClosed(uint256 contestId, ContestState state);
    error NoRemainingPrize(uint256 contestId);
    error WithdrawalFailed(address recipient, uint256 amount);
    error VRFRequestNotFound(uint256 requestId);
    error ContestNotRandomnessPending(uint256 contestId, ContestState state);
    error PuzzleAlreadyPublished(uint256 contestId);
    error PuzzlePublishDeadlinePassed(uint256 contestId, uint256 deadline);
    error InvalidRegionMapLength(uint256 actual, uint256 expected);
    error InvalidRegionId(uint256 index, uint8 regionId, uint8 maxRegion);
    error PuzzleNotPublished(uint256 contestId);
    error PuzzlePublishDeadlineNotPassed(uint256 contestId, uint256 deadline);
    error ContestNotCancelled(uint256 contestId);
    error NoDepositToRefund(uint256 contestId, address solver);
    error InvalidSolutionLength(uint256 actual, uint256 expected);

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

    event RandomnessRequested(uint256 indexed contestId, uint256 indexed vrfRequestId);
    event RandomnessFulfilled(uint256 indexed contestId, uint256 indexed vrfRequestId, bytes32 globalSeed);

    event PuzzlePublished(uint256 indexed contestId, bytes32 puzzleHash, string regionMapCid);

    event SolutionCommitted(uint256 indexed contestId, address indexed solver, bytes32 commitHash);

    event SolutionRevealed(
        uint256 indexed contestId, address indexed solver, uint8 rank, uint256 rewardWei, bool isValid
    );

    event ContestClosed(
        uint256 indexed contestId, uint8 totalWinners, uint256 prizeRemaining, uint256 forfeitedDeposits
    );

    event PrizeWithdrawn(uint256 indexed contestId, address indexed solver, uint256 amount);

    event ContestCancelled(uint256 indexed contestId, CancelReason reason);

    event DepositRefunded(uint256 indexed contestId, address indexed solver, uint256 amount);

    // ============ Modifiers ============

    modifier onlySponsor(uint256 contestId) {
        if (contests[contestId].sponsor != msg.sender) {
            revert NotSponsor(contestId, msg.sender);
        }
        _;
    }

    // ============ Constructor ============

    /// @notice Initialize the contract with VRF configuration
    /// @param vrfCoordinator Address of the VRF Coordinator
    /// @param subscriptionId VRF subscription ID
    /// @param keyHash VRF key hash (gas lane)
    /// @param callbackGasLimit Gas limit for VRF callback
    /// @param requestConfirmations Number of confirmations for VRF
    constructor(
        address vrfCoordinator,
        uint256 subscriptionId,
        bytes32 keyHash,
        uint32 callbackGasLimit,
        uint16 requestConfirmations
    ) VRFConsumerBaseV2Plus(vrfCoordinator) {
        s_subscriptionId = subscriptionId;
        s_keyHash = keyHash;
        s_callbackGasLimit = callbackGasLimit;
        s_requestConfirmations = requestConfirmations;
    }

    // ============ Admin Functions ============

    /// @notice Update the callback gas limit for VRF fulfillment
    /// @param newLimit New gas limit value
    function setCallbackGasLimit(uint32 newLimit) external onlyOwner {
        s_callbackGasLimit = newLimit;
    }

    // ============ Core Functions ============

    /// @notice Schedule a new contest
    /// @param params Contest parameters
    /// @return contestId The ID of the newly scheduled contest
    function scheduleContest(ContestParams memory params) external payable returns (uint256 contestId) {
        if (params.prizePoolWei == 0) revert PrizePoolRequired();
        if (msg.value != params.prizePoolWei) revert PrizeFundingMismatch(params.prizePoolWei, msg.value);
        if (params.size < 5 || params.size > 10) revert InvalidSize(params.size);
        if (params.topN == 0) revert TopNMustBeGreaterThanZero();
        if (params.releaseBlock <= block.number) revert ReleaseBlockMustBeFuture(params.releaseBlock, block.number);
        params.sponsor = msg.sender;

        contestId = nextContestId++;
        contests[contestId] = params;
        contestStates[contestId] = ContestStateData({
            state: ContestState.Scheduled,
            globalSeed: bytes32(0),
            puzzleHash: bytes32(0),
            randomnessCapturedAt: 0,
            commitWindowEndsAt: 0,
            revealWindowEndsAt: 0,
            puzzlePublishDeadline: 0,
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

    /// @notice Request randomness from Chainlink VRF
    /// @dev Call this after releaseBlock to initiate VRF request
    /// @param contestId The contest to request randomness for
    /// @return requestId The VRF request ID
    function requestRandomness(uint256 contestId) external returns (uint256 requestId) {
        ContestStateData storage state = contestStates[contestId];
        ContestParams memory params = contests[contestId];

        if (state.state != ContestState.Scheduled) revert NotScheduled(contestId);
        if (block.number < params.releaseBlock) revert ReleaseBlockNotReached(params.releaseBlock, block.number);

        // Transition to RandomnessPending
        state.state = ContestState.RandomnessPending;

        // Request randomness from Chainlink VRF
        VRFV2PlusClient.RandomWordsRequest memory request = VRFV2PlusClient.RandomWordsRequest({
            keyHash: s_keyHash,
            subId: s_subscriptionId,
            requestConfirmations: s_requestConfirmations,
            callbackGasLimit: s_callbackGasLimit,
            numWords: 1,
            extraArgs: VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: false}))
        });

        requestId = s_vrfCoordinator.requestRandomWords(request);
        s_vrfRequestToContest[requestId] = contestId + 1; // Store contestId + 1 so 0 means "not set"

        emit RandomnessRequested(contestId, requestId);
    }

    /// @notice Callback from Chainlink VRF with random words
    /// @dev Only callable by the VRF Coordinator
    /// @param requestId The VRF request ID
    /// @param randomWords Array of random words (we only use the first one)
    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        uint256 storedValue = s_vrfRequestToContest[requestId];
        if (storedValue == 0) {
            revert VRFRequestNotFound(requestId);
        }
        uint256 contestId = storedValue - 1; // Retrieve actual contestId

        ContestStateData storage state = contestStates[contestId];

        if (state.state != ContestState.RandomnessPending) {
            revert ContestNotRandomnessPending(contestId, state.state);
        }

        // Only read the specific fields needed to avoid loading entire struct (including strings) to memory
        // This significantly reduces gas consumption for the VRF callback
        uint256 commitWindow = contests[contestId].commitWindow;
        uint256 revealWindow = contests[contestId].revealWindow;

        // Use the random word to derive the global seed
        bytes32 globalSeed = keccak256(abi.encodePacked(randomWords[0], contestId));

        state.globalSeed = globalSeed;
        state.randomnessCapturedAt = block.number;
        state.commitWindowEndsAt = block.number + commitWindow;
        state.revealWindowEndsAt = state.commitWindowEndsAt + revealWindow;
        state.puzzlePublishDeadline = block.number + PUZZLE_PUBLISH_WINDOW;
        state.state = ContestState.CommitOpen;

        emit RandomnessFulfilled(contestId, requestId, globalSeed);
    }

    /// @notice Sponsor publishes the puzzle region map after VRF fulfillment
    /// @param contestId The contest ID
    /// @param regionMap Packed region IDs (1 byte per cell, row-major order)
    /// @param regionMapCid IPFS CID for off-chain retrieval (optional, for frontend)
    function publishPuzzle(uint256 contestId, bytes calldata regionMap, string calldata regionMapCid)
        external
        onlySponsor(contestId)
    {
        ContestStateData storage state = contestStates[contestId];
        ContestParams storage params = contests[contestId];

        // Must be in CommitOpen state (after VRF fulfilled)
        if (state.state != ContestState.CommitOpen) {
            revert CommitsNotOpen(contestId, state.state);
        }

        // Puzzle not already published
        if (state.puzzleHash != bytes32(0)) {
            revert PuzzleAlreadyPublished(contestId);
        }

        // Within deadline
        if (block.number > state.puzzlePublishDeadline) {
            revert PuzzlePublishDeadlinePassed(contestId, state.puzzlePublishDeadline);
        }

        // Validate region map length
        uint256 expectedLength = uint256(params.size) * uint256(params.size);
        if (regionMap.length != expectedLength) {
            revert InvalidRegionMapLength(regionMap.length, expectedLength);
        }

        // Validate region IDs are in range [0, size-1]
        for (uint256 i = 0; i < regionMap.length; i++) {
            if (uint8(regionMap[i]) >= params.size) {
                revert InvalidRegionId(i, uint8(regionMap[i]), params.size);
            }
        }

        // Store puzzle
        state.puzzleHash = keccak256(regionMap);
        regionMaps[contestId] = regionMap;

        emit PuzzlePublished(contestId, state.puzzleHash, regionMapCid);
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

        // Require puzzle to be published before commits
        if (state.puzzleHash == bytes32(0)) {
            revert PuzzleNotPublished(contestId);
        }

        if (params.entryDepositWei > 0) {
            if (msg.value != params.entryDepositWei) revert IncorrectDeposit(params.entryDepositWei, msg.value);
        }

        commits[contestId][msg.sender] =
            Commitment({commitHash: commitHash, committedAt: block.number, depositPaid: msg.value});

        emit SolutionCommitted(contestId, msg.sender, commitHash);
    }

    /// @notice Reveal a solution
    /// @param contestId Contest ID
    /// @param solution Packed column indices (1 byte per row)
    /// @param salt Salt used in commit hash
    function revealSolution(uint256 contestId, bytes calldata solution, bytes32 salt) external nonReentrant {
        ContestStateData storage state = contestStates[contestId];
        Commitment memory commitment = commits[contestId][msg.sender];

        if (commitment.commitHash == bytes32(0)) revert NoCommitmentFound(contestId, msg.sender);
        if (hasRevealed[contestId][msg.sender]) revert AlreadyRevealed(contestId, msg.sender);
        if (state.state != ContestState.RevealOpen && state.state != ContestState.CommitOpen) {
            revert RevealsNotOpen(contestId, state.state);
        }

        // Check commit buffer: reveals only allowed after buffer period
        {
            uint256 bufferEndsAt = state.randomnessCapturedAt + contests[contestId].commitBuffer;
            if (block.number < bufferEndsAt) revert CommitBufferActive(contestId, block.number, bufferEndsAt);
        }

        // Verify commit hash (updated for packed bytes solution format)
        {
            bytes32 expectedCommit = keccak256(abi.encodePacked(contestId, msg.sender, keccak256(solution), salt));
            if (expectedCommit != commitment.commitHash) revert CommitMismatch(contestId, msg.sender);
        }

        // Validate solution against puzzle
        bool isValid = _validateSolution(contests[contestId].size, solution, regionMaps[contestId]);

        hasRevealed[contestId][msg.sender] = true;

        if (isValid && state.winnerCount < contests[contestId].topN) {
            _processWinner(contestId, state, commitment.depositPaid);
        } else {
            // Invalid solution or contest full
            if (commitment.depositPaid > 0) {
                state.forfeitedDepositsWei += commitment.depositPaid;
            }
            emit SolutionRevealed(contestId, msg.sender, 0, 0, false);
        }
    }

    /// @notice Process a winning reveal
    function _processWinner(uint256 contestId, ContestStateData storage state, uint256 depositPaid) internal {
        state.winnerCount++;
        uint8 rank = state.winnerCount;

        // Calculate reward (flat split for MVP)
        uint256 rewardWei = contests[contestId].prizePoolWei / contests[contestId].topN;
        state.remainingPrizeWei -= rewardWei;

        winners[contestId].push(
            Winner({solver: msg.sender, rewardWei: rewardWei, revealedAt: block.number, rank: rank})
        );

        // Transfer reward immediately
        (bool success,) = payable(msg.sender).call{value: rewardWei}("");
        if (!success) revert RewardTransferFailed(msg.sender, rewardWei);

        // Refund deposit if any
        if (depositPaid > 0) {
            (success,) = payable(msg.sender).call{value: depositPaid}("");
            if (!success) revert DepositRefundFailed(msg.sender, depositPaid);
        }

        emit SolutionRevealed(contestId, msg.sender, rank, rewardWei, true);

        // Check if contest should close (all winners found)
        if (state.winnerCount >= contests[contestId].topN) {
            _closeContest(contestId);
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
                contestId, state.winnerCount, contests[contestId].topN, block.number, state.revealWindowEndsAt
            );
        }
        _closeContest(contestId);
    }

    /// @notice Sponsor can withdraw remaining prize after contest closes
    function withdrawRemainingPrize(uint256 contestId) external onlySponsor(contestId) nonReentrant {
        ContestStateData storage state = contestStates[contestId];
        if (state.state != ContestState.Closed) revert ContestNotClosed(contestId, state.state);

        uint256 amount = state.remainingPrizeWei;
        if (amount == 0) revert NoRemainingPrize(contestId);

        state.remainingPrizeWei = 0;
        (bool success,) = payable(contests[contestId].sponsor).call{value: amount}("");
        if (!success) revert WithdrawalFailed(contests[contestId].sponsor, amount);

        emit PrizeWithdrawn(contestId, contests[contestId].sponsor, amount);
    }

    /// @notice Cancel contest if puzzle not published within deadline
    /// @param contestId The contest ID
    function cancelUnpublishedContest(uint256 contestId) external {
        ContestStateData storage state = contestStates[contestId];

        // Must be in CommitOpen state
        if (state.state != ContestState.CommitOpen) {
            revert CommitsNotOpen(contestId, state.state);
        }

        // Puzzle must not be published
        if (state.puzzleHash != bytes32(0)) {
            revert PuzzleAlreadyPublished(contestId);
        }

        // Deadline must have passed
        if (block.number <= state.puzzlePublishDeadline) {
            revert PuzzlePublishDeadlineNotPassed(contestId, state.puzzlePublishDeadline);
        }

        // Cancel contest
        state.state = ContestState.Cancelled;

        emit ContestCancelled(contestId, CancelReason.PuzzleNotPublished);
    }

    /// @notice Refund deposit for cancelled contest
    /// @param contestId The contest ID
    function refundCancelledDeposit(uint256 contestId) external nonReentrant {
        ContestStateData storage state = contestStates[contestId];

        if (state.state != ContestState.Cancelled) {
            revert ContestNotCancelled(contestId);
        }

        Commitment storage commitment = commits[contestId][msg.sender];
        if (commitment.depositPaid == 0) {
            revert NoDepositToRefund(contestId, msg.sender);
        }

        uint256 amount = commitment.depositPaid;
        commitment.depositPaid = 0;

        (bool success,) = payable(msg.sender).call{value: amount}("");
        if (!success) revert DepositRefundFailed(msg.sender, amount);

        emit DepositRefunded(contestId, msg.sender, amount);
    }

    /// @notice Sponsor withdraws prize pool from cancelled contest
    /// @param contestId The contest ID
    function withdrawCancelledPrize(uint256 contestId) external onlySponsor(contestId) nonReentrant {
        ContestStateData storage state = contestStates[contestId];

        if (state.state != ContestState.Cancelled) {
            revert ContestNotCancelled(contestId);
        }

        uint256 amount = state.remainingPrizeWei;
        if (amount == 0) {
            revert NoRemainingPrize(contestId);
        }

        state.remainingPrizeWei = 0;

        (bool success,) = payable(msg.sender).call{value: amount}("");
        if (!success) revert WithdrawalFailed(msg.sender, amount);

        emit PrizeWithdrawn(contestId, msg.sender, amount);
    }

    // ============ Internal Functions ============

    function _closeContest(uint256 contestId) internal {
        ContestStateData storage state = contestStates[contestId];
        state.state = ContestState.Closed;

        emit ContestClosed(contestId, state.winnerCount, state.remainingPrizeWei, state.forfeitedDepositsWei);
    }

    /// @notice Validate solution against puzzle constraints
    /// @param size Board dimension (5-10)
    /// @param solution Packed bytes: solution[i] = column index for row i
    /// @param regionMap Region ID for each cell (row-major order)
    /// @return True if solution is valid
    function _validateSolution(uint8 size, bytes calldata solution, bytes storage regionMap)
        internal
        view
        returns (bool)
    {
        // Check solution length
        if (solution.length != size) return false;

        // Bitmaps for O(1) duplicate checking
        uint256 colBitmap; // tracks used columns
        uint256 regBitmap; // tracks used regions
        uint8 prevCol = 255; // sentinel for adjacency check

        for (uint8 row = 0; row < size; row++) {
            uint8 col = uint8(solution[row]);

            // Column must be in valid range
            if (col >= size) return false;

            // Column uniqueness: check and set bit
            uint256 colBit = 1 << col;
            if (colBitmap & colBit != 0) return false;
            colBitmap |= colBit;

            // Region uniqueness: check and set bit
            uint8 regId = uint8(regionMap[uint256(row) * size + col]);
            uint256 regBit = 1 << regId;
            if (regBitmap & regBit != 0) return false;
            regBitmap |= regBit;

            // Adjacency: sovereigns in consecutive rows can't be within 1 column
            if (row > 0) {
                uint8 diff = col > prevCol ? col - prevCol : prevCol - col;
                if (diff <= 1) return false;
            }
            prevCol = col;
        }

        return true;
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
