# Test Standards and Conventions

This document outlines the standardized approach to testing in the MAAS MCP Server project. Following these guidelines ensures consistency, readability, and maintainability across all test files.

## 1. File Organization Standards

### 1.1 Directory Structure

Tests are organized by type and then by module:

```
src/__tests__/
├── unit/                  # Unit tests
│   ├── maas/              # Tests for MAAS API client
│   ├── mcp_resources/     # Tests for MCP resources
│   ├── mcp_tools/         # Tests for MCP tools
│   └── utils/             # Tests for utility functions
├── integration/           # Integration tests
│   ├── maas/              # MAAS API integration tests
│   ├── mcp_resources/     # MCP resources integration tests
│   └── mcp_server/        # MCP server integration tests
├── e2e/                   # End-to-end tests
├── contracts/             # Contract tests
├── benchmarks/            # Performance benchmarks
├── fixtures/              # Test fixtures and data
└── mocks/                 # Mock implementations
```

### 1.2 File Naming Convention

Test files should follow this naming pattern:
```
<module_name>.<test_type>.test.<extension>
```

Examples:
- `listMachines.unit.test.ts` - Unit test for listMachines module
- `mcp_resources.integration.test.ts` - Integration test for MCP resources
- `mcp_operations.e2e.test.js` - End-to-end test for MCP operations

## 2. Test Structure Standards

### 2.1 Basic Test Structure

All test files should follow this structure:

```javascript
// 1. Imports
import { ... } from '...';

// 2. Mocks (if needed)
jest.mock('...', () => ({
  // Mock implementation
}));

// 3. Test fixtures and setup
const testData = { ... };

// 4. Test suite
describe('Module Name', () => {
  // 5. Setup and teardown
  beforeAll(() => {
    // Setup that runs once before all tests
  });
  
  beforeEach(() => {
    // Setup that runs before each test
  });
  
  afterEach(() => {
    // Cleanup that runs after each test
  });
  
  afterAll(() => {
    // Cleanup that runs once after all tests
  });
  
  // 6. Test cases
  describe('Function or Feature Name', () => {
    test('should [expected behavior] when [condition]', () => {
      // Arrange
      // ...
      
      // Act
      // ...
      
      // Assert
      // ...
    });
  });
});
```

### 2.2 Test Case Naming Convention

Test cases should follow the pattern:
```
should [expected behavior] when [condition]
```

Examples:
- `should return a list of machines when no parameters are provided`
- `should throw an error when invalid parameters are passed`
- `should use cache for identical subsequent requests`

### 2.3 Describe Block Organization

Organize tests using nested `describe` blocks:

1. Top-level `describe` for the module being tested
2. Second-level `describe` for functions or features
3. Third-level `describe` for specific scenarios or conditions (if needed)

Example:
```javascript
describe('MachineResourceHandler', () => {
  describe('getMachines', () => {
    describe('with filtering parameters', () => {
      test('should filter by hostname', () => { ... });
      test('should filter by status', () => { ... });
    });
  });
});
```

## 3. Code Style Standards

### 3.1 Comments and Documentation

- Add a brief description at the top of each test file explaining what is being tested
- Use JSDoc comments for test helper functions
- Include comments for complex test setups or assertions

### 3.2 Assertion Patterns

Use consistent assertion patterns:

```javascript
// Existence checks
expect(result).toBeDefined();
expect(result).not.toBeNull();

// Equality checks
expect(result).toBe(expectedValue);
expect(result).toEqual(expectedObject);

// Array checks
expect(array).toHaveLength(expectedLength);
expect(array).toContain(expectedItem);

// Object checks
expect(object).toHaveProperty('propertyName');
expect(object).toMatchObject(expectedPartialObject);

// Error checks
expect(() => functionThatThrows()).toThrow();
expect(() => functionThatThrows()).toThrow(ExpectedErrorType);
expect(() => functionThatThrows()).toThrow('Expected error message');
```

### 3.3 Mock Data Management

- Store reusable mock data in fixture files
- Use factory functions for generating test data with variations
- Keep mock implementations close to the tests that use them

Example:
```javascript
// In src/__tests__/fixtures/machineResponses.ts
export const sampleMachines = [
  {
    system_id: "abc123",
    hostname: "test-machine-1",
    // ...
  }
];

// In a test file
import { sampleMachines } from '../fixtures/machineResponses';
```

## 4. Best Practices

### 4.1 Test Independence

- Each test should be independent and not rely on the state from other tests
- Reset mocks and spies between tests
- Clean up resources in `afterEach` or `afterAll` hooks

### 4.2 Test Coverage

- Aim for comprehensive test coverage, including:
  - Happy paths (expected inputs, expected outputs)
  - Edge cases (boundary values, empty inputs)
  - Error cases (invalid inputs, error handling)

### 4.3 Test Readability

- Follow the Arrange-Act-Assert (AAA) pattern
- Use descriptive variable names
- Keep tests focused on a single behavior

### 4.4 Mocking Strategy

- Mock external dependencies, not the code under test
- Use Jest's mock functions for spying on method calls
- Prefer shallow mocking over deep mocking when possible

## 5. Example Test File

See the template file at `src/__tests__/templates/example.unit.test.ts` for a complete example of these standards in practice.