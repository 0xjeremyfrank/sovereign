import { describe, it, expect } from 'vitest';
import { createRng } from '../src/prng';
import { generateLogicSolvablePuzzle } from '../src/optimizer';

describe('Hex Seed (bytes32) Determinism', () => {
  it('createRng produces identical sequences from same hex seed', () => {
    // Simulate a bytes32 globalSeed from contract
    const hexSeed = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

    const rng1 = createRng(hexSeed);
    const rng2 = createRng(hexSeed);

    // Generate sequence of 100 numbers
    const sequence1 = Array.from({ length: 100 }, () => rng1());
    const sequence2 = Array.from({ length: 100 }, () => rng2());

    expect(sequence1).toEqual(sequence2);
  });

  it('different hex seeds produce different sequences', () => {
    const seed1 = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const seed2 = '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321';

    const rng1 = createRng(seed1);
    const rng2 = createRng(seed2);

    const value1 = rng1();
    const value2 = rng2();

    expect(value1).not.toEqual(value2);
  });

  it('generateLogicSolvablePuzzle is deterministic with hex seed', () => {
    // Simulate a bytes32 globalSeed from contract
    const hexSeed = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    const size = 5; // Use smaller size for faster test

    const puzzle1 = generateLogicSolvablePuzzle(hexSeed, size, {
      requireLogicSolvable: false, // Faster, just test determinism
      maxOptimizationIterations: 50,
    });

    const puzzle2 = generateLogicSolvablePuzzle(hexSeed, size, {
      requireLogicSolvable: false,
      maxOptimizationIterations: 50,
    });

    expect(puzzle1.regions).toEqual(puzzle2.regions);
    expect(puzzle1.width).toEqual(puzzle2.width);
    expect(puzzle1.height).toEqual(puzzle2.height);
  });

  it('generateLogicSolvablePuzzle produces different puzzles for different hex seeds', () => {
    const seed1 = '0x1111111111111111111111111111111111111111111111111111111111111111';
    const seed2 = '0x2222222222222222222222222222222222222222222222222222222222222222';
    const size = 5;

    const puzzle1 = generateLogicSolvablePuzzle(seed1, size, {
      requireLogicSolvable: false,
      maxOptimizationIterations: 50,
    });

    const puzzle2 = generateLogicSolvablePuzzle(seed2, size, {
      requireLogicSolvable: false,
      maxOptimizationIterations: 50,
    });

    // Different seeds should produce different puzzles
    expect(puzzle1.regions).not.toEqual(puzzle2.regions);
  });

  it('hex seed format matches what contract produces', () => {
    // Contract produces: keccak256(abi.encodePacked(seedSource, contestId))
    // Which is a bytes32 represented as 0x + 64 hex chars
    const contractStyleSeed = '0x' + 'a'.repeat(64);

    expect(contractStyleSeed.length).toBe(66); // 0x + 64 chars

    const rng1 = createRng(contractStyleSeed);
    const rng2 = createRng(contractStyleSeed);

    expect(rng1()).toEqual(rng2());
  });

  it('works with actual keccak256-like output format', () => {
    // Real example of what a keccak256 hash looks like
    const realishSeed = '0x8f3b4e2c1a9d7e6f5b3c2a1d8e7f6b5c4a3d2e1f9b8c7a6d5e4f3c2b1a9d8e7f';

    const puzzle1 = generateLogicSolvablePuzzle(realishSeed, 6, {
      requireLogicSolvable: false,
      maxOptimizationIterations: 50,
    });

    const puzzle2 = generateLogicSolvablePuzzle(realishSeed, 6, {
      requireLogicSolvable: false,
      maxOptimizationIterations: 50,
    });

    expect(puzzle1.regions).toEqual(puzzle2.regions);
  });
});
