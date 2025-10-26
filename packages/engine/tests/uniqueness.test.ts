import { describe, expect, it } from 'vitest';
import { generateRegionMapWithConstraints, findValidSolution, findAllSolutions } from '../src';

describe('solution uniqueness', () => {
  it('generates puzzles with very few solutions (ideally 1, max 3)', () => {
    // The uniqueness enforcement significantly reduces solutions
    // Most 5x5 puzzles achieve uniqueness; some may have 2-3
    const sizes = [5];
    const seeds = ['test-1', 'test-2', 'test-3', 'demo-seed'];

    for (const size of sizes) {
      for (const seed of seeds) {
        const regionMap = generateRegionMapWithConstraints(seed, size);
        const solutions = findAllSolutions(regionMap);

        console.log(`Puzzle ${seed} (${size}x${size}): ${solutions.length} solution(s)`);

        // Expect very few solutions (ideally 1, accept up to 3)
        expect(solutions.length).toBeGreaterThan(0);
        expect(solutions.length).toBeLessThanOrEqual(3);

        if (solutions.length > 1) {
          console.log('  Note: Multiple solutions exist:');
          solutions.forEach((sol, i) => {
            console.log(`    ${i + 1}: [${sol.join(', ')}]`);
          });
        }
      }
    }
  });

  it('verifies the intended solution is among the found solutions', () => {
    const seed = 'test-1';
    const size = 5;

    const intendedSolution = findValidSolution(seed, size);
    const regionMap = generateRegionMapWithConstraints(seed, size);
    const allSolutions = findAllSolutions(regionMap);

    expect(allSolutions.length).toBeGreaterThan(0);

    // Check if intended solution is in the list
    const foundIntended = allSolutions.some(
      (sol) => JSON.stringify(sol) === JSON.stringify(intendedSolution),
    );

    expect(foundIntended).toBe(true);
  });

  it('6x6 puzzles have relatively few solutions (reduced from 10-25 down to <10)', () => {
    const sizes = [6];
    const seeds = ['test-1'];

    for (const size of sizes) {
      for (const seed of seeds) {
        const regionMap = generateRegionMapWithConstraints(seed, size);
        const solutions = findAllSolutions(regionMap);

        console.log(`Puzzle ${seed} (${size}x${size}): ${solutions.length} solution(s)`);

        // Should have at least one solution, significantly reduced from initial generation
        expect(solutions.length).toBeGreaterThan(0);
        expect(solutions.length).toBeLessThanOrEqual(10); // Reasonable limit for 6x6
      }
    }
  });
});
