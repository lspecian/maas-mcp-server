#!/bin/bash

# Build the MCP server
echo "Building MCP server..."
./build.sh

# Run the VSCode MCP connection test
echo "Running VSCode MCP connection test..."
node test-vscode-mcp.js

# Check the test results
if [ -f "vscode-mcp-test-results.json" ]; then
  echo "Test results saved to vscode-mcp-test-results.json"
  cat vscode-mcp-test-results.json
else
  echo "Test failed to create results file"
  exit 1
fi

echo "Test complete!"