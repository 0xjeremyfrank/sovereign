# Solution Validation Approaches

Analysis of options for validating puzzle solutions in the FirstBloodContest contract.

## Context

**Current State**: The `_validateSolution()` function is a stub that accepts any non-empty bytes.

**Goal**: Verify that revealed solutions are actually valid for the puzzle before awarding prizes.

**Constraints**:
- Puzzle is deterministically generated from VRF seed
- Most puzzles have exactly ONE valid solution
- First valid reveal wins (speed matters)
- Need to prevent gaming/cheating

---

## Option 1: Sponsor-Submitted Hash (Unsalted)

### How It Works

1. VRF provides randomness, puzzle is generated deterministically
2. Sponsor solves puzzle off-chain, computes `validSolutionHash = keccak256(solution)`
3. Sponsor calls `publishSolution(contestId, validSolutionHash)`
4. Players reveal solutions; contract checks `keccak256(revealedSolution) == validSolutionHash`

### Security Analysis

**Critical Vulnerability: Brute Force Attack**

The solution space is small enough to enumerate:
- 5x5 board: 5! = 120 permutations (column uniqueness only)
- 10x10 board: 10! = 3.6M permutations

With adjacency constraint filtering, valid permutations drop to ~1-10% of total.

An attacker could:
1. Enumerate all valid permutations
2. Hash each one
3. Compare against published `validSolutionHash`
4. Submit the matching solution without solving the puzzle

**Estimated attack time**: < 1 second for any board size up to 10x10.

### Verdict

**Not viable** - fundamentally broken due to small solution space.

---

## Option 2: Sponsor-Submitted Hash with Delayed Salt

### How It Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CONTEST TIMELINE                                │
├─────────────┬─────────────────────┬──────────────┬─────────────────────────┤
│  Setup      │  Commit Window      │  Salt Reveal │  Reveal Window          │
├─────────────┼─────────────────────┼──────────────┼─────────────────────────┤
│ Sponsor     │ Players solve &     │ Sponsor      │ Players reveal          │
│ publishes   │ commit solutions    │ reveals      │ Contract validates:     │
│ salted hash │ (salt unknown)      │ salt         │ hash(solution,salt)     │
│             │                     │              │ == published hash       │
└─────────────┴─────────────────────┴──────────────┴─────────────────────────┘
```

1. VRF provides seed → puzzle generated deterministically
2. Sponsor solves puzzle, generates random `sponsorSalt`
3. Sponsor publishes `validSolutionHash = keccak256(abi.encodePacked(solution, sponsorSalt))`
   - **Salt remains SECRET**
4. Commit window opens — players solve and commit their solutions
5. **Commit window closes** — no new commits allowed
6. Sponsor calls `revealSalt(contestId, sponsorSalt)`
7. Reveal window — players reveal solutions
8. Contract validates: `keccak256(abi.encodePacked(playerSolution, sponsorSalt)) == validSolutionHash`

### Why This Is Secure

**During commit phase:**
- `validSolutionHash` is public, but salt is unknown
- Brute force requires trying: `hash(candidate, salt)` for all possible salts
- Salt space: 256 bits = computationally infeasible

**After salt revealed:**
- Commits are already locked
- Attacker can now compute the valid solution, but cannot submit new commit
- Their existing commit (if any) won't match unless they actually solved it

**Attack scenarios:**

| Attack | Why It Fails |
|--------|--------------|
| Brute force during commit | Salt unknown, can't verify candidates |
| Submit after seeing salt | Commit window closed |
| Commit garbage, hope it matches | Probability ≈ 0 |

### Cost Analysis

| Operation | Gas Cost |
|-----------|----------|
| `publishSolutionHash` | ~45k (one-time, sponsor) |
| `revealSalt` | ~25k (one-time, sponsor) |
| `_validateSolution` | ~500 (per reveal, just one hash) |

**Total validation cost per reveal: ~500 gas** — essentially free.

### UX Concerns

**Sponsor burden:**
- Must be online after VRF to publish hash
- Must be online after commit window to reveal salt
- Two manual transactions required

**Failure modes:**
- Sponsor doesn't reveal salt → contest stalls (needs timeout fallback)
- Sponsor publishes wrong hash → no one can win (needs refund mechanism)

**Mitigations:**
- Automate via Chainlink Automation / Gelato keepers
- Timeout: if salt not revealed, players get deposits back
- But adds infrastructure complexity

### Verdict

**Viable but UX-heavy** - requires sponsor coordination at critical moments. Better suited if sponsor operations are automated.

---

## Option 3: On-Chain Validation (Recommended)

### How It Works

1. Sponsor publishes region map (or its hash) after VRF
2. Player reveals solution
3. Contract validates solution against puzzle constraints directly
4. Valid solution → immediate payout

### Solution Encoding

**Optimized format**: Packed bytes where each byte is a column index.

```
Solution: [2, 4, 0, 3, 1]  →  0x0204000301  (5 bytes)
```

- 5x5 board: 5 bytes
- 10x10 board: 10 bytes
- Much cheaper than base64 JSON (~20+ bytes)

### Validation Rules

1. **Row uniqueness**: Implicit from format (one column per row)
2. **Column uniqueness**: No duplicate column values
3. **Region uniqueness**: One sovereign per region
4. **Adjacency**: No two sovereigns in adjacent cells (including diagonal)

### Optimized Validation Logic

```solidity
/// @notice Validate solution against puzzle constraints
/// @param size Board dimension (5-10)
/// @param solution Packed bytes: solution[i] = column index for row i
/// @param regionMap Region ID for each cell (row-major order)
/// @return True if solution is valid
function _validateSolution(
    uint8 size,
    bytes calldata solution,
    uint8[] calldata regionMap
) internal pure returns (bool) {
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
        uint8 regId = regionMap[uint256(row) * size + col];
        uint256 regBit = 1 << regId;
        if (regBitmap & regBit != 0) return false;
        regBitmap |= regBit;

        // Adjacency: sovereigns in consecutive rows can't be within 1 column
        // This catches all 8-directional adjacency since we process row by row
        if (row > 0) {
            uint8 diff = col > prevCol ? col - prevCol : prevCol - col;
            if (diff <= 1) return false;
        }
        prevCol = col;
    }

    return true;
}
```

### Why Bitmap Validation Works

**Column uniqueness**:
- `colBitmap` tracks which columns have sovereigns
- For column `c`, check if bit `c` is set, then set it
- O(1) per check using bitwise AND/OR

**Region uniqueness**:
- Same approach with `regBitmap`
- Region IDs are 0 to size-1, fit in uint256 bitmap

**Adjacency optimization**:
- Only check consecutive rows (not all 8 directions)
- If row `i` has sovereign at column `c1` and row `i+1` has sovereign at `c2`:
  - They're adjacent if `|c1 - c2| <= 1`
- This catches all diagonal and vertical adjacency
- Horizontal adjacency is impossible (one sovereign per row)

### Gas Analysis (10x10 Board)

| Component | Gas | Notes |
|-----------|-----|-------|
| **Calldata** | | |
| Solution (10 bytes) | ~160 | 16 gas per non-zero byte |
| Salt (32 bytes) | ~512 | |
| Region map (100 bytes) | ~1,600 | Could optimize with packing |
| **Computation** | | |
| Region map hash verification | ~1,000 | One keccak256 |
| Validation loop (10 iters) | ~8,000 | Bitmap ops are cheap |
| **Existing reveal logic** | ~50,000 | Commit verification, state updates, ETH transfer |
| **Base transaction** | ~21,000 | |
| **Total** | **~82,000** | |

**Comparison to current stub**: ~70,000 gas

**Additional cost for full validation**: ~12,000 gas (~$0.06 at 30 gwei, $2500 ETH)

### Region Map Handling

**Option A: Player submits region map with each reveal**
- Calldata cost: ~1,600 gas per reveal
- Contract verifies: `keccak256(regionMap) == puzzleHash`
- No storage cost, but repeated calldata

**Option B: Sponsor publishes region map once (Recommended)**
- Sponsor calls `publishPuzzle(contestId, regionMap)` after VRF
- Contract stores region map on-chain
- Storage cost: ~200k gas one-time (100 bytes = 4 storage slots)
- Players don't need to submit region map
- Saves ~1,600 gas per reveal

**Option C: Pack region map to 4 bits per cell**
- Region IDs are 0-9, fit in 4 bits
- 100 cells × 4 bits = 400 bits = 50 bytes
- Saves ~800 gas calldata vs Option A
- Slightly more complex unpacking logic

### Contract Changes

```solidity
struct ContestStateData {
    // ... existing fields ...
    bytes32 puzzleHash;      // keccak256(regionMap) - already exists
    // For Option B, add:
    uint8[] regionMap;       // stored on-chain after VRF
}

/// @notice Sponsor publishes region map after puzzle is generated
function publishPuzzle(
    uint256 contestId,
    uint8[] calldata regionMap,
    string calldata regionMapCid  // IPFS CID for off-chain retrieval
) external onlySponsor(contestId) {
    ContestStateData storage state = contestStates[contestId];
    ContestParams memory params = contests[contestId];

    require(state.state == ContestState.CommitOpen, "Wrong state");
    require(state.puzzleHash == bytes32(0), "Already published");
    require(regionMap.length == uint256(params.size) * params.size, "Invalid length");

    state.puzzleHash = keccak256(abi.encodePacked(regionMap));
    state.regionMap = regionMap;  // Option B only

    emit PuzzlePublished(contestId, state.puzzleHash, regionMapCid);
}

/// @notice Reveal with on-chain validation
function revealSolution(
    uint256 contestId,
    bytes calldata encodedSolution,  // packed column indices
    bytes32 salt
) external nonReentrant {
    // ... existing commit verification ...

    ContestStateData storage state = contestStates[contestId];
    ContestParams memory params = contests[contestId];

    // Validate solution
    bool isValid = _validateSolution(
        params.size,
        encodedSolution,
        state.regionMap  // Option B: read from storage
    );

    // ... existing reward logic ...
}
```

### Trust Model

| Aspect | Analysis |
|--------|----------|
| **Trustless validation** | Yes - contract enforces all rules |
| **Sponsor role** | Only publishes region map (can be verified against seed) |
| **Manipulation risk** | None - validation is deterministic |
| **Single point of failure** | None for validation; sponsor must publish puzzle |

### Failure Modes

**Sponsor doesn't publish puzzle:**
- Players can't reveal (validation needs region map)
- Add timeout: if puzzle not published within X blocks after VRF, contest cancelled
- Players get deposits refunded

**Sponsor publishes wrong region map:**
- Region map is deterministic from seed
- Anyone can verify off-chain and call out sponsor
- Could add: verification that region map matches seed (complex)

### Further Optimizations

| Optimization | Gas Saved | Complexity |
|--------------|-----------|------------|
| Pack region map (4 bits/cell) | ~800 calldata | Low |
| Assembly for bitmap ops | ~2,000 | Medium |
| Store region map as bytes32[4] | ~500 SLOAD | Low |
| Batch validation (multiple reveals) | Variable | Medium |

### Verdict

**Recommended for MVP** - trustless, instant, reasonable gas cost (~$0.06 extra per reveal). Sponsor only needs to publish puzzle once after VRF.

---

## Option 4: Fraud Proof System (Optimistic Validation)

### How It Works

1. Player reveals solution
2. Contract accepts optimistically, marks as "pending winner"
3. Dispute window opens (e.g., 100 blocks / ~20 minutes)
4. Anyone can challenge by calling `challengeSolution(contestId, solver)`
5. If challenged:
   - Full validation runs on-chain
   - Invalid: challenger rewarded, solver loses deposit
   - Valid: challenger loses bond
6. After dispute window, unchallenged solutions are finalized

### Cost Analysis

| Scenario | Gas Cost | Who Pays |
|----------|----------|----------|
| Happy path (no challenge) | ~50k (reveal) + ~30k (finalize) | Solver |
| Challenge (invalid solution) | ~50k + ~80k validation | Challenger (refunded) |
| Challenge (valid solution) | ~50k + ~80k validation | Challenger (lost) |

### UX Impact

- **Delay**: Winners must wait for dispute window before receiving rewards
- **Complexity**: Additional `finalize` transaction required
- **First Blood Conflict**: "First blood" loses meaning if there's a 20-minute wait

### Security Model

- **Trust**: Trustless - anyone can challenge
- **Incentives**: Challengers need bond, get reward if successful
- **Griefing**: Attacker could challenge valid solutions to delay rewards (costs them bond)

### Verdict

**Viable but awkward** - the dispute delay conflicts with "first blood" instant gratification. Could be useful as a fallback mechanism.

---

## Option 5: Chainlink Functions (Off-Chain Computation)

### How It Works

1. Player reveals solution
2. Contract triggers Chainlink Functions request
3. Off-chain Chainlink node runs validation logic (JavaScript)
4. Chainlink returns `(bool isValid)` to contract callback
5. Contract awards prize based on oracle response

### Cost Analysis

| Component | Cost |
|-----------|------|
| Chainlink Functions request | ~0.2 LINK (~$3) |
| Callback gas | ~100k gas |
| Reveal transaction | ~50k gas |

**Per-reveal cost**: ~$3-5 (LINK + gas)

### Latency

- 1-3 blocks for response (~15-45 seconds)

### Verdict

**Overkill** - on-chain validation is cheaper and faster.

---

## Option 6: ZK Proof Verification

### How It Works

1. Player generates ZK proof: "I know a solution S such that validate(S, puzzle) = true"
2. Player submits solution + proof
3. Contract verifies proof (~200k gas for Groth16)

### Cost Analysis

| Component | Cost |
|-----------|------|
| Proof generation | 5-30 seconds (client-side) |
| On-chain verification | ~200-300k gas |
| Circuit setup | One-time, weeks of effort |

### Verdict

**Best for future trustless scenarios** - overkill for MVP where on-chain validation is sufficient.

---

## Option 7: Economic Security Only (Current Stub)

### How It Works

1. Player reveals solution
2. Contract does minimal checks (length, format)
3. Invalid solutions = wasted gas + lost deposit
4. No cryptographic validation

### When This Breaks

- If prize >> deposit, rational to spam invalid solutions
- Griefing: Submit invalid solutions to claim winner slots

### Verdict

**Not sufficient** - too easy to game.

---

## Comparison Matrix

| Criteria | Unsalted Hash | Salted Hash | **On-Chain** | Fraud Proof | Chainlink | ZK Proof |
|----------|---------------|-------------|--------------|-------------|-----------|----------|
| **Security** | Broken | Sponsor trust | **Trustless** | Trustless | Oracle trust | Trustless |
| **Gas/reveal** | ~500 | ~500 | **~12k extra** | ~30k finalize | ~150k | ~200k |
| **Latency** | Instant | Instant | **Instant** | 20+ min | 15-45 sec | Instant |
| **Sponsor UX** | N/A | 2 txns, timed | **1 txn** | None | None | None |
| **Ongoing cost** | None | None | **None** | None | ~$3/reveal | None |
| **Impl. complexity** | Low | Low | **Low** | Medium-High | Medium | High |

---

## Recommendation

### For MVP (M1)

**On-Chain Validation** is the best choice:
- Fully trustless - no sponsor coordination after puzzle published
- Instant validation - immediate payouts
- Reasonable cost - ~$0.06 extra per reveal
- Simple implementation - bitmap-based validation is straightforward
- Good UX - sponsor publishes puzzle once, then hands-off

### Implementation Priority

1. Change solution encoding to packed bytes format
2. Add `publishPuzzle()` function for sponsor
3. Implement `_validateSolution()` with bitmap logic
4. Update frontend to encode/decode new format
5. Add timeout if puzzle not published

### For Future Consideration

- **ZK proofs** if we need trustless multi-sponsor scenarios
- **Fraud proofs** as optional dispute mechanism
- **Region map packing** if gas savings become important

---

## Implementation Plan

### Contract Changes

1. Add solution encoding helpers (if needed)
2. Update `revealSolution()` signature for packed bytes
3. Implement `_validateSolution()` with full validation
4. Add `publishPuzzle()` for sponsor to submit region map
5. Add timeout/fallback if puzzle not published

### Frontend Changes

1. Update `encodeBoard()` to produce packed bytes
2. Update `decodeBoard()` to read packed bytes
3. Update commit hash generation for new format
4. Sponsor UI: prompt to publish puzzle after VRF

### Testing

1. Unit tests for validation logic (valid/invalid solutions)
2. Gas benchmarks for different board sizes
3. Integration tests for full reveal flow

---

## Resolved Questions

1. **Region map storage:** Store on-chain. Sponsor calls `publishPuzzle()` once; players don't need to submit region map with each reveal. Better UX, gas cost is sponsor's responsibility.

2. **Puzzle publication timeout:** 100 blocks (~20 minutes) after VRF fulfillment. Sponsor must publish before commits are accepted (`commitSolution()` requires `puzzleHash != 0`).

3. **Solution transparency:** Deferred to future work. Could emit valid solution after contest closes for transparency, but not required for MVP functionality.
