import { keccak256, encodePacked } from 'viem';
import { encodeBoard, type BoardState } from '@sovereign/engine';

/**
 * Generate a commit hash for a solution.
 * Uses the new packed bytes format where each byte is a column index.
 *
 * @param contestId - Contest ID
 * @param solver - Solver's address
 * @param encodedSolution - Hex-encoded solution (0x{col0}{col1}...)
 * @param salt - Random salt for hiding the solution
 * @returns The commit hash to submit to the contract
 */
export const generateCommitHash = (
  contestId: bigint,
  solver: `0x${string}`,
  encodedSolution: `0x${string}`,
  salt: `0x${string}`,
): `0x${string}` => {
  // Hash the solution bytes
  const solutionHash = keccak256(encodedSolution);

  // Create commit hash: keccak256(abi.encodePacked(contestId, solver, solutionHash, salt))
  return keccak256(
    encodePacked(
      ['uint256', 'address', 'bytes32', 'bytes32'],
      [contestId, solver, solutionHash, salt],
    ),
  );
};

/**
 * Generate a commit hash directly from a board state.
 * Encodes the board as packed bytes before hashing.
 *
 * @param contestId - Contest ID
 * @param solver - Solver's address
 * @param board - The solved board state
 * @param salt - Random salt for hiding the solution
 * @returns The commit hash to submit to the contract
 */
export const generateCommitHashFromBoard = (
  contestId: bigint,
  solver: `0x${string}`,
  board: BoardState,
  salt: `0x${string}`,
): `0x${string}` => {
  // encodeBoard now returns a hex string (0x...)
  const encodedSolution = encodeBoard(board);
  return generateCommitHash(contestId, solver, encodedSolution, salt);
};
