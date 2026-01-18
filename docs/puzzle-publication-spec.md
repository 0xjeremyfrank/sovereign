# Puzzle Publication Specification

How to get a verifiable puzzle on-chain for solution validation.

---

## Open Design Questions

Before implementation, these decisions need to be made:

### 1. Region Map Storage Strategy

**Option A: Store on-chain (Recommended)**
- Sponsor calls `publishPuzzle()` once, stores full region map
- ~200k gas one-time cost (100 bytes = 4 storage slots for 10x10)
- Reveals don't need to include region map
- Simpler reveal calldata

**Option B: Calldata each reveal**
- Sponsor only publishes `puzzleHash`
- Each reveal includes full region map (~1,600 gas calldata)
- Contract verifies `keccak256(regionMap) == puzzleHash`
- No storage cost, but repeated calldata

**Recommendation:** Option A — better UX for players, gas cost is sponsor's responsibility.

### 2. Who Can Publish the Puzzle?

**Option A: Sponsor only (Recommended)**
- Simple access control via `onlySponsor` modifier
- Clear accountability
- Sponsor already has skin in the game (prize pool)

**Option B: Anyone with valid region map**
- Permissionless, removes sponsor from critical path
- Requires on-chain verification that region map matches seed
- Verification is complex (would need to run puzzle generation on-chain or use fraud proofs)

**Recommendation:** Option A for MVP. Consider keeper automation in M4.

### 3. Puzzle Publication Deadline

How long does sponsor have to publish after VRF fulfillment?

| Option | Blocks | Time (~12s/block) | Tradeoff |
|--------|--------|-------------------|----------|
| Tight | 50 | ~10 minutes | Risk of missing deadline |
| Medium | 100 | ~20 minutes | Balanced |
| Relaxed | 300 | ~1 hour | Delays contest start |

**Recommendation:** 100 blocks. Sponsor should be watching for VRF fulfillment.

### 4. Failure Mode: Puzzle Not Published

What happens if sponsor doesn't publish within deadline?

**Option A: Auto-cancel, refund all (Recommended)**
- Contest transitions to `Cancelled` state
- All committed deposits refunded
- Prize pool returned to sponsor
- Clean failure mode

**Option B: Allow late publication**
- Sponsor can still publish after deadline
- But players who committed may have left
- Messy UX

**Option C: Slash sponsor stake**
- Require sponsor bond at contest creation
- Forfeit bond if puzzle not published
- Adds complexity

**Recommendation:** Option A for MVP. Simple and fair.

### 5. Puzzle Verification (Off-chain Challenge)

Should there be a mechanism to challenge an invalid puzzle?

**Context:** Sponsor could theoretically publish a region map that doesn't match the deterministic generation from the seed. Players would notice (they generate locally), but there's no on-chain enforcement.

**Options:**
- **No enforcement:** Trust social layer. Sponsor's reputation at stake.
- **Challenge period:** Anyone can call `challengePuzzle()` with proof of mismatch.
- **Optimistic verification:** Accept puzzle, allow challenge within N blocks.

**Recommendation:** No enforcement for MVP. Puzzle generation is deterministic — anyone can verify off-chain. A cheating sponsor would be immediately obvious and lose reputation.

### 6. State Transition: When Do Commits Open?

Currently: Commits open immediately after VRF fulfillment.

**Problem:** If puzzle isn't published yet, players can't actually solve it (they need the region map to verify their solution locally before committing).

**Options:**
- **A: Keep current flow** — Players wait for `PuzzlePublished` event before committing
- **B: New state** — Add `PuzzlePublished` state between `CommitOpen` and actual commits
- **C: Block commits until puzzle published** — Require `puzzleHash != 0` in `commitSolution()`

**Recommendation:** Option C — minimal change, enforces correct ordering.

---

## Background

### Current State

The `FirstBloodContest` contract has:
- VRF integration providing `globalSeed` after `requestRandomness()`
- `puzzleHash` field in `ContestStateData` (never set)
- `_validateSolution()` stub accepting any non-empty bytes

### Problem

The contract cannot verify that a revealed solution is correct because:
1. Puzzle (region map) is generated off-chain from the seed
2. Contract only has the seed, not the region map
3. On-chain puzzle generation is too expensive

### Constraint

Puzzle generation is computationally intensive:
- Backtracking with uniqueness checking
- Hill-climbing optimization for logic-solvability
- 5x5: ~7ms, 10x10: ~330ms off-chain
- Would exceed block gas limit on-chain

---

## Workflow Options Considered

### Option A: Sponsor Publishes Region Map ✓ Recommended

Sponsor generates puzzle off-chain after VRF, publishes to contract.

**Pros:** Trustless validation, instant payouts, low gas per reveal
**Cons:** Requires sponsor action, needs timeout fallback

### Option B: Player Submits Region Map

Each reveal includes full region map in calldata.

**Problem:** Still needs puzzle hash from somewhere (sponsor or on-chain).

### Option C: On-Chain Puzzle Generation

Contract generates puzzle from seed.

**Problem:** Exceeds gas limits for larger boards.

### Option D: Keeper Automation

Chainlink Automation publishes puzzle automatically.

**Verdict:** Good for production (M4), overkill for MVP.

---

## Specification: Sponsor-Published Puzzle

### Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           CONTEST LIFECYCLE                               │
├────────────┬─────────────┬──────────────┬─────────────┬─────────────────┤
│ Scheduled  │ Randomness  │ CommitOpen   │ RevealOpen  │ Closed          │
│            │ Pending     │              │             │                 │
├────────────┼─────────────┼──────────────┼─────────────┼─────────────────┤
│ Contest    │ VRF         │ Sponsor      │ Players     │ Winners         │
│ created    │ requested   │ publishes    │ reveal      │ paid            │
│            │             │ puzzle       │ solutions   │                 │
│            │             │              │             │                 │
│            │             │ Players      │ Contract    │                 │
│            │             │ commit       │ validates   │                 │
└────────────┴─────────────┴──────────────┴─────────────┴─────────────────┘
                                │
                                ▼
                    ┌─────────────────────┐
                    │ If puzzle not       │
                    │ published within    │
                    │ deadline → Cancel   │
                    └─────────────────────┘
```

### New Storage

```solidity
struct ContestStateData {
    // ... existing fields ...
    bytes32 puzzleHash;              // keccak256(regionMap)
    uint256 puzzlePublishDeadline;   // Block number deadline
    // Option A (store on-chain):
    bytes regionMap;                 // Packed region IDs (1 byte per cell)
}
```

### Constants

```solidity
/// @notice Blocks after VRF fulfillment for sponsor to publish puzzle
uint256 public constant PUZZLE_PUBLISH_WINDOW = 100;
```

### New Function: publishPuzzle

```solidity
/// @notice Sponsor publishes the puzzle region map after VRF fulfillment
/// @param contestId The contest ID
/// @param regionMap Packed region IDs (1 byte per cell, row-major order)
/// @param regionMapCid IPFS CID for off-chain retrieval (optional, for frontend)
function publishPuzzle(
    uint256 contestId,
    bytes calldata regionMap,
    string calldata regionMapCid
) external onlySponsor(contestId) {
    ContestStateData storage state = contestStates[contestId];
    ContestParams storage params = contests[contestId];

    // Must be in CommitOpen state (after VRF fulfilled)
    if (state.state != ContestState.CommitOpen) {
        revert WrongState(contestId, state.state);
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
    state.regionMap = regionMap;

    emit PuzzlePublished(contestId, state.puzzleHash, regionMapCid);
}
```

### Modified: fulfillRandomWords

```solidity
function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
    // ... existing logic ...

    // Set puzzle publication deadline
    state.puzzlePublishDeadline = block.number + PUZZLE_PUBLISH_WINDOW;

    // ... rest of existing logic ...
}
```

### Modified: commitSolution

```solidity
function commitSolution(uint256 contestId, bytes32 commitHash) external payable {
    ContestStateData storage state = contestStates[contestId];

    // ... existing state checks ...

    // NEW: Require puzzle to be published before commits
    if (state.puzzleHash == bytes32(0)) {
        revert PuzzleNotPublished(contestId);
    }

    // ... rest of existing logic ...
}
```

### New Function: cancelUnpublishedContest

```solidity
/// @notice Cancel contest if puzzle not published within deadline
/// @param contestId The contest ID
function cancelUnpublishedContest(uint256 contestId) external {
    ContestStateData storage state = contestStates[contestId];

    // Must be in CommitOpen state
    if (state.state != ContestState.CommitOpen) {
        revert WrongState(contestId, state.state);
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
```

### New Function: refundCancelledDeposit

```solidity
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
```

### New Function: withdrawCancelledPrize

```solidity
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
```

### Solution Validation

```solidity
/// @notice Validate solution against puzzle constraints
/// @param size Board dimension (5-10)
/// @param solution Packed bytes: solution[i] = column index for row i
/// @param regionMap Region ID for each cell (row-major order)
/// @return True if solution is valid
function _validateSolution(
    uint8 size,
    bytes calldata solution,
    bytes storage regionMap
) internal view returns (bool) {
    // Check solution length
    if (solution.length != size) return false;

    // Bitmaps for O(1) duplicate checking
    uint256 colBitmap;   // tracks used columns
    uint256 regBitmap;   // tracks used regions
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
```

### Modified: revealSolution

```solidity
/// @notice Reveal a solution
/// @param contestId Contest ID
/// @param solution Packed column indices (1 byte per row)
/// @param salt Salt used in commit hash
function revealSolution(
    uint256 contestId,
    bytes calldata solution,
    bytes32 salt
) external nonReentrant {
    ContestStateData storage state = contestStates[contestId];
    ContestParams storage params = contests[contestId];
    Commitment memory commitment = commits[contestId][msg.sender];

    // ... existing checks ...

    // Verify commit hash (updated for new solution format)
    bytes32 solutionHash = keccak256(solution);
    bytes32 expectedCommit = keccak256(abi.encodePacked(contestId, msg.sender, solutionHash, salt));
    if (expectedCommit != commitment.commitHash) revert CommitMismatch(contestId, msg.sender);

    // Validate solution against puzzle
    bool isValid = _validateSolution(params.size, solution, state.regionMap);

    // ... rest of existing logic ...
}
```

### New Errors

```solidity
error WrongState(uint256 contestId, ContestState state);
error PuzzleAlreadyPublished(uint256 contestId);
error PuzzlePublishDeadlinePassed(uint256 contestId, uint256 deadline);
error InvalidRegionMapLength(uint256 actual, uint256 expected);
error InvalidRegionId(uint256 index, uint8 regionId, uint8 maxRegion);
error PuzzleNotPublished(uint256 contestId);
error PuzzlePublishDeadlineNotPassed(uint256 contestId, uint256 deadline);
error ContestNotCancelled(uint256 contestId);
error NoDepositToRefund(uint256 contestId, address solver);
```

### New Events

```solidity
event ContestCancelled(uint256 indexed contestId, CancelReason reason);
event DepositRefunded(uint256 indexed contestId, address indexed solver, uint256 amount);

enum CancelReason {
    PuzzleNotPublished
}
```

### New State

```solidity
enum ContestState {
    Scheduled,
    RandomnessPending,
    CommitOpen,
    RevealOpen,
    Closed,
    Finalized,
    Cancelled  // NEW
}
```

---

## Gas Analysis

### publishPuzzle (10x10 board)

| Component | Gas | Notes |
|-----------|-----|-------|
| Base transaction | 21,000 | |
| Calldata (100 bytes) | ~1,600 | 16 gas per non-zero byte |
| Storage (puzzleHash) | ~22,000 | New slot |
| Storage (regionMap) | ~200,000 | 100 bytes = 4 slots (packed) |
| Loop validation | ~5,000 | 100 iterations, simple checks |
| **Total** | **~250,000** | One-time sponsor cost |

### revealSolution with validation (10x10 board)

| Component | Gas | Notes |
|-----------|-----|-------|
| Existing reveal logic | ~70,000 | Commit verification, state, ETH transfer |
| Solution calldata (10 bytes) | ~160 | |
| Validation loop | ~8,000 | Bitmap ops |
| Region map SLOAD | ~2,100 | Cold read |
| **Total** | **~80,000** | ~$0.06 at 30 gwei, $2500 ETH |

**Additional cost vs current stub:** ~10,000 gas (~$0.05)

---

## Frontend Changes

### Sponsor Flow

1. After `RandomnessFulfilled` event, prompt sponsor to publish puzzle
2. Generate puzzle locally: `generateLogicSolvablePuzzle(globalSeed, size)`
3. Encode region map as packed bytes
4. Call `publishPuzzle(contestId, regionMap, ipfsCid)`
5. Upload region map to IPFS for player convenience

### Player Flow

1. Wait for `PuzzlePublished` event before committing
2. Fetch region map from contract or IPFS
3. Verify locally: `generateLogicSolvablePuzzle(seed, size)` matches
4. Solve puzzle, encode solution as packed bytes
5. Commit: `keccak256(abi.encodePacked(contestId, address, keccak256(solution), salt))`
6. Reveal: `revealSolution(contestId, solution, salt)`

### Solution Encoding

```typescript
// Old format (base64 JSON): "[2,4,0,3,1]" → ~20+ bytes
// New format (packed bytes): 0x0204000301 → 5 bytes

function encodeSolution(columns: number[]): Uint8Array {
  return new Uint8Array(columns);
}

function decodeSolution(bytes: Uint8Array): number[] {
  return Array.from(bytes);
}
```

---

## Testing Requirements

### Unit Tests

1. `publishPuzzle` happy path
2. `publishPuzzle` reverts if wrong state
3. `publishPuzzle` reverts if already published
4. `publishPuzzle` reverts if deadline passed
5. `publishPuzzle` reverts if wrong region map length
6. `publishPuzzle` reverts if invalid region IDs
7. `commitSolution` reverts if puzzle not published
8. `cancelUnpublishedContest` happy path
9. `cancelUnpublishedContest` reverts if puzzle published
10. `cancelUnpublishedContest` reverts if deadline not passed
11. `refundCancelledDeposit` happy path
12. `_validateSolution` accepts valid solution
13. `_validateSolution` rejects duplicate columns
14. `_validateSolution` rejects duplicate regions
15. `_validateSolution` rejects adjacent sovereigns
16. `_validateSolution` rejects out-of-range columns

### Integration Tests

1. Full flow: schedule → VRF → publish → commit → reveal → win
2. Cancellation flow: schedule → VRF → deadline passes → cancel → refund
3. Invalid solution flow: commit → reveal invalid → deposit forfeited

### Gas Benchmarks

| Board Size | publishPuzzle | revealSolution |
|------------|---------------|----------------|
| 5x5 | | |
| 7x7 | | |
| 10x10 | | |

---

## Implementation Checklist

### Contract Changes

- [ ] Add `Cancelled` state to `ContestState` enum
- [ ] Add `puzzlePublishDeadline` to `ContestStateData`
- [ ] Add `regionMap` to `ContestStateData`
- [ ] Add `PUZZLE_PUBLISH_WINDOW` constant
- [ ] Implement `publishPuzzle()`
- [ ] Implement `_validateSolution()` with bitmap logic
- [ ] Implement `cancelUnpublishedContest()`
- [ ] Implement `refundCancelledDeposit()`
- [ ] Implement `withdrawCancelledPrize()`
- [ ] Modify `fulfillRandomWords()` to set deadline
- [ ] Modify `commitSolution()` to require puzzle published
- [ ] Modify `revealSolution()` for new solution format
- [ ] Add new errors and events
- [ ] Update existing tests for new state
- [ ] Add new tests per requirements above

### Frontend Changes

- [ ] Update solution encoding to packed bytes
- [ ] Add sponsor puzzle publication UI
- [ ] Add puzzle publication status indicator
- [ ] Update commit hash generation
- [ ] Handle `Cancelled` state in UI
- [ ] Add refund UI for cancelled contests

### Documentation

- [ ] Update contracts/README.md with new functions
- [ ] Update CLAUDE.md with state flow changes
- [ ] Add puzzle publication to user guide

---

## Future Enhancements (M4)

1. **Chainlink Automation** — Auto-publish puzzle via keeper
2. **Region map packing** — 4 bits per cell (50 bytes vs 100 for 10x10)
3. **Fraud proofs** — Challenge invalid puzzle publication
4. **On-chain verification** — Verify region map matches seed (complex)
