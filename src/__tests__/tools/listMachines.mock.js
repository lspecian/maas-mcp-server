/**
 * Mock implementation of the listMachines module for testing
 */

// Mock schema
const listMachinesSchema = {
  shape: {
    hostname: { description: "Filter machines by hostname" },
    mac_address: { description: "Filter machines by MAC address" },
    tag_names: { description: "Filter machines by tag names" },
    status: { description: "Filter machines by status" },
    zone: { description: "Filter machines by zone" },
    pool: { description: "Filter machines by pool" },
    owner: { description: "Filter machines by owner" },
    architecture: { description: "Filter machines by architecture" },
    limit: { description: "Limit the number of machines returned" },
    offset: { description: "Skip the first N machines" }
  }
};

/**
 * Mock implementation of the registerListMachinesTool function
 * @param {Object} server - The MCP server instance
 * @param {Object} maasApiClient - The MAAS API client instance
 */
function registerListMachinesTool(server, maasApiClient) {
  server.tool(
    'maas_list_machines',
    listMachinesSchema.shape,
    async (params, { signal }) => {
      try {
        const apiParams = {};
        
        if (params.hostname) apiParams.hostname = params.hostname;
        if (params.mac_address) apiParams.mac_addresses = params.mac_address;
        if (params.tag_names && params.tag_names.length > 0) apiParams.tag_names = params.tag_names.join(',');
        if (params.status) apiParams.status = params.status;
        if (params.zone) apiParams.zone = params.zone;
        if (params.pool) apiParams.pool = params.pool;
        if (params.owner) apiParams.owner = params.owner;
        if (params.architecture) apiParams.architecture = params.architecture;
        if (typeof params.limit === 'number') apiParams.limit = params.limit;
        if (typeof params.offset === 'number') apiParams.offset = params.offset;
        
        const machines = await maasApiClient.get('/machines', apiParams, signal);
        
        return {
          content: [{ type: "text", text: JSON.stringify(machines) }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error listing machines: ${error.message}` }],
          isError: true
        };
      }
    }
  );
}

module.exports = {
  registerListMachinesTool,
  listMachinesSchema
};