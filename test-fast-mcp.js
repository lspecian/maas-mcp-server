/**
 * Test script for the Fast MCP server
 * 
 * This script tests the listMachines tool using the Fast MCP server.
 */

import fetch from 'node-fetch';

// Configuration
const port = process.env.MCP_PORT || 3000;

async function testListMachines() {
  try {
    console.log('Fast MCP Server - Test listMachines Tool');
    console.log('========================================');
    console.log(`Making request to http://localhost:${port}/mcp`);
    
    // Create the request body
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
    
    // Make the request
    const response = await fetch(`http://localhost:${port}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify(requestBody),
    });
    
    // Log response headers
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries([...response.headers.entries()]));
    
    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(`HTTP error! Status: ${response.status}, Body: ${responseText}`);
    }
    
    // Parse the response
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
    
    if (data.result && data.result.machines) {
      console.log(`\nTotal machines: ${data.result.count}`);
    }
    
    console.log('\nTest completed successfully!');
    return data.result;
  } catch (error) {
    console.error('Error testing listMachines tool:', error);
    throw error;
  }
}

// Run the test
testListMachines().catch(error => {
  console.error('Test failed:', error.message);
  process.exit(1);
});