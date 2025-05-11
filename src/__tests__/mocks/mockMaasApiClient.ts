/**
 * @file Mock MAAS API Client
 *
 * This module provides a configurable mock implementation of the MaasApiClient
 * for testing purposes. It includes mock data, factory functions for creating
 * mock clients with different behaviors, and predefined configurations for
 * common testing scenarios.
 */

import { MaasApiClient } from '../../maas/MaasApiClient.js';
import { MaasApiError } from '../../types/index.js';

/**
 * Mock data for a collection of machines
 *
 * This array contains sample machine data that mimics the structure and properties
 * of real machine objects returned by the MAAS API. It's useful for testing
 * components that process or display machine data.
 */
export const mockMachines = [
  {
    system_id: 'abc123',
    hostname: 'test-machine-1',
    domain: { id: 1, name: 'maas' },
    architecture: 'amd64/generic',
    status: 4,
    status_name: 'Ready',
    owner: 'admin',
    owner_data: { key: 'value' },
    ip_addresses: ['192.168.1.100'],
    cpu_count: 4,
    memory: 8192,
    zone: { id: 1, name: 'default' },
    pool: { id: 1, name: 'default' },
    tags: ['tag1', 'tag2']
  },
  {
    system_id: 'def456',
    hostname: 'test-machine-2',
    domain: { id: 1, name: 'maas' },
    architecture: 'amd64/generic',
    status: 6,
    status_name: 'Deployed',
    owner: 'user1',
    owner_data: null,
    ip_addresses: ['192.168.1.101'],
    cpu_count: 8,
    memory: 16384,
    zone: { id: 1, name: 'default' },
    pool: { id: 2, name: 'production' },
    tags: ['tag3']
  }
];

/**
 * Mock data for a single machine
 *
 * A convenience export of the first machine from the mockMachines array.
 * Useful for tests that only need a single machine object.
 */
export const mockMachine = mockMachines[0];

/**
 * Mock data for an empty result
 *
 * Represents an empty collection response from the MAAS API.
 * Useful for testing empty state handling in components.
 */
export const mockEmptyResult = [];

/**
 * Mock data for an error response
 *
 * Represents the structure of error responses from the MAAS API.
 * Useful for testing error handling in components.
 */
export const mockErrorResponse = {
  error: 'An error occurred',
  detail: 'Detailed error information'
};

/**
 * Configuration options for the mock MAAS API client
 */
export interface MockMaasApiClientOptions {
  /**
   * The response to return for successful requests
   * Default: mockMachines array
   */
  successResponse?: any;
  
  /**
   * The error to throw for failed requests
   * Can be an Error object or a string message
   */
  errorResponse?: Error | string;
  
  /**
   * HTTP status code to include with the response
   */
  statusCode?: number;
  
  /**
   * Milliseconds to delay before resolving/rejecting the request
   * Useful for testing loading states
   * Default: 0 (no delay)
   */
  simulateNetworkDelay?: number;
  
  /**
   * Whether to simulate a network timeout
   * Default: false
   */
  simulateTimeout?: boolean;
  
  /**
   * Whether to respect AbortSignal for request cancellation
   * Default: true
   */
  respectAbortSignal?: boolean;
}

/**
 * Creates a mock MaasApiClient with configurable behavior
 *
 * This factory function creates a mock implementation of the MaasApiClient
 * that can be configured to simulate various response scenarios, network
 * conditions, and error states. It's useful for testing components that
 * interact with the MAAS API without making actual network requests.
 *
 * @example
 * // Create a mock client that returns successful responses
 * const mockClient = createMockMaasApiClient();
 *
 * @example
 * // Create a mock client that simulates network errors
 * const errorClient = createMockMaasApiClient({
 *   errorResponse: new Error('Network failure'),
 *   statusCode: 500
 * });
 *
 * @example
 * // Create a mock client that simulates slow network
 * const slowClient = createMockMaasApiClient({
 *   simulateNetworkDelay: 2000 // 2 seconds delay
 * });
 *
 * @param options Configuration options for the mock client
 * @returns A mocked MaasApiClient instance
 */
export function createMockMaasApiClient(options: MockMaasApiClientOptions = {}) {
  const {
    successResponse = mockMachines,
    errorResponse,
    statusCode,
    simulateNetworkDelay = 0,
    simulateTimeout = false,
    respectAbortSignal = true
  } = options;

  // Create the mock client with required properties
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    // Add private properties to satisfy TypeScript
    // Convenience methods like listMachines, getMachine, createTag are not part of the base client.
    // They would be implemented in a service layer that uses this client.
    // We remove them from the direct mock of MaasApiClient.
    maasApiUrl: 'https://mock-maas-api.example.com/MAAS',
    apiKeyComponents: {
      consumerKey: 'mock-consumer-key',
      token: 'mock-token',
      tokenSecret: 'mock-token-secret'
    },
    makeRequest: jest.fn()
  } as unknown as jest.Mocked<MaasApiClient>;

  // Helper function to create a response with delay and abort handling
  const createResponse = (endpoint: string, params: any, signal?: AbortSignal) => {
    return new Promise((resolve, reject) => {
      // Handle abort signal
      if (respectAbortSignal && signal) {
        if (signal.aborted) {
          reject(new Error('Request aborted'));
          return;
        }

        signal.addEventListener('abort', () => {
          reject(new Error('Request aborted'));
        });
      }

      // Handle timeout
      if (simulateTimeout) {
        reject(new Error('Request timed out'));
        return;
      }

      // Handle error response
      if (errorResponse) {
        const error = typeof errorResponse === 'string'
          ? new MaasApiError(errorResponse) // statusCode is not part of MaasApiError constructor
          : errorResponse;

        setTimeout(() => reject(error), simulateNetworkDelay);
        return;
      }

      // Handle success response
      setTimeout(() => resolve(successResponse), simulateNetworkDelay);
    });
  };

  // Implement mock methods
  mockClient.get.mockImplementation(createResponse);
  mockClient.post.mockImplementation(createResponse);
  mockClient.put.mockImplementation(createResponse);
  mockClient.delete.mockImplementation(createResponse);
  
  // Convenience methods like listMachines, getMachine, createTag are not part of the base client.
  // They would be implemented in a service layer that uses this client.
  // We remove their mock implementations here.

  return mockClient;
}

/**
 * Predefined mock client configurations for common testing scenarios
 *
 * This object provides factory functions for creating mock clients with
 * preconfigured behaviors that simulate common API response scenarios.
 * These configurations make it easy to test how components handle different
 * API responses without having to manually configure each mock client.
 */
export const mockClientConfigs = {
  /**
   * Default configuration that returns successful responses with mock machine data
   * @returns A mock client that returns successful responses
   */
  default: () => createMockMaasApiClient(),
  
  /**
   * Configuration that returns empty result arrays
   * Useful for testing empty state handling
   * @returns A mock client that returns empty arrays
   */
  empty: () => createMockMaasApiClient({ successResponse: mockEmptyResult }),
  
  /**
   * Configuration that simulates network timeouts
   * Useful for testing timeout handling and retry logic
   * @returns A mock client that simulates timeouts
   */
  timeout: () => createMockMaasApiClient({ simulateTimeout: true }),
  
  /**
   * Configuration that simulates slow network responses
   * Useful for testing loading states and progress indicators
   * @param delay Milliseconds to delay the response (default: 500ms)
   * @returns A mock client with delayed responses
   */
  slow: (delay = 500) => createMockMaasApiClient({ simulateNetworkDelay: delay }),
  
  /**
   * Configuration that simulates 404 Not Found errors
   * Useful for testing resource not found handling
   * @returns A mock client that returns 404 errors
   */
  notFound: () => createMockMaasApiClient({
    errorResponse: 'Resource not found',
    statusCode: 404
  }),
  
  /**
   * Configuration that simulates 500 Internal Server errors
   * Useful for testing server error handling
   * @returns A mock client that returns 500 errors
   */
  serverError: () => createMockMaasApiClient({
    errorResponse: 'Internal server error',
    statusCode: 500
  }),
  
  /**
   * Configuration that simulates 401 Unauthorized errors
   * Useful for testing authentication error handling
   * @returns A mock client that returns 401 errors
   */
  unauthorized: () => createMockMaasApiClient({
    errorResponse: 'Unauthorized access',
    statusCode: 401
  }),
  
  /**
   * Configuration that returns malformed but successful responses
   * Useful for testing error handling of unexpected response formats
   * @returns A mock client that returns malformed responses
   */
  malformed: () => createMockMaasApiClient({
    successResponse: mockErrorResponse
  })
};