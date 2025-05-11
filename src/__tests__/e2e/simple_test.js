// Mock the MaasApiClient
jest.mock('../../maas/MaasApiClient.js', () => ({
  __esModule: true,
  MaasApiClient: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue([
      {
        system_id: "abc123",
        hostname: "test-machine-1",
        domain: { id: 1, name: "maas" },
        architecture: "amd64/generic",
        status: 4,
        status_name: "Ready",
        owner: "admin",
        owner_data: { key: "value" },
        ip_addresses: ["192.168.1.100"],
        cpu_count: 4,
        memory: 8192,
        zone: { id: 1, name: "default" },
        pool: { id: 1, name: "default" },
        tags: ["tag1", "tag2"]
      }
    ])
  })),
  MaasApiError: jest.fn().mockImplementation(function(message, statusCode) {
    this.message = message;
    this.statusCode = statusCode;
    this.name = 'MaasApiError';
  })
}));

// Mock the McpServer
jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  __esModule: true,
  McpServer: jest.fn().mockImplementation(() => {
    const tools = [];
    
    return {
      tool: (name, schema, handler) => {
        tools.push({ name, schema, handler });
      },
      getTools: () => tools
    };
  })
}));

// Import after mocks
const { MaasApiClient } = require('../../maas/MaasApiClient.js');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { registerListMachinesTool } = require('../../mcp_tools/listMachines.js');

describe('Simple E2E Test', () => {
  let mockMaasClient;
  let mcpServer;
  let listMachinesHandler;

  beforeAll(() => {
    // Create mock instances
    mockMaasClient = new MaasApiClient();
    mcpServer = new McpServer();
    
    // Register the list machines tool
    registerListMachinesTool(mcpServer, mockMaasClient);
    
    // Get the handler function
    listMachinesHandler = mcpServer.getTools()[0].handler;
  });

  test('List Machines tool should return machines', async () => {
    const result = await listMachinesHandler({}, { signal: undefined });
    
    expect(result).toBeDefined();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    
    const machines = JSON.parse(result.content[0].text);
    expect(machines).toHaveLength(1);
    expect(machines[0].system_id).toBe('abc123');
  });
});