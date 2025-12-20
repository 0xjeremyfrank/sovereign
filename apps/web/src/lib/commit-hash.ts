import { keccak256, encodePacked, toBytes } from 'viem';
import { encodeBoard, type BoardState } from '@sovereign/engine';

export const generateCommitHash = (
  contestId: bigint,
  solver: `0x${string}`,
  encodedSolution: string,
  salt: `0x${string}`,
): `0x${string}` => {
  const solutionBytes = toBytes(encodedSolution);
  const solutionHash = keccak256(solutionBytes);

  return keccak256(
    encodePacked(
      ['uint256', 'address', 'bytes32', 'bytes32'],
      [contestId, solver, solutionHash, salt],
    ),
  );
};

export const generateCommitHashFromBoard = (
  contestId: bigint,
  solver: `0x${string}`,
  board: BoardState,
  salt: `0x${string}`,
): `0x${string}` => {
  const encodedSolution = encodeBoard(board);
  return generateCommitHash(contestId, solver, encodedSolution, salt);
};
