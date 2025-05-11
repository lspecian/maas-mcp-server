/**
 * Jest configuration for integration tests
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/integration_tests/**/*.test.ts'],
  testTimeout: 30000, // Longer timeout for integration tests
  verbose: true,
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/node_modules/**',
    '!src/**/coverage/**'
  ],
  coverageDirectory: 'coverage/integration',
  coverageReporters: ['text', 'lcov', 'clover', 'json'],
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results/integration',
      outputName: 'junit.xml'
    }]
  ],
  setupFilesAfterEnv: [
    '<rootDir>/src/integration_tests/setup/jest.setup.js'
  ],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  }
};