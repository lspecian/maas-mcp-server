import { spawn } from 'child_process';
import readline from 'readline';

// Start the MCP server
const mcp = spawn('./mcp-server-clean', ['stdio']);

// Create readline interface
const rl = readline.createInterface({
  input: mcp.stdout,
  terminal: false
});

// Handle server output
rl.on('line', (line) => {
  console.log(`Server: ${line}`);
  
  // Check if this is the "MCP server ready" message
  if (line === 'MCP server ready') {
    console.log('Server is ready, sending discovery request...');
    
    // Send discovery request
    const discoveryRequest = {
      jsonrpc: '2.0',
      method: 'discover',
      params: {},
      id: '1'
    };
    
    mcp.stdin.write(JSON.stringify(discoveryRequest) + '\n');
  } else {
    try {
      // Try to parse the response as JSON
      const response = JSON.parse(line);
      
      // Check if this is a discovery response
      if (response.id === '1') {
        console.log('Discovery successful!');
        console.log('Server capabilities:');
        console.log(JSON.stringify(response.result.capabilities, null, 2));
        
        // Send list machines request
        console.log('\nSending list machines request...');
        const listMachinesRequest = {
          jsonrpc: '2.0',
          method: 'maas_list_machines',
          params: {},
          id: '2'
        };
        
        mcp.stdin.write(JSON.stringify(listMachinesRequest) + '\n');
      } else if (response.id === '2') {
        console.log('List machines successful!');
        console.log('Machines:');
        console.log(JSON.stringify(response.result.machines, null, 2));
        
        // Exit after successful test
        console.log('\nTest completed successfully!');
        mcp.kill();
        process.exit(0);
      }
    } catch (err) {
      // Not a JSON response, ignore
    }
  }
});

// Handle errors
mcp.stderr.on('data', (data) => {
  console.error(`Server error: ${data}`);
});

mcp.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Received SIGINT, terminating...');
  mcp.kill();
  process.exit(0);
});