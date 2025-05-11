/**
 * Mock implementation of the machineDetails resource for testing
 */

// Mock URI pattern
const MACHINE_DETAILS_URI_PATTERN = 'maas://machine/{system_id}/details';

// Mock ResourceTemplate
const machineDetailsTemplate = {
  pattern: MACHINE_DETAILS_URI_PATTERN,
  options: { list: undefined }
};

// Mock MaasMachineSchema
const MaasMachineSchema = {
  parse: jest.fn(data => data) // Simple mock that returns data as is
};

/**
 * Mock implementation of the registerMachineDetailsResource function
 * @param {Object} server - The MCP server instance
 * @param {Object} maasClient - The MAAS API client instance
 */
function registerMachineDetailsResource(server, maasClient) {
  server.resource(
    "maas_machine_details",
    machineDetailsTemplate,
    async (uri, params, { signal }) => {
      const { system_id } = params;
      if (!system_id) {
        throw new Error("System ID is missing in the resource URI.");
      }

      try {
        // Pass signal to MaasApiClient method
        const machineDetails = await maasClient.get(`/machines/${system_id}`, undefined, signal);
        
        // Validate response against schema
        const validatedData = MaasMachineSchema.parse(machineDetails);
        
        // Create a JSON string of the validated data
        const jsonString = JSON.stringify(validatedData);
        
        // Return in the format expected by the SDK
        return {
          contents: [{
            uri: uri.toString(),
            text: jsonString,
            mimeType: "application/json"
          }]
        };
      } catch (error) {
        console.error(`Error fetching MAAS machine details for ${system_id}: ${error.message}`);
        throw new Error(`Could not fetch MAAS machine details for ${system_id}. Original error: ${error.message.substring(0,100)}`);
      }
    }
  );
}

module.exports = {
  MACHINE_DETAILS_URI_PATTERN,
  machineDetailsTemplate,
  registerMachineDetailsResource,
  MaasMachineSchema
};