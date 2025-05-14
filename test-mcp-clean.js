#!/usr/bin/env node

/**
 * Test script for the MAAS MCP server with clean architecture
 * 
 * This script demonstrates how to use the MCP server to interact with MAAS
 * using the Model Context Protocol.
 */

import fetch from 'node-fetch';

// Configuration
const MCP_SERVER_URL = 'http://localhost:8081/mcp';

/**
 * Make an MCP request
 * @param {string} method - The MCP method to call
 * @param {object} params - The parameters for the method
 * @returns {Promise<object>} - The response from the MCP server
 */
async function mcpRequest(method, params = {}) {
  console.log(`\n=== Calling ${method} ===`);
  console.log('Params:', JSON.stringify(params, null, 2));
  
  try {
    const response = await fetch(MCP_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
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
 * Get MCP server capabilities
 * @returns {Promise<object>} - The server capabilities
 */
async function getCapabilities() {
  console.log('\n=== Getting MCP Server Capabilities ===');
  
  try {
    const response = await fetch(MCP_SERVER_URL);
    const result = await response.json();
    
    console.log('Server Info:', result.result.serverInfo);
    console.log('Tools:', result.result.capabilities.tools.map(t => t.name).join(', '));
    console.log('Resources:', result.result.capabilities.resources.map(r => r.name).join(', '));
    
    return result.result.capabilities;
  } catch (error) {
    console.error('Failed to get capabilities:', error.message);
    return null;
  }
}

/**
 * List machines
 * @param {object} filters - Optional filters
 * @returns {Promise<Array>} - The list of machines
 */
async function listMachines(filters = {}) {
  const result = await mcpRequest('maas_list_machines', { filters });
  return result ? result.machines : [];
}

/**
 * Get machine details
 * @param {string} id - The machine ID
 * @returns {Promise<object>} - The machine details
 */
async function getMachineDetails(id) {
  const result = await mcpRequest('maas_get_machine_details', { id });
  return result ? result.machine : null;
}

/**
 * Power on a machine
 * @param {string} id - The machine ID
 * @returns {Promise<object>} - The updated machine
 */
async function powerOnMachine(id) {
  const result = await mcpRequest('maas_power_on_machine', { id });
  return result ? result.machine : null;
}

/**
 * Power off a machine
 * @param {string} id - The machine ID
 * @returns {Promise<object>} - The updated machine
 */
async function powerOffMachine(id) {
  const result = await mcpRequest('maas_power_off_machine', { id });
  return result ? result.machine : null;
}

/**
 * Main function
 */
async function main() {
  console.log('=== MAAS MCP Server Test ===');
  
  // Get server capabilities
  const capabilities = await getCapabilities();
  if (!capabilities) {
    console.error('Failed to get server capabilities. Is the server running?');
    process.exit(1);
  }
  
  // List machines
  const machines = await listMachines();
  if (machines.length === 0) {
    console.log('No machines found.');
    return;
  }
  
  // Get details for the first machine
  const machineId = machines[0].id;
  console.log(`\nGetting details for machine ${machineId}`);
  const machineDetails = await getMachineDetails(machineId);
  
  if (!machineDetails) {
    console.error(`Failed to get details for machine ${machineId}`);
    return;
  }
  
  // Power operations
  if (machineDetails.power_state === 'off') {
    console.log(`\nPowering on machine ${machineId}`);
    await powerOnMachine(machineId);
  } else {
    console.log(`\nPowering off machine ${machineId}`);
    await powerOffMachine(machineId);
  }
  
  // Get updated machine details
  console.log(`\nGetting updated details for machine ${machineId}`);
  await getMachineDetails(machineId);
}

// Run the main function
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});