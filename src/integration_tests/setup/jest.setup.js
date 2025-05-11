/**
 * Jest setup for integration tests
 * 
 * This file is executed before each test file is run.
 * It sets up global configuration and utilities for integration tests.
 */

// Increase timeout for all tests
jest.setTimeout(30000);

// Suppress console output during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;

// Only suppress console output if not in debug mode
if (process.env.DEBUG !== 'true') {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
  console.info = jest.fn();
}

// Restore console after all tests
afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.info = originalConsoleInfo;
});

// Add custom matchers
expect.extend({
  toBeSuccessResponse(received) {
    const pass = received.status === 200 && !received.body.isError;
    if (pass) {
      return {
        message: () => `expected ${received} not to be a success response`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a success response`,
        pass: false
      };
    }
  },
  toBeErrorResponse(received) {
    const pass = received.status === 200 && received.body.isError === true;
    if (pass) {
      return {
        message: () => `expected ${received} not to be an error response`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be an error response`,
        pass: false
      };
    }
  }
});

// Add global utility functions
global.waitFor = async (condition, timeout = 5000, interval = 100) => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
};

// Add environment variables for testing
process.env.NODE_ENV = 'test';