/**
 * Dynamic Timeout Utilities
 * 
 * This module provides utilities for calculating dynamic timeouts
 * based on operation complexity and other factors.
 */

import { TEST_TIMEOUTS, getCurrentEnvironment, getAdjustedTimeout } from './testTimeouts.js';

/**
 * Operation complexity levels
 */
export enum ComplexityLevel {
  MINIMAL = 1,
  VERY_LOW = 2,
  LOW = 3,
  MODERATE = 4,
  MEDIUM = 5,
  SIGNIFICANT = 6,
  HIGH = 7,
  VERY_HIGH = 8,
  EXTREME = 9,
  MAXIMUM = 10
}

/**
 * Factors that can affect operation duration
 */
export interface OperationFactors {
  /**
   * Data size in bytes (affects processing time)
   */
  dataSize?: number;
  
  /**
   * Number of API calls involved
   */
  apiCallCount?: number;
  
  /**
   * Number of database operations involved
   */
  dbOperationCount?: number;
  
  /**
   * Whether the operation involves file I/O
   */
  hasFileIO?: boolean;
  
  /**
   * Whether the operation involves network requests
   */
  hasNetworkRequests?: boolean;
  
  /**
   * Whether the operation involves progress notifications
   */
  hasProgressNotifications?: boolean;
  
  /**
   * Custom complexity level (1-10)
   */
  complexityLevel?: ComplexityLevel;
}

/**
 * Calculate a dynamic timeout based on operation factors
 * 
 * @param factors Factors that affect the operation duration
 * @param baseTimeout Optional base timeout to start from
 * @returns Calculated timeout in milliseconds
 */
export function calculateDynamicTimeout(
  factors: OperationFactors,
  baseTimeout: number = TEST_TIMEOUTS.MEDIUM
): number {
  let multiplier = 1.0;
  
  // Apply multipliers based on factors
  if (factors.dataSize) {
    // Adjust for data size (larger data = longer timeout)
    if (factors.dataSize > 10 * 1024 * 1024) { // > 10MB
      multiplier += 1.5;
    } else if (factors.dataSize > 1 * 1024 * 1024) { // > 1MB
      multiplier += 1.0;
    } else if (factors.dataSize > 100 * 1024) { // > 100KB
      multiplier += 0.5;
    } else if (factors.dataSize > 10 * 1024) { // > 10KB
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
  const environment = getCurrentEnvironment();
  return getAdjustedTimeout(calculatedTimeout, environment);
}

/**
 * Get a timeout based on complexity level
 * 
 * @param level Complexity level (1-10)
 * @returns Appropriate timeout in milliseconds
 */
export function getTimeoutByComplexity(level: ComplexityLevel): number {
  let baseTimeout: number;
  
  if (level <= ComplexityLevel.VERY_LOW) {
    baseTimeout = TEST_TIMEOUTS.QUICK;
  } else if (level <= ComplexityLevel.MEDIUM) {
    baseTimeout = TEST_TIMEOUTS.MEDIUM;
  } else if (level <= ComplexityLevel.VERY_HIGH) {
    baseTimeout = TEST_TIMEOUTS.LONG;
  } else {
    baseTimeout = TEST_TIMEOUTS.INTEGRATION;
  }
  
  return calculateDynamicTimeout({ complexityLevel: level }, baseTimeout);
}

/**
 * Set Jest timeout based on operation complexity
 * 
 * @param level Complexity level (1-10)
 */
export function setTimeoutByComplexity(level: ComplexityLevel): void {
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
export function getFileUploadTimeout(
  fileSizeBytes: number,
  hasProgressNotifications: boolean = false
): number {
  return calculateDynamicTimeout({
    dataSize: fileSizeBytes,
    hasNetworkRequests: true,
    hasProgressNotifications,
    complexityLevel: ComplexityLevel.HIGH
  }, TEST_TIMEOUTS.LONG);
}

/**
 * Helper function to get a timeout for API operations
 * 
 * @param apiCallCount Number of API calls involved
 * @param hasProgressNotifications Whether the operation has progress notifications
 * @returns Appropriate timeout in milliseconds
 */
export function getApiOperationTimeout(
  apiCallCount: number = 1,
  hasProgressNotifications: boolean = false
): number {
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
export function getDatabaseOperationTimeout(dbOperationCount: number = 1): number {
  return calculateDynamicTimeout({
    dbOperationCount,
    complexityLevel: dbOperationCount > 5 ? ComplexityLevel.HIGH : ComplexityLevel.MEDIUM
  });
}