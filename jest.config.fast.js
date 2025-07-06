// Fast test configuration that excludes slow tests
const baseConfig = require('./jest.config.js');

module.exports = {
  ...baseConfig,
  collectCoverage: false, // Disable coverage for fast tests
  coverageThreshold: undefined, // Remove coverage thresholds
  testPathIgnorePatterns: [
    '/node_modules/',
    '/test/code-quality.test.ts',
    // Also ignore slow integration tests if needed
    '/test/integration/outputModes.test.ts',
    '/test/cli.test.ts',
    '/test/cliCore.test.ts'
  ],
};