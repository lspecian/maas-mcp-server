/**
 * E2E Test for MAAS MCP Server - Testing tools/call method with maas_list_machines
 *
 * This test script verifies that the tools/call method works correctly with the
 * MCP protocol standard. It sends a tools/call request to the server and validates
 * that the response contains the expected content array structure.
 *
 * This test is designed to simulate how Roo Code would interact with the MCP server.
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import readline from 'readline';
import { fileURLToPath } from 'url';

// Get current file directory (ES modules don't have __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SERVER_BINARY = path.resolve(__dirname, '../../../maas-mcp-server');
const SERVER_ARGS = ['stdio'];
const TEST_RESULTS_FILE = path.resolve(__dirname, '../../../test/results/list-machines-test-results.json');

// Test results
const testResults = {
  initialized: false,
  toolsListed: false,
  toolCalled: false,
  lastResponse: null,
  errors: []
};

// Start the server process
console.log(`Starting MCP server: ${SERVER_BINARY} ${SERVER_ARGS.join(' ')}`);
const serverProcess = spawn(SERVER_BINARY, SERVER_ARGS);

// Set up readline interface for reading server output
const rl = readline.createInterface({
  input: serverProcess.stdout,
  crlfDelay: Infinity
});

// Set up server log handling
serverProcess.stderr.on('data', (data) => {
  // Just log server output to console but don't treat as errors
  console.log(`Server log: ${data}`);
});

// Handle server process exit
serverProcess.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
  
  // Save test results
  fs.writeFileSync(TEST_RESULTS_FILE, JSON.stringify(testResults, null, 2));
  
  if (testResults.errors.length > 0) {
    console.error('Test failed with errors:');
    testResults.errors.forEach(err => console.error(`- ${err}`));
    process.exit(1);
  } else if (!testResults.initialized || !testResults.toolsListed || !testResults.toolCalled) {
    console.error('Test failed: Not all steps completed successfully');
    process.exit(1);
  } else {
    console.log('Test completed successfully!');
    console.log(`Results saved to ${TEST_RESULTS_FILE}`);
    process.exit(0);
  }
});

// Process server output
let serverReady = false;
let initializeSent = false;
let toolsListSent = false;
let toolCallSent = false;

rl.on('line', (line) => {
  // Skip empty lines
  if (!line.trim()) return;
  
  console.log(`Server: ${line}`);
  
  try {
    // Try to parse as JSON
    const message = JSON.parse(line);
    
    // Handle server responses
    if (message.method === 'ready') {
      serverReady = true;
      console.log('Server is ready, sending initialize request');
      sendInitialize();
    } else if (message.result && message.result.protocolVersion) {
      // Handle initialize response
      console.log('Received initialize response');
      testResults.initialized = true;
    } else if (message.method === 'notifications/initialized') {
      // Handle initialized notification
      console.log('Received initialized notification');
      sendToolsList();
    } else if (message.result && message.result.tools) {
      // Handle tools/list response
      console.log('Received tools/list response');
      testResults.toolsListed = true;
      sendToolCall();
    } else if (message.result && message.id === 'tool-call') {
      // Handle tool call response
      console.log('Received tool call response');
      testResults.toolCalled = true;
      testResults.lastResponse = message;
      
      // Validate response structure
      if (!message.result.content || !Array.isArray(message.result.content)) {
        testResults.errors.push('Response missing content array');
        console.error('ERROR: Response missing content array');
      } else {
        console.log('Response contains content array as expected');
        console.log('Content:', JSON.stringify(message.result.content, null, 2));
      }
      
      // Terminate the server after successful test
      console.log('Test completed, terminating server');
      serverProcess.kill();
    }
  } catch (err) {
    // Not JSON or other error
    if (line.includes('MCP server ready') && !serverReady) {
      serverReady = true;
      console.log('Server is ready, sending initialize request');
      sendInitialize();
    }
  }
});

// Send initialize request
function sendInitialize() {
  if (initializeSent) return;
  initializeSent = true;
  
  const initializeRequest = {
    jsonrpc: '2.0',
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      clientInfo: {
        name: 'Roo Code',
        version: '1.0.0'
      },
      capabilities: {}
    },
    id: 'init'
  };
  
  sendRequest(initializeRequest);
}

// Send tools/list request
function sendToolsList() {
  if (toolsListSent) return;
  toolsListSent = true;
  
  const toolsListRequest = {
    jsonrpc: '2.0',
    method: 'tools/list',
    params: {},
    id: 'tools-list'
  };
  
  sendRequest(toolsListRequest);
}

// Send tools/call request for maas_list_machines
function sendToolCall() {
  if (toolCallSent) return;
  toolCallSent = true;
  
  // This is the key part of the test - using the tools/call method
  // with the name and arguments parameters as required by the MCP protocol
  const toolCallRequest = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'maas_list_machines',
      arguments: {}
    },
    id: 'tool-call'
  };
  
  sendRequest(toolCallRequest);
}

// Send a request to the server
function sendRequest(request) {
  const requestStr = JSON.stringify(request);
  console.log(`Sending request: ${requestStr}`);
  serverProcess.stdin.write(requestStr + '\n');
}