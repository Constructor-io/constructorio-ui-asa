// jest.config.js
module.exports = {
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.server.test.{js,jsx}',
    '!src/**/*.stories.{ts,tsx}',
    '!src/stories/**',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/types.ts',
    '!src/utils/typeHelpers.ts',
    '!src/version.ts',
    '!src/generateVersion.js',
    '!src/bundled.jsx',
    '!src/components/icons/**',
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
      displayName: 'client',
      testEnvironment: 'jsdom',
      testMatch: ['**/**/*.test.(js|jsx|ts|tsx)', '!**/**/*.server.test.(js|jsx|ts|tsx)'],
      setupFilesAfterEnv: ['<rootDir>/spec/setupTests.ts'],
      moduleNameMapper: {
        '\\.(css|less|scss|sass)$': '<rootDir>/spec/styleMock.js',
        // The client's types live in a .d.ts-only directory that Jest cannot
        // resolve at runtime; nothing runtime is needed from it.
        '@constructor-io/constructorio-client-javascript/lib/types$':
          '<rootDir>/spec/styleMock.js',
      },
    },
    {
      displayName: 'server',
      testEnvironment: 'node',
      testMatch: ['**/**/*.server.test.(js|jsx)'],
      moduleNameMapper: {
        '\\.(css|less|scss|sass)$': '<rootDir>/spec/styleMock.js',
        // The client's types live in a .d.ts-only directory that Jest cannot
        // resolve at runtime; nothing runtime is needed from it.
        '@constructor-io/constructorio-client-javascript/lib/types$':
          '<rootDir>/spec/styleMock.js',
      },
    },
  ],
};
