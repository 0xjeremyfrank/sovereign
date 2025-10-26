import {
  generateLogicSolvablePuzzle,
  type RegionMap,
  type GenerationOptions,
} from '@sovereign/engine';

// Worker message types
export interface GenerateMessage {
  type: 'GENERATE';
  payload: {
    seed: string;
    size: number;
    options: GenerationOptions;
  };
}

export interface GenerateResponse {
  type: 'SUCCESS';
  payload: RegionMap;
}

export interface GenerateError {
  type: 'ERROR';
  payload: {
    message: string;
    error: string;
  };
}

// Handle messages from the main thread
self.addEventListener('message', (event: MessageEvent<GenerateMessage>) => {
  const { type, payload } = event.data;

  if (type === 'GENERATE') {
    try {
      console.log(`[Worker] Generating puzzle - size: ${payload.size}, seed: ${payload.seed}`);
      const puzzle = generateLogicSolvablePuzzle(payload.seed, payload.size, payload.options);
      console.log(`[Worker] Puzzle generated successfully`);

      const response: GenerateResponse = {
        type: 'SUCCESS',
        payload: puzzle,
      };
      self.postMessage(response);
    } catch (error) {
      console.error('[Worker] Failed to generate puzzle:', error);
      const errorResponse: GenerateError = {
        type: 'ERROR',
        payload: {
          message: error instanceof Error ? error.message : 'Unknown error',
          error: String(error),
        },
      };
      self.postMessage(errorResponse);
    }
  }
});

// Signal that the worker is ready
self.postMessage({ type: 'READY' });
