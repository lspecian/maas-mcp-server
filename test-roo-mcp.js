#!/usr/bin/env node

/**
 * Test script for the MAAS MCP server through Roo interface
 * 
 * This script demonstrates how to use the MCP server through the Roo interface
 * by simulating the use_mcp_tool and access_mcp_resource tools.
 */

import fetch from 'node-fetch';

// Configuration
const ROO_SERVER_URL = 'http://localhost:3000/api/mcp';
const MCP_SERVER_NAME = 'maas-clean';

/**
 * Simulate the use_mcp_tool Roo tool
 * @param {string} serverName - The name of the MCP server
 * @param {string} toolName - The name of the tool to use
 * @param {object} args - The arguments for the tool
 * @returns {Promise<object>} - The response from the MCP server
 */
async function useMcpTool(serverName, toolName, args) {
  console.log(`\n=== Using MCP Tool: ${toolName} on ${serverName} ===`);
  console.log('Arguments:', JSON.stringify(args, null, 2));
  
  try {
    // In a real Roo environment, this would be handled by the use_mcp_tool tool
    // Here we're simulating it by making a direct request to the MCP server
    const response = await fetch(`http://localhost:8081/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: toolName,
        params: args,
        id: Date.now().toString(),
      }),
    });

    const result = await response.json();
    
    if (result.error) {
      console.error('Error:', result.error);
      return null;
    }
    
    console.log('Result:', JSON.stringify(result.result, null, 2));
    return result.result;
  } catch (error) {
    console.error('Request failed:', error.message);
    return null;
  }
}

/**
 * Simulate the access_mcp_resource Roo tool
 * @param {string} serverName - The name of the MCP server
 * @param {string} uri - The URI of the resource to access
 * @returns {Promise<object>} - The response from the MCP server
 */
async function accessMcpResource(serverName, uri) {
  console.log(`\n=== Accessing MCP Resource: ${uri} on ${serverName} ===`);
  
  try {
    // In a real Roo environment, this would be handled by the access_mcp_resource tool
    // Here we're simulating it by making a direct request to the MCP server
    const response = await fetch(`http://localhost:8081/mcp/resource/${uri}`);
    const result = await response.json();
    
    console.log('Result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Request failed:', error.message);
    return null;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('=== Testing MAAS MCP Server through Roo Interface ===');
  
  // Test listing machines
  const listResult = await useMcpTool(MCP_SERVER_NAME, 'maas_list_machines', {});
  if (!listResult || !listResult.machines || listResult.machines.length === 0) {
    console.error('No machines found or tool failed.');
    return;
  }
  
  // Get the first machine ID
  const machineId = listResult.machines[0].id;
  
  // Test getting machine details
  console.log(`\nGetting details for machine ${machineId}`);
  const detailsResult = await useMcpTool(MCP_SERVER_NAME, 'maas_get_machine_details', { id: machineId });
  
  if (!detailsResult || !detailsResult.machine) {
    console.error(`Failed to get details for machine ${machineId}`);
    return;
  }
  
  // Test power operations
  const powerState = detailsResult.machine.power_state;
  if (powerState === 'off') {
    console.log(`\nPowering on machine ${machineId}`);
    await useMcpTool(MCP_SERVER_NAME, 'maas_power_on_machine', { id: machineId });
  } else {
    console.log(`\nPowering off machine ${machineId}`);
    await useMcpTool(MCP_SERVER_NAME, 'maas_power_off_machine', { id: machineId });
  }
  
  // Get updated machine details
  console.log(`\nGetting updated details for machine ${machineId}`);
  await useMcpTool(MCP_SERVER_NAME, 'maas_get_machine_details', { id: machineId });
  
  console.log('\n=== Test completed successfully ===');
}

// Run the main function
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});