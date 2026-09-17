import { useCallback, useRef } from 'react';

/** Runs storage writes one after another, in the order they were issued. */
export default function useWriteQueue() {
  const chainRef = useRef<Promise<void>>(Promise.resolve());

  const enqueue = useCallback((run: () => Promise<void>) => {
    chainRef.current = chainRef.current.then(run, run);
    return chainRef.current;
  }, []);

  /** Forget pending writes, so a slow one cannot delay writes into a different store. */
  const reset = useCallback(() => {
    chainRef.current = Promise.resolve();
  }, []);

  return { enqueue, reset };
}
