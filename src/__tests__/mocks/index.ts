/**
 * @file Unified Test Utilities API
 *
 * This file serves as a centralized entry point for all test utilities in the MAAS MCP Server project.
 * It exports all mock factories, utility functions, and predefined configurations from the various
 * test utility modules, making them easier to import and use in tests.
 */

// Re-export from mockAuditLogger
export {
  createMockAuditLogger,
  mockAuditLoggerConfigs,
  setupMockAuditLogger,
  getAuditLoggerCallCounts,
  type MockAuditLoggerOptions,
  type AuditLoggerCallCounts
} from './mockAuditLogger.js';

// Re-export from mockCacheManager
export {
  createMockCacheManager,
  mockCacheManagerConfigs,
  setupMockCacheManager,
  mockCacheEntry,
  type MockCacheManagerOptions
} from './mockCacheManager.js';

// Re-export from mockMaasApiClient
export {
  createMockMaasApiClient,
  mockClientConfigs,
  mockMachines,
  mockMachine,
  mockEmptyResult,
  mockErrorResponse
} from './mockMaasApiClient.js';

// Re-export from mockResourceUtils
export {
  createMockResourceUtils,
  mockResourceUtilsConfigs,
  setupMockResourceUtils,
  // Rename extractRegisteredCallback to avoid conflict with testUtils
  extractRegisteredCallback as extractResourceUtilsCallback,
  type MockResourceUtilsOptions
} from './mockResourceUtils.js';

// Re-export from testUtils
export {
  setupResourceUtilsMocks,
  setupTestDependencies,
  extractRegisteredCallback,
  createMockAbortSignal,
  createMockUrl,
  assertResourceRegistration,
  assertCacheOperationLogged,
  assertResourceAccessLogged,
  assertResourceAccessFailureLogged,
  type SetupResourceUtilsMocksOptions,
  type SetupTestDependenciesOptions,
  type TestDependencies
} from './testUtils.js';

/**
 * Categorized exports for documentation purposes.
 * These objects provide a structured view of the available utilities
 * but are not intended to be used directly in code.
 */

// Mock factory functions
export const factories = {
  createMockAuditLogger,
  createMockCacheManager,
  createMockMaasApiClient,
  createMockResourceUtils,
  createMockAbortSignal,
  createMockUrl
};

// Predefined configurations
export const configurations = {
  mockAuditLoggerConfigs,
  mockCacheManagerConfigs,
  mockClientConfigs,
  mockResourceUtilsConfigs
};

// Setup utilities
export const setup = {
  setupMockAuditLogger,
  setupMockCacheManager,
  setupMockResourceUtils,
  setupResourceUtilsMocks,
  setupTestDependencies
};

// Assertion utilities
export const assertions = {
  assertResourceRegistration,
  assertCacheOperationLogged,
  assertResourceAccessLogged,
  assertResourceAccessFailureLogged
};

// Utility functions
export const utils = {
  extractRegisteredCallback,
  extractResourceUtilsCallback,
  getAuditLoggerCallCounts
};