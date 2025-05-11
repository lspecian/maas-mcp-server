# Testing MAAS API Resources Documentation

## Introduction

Testing is a critical aspect of maintaining the reliability and stability of the MAAS API Resources module. This document provides comprehensive guidance on testing strategies, test utilities, and best practices for testing MAAS API resources. It covers unit testing, integration testing, and end-to-end testing approaches, along with examples and common patterns.

## Table of Contents

- [Testing Strategy Overview](#testing-strategy-overview)
- [Test Directory Structure](#test-directory-structure)
- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [End-to-End Testing](#end-to-end-testing)
- [Test Utilities](#test-utilities)
- [Mock Factories](#mock-factories)
- [Test Data Fixtures](#test-data-fixtures)
- [Best Practices](#best-practices)
- [Related Documentation](#related-documentation)

## Testing Strategy Overview

The MAAS API Resources module employs a comprehensive testing strategy that includes:

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test interactions between components
3. **End-to-End Tests**: Test the complete flow from MCP server to MAAS API
4. **Contract Tests**: Verify that the implementation adheres to the MCP protocol
5. **Benchmark Tests**: Measure performance characteristics

This multi-layered approach ensures that the module is thoroughly tested at all levels, from individual components to the complete system.

## Test Directory Structure

The test directory structure is organized by test type and component:

```
src/__tests__/
├── benchmarks/                  # Performance benchmark tests
├── cache/                       # Cache mechanism tests
├── contracts/                   # Contract tests for MCP protocol
├── e2e/                         # End-to-end tests
├── examples/                    # Example tests for documentation
├── fixtures/                    # Test data fixtures
├── integration/                 # Integration tests
├── mcp_tools/                   # Tests for MCP tools
├── mocks/                       # Mock implementations
├── resources/                   # Tests for resource handlers
├── schemas/                     # Tests for schemas
├── templates/                   # Test templates
├── tools/                       # Tests for tools
└── utils/                       # Tests for utility functions
```

## Unit Testing

Unit tests focus on testing individual components in isolation, such as resource handlers, schemas, and utility functions. They use mock implementations to isolate the component under test from its dependencies.

### Example: Testing a Resource Handler

```typescript
import { MachineDetailsResourceHandler } from '../../mcp_resources/handlers/MachineResourceHandler';
import { createMockMaasApiClient } from '../mocks/mockMaasApiClient';
import { mockMachine } from '../fixtures/machineResponses';

describe('MachineDetailsResourceHandler', () => {
  let mockServer: any;
  let mockClient: any;
  let handler: MachineDetailsResourceHandler;

  beforeEach(() => {
    // Create mock server
    mockServer = {
      resource: jest.fn()
    };
    
    // Create mock client with default configuration
    mockClient = createMockMaasApiClient({
      successResponse: mockMachine
    });
    
    // Create handler with mock dependencies
    handler = new MachineDetailsResourceHandler(mockServer, mockClient);
  });

  it('should register with the server', () => {
    // Call the register method
    handler.register('test_resource_id');
    
    // Verify that the server.resource method was called with the correct arguments
    expect(mockServer.resource).toHaveBeenCalledWith(
      'test_resource_id',
      expect.any(Object),
      expect.any(Function)
    );
  });

  it('should fetch and validate machine data', async () => {
    // Create a mock request
    const uri = new URL('maas://machine/abc123');
    const variables = { system_id: 'abc123' };
    const options = { signal: new AbortController().signal };
    
    // Call the handleRequest method
    const result = await handler.handleRequest(uri, variables, options);
    
    // Verify that the client.get method was called with the correct arguments
    expect(mockClient.get).toHaveBeenCalledWith(
      '/machines/abc123',
      undefined,
      options.signal
    );
    
    // Verify the response format
    expect(result).toEqual({
      contents: [{
        uri: uri.toString(),
        text: JSON.stringify(mockMachine),
        mimeType: 'application/json',
        headers: expect.any(Object)
      }]
    });
  });
});
```

## Integration Testing

Integration tests focus on testing interactions between components, such as resource handlers and the MAAS API client. They use mock implementations for external dependencies but test the interactions between internal components.

### Example: Testing Resource Handler Integration

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MaasApiClient } from '../../maas/MaasApiClient';
import { registerMachineResources } from '../../mcp_resources/handlers/MachineResourceHandler';
import { createMockMaasApiClient } from '../mocks/mockMaasApiClient';
import { mockMachine, mockMachines } from '../fixtures/machineResponses';

describe('Machine Resource Integration', () => {
  let mockServer: any;
  let mockClient: any;
  let resourceHandlers: Map<string, Function>;

  beforeEach(() => {
    // Create mock server
    resourceHandlers = new Map();
    mockServer = {
      resource: jest.fn((id, template, handler) => {
        resourceHandlers.set(id, handler);
      })
    };
    
    // Create mock client with default configuration
    mockClient = createMockMaasApiClient();
    
    // Register machine resources
    registerMachineResources(mockServer, mockClient);
  });

  it('should register machine resources', () => {
    // Verify that the resources were registered
    expect(resourceHandlers.has('maas_machine_details')).toBe(true);
    expect(resourceHandlers.has('maas_machines_list')).toBe(true);
  });

  it('should handle machine details requests', async () => {
    // Get the handler for machine details
    const handler = resourceHandlers.get('maas_machine_details');
    
    // Configure mock client to return a specific machine
    mockClient.get.mockResolvedValueOnce(mockMachine);
    
    // Create a mock request
    const uri = new URL('maas://machine/abc123');
    const variables = { system_id: 'abc123' };
    const options = { signal: new AbortController().signal };
    
    // Call the handler
    const result = await handler(uri, variables, options);
    
    // Verify the response
    expect(result.contents[0].text).toEqual(JSON.stringify(mockMachine));
  });
});
```

## End-to-End Testing

End-to-end tests focus on testing the complete flow from MCP server to MAAS API. They use a real MCP server and a mock MAAS API to test the entire system.

### Example: End-to-End Test

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MaasApiClient } from '../../maas/MaasApiClient';
import { registerResources } from '../../mcp_resources';
import { createMockMaasApiClient } from '../mocks/mockMaasApiClient';
import { mockMachine, mockMachines } from '../fixtures/machineResponses';

describe('MCP Server End-to-End', () => {
  let server: McpServer;
  let mockClient: any;

  beforeEach(async () => {
    // Create a real MCP server
    server = new McpServer();
    
    // Create mock client with default configuration
    mockClient = createMockMaasApiClient();
    
    // Register resources with the server
    registerResources(server, mockClient);
    
    // Start the server
    await server.start();
  });

  afterEach(async () => {
    // Stop the server
    await server.stop();
  });

  it('should handle machine details requests', async () => {
    // Configure mock client to return a specific machine
    mockClient.get.mockResolvedValueOnce(mockMachine);
    
    // Create a client to access the server
    const client = new McpClient('http://localhost:3000');
    
    // Access the resource
    const result = await client.accessResource('maas://machine/abc123');
    
    // Verify the response
    expect(JSON.parse(result.contents[0].text)).toEqual(mockMachine);
  });
});
```

## Test Utilities

The MAAS API Resources module provides several test utilities to simplify testing:

### Mock Server

```typescript
/**
 * Creates a mock MCP server for testing
 */
export function createMockServer() {
  return {
    resource: jest.fn(),
    start: jest.fn(),
    stop: jest.fn()
  };
}
```

### Request Helpers

```typescript
/**
 * Creates a mock request for testing resource handlers
 */
export function createMockRequest(uri: string, params: Record<string, string> = {}) {
  return {
    uri: new URL(uri),
    variables: params,
    options: { signal: new AbortController().signal }
  };
}
```

### Assertion Helpers

```typescript
/**
 * Asserts that a response has the expected format
 */
export function assertResponseFormat(response: any, expectedData: any) {
  expect(response).toHaveProperty('contents');
  expect(response.contents).toBeInstanceOf(Array);
  expect(response.contents.length).toBe(1);
  expect(response.contents[0]).toHaveProperty('uri');
  expect(response.contents[0]).toHaveProperty('text');
  expect(response.contents[0]).toHaveProperty('mimeType');
  expect(JSON.parse(response.contents[0].text)).toEqual(expectedData);
}
```

## Mock Factories

Mock factories provide configurable implementations of core components for testing. See the [Mock Factories Documentation](mock_factories.md) for detailed information.

### Mock MAAS API Client

```typescript
import { createMockMaasApiClient, mockClientConfigs } from '../mocks/mockMaasApiClient';

// Create a mock client with default configuration
const mockClient = createMockMaasApiClient();

// Create a mock client that returns a specific response
const mockClient = createMockMaasApiClient({
  successResponse: mockMachine
});

// Create a mock client that simulates an error
const mockClient = createMockMaasApiClient({
  errorResponse: new Error('Test error')
});

// Use predefined configurations
const mockClient = mockClientConfigs.notFound();
const mockClient = mockClientConfigs.serverError();
const mockClient = mockClientConfigs.timeout();
```

## Test Data Fixtures

Test data fixtures provide realistic test data for testing. See the [Mock Factories Documentation](mock_factories.md) for detailed information about test data fixtures.

### Machine Fixtures

```typescript
import { 
  machines,
  readyMachine,
  deployedMachine,
  commissioningMachine,
  failedMachine,
  minimalMachine,
  extendedMachine,
  invalidMachine,
  emptyMachinesResult,
  errorResponses,
  paginatedMachines,
  filterMachines
} from '../fixtures/machineResponses';

// Use specific machine fixtures
const machine = readyMachine;
const machineList = machines;

// Use filtered machine list
const filteredMachines = filterMachines({
  hostname: 'test',
  status: 'Ready',
  limit: 10,
  offset: 0
});
```

## Best Practices

### 1. Use Mock Factories

Use the provided mock factories to create consistent mock implementations for testing.

```typescript
// Good
const mockClient = createMockMaasApiClient({
  successResponse: mockMachine
});

// Avoid
const mockClient = {
  get: jest.fn().mockResolvedValue(mockMachine),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
};
```

### 2. Test Error Handling

Test error handling thoroughly to ensure that errors are properly handled and reported.

```typescript
it('should handle API errors', async () => {
  // Configure mock client to return an error
  mockClient.get.mockRejectedValueOnce(new Error('API error'));
  
  // Create mock request
  const { uri, variables, options } = createMockRequest('maas://machine/abc123', { system_id: 'abc123' });
  
  // Call handler and expect error
  await expect(handler.handleRequest(uri, variables, options)).rejects.toThrow('API error');
});
```

### 3. Test Edge Cases

Test edge cases such as empty results, minimal data, and extended data to ensure that the code handles them correctly.

```typescript
it('should handle empty results', async () => {
  // Configure mock client to return empty array
  mockClient.get.mockResolvedValueOnce([]);
  
  // Create mock request
  const { uri, variables, options } = createMockRequest('maas://machines');
  
  // Call handler
  const result = await handler.handleRequest(uri, variables, options);
  
  // Verify result
  assertResponseFormat(result, []);
});
```

### 4. Use Test Utilities

Use the provided test utilities to simplify testing and make tests more readable.

```typescript
// Good
const { uri, variables, options } = createMockRequest('maas://machine/abc123', { system_id: 'abc123' });
assertResponseFormat(result, mockMachine);

// Avoid
const uri = new URL('maas://machine/abc123');
const variables = { system_id: 'abc123' };
const options = { signal: new AbortController().signal };
expect(result).toHaveProperty('contents');
expect(result.contents).toBeInstanceOf(Array);
expect(result.contents.length).toBe(1);
expect(result.contents[0]).toHaveProperty('uri');
expect(result.contents[0]).toHaveProperty('text');
expect(result.contents[0]).toHaveProperty('mimeType');
expect(JSON.parse(result.contents[0].text)).toEqual(mockMachine);
```

### 5. Test Caching

Test caching behavior to ensure that data is correctly cached and retrieved.

```typescript
it('should use cached data when available', async () => {
  // Configure mock cache manager
  const mockCacheManager = createMockCacheManager({
    cacheHits: {
      'Machine:abc123': mockMachine
    }
  });
  
  // Replace the cache manager in the handler
  handler['cacheManager'] = mockCacheManager;
  
  // Create mock request
  const { uri, variables, options } = createMockRequest('maas://machine/abc123', { system_id: 'abc123' });
  
  // Call handler
  const result = await handler.handleRequest(uri, variables, options);
  
  // Verify that the client was not called
  expect(mockClient.get).not.toHaveBeenCalled();
  
  // Verify result
  assertResponseFormat(result, mockMachine);
});
```

## Related Documentation

- [MAAS API Resources Documentation](maas_api_resources.md): Overview of the MAAS API resources architecture.
- [Mock Factories Documentation](mock_factories.md): Documentation for the centralized mock factories used for testing.
- [Resource Handlers Documentation](resource_handlers.md): Detailed documentation for resource handlers and their implementation.
- [API Schemas Documentation](api_schemas.md): Documentation for API schemas and data structures.