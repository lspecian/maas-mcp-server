/**
 * Test Timeout Helpers
 * 
 * This module provides utility functions for applying timeouts to tests
 * in a consistent manner across the codebase.
 */

import { TEST_TIMEOUTS, getCurrentEnvironment, getAdjustedTimeout } from './testTimeouts.js';

/**
 * Apply a timeout to a test suite (describe block)
 * 
 * @param operationType The type of operation ('quick', 'medium', 'long', 'integration')
 * @param customTimeout Optional custom timeout value (overrides the standard timeout)
 * @returns A function that sets the timeout for the current test suite
 * 
 * @example
 * ```
 * describe('My test suite', () => {
 *   // Apply a medium timeout to all tests in this suite
 *   applyTestSuiteTimeout('medium');
 *   
 *   it('should do something', async () => {
 *     // Test implementation
 *   });
 * });
 * ```
 */
export function applyTestSuiteTimeout(
  operationType: 'quick' | 'medium' | 'long' | 'integration',
  customTimeout?: number
): void {
  const environment = getCurrentEnvironment();
  let timeout: number;
  
  if (customTimeout !== undefined) {
    timeout = customTimeout;
  } else {
    switch (operationType) {
      case 'quick':
        timeout = getAdjustedTimeout(TEST_TIMEOUTS.QUICK, environment);
        break;
      case 'medium':
        timeout = getAdjustedTimeout(TEST_TIMEOUTS.MEDIUM, environment);
        break;
      case 'long':
        timeout = getAdjustedTimeout(TEST_TIMEOUTS.LONG, environment);
        break;
      case 'integration':
        timeout = getAdjustedTimeout(TEST_TIMEOUTS.INTEGRATION, environment);
        break;
      default:
        timeout = getAdjustedTimeout(TEST_TIMEOUTS.MEDIUM, environment);
    }
  }
  
  jest.setTimeout(timeout);
}

/**
 * Create a test with a specific timeout
 * 
 * @param testName The name of the test
 * @param testFn The test function
 * @param operationType The type of operation ('quick', 'medium', 'long', 'integration')
 * @param customTimeout Optional custom timeout value (overrides the standard timeout)
 * @returns A test with the specified timeout
 *
 * @example
 * ```
 * // Create a test with a long timeout
 * testWithTimeout(
 *   'should handle a complex operation',
 *   async () => {
 *     // Test implementation
 *   },
 *   'long'
 * );
 *
 * // Create a test with a custom timeout
 * testWithTimeout(
 *   'should handle a very complex operation',
 *   async () => {
 *     // Test implementation
 *   },
 *   'long',
 *   10000 // 10 seconds
 * );
 * ```
 */
export function testWithTimeout(
  testName: string,
  testFn: jest.ProvidesCallback,
  operationType: 'quick' | 'medium' | 'long' | 'integration',
  customTimeout?: number
): void {
  const environment = getCurrentEnvironment();
  let timeout: number;
  
  if (customTimeout !== undefined) {
    timeout = customTimeout;
  } else {
    switch (operationType) {
      case 'quick':
        timeout = getAdjustedTimeout(TEST_TIMEOUTS.QUICK, environment);
        break;
      case 'medium':
        timeout = getAdjustedTimeout(TEST_TIMEOUTS.MEDIUM, environment);
        break;
      case 'long':
        timeout = getAdjustedTimeout(TEST_TIMEOUTS.LONG, environment);
        break;
      case 'integration':
        timeout = getAdjustedTimeout(TEST_TIMEOUTS.INTEGRATION, environment);
        break;
      default:
        timeout = getAdjustedTimeout(TEST_TIMEOUTS.MEDIUM, environment);
    }
  }
  
  it(testName, testFn, timeout);
}

/**
 * Shorthand functions for creating tests with specific timeouts
 */
export const quickTest = (testName: string, testFn: jest.ProvidesCallback, customTimeout?: number) =>
  testWithTimeout(testName, testFn, 'quick', customTimeout);

export const mediumTest = (testName: string, testFn: jest.ProvidesCallback, customTimeout?: number) =>
  testWithTimeout(testName, testFn, 'medium', customTimeout);

export const longTest = (testName: string, testFn: jest.ProvidesCallback, customTimeout?: number) =>
  testWithTimeout(testName, testFn, 'long', customTimeout);

export const integrationTest = (testName: string, testFn: jest.ProvidesCallback, customTimeout?: number) =>
  testWithTimeout(testName, testFn, 'integration', customTimeout);

/**
 * Shorthand functions for applying timeouts to test suites
 */
export const applyQuickTimeout = (customTimeout?: number) => 
  applyTestSuiteTimeout('quick', customTimeout);

export const applyMediumTimeout = (customTimeout?: number) => 
  applyTestSuiteTimeout('medium', customTimeout);

export const applyLongTimeout = (customTimeout?: number) => 
  applyTestSuiteTimeout('long', customTimeout);

export const applyIntegrationTimeout = (customTimeout?: number) => 
  applyTestSuiteTimeout('integration', customTimeout);