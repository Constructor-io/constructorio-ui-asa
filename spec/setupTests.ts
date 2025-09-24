// Jest setup file for global mocks
import '@testing-library/jest-dom';

// Mock fetch for all tests
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  }),
) as unknown as typeof fetch;
