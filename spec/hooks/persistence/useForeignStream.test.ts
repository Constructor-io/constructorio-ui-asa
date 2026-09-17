import { renderHook, act } from '@testing-library/react';
import useForeignStream from '../../../src/hooks/persistence/useForeignStream';
import { createChatSession } from '../../../src/hooks/chatSession';

describe('useForeignStream', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('flags the session and the state while watching, then expires', () => {
    const session = createChatSession();
    const onExpire = jest.fn();
    const { result } = renderHook(() => useForeignStream(session));

    act(() => result.current.watch(1000, onExpire));
    expect(result.current.foreignInFlight).toBe(true);
    expect(session.foreignInFlight).toBe(true);

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(result.current.foreignInFlight).toBe(false);
    expect(session.foreignInFlight).toBe(false);
  });

  it('stop clears the flag and cancels the timer', () => {
    const session = createChatSession();
    const onExpire = jest.fn();
    const { result } = renderHook(() => useForeignStream(session));

    act(() => result.current.watch(1000, onExpire));
    act(() => result.current.stop());
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(onExpire).not.toHaveBeenCalled();
    expect(session.foreignInFlight).toBe(false);
  });

  it('a new watch replaces the previous timer', () => {
    const session = createChatSession();
    const first = jest.fn();
    const second = jest.fn();
    const { result } = renderHook(() => useForeignStream(session));

    act(() => result.current.watch(1000, first));
    act(() => result.current.watch(500, second));
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('does not fire after unmount', () => {
    const onExpire = jest.fn();
    const { result, unmount } = renderHook(() => useForeignStream(createChatSession()));
    act(() => result.current.watch(1000, onExpire));
    unmount();
    jest.advanceTimersByTime(1000);
    expect(onExpire).not.toHaveBeenCalled();
  });
});
