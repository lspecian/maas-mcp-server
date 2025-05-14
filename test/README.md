# MAAS MCP Server Test Framework

This directory contains the test framework and helpers for the MAAS MCP Server project. The framework provides utilities for both Go and TypeScript components.

## Directory Structure

- `test/utils/` - Common test utilities for Go
  - `mocks.go` - Mock implementations of interfaces
  - `assertions.go` - Custom assertion helpers
  - `fixtures.go` - Test fixtures
  - `helpers.go` - Helper functions for common testing operations

- `test/unit/` - Unit test helpers
  - `setup.go` - Setup functions for unit tests

- `test/integration/` - Integration tests
  - `helper.go` - Helper functions for integration tests

- `src/test-utils/` - TypeScript test utilities
  - `mocks.ts` - Mock implementations for TypeScript interfaces
  - `assertions.ts` - Custom assertion helpers
  - `fixtures.ts` - Test fixtures
  - `helpers.ts` - Helper functions for common testing operations
  - `setup.ts` - Setup functions for TypeScript tests

## Go Test Framework

### Mock Generators

The `test/utils/mocks.go` file provides mock implementations of the project's interfaces:

```go
// Create a mock client
mockClient := &utils.MockMachineClient{}

// Set up the mock to return test data
mockClient.On("GetMachine", "abc123").Return(&testMachine, nil)

// Verify that the mock was called as expected
mockClient.AssertExpectations(t)
```

### Assertion Helpers

The `test/utils/assertions.go` file provides custom assertion helpers:

```go
// Assert that two Machine objects are equal
utils.AssertMachineEqual(t, expected, actual)

// Assert that two Subnet objects are equal
utils.AssertSubnetPointerEqual(t, expected, actual)
```

### Test Fixtures

The `test/utils/fixtures.go` file provides functions to create test fixtures:

```go
// Create a test machine
testMachine := utils.CreateTestMachine("abc123", "test-machine", "Ready")

// Create a test machine with details
testMachineWithDetails := utils.CreateTestMachineWithDetails("def456", "test-machine-2", "Deployed")

// Create a test subnet
testSubnet := utils.CreateTestSubnet(1, "test-subnet", "192.168.1.0/24")
```

### Helper Functions

The `test/utils/helpers.go` file provides helper functions for common testing operations:

```go
// Create a temporary directory for testing
utils.WithTempDir(t, func(dir string) {
    // Use the temporary directory
})

// Create a temporary file for testing
filePath, cleanup := utils.WithTempFile(t, "file content")
defer cleanup()

// Create a test context with timeout
ctx, cancel := utils.WithTestContext(t)
defer cancel()
```

### Unit Test Setup

The `test/unit/setup.go` file provides setup functions for unit tests:

```go
// Get a test configuration
cfg := unit.TestConfig()

// Get a test logger
logger := unit.TestLogger()

// Set up a test environment
cfg, logger := unit.SetupTest(t)
```

## TypeScript Test Framework

### Mock Generators

The `src/test-utils/mocks.ts` file provides mock implementations:

```typescript
// Create a mock client
const mockClient = new MockMCPClient();

// Set up the mock to return test data
mockClient.mockTool('getMachineDetails', () => testMachine);

// Reset the mock
mockClient.reset();
```

### Assertion Helpers

The `src/test-utils/assertions.ts` file provides custom assertion helpers:

```typescript
// Check if an object has all required properties
expectToHaveProperties(obj, ['id', 'name', 'status']);

// Check if a machine has the expected structure
expectValidMachine(machine);
```

### Test Fixtures

The `src/test-utils/fixtures.ts` file provides functions to create test fixtures:

```typescript
// Create a test machine
const testMachine = createMachineFixture('abc123', 'test-machine');

// Create a test machine with details
const testMachineDetails = createMachineDetailsFixture('abc123', 'test-machine');

// Create a test subnet
const testSubnet = createSubnetFixture('123', 'test-subnet', '192.168.1.0/24');
```

### Helper Functions

The `src/test-utils/helpers.ts` file provides helper functions for common testing operations:

```typescript
// Create a temporary file for testing
const { path, cleanup } = createTempFile('file content');
cleanup(); // Don't forget to clean up

// Wait for a condition to be true
const success = await waitForCondition(() => someAsyncCondition(), 5000);
```

## Configuration Files

- `jest.config.js` - Jest configuration for TypeScript tests
- `vitest.config.ts` - Vitest configuration (alternative to Jest)

## Example Tests

- `internal/service/example_test.go` - Example Go test
- `src/__tests__/example.test.ts` - Example TypeScript test

## Dependencies

### Go

- `github.com/stretchr/testify/assert` - Assertion library
- `github.com/stretchr/testify/require` - Required assertions
- `github.com/stretchr/testify/mock` - Mocking library

### TypeScript

- `vitest` - Testing framework
- `jest` - Alternative testing framework

## Usage

### Running Go Tests

```bash
# Run all tests
go test ./...

# Run tests in a specific package
go test ./internal/service

# Run a specific test
go test ./internal/service -run TestExampleService

# Run tests with coverage
go test ./... -coverprofile=coverage.out
go tool cover -html=coverage.out
```

### Running TypeScript Tests

```bash
# Install dependencies
npm install

# Run tests with Jest
npm test

# Run tests with Vitest
npm run test:vitest

# Run tests with coverage
npm test -- --coverage
```

## Best Practices

1. Use the provided test utilities to make tests more readable and maintainable
2. Follow the patterns in the example tests
3. Use descriptive test names
4. Use subtests to organize related tests
5. Clean up resources after tests
6. Use mocks to isolate the code being tested
7. Use fixtures to create test data
8. Use assertions to verify results