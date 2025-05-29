module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 95,
      statements: 95,
    },
  },
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/helpers/',
    '/tests/testUtils/',
    '/tests/utils/',
    '/tests/mocks/',
  ],
};