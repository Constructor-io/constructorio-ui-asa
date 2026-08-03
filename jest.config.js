// jest.config.js
const moduleNameMapper = {
  '\\.(css|less|scss|sass)$': '<rootDir>/spec/styleMock.js',
  // The client's types live in a .d.ts-only directory that Jest cannot
  // resolve at runtime; nothing runtime is needed from it.
  '@constructor-io/constructorio-client-javascript/lib/types$': '<rootDir>/spec/styleMock.js',
};

// Shared across both projects: mocks are reset around every test so no case
// leaks state into the next one.
const mockHygiene = {
  clearMocks: true,
  resetMocks: false,
  restoreMocks: true,
};

module.exports = {
  // Tests live in spec/, mirroring the src/ tree, so the published package
  // source stays free of test files. See spec/README.md.
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js,jsx}',
    '!src/**/*.stories.{ts,tsx}',
    '!src/stories/**',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/types.ts',
    '!src/utils/typeHelpers.ts',
    '!src/version.ts',
    '!src/generateVersion.js',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80,
    },
  },
  projects: [
    {
      ...mockHygiene,
      displayName: 'client',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/spec/**/*.test.(js|jsx|ts|tsx)'],
      // `.server.test.*` files belong to the `server` project below. A `!`
      // negation in testMatch is not honoured, so exclude them by path.
      testPathIgnorePatterns: ['\\.server\\.test\\.'],
      setupFilesAfterEnv: ['<rootDir>/spec/setupTests.ts'],
      moduleNameMapper,
    },
    {
      ...mockHygiene,
      displayName: 'server',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/spec/**/*.server.test.(js|jsx|ts|tsx)'],
      // A separate setup file: spec/setupTests.ts touches `window`/`document`
      // at module scope, which don't exist in this Node environment.
      setupFilesAfterEnv: ['<rootDir>/spec/setupTests.server.ts'],
      moduleNameMapper,
    },
  ],
};
