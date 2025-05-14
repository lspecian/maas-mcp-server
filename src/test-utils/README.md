# TypeScript Test Utilities

This directory contains test utilities for the TypeScript components of the MAAS MCP Server project.

## Files

- `mocks.ts` - Mock implementations for TypeScript interfaces
- `assertions.ts` - Custom assertion helpers
- `fixtures.ts` - Test fixtures
- `helpers.ts` - Helper functions for common testing operations
- `setup.ts` - Setup functions for TypeScript tests

## Mocks

The `mocks.ts` file provides mock implementations for various interfaces:

### MockMCPClient

A mock implementation of the MCP client for testing MCP tool and resource interactions:

```typescript
// Create a mock client
const mockClient = new MockMCPClient();

// Set up the mock to return test data for a tool
mockClient.mockTool('getMachineDetails', (params) => {
  return createMachineFixture(params.systemId, `test-machine-${params.systemId}`);
});

// Set up the mock to return test data for a resource
mockClient.mockResource('maas://machine/abc123', () => {
  return createMachineFixture('abc123', 'test-machine');
});

// Set up a default handler for any tool
mockClient.setDefaultToolHandler((toolName, params) => {
  return { tool: toolName, params };
});

// Set up a default handler for any resource
mockClient.setDefaultResourceHandler((uri) => {
  return { uri };
});

// Reset the mock
mockClient.reset();
```

### MockProgressTracker

A mock implementation of a progress tracker for testing progress reporting:

```typescript
// Create a mock progress tracker
const tracker = new MockProgressTracker();

// Start tracking progress
tracker.start('operation-1');

// Update progress
tracker.update('operation-1', 50, 'Halfway done');

// Complete an operation
tracker.complete('operation-1', 'Operation completed successfully');

// Fail an operation
tracker.fail('operation-1', 'Operation failed');

// Get all recorded events
const events = tracker.getEvents();

// Get events for a specific operation
const operationEvents = tracker.getEventsForId('operation-1');

// Clear all recorded events
tracker.clear();
```

### MockLogger

A mock implementation of a logger for testing logging functionality:

```typescript
// Create a mock logger
const logger = new MockLogger();

// Log messages
logger.debug('Debug message', { context: 'test' });
logger.info('Info message', { context: 'test' });
logger.warn('Warning message', { context: 'test' });
logger.error('Error message', { context: 'test' });

// Get all recorded logs
const logs = logger.getLogs();

// Get logs of a specific level
const errorLogs = logger.getLogsByLevel('error');

// Clear all recorded logs
logger.clear();
```

## Assertions

The `assertions.ts` file provides custom assertion helpers:

```typescript
// Check if an object has all required properties
expectToHaveProperties(obj, ['id', 'hostname', 'status']);

// Check if a machine has the expected structure
expectValidMachine(machine);

// Check if a machine has the expected detailed structure
expectValidMachineDetails(machine);

// Check if a subnet has the expected structure
expectValidSubnet(subnet);

// Check if a VLAN has the expected structure
expectValidVLAN(vlan);

// Check if a tag has the expected structure
expectValidTag(tag);

// Check if a network interface has the expected structure
expectValidNetworkInterface(iface);

// Check if a block device has the expected structure
expectValidBlockDevice(device);

// Check if an error has the expected structure
expectValidError(error);

// Check if a response has the expected pagination structure
expectValidPagination(response);

// Check if a response contains the expected error
expectError(response, 'NOT_FOUND', 'Resource not found');

// Check if a response contains the expected success result
expectSuccess(response);

// Check if an array contains objects with a specific property value
expectArrayToContainObjectWithProperty(array, 'id', 'abc123');

// Check if an array does not contain objects with a specific property value
expectArrayNotToContainObjectWithProperty(array, 'id', 'abc123');

// Check if a function throws an error with a specific message
expectToThrowWithMessage(() => { throw new Error('Test error'); }, 'Test error');
```

## Fixtures

The `fixtures.ts` file provides functions to create test fixtures:

```typescript
// Create a machine fixture
const machine = createMachineFixture('abc123', 'test-machine');

// Create a machine details fixture
const machineDetails = createMachineDetailsFixture('abc123', 'test-machine');

// Create a subnet fixture
const subnet = createSubnetFixture('123', 'test-subnet', '192.168.1.0/24');

// Create a VLAN fixture
const vlan = createVLANFixture('1', 'test-vlan', 1);

// Create a tag fixture
const tag = createTagFixture('test-tag', 'Test tag');

// Create a block device fixture
const blockDevice = createBlockDeviceFixture('1', 'sda', '/dev/sda', 1000000000);

// Create a network interface fixture
const networkInterface = createNetworkInterfaceFixture('1', 'eth0', '00:11:22:33:44:55');

// Create a pagination fixture
const pagination = createPaginationFixture([machine], 1, 1, 10);

// Create an error fixture
const error = createErrorFixture('NOT_FOUND', 'Resource not found');

// Create a success response fixture
const success = createSuccessFixture({ id: 'abc123' });

// Create a mock MCP tool response
const toolResponse = createMCPToolResponseFixture('getMachineDetails', machine);

// Create a mock MCP resource response
const resourceResponse = createMCPResourceResponseFixture('maas://machine/abc123', machine);
```

## Helpers

The `helpers.ts` file provides helper functions for common testing operations:

```typescript
// Create a temporary file for testing
const { path, cleanup } = createTempFile('file content');
cleanup(); // Don't forget to clean up

// Create a temporary directory for testing
const { path, cleanup } = createTempDir();
cleanup(); // Don't forget to clean up

// Create a test file in a specified directory
const filePath = createTestFile(dir, 'test.txt', 'Hello, World!');

// Read a test file
const content = readTestFile(filePath);

// Wait for a condition to be true
const success = await waitForCondition(() => someAsyncCondition(), 5000);

// Retry a function until it succeeds
const result = await retry(async () => {
  // Function that might fail
  return await someAsyncFunction();
});

// Mock the current time for testing
const restoreTime = mockTime(new Date('2025-01-01T00:00:00Z'));
// ... test code ...
restoreTime(); // Restore the original time

// Set environment variables for testing
const restoreEnv = withEnvVars({ TEST_VAR: 'test_value' });
// ... test code ...
restoreEnv(); // Restore the original environment variables

// Create a mock HTTP response
const response = createMockResponse(200, { success: true }, { 'Content-Type': 'application/json' });

// Create a mock HTTP request
const request = createMockRequest('POST', '/api/v1/machines', { id: 'abc123' }, { 'Content-Type': 'application/json' });

// Create a mock event emitter
const emitter = createMockEventEmitter();
emitter.on('event', (data) => console.log(data));
emitter.emit('event', 'test');

// Create a mock WebSocket
const ws = createMockWebSocket();
ws.onmessage = (event) => console.log(event.data);
ws.send('test');
ws.close();
```

## Setup

The `setup.ts` file provides setup functions for TypeScript tests:

```typescript
// Mock console methods to prevent output during tests
const restoreConsole = mockConsole();
// ... test code ...
restoreConsole(); // Restore the original console methods

// Mock fetch API
const restoreFetch = mockFetch({ success: true });
// ... test code ...
restoreFetch(); // Restore the original fetch

// Mock WebSocket API
const restoreWebSocket = mockWebSocket();
// ... test code ...
restoreWebSocket(); // Restore the original WebSocket

// Mock timer functions
const restoreTimers = mockTimers();
// ... test code ...
restoreTimers(); // Restore the original timers

// Set up a test environment with all mocks
const restore = setupTestEnvironment();
// ... test code ...
restore(); // Restore the original environment
```

## Usage

To use these utilities in your tests, import them as needed:

```typescript
import { MockMCPClient } from '../test-utils/mocks';
import { expectValidMachine } from '../test-utils/assertions';
import { createMachineFixture } from '../test-utils/fixtures';
import { waitForCondition } from '../test-utils/helpers';

describe('MCP Client', () => {
  let mockClient: MockMCPClient;
  
  beforeEach(() => {
    mockClient = new MockMCPClient();
  });
  
  afterEach(() => {
    mockClient.reset();
  });
  
  test('should retrieve machine details', async () => {
    // Set up the mock
    const testMachine = createMachineFixture('abc123', 'test-machine');
    mockClient.mockTool('getMachineDetails', () => testMachine);
    
    // Call the client
    const result = await mockClient.useTool('getMachineDetails', { systemId: 'abc123' });
    
    // Assert the results
    expectValidMachine(result);
    expect(result.id).toBe('abc123');
    expect(result.hostname).toBe('test-machine');
  });
});
```

## Dependencies

These utilities depend on the following packages:

- `vitest` - Testing framework
- `jest` - Alternative testing framework

Make sure to install these dependencies before using the utilities:

```bash
npm install --save-dev vitest jest @types/jest