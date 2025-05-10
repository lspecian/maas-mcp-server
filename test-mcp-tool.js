// Simple script to test the MCP tool
const axios = require('axios');

async function testMcpTool() {
  try {
    // Initialize the MCP server
    const initResponse = await axios.post(
      'http://localhost:8081/mcp',
      {
        jsonrpc: '2.0',
        method: 'initialize',
        params: {},
        id: '1'
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Initialize response:', JSON.stringify(initResponse.data, null, 2));
    
    // Call the maas_list_machines tool
    const listMachinesResponse = await axios.post(
      'http://localhost:8081/mcp',
      {
        jsonrpc: '2.0',
        method: 'maas_list_machines',
        params: {},
        id: '2'
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('List machines response:', JSON.stringify(listMachinesResponse.data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testMcpTool();