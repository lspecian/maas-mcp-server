/**
 * Tests for the machineDetails MCP resource
 * 
 * These tests verify URI parameter extraction, successful data retrieval,
 * error handling, AbortSignal propagation, and proper ResourceResult formatting.
 */

// Mock the MaasApiClient
jest.mock('../../maas/MaasApiClient', () => ({
  __esModule: true,
  MaasApiClient: jest.fn().mockImplementation(() => ({
    get: jest.fn()
  })),
  MaasApiError: jest.fn().mockImplementation((message, statusCode) => ({
    name: 'MaasApiError',
    message,
    statusCode
  }))
}));

// Mock the SDK's ResourceTemplate
jest.mock('@modelcontextprotocol/sdk/server/mcp', () => ({
  __esModule: true,
  ResourceTemplate: jest.fn().mockImplementation((pattern, options) => ({
    pattern,
    options
  })),
  McpServer: jest.fn()
}));

// Mock MaasMachineSchema.parse
jest.mock('../../mcp_resources/schemas/machineDetailsSchema', () => ({
  __esModule: true,
  MaasMachineSchema: {
    parse: jest.fn(data => data) // Simple mock that returns data as is
  }
}));

// Mock the machineDetails module
jest.mock('../../mcp_resources/machineDetails', () => ({
  __esModule: true,
  MACHINE_DETAILS_URI_PATTERN: 'maas://machine/{system_id}/details',
  machineDetailsTemplate: {
    pattern: 'maas://machine/{system_id}/details',
    options: { list: undefined }
  },
  registerMachineDetailsResource: jest.fn((server, maasClient) => {
    server.resource('maas_machine_details', {
      pattern: 'maas://machine/{system_id}/details',
      options: { list: undefined }
    }, jest.fn());
  })
}));

const { MaasApiClient, MaasApiError } = require('../../maas/MaasApiClient');
const { ResourceTemplate, McpServer } = require('@modelcontextprotocol/sdk/server/mcp');
const { MaasMachineSchema } = require('../../mcp_resources/schemas/machineDetailsSchema');
const {
  machineDetailsTemplate,
  MACHINE_DETAILS_URI_PATTERN,
  registerMachineDetailsResource
} = require('../../mcp_resources/machineDetails');

describe('Machine Details Resource', () => {
  // Create mock instances
  const mockMaasClient = new MaasApiClient();
  const mockServer = {
    resource: jest.fn()
  };
  let registeredHandler;

  // Setup before tests
  beforeAll(() => {
    // Register the resource and capture the handler
    registerMachineDetailsResource(mockServer, mockMaasClient);
    
    // Extract the handler function that was registered
    registeredHandler = mockServer.resource.mock.calls[0][2];
  });

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Sample machine data that matches the schema
  const sampleMachine = {
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
  };

  test('MACHINE_DETAILS_URI_PATTERN should be correct', () => {
    expect(MACHINE_DETAILS_URI_PATTERN).toBe('maas://machine/{system_id}/details');
  });

  test('machineDetailsTemplate should be initialized with correct pattern and options', () => {
    expect(ResourceTemplate).toHaveBeenCalledWith(
      MACHINE_DETAILS_URI_PATTERN,
      { list: undefined }
    );
  });

  test('should register resource handler correctly', () => {
    // Verify server.resource was called with correct arguments
    expect(mockServer.resource).toHaveBeenCalledWith(
      "maas_machine_details",
      machineDetailsTemplate,
      expect.any(Function)
    );
  });

  test('registered handler should call MAAS API with correct system ID and return formatted data', async () => {
    // Setup mock to return sample data
    mockMaasClient.get.mockResolvedValue(sampleMachine);

    const systemId = 'abc123';
    const mockUri = new URL(`maas://machine/${systemId}/details`);
    const mockParams = { system_id: systemId };
    
    const result = await registeredHandler(mockUri, mockParams, { signal: undefined });

    expect(mockMaasClient.get).toHaveBeenCalledWith(`/machines/${systemId}`, undefined, undefined);
    expect(MaasMachineSchema.parse).toHaveBeenCalledWith(sampleMachine);
    expect(result).toEqual({
      contents: [{
        uri: mockUri.toString(),
        text: JSON.stringify(sampleMachine),
        mimeType: "application/json"
      }]
    });
  });

  test('registered handler should throw if system_id is missing in params', async () => {
    const mockUri = new URL('maas://machine//details');
    const mockParams = { system_id: '' }; // Empty system_id
    
    await expect(registeredHandler(mockUri, mockParams, { signal: undefined }))
      .rejects.toThrow("System ID is missing in the resource URI.");
  });

  test('registered handler should handle MAAS API errors', async () => {
    // Setup mock to throw an error
    const errorMessage = 'API Error 500';
    mockMaasClient.get.mockRejectedValue(new Error(errorMessage));
    
    const systemId = 'xyz789';
    const mockUri = new URL(`maas://machine/${systemId}/details`);
    const mockParams = { system_id: systemId };
    
    await expect(registeredHandler(mockUri, mockParams, { signal: undefined }))
      .rejects.toThrow(`Could not fetch MAAS machine details for ${systemId}. Original error: ${errorMessage}`);
  });

  test('registered handler should support AbortSignal', async () => {
    // Mock get to simulate a delay and check for abort
    mockMaasClient.get.mockImplementation(async (path, params, signal) => {
      return new Promise((resolve, reject) => {
        signal?.addEventListener('abort', () => {
          reject(new Error('Request aborted'));
        });
        setTimeout(() => resolve(sampleMachine), 100); // Simulate network delay
      });
    });

    const systemId = 'test-abort';
    const mockUri = new URL(`maas://machine/${systemId}/details`);
    const mockParams = { system_id: systemId };
    const controller = new AbortController();
    const signal = controller.signal;

    const handlerPromise = registeredHandler(mockUri, mockParams, { signal });
    controller.abort();

    await expect(handlerPromise).rejects.toThrow();
  });

  test('should handle specific HTTP error codes from MAAS API', async () => {
    // Setup mock to throw a MaasApiError with status code
    const errorMessage = 'Not Found';
    const statusCode = 404;
    mockMaasClient.get.mockRejectedValue(new MaasApiError(errorMessage, statusCode));
    
    const systemId = 'nonexistent';
    const mockUri = new URL(`maas://machine/${systemId}/details`);
    const mockParams = { system_id: systemId };
    
    await expect(registeredHandler(mockUri, mockParams, { signal: undefined }))
      .rejects.toThrow(`Could not fetch MAAS machine details for ${systemId}. Original error: ${errorMessage}`);
  });

  test('should validate response data against schema', async () => {
    // Setup mock to return sample data
    mockMaasClient.get.mockResolvedValue(sampleMachine);

    const systemId = 'abc123';
    const mockUri = new URL(`maas://machine/${systemId}/details`);
    const mockParams = { system_id: systemId };
    
    await registeredHandler(mockUri, mockParams, { signal: undefined });

    // Verify schema validation was called
    expect(MaasMachineSchema.parse).toHaveBeenCalledWith(sampleMachine);
  });

  test('should handle schema validation errors', async () => {
    // Setup mock to return sample data
    mockMaasClient.get.mockResolvedValue(sampleMachine);

    // Mock schema validation to throw an error
    MaasMachineSchema.parse.mockImplementationOnce(() => {
      throw new Error('Schema validation failed');
    });

    const systemId = 'abc123';
    const mockUri = new URL(`maas://machine/${systemId}/details`);
    const mockParams = { system_id: systemId };
    
    await expect(registeredHandler(mockUri, mockParams, { signal: undefined }))
      .rejects.toThrow(`Could not fetch MAAS machine details for ${systemId}. Original error: Schema validation failed`);
  });

  test('should handle unexpected server response formats', async () => {
    // Setup mock to return invalid data
    const invalidResponse = { error: 'Unexpected format' };
    mockMaasClient.get.mockResolvedValue(invalidResponse);

    // Let schema validation pass for this test
    MaasMachineSchema.parse.mockReturnValueOnce(invalidResponse);

    const systemId = 'abc123';
    const mockUri = new URL(`maas://machine/${systemId}/details`);
    const mockParams = { system_id: systemId };
    
    const result = await registeredHandler(mockUri, mockParams, { signal: undefined });

    // Verify result contains the unexpected format
    expect(result).toEqual({
      contents: [{
        uri: mockUri.toString(),
        text: JSON.stringify(invalidResponse),
        mimeType: "application/json"
      }]
    });
  });

  test('should truncate long error messages', async () => {
    // Setup mock to throw an error with a very long message
    const longErrorMessage = 'A'.repeat(200) + 'B'.repeat(200);
    mockMaasClient.get.mockRejectedValue(new Error(longErrorMessage));
    
    const systemId = 'xyz789';
    const mockUri = new URL(`maas://machine/${systemId}/details`);
    const mockParams = { system_id: systemId };
    
    await expect(registeredHandler(mockUri, mockParams, { signal: undefined }))
      .rejects.toThrow(`Could not fetch MAAS machine details for ${systemId}. Original error: ${'A'.repeat(100)}`);
  });
});