import { renderHook, act, waitFor } from '@testing-library/react';
import useThreadList from '../../../src/hooks/persistence/useThreadList';
import type { ChatPersistence, ThreadSummary } from '../../../src/types';

const summary = (threadId: string): ThreadSummary => ({
  threadId,
  title: threadId,
  createdAt: 1,
  updatedAt: 1,
  inFlight: false,
});

function storeWith(listThreads: ChatPersistence['listThreads']) {
  return { current: { listThreads } as unknown as ChatPersistence };
}

describe('useThreadList', () => {
  it('starts empty and does nothing without a store', async () => {
    const { result } = renderHook(() => useThreadList({ current: undefined }));
    await act(() => result.current.refreshThreads());
    expect(result.current.threads).toEqual([]);
  });

  it('reads the list from the store', async () => {
    const storeRef = storeWith(async () => [summary('a')]);
    const { result } = renderHook(() => useThreadList(storeRef));
    await act(() => result.current.refreshThreads());
    expect(result.current.threads.map((t) => t.threadId)).toEqual(['a']);
  });

  it('lets only the latest read land', async () => {
    let resolveSlow!: (list: ThreadSummary[]) => void;
    const slow = new Promise<ThreadSummary[]>((r) => {
      resolveSlow = r;
    });
    const listThreads = jest
      .fn<Promise<ThreadSummary[]>, []>()
      .mockReturnValueOnce(slow)
      .mockResolvedValueOnce([summary('fresh')]);
    const { result } = renderHook(() => useThreadList(storeWith(listThreads)));

    act(() => {
      result.current.refreshThreads();
    });
    await act(() => result.current.refreshThreads());
    await waitFor(() => expect(result.current.threads.map((t) => t.threadId)).toEqual(['fresh']));

    await act(async () => {
      resolveSlow([summary('stale')]);
      await slow;
    });
    expect(result.current.threads.map((t) => t.threadId)).toEqual(['fresh']);
  });

  it('invalidate drops a read still in flight', async () => {
    let resolve!: (list: ThreadSummary[]) => void;
    const pending = new Promise<ThreadSummary[]>((r) => {
      resolve = r;
    });
    const { result } = renderHook(() => useThreadList(storeWith(() => pending)));
    act(() => {
      result.current.refreshThreads();
    });
    result.current.invalidate();
    await act(async () => {
      resolve([summary('late')]);
      await pending;
    });
    expect(result.current.threads).toEqual([]);
  });

  it('ignores a failing store', async () => {
    const storeRef = storeWith(() => Promise.reject(new Error('boom')));
    const { result } = renderHook(() => useThreadList(storeRef));
    await act(() => result.current.refreshThreads());
    expect(result.current.threads).toEqual([]);
  });
});
