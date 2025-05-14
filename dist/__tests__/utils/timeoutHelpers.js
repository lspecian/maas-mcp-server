"use strict";
/**
 * Test Timeout Helpers
 *
 * This module provides utility functions for applying timeouts to tests
 * in a consistent manner across the codebase.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyIntegrationTimeout = exports.applyLongTimeout = exports.applyMediumTimeout = exports.applyQuickTimeout = exports.integrationTest = exports.longTest = exports.mediumTest = exports.quickTest = void 0;
exports.applyTestSuiteTimeout = applyTestSuiteTimeout;
exports.testWithTimeout = testWithTimeout;
const testTimeouts_js_1 = require("./testTimeouts.js");
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
function applyTestSuiteTimeout(operationType, customTimeout) {
    const environment = (0, testTimeouts_js_1.getCurrentEnvironment)();
    let timeout;
    if (customTimeout !== undefined) {
        timeout = customTimeout;
    }
    else {
        switch (operationType) {
            case 'quick':
                timeout = (0, testTimeouts_js_1.getAdjustedTimeout)(testTimeouts_js_1.TEST_TIMEOUTS.QUICK, environment);
                break;
            case 'medium':
                timeout = (0, testTimeouts_js_1.getAdjustedTimeout)(testTimeouts_js_1.TEST_TIMEOUTS.MEDIUM, environment);
                break;
            case 'long':
                timeout = (0, testTimeouts_js_1.getAdjustedTimeout)(testTimeouts_js_1.TEST_TIMEOUTS.LONG, environment);
                break;
            case 'integration':
                timeout = (0, testTimeouts_js_1.getAdjustedTimeout)(testTimeouts_js_1.TEST_TIMEOUTS.INTEGRATION, environment);
                break;
            default:
                timeout = (0, testTimeouts_js_1.getAdjustedTimeout)(testTimeouts_js_1.TEST_TIMEOUTS.MEDIUM, environment);
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
function testWithTimeout(testName, testFn, operationType, customTimeout) {
    const environment = (0, testTimeouts_js_1.getCurrentEnvironment)();
    let timeout;
    if (customTimeout !== undefined) {
        timeout = customTimeout;
    }
    else {
        switch (operationType) {
            case 'quick':
                timeout = (0, testTimeouts_js_1.getAdjustedTimeout)(testTimeouts_js_1.TEST_TIMEOUTS.QUICK, environment);
                break;
            case 'medium':
                timeout = (0, testTimeouts_js_1.getAdjustedTimeout)(testTimeouts_js_1.TEST_TIMEOUTS.MEDIUM, environment);
                break;
            case 'long':
                timeout = (0, testTimeouts_js_1.getAdjustedTimeout)(testTimeouts_js_1.TEST_TIMEOUTS.LONG, environment);
                break;
            case 'integration':
                timeout = (0, testTimeouts_js_1.getAdjustedTimeout)(testTimeouts_js_1.TEST_TIMEOUTS.INTEGRATION, environment);
                break;
            default:
                timeout = (0, testTimeouts_js_1.getAdjustedTimeout)(testTimeouts_js_1.TEST_TIMEOUTS.MEDIUM, environment);
        }
    }
    it(testName, testFn, timeout);
}
/**
 * Shorthand functions for creating tests with specific timeouts
 */
const quickTest = (testName, testFn, customTimeout) => testWithTimeout(testName, testFn, 'quick', customTimeout);
exports.quickTest = quickTest;
const mediumTest = (testName, testFn, customTimeout) => testWithTimeout(testName, testFn, 'medium', customTimeout);
exports.mediumTest = mediumTest;
const longTest = (testName, testFn, customTimeout) => testWithTimeout(testName, testFn, 'long', customTimeout);
exports.longTest = longTest;
const integrationTest = (testName, testFn, customTimeout) => testWithTimeout(testName, testFn, 'integration', customTimeout);
exports.integrationTest = integrationTest;
/**
 * Shorthand functions for applying timeouts to test suites
 */
const applyQuickTimeout = (customTimeout) => applyTestSuiteTimeout('quick', customTimeout);
exports.applyQuickTimeout = applyQuickTimeout;
const applyMediumTimeout = (customTimeout) => applyTestSuiteTimeout('medium', customTimeout);
exports.applyMediumTimeout = applyMediumTimeout;
const applyLongTimeout = (customTimeout) => applyTestSuiteTimeout('long', customTimeout);
exports.applyLongTimeout = applyLongTimeout;
const applyIntegrationTimeout = (customTimeout) => applyTestSuiteTimeout('integration', customTimeout);
exports.applyIntegrationTimeout = applyIntegrationTimeout;
