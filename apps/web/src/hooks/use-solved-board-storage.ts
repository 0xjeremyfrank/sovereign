import { useCallback } from 'react';
import { encodeBoard, type BoardState } from '@sovereign/engine';
import { useConnection, useChainId } from 'wagmi';

const STORAGE_PREFIX = 'contest_board';

interface StoredSolvedBoard {
  contestId: string;
  chainId: number;
  address: `0x${string}`;
  encodedBoard: string;
  solvedAt: number;
  size: number;
}

const getStorageKey = (chainId: number, contestId: bigint, address: `0x${string}`): string => {
  return `${STORAGE_PREFIX}_${chainId}_${contestId}_${address.toLowerCase()}`;
};

export const useSolvedBoardStorage = () => {
  const chainId = useChainId();
  const { address } = useConnection();

  const storeSolvedBoard = useCallback(
    (contestId: bigint, board: BoardState, size: number) => {
      if (!address) return;

      const encodedBoard = encodeBoard(board);
      const data: StoredSolvedBoard = {
        contestId: contestId.toString(),
        chainId,
        address,
        encodedBoard,
        solvedAt: Date.now(),
        size,
      };

      if (typeof window === 'undefined') return;

      const key = getStorageKey(chainId, contestId, address);
      try {
        window.localStorage.setItem(key, JSON.stringify(data));
      } catch (error) {
        console.error('[SolvedBoardStorage] Failed to store board:', error);
      }
    },
    [chainId, address],
  );

  const getSolvedBoard = useCallback(
    (contestId: bigint): StoredSolvedBoard | null => {
      if (!address) return null;

      if (typeof window === 'undefined') return null;

      const key = getStorageKey(chainId, contestId, address);
      try {
        const stored = window.localStorage.getItem(key);
        if (!stored) return null;

        const data = JSON.parse(stored) as StoredSolvedBoard;
        // Verify it matches current chain and address
        if (data.chainId !== chainId || data.address.toLowerCase() !== address.toLowerCase()) {
          return null;
        }
        return data;
      } catch (error) {
        console.error('[SolvedBoardStorage] Failed to retrieve board:', error);
        return null;
      }
    },
    [chainId, address],
  );

  const hasSolvedBoard = useCallback(
    (contestId: bigint): boolean => {
      return getSolvedBoard(contestId) !== null;
    },
    [getSolvedBoard],
  );

  const clearSolvedBoard = useCallback(
    (contestId: bigint) => {
      if (!address) return;

      if (typeof window === 'undefined') return;

      const key = getStorageKey(chainId, contestId, address);
      try {
        window.localStorage.removeItem(key);
      } catch (error) {
        console.error('[SolvedBoardStorage] Failed to clear board:', error);
      }
    },
    [chainId, address],
  );

  return {
    storeSolvedBoard,
    getSolvedBoard,
    hasSolvedBoard,
    clearSolvedBoard,
  };
};
