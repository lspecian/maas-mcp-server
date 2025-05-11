/**
 * Mock factory for ResourceUtils
 * Provides configurable mock implementations of the ResourceUtils functions for testing
 */
import { ZodSchema, ZodError } from 'zod';
import { MaasApiError } from '../../types/maas.js';
import * as actualResourceUtils from '../../mcp_resources/utils/resourceUtils.js';

/**
 * Configuration options for mock resource utils
 */
export interface MockResourceUtilsOptions {
  // Whether to use actual implementations for some functions
  useActualImplementations?: {
    extractAndValidateParams?: boolean;
    validateResourceData?: boolean;
    handleResourceFetchError?: boolean;
  };
  // Whether to simulate errors
  simulateErrors?: {
    extractAndValidateParams?: boolean;
    validateResourceData?: boolean;
    handleResourceFetchError?: boolean;
  };
  // Custom error messages
  errorMessages?: {
    extractAndValidateParams?: string;
    validateResourceData?: string;
    handleResourceFetchError?: string;
  };
  // Custom implementations
  customImplementations?: {
    extractAndValidateParams?: typeof actualResourceUtils.extractAndValidateParams;
    validateResourceData?: typeof actualResourceUtils.validateResourceData;
    handleResourceFetchError?: typeof actualResourceUtils.handleResourceFetchError;
  };
}

/**
 * Creates mock implementations of ResourceUtils functions
 * 
 * @param options Configuration options for the mock resource utils
 * @returns Mocked ResourceUtils functions
 */
export function createMockResourceUtils(options: MockResourceUtilsOptions = {}): jest.Mocked<typeof actualResourceUtils> {
  const {
    useActualImplementations = {
      extractAndValidateParams: false,
      validateResourceData: false,
      handleResourceFetchError: false
    },
    simulateErrors = {
      extractAndValidateParams: false,
      validateResourceData: false,
      handleResourceFetchError: false
    },
    errorMessages = {
      extractAndValidateParams: 'Mock error in extractAndValidateParams',
      validateResourceData: 'Mock error in validateResourceData',
      handleResourceFetchError: 'Mock error in handleResourceFetchError'
    },
    customImplementations = {}
  } = options;

  // Create the mock functions
  const mockResourceUtils = {
    extractAndValidateParams: jest.fn(),
    validateResourceData: jest.fn(),
    handleResourceFetchError: jest.fn()
  } as unknown as jest.Mocked<typeof actualResourceUtils>;

  // Implement extractAndValidateParams
  mockResourceUtils.extractAndValidateParams.mockImplementation(<T>(
    uri: string,
    pattern: string,
    schema: ZodSchema<T>,
    resourceName: string
  ): T => {
    // Use custom implementation if provided
    if (customImplementations.extractAndValidateParams) {
      return customImplementations.extractAndValidateParams(uri, pattern, schema, resourceName);
    }
    
    // Use actual implementation if specified
    if (useActualImplementations.extractAndValidateParams) {
      return actualResourceUtils.extractAndValidateParams(uri, pattern, schema, resourceName);
    }
    
    // Simulate error if specified
    if (simulateErrors.extractAndValidateParams) {
      throw new MaasApiError(
        errorMessages.extractAndValidateParams || 'Mock error in extractAndValidateParams',
        400,
        'invalid_parameters'
      );
    }
    
    // Default mock implementation: extract system_id from URI if present
    const match = uri.match(/\/([^\/]+)\/details$/);
    const systemId = match ? match[1] : undefined;
    
    // Create a mock params object with system_id if found
    const mockParams: Record<string, any> = {};
    if (systemId) {
      mockParams.system_id = systemId;
    }
    
    // Add any query parameters if present
    try {
      const url = new URL(uri);
      url.searchParams.forEach((value, key) => {
        mockParams[key] = value;
      });
    } catch (error) {
      // Not a valid URL, ignore
    }
    
    // Return the mock params, assuming they pass schema validation
    return schema.parse(mockParams) as T;
  });

  // Implement validateResourceData
  mockResourceUtils.validateResourceData.mockImplementation(<T>(
    data: unknown,
    schema: ZodSchema<T>,
    resourceName: string,
    resourceId?: string
  ): T => {
    // Use custom implementation if provided
    if (customImplementations.validateResourceData) {
      return customImplementations.validateResourceData(data, schema, resourceName, resourceId);
    }
    
    // Use actual implementation if specified
    if (useActualImplementations.validateResourceData) {
      return actualResourceUtils.validateResourceData(data, schema, resourceName, resourceId);
    }
    
    // Simulate error if specified
    if (simulateErrors.validateResourceData) {
      throw new MaasApiError(
        errorMessages.validateResourceData || 'Mock error in validateResourceData',
        422,
        'validation_error',
        { zodErrors: [{ message: 'Mock validation error' }] }
      );
    }
    
    // Default mock implementation: pass through the data, assuming it passes schema validation
    return schema.parse(data) as T;
  });

  // Implement handleResourceFetchError
  mockResourceUtils.handleResourceFetchError.mockImplementation((
    error: any,
    resourceName: string,
    resourceId?: string,
    context?: Record<string, any>
  ): never => {
    // Use custom implementation if provided
    if (customImplementations.handleResourceFetchError) {
      return customImplementations.handleResourceFetchError(error, resourceName, resourceId, context);
    }
    
    // Use actual implementation if specified
    if (useActualImplementations.handleResourceFetchError) {
      return actualResourceUtils.handleResourceFetchError(error, resourceName, resourceId, context);
    }
    
    // Simulate error if specified
    if (simulateErrors.handleResourceFetchError) {
      throw new MaasApiError(
        errorMessages.handleResourceFetchError || 'Mock error in handleResourceFetchError',
        500,
        'unexpected_error'
      );
    }
    
    // Default mock implementation: wrap the error in a MaasApiError if it's not already one
    if (error instanceof MaasApiError) {
      throw error;
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new MaasApiError(
      `Error fetching ${resourceName}${resourceId ? ` '${resourceId}'` : ''}: ${errorMessage}`,
      500,
      'unexpected_error',
      { originalError: errorMessage }
    );
  });

  return mockResourceUtils;
}

/**
 * Predefined mock resource utils configurations
 */
export const mockResourceUtilsConfigs = {
  // Default configuration
  default: () => createMockResourceUtils(),
  
  // Configuration with all actual implementations
  useActual: () => createMockResourceUtils({
    useActualImplementations: {
      extractAndValidateParams: true,
      validateResourceData: true,
      handleResourceFetchError: true
    }
  }),
  
  // Configuration with all simulated errors
  withErrors: () => createMockResourceUtils({
    simulateErrors: {
      extractAndValidateParams: true,
      validateResourceData: true,
      handleResourceFetchError: true
    }
  }),
  
  // Configuration with selective actual implementations
  selective: (useActual: Partial<MockResourceUtilsOptions['useActualImplementations']>) => 
    createMockResourceUtils({
      useActualImplementations: {
        extractAndValidateParams: false,
        validateResourceData: false,
        handleResourceFetchError: false,
        ...useActual
      }
    })
};

/**
 * Setup mock ResourceUtils functions for testing
 * This is a convenience function that creates mocks and sets them up for the module
 * 
 * @param options Configuration options for the mock resource utils
 * @returns The mocked ResourceUtils functions
 */
export function setupMockResourceUtils(options: MockResourceUtilsOptions = {}): jest.Mocked<typeof actualResourceUtils> {
  const mockFunctions = createMockResourceUtils(options);
  
  jest.mock('../../mcp_resources/utils/resourceUtils.js', () => ({
    extractAndValidateParams: mockFunctions.extractAndValidateParams,
    validateResourceData: mockFunctions.validateResourceData,
    handleResourceFetchError: mockFunctions.handleResourceFetchError
  }));
  
  return mockFunctions;
}

/**
 * Utility function to extract the registered callback from a mock server
 * 
 * @param mockServer The mock MCP server instance
 * @param callIndex The index of the resource.mock.calls array to extract from (default: 0)
 * @returns The registered callback function
 */
export function extractRegisteredCallback<T>(
  mockServer: { resource: jest.Mock },
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