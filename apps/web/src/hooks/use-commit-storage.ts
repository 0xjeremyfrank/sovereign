import { useCallback } from 'react';
import { useChainId } from 'wagmi';
import { useConnection } from 'wagmi';
import { keccak256, toBytes } from 'viem';
import { encodeBoard, type BoardState } from '@sovereign/engine';

const STORAGE_PREFIX = 'sovereign_commit';

export interface StoredCommitData {
  contestId: string;
  salt: string;
  encodedSolution: string;
  solutionHash: string;
  commitHash: string;
  committedAt: number;
  chainId: number;
  address: `0x${string}`;
}

const getStorageKey = (chainId: number, contestId: bigint, address: `0x${string}`): string => {
  return `${STORAGE_PREFIX}_${chainId}_${contestId}_${address.toLowerCase()}`;
};

export const generateSalt = (): `0x${string}` => {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  return `0x${Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')}` as `0x${string}`;
};

export const useCommitStorage = () => {
  const chainId = useChainId();
  const { address } = useConnection();

  const storeCommitData = useCallback(
    (contestId: bigint, board: BoardState, salt: `0x${string}`, commitHash: `0x${string}`) => {
      if (!address) return;

      if (typeof window === 'undefined') return;

      const encodedSolution = encodeBoard(board);
      const solutionBytes = toBytes(encodedSolution);
      const solutionHash = keccak256(solutionBytes);

      const data: StoredCommitData = {
        contestId: contestId.toString(),
        chainId,
        address,
        salt,
        encodedSolution,
        solutionHash,
        commitHash,
        committedAt: Date.now(),
      };

      const key = getStorageKey(chainId, contestId, address);
      try {
        window.localStorage.setItem(key, JSON.stringify(data));
      } catch (error) {
        console.error('[CommitStorage] Failed to store commit data:', error);
      }
    },
    [chainId, address],
  );

  const getCommitData = useCallback(
    (contestId: bigint): StoredCommitData | null => {
      if (!address) return null;

      if (typeof window === 'undefined') return null;

      const key = getStorageKey(chainId, contestId, address);
      try {
        const stored = window.localStorage.getItem(key);
        if (!stored) return null;

        const data = JSON.parse(stored) as StoredCommitData;
        if (data.chainId !== chainId || data.address.toLowerCase() !== address.toLowerCase()) {
          return null;
        }
        return data;
      } catch (error) {
        console.error('[CommitStorage] Failed to retrieve commit data:', error);
        return null;
      }
    },
    [chainId, address],
  );

  const hasCommitData = useCallback(
    (contestId: bigint): boolean => {
      return getCommitData(contestId) !== null;
    },
    [getCommitData],
  );

  const clearCommitData = useCallback(
    (contestId: bigint) => {
      if (!address) return;

      if (typeof window === 'undefined') return;

      const key = getStorageKey(chainId, contestId, address);
      try {
        window.localStorage.removeItem(key);
      } catch (error) {
        console.error('[CommitStorage] Failed to clear commit data:', error);
      }
    },
    [chainId, address],
  );

  return {
    storeCommitData,
    getCommitData,
    hasCommitData,
    clearCommitData,
  };
};
