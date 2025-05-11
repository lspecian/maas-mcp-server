/**
 * Simple tests for the machineDetails MCP resource
 */

// Mock the MaasApiClient
jest.mock('../../maas/MaasApiClient', () => {
  return {
    MaasApiClient: jest.fn().mockImplementation(() => ({
      get: jest.fn().mockResolvedValue({
        system_id: 'abc123',
        hostname: 'test-machine-1',
        domain: { id: 1, name: 'maas' },
        architecture: 'amd64/generic',
        status: 4,
        status_name: 'Ready',
        owner: 'admin',
        owner_data: { key: 'value' },
        ip_addresses: ['192.168.1.100'],
        cpu_count: 4,
        memory: 8192,
        zone: { id: 1, name: 'default' },
        pool: { id: 1, name: 'default' },
        tags: ['tag1', 'tag2']
      })
    })),
    MaasApiError: jest.fn().mockImplementation((message, statusCode) => ({
      name: 'MaasApiError',
      message,
      statusCode
    }))
  };
});

// Use our mock implementation instead of the real one
jest.mock('../../mcp_resources/machineDetails', () => {
  return require('./machineDetails.mock');
});

const { MaasApiClient, MaasApiError } = require('../../maas/MaasApiClient');
const {
  MACHINE_DETAILS_URI_PATTERN,
  machineDetailsTemplate,
  registerMachineDetailsResource,
  MaasMachineSchema
} = require('../../mcp_resources/machineDetails');

describe('Machine Details Resource', () => {
  let mockServer;
  let mockMaasClient;
  
  beforeEach(() => {
    // Create mock instances
    mockMaasClient = new MaasApiClient();
    mockServer = {
      resource: jest.fn()
    };
    
    // Reset mocks
    jest.clearAllMocks();
  });
  
  test('should register the resource with the server', () => {
    // Register the resource
    registerMachineDetailsResource(mockServer, mockMaasClient);
    
    // Verify the resource was registered
    expect(mockServer.resource).toHaveBeenCalled();
    expect(mockServer.resource.mock.calls[0][0]).toBe('maas_machine_details');
    expect(mockServer.resource.mock.calls[0][1]).toBe(machineDetailsTemplate);
    expect(typeof mockServer.resource.mock.calls[0][2]).toBe('function');
  });
  
  test('should call MAAS API with correct system ID', async () => {
    // Register the resource
    registerMachineDetailsResource(mockServer, mockMaasClient);
    
    // Get the handler function
    const handler = mockServer.resource.mock.calls[0][2];
    
    // Call the handler with parameters
    const systemId = 'abc123';
    const mockUri = new URL(`maas://machine/${systemId}/details`);
    const mockParams = { system_id: systemId };
    
    await handler(mockUri, mockParams, { signal: undefined });
    
    // Verify MAAS API was called with correct parameters
    expect(mockMaasClient.get).toHaveBeenCalledWith(`/machines/${systemId}`, undefined, undefined);
  });
  
  test('should return machine data in the correct format', async () => {
    // Register the resource
    registerMachineDetailsResource(mockServer, mockMaasClient);
    
    // Get the handler function
    const handler = mockServer.resource.mock.calls[0][2];
    
    // Call the handler
    const systemId = 'abc123';
    const mockUri = new URL(`maas://machine/${systemId}/details`);
    const mockParams = { system_id: systemId };
    
    const result = await handler(mockUri, mockParams, { signal: undefined });
    
    // Verify result has the correct format
    expect(result).toEqual({
      contents: [{
        uri: mockUri.toString(),
        text: expect.any(String),
        mimeType: "application/json"
      }]
    });
    
    // Verify schema validation was called
    expect(MaasMachineSchema.parse).toHaveBeenCalled();
  });
  
  test('should throw if system_id is missing', async () => {
    // Register the resource
    registerMachineDetailsResource(mockServer, mockMaasClient);
    
    // Get the handler function
    const handler = mockServer.resource.mock.calls[0][2];
    
    // Call the handler with missing system_id
    const mockUri = new URL('maas://machine//details');
    const mockParams = { system_id: '' };
    
    await expect(handler(mockUri, mockParams, { signal: undefined }))
      .rejects.toThrow("System ID is missing in the resource URI.");
  });
  
  test('should handle API errors', async () => {
    // Setup mock to throw an error
    const errorMessage = 'API Error 500';
    mockMaasClient.get.mockRejectedValueOnce(new Error(errorMessage));
    
    // Register the resource
    registerMachineDetailsResource(mockServer, mockMaasClient);
    
    // Get the handler function
    const handler = mockServer.resource.mock.calls[0][2];
    
    // Call the handler
    const systemId = 'xyz789';
    const mockUri = new URL(`maas://machine/${systemId}/details`);
    const mockParams = { system_id: systemId };
    
    await expect(handler(mockUri, mockParams, { signal: undefined }))
      .rejects.toThrow(`Could not fetch MAAS machine details for ${systemId}. Original error: ${errorMessage}`);
  });
  
  test('should support AbortSignal', async () => {
    // Mock get to simulate a delay and check for abort
    mockMaasClient.get.mockImplementationOnce(async (path, params, signal) => {
      return new Promise((resolve, reject) => {
        signal?.addEventListener('abort', () => {
          reject(new Error('Request aborted'));
        });
        setTimeout(() => resolve({}), 100); // Simulate network delay
      });
    });
    
    // Register the resource
    registerMachineDetailsResource(mockServer, mockMaasClient);
    
    // Get the handler function
    const handler = mockServer.resource.mock.calls[0][2];
    
    // Create an AbortController and signal
    const controller = new AbortController();
    const signal = controller.signal;
    
    // Call the handler with the signal
    const systemId = 'test-abort';
    const mockUri = new URL(`maas://machine/${systemId}/details`);
    const mockParams = { system_id: systemId };
    
    const handlerPromise = handler(mockUri, mockParams, { signal });
    
    // Abort the request
    controller.abort();
    
    // Verify the handler throws an error
    await expect(handlerPromise).rejects.toThrow();
  });
});