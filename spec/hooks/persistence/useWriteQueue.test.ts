import { renderHook } from '@testing-library/react';
import useWriteQueue from '../../../src/hooks/persistence/useWriteQueue';

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

describe('useWriteQueue', () => {
  it('runs writes one after another in the order they were queued', async () => {
    const { result } = renderHook(() => useWriteQueue());
    const first = deferred();
    const order: string[] = [];
    result.current.enqueue(async () => {
      await first.promise;
      order.push('first');
    });
    const second = result.current.enqueue(async () => {
      order.push('second');
    });
    expect(order).toEqual([]);

    first.resolve();
    await second;
    expect(order).toEqual(['first', 'second']);
  });

  it('keeps going after a failed write', async () => {
    const { result } = renderHook(() => useWriteQueue());
    result.current.enqueue(() => Promise.reject(new Error('boom')));
    const ran = jest.fn(async () => {});
    await result.current.enqueue(ran);
    expect(ran).toHaveBeenCalled();
  });

  it('reset lets the next write skip a write that never settles', async () => {
    const { result } = renderHook(() => useWriteQueue());
    result.current.enqueue(() => new Promise<never>(() => {}));
    result.current.reset();
    const ran = jest.fn(async () => {});
    await result.current.enqueue(ran);
    expect(ran).toHaveBeenCalled();
  });
});
