const fetch = require('node-fetch');

async function testMcpConnection() {
  try {
    const response = await fetch('http://localhost:3002/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'getServerInfo',
        params: {},
        id: 1,
      }),
    });

    const data = await response.json();
    console.log('MCP Server Response:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Error connecting to MCP server:', error);
    throw error;
  }
}

testMcpConnection()
  .then(result => {
    console.log('Connection successful!');
  })
  .catch(error => {
    console.error('Connection failed:', error.message);
    process.exit(1);
  });