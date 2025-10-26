import { createRng } from './prng';
import { hasAtMostSolutions } from './solver';
import { isLogicSolvable } from './logic-solver';
import { generateRegionMapWithConstraints, areRegionsContiguous } from './region';
import type { RegionMap } from './types';

// Cross-platform performance API
interface PerformanceLike {
  now(): number;
}

const getPerformance = (): PerformanceLike => {
  // Check globalThis first (works in Web Workers, browsers, and Node 12+)
  if (typeof globalThis !== 'undefined' && 'performance' in globalThis) {
    return (globalThis as { performance: PerformanceLike }).performance;
  }
  // Fallback for environments without performance API
  return {
    now: () => Date.now(),
  };
};

const performance = getPerformance();

const linear = (row: number, col: number, size: number): number => row * size + col;

const getNeighbors = (idx: number, size: number): number[] => {
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

/**
 * Find all cells on region boundaries (adjacent to different regions)
 */
const findBoundaryCells = (
  regionMap: RegionMap,
): Array<{ idx: number; currentRegion: number; adjacentRegions: number[] }> => {
  const { width, regions } = regionMap;
  const size = width;
  const boundaryCells: Array<{
    idx: number;
    currentRegion: number;
    adjacentRegions: number[];
  }> = [];

  for (let idx = 0; idx < regions.length; idx++) {
    const neighbors = getNeighbors(idx, size);
    const currentRegion = regions[idx]!;
    const adjacentRegions = Array.from(
      new Set(neighbors.map((n) => regions[n]!).filter((r) => r !== currentRegion)),
    );

    if (adjacentRegions.length > 0) {
      boundaryCells.push({ idx, currentRegion, adjacentRegions });
    }
  }

  return boundaryCells;
};

/**
 * Try swapping a random boundary cell to an adjacent region
 * Returns new RegionMap or null if no boundary cells exist
 */
const tryRandomBoundarySwap = (regionMap: RegionMap, rng: () => number): RegionMap | null => {
  const boundaryCells = findBoundaryCells(regionMap);

  if (boundaryCells.length === 0) return null;

  // Pick random boundary cell
  const cell = boundaryCells[Math.floor(rng() * boundaryCells.length)]!;

  // Pick random adjacent region to swap to
  const targetRegion = cell.adjacentRegions[Math.floor(rng() * cell.adjacentRegions.length)]!;

  // Create candidate with swap
  const newRegions = [...regionMap.regions];
  newRegions[cell.idx] = targetRegion;

  return {
    width: regionMap.width,
    height: regionMap.height,
    regions: newRegions,
  };
};

/**
 * Optimize a puzzle for logic-solvability using hill-climbing
 *
 * Takes a unique puzzle and iteratively tweaks region boundaries to improve
 * logic-solvability while maintaining uniqueness and contiguity.
 *
 * @param regionMap - Starting puzzle (should already be unique)
 * @param maxIterations - Maximum optimization iterations (default: 1000 for better quality)
 * @param rng - Random number generator for deterministic behavior
 * @returns Optimized puzzle (maintains uniqueness and contiguity)
 */
export const optimizeForLogicSolvability = (
  regionMap: RegionMap,
  maxIterations: number = 1000,
  rng: () => number,
): RegionMap => {
  let current = regionMap;
  let currentSolvable = isLogicSolvable(current);
  let _iterations = 0;
  let _acceptedSwaps = 0;

  for (let i = 0; i < maxIterations; i++) {
    _iterations++;

    // Try a boundary swap
    const candidate = tryRandomBoundarySwap(current, rng);
    if (!candidate) continue; // No valid boundary cells

    // Check hard constraints (must maintain)
    if (!hasAtMostSolutions(candidate, 1)) continue; // Must stay unique
    if (!areRegionsContiguous(candidate)) continue; // Must stay contiguous

    // Check optimization goal
    const candidateSolvable = isLogicSolvable(candidate);

    // Accept if improved from not-solvable to solvable
    if (candidateSolvable && !currentSolvable) {
      current = candidate;
      currentSolvable = true;
      _acceptedSwaps++;
    } else if (candidateSolvable && currentSolvable && rng() < 0.1) {
      // Simulated annealing: explore even when already good (10% chance)
      current = candidate;
      _acceptedSwaps++;
    }

    // Early exit if logic-solvable (but keep exploring a bit for better shapes)
    if (currentSolvable && i > 50) {
      if (rng() < 0.7) {
        // 70% chance to exit early once solvable
        break;
      }
    }
  }

  return current;
};

/**
 * Options for logic-solvable puzzle generation
 */
export interface GenerationOptions {
  maxOptimizationIterations?: number; // Hill-climbing iterations (default: 500 for faster retries)
  requireLogicSolvable?: boolean; // Retry if not logic-solvable (default: true)
  maxRetries?: number; // Max generation retries (default: 100 for guaranteed success)
}

/**
 * Generate a puzzle optimized for logic-solvability
 *
 * Uses hill-climbing to optimize region boundaries for logic-solvability
 * while maintaining uniqueness and contiguity.
 *
 * @param seed - Random seed for deterministic generation
 * @param size - Board size (5-10)
 * @param options - Generation options
 * @returns Optimized puzzle (unique, contiguous, preferably logic-solvable)
 */
/**
 * Helper to ensure we start with a unique puzzle
 * Uses generateRegionMapWithConstraints which tries harder to achieve uniqueness
 */
const ensureUniquePuzzle = (
  seed: string,
  size: number,
  maxAttempts: number = 50,
): RegionMap | null => {
  // Retry Method 1 with different seeds until we get uniqueness
  // Method 1 has high success rates (72% for 6x6, 62% for 7x7)
  // So retrying is more efficient than using Method 2's expensive findAllSolutions
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const trySeed = attempt === 0 ? seed : `${seed}-unique-${attempt}`;
    const map = generateRegionMapWithConstraints(trySeed, size);

    // Verify it's unique
    if (hasAtMostSolutions(map, 1)) {
      return map;
    }
  }

  return null;
};

export const generateLogicSolvablePuzzle = (
  seed: string,
  size: number,
  options: GenerationOptions = {},
): RegionMap => {
  const {
    maxOptimizationIterations = 500, // Reduced for faster retries when requireLogicSolvable=true
    requireLogicSolvable = true,
    maxRetries = 100, // Increased default for better success rate
  } = options;

  const rng = createRng(seed + ':optimization');
  const startTime = performance.now();

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const attemptStart = performance.now();

    // Generate base puzzle that's ACTUALLY unique
    const baseSeed = attempt === 0 ? seed : `${seed}-retry-${attempt}`;
    const baseMap = ensureUniquePuzzle(baseSeed, size, 20);

    if (!baseMap || !hasAtMostSolutions(baseMap, 1)) {
      if (attempt % 10 === 0) {
        console.log(
          `[Engine] Attempt ${attempt + 1}/${maxRetries}: Failed to generate unique puzzle`,
        );
      }
      continue;
    }

    const uniqueTime = performance.now() - attemptStart;
    if (attempt === 0) {
      console.log(`[Engine] Unique puzzle generated in ${uniqueTime.toFixed(2)}ms`);
    }

    // Optimize for logic-solvability
    const optStart = performance.now();
    const optimized = optimizeForLogicSolvability(baseMap, maxOptimizationIterations, rng);
    const optTime = performance.now() - optStart;

    // Double-check constraints weren't broken
    if (!hasAtMostSolutions(optimized, 1) || !areRegionsContiguous(optimized)) {
      if (attempt % 10 === 0) {
        console.log(
          `[Engine] Attempt ${attempt + 1}/${maxRetries}: Constraints broken during optimization`,
        );
      }
      continue;
    }

    // Check if it meets requirements
    if (requireLogicSolvable) {
      const solvable = isLogicSolvable(optimized);
      if (solvable) {
        const totalTime = performance.now() - startTime;
        console.log(
          `[Engine] Logic-solvable puzzle generated in ${totalTime.toFixed(2)}ms after ${attempt + 1} attempt(s)`,
        );
        console.log(`[Engine] Optimization time: ${optTime.toFixed(2)}ms`);
        return optimized;
      }
      // Try again with new seed
      if (attempt % 10 === 0) {
        console.log(
          `[Engine] Attempt ${attempt + 1}/${maxRetries}: Not logic-solvable, retrying...`,
        );
      }
      continue;
    } else {
      // Return best effort even if not logic-solvable
      const totalTime = performance.now() - startTime;
      console.log(
        `[Engine] Puzzle generated in ${totalTime.toFixed(2)}ms after ${attempt + 1} attempt(s) (may not be logic-solvable)`,
      );
      return optimized;
    }
  }

  // If we couldn't generate a logic-solvable puzzle after all retries, throw an error
  const totalTime = performance.now() - startTime;
  console.error(`[Engine] Failed after ${maxRetries} attempts in ${totalTime.toFixed(2)}ms`);
  throw new Error(
    `Failed to generate logic-solvable puzzle after ${maxRetries} attempts. Consider increasing maxRetries or reducing size.`,
  );
};
