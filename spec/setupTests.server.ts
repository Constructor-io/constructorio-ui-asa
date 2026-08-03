// Jest setup for the `server` project (testEnvironment: 'node').
//
// Deliberately does NOT import '@testing-library/jest-dom' or touch
// `window`/`document`: SSR tests assert on the HTML string produced by
// ReactDOMServer, and the point of the environment is that no DOM exists.

// React logs `useLayoutEffect does nothing on the server` for every hook that
// uses it. That warning is expected here and only adds noise, so it is
// filtered while any other console.error still surfaces (and fails loudly).
const originalConsoleError = console.error;

beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const [first] = args;
    if (typeof first === 'string' && first.includes('useLayoutEffect does nothing on the server')) {
      return;
    }
    originalConsoleError(...args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
});
