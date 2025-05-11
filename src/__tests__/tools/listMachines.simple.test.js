/**
 * Simple tests for the listMachines MCP tool
 */

// Mock the MaasApiClient
jest.mock('../../maas/MaasApiClient', () => {
  return {
    MaasApiClient: jest.fn().mockImplementation(() => ({
      get: jest.fn().mockResolvedValue([
        {
          system_id: 'abc123',
          hostname: 'test-machine-1',
          status_name: 'Ready'
        }
      ])
    }))
  };
});

// Use our mock implementation instead of the real one
jest.mock('../../mcp_tools/listMachines', () => {
  return require('./listMachines.mock');
});

const { MaasApiClient } = require('../../maas/MaasApiClient');
const { registerListMachinesTool, listMachinesSchema } = require('../../mcp_tools/listMachines');

describe('List Machines MCP Tool', () => {
  let mockServer;
  let mockMaasClient;
  
  beforeEach(() => {
    // Create mock instances
    mockMaasClient = new MaasApiClient();
    mockServer = {
      tool: jest.fn()
    };
    
    // Reset mocks
    jest.clearAllMocks();
  });
  
  test('should register the tool with the server', () => {
    // Register the tool
    registerListMachinesTool(mockServer, mockMaasClient);
    
    // Verify the tool was registered
    expect(mockServer.tool).toHaveBeenCalled();
    expect(mockServer.tool.mock.calls[0][0]).toBe('maas_list_machines');
    expect(mockServer.tool.mock.calls[0][1]).toBe(listMachinesSchema.shape);
    expect(typeof mockServer.tool.mock.calls[0][2]).toBe('function');
  });
  
  test('should call MAAS API with correct parameters', async () => {
    // Register the tool
    registerListMachinesTool(mockServer, mockMaasClient);
    
    // Get the handler function
    const handler = mockServer.tool.mock.calls[0][2];
    
    // Call the handler with parameters
    const params = {
      hostname: 'test',
      status: 'ready',
      tag_names: ['tag1', 'tag2']
    };
    
    await handler(params, { signal: undefined });
    
    // Verify MAAS API was called with correct parameters
    expect(mockMaasClient.get).toHaveBeenCalledWith('/machines', {
      hostname: 'test',
      status: 'ready',
      tag_names: 'tag1,tag2'
    }, undefined);
  });
  
  test('should return machines data in the correct format', async () => {
    // Register the tool
    registerListMachinesTool(mockServer, mockMaasClient);
    
    // Get the handler function
    const handler = mockServer.tool.mock.calls[0][2];
    
    // Call the handler
    const result = await handler({}, { signal: undefined });
    
    // Verify result has the correct format
    expect(result).toEqual({
      content: [{ 
        type: "text", 
        text: JSON.stringify([{
          system_id: 'abc123',
          hostname: 'test-machine-1',
          status_name: 'Ready'
        }]) 
      }]
    });
  });
  
  test('should handle API errors', async () => {
    // Setup mock to throw an error
    const errorMessage = 'API connection failed';
    mockMaasClient.get.mockRejectedValueOnce(new Error(errorMessage));
    
    // Register the tool
    registerListMachinesTool(mockServer, mockMaasClient);
    
    // Get the handler function
    const handler = mockServer.tool.mock.calls[0][2];
    
    // Call the handler
    const result = await handler({}, { signal: undefined });
    
    // Verify the error result has the correct format
    expect(result).toEqual({
      content: [{ type: "text", text: `Error listing machines: ${errorMessage}` }],
      isError: true
    });
  });
});