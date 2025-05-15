const fetch = require('node-fetch');

async function powerOffAllMachines() {
  const baseUrl = 'http://localhost:8081/mcp';
  
  try {
    // Step 1: Get a list of all machines
    console.log('Getting list of all machines...');
    const listResponse = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'maas_list_machines',
        params: {},
        id: '1',
      }),
    });
    
    const listResult = await listResponse.json();
    
    // The response structure is nested: result.result contains the machines array
    const machines = listResult.result?.result;
    console.log('Machines found:', machines ? machines.length : 0);
    
    if (!machines || !Array.isArray(machines)) {
      console.error('Failed to get machine list:', listResult);
      return;
    }
    
    // Step 2: Power off each machine
    for (const machine of machines) {
      console.log(`Powering off machine: ${machine.hostname} (${machine.system_id})...`);
      
      const powerOffResponse = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'maas_power_off_machine',
          params: {
            system_id: machine.system_id,
          },
          id: machine.system_id,
        }),
      });
      
      const powerOffResult = await powerOffResponse.json();
      console.log(`Power off result for ${machine.hostname}:`, 
        powerOffResult.error ? 
          `Error: ${powerOffResult.error.message}` : 
          `Success: Power state is now ${powerOffResult.result?.power_state || 'unknown'}`
      );
    }
    
    console.log('All machines have been powered off.');
  } catch (error) {
    console.error('Error:', error);
  }
}

powerOffAllMachines();