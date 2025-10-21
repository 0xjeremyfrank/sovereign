import { createRng } from './prng';
import { findValidSolution, findAllSolutions, hasAtMostSolutions } from './solver';
import type { RegionMap } from './types';

const linear = (row: number, col: number, size: number): number => row * size + col;

/**
 * Options for configuring region growth heuristics
 *
 * NOTE: These heuristics are EXPERIMENTAL and not currently effective.
 * Testing showed they reduce logic-solvability rather than improve it.
 * Kept for documentation and potential future research.
 */
export interface RegionGrowthOptions {
  preferNarrow: boolean; // Prefer cells that keep region narrow
  encourageChokepoints: boolean; // Favor cells creating 1-cell bridges
  minimizeBorders: boolean; // Reduce shared borders with other regions
  createDeadEnds: boolean; // Create peninsulas and cul-de-sacs
}

/**
 * Default heuristics for logic-solvable puzzle generation
 *
 * @deprecated Not effective - see generateRegionMapWithHeuristics
 */
export const DEFAULT_REGION_GROWTH_OPTIONS: RegionGrowthOptions = {
  preferNarrow: true,
  encourageChokepoints: true,
  minimizeBorders: true,
  createDeadEnds: true,
};

interface FrontierCell {
  idx: number;
  row: number;
  col: number;
  score: number;
}

const shuffle = <T>(arr: T[], rng: () => number): T[] => {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }
  return result;
};

const getNeighborsHelper = (idx: number, size: number): number[] => {
  const row = Math.floor(idx / size);
  const col = idx % size;
  const neighbors: number[] = [];
  const dirs: Array<[number, number]> = [
    [-1, 0],
    [0, 1],
    [1, 0],
    [0, -1],
  ];

  for (const [dr, dc] of dirs) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
      neighbors.push(linear(nr, nc, size));
    }
  }

  return neighbors;
};

// =============================================================================
// EXPERIMENTAL HEURISTIC SCORING FUNCTIONS (NOT CURRENTLY USED)
//
// The following functions were developed for Phase 3 to score frontier cells
// during region growth, with the goal of creating shapes more amenable to
// logical solving (narrow regions, chokepoints, dead-ends, etc.).
//
// Testing revealed these heuristics are COUNTERPRODUCTIVE:
// - They make uniqueness harder to achieve
// - Post-processing destroys the beneficial shapes anyway
// - Result: 12% logic-solvable vs 56% baseline
//
// Kept for documentation and potential future research.
// See .product/phase3-findings.md for detailed analysis.
// =============================================================================

/**
 * Score based on keeping region narrow (minimal bounding box expansion)
 */
const scoreNarrowness = (
  cellIdx: number,
  cellRow: number,
  cellCol: number,
  regions: number[],
  regionId: number,
  size: number,
): number => {
  // Get current region cells
  const regionCells: number[] = [];
  for (let i = 0; i < regions.length; i++) {
    if (regions[i] === regionId) {
      regionCells.push(i);
    }
  }

  if (regionCells.length === 0) return 10; // First cell

  // Calculate current bounding box
  let minRow = size;
  let maxRow = -1;
  let minCol = size;
  let maxCol = -1;

  for (const idx of regionCells) {
    const r = Math.floor(idx / size);
    const c = idx % size;
    minRow = Math.min(minRow, r);
    maxRow = Math.max(maxRow, r);
    minCol = Math.min(minCol, c);
    maxCol = Math.max(maxCol, c);
  }

  // Calculate new bounding box if this cell were added
  const newMinRow = Math.min(minRow, cellRow);
  const newMaxRow = Math.max(maxRow, cellRow);
  const newMinCol = Math.min(minCol, cellCol);
  const newMaxCol = Math.max(maxCol, cellCol);

  const currentSpan = maxRow - minRow + 1 + (maxCol - minCol + 1);
  const newSpan = newMaxRow - newMinRow + 1 + (newMaxCol - newMinCol + 1);

  // Higher score for smaller expansion
  return currentSpan === newSpan ? 10 : Math.max(0, 10 - (newSpan - currentSpan));
};

/**
 * Score based on creating chokepoints (narrow connections)
 */
const scoreChokepoint = (
  cellIdx: number,
  regions: number[],
  regionId: number,
  size: number,
): number => {
  const neighbors = getNeighborsHelper(cellIdx, size);
  const sameRegionCount = neighbors.filter((n) => regions[n] === regionId).length;

  // Score higher if this creates a narrow connection
  if (sameRegionCount === 1) return 8; // Perfect chokepoint
  if (sameRegionCount === 2) return 5; // Good narrow connection
  return 2; // Less interesting
};

/**
 * Score based on minimizing borders with other regions
 */
const scoreBorderMinimization = (
  cellIdx: number,
  regions: number[],
  regionId: number,
  size: number,
): number => {
  const neighbors = getNeighborsHelper(cellIdx, size);

  // Count neighbors that are unassigned or same region
  const friendlyCount = neighbors.filter(
    (n) => regions[n] === -1 || regions[n] === regionId,
  ).length;

  // Higher score for more friendly neighbors (fewer borders)
  return friendlyCount * 2;
};

/**
 * Score based on creating dead-ends and peninsulas
 */
const scoreDeadEnd = (cellIdx: number, regions: number[], size: number): number => {
  const neighbors = getNeighborsHelper(cellIdx, size);
  const unassignedNeighbors = neighbors.filter((n) => regions[n] === -1);

  // Favor cells that are at the "edge" of unassigned territory
  // (creates peninsulas)
  if (unassignedNeighbors.length <= 2) return 6;
  return 3;
};

/**
 * Comprehensive scoring function for frontier cells
 */
const scoreFrontierCell = (
  cellIdx: number,
  cellRow: number,
  cellCol: number,
  regions: number[],
  regionId: number,
  size: number,
  options: RegionGrowthOptions,
  rng: () => number,
): number => {
  let score = 0;

  if (options.preferNarrow) {
    score += scoreNarrowness(cellIdx, cellRow, cellCol, regions, regionId, size);
  }

  if (options.encourageChokepoints) {
    score += scoreChokepoint(cellIdx, regions, regionId, size);
  }

  if (options.minimizeBorders) {
    score += scoreBorderMinimization(cellIdx, regions, regionId, size);
  }

  if (options.createDeadEnds) {
    score += scoreDeadEnd(cellIdx, regions, size);
  }

  // Add small random factor for tie-breaking (maintains determinism)
  score += rng() * 0.1;

  return score;
};

/**
 * EXPERIMENTAL - NOT RECOMMENDED FOR USE
 *
 * Generate region map with heuristic-based growth for better logic-solvability
 * Uses scoring functions to prefer narrow regions, chokepoints, and dead-ends
 *
 * @deprecated Testing showed this approach reduces logic-solvability (12% vs 56% baseline)
 * because aggressive shape heuristics conflict with uniqueness constraints.
 * The post-processing uniqueness enforcement destroys the beneficial shapes.
 *
 * See .product/phase3-findings.md for detailed analysis.
 * Use generateRegionMap or generateRegionMapWithConstraints instead.
 *
 * Kept for documentation purposes only.
 */
export const generateRegionMapWithHeuristics = (
  seed: string,
  size: number,
  options: RegionGrowthOptions = DEFAULT_REGION_GROWTH_OPTIONS,
): RegionMap => {
  const rng = createRng(seed + ':' + size);
  const numRegions = size;
  const totalCells = size * size;

  // Find a valid solution first to guarantee solvability
  const solution = findValidSolution(seed, size);

  const regions: number[] = new Array(totalCells).fill(-1);
  const targetSizePerRegion = Math.floor(totalCells / numRegions);

  // Directions for adjacency (4-connected: up, right, down, left)
  const dirs: Array<[number, number]> = [
    [-1, 0],
    [0, 1],
    [1, 0],
    [0, -1],
  ];

  const getNeighbors = (idx: number): number[] => {
    const row = Math.floor(idx / size);
    const col = idx % size;
    const neighbors: number[] = [];

    for (const [dr, dc] of dirs) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
        neighbors.push(linear(nr, nc, size));
      }
    }

    return neighbors;
  };

  // Pre-assign all solution cells to their respective regions
  const solutionCells = new Set<number>();
  for (let regionId = 0; regionId < numRegions; regionId++) {
    const row = regionId;
    const col = solution[regionId]!;
    const idx = linear(row, col, size);
    regions[idx] = regionId;
    solutionCells.add(idx);
  }

  // Grow regions using heuristic-guided flood-fill (without inline uniqueness checking)
  // Uniqueness will be handled via post-processing swaps (similar to original method)
  for (let regionId = 0; regionId < numRegions; regionId++) {
    const regionSize =
      regionId < numRegions - 1 ? targetSizePerRegion : totalCells - regionId * targetSizePerRegion;

    const row = regionId;
    const col = solution[regionId]!;
    const startIdx = linear(row, col, size);

    const frontier: number[] = [startIdx];
    const inRegion: Set<number> = new Set([startIdx]);

    // Grow region using BFS with heuristic scoring
    while (inRegion.size < regionSize && frontier.length > 0) {
      // Score all frontier cells
      const scoredFrontier: FrontierCell[] = frontier.map((idx) => ({
        idx,
        row: Math.floor(idx / size),
        col: idx % size,
        score: scoreFrontierCell(
          idx,
          Math.floor(idx / size),
          idx % size,
          regions,
          regionId,
          size,
          options,
          rng,
        ),
      }));

      // Sort by score (descending - higher scores first)
      scoredFrontier.sort((a, b) => b.score - a.score);

      // Pick best cell
      const currentIdx = scoredFrontier[0]!.idx;
      const currentIdxInFrontier = frontier.indexOf(currentIdx);
      frontier.splice(currentIdxInFrontier, 1);

      // Get unassigned neighbors (excluding other solution cells)
      const neighbors = shuffle(
        getNeighbors(currentIdx).filter((n) => regions[n] === -1 && !solutionCells.has(n)),
        rng,
      );

      // Add neighbors to region
      for (const neighbor of neighbors) {
        if (inRegion.size >= regionSize) break;

        if (!inRegion.has(neighbor)) {
          regions[neighbor] = regionId;
          inRegion.add(neighbor);
          frontier.push(neighbor);
        }
      }
    }
  }

  // Fill any remaining unassigned cells with adjacent regions
  for (let idx = 0; idx < totalCells; idx++) {
    if (regions[idx] === -1) {
      const neighbors = getNeighbors(idx);
      const assignedNeighbor = neighbors.find((n) => regions[n] !== -1);
      if (assignedNeighbor !== undefined) {
        regions[idx] = regions[assignedNeighbor]!;
      } else {
        regions[idx] = 0;
      }
    }
  }

  // Ensure uniqueness by adjusting regions to eliminate alternative solutions
  const regionMap: RegionMap = { width: size, height: size, regions: [...regions] };
  let attempts = 0;
  const maxAttempts = 100; // More attempts than original to account for heuristic-shaped regions

  while (attempts < maxAttempts) {
    const allSolutions = findAllSolutions(regionMap);

    if (allSolutions.length === 1) {
      // Success! Unique solution found
      break;
    }

    if (allSolutions.length === 0) {
      // We broke the puzzle, revert and try something else
      console.warn('Puzzle became unsolvable during heuristic uniqueness enforcement');
      break;
    }

    // Find alternative solutions (not the intended one)
    const alternativeSolutions = allSolutions.filter(
      (sol) => JSON.stringify(sol) !== JSON.stringify(solution),
    );

    if (alternativeSolutions.length === 0) break;

    // Try to find a cell swap that eliminates alternatives
    let bestSwap: { regions: number[]; count: number } | null = null;

    for (const altSol of alternativeSolutions) {
      for (let row = 0; row < size; row++) {
        const altCol = altSol[row]!;
        const intendedCol = solution[row]!;

        if (altCol !== intendedCol) {
          const altIdx = linear(row, altCol, size);
          const intendedIdx = linear(row, intendedCol, size);

          const altRegion = regionMap.regions[altIdx]!;
          const intendedRegion = regionMap.regions[intendedIdx]!;

          // Try swapping this cell into the intended region
          if (altRegion !== intendedRegion) {
            const newRegions = [...regionMap.regions];
            newRegions[altIdx] = intendedRegion;

            // Test if this change still allows the intended solution AND maintains contiguity
            const testMap: RegionMap = { width: size, height: size, regions: newRegions };

            // Check contiguity first (faster than finding all solutions)
            if (!areRegionsContiguous(testMap)) {
              continue; // Skip this swap if it breaks contiguity
            }

            const testSolutions = findAllSolutions(testMap);
            const hasIntended = testSolutions.some(
              (sol) => JSON.stringify(sol) === JSON.stringify(solution),
            );

            if (hasIntended && testSolutions.length < allSolutions.length) {
              // Track the best swap (one that reduces solutions the most)
              if (!bestSwap || testSolutions.length < bestSwap.count) {
                bestSwap = { regions: newRegions, count: testSolutions.length };
              }
            }
          }
        }
      }
    }

    if (bestSwap) {
      // Apply the best swap we found
      regionMap.regions = bestSwap.regions;
    } else {
      // Couldn't make progress, stop trying
      break;
    }

    attempts++;
  }

  return regionMap;
};

/**
 * Generate region map with constraint-aware growth that ensures uniqueness
 * Checks uniqueness during region growth to avoid expensive post-processing
 */
export const generateRegionMapWithConstraints = (seed: string, size: number): RegionMap => {
  const rng = createRng(seed + ':' + size);
  const numRegions = size;
  const totalCells = size * size;

  // Find a valid solution first to guarantee solvability
  const solution = findValidSolution(seed, size);

  const regions: number[] = new Array(totalCells).fill(-1);
  const targetSizePerRegion = Math.floor(totalCells / numRegions);

  // Directions for adjacency (4-connected: up, right, down, left)
  const dirs: Array<[number, number]> = [
    [-1, 0],
    [0, 1],
    [1, 0],
    [0, -1],
  ];

  const getNeighbors = (idx: number): number[] => {
    const row = Math.floor(idx / size);
    const col = idx % size;
    const neighbors: number[] = [];

    for (const [dr, dc] of dirs) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
        neighbors.push(linear(nr, nc, size));
      }
    }

    return neighbors;
  };

  // Pre-assign all solution cells to their respective regions
  const solutionCells = new Set<number>();
  for (let regionId = 0; regionId < numRegions; regionId++) {
    const row = regionId;
    const col = solution[regionId]!;
    const idx = linear(row, col, size);
    regions[idx] = regionId;
    solutionCells.add(idx);
  }

  // Helper function to check if adding a cell maintains uniqueness
  const wouldMaintainUniqueness = (cellIdx: number, regionId: number): boolean => {
    // Temporarily assign the cell
    const originalValue = regions[cellIdx] ?? -1;
    regions[cellIdx] = regionId;

    // Create temporary region map for uniqueness check
    const tempRegionMap: RegionMap = { width: size, height: size, regions: [...regions] };

    // Check if this assignment maintains uniqueness
    const isUnique = hasAtMostSolutions(tempRegionMap, 1);

    // Restore original value
    regions[cellIdx] = originalValue;

    return isUnique;
  };

  // Grow regions using constraint-aware flood-fill
  for (let regionId = 0; regionId < numRegions; regionId++) {
    const regionSize =
      regionId < numRegions - 1 ? targetSizePerRegion : totalCells - regionId * targetSizePerRegion;

    const row = regionId;
    const col = solution[regionId]!;
    const startIdx = linear(row, col, size);

    const frontier: number[] = [startIdx];
    const inRegion: Set<number> = new Set([startIdx]);

    // Grow region using BFS with constraint checking
    while (inRegion.size < regionSize && frontier.length > 0) {
      // Pick random cell from frontier
      const frontierIdx = Math.floor(rng() * frontier.length);
      const currentIdx = frontier[frontierIdx]!;
      frontier.splice(frontierIdx, 1);

      // Get unassigned neighbors (excluding other solution cells)
      const neighbors = shuffle(
        getNeighbors(currentIdx).filter((n) => regions[n] === -1 && !solutionCells.has(n)),
        rng,
      );

      // Try to add neighbors, checking uniqueness constraint
      for (const neighbor of neighbors) {
        if (inRegion.size >= regionSize) break;

        if (!inRegion.has(neighbor)) {
          // Check if adding this cell would maintain uniqueness
          if (wouldMaintainUniqueness(neighbor, regionId)) {
            regions[neighbor] = regionId;
            inRegion.add(neighbor);
            frontier.push(neighbor);
          }
          // If not unique, skip this cell and try next neighbor
        }
      }
    }
  }

  // Fill any remaining unassigned cells with adjacent regions
  for (let idx = 0; idx < totalCells; idx++) {
    if (regions[idx] === -1) {
      const neighbors = getNeighbors(idx);
      const assignedNeighbor = neighbors.find((n) => regions[n] !== -1);
      if (assignedNeighbor !== undefined) {
        regions[idx] = regions[assignedNeighbor]!;
      } else {
        regions[idx] = 0;
      }
    }
  }

  // Final uniqueness check
  const regionMap: RegionMap = { width: size, height: size, regions: [...regions] };

  if (!hasAtMostSolutions(regionMap, 1)) {
    // If constraint-aware growth failed, fall back to original method with uniqueness enforcement
    console.warn(
      'Constraint-aware growth failed to achieve uniqueness, falling back to original method',
    );
    const fallbackMap = generateRegionMap(seed, size);

    // If fallback also fails uniqueness, try a few more seeds
    if (!hasAtMostSolutions(fallbackMap, 1)) {
      for (let i = 1; i <= 5; i++) {
        const altSeed = `${seed}-fallback-${i}`;
        const altMap = generateRegionMap(altSeed, size);
        if (hasAtMostSolutions(altMap, 1)) {
          return altMap;
        }
      }
    }

    return fallbackMap;
  }

  return regionMap;
};

/**
 * Original region generation method (kept for fallback and comparison)
 */
export const generateRegionMap = (seed: string, size: number): RegionMap => {
  const rng = createRng(seed + ':' + size);
  const numRegions = size; // One region per row/column (standard n-Queens style)
  const totalCells = size * size;

  // Find a valid solution first to guarantee solvability
  const solution = findValidSolution(seed, size);

  const regions: number[] = new Array(totalCells).fill(-1);
  const targetSizePerRegion = Math.floor(totalCells / numRegions);

  // Directions for adjacency (4-connected: up, right, down, left)
  const dirs: Array<[number, number]> = [
    [-1, 0],
    [0, 1],
    [1, 0],
    [0, -1],
  ];

  const getNeighbors = (idx: number): number[] => {
    const row = Math.floor(idx / size);
    const col = idx % size;
    const neighbors: number[] = [];

    for (const [dr, dc] of dirs) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
        neighbors.push(linear(nr, nc, size));
      }
    }

    return neighbors;
  };

  // Pre-assign all solution cells to their respective regions
  const solutionCells = new Set<number>();
  for (let regionId = 0; regionId < numRegions; regionId++) {
    const row = regionId;
    const col = solution[regionId]!;
    const idx = linear(row, col, size);
    regions[idx] = regionId;
    solutionCells.add(idx);
  }

  // Grow regions using flood-fill to ensure contiguity
  // Start each region from its solution cell
  for (let regionId = 0; regionId < numRegions; regionId++) {
    const regionSize =
      regionId < numRegions - 1 ? targetSizePerRegion : totalCells - regionId * targetSizePerRegion;

    const row = regionId;
    const col = solution[regionId]!;
    const startIdx = linear(row, col, size);

    const frontier: number[] = [startIdx];
    const inRegion: Set<number> = new Set([startIdx]);

    // Grow region using BFS with randomization
    while (inRegion.size < regionSize && frontier.length > 0) {
      // Pick random cell from frontier
      const frontierIdx = Math.floor(rng() * frontier.length);
      const currentIdx = frontier[frontierIdx]!;
      frontier.splice(frontierIdx, 1);

      // Get unassigned neighbors (excluding other solution cells)
      const neighbors = shuffle(
        getNeighbors(currentIdx).filter((n) => regions[n] === -1 && !solutionCells.has(n)),
        rng,
      );

      for (const neighbor of neighbors) {
        if (inRegion.size >= regionSize) break;

        if (!inRegion.has(neighbor)) {
          regions[neighbor] = regionId;
          inRegion.add(neighbor);
          frontier.push(neighbor);
        }
      }
    }
  }

  // Fill any remaining unassigned cells with adjacent regions
  for (let idx = 0; idx < totalCells; idx++) {
    if (regions[idx] === -1) {
      const neighbors = getNeighbors(idx);
      const assignedNeighbor = neighbors.find((n) => regions[n] !== -1);
      if (assignedNeighbor !== undefined) {
        regions[idx] = regions[assignedNeighbor]!;
      } else {
        regions[idx] = 0;
      }
    }
  }

  // Ensure uniqueness by adjusting regions to eliminate alternative solutions
  const regionMap: RegionMap = { width: size, height: size, regions: [...regions] };
  let attempts = 0;
  const maxAttempts = 50; // Reduced for faster generation; still provides good uniqueness

  while (attempts < maxAttempts) {
    const allSolutions = findAllSolutions(regionMap);

    if (allSolutions.length === 1) {
      // Success! Unique solution found
      break;
    }

    if (allSolutions.length === 0) {
      // We broke the puzzle, revert and try something else
      // This shouldn't happen with careful merging
      console.warn('Puzzle became unsolvable during uniqueness enforcement');
      break;
    }

    // Find alternative solutions (not the intended one)
    const alternativeSolutions = allSolutions.filter(
      (sol) => JSON.stringify(sol) !== JSON.stringify(solution),
    );

    if (alternativeSolutions.length === 0) break;

    // Try to find a cell swap that eliminates alternatives
    // Check all alternative solutions, not just the first one
    let bestSwap: { regions: number[]; count: number } | null = null;

    for (const altSol of alternativeSolutions) {
      for (let row = 0; row < size; row++) {
        const altCol = altSol[row]!;
        const intendedCol = solution[row]!;

        if (altCol !== intendedCol) {
          const altIdx = linear(row, altCol, size);
          const intendedIdx = linear(row, intendedCol, size);

          const altRegion = regionMap.regions[altIdx]!;
          const intendedRegion = regionMap.regions[intendedIdx]!;

          // Try swapping this cell into the intended region
          if (altRegion !== intendedRegion) {
            const newRegions = [...regionMap.regions];
            newRegions[altIdx] = intendedRegion;

            // Test if this change still allows the intended solution AND maintains contiguity
            const testMap: RegionMap = { width: size, height: size, regions: newRegions };

            // Check contiguity first (faster than finding all solutions)
            if (!areRegionsContiguous(testMap)) {
              continue; // Skip this swap if it breaks contiguity
            }

            const testSolutions = findAllSolutions(testMap);
            const hasIntended = testSolutions.some(
              (sol) => JSON.stringify(sol) === JSON.stringify(solution),
            );

            if (hasIntended && testSolutions.length < allSolutions.length) {
              // Track the best swap (one that reduces solutions the most)
              if (!bestSwap || testSolutions.length < bestSwap.count) {
                bestSwap = { regions: newRegions, count: testSolutions.length };
              }
            }
          }
        }
      }
    }

    if (bestSwap) {
      // Apply the best swap we found
      regionMap.regions = bestSwap.regions;
    } else {
      // Couldn't make progress, stop trying
      break;
    }

    attempts++;
  }

  return regionMap;
};

/**
 * Check if all regions in a RegionMap are contiguous (all cells of same region are connected)
 */
export const areRegionsContiguous = (regionMap: RegionMap): boolean => {
  const { width, regions } = regionMap;
  const size = width; // assuming square grid

  // Get all unique region IDs
  const regionIds = Array.from(new Set(regions));

  // Directions for adjacency (4-connected)
  const dirs: Array<[number, number]> = [
    [-1, 0],
    [0, 1],
    [1, 0],
    [0, -1],
  ];

  // For each region, check if all cells are connected
  for (const regionId of regionIds) {
    // Find all cells in this region
    const cellsInRegion = regions
      .map((val, idx) => (val === regionId ? idx : -1))
      .filter((idx) => idx !== -1);

    if (cellsInRegion.length === 0) continue;

    // BFS from first cell to see if we can reach all cells in region
    const visited = new Set<number>();
    const queue = [cellsInRegion[0]!];
    visited.add(cellsInRegion[0]!);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const row = Math.floor(current / size);
      const col = current % size;

      for (const [dr, dc] of dirs) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          const neighborIdx = linear(nr, nc, size);
          if (regions[neighborIdx] === regionId && !visited.has(neighborIdx)) {
            visited.add(neighborIdx);
            queue.push(neighborIdx);
          }
        }
      }
    }

    // If we didn't visit all cells in this region, it's not contiguous
    if (visited.size !== cellsInRegion.length) {
      return false;
    }
  }

  return true;
};
