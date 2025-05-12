// Test importing the MCP SDK
const path = require('path');
const fs = require('fs');

// List the contents of the dist/cjs/server directory
console.log("Contents of dist/cjs/server directory:");
const serverDir = path.join(__dirname, 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'cjs', 'server');
fs.readdirSync(serverDir).forEach(file => {
  console.log(`- ${file}`);
});

// Try to import the mcp.js file directly
try {
  const mcpPath = path.join(serverDir, 'mcp.js');
  console.log(`Importing from: ${mcpPath}`);
  const { McpServer } = require(mcpPath);
  console.log("Successfully imported McpServer:", McpServer);
} catch (error) {
  console.error("Error importing McpServer:", error);
}