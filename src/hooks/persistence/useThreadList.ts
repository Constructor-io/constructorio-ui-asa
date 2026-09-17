import { MutableRefObject, useCallback, useEffect, useRef, useState } from 'react';
import { ChatPersistence, ThreadSummary } from '../../types';

/** The stored thread list, re-read on demand; only the latest read may land. */
export default function useThreadList(storeRef: MutableRefObject<ChatPersistence | undefined>) {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const requestRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /** Drop the result of any read still in flight. */
  const invalidate = useCallback(() => {
    requestRef.current += 1;
  }, []);

  const refreshThreads = useCallback(async () => {
    const store = storeRef.current;
    if (!store) return;
    requestRef.current += 1;
    const request = requestRef.current;
    try {
      const list = await store.listThreads();
      if (mountedRef.current && request === requestRef.current) setThreads(list);
    } catch {
      /* ignore */
    }
  }, [storeRef]);

  return { threads, setThreads, refreshThreads, invalidate };
}
