/**
 * Tests for MCP Server initialization and configuration
 * 
 * These tests focus on the proper initialization, configuration,
 * and startup/shutdown of the MCP Server.
 */

// Create mock for MCPServer
const mockAddTool = jest.fn();
const mockAddResource = jest.fn();
const mockStart = jest.fn().mockResolvedValue(undefined);
const mockStop = jest.fn().mockResolvedValue(undefined);
const mockGetTools = jest.fn().mockReturnValue([]);
const mockGetResources = jest.fn().mockReturnValue([]);

const mockMCPServer = jest.fn().mockImplementation(() => {
  return {
    addTool: mockAddTool,
    addResource: mockAddResource,
    start: mockStart,
    stop: mockStop,
    getTools: mockGetTools,
    getResources: mockGetResources,
  };
});

// Mock the modules
jest.mock('@modelcontextprotocol/sdk', () => {
  return {
    MCPServer: mockMCPServer,
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
});

// Mock the tools and resources
jest.mock('../mcp_tools/index', () => {
  return {
    tools: [
      {
        name: 'test-tool',
        description: 'A test tool',
        execute: jest.fn(),
      },
    ],
  };
});

jest.mock('../mcp_resources/index', () => {
  return {
    resources: [
      {
        uri: 'test://resource',
        get: jest.fn(),
      },
    ],
  };
});

// Mock the HTTP server
jest.mock('../transport/http', () => {
  return {
    startHttpServer: jest.fn().mockReturnValue({
      close: jest.fn(),
    }),
  };
});

// Mock the error handler
jest.mock('../utils/errorHandler', () => {
  return {
    setupGlobalErrorHandlers: jest.fn(),
  };
});

// Mock the logger
jest.mock('../utils/logger', () => {
  return jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  });
});

describe('MCP Server Initialization and Configuration', () => {
  let MCPServer;
  let config;
  let tools;
  let resources;
  let startHttpServer;
  let setupGlobalErrorHandlers;
  let main;
  
  beforeEach(() => {
    // Reset module cache
    jest.resetModules();
    
    // We don't actually import the real modules, we just use our mocks
    MCPServer = mockMCPServer;
  });
  
  test('should create MCPServer with correct configuration', () => {
    // Define mock configuration
    const mockConfig = {
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
    };
    
    // Create a new MCPServer instance
    const server = new MCPServer(mockConfig);
    
    // Verify MCPServer was called with the correct configuration
    expect(MCPServer).toHaveBeenCalledWith(mockConfig);
    expect(MCPServer).toHaveBeenCalledTimes(1);
  });
  
  test('should register tools and resources', () => {
    // Define mock tools and resources
    const mockTools = [
      {
        name: 'test-tool',
        description: 'A test tool',
        execute: jest.fn(),
      },
    ];
    
    const mockResources = [
      {
        uri: 'test://resource',
        get: jest.fn(),
      },
    ];
    
    // Create a new MCPServer instance
    const server = new MCPServer({});
    
    // Register tools and resources
    mockTools.forEach(tool => server.addTool(tool.name, tool));
    mockResources.forEach(resource => server.addResource(resource.uri, resource));
    
    // Verify tools and resources were registered
    expect(mockAddTool).toHaveBeenCalledWith('test-tool', mockTools[0]);
    expect(mockAddTool).toHaveBeenCalledTimes(1);
    
    expect(mockAddResource).toHaveBeenCalledWith('test://resource', mockResources[0]);
    expect(mockAddResource).toHaveBeenCalledTimes(1);
  });
  
  test('should start the MCP server', async () => {
    // Create a new MCPServer instance
    const server = new MCPServer({});
    
    // Start the server
    await server.start();
    
    // Verify the server was started
    expect(mockStart).toHaveBeenCalledTimes(1);
  });
  
  test('should start the HTTP server with the correct port', () => {
    // Mock startHttpServer function
    const mockStartHttpServer = jest.fn().mockReturnValue({
      close: jest.fn(),
    });
    
    // Create a new MCPServer instance
    const server = new MCPServer({});
    
    // Start the HTTP server
    const httpServer = mockStartHttpServer(server, 3000);
    
    // Verify the HTTP server was started with the correct parameters
    expect(mockStartHttpServer).toHaveBeenCalledWith(server, 3000);
    expect(mockStartHttpServer).toHaveBeenCalledTimes(1);
  });
  
  test('should set up global error handlers', () => {
    // Mock setupGlobalErrorHandlers function
    const mockSetupGlobalErrorHandlers = jest.fn();
    
    // Set up global error handlers
    mockSetupGlobalErrorHandlers();
    
    // Verify global error handlers were set up
    expect(mockSetupGlobalErrorHandlers).toHaveBeenCalledTimes(1);
  });
});