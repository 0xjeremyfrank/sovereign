# Puzzle Generation Algorithm

This document explains the exact algorithm used to generate Sovereign puzzles.

## Overview

The algorithm generates puzzles that are:

- **Deterministic** - Same seed always produces the same puzzle
- **Unique** - Exactly one valid solution exists
- **Logic-solvable** - Solvable using deduction alone (no guessing)

## The Algorithm

### Step 1: Generate Solution

First, we generate a valid solution using constrained backtracking.

```
findValidSolution(seed, size):
  rng = createRng(seed + ':solution')
  solution = []
  usedCols = {}

  backtrack(row):
    if row == size: return true

    cols = shuffle([0..size-1], rng)
    for col in cols:
      if col in usedCols: continue

      # Check adjacency with all previously placed sovereigns
      valid = true
      for prevRow in [0..row-1]:
        prevCol = solution[prevRow]
        if |row - prevRow| <= 1 AND |col - prevCol| <= 1:
          valid = false
          break

      if valid:
        solution[row] = col
        usedCols.add(col)
        if backtrack(row + 1): return true
        usedCols.remove(col)

    return false

  backtrack(0)
  return solution
```

**Key insight:** The adjacency constraint requires that no two sovereigns can be within 1 cell of each other in both row AND column directions. This is stricter than standard n-queens.

### Step 2: Grow Regions with Constraint Checking

Starting from the solution cells, grow regions using BFS while checking uniqueness at each step.

```
generateRegionMapWithConstraints(seed, size):
  rng = createRng(seed + ':' + size)
  solution = findValidSolution(seed, size)
  regions = array of size*size, filled with -1
  targetSize = floor(size*size / size)

  # Seed each region at its solution cell
  for regionId in [0..size-1]:
    row = regionId
    col = solution[regionId]
    regions[row * size + col] = regionId

  # Grow each region
  for regionId in [0..size-1]:
    startIdx = regionId * size + solution[regionId]
    frontier = [startIdx]
    inRegion = {startIdx}

    while |inRegion| < targetSize AND frontier not empty:
      # Pick random frontier cell
      currentIdx = frontier.popRandom(rng)

      # Get unassigned neighbors (excluding solution cells)
      neighbors = shuffle(getNeighbors(currentIdx), rng)
        .filter(n -> regions[n] == -1 AND n not a solution cell)

      for neighbor in neighbors:
        if |inRegion| >= targetSize: break

        # Temporarily assign and check uniqueness
        regions[neighbor] = regionId
        if hasAtMostSolutions(regions, 1):
          inRegion.add(neighbor)
          frontier.push(neighbor)
        else:
          regions[neighbor] = -1  # revert

  # Fill remaining cells with adjacent region
  for idx in [0..size*size-1]:
    if regions[idx] == -1:
      regions[idx] = regions[anyAdjacentAssignedCell(idx)]

  return regions
```

**Key insight:** By checking uniqueness during growth (not after), we prune the search space early and generate puzzles more likely to be unique.

### Step 3: Verify Uniqueness with Early Exit

Count solutions using backtracking, exiting early if count exceeds cap.

```
hasAtMostSolutions(regionMap, cap):
  count = 0
  solution = []
  usedCols = {}

  backtrack(row):
    if count > cap: return false
    if row == size:
      count++
      return count <= cap

    for col in [0..size-1]:
      if col in usedCols: continue

      # Check adjacency
      if any prevRow where |row-prevRow| <= 1 AND |col-solution[prevRow]| <= 1:
        continue

      # Check region uniqueness
      region = regionMap[row, col]
      if region already used by previous rows: continue

      solution[row] = col
      usedCols.add(col)
      markRegionUsed(region)

      if not backtrack(row + 1): return false

      usedCols.remove(col)
      unmarkRegion(region)

    return true

  return backtrack(0)
```

If not unique after region generation, retry with a modified seed (up to 50 attempts).

### Step 4: Optimize for Logic-Solvability

Use hill-climbing to tweak region boundaries until the puzzle is logic-solvable.

```
optimizeForLogicSolvability(regionMap, maxIterations, rng):
  current = regionMap
  currentSolvable = isLogicSolvable(current)

  for i in [0..maxIterations]:
    # Try a random boundary swap
    boundaryCells = findBoundaryCells(current)
    cell = boundaryCells.pickRandom(rng)
    targetRegion = cell.adjacentRegions.pickRandom(rng)

    candidate = copy(current)
    candidate[cell.idx] = targetRegion

    # Check constraints
    if not hasAtMostSolutions(candidate, 1): continue
    if not areRegionsContiguous(candidate): continue

    # Accept if improved
    candidateSolvable = isLogicSolvable(candidate)
    if candidateSolvable AND not currentSolvable:
      current = candidate
      currentSolvable = true
    elif candidateSolvable AND rng() < 0.1:
      # Explore even when good (simulated annealing)
      current = candidate

    # Early exit once solvable
    if currentSolvable AND i > 50 AND rng() < 0.7:
      break

  return current
```

### Step 5: Logic Solver (No Guessing)

The logic solver uses iterative constraint propagation:

```
isLogicSolvable(regionMap):
  candidates = 2D array of booleans, all true
  placedCols = array of size, all -1
  usedCols = set()
  usedRegions = set()

  place(row, col):
    placedCols[row] = col
    usedCols.add(col)
    usedRegions.add(region[row, col])
    # Eliminate candidates in same row, col, region
    # Eliminate candidates in 8 adjacent cells

  while progress:
    progress = false

    # Prune by constraints
    for each unplaced row r, each candidate c:
      if c in usedCols: eliminate
      if region[r,c] in usedRegions: eliminate
      if adjacent to any placed sovereign: eliminate

    # Row singles
    for each row:
      if exactly one candidate: place it, progress = true
      if zero candidates: return false (contradiction)

    # Column singles
    for each col:
      if exactly one candidate in unplaced rows: place it, progress = true

    # Region singles
    for each region:
      if exactly one candidate in unplaced cells: place it, progress = true
      if zero candidates and not yet placed: return false

  return all rows placed
```

## Retry Strategy

The full generation with retries:

```
generateLogicSolvablePuzzle(seed, size, options):
  for attempt in [0..maxRetries]:
    attemptSeed = attempt == 0 ? seed : seed + '-retry-' + attempt

    # Generate unique puzzle
    regionMap = null
    for uniqueAttempt in [0..50]:
      trySeed = uniqueAttempt == 0 ? attemptSeed : attemptSeed + '-unique-' + uniqueAttempt
      candidate = generateRegionMapWithConstraints(trySeed, size)
      if hasAtMostSolutions(candidate, 1):
        regionMap = candidate
        break

    if regionMap is null: continue

    # Optimize
    optimized = optimizeForLogicSolvability(regionMap, 500, rng)

    # Verify constraints
    if not hasAtMostSolutions(optimized, 1): continue
    if not areRegionsContiguous(optimized): continue

    # Check logic-solvability
    if isLogicSolvable(optimized):
      return optimized

  throw Error("Failed to generate after maxRetries attempts")
```

## Complexity

| Stage               | Complexity                        | Notes                      |
| ------------------- | --------------------------------- | -------------------------- |
| Solution Generation | O(n!) worst case                  | Early pruning helps        |
| Region Growth       | O(n^2)                            | BFS with uniqueness checks |
| Uniqueness Check    | O(2^n) worst case                 | Early exit at cap          |
| Logic Solver        | O(n^2) per pass                   | Linear constraint prop     |
| Optimization        | O(iterations \* uniqueness_check) | Hill-climbing              |
