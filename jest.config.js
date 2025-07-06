module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 45,
      functions: 55,
      lines: 60,
      statements: 60,
    },
  },
  testMatch: ['<rootDir>/test/**/*.(test|spec).(ts|js)'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/test/helpers/',
    '/test/testUtils/',
    '/test/utils/',
    '/test/mocks/',
  ],
};