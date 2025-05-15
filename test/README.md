# MAAS MCP Server Test Directory

This directory contains tests for the MAAS MCP Server project, organized by language and test type.

## Directory Structure

- `go/` - Go tests
- `html/` - HTML-based tests
- `integration/` - Go integration tests
- `js/` - JavaScript tests
  - `e2e/` - End-to-end tests
  - `integration/` - Integration tests
  - `unit/` - Unit tests
- `results/` - Test result files
- `unit/` - Go unit test helpers
- `utils/` - Test utilities

## Test Types

### Go Tests

The Go tests are primarily integration tests that verify the server's functionality from a Go client perspective. These tests are located in the `integration/` directory and use the utilities in the `utils/` directory.

### JavaScript Tests

The JavaScript tests are organized by test type:

- **End-to-End Tests**: Test the entire system from end to end
- **Integration Tests**: Test multiple components together
- **Unit Tests**: Test individual components

### HTML Tests

The HTML tests are browser-based tests that verify functionality that requires a browser environment, such as Server-Sent Events (SSE).

## Running Tests

### Go Tests

```bash
# Run all Go tests
go test ./...

# Run integration tests
go test ./test/integration/...
```

### JavaScript Tests

```bash
# Run all JavaScript tests
npm test

# Run specific tests
node test/js/integration/test-mcp-connection.js
```

### HTML Tests

Open the HTML files in a browser while the server is running:

```bash
# Start the server
./bin/mcp-server-clean

# Open the HTML test in a browser
open test/html/test-sse.html
```

## Test Results

Test results are stored in the `results/` directory as JSON files. These files can be examined to understand test failures or to verify test success.