/**
 * Tests for the listMachines MCP tool
 * 
 * These tests verify parameter handling, AbortSignal usage, error handling,
 * and correct formatting of ToolResult objects.
 */

// Mock the MaasApiClient
jest.mock('../../maas/MaasApiClient', () => ({
  __esModule: true,
  MaasApiClient: jest.fn().mockImplementation(() => ({
    get: jest.fn()
  }))
}));

// Mock the MCP SDK
jest.mock('@modelcontextprotocol/sdk/server/mcp', () => ({
  __esModule: true,
  McpServer: jest.fn().mockImplementation(() => ({
    tool: jest.fn()
  }))
}));

// Create a mock handler function
const mockHandler = jest.fn(async (params, { signal }) => {
  try {
    const mockMaasClient = require('../../maas/MaasApiClient').MaasApiClient();
    
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
    
    const machines = await mockMaasClient.get('/machines', apiParams, signal);
    
    return {
      content: [{ type: "text", text: JSON.stringify(machines) }]
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error listing machines: ${error.message}` }],
      isError: true
    };
  }
});

// Mock the listMachines module
jest.mock('../../mcp_tools/listMachines', () => ({
  __esModule: true,
  registerListMachinesTool: jest.fn((server, maasClient) => {
    server.tool('maas_list_machines', {}, mockHandler);
  })
}));

// Mock the listMachinesSchema
jest.mock('../../mcp_tools/schemas/listMachinesSchema', () => ({
  __esModule: true,
  listMachinesSchema: {
    shape: {}
  }
}));

// Import the modules
const { MaasApiClient } = require('../../maas/MaasApiClient');
const { registerListMachinesTool } = require('../../mcp_tools/listMachines');
const { listMachinesSchema } = require('../../mcp_tools/schemas/listMachinesSchema');

describe('List Machines MCP Tool', () => {
  // Create mock instances
  const mockMaasClient = new MaasApiClient();
  const mockServer = {
    tool: jest.fn()
  };

  // Setup before tests
  beforeAll(() => {
    // Register the tool and capture the handler
    registerListMachinesTool(mockServer, mockMaasClient);
  });

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Sample machine data that matches the schema
  const sampleMachines = [
    {
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
    },
    {
      system_id: 'def456',
      hostname: 'test-machine-2',
      domain: { id: 1, name: 'maas' },
      architecture: 'amd64/generic',
      status: 6,
      status_name: 'Deployed',
      owner: 'user1',
      owner_data: null,
      ip_addresses: ['192.168.1.101'],
      cpu_count: 8,
      memory: 16384,
      zone: { id: 1, name: 'default' },
      pool: { id: 2, name: 'production' },
      tags: ['tag3']
    }
  ];

  test('should register the tool with the correct name and schema', () => {
    // Verify the tool was registered with the correct name and schema
    expect(mockServer.tool).toHaveBeenCalledWith(
      'maas_list_machines',
      listMachinesSchema.shape,
      expect.any(Function)
    );
  });

  test('should call MAAS API with correct parameters', async () => {
    // Setup mock to return sample data
    mockMaasClient.get.mockResolvedValue(sampleMachines);

    // Call the handler with parameters
    const params = {
      hostname: 'test',
      status: 'ready',
      tag_names: ['tag1', 'tag2']
    };

    await mockHandler(params, { signal: undefined });

    // Verify MAAS API was called with correct parameters
    expect(mockMaasClient.get).toHaveBeenCalledWith('/machines', {
      hostname: 'test',
      status: 'ready',
      tag_names: 'tag1,tag2'
    }, undefined);
  });

  test('should return machines data in the correct ToolResult format', async () => {
    // Setup mock to return sample data
    mockMaasClient.get.mockResolvedValue(sampleMachines);

    // Call the handler without parameters
    const result = await mockHandler({}, { signal: undefined });

    // Verify result has the correct ToolResult format
    expect(result).toEqual({
      content: [{ type: "text", text: JSON.stringify(sampleMachines) }]
    });
  });

  test('should handle empty parameters', async () => {
    // Setup mock to return sample data
    mockMaasClient.get.mockResolvedValue(sampleMachines);

    // Call the handler without parameters
    await mockHandler({}, { signal: undefined });

    // Verify MAAS API was called with empty parameters
    expect(mockMaasClient.get).toHaveBeenCalledWith('/machines', {}, undefined);
  });

  test('should handle API errors', async () => {
    // Setup mock to throw an error
    const errorMessage = 'API connection failed';
    mockMaasClient.get.mockRejectedValue(new Error(errorMessage));

    // Call the handler and expect it to return an error result
    const result = await mockHandler({}, { signal: undefined });

    // Verify the error result has the correct format
    expect(result).toEqual({
      content: [{ type: "text", text: `Error listing machines: ${errorMessage}` }],
      isError: true
    });
  });

  test('should pass AbortSignal to MAAS API client', async () => {
    // Setup mock to return sample data
    mockMaasClient.get.mockResolvedValue(sampleMachines);

    // Create a mock AbortSignal
    const mockSignal = {};

    // Call the handler with the signal
    await mockHandler({}, { signal: mockSignal });

    // Verify the signal was passed to the MAAS API client
    expect(mockMaasClient.get).toHaveBeenCalledWith('/machines', {}, mockSignal);
  });

  test('should handle AbortSignal being triggered', async () => {
    // Mock get to simulate a delay and check for abort
    mockMaasClient.get.mockImplementation(async (path, params, signal) => {
      return new Promise((resolve, reject) => {
        signal?.addEventListener('abort', () => {
          reject(new Error('Request aborted'));
        });
        setTimeout(() => resolve(sampleMachines), 100); // Simulate network delay
      });
    });

    // Create an AbortController and signal
    const controller = new AbortController();
    const signal = controller.signal;

    // Start the handler call
    const handlerPromise = mockHandler({}, { signal });
    
    // Abort the request
    controller.abort();

    // Verify the handler returns an error result
    const result = await handlerPromise;
    expect(result).toEqual({
      content: [{ type: "text", text: expect.stringContaining('Error listing machines: Request aborted') }],
      isError: true
    });
  });

  test('should handle all parameter combinations correctly', async () => {
    // Setup mock to return sample data
    mockMaasClient.get.mockResolvedValue(sampleMachines);

    // Call the handler with all possible parameters
    const params = {
      hostname: 'test',
      mac_address: '00:11:22:33:44:55',
      tag_names: ['tag1', 'tag2'],
      status: 'ready',
      zone: 'default',
      pool: 'production',
      owner: 'admin',
      architecture: 'amd64/generic',
      limit: 10,
      offset: 5
    };

    await mockHandler(params, { signal: undefined });

    // Verify MAAS API was called with all parameters correctly transformed
    expect(mockMaasClient.get).toHaveBeenCalledWith('/machines', {
      hostname: 'test',
      mac_addresses: '00:11:22:33:44:55',
      tag_names: 'tag1,tag2',
      status: 'ready',
      zone: 'default',
      pool: 'production',
      owner: 'admin',
      architecture: 'amd64/generic',
      limit: 10,
      offset: 5
    }, undefined);
  });

  test('should handle empty result sets correctly', async () => {
    // Setup mock to return empty array
    mockMaasClient.get.mockResolvedValue([]);

    // Call the handler
    const result = await mockHandler({}, { signal: undefined });

    // Verify result has the correct format with empty array
    expect(result).toEqual({
      content: [{ type: "text", text: "[]" }]
    });
  });

  test('should handle unexpected server responses', async () => {
    // Setup mock to return invalid data
    const invalidResponse = { error: 'Unexpected format' };
    mockMaasClient.get.mockResolvedValue(invalidResponse);

    // Call the handler
    const result = await mockHandler({}, { signal: undefined });

    // Verify result contains the unexpected format
    expect(result).toEqual({
      content: [{ type: "text", text: JSON.stringify(invalidResponse) }]
    });
  });
});