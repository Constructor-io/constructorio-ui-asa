// jest.config.js
module.exports = {
  projects: [
    {
      displayName: 'client',
      testEnvironment: 'jsdom',
      testMatch: ['**/**/*.test.(js|jsx|ts|tsx)', '!**/**/*.server.test.(js|jsx|ts|tsx)'],
      setupFilesAfterEnv: ['<rootDir>/spec/setupTests.ts'],
    },
    {
      displayName: 'server',
      testEnvironment: 'node',
      testMatch: ['**/**/*.server.test.(js|jsx)'],
    },
  ],
};
