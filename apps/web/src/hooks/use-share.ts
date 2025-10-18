import { useCallback, useState } from 'react';
import { encodeBoard, type BoardState } from '@sovereign/engine';

export const useShare = (board: BoardState) => {
  const [copied, setCopied] = useState(false);

  const getUrl = useCallback(() => {
    if (typeof window === 'undefined') return '';
    const encoded = encodeBoard(board);
    const url = new URL(window.location.href);
    url.searchParams.set('state', encoded);
    return url.toString();
  }, [board]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(getUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }, [getUrl]);

  return { url: getUrl(), copy, copied };
};
