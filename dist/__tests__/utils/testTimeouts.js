"use strict";
/**
 * Test Timeout Configuration
 *
 * This module provides standardized timeout values for different types of tests
 * in the MAAS MCP Server codebase. It helps ensure consistent timeout handling
 * across the test suite.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TIMEOUT_MULTIPLIERS = exports.TEST_TIMEOUTS = void 0;
exports.getAdjustedTimeout = getAdjustedTimeout;
exports.getTimeoutForOperation = getTimeoutForOperation;
exports.setTimeoutForOperation = setTimeoutForOperation;
exports.isCI = isCI;
exports.getCurrentEnvironment = getCurrentEnvironment;
exports.setAutoTimeout = setAutoTimeout;
/**
 * Standard timeout values for different types of tests (in milliseconds)
 */
exports.TEST_TIMEOUTS = {
    /**
     * For quick operations like simple cache operations or basic async functions
     * Examples: Cache get/set, simple promise resolutions
     */
    QUICK: 500,
    /**
     * For medium-length operations like basic API calls or abort signal handling
     * Examples: GET requests, abort signal tests, basic event handling
     */
    MEDIUM: 1000,
    /**
     * For long-running operations like file uploads or complex API calls
     * Examples: File uploads, machine deployments, multiple sequential API calls
     */
    LONG: 5000,
    /**
     * For integration tests that involve multiple components
     * Examples: End-to-end tests, server setup and teardown, complex workflows
     */
    INTEGRATION: 15000
};
/**
 * Environment-specific timeout multipliers
 *
 * These multipliers can be used to adjust timeouts based on the environment
 * (e.g., CI/CD vs local development) to account for different performance characteristics.
 */
exports.TIMEOUT_MULTIPLIERS = {
    /**
     * Multiplier for CI/CD environments where tests might run slower
     * due to shared resources or virtualization
     */
    CI: 1.5,
    /**
     * Multiplier for local development environments
     */
    LOCAL: 1.0
};
/**
 * Get an environment-adjusted timeout value
 *
 * @param baseTimeout The base timeout value in milliseconds
 * @param environment The environment ('ci' or 'local')
 * @returns The adjusted timeout value
 */
function getAdjustedTimeout(baseTimeout, environment = 'local') {
    const multiplier = environment === 'ci' ? exports.TIMEOUT_MULTIPLIERS.CI : exports.TIMEOUT_MULTIPLIERS.LOCAL;
    return Math.round(baseTimeout * multiplier);
}
/**
 * Helper function to set timeouts for specific operation types
 *
 * @param operationType The type of operation ('quick', 'medium', 'long', 'integration')
 * @param environment The environment ('ci' or 'local')
 * @returns The appropriate timeout value
 */
function getTimeoutForOperation(operationType, environment = 'local') {
    let baseTimeout;
    switch (operationType) {
        case 'quick':
            baseTimeout = exports.TEST_TIMEOUTS.QUICK;
            break;
        case 'medium':
            baseTimeout = exports.TEST_TIMEOUTS.MEDIUM;
            break;
        case 'long':
            baseTimeout = exports.TEST_TIMEOUTS.LONG;
            break;
        case 'integration':
            baseTimeout = exports.TEST_TIMEOUTS.INTEGRATION;
            break;
        default:
            baseTimeout = exports.TEST_TIMEOUTS.MEDIUM;
    }
    return getAdjustedTimeout(baseTimeout, environment);
}
/**
 * Helper function to set Jest timeout for the current test or suite
 *
 * @param operationType The type of operation ('quick', 'medium', 'long', 'integration')
 * @param environment The environment ('ci' or 'local')
 */
function setTimeoutForOperation(operationType, environment = 'local') {
    const timeout = getTimeoutForOperation(operationType, environment);
    jest.setTimeout(timeout);
}
/**
 * Determine if the current environment is CI/CD
 *
 * @returns true if running in a CI/CD environment, false otherwise
 */
function isCI() {
    return Boolean(process.env.CI) || Boolean(process.env.GITHUB_ACTIONS);
}
/**
 * Get the current environment type
 *
 * @returns 'ci' if running in a CI/CD environment, 'local' otherwise
 */
function getCurrentEnvironment() {
    return isCI() ? 'ci' : 'local';
}
/**
 * Set timeout based on operation type and automatically detect environment
 *
 * @param operationType The type of operation ('quick', 'medium', 'long', 'integration')
 */
function setAutoTimeout(operationType) {
    const environment = getCurrentEnvironment();
    setTimeoutForOperation(operationType, environment);
}
