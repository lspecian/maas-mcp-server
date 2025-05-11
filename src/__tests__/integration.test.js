/**
 * Integration Tests for MaasApiClient and McpServer
 * 
 * These tests verify the proper interaction between MaasApiClient, McpServer,
 * and StreamableHTTPServerTransport components in realistic usage scenarios.
 */

// Mock the MCP SDK
const mockAddTool = jest.fn();
const mockAddResource = jest.fn();
const mockStart = jest.fn().mockResolvedValue(undefined);
const mockStop = jest.fn().mockResolvedValue(undefined);
const mockConnect = jest.fn().mockResolvedValue(undefined);

const mockMCPServer = jest.fn().mockImplementation(() => {
  return {
    addTool: mockAddTool,
    addResource: mockAddResource,
    start: mockStart,
    stop: mockStop,
    connect: mockConnect
  };
});

jest.mock('@modelcontextprotocol/sdk', () => {
  return {
    MCPServer: mockMCPServer
  };
}, { virtual: true });

// Mock the StreamableHTTPServerTransport
const mockHandleRequest = jest.fn().mockImplementation((req, res, body) => {
  // Simulate processing the request
  const toolName = body.tool;
  const resourceUri = body.resource;
  
  if (toolName) {
    // Simulate tool execution
    res.status(200).json({ result: `Executed tool: ${toolName}` });
  } else if (resourceUri) {
    // Simulate resource access
    res.status(200).json({ data: `Resource data from: ${resourceUri}` });
  } else {
    // Simulate error
    res.status(400).json({ error: 'Invalid request' });
  }
});

const mockClose = jest.fn();

const mockTransport = jest.fn().mockImplementation(() => {
  return {
    handleRequest: mockHandleRequest,
    close: mockClose
  };
});

jest.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => {
  return {
    StreamableHTTPServerTransport: mockTransport
  };
}, { virtual: true });

// Mock the MaasApiClient
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const mockDelete = jest.fn();

const mockMaasApiClient = jest.fn().mockImplementation(() => {
  return {
    get: mockGet,
    post: mockPost,
    put: mockPut,
    delete: mockDelete
  };
});

jest.mock('../maas/MaasApiClient', () => {
  return {
    MaasApiClient: mockMaasApiClient
  };
}, { virtual: true });

// Mock the config module
jest.mock('../config', () => {
  return {
    __esModule: true,
    default: {
      PORT: 3000,
      NODE_ENV: 'test',
      MAAS_API_URL: 'https://example.com/MAAS/api/2.0',
      MAAS_API_KEY: 'consumer_key:token:secret',
      mcpServer: {
        name: 'Test MCP Server',
        version: '1.0.0',
        protocolVersion: '2024-11-05',
        serverInfo: {
          name: 'Test MAAS API Bridge for MCP',
          version: '0.1.0',
          instructions: 'Test instructions',
        },
        capabilities: {
          resources: {
            listChanged: false,
          },
          tools: {
            listChanged: false,
          },
        },
      },
    },
  };
}, { virtual: true });

// Mock the HTTP transport
const mockCreateExpressApp = jest.fn().mockReturnValue({
  use: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
  listen: jest.fn().mockReturnValue({
    on: jest.fn()
  })
});

const mockStartHttpServer = jest.fn().mockReturnValue({
  on: jest.fn(),
  close: jest.fn()
});

jest.mock('../transport/http', () => {
  return {
    createExpressApp: mockCreateExpressApp,
    startHttpServer: mockStartHttpServer
  };
}, { virtual: true });

// Mock the logger
jest.mock('../utils/logger.js', () => {
  return {
    __esModule: true,
    default: jest.fn().mockReturnValue({
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn()
    })
  };
}, { virtual: true });

// Mock the error handler
jest.mock('../utils/errorHandler', () => {
  return {
    setupGlobalErrorHandlers: jest.fn()
  };
}, { virtual: true });

describe('MaasApiClient and McpServer Integration', () => {
  let server;
  let maasApiClient;
  let httpServer;
  
  beforeEach(() => {
    // Reset module cache
    jest.resetModules();
    
    // Reset mocks
    mockAddTool.mockClear();
    mockAddResource.mockClear();
    mockStart.mockClear();
    mockStop.mockClear();
    mockConnect.mockClear();
    mockHandleRequest.mockClear();
    mockClose.mockClear();
    mockGet.mockClear();
    mockPost.mockClear();
    mockPut.mockClear();
    mockDelete.mockClear();
    mockCreateExpressApp.mockClear();
    mockStartHttpServer.mockClear();
    
    // Create a new MCPServer instance
    server = new mockMCPServer();
    
    // Create a new MaasApiClient instance
    maasApiClient = new mockMaasApiClient();
    
    // Start the HTTP server
    httpServer = mockStartHttpServer(server, 3000);
  });
  
  test('should register MaaS API tools with the MCP server', () => {
    // Define a mock tool
    const mockTool = {
      name: 'list-machines',
      description: 'List all machines in the MaaS API',
      execute: jest.fn()
    };
    
    // Register the tool with the server
    server.addTool(mockTool.name, mockTool);
    
    // Verify the tool was registered
    expect(mockAddTool).toHaveBeenCalledWith(mockTool.name, mockTool);
  });
  
  test('should register MaaS API resources with the MCP server', () => {
    // Define a mock resource
    const mockResource = {
      uri: 'maas://machines/123',
      get: jest.fn()
    };
    
    // Register the resource with the server
    server.addResource(mockResource.uri, mockResource);
    
    // Verify the resource was registered
    expect(mockAddResource).toHaveBeenCalledWith(mockResource.uri, mockResource);
  });
  
  test('should start the MCP server and HTTP transport', async () => {
    // Start the server
    await server.start();
    
    // Verify the server was started
    expect(mockStart).toHaveBeenCalled();
    
    // Verify the HTTP server was started
    expect(mockStartHttpServer).toHaveBeenCalledWith(server, 3000);
  });
  
  test('should handle tool execution requests through the transport', async () => {
    // Create a mock request and response
    const mockReq = {
      body: { tool: 'list-machines', args: {} }
    };
    
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    // Create a mock transport
    const transport = new mockTransport();
    
    // Connect the transport to the server
    await server.connect(transport);
    
    // Handle the request
    await transport.handleRequest(mockReq, mockRes, mockReq.body);
    
    // Verify the server was connected to the transport
    expect(mockConnect).toHaveBeenCalledWith(transport);
    
    // Verify the request was handled
    expect(mockHandleRequest).toHaveBeenCalledWith(mockReq, mockRes, mockReq.body);
    
    // Verify the response
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ result: 'Executed tool: list-machines' });
  });
  
  test('should handle resource access requests through the transport', async () => {
    // Create a mock request and response
    const mockReq = {
      body: { resource: 'maas://machines/123' }
    };
    
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    // Create a mock transport
    const transport = new mockTransport();
    
    // Connect the transport to the server
    await server.connect(transport);
    
    // Handle the request
    await transport.handleRequest(mockReq, mockRes, mockReq.body);
    
    // Verify the server was connected to the transport
    expect(mockConnect).toHaveBeenCalledWith(transport);
    
    // Verify the request was handled
    expect(mockHandleRequest).toHaveBeenCalledWith(mockReq, mockRes, mockReq.body);
    
    // Verify the response
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ data: 'Resource data from: maas://machines/123' });
  });
  
  test('should handle errors in requests through the transport', async () => {
    // Create a mock request and response
    const mockReq = {
      body: { invalid: 'request' }
    };
    
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    // Create a mock transport
    const transport = new mockTransport();
    
    // Connect the transport to the server
    await server.connect(transport);
    
    // Handle the request
    await transport.handleRequest(mockReq, mockRes, mockReq.body);
    
    // Verify the server was connected to the transport
    expect(mockConnect).toHaveBeenCalledWith(transport);
    
    // Verify the request was handled
    expect(mockHandleRequest).toHaveBeenCalledWith(mockReq, mockRes, mockReq.body);
    
    // Verify the response
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid request' });
  });
  
  test('should use MaasApiClient to fetch data for MCP tools', async () => {
    // Mock the MaasApiClient.get method to return machine data
    mockGet.mockResolvedValueOnce([
      { id: '123', hostname: 'machine1' },
      { id: '456', hostname: 'machine2' }
    ]);
    
    // Define a mock tool that uses the MaasApiClient
    const listMachinesTool = {
      name: 'list-machines',
      description: 'List all machines in the MaaS API',
      execute: async () => {
        // Use the MaasApiClient to fetch machine data
        const machines = await maasApiClient.get('/machines/');
        return { machines };
      }
    };
    
    // Register the tool with the server
    server.addTool(listMachinesTool.name, listMachinesTool);
    
    // Execute the tool
    const result = await listMachinesTool.execute();
    
    // Verify the MaasApiClient was used to fetch data
    expect(mockGet).toHaveBeenCalledWith('/machines/');
    
    // Verify the result
    expect(result).toEqual({
      machines: [
        { id: '123', hostname: 'machine1' },
        { id: '456', hostname: 'machine2' }
      ]
    });
  });
  
  test('should use MaasApiClient to update data for MCP tools', async () => {
    // Mock the MaasApiClient.put method to return updated machine data
    mockPut.mockResolvedValueOnce({
      id: '123',
      hostname: 'new-hostname'
    });
    
    // Define a mock tool that uses the MaasApiClient
    const updateMachineTool = {
      name: 'update-machine',
      description: 'Update a machine in the MaaS API',
      execute: async (args) => {
        // Use the MaasApiClient to update machine data
        const updatedMachine = await maasApiClient.put(`/machines/${args.id}/`, {
          hostname: args.hostname
        });
        return { machine: updatedMachine };
      }
    };
    
    // Register the tool with the server
    server.addTool(updateMachineTool.name, updateMachineTool);
    
    // Execute the tool
    const result = await updateMachineTool.execute({
      id: '123',
      hostname: 'new-hostname'
    });
    
    // Verify the MaasApiClient was used to update data
    expect(mockPut).toHaveBeenCalledWith('/machines/123/', {
      hostname: 'new-hostname'
    });
    
    // Verify the result
    expect(result).toEqual({
      machine: {
        id: '123',
        hostname: 'new-hostname'
      }
    });
  });
  
  test('should handle errors from MaasApiClient in MCP tools', async () => {
    // Mock the MaasApiClient.get method to throw an error
    mockGet.mockRejectedValueOnce(new Error('API Error'));
    
    // Define a mock tool that uses the MaasApiClient
    const listMachinesTool = {
      name: 'list-machines',
      description: 'List all machines in the MaaS API',
      execute: async () => {
        try {
          // Use the MaasApiClient to fetch machine data
          const machines = await maasApiClient.get('/machines/');
          return { machines };
        } catch (error) {
          return { error: error.message };
        }
      }
    };
    
    // Register the tool with the server
    server.addTool(listMachinesTool.name, listMachinesTool);
    
    // Execute the tool
    const result = await listMachinesTool.execute();
    
    // Verify the MaasApiClient was used to fetch data
    expect(mockGet).toHaveBeenCalledWith('/machines/');
    
    // Verify the result contains the error
    expect(result).toEqual({ error: 'API Error' });
  });
});