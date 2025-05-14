/**
 * MAAS MCP Server - Mock List Machines Script
 * 
 * This script demonstrates how to use the MCP protocol to list machines
 * without requiring a real MAAS API server.
 */

import fetch from 'node-fetch';

// Parse command line arguments
const args = process.argv.slice(2);
const port = args.find(arg => arg.startsWith('--port='))?.split('=')[1] || '3000';

async function mockListMachines() {
  try {
    console.log('MAAS MCP Server - Mock List Machines Test');
    console.log('========================================');
    console.log(`Using direct mock implementation`);
    
    // Create mock data
    const mockData = {
      machines: [
        {
          system_id: 'abc123',
          hostname: 'machine-1',
          status: 'Ready',
          owner: 'admin',
          architecture: 'amd64/generic',
          cpu_count: 4,
          memory: 8192,
          zone: {
            name: 'default'
          },
          pool: {
            name: 'default'
          },
          ip_addresses: ['192.168.1.100'],
          tags: ['virtual', 'test']
        },
        {
          system_id: 'def456',
          hostname: 'machine-2',
          status: 'Deployed',
          owner: 'user1',
          architecture: 'amd64/generic',
          cpu_count: 8,
          memory: 16384,
          zone: {
            name: 'zone1'
          },
          pool: {
            name: 'production'
          },
          ip_addresses: ['192.168.1.101'],
          tags: ['physical', 'production']
        },
        {
          system_id: 'ghi789',
          hostname: 'machine-3',
          status: 'Commissioning',
          owner: null,
          architecture: 'arm64/generic',
          cpu_count: 2,
          memory: 4096,
          zone: {
            name: 'default'
          },
          pool: {
            name: 'testing'
          },
          ip_addresses: ['192.168.1.102'],
          tags: ['virtual', 'test']
        }
      ],
      count: 3
    };
    
    console.log('\nMock Machines List:\n');
    console.log(JSON.stringify(mockData, null, 2));
    
    console.log(`\nTotal machines: ${mockData.count}`);
    return mockData;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// Run the main function
mockListMachines();