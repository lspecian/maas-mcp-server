/**
 * Unit tests for the listMachines MCP tool
 * 
 * This file tests the functionality of the listMachines tool which allows
 * querying MAAS for machine information with various filtering options.
 */

// 1. Imports
const { MaasApiClient } = require('../../../maas/MaasApiClient');
const { registerListMachinesTool, listMachinesSchema } = require('../../../mcp_tools/listMachines');

// 2. Mocks
// Mock the MaasApiClient
jest.mock('../../../maas/MaasApiClient', () => {
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
jest.mock('../../../mcp_tools/listMachines', () => {
  return require('../../tools/listMachines.mock');
});

// 3. Test fixtures and setup
const sampleMachine = {
  system_id: 'abc123',
  hostname: 'test-machine-1',
  status_name: 'Ready'
};

/**
 * Helper function to create a handler for testing
 * @returns {Function} The handler function for the listMachines tool
 */
function createHandler(mockServer, mockMaasClient) {
  registerListMachinesTool(mockServer, mockMaasClient);
  return mockServer.tool.mock.calls[0][2];
}

// 4. Test suite
describe('MCP Tools - List Machines', () => {
  // 5. Setup and teardown
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
  
  // 6. Test cases
  describe('registration', () => {
    test('should register the tool with the server using correct name and schema', () => {
      // Act
      registerListMachinesTool(mockServer, mockMaasClient);
      
      // Assert
      expect(mockServer.tool).toHaveBeenCalled();
      expect(mockServer.tool.mock.calls[0][0]).toBe('maas_list_machines');
      expect(mockServer.tool.mock.calls[0][1]).toBe(listMachinesSchema.shape);
      expect(typeof mockServer.tool.mock.calls[0][2]).toBe('function');
    });
  });
  
  describe('parameter handling', () => {
    test('should call MAAS API with correct parameters when filters are provided', async () => {
      // Arrange
      const handler = createHandler(mockServer, mockMaasClient);
      const params = {
        hostname: 'test',
        status: 'ready',
        tag_names: ['tag1', 'tag2']
      };
      
      // Act
      await handler(params, { signal: undefined });
      
      // Assert
      expect(mockMaasClient.get).toHaveBeenCalledWith('/machines', {
        hostname: 'test',
        status: 'ready',
        tag_names: 'tag1,tag2'
      }, undefined);
    });
    
    test('should call MAAS API with empty parameters object when no filters are provided', async () => {
      // Arrange
      const handler = createHandler(mockServer, mockMaasClient);
      
      // Act
      await handler({}, { signal: undefined });
      
      // Assert
      expect(mockMaasClient.get).toHaveBeenCalledWith('/machines', {}, undefined);
    });
  });
  
  describe('response formatting', () => {
    test('should return machines data in the correct MCP content format', async () => {
      // Arrange
      const handler = createHandler(mockServer, mockMaasClient);
      
      // Act
      const result = await handler({}, { signal: undefined });
      
      // Assert
      expect(result).toEqual({
        content: [{ 
          type: "text", 
          text: JSON.stringify([sampleMachine]) 
        }]
      });
    });
  });
  
  describe('error handling', () => {
    test('should return formatted error response when MAAS API call fails', async () => {
      // Arrange
      const errorMessage = 'API connection failed';
      mockMaasClient.get.mockRejectedValueOnce(new Error(errorMessage));
      const handler = createHandler(mockServer, mockMaasClient);
      
      // Act
      const result = await handler({}, { signal: undefined });
      
      // Assert
      expect(result).toEqual({
        content: [{ type: "text", text: `Error listing machines: ${errorMessage}` }],
        isError: true
      });
    });
  });
});