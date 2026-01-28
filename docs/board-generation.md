# Board Generation

This document details the board generation system for Sovereign puzzles. The generation process creates deterministic, unique, logic-solvable puzzles.

## Core Game Rules

Sovereign puzzles enforce these constraints:

1. **Row Constraint** - Exactly one sovereign per row
2. **Column Constraint** - Exactly one sovereign per column
3. **Region Constraint** - Exactly one sovereign per region (contiguous colored zones, 4-connected)
4. **Adjacency Constraint** - No two sovereigns may touch (including diagonals)

## Generation Pipeline

The board generation follows a four-stage pipeline:

### Stage A: Solution Generation

Generate a valid solution first (one per row/col, no touching).

- Uses backtracking with randomized column order
- Maintains `usedCols` set for column uniqueness
- Checks adjacency: rejects placements where `rowDiff <= 1 AND colDiff <= 1`
- Deterministic PRNG derived from seed

**Implementation:** `packages/engine/src/solver.ts` - `findValidSolution()`

### Stage B: Region Generation

Create n contiguous regions, each containing exactly one solution cell.

- Pre-assigns solution cells to their respective regions
- Grows regions using BFS flood-fill from solution cells
- **Constraint-aware growth:** checks uniqueness during growth, not after
- Randomly selects frontier cells for organic shapes
- Fills remaining unassigned cells with adjacent regions

**Implementation:** `packages/engine/src/region.ts` - `generateRegionMapWithConstraints()`

### Stage C: Uniqueness Verification

Ensure puzzle has exactly one valid solution.

- Uses `hasAtMostSolutions(regionMap, cap)` for efficient early-exit checking
- If uniqueness check fails, retries with a different seed (up to 50 attempts)
- Backtracking algorithm enforces all constraints

**Implementation:** `packages/engine/src/solver.ts` - `hasAtMostSolutions()`, `hasUniqueSolution()`

### Stage D: Logic-Solvability Optimization

Ensure puzzles can be solved using pure logic (no guessing).

**Hill-Climbing Optimization:**

1. Start with unique puzzle from Stage C
2. Identify boundary cells (adjacent to different regions)
3. Randomly select boundary cells and try swapping to adjacent region
4. Accept swap if it maintains uniqueness, contiguity, and improves logic-solvability
5. Early exit once logic-solvable (70% chance after 50 iterations)

**Logic Solver Rules:**

1. **Prune by Used Sets** - Eliminate candidates in used columns/regions and adjacent to placed sovereigns
2. **Row Singles** - If row has exactly one candidate, place it
3. **Column Singles** - If column has exactly one candidate, place it
4. **Region Singles** - If region has exactly one candidate, place it

**Implementation:**

- `packages/engine/src/optimizer.ts` - Hill-climbing optimization
- `packages/engine/src/logic-solver.ts` - Rule-based solver

## Determinism

All randomness is derived from deterministic PRNG seeded by input:

```
createRng(seed + ':solution')     // Solution generation
createRng(seed + ':' + size)      // Region generation
createRng(seed + ':optimization') // Hill-climbing
```

**Retry Strategy:**

- Base generation uses original seed
- Uniqueness retry appends `-unique-{attempt}`
- Optimization retry appends `-retry-{attempt}`

## API

### Entry Point

```typescript
import { generateLogicSolvablePuzzle } from '@sovereign/engine';

const puzzle = generateLogicSolvablePuzzle(seed, size, options);
```

### Options

```typescript
interface GenerationOptions {
  maxOptimizationIterations?: number; // Default: 500
  requireLogicSolvable?: boolean; // Default: true
  maxRetries?: number; // Default: 100
}
```

### Output

```typescript
interface RegionMap {
  width: number;
  height: number;
  regions: number[]; // region IDs per cell (linear index)
}
```

## Performance

| Size  | Avg Time | Notes            |
| ----- | -------- | ---------------- |
| 5x5   | ~7ms     | Very fast        |
| 6x6   | ~4ms     | Fast             |
| 7x7   | ~10ms    | Consistent       |
| 8x8   | ~61ms    | First slowdown   |
| 9x9   | ~40ms    | Fast             |
| 10x10 | ~330ms   | Slower           |
| 11x11 | ~378ms   | Similar to 10x10 |
| 12x12 | ~1.1s    | High variance    |

## Quality Requirements

- **Uniqueness:** Exactly 1 solution (mandatory)
- **Logic-Solvability:** Solvable using only deduction rules (preferred)
- **Region Quality:** Contiguous, organic shapes
