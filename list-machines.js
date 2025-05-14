/**
 * MAAS MCP Server - List Machines Test Script
 *
 * This script tests the MAAS MCP Server by making a request to list machines.
 * It provides two methods:
 * 1. Direct API endpoint (/api/machines)
 * 2. MCP protocol endpoint (/mcp)
 *
 * Usage:
 *   node list-machines.js [--mcp] [--port=3000]
 *
 * Options:
 *   --mcp    Use the MCP protocol endpoint instead of the direct API endpoint
 *   --port   Specify the port (default: 3000)
 */

// Use ES modules
import fetch from 'node-fetch';

// Parse command line arguments
const args = process.argv.slice(2);
const useMcp = args.includes('--mcp');
const portArg = args.find(arg => arg.startsWith('--port='));
const port = portArg ? portArg.split('=')[1] : '3000';

async function listMachinesDirectApi() {
  try {
    console.log(`Making request to http://localhost:${port}/api/machines`);
    const response = await fetch(`http://localhost:${port}/api/machines`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('\nMachines List (Direct API):\n');
    console.log(JSON.stringify(data, null, 2));
    
    console.log(`\nTotal machines: ${data.count}`);
    return data;
  } catch (error) {
    console.error('Error listing machines via direct API:', error);
    throw error;
  }
}

async function listMachinesMcp() {
  try {
    console.log(`Making request to http://localhost:${port}/mcp`);
    
    // Log the request body for debugging
    const requestBody = {
      jsonrpc: '2.0',
      method: 'executeTool',
      params: {
        name: 'listMachines',
        arguments: {}
      },
      id: 1,
    };
    
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    // Make the MCP request
    const response = await fetch(`http://localhost:${port}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify(requestBody),
    });
    
    // Log response headers for debugging
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries([...response.headers.entries()]));
    
    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(`HTTP error! Status: ${response.status}, Body: ${responseText}`);
    }
    
    // Parse the response as JSON
    const responseText = await response.text();
    console.log('Response text:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Failed to parse response as JSON: ${e.message}, Response: ${responseText}`);
    }
    
    if (data.error) {
      throw new Error(`MCP error ${data.error.code}: ${data.error.message}`);
    }
    
    console.log('\nMachines List (MCP Protocol):\n');
    console.log(JSON.stringify(data.result, null, 2));
    
    console.log(`\nTotal machines: ${data.result.count}`);
    return data.result;
  } catch (error) {
    console.error('Error listing machines via MCP protocol:', error);
    throw error;
  }
}

// Main function
async function main() {
  console.log('MAAS MCP Server - List Machines Test');
  console.log('====================================');
  console.log(`Using ${useMcp ? 'MCP protocol' : 'direct API'} endpoint on port ${port}`);
  
  try {
    if (useMcp) {
      await listMachinesMcp();
    } else {
      await listMachinesDirectApi();
    }
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('\nTest failed:', error.message);
    process.exit(1);
  }
}

// Run the main function
main();