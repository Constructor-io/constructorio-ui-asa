// Jest setup file for global mocks
import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';
// jsdom does not expose the WHATWG streams API used by the agent client.
// Node provides it via stream/web.
// eslint-disable-next-line import/no-extraneous-dependencies
import { ReadableStream } from 'node:stream/web';

expect.extend(toHaveNoViolations);

if (!global.ReadableStream) {
  global.ReadableStream = ReadableStream as unknown as typeof globalThis.ReadableStream;
}

// Mock fetch for all tests
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  }),
) as unknown as typeof fetch;

// jsdom does not implement matchMedia — required by the shared component library.
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return false;
      },
    }),
  });
}

// jsdom does not implement ResizeObserver — used by ResultsBlock for responsive layout.
if (!global.ResizeObserver) {
  global.ResizeObserver = class ResizeObserver {
    observe() {}

    unobserve() {}

    disconnect() {}
  };
}

// jsdom does not implement IntersectionObserver — used by the embla carousel.
if (!global.IntersectionObserver) {
  global.IntersectionObserver = class IntersectionObserver {
    observe() {}

    unobserve() {}

    disconnect() {}

    takeRecords() {
      return [];
    }

    root = null;

    rootMargin = '';

    thresholds = [];
  } as unknown as typeof IntersectionObserver;
}

// jsdom does not implement scrollTo — used by ChatMessageList auto-scroll.
if (!window.HTMLElement.prototype.scrollTo) {
  window.HTMLElement.prototype.scrollTo = () => {};
}

// Make requestAnimationFrame synchronous so scroll effects run within tests.
if (!global.requestAnimationFrame) {
  global.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  }) as typeof global.requestAnimationFrame;
}
