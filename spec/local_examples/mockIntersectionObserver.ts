type ObserverCallback = (entries: Array<{ isIntersecting: boolean }>) => void;

export interface MockIntersectionObserver {
  /** jest.fn spying on `observe`. */
  observe: jest.Mock;
  /** jest.fn spying on `disconnect`. */
  disconnect: jest.Mock;
  /** Drives every live observer's callback with the given intersection state. */
  trigger: (isIntersecting: boolean) => void;
  /** Restores the IntersectionObserver that was installed before setup. */
  restore: () => void;
}

/**
 * Swaps `global.IntersectionObserver` for a controllable stub. The default jsdom stub
 * (in setupTests) never invokes its callback, so tests that assert view/impression
 * behavior use this to fire intersections on demand. Call in `beforeEach` and
 * `restore()` in `afterEach`.
 */
export function mockIntersectionObserver(): MockIntersectionObserver {
  const callbacks: ObserverCallback[] = [];
  const observe = jest.fn();
  const disconnect = jest.fn();
  const original = global.IntersectionObserver;

  global.IntersectionObserver = function IntersectionObserverMock(cb: ObserverCallback) {
    callbacks.push(cb);
    return {
      observe,
      disconnect,
      unobserve: () => {},
      takeRecords: () => [],
      root: null,
      rootMargin: '',
      thresholds: [],
    };
  } as unknown as typeof IntersectionObserver;

  return {
    observe,
    disconnect,
    trigger: (isIntersecting: boolean) => {
      callbacks.forEach((cb) => cb([{ isIntersecting }]));
    },
    restore: () => {
      global.IntersectionObserver = original;
    },
  };
}
