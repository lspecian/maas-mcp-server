/**
 * Shared test utilities for MCP resource handler tests
 * Provides common functions for test setup and assertions
 */
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MaasApiClient } from '../../maas/MaasApiClient.js';
import { CacheManager } from '../../mcp_resources/cache/cacheManager.js';
import { createMockMaasApiClient } from './mockMaasApiClient.js';
import { createMockCacheManager } from './mockCacheManager.js';
import { createMockAuditLogger } from './mockAuditLogger.js';
import { createMockResourceUtils } from './mockResourceUtils.js';
import * as actualResourceUtils from '../../mcp_resources/utils/resourceUtils.js';
import auditLogger from '../../utils/auditLogger.js';
import logger from '../../utils/logger.js';
import config from '../../config.js';

/**
 * Options for setting up resource utils mocks
 */
export interface SetupResourceUtilsMocksOptions {
  // Whether to use actual implementations for specific functions
  useActualImplementations?: {
    extractAndValidateParams?: boolean;
    validateResourceData?: boolean;
    handleResourceFetchError?: boolean;
  };
  // Whether to simulate errors for specific functions
  simulateErrors?: {
    extractAndValidateParams?: boolean;
    validateResourceData?: boolean;
    handleResourceFetchError?: boolean;
  };
  // Custom error messages for simulated errors
  errorMessages?: {
    extractAndValidateParams?: string;
    validateResourceData?: string;
    handleResourceFetchError?: string;
  };
  // Custom implementations for specific functions
  customImplementations?: {
    extractAndValidateParams?: typeof actualResourceUtils.extractAndValidateParams;
    validateResourceData?: typeof actualResourceUtils.validateResourceData;
    handleResourceFetchError?: typeof actualResourceUtils.handleResourceFetchError;
  };
}

/**
 * Options for setting up test dependencies
 */
export interface SetupTestDependenciesOptions {
  // Whether to enable caching
  cacheEnabled?: boolean;
  // Whether to enable audit logging
  auditLogEnabled?: boolean;
  // Whether to simulate cache hits
  cacheHits?: boolean;
  // Whether to simulate errors in dependencies
  simulateErrors?: {
    maasApiClient?: boolean;
    cacheManager?: boolean;
    auditLogger?: boolean;
    resourceUtils?: boolean;
  };
  // Resource utils mock options
  resourceUtilsOptions?: SetupResourceUtilsMocksOptions;
}

/**
 * Test dependencies for resource handler tests
 */
export interface TestDependencies {
  mockMcpServer: jest.Mocked<McpServer>;
  mockMaasApiClient: jest.Mocked<MaasApiClient>;
  mockCacheManager: jest.Mocked<CacheManager>;
  mockResourceUtils: jest.Mocked<typeof actualResourceUtils>;
}

/**
 * Extract the registered callback function from a mock server
 * 
 * @param mockServer The mock MCP server instance
 * @param callIndex The index of the resource.mock.calls array to extract from (default: 0)
 * @returns The registered callback function
 */
export function extractRegisteredCallback<T>(
  mockServer: { resource: jest.MockInstance<any, any> },
  callIndex: number = 0
): (...args: any[]) => Promise<T> {
  if (mockServer.resource.mock.calls.length <= callIndex) {
    throw new Error(`No resource registered at index ${callIndex}`);
  }
  
  const call = mockServer.resource.mock.calls[callIndex];
  if (call.length < 3) {
    throw new Error(`Resource call at index ${callIndex} does not have a callback`);
  }
  
  return call[2] as (...args: any[]) => Promise<T>;
}

/**
 * Setup resource utils mocks with selective implementation
 * 
 * @param options Options for setting up resource utils mocks
 * @returns The mocked resource utils functions
 */
export function setupResourceUtilsMocks(
  options: SetupResourceUtilsMocksOptions = {}
): jest.Mocked<typeof actualResourceUtils> {
  const mockResourceUtils = createMockResourceUtils(options);
  
  // Import the module to ensure the mock is loaded
  jest.doMock('../../mcp_resources/utils/resourceUtils.js', () => ({
    extractAndValidateParams: mockResourceUtils.extractAndValidateParams,
    validateResourceData: mockResourceUtils.validateResourceData,
    handleResourceFetchError: mockResourceUtils.handleResourceFetchError
  }));
  
  return mockResourceUtils;
}

/**
 * Setup all test dependencies for resource handler tests
 * 
 * @param options Options for setting up test dependencies
 * @returns The test dependencies
 */
export function setupTestDependencies(
  options: SetupTestDependenciesOptions = {}
): TestDependencies {
  const {
    cacheEnabled = true,
    auditLogEnabled = true,
    cacheHits = false,
    simulateErrors = {
      maasApiClient: false,
      cacheManager: false,
      auditLogger: false,
      resourceUtils: false
    },
    resourceUtilsOptions = {}
  } = options;

  // Clear all mocks
  jest.clearAllMocks();
  
  // Setup mock MCP server
  const mockMcpServer = {
    resource: jest.fn().mockImplementation((name, template, callback) => {
      return { name, template, callback };
    })
  } as unknown as jest.Mocked<McpServer>;
  
  // Setup mock MAAS API client
  const mockMaasApiClient = createMockMaasApiClient({
    errorResponse: simulateErrors.maasApiClient ? new Error('Mock MAAS API error') : undefined
  });
  
  // Setup mock cache manager
  const mockCacheManager = createMockCacheManager({
    enabled: cacheEnabled,
    getCacheHit: cacheHits,
    simulateErrors: simulateErrors.cacheManager
  });
  
  // Setup mock audit logger
  const mockAuditLogger = createMockAuditLogger({
    simulateErrors: simulateErrors.auditLogger
  });
  
  // Setup mock resource utils
  const mockResourceUtils = setupResourceUtilsMocks({
    ...resourceUtilsOptions,
    simulateErrors: {
      ...resourceUtilsOptions.simulateErrors,
      extractAndValidateParams: simulateErrors.resourceUtils || resourceUtilsOptions.simulateErrors?.extractAndValidateParams,
      validateResourceData: simulateErrors.resourceUtils || resourceUtilsOptions.simulateErrors?.validateResourceData,
      handleResourceFetchError: simulateErrors.resourceUtils || resourceUtilsOptions.simulateErrors?.handleResourceFetchError
    }
  });
  
  // Setup mocks for dependencies
  jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
    McpServer: jest.fn(),
    ResourceTemplate: jest.fn().mockImplementation((pattern) => ({
      pattern,
      completeCallback: jest.fn()
    }))
  }));
  
  jest.mock('../../maas/MaasApiClient.js', () => mockMaasApiClient);
  jest.mock('../../mcp_resources/cache/cacheManager.js', () => ({
    CacheManager: {
      getInstance: jest.fn().mockReturnValue(mockCacheManager)
    }
  }));
  jest.mock('../../utils/auditLogger.js', () => mockAuditLogger);
  jest.mock('../../utils/logger.js', () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }));
  
  // Setup config mock
  jest.mock('../../config.js', () => ({
    cacheEnabled,
    auditLogEnabled,
    maasApiUrl: 'https://example.com/MAAS/api/2.0',
    maasApiKey: 'mock-api-key',
    logLevel: 'info',
    nodeEnv: 'test',
    cacheMaxAge: 300,
    cacheMaxSize: 1000,
    cacheStrategy: 'lru',
    cacheResourceSpecificTTL: {}
  }));
  
  return {
    mockMcpServer,
    mockMaasApiClient,
    mockCacheManager,
    mockResourceUtils
  };
}

/**
 * Create a mock AbortSignal for testing
 * 
 * @param aborted Whether the signal is already aborted
 * @returns A mock AbortSignal
 */
export function createMockAbortSignal(aborted: boolean = false): AbortSignal {
  const mockAbortSignal = {
    aborted,
    reason: aborted ? new Error('Mock abort') : undefined,
    onabort: null,
    throwIfAborted: jest.fn(() => {
      if (aborted) throw new Error('Mock abort');
    }),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(() => true)
  } as unknown as AbortSignal;
  
  return mockAbortSignal;
}

/**
 * Create a mock URL for testing
 * 
 * @param uri The URI string
 * @param params Optional query parameters to add
 * @returns A URL object
 */
export function createMockUrl(uri: string, params: Record<string, string> = {}): URL {
  const url = new URL(uri);
  
  // Add query parameters
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  
  return url;
}

/**
 * Assert that a resource handler was registered correctly
 *
 * @param mockServer The mock MCP server
 * @param resourceName The expected resource name
 * @param uriPattern The expected URI pattern
 * @param callIndex The index of the resource.mock.calls array to check (default: 0)
 */
export function assertResourceRegistration(
  mockServer: { resource: jest.MockInstance<any, any> },
  resourceName: string,
  uriPattern: string,
  callIndex: number = 0
): void {
  expect(mockServer.resource).toHaveBeenCalledWith(
    resourceName,
    expect.objectContaining({ pattern: uriPattern }),
    expect.any(Function)
  );
}

/**
 * Assert that a cache operation was logged
 *
 * @param mockAuditLogger The mock audit logger
 * @param resourceType The expected resource type
 * @param action The expected action (e.g., 'hit', 'miss', 'set')
 * @param resourceId The expected resource ID (optional)
 */
export function assertCacheOperationLogged(
  mockAuditLogger: any,
  resourceType: string,
  action: string,
  resourceId?: string
): void {
  expect(mockAuditLogger.logCacheOperation).toHaveBeenCalledWith(
    resourceType,
    action,
    expect.any(String),
    resourceId,
    expect.any(Object)
  );
}

/**
 * Assert that a resource access was logged
 *
 * @param mockAuditLogger The mock audit logger
 * @param resourceType The expected resource type
 * @param resourceId The expected resource ID (optional)
 * @param action The expected action (default: 'fetch')
 */
export function assertResourceAccessLogged(
  mockAuditLogger: any,
  resourceType: string,
  resourceId?: string,
  action: string = 'fetch'
): void {
  expect(mockAuditLogger.logResourceAccess).toHaveBeenCalledWith(
    resourceType,
    resourceId,
    action,
    expect.any(String),
    undefined,
    undefined,
    expect.any(Object),
    expect.anything()
  );
}

/**
 * Assert that a resource access failure was logged
 *
 * @param mockAuditLogger The mock audit logger
 * @param resourceType The expected resource type
 * @param resourceId The expected resource ID (optional)
 * @param action The expected action (default: 'fetch')
 */
export function assertResourceAccessFailureLogged(
  mockAuditLogger: any,
  resourceType: string,
  resourceId?: string,
  action: string = 'fetch'
): void {
  expect(mockAuditLogger.logResourceAccessFailure).toHaveBeenCalledWith(
    resourceType,
    resourceId,
    action,
    expect.any(String),
    expect.anything(),
    undefined,
    undefined,
    expect.any(Object)
  );
}