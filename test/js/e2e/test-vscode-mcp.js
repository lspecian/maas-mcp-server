// This script simulates how VSCode connects to an MCP server
// It uses a more strict protocol handling similar to what VSCode might expect

import { spawn } from 'child_process';
import readline from 'readline';
import fs from 'fs';

console.log('Starting VSCode MCP connection test...');

// Start the MCP server
const mcp = spawn('./mcp-server-clean', ['stdio']);

// Create readline interface
const rl = readline.createInterface({
  input: mcp.stdout,
  terminal: false
});

// Track if we've received a valid ready message
let readyReceived = false;
let discoveryComplete = false;

// Log all server output for debugging
mcp.stderr.on('data', (data) => {
  console.error(`Server stderr: ${data}`);
});

// Handle server output
rl.on('line', (line) => {
  console.log(`Server output: ${line}`);
  
  // Try to parse as JSON first (VSCode expects JSON-RPC)
  try {
    const jsonResponse = JSON.parse(line);
    
    // Check if this is a ready message in JSON-RPC format
    if (jsonResponse.method === 'ready' && !readyReceived) {
      console.log('Received JSON-RPC ready message');
      readyReceived = true;
      
      // Send discovery request in strict JSON-RPC 2.0 format
      console.log('Sending discovery request...');
      const discoveryRequest = {
        jsonrpc: '2.0',
        method: 'discover',
        params: {},
        id: '1'
      };
      
      mcp.stdin.write(JSON.stringify(discoveryRequest) + '\n');
    }
    // Check if this is a discovery response
    else if (jsonResponse.id === '1' && !discoveryComplete) {
      console.log('Discovery response received:');
      console.log(JSON.stringify(jsonResponse.result, null, 2));
      discoveryComplete = true;
      
      // Send a test tool request
      console.log('\nSending test tool request...');
      const toolRequest = {
        jsonrpc: '2.0',
        method: 'maas_list_machines',
        params: {},
        id: '2'
      };
      
      mcp.stdin.write(JSON.stringify(toolRequest) + '\n');
    }
    // Check if this is a tool response
    else if (jsonResponse.id === '2') {
      console.log('Tool response received:');
      if (jsonResponse.error) {
        console.log('Error:', jsonResponse.error);
      } else {
        console.log('Success!');
      }
      
      // Test complete
      console.log('\nTest completed successfully!');
      
      // Save test results
      fs.writeFileSync('vscode-mcp-test-results.json', JSON.stringify({
        readyReceived,
        discoveryComplete,
        lastResponse: jsonResponse
      }, null, 2));
      
      // Exit after successful test
      mcp.kill();
      process.exit(0);
    }
  } catch (err) {
    // Not JSON, check if it's the plain text ready message
    if (line === 'MCP server ready' && !readyReceived) {
      console.log('Received plain text ready message');
      readyReceived = true;
      
      // Send discovery request
      console.log('Sending discovery request...');
      const discoveryRequest = {
        jsonrpc: '2.0',
        method: 'discover',
        params: {},
        id: '1'
      };
      
      mcp.stdin.write(JSON.stringify(discoveryRequest) + '\n');
    }
  }
});

// Set a timeout to exit if we don't get a response
setTimeout(() => {
  if (!readyReceived) {
    console.error('ERROR: No ready message received within timeout period');
    fs.writeFileSync('vscode-mcp-test-results.json', JSON.stringify({
      error: 'No ready message received',
      readyReceived: false,
      discoveryComplete: false
    }, null, 2));
  } else if (!discoveryComplete) {
    console.error('ERROR: Discovery request failed or timed out');
    fs.writeFileSync('vscode-mcp-test-results.json', JSON.stringify({
      error: 'Discovery request failed',
      readyReceived: true,
      discoveryComplete: false
    }, null, 2));
  }
  
  mcp.kill();
  process.exit(1);
}, 10000); // 10 second timeout

// Handle process termination
process.on('SIGINT', () => {
  console.log('Received SIGINT, terminating...');
  mcp.kill();
  process.exit(0);
});