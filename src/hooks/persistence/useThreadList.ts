import { MutableRefObject, useCallback, useRef, useState } from 'react';
import { ChatPersistence, ThreadSummary } from '../../types';
import useIsMounted from '../useIsMounted';

/** Whether two thread lists describe the same state, so an unchanged re-read can be dropped. */
function sameThreads(a: ThreadSummary[], b: ThreadSummary[]): boolean {
  return (
    a.length === b.length &&
    a.every((t, i) => {
      const other = b[i];
      return (
        t.threadId === other.threadId &&
        t.updatedAt === other.updatedAt &&
        t.createdAt === other.createdAt &&
        t.inFlight === other.inFlight &&
        t.title === other.title
      );
    })
  );
}

/** The stored thread list, re-read on demand; only the latest read may land. */
export default function useThreadList(storeRef: MutableRefObject<ChatPersistence | undefined>) {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const requestRef = useRef(0);
  const mountedRef = useIsMounted();

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
      if (!mountedRef.current || request !== requestRef.current) return;
      setThreads((prev) => (sameThreads(prev, list) ? prev : list));
    } catch {
      /* ignore */
    }
  }, [storeRef, mountedRef]);

  return { threads, setThreads, refreshThreads, invalidate };
}
