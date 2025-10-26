import { useEffect, useRef, useCallback } from 'react';
import type { RegionMap, GenerationOptions } from '@sovereign/engine';
import type {
  GenerateMessage,
  GenerateResponse,
  GenerateError,
} from '../workers/puzzle-generator.worker';

// Worker instance singleton
let workerInstance: Worker | null = null;

const getWorker = (): Worker => {
  if (!workerInstance) {
    // Create worker - Next.js will handle the bundling
    workerInstance = new Worker(new URL('../workers/puzzle-generator.worker.ts', import.meta.url), {
      type: 'module',
    });
  }
  return workerInstance;
};

export interface UsePuzzleWorkerOptions {
  onSuccess: (puzzle: RegionMap) => void;
  onError: (error: Error) => void;
}

export const usePuzzleWorker = ({ onSuccess, onError }: UsePuzzleWorkerOptions) => {
  const callbackRef = useRef<{
    onSuccess: (puzzle: RegionMap) => void;
    onError: (error: Error) => void;
  }>({ onSuccess, onError });
  const retryCountRef = useRef(0);

  // Keep callbacks up to date
  useEffect(() => {
    callbackRef.current = { onSuccess, onError };
  }, [onSuccess, onError]);

  const generatePuzzle = useCallback(
    (seed: string, size: number, options: GenerationOptions, isRetry = false) => {
      const worker = getWorker();

      // Prevent infinite retry loops
      if (isRetry) {
        retryCountRef.current += 1;
        if (retryCountRef.current > 3) {
          console.error('[Puzzle Worker] Max retries exceeded');
          callbackRef.current?.onError(
            new Error('Failed to generate puzzle after multiple attempts'),
          );
          retryCountRef.current = 0;
          return;
        }
      } else {
        retryCountRef.current = 0;
      }

      // Set up one-time message handler
      const handleMessage = (event: MessageEvent) => {
        // Handle READY message (from worker initialization)
        if (event.data.type === 'READY') {
          return;
        }

        const { type, payload } = event.data as GenerateResponse | GenerateError;

        if (type === 'SUCCESS') {
          retryCountRef.current = 0; // Reset on success
          callbackRef.current?.onSuccess(payload);
        } else if (type === 'ERROR') {
          console.error('[Puzzle Worker] Error:', payload.message);
          callbackRef.current?.onError(new Error(payload.message));
        }

        // Clean up listener
        worker.removeEventListener('message', handleMessage);
      };

      worker.addEventListener('message', handleMessage);

      // Send generation request
      const message: GenerateMessage = {
        type: 'GENERATE',
        payload: { seed, size, options },
      };
      worker.postMessage(message);
    },
    [],
  );

  return { generatePuzzle };
};
