# JavaScript Tests Directory

This directory contains JavaScript tests for the MAAS MCP Server project, organized by test type.

## Directory Structure

- `e2e/` - End-to-end tests that test the entire system
- `integration/` - Integration tests that test multiple components together
- `unit/` - Unit tests that test individual components

## Test Types

### End-to-End Tests

The `e2e/` directory contains tests that simulate real-world usage scenarios, testing the entire system from end to end. These tests typically involve starting the server, connecting to it, and performing operations as a client would.

Files:
- `test-vscode-mcp.js` - Tests the VSCode MCP connection
- `test-vscode-specific-mcp.js` - Tests VSCode-specific MCP functionality

### Integration Tests

The `integration/` directory contains tests that verify the interaction between multiple components. These tests focus on ensuring that different parts of the system work together correctly.

Files:
- `test-list-machines.js` - Tests the list machines functionality
- `test-mcp-connection.js` - Tests the MCP connection
- `test-mcp-tool.js` - Tests the MCP tools
- `test-power-management.js` - Tests power management functionality
- `test-power-on.js` - Tests power-on functionality
- `test-roo-mcp.js` - Tests Roo MCP integration

### Unit Tests

The `unit/` directory contains tests for individual components in isolation. These tests focus on verifying that each component works correctly on its own.

Files:
- `test-mcp-clean.js` - Tests the clean MCP server
- `performance-test.js` - Tests performance characteristics

## Running Tests

To run these tests, use the appropriate test runner (Jest, Vitest, or custom scripts) from the project root directory.

Example:
```bash
npm test
```

Or run individual tests:
```bash
node test/js/integration/test-mcp-connection.js