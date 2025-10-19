import { createRng } from './prng';
import type { RegionMap } from './types';

const linear = (row: number, col: number, size: number): number => row * size + col;

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

export const generateRegionMap = (seed: string, size: number): RegionMap => {
  const rng = createRng(seed + ':' + size);
  const numRegions = size; // One region per row/column (standard n-Queens style)
  const totalCells = size * size;

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

  // Grow regions using flood-fill to ensure contiguity
  for (let regionId = 0; regionId < numRegions; regionId++) {
    const regionSize =
      regionId < numRegions - 1 ? targetSizePerRegion : totalCells - regionId * targetSizePerRegion;

    // Find unassigned cells
    const unassigned = regions
      .map((val, idx) => (val === -1 ? idx : -1))
      .filter((idx) => idx !== -1);

    if (unassigned.length === 0) break;

    // Pick random starting cell
    const startIdx = unassigned[Math.floor(rng() * unassigned.length)]!;
    const frontier: number[] = [startIdx];
    const inRegion: Set<number> = new Set([startIdx]);
    regions[startIdx] = regionId;

    // Grow region using BFS with randomization
    while (inRegion.size < regionSize && frontier.length > 0) {
      // Pick random cell from frontier
      const frontierIdx = Math.floor(rng() * frontier.length);
      const currentIdx = frontier[frontierIdx]!;
      frontier.splice(frontierIdx, 1);

      // Get unassigned neighbors
      const neighbors = shuffle(
        getNeighbors(currentIdx).filter((n) => regions[n] === -1),
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

  return { width: size, height: size, regions };
};

/**
 * Check if all regions in a RegionMap are contiguous (all cells of same region are connected)
 */
export const areRegionsContiguous = (regionMap: RegionMap): boolean => {
  const { width, height, regions } = regionMap;
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
