"use strict";
/**
 * Dynamic Timeout Utilities
 *
 * This module provides utilities for calculating dynamic timeouts
 * based on operation complexity and other factors.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplexityLevel = void 0;
exports.calculateDynamicTimeout = calculateDynamicTimeout;
exports.getTimeoutByComplexity = getTimeoutByComplexity;
exports.setTimeoutByComplexity = setTimeoutByComplexity;
exports.getFileUploadTimeout = getFileUploadTimeout;
exports.getApiOperationTimeout = getApiOperationTimeout;
exports.getDatabaseOperationTimeout = getDatabaseOperationTimeout;
const testTimeouts_js_1 = require("./testTimeouts.js");
/**
 * Operation complexity levels
 */
var ComplexityLevel;
(function (ComplexityLevel) {
    ComplexityLevel[ComplexityLevel["MINIMAL"] = 1] = "MINIMAL";
    ComplexityLevel[ComplexityLevel["VERY_LOW"] = 2] = "VERY_LOW";
    ComplexityLevel[ComplexityLevel["LOW"] = 3] = "LOW";
    ComplexityLevel[ComplexityLevel["MODERATE"] = 4] = "MODERATE";
    ComplexityLevel[ComplexityLevel["MEDIUM"] = 5] = "MEDIUM";
    ComplexityLevel[ComplexityLevel["SIGNIFICANT"] = 6] = "SIGNIFICANT";
    ComplexityLevel[ComplexityLevel["HIGH"] = 7] = "HIGH";
    ComplexityLevel[ComplexityLevel["VERY_HIGH"] = 8] = "VERY_HIGH";
    ComplexityLevel[ComplexityLevel["EXTREME"] = 9] = "EXTREME";
    ComplexityLevel[ComplexityLevel["MAXIMUM"] = 10] = "MAXIMUM";
})(ComplexityLevel || (exports.ComplexityLevel = ComplexityLevel = {}));
/**
 * Calculate a dynamic timeout based on operation factors
 *
 * @param factors Factors that affect the operation duration
 * @param baseTimeout Optional base timeout to start from
 * @returns Calculated timeout in milliseconds
 */
function calculateDynamicTimeout(factors, baseTimeout = testTimeouts_js_1.TEST_TIMEOUTS.MEDIUM) {
    let multiplier = 1.0;
    // Apply multipliers based on factors
    if (factors.dataSize) {
        // Adjust for data size (larger data = longer timeout)
        if (factors.dataSize > 10 * 1024 * 1024) { // > 10MB
            multiplier += 1.5;
        }
        else if (factors.dataSize > 1 * 1024 * 1024) { // > 1MB
            multiplier += 1.0;
        }
        else if (factors.dataSize > 100 * 1024) { // > 100KB
            multiplier += 0.5;
        }
        else if (factors.dataSize > 10 * 1024) { // > 10KB
            multiplier += 0.2;
        }
    }
    // Adjust for API call count
    if (factors.apiCallCount) {
        multiplier += Math.min(factors.apiCallCount * 0.3, 2.0);
    }
    // Adjust for database operation count
    if (factors.dbOperationCount) {
        multiplier += Math.min(factors.dbOperationCount * 0.2, 1.5);
    }
    // Adjust for file I/O
    if (factors.hasFileIO) {
        multiplier += 0.5;
    }
    // Adjust for network requests
    if (factors.hasNetworkRequests) {
        multiplier += 0.5;
    }
    // Adjust for progress notifications
    if (factors.hasProgressNotifications) {
        multiplier += 0.3;
    }
    // Adjust for explicit complexity level
    if (factors.complexityLevel) {
        // Scale from 1-10 to a multiplier between 1.0 and 3.0
        const complexityMultiplier = 1.0 + (factors.complexityLevel - 1) * 0.2;
        multiplier = Math.max(multiplier, complexityMultiplier);
    }
    // Calculate the timeout
    const calculatedTimeout = Math.round(baseTimeout * multiplier);
    // Apply environment adjustment
    const environment = (0, testTimeouts_js_1.getCurrentEnvironment)();
    return (0, testTimeouts_js_1.getAdjustedTimeout)(calculatedTimeout, environment);
}
/**
 * Get a timeout based on complexity level
 *
 * @param level Complexity level (1-10)
 * @returns Appropriate timeout in milliseconds
 */
function getTimeoutByComplexity(level) {
    let baseTimeout;
    if (level <= ComplexityLevel.VERY_LOW) {
        baseTimeout = testTimeouts_js_1.TEST_TIMEOUTS.QUICK;
    }
    else if (level <= ComplexityLevel.MEDIUM) {
        baseTimeout = testTimeouts_js_1.TEST_TIMEOUTS.MEDIUM;
    }
    else if (level <= ComplexityLevel.VERY_HIGH) {
        baseTimeout = testTimeouts_js_1.TEST_TIMEOUTS.LONG;
    }
    else {
        baseTimeout = testTimeouts_js_1.TEST_TIMEOUTS.INTEGRATION;
    }
    return calculateDynamicTimeout({ complexityLevel: level }, baseTimeout);
}
/**
 * Set Jest timeout based on operation complexity
 *
 * @param level Complexity level (1-10)
 */
function setTimeoutByComplexity(level) {
    const timeout = getTimeoutByComplexity(level);
    jest.setTimeout(timeout);
}
/**
 * Helper function to get a timeout for file upload operations
 *
 * @param fileSizeBytes Size of the file in bytes
 * @param hasProgressNotifications Whether the upload has progress notifications
 * @returns Appropriate timeout in milliseconds
 */
function getFileUploadTimeout(fileSizeBytes, hasProgressNotifications = false) {
    return calculateDynamicTimeout({
        dataSize: fileSizeBytes,
        hasNetworkRequests: true,
        hasProgressNotifications,
        complexityLevel: ComplexityLevel.HIGH
    }, testTimeouts_js_1.TEST_TIMEOUTS.LONG);
}
/**
 * Helper function to get a timeout for API operations
 *
 * @param apiCallCount Number of API calls involved
 * @param hasProgressNotifications Whether the operation has progress notifications
 * @returns Appropriate timeout in milliseconds
 */
function getApiOperationTimeout(apiCallCount = 1, hasProgressNotifications = false) {
    return calculateDynamicTimeout({
        apiCallCount,
        hasNetworkRequests: true,
        hasProgressNotifications,
        complexityLevel: apiCallCount > 3 ? ComplexityLevel.HIGH : ComplexityLevel.MEDIUM
    });
}
/**
 * Helper function to get a timeout for database operations
 *
 * @param dbOperationCount Number of database operations involved
 * @returns Appropriate timeout in milliseconds
 */
function getDatabaseOperationTimeout(dbOperationCount = 1) {
    return calculateDynamicTimeout({
        dbOperationCount,
        complexityLevel: dbOperationCount > 5 ? ComplexityLevel.HIGH : ComplexityLevel.MEDIUM
    });
}
