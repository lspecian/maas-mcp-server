const fetch = require('node-fetch');

async function testPowerOnMachine() {
  const baseUrl = 'http://localhost:8081/mcp';
  
  // Test power on machine
  console.log('Testing power on machine...');
  const powerOnResponse = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'maas_power_on_machine',
      params: {
        system_id: '44afsh', // Using the provided valid system ID
      },
      id: '1',
    }),
  });
  
  const powerOnResult = await powerOnResponse.text();
  console.log('Power on result:', powerOnResult);
}

testPowerOnMachine().catch(error => {
  console.error('Error:', error);
});