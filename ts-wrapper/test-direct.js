import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read MAAS configuration from mcp.json
let maasConfig;
try {
  const mcpJsonPath = path.resolve(__dirname, '../../../.roo/mcp.json');
  if (fs.existsSync(mcpJsonPath)) {
    const mcpJson = JSON.parse(fs.readFileSync(mcpJsonPath, 'utf8'));
    if (mcpJson.mcpServers && mcpJson.mcpServers['maas-server'] && mcpJson.mcpServers['maas-server'].maasConfig) {
      maasConfig = mcpJson.mcpServers['maas-server'].maasConfig;
      console.log('Loaded MAAS configuration from .roo/mcp.json');
    }
  }
} catch (error) {
  console.error('Error loading MAAS configuration from .roo/mcp.json:', error);
}

// Make a direct request to the Go server
async function testGetMachineDetails() {
  try {
    const response = await axios.post(
      'http://localhost:8082/mcp/maas_get_machine_details',
      {
        system_id: '44afsh',
        _maasConfig: maasConfig,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testGetMachineDetails();