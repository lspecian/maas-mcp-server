#!/bin/bash

# Test the MCP endpoint using curl
echo "Testing MCP endpoint with listMachines tool..."
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "method": "executeTool",
    "params": {
      "name": "listMachines",
      "arguments": {}
    },
    "id": 1
  }'

echo -e "\n\nDone!"