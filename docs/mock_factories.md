# Mock Factories Documentation

## Introduction

Mock factories are essential components in the testing infrastructure for the MAAS MCP server. They provide configurable implementations of core services and clients, allowing tests to run without requiring actual MAAS API access. This document details the centralized mock factories available in the project, their usage patterns, and best practices for extending them.

## Table of Contents

- [Overview](#overview)
- [Mock MAAS API Client](#mock-maas-api-client)
- [Mock Data Fixtures](#mock-data-fixtures)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)
- [Extension Guidelines](#extension-guidelines)
- [Related Documentation](#related-documentation)

## Overview

The mock factories in this project follow a consistent pattern:

1. **Factory Functions**: Functions that create configurable mock instances
2. **Predefined Configurations**: Common configurations for different testing scenarios
3. **Mock Data**: Realistic test data that mimics API responses
4. **Configurable Behavior**: Options to simulate various conditions (errors, delays, etc.)

The primary mock factories include:

- **Mock MAAS API Client**: Simulates the MAAS API client for testing resource handlers
- **Mock Resource Utils**: Provides mock implementations of resource utility functions
- **Mock Cache Manager**: Simulates the cache management system
- **Mock Audit Logger**: Provides a test implementation of the audit logging system

## Mock MAAS API Client

The Mock MAAS API Client is the most comprehensive mock factory in the project. It provides a configurable implementation of the `MaasApiClient` class, allowing tests to simulate various API responses and error conditions.

### Implementation

The mock MAAS API client is implemented in `src/__tests__/mocks/mockMaasApiClient.ts` and consists of:

1. **Factory Function**: `createMockMaasApiClient(options)`
2. **Configuration Options**: `MockMaasApiClientOptions` interface
3. **Predefined Configurations**: `mockClientConfigs` object
4. **Mock Data**: Sample machine data and error responses

### Configuration Options

The mock client can be configured with the following options:

```typescript
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
```

### Predefined Configurations

The `mockClientConfigs` object provides factory functions for common testing scenarios:

```typescript
export const mockClientConfigs = {
  // Default configuration that returns successful responses with mock machine data
  default: () => createMockMaasApiClient(),
  
  // Configuration that returns empty result arrays
  empty: () => createMockMaasApiClient({ successResponse: mockEmptyResult }),
  
  // Configuration that simulates network timeouts
  timeout: () => createMockMaasApiClient({ simulateTimeout: true }),
  
  // Configuration that simulates slow network responses
  slow: (delay = 500) => createMockMaasApiClient({ simulateNetworkDelay: delay }),
  
  // Configuration that simulates 404 Not Found errors
  notFound: () => createMockMaasApiClient({
    errorResponse: 'Resource not found',
    statusCode: 404
  }),
  
  // Configuration that simulates 500 Internal Server errors
  serverError: () => createMockMaasApiClient({
    errorResponse: 'Internal server error',
    statusCode: 500
  }),
  
  // Configuration that simulates 401 Unauthorized errors
  unauthorized: () => createMockMaasApiClient({
    errorResponse: 'Unauthorized access',
    statusCode: 401
  }),
  
  // Configuration that returns malformed but successful responses
  malformed: () => createMockMaasApiClient({
    successResponse: mockErrorResponse
  })
};
```

## Mock Data Fixtures

Mock data fixtures provide realistic test data that mimics the structure and properties of real MAAS API responses. These fixtures are used by the mock factories to simulate API responses.

### Machine Responses

The `src/__tests__/fixtures/machineResponses.ts` file contains a comprehensive set of mock machine data:

```typescript
// A collection of machine objects with different statuses and configurations
export const machines: MaasMachine[] = [
  // Ready machine with standard configuration
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
  
  // Deployed machine with different owner
  {
    system_id: 'def456',
    hostname: 'test-machine-2',
    // ... additional properties
  },
  
  // Additional machine configurations...
];

// Individual machine objects for specific test cases
export const readyMachine: MaasMachine = machines[0];
export const deployedMachine: MaasMachine = machines[1];
export const commissioningMachine: MaasMachine = machines[2];
export const failedMachine: MaasMachine = machines[3];

// Machine with minimal properties (for testing schema validation)
export const minimalMachine: MaasMachine = {
  // ... minimal properties
};

// Machine with extra properties (for testing schema validation)
export const extendedMachine: MaasMachine = {
  // ... extended properties
};

// Invalid machine missing required properties
export const invalidMachine: Partial<MaasMachine> = {
  // ... incomplete properties
};

// Error responses for different scenarios
export const errorResponses = {
  notFound: {
    error: 'Not Found',
    detail: 'Machine not found'
  },
  // ... additional error responses
};
```

The fixtures also include helper functions for filtering and paginating machine data:

```typescript
/**
 * Helper function to create a filtered list of machines based on parameters
 */
export function filterMachines(params: {
  hostname?: string;
  status?: string;
  owner?: string;
  tag_names?: string;
  zone?: string;
  pool?: string;
  architecture?: string;
  limit?: number;
  offset?: number;
}): MaasMachine[] {
  // Implementation...
}
```

## Usage Examples

### Basic Usage

```typescript
import { createMockMaasApiClient, mockClientConfigs } from '../mocks/mockMaasApiClient';
import { mockMachines } from '../fixtures/machineResponses';

describe('MachineResourceHandler', () => {
  it('should fetch and validate machine data', async () => {
    // Create a mock client with default configuration
    const mockClient = createMockMaasApiClient();
    
    // Create a resource handler with the mock client
    const handler = new MachineDetailsResourceHandler(mockServer, mockClient);
    
    // Test the handler
    const result = await handler.handleRequest(
      new URL('maas://machine/abc123'),
      { system_id: 'abc123' },
      { signal: new AbortController().signal }
    );
    
    // Assertions...
  });
});
```

### Testing Error Handling

```typescript
it('should handle not found errors', async () => {
  // Create a mock client that simulates 404 errors
  const mockClient = mockClientConfigs.notFound();
  
  // Create a resource handler with the mock client
  const handler = new MachineDetailsResourceHandler(mockServer, mockClient);
  
  // Test error handling
  try {
    await handler.handleRequest(
      new URL('maas://machine/nonexistent'),
      { system_id: 'nonexistent' },
      { signal: new AbortController().signal }
    );
    fail('Expected an error to be thrown');
  } catch (error) {
    expect(error.message).toContain('Resource not found');
    expect(error.statusCode).toBe(404);
  }
});
```

### Testing Loading States

```typescript
it('should handle loading states', async () => {
  // Create a mock client with a 500ms delay
  const mockClient = mockClientConfigs.slow(500);
  
  // Create a resource handler with the mock client
  const handler = new MachineDetailsResourceHandler(mockServer, mockClient);
  
  // Set up loading state tracking
  let isLoading = true;
  const loadingPromise = handler.handleRequest(
    new URL('maas://machine/abc123'),
    { system_id: 'abc123' },
    { signal: new AbortController().signal }
  ).finally(() => {
    isLoading = false;
  });
  
  // Assert loading state is true initially
  expect(isLoading).toBe(true);
  
  // Wait for the request to complete
  await loadingPromise;
  
  // Assert loading state is false after completion
  expect(isLoading).toBe(false);
});
```

### Testing Request Cancellation

```typescript
it('should handle request cancellation', async () => {
  // Create a mock client with a delay
  const mockClient = createMockMaasApiClient({
    simulateNetworkDelay: 1000,
    respectAbortSignal: true
  });
  
  // Create a resource handler with the mock client
  const handler = new MachineDetailsResourceHandler(mockServer, mockClient);
  
  // Set up abort controller
  const abortController = new AbortController();
  
  // Start the request
  const requestPromise = handler.handleRequest(
    new URL('maas://machine/abc123'),
    { system_id: 'abc123' },
    { signal: abortController.signal }
  );
  
  // Abort the request
  abortController.abort();
  
  // Assert that the request is rejected
  await expect(requestPromise).rejects.toThrow('Request aborted');
});
```

## Best Practices

### 1. Use Predefined Configurations

Prefer using the predefined configurations in `mockClientConfigs` for common testing scenarios:

```typescript
// Good
const mockClient = mockClientConfigs.notFound();

// Avoid
const mockClient = createMockMaasApiClient({
  errorResponse: 'Resource not found',
  statusCode: 404
});
```

### 2. Test Multiple Scenarios

Use different mock configurations to test various scenarios:

```typescript
describe('MachineResourceHandler', () => {
  it('should handle successful responses', async () => {
    const mockClient = mockClientConfigs.default();
    // Test success case...
  });
  
  it('should handle empty responses', async () => {
    const mockClient = mockClientConfigs.empty();
    // Test empty case...
  });
  
  it('should handle server errors', async () => {
    const mockClient = mockClientConfigs.serverError();
    // Test error case...
  });
  
  it('should handle timeouts', async () => {
    const mockClient = mockClientConfigs.timeout();
    // Test timeout case...
  });
});
```

### 3. Use Custom Response Data When Needed

Provide custom response data for specific test cases:

```typescript
const customMachine = {
  system_id: 'custom123',
  hostname: 'custom-machine',
  // ... other properties
};

const mockClient = createMockMaasApiClient({
  successResponse: customMachine
});
```

### 4. Test Edge Cases

Use the mock factories to test edge cases and error conditions:

```typescript
it('should handle malformed responses', async () => {
  const mockClient = mockClientConfigs.malformed();
  // Test handling of malformed data...
});

it('should handle minimal valid data', async () => {
  const mockClient = createMockMaasApiClient({
    successResponse: minimalMachine
  });
  // Test handling of minimal data...
});

it('should handle extended data with extra properties', async () => {
  const mockClient = createMockMaasApiClient({
    successResponse: extendedMachine
  });
  // Test handling of extended data...
});
```

### 5. Combine with Jest Spies

Use Jest spies to verify that the mock client is called with the expected parameters:

```typescript
it('should call the API with the correct parameters', async () => {
  const mockClient = createMockMaasApiClient();
  
  // Create a spy on the get method
  const getSpy = jest.spyOn(mockClient, 'get');
  
  // Create a resource handler with the mock client
  const handler = new MachineDetailsResourceHandler(mockServer, mockClient);
  
  // Call the handler
  await handler.handleRequest(
    new URL('maas://machine/abc123'),
    { system_id: 'abc123' },
    { signal: new AbortController().signal }
  );
  
  // Verify the API was called with the correct parameters
  expect(getSpy).toHaveBeenCalledWith(
    '/machines/abc123',
    undefined,
    expect.any(AbortSignal)
  );
});
```

## Extension Guidelines

### Creating New Mock Factories

When creating new mock factories, follow these guidelines:

1. **Use Factory Functions**: Create a factory function that returns a mock instance with configurable behavior.
2. **Define Configuration Options**: Create an interface for configuration options with sensible defaults.
3. **Provide Predefined Configurations**: Create an object with factory functions for common testing scenarios.
4. **Include Documentation**: Document the purpose, options, and usage of the mock factory.

Example:

```typescript
/**
 * Configuration options for the mock service
 */
export interface MockServiceOptions {
  // Define options...
}

/**
 * Creates a mock service with configurable behavior
 */
export function createMockService(options: MockServiceOptions = {}) {
  // Implement the mock service...
}

/**
 * Predefined configurations for common testing scenarios
 */
export const mockServiceConfigs = {
  // Define configurations...
};
```

### Extending Existing Mock Factories

When extending existing mock factories, follow these guidelines:

1. **Maintain Compatibility**: Ensure that the extended mock factory is compatible with the original.
2. **Add New Options**: Add new options to the configuration interface as needed.
3. **Provide Default Values**: Provide sensible default values for new options.
4. **Update Documentation**: Update the documentation to reflect the new options and behavior.

Example:

```typescript
/**
 * Extended configuration options for the mock MAAS API client
 */
export interface ExtendedMockMaasApiClientOptions extends MockMaasApiClientOptions {
  // Add new options...
  simulateRateLimiting?: boolean;
  rateLimitThreshold?: number;
}

/**
 * Creates an extended mock MAAS API client with additional features
 */
export function createExtendedMockMaasApiClient(options: ExtendedMockMaasApiClientOptions = {}) {
  // Implement the extended mock client...
}
```

### Creating New Mock Data

When creating new mock data, follow these guidelines:

1. **Match API Structure**: Ensure that the mock data matches the structure of the actual API responses.
2. **Include Edge Cases**: Include edge cases such as minimal data, extended data, and invalid data.
3. **Provide Helper Functions**: Create helper functions for filtering, paginating, and manipulating the mock data.
4. **Document the Data**: Document the purpose and structure of the mock data.

Example:

```typescript
/**
 * Mock data for MAAS zones
 */
export const mockZones = [
  {
    id: 1,
    name: 'default',
    description: 'Default zone'
  },
  {
    id: 2,
    name: 'testing',
    description: 'Testing zone'
  }
];

/**
 * Helper function to filter zones by name
 */
export function filterZonesByName(name: string): Zone[] {
  return mockZones.filter(zone => zone.name.includes(name));
}
```

## Related Documentation

- [MAAS API Resources Documentation](maas_api_resources.md): Overview of the MAAS API resources architecture.
- [Resource Handlers Documentation](resource_handlers.md): Detailed documentation for resource handlers.
- [API Schemas Documentation](api_schemas.md): Documentation for API schemas and data structures.
- [Testing Resources Documentation](testing_resources.md): Documentation for testing MAAS API resources.