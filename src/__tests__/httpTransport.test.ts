import { Request, Response } from 'express';
import { MCPServer } from '@modelcontextprotocol/sdk';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createExpressApp } from '../transport/http.js';

// Mock the StreamableHTTPServerTransport
jest.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => {
  return {
    StreamableHTTPServerTransport: jest.fn().mockImplementation(() => {
      return {
        handleRequest: jest.fn().mockResolvedValue(undefined),
        close: jest.fn()
      };
    })
  };
});

// Mock the MCPServer
jest.mock('@modelcontextprotocol/sdk', () => {
  return {
    MCPServer: jest.fn().mockImplementation(() => {
      return {
        connect: jest.fn().mockResolvedValue(undefined),
        start: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn().mockResolvedValue(undefined),
        addTool: jest.fn(),
        addResource: jest.fn()
      };
    })
  };
});

// Mock the logger
jest.mock('../utils/logger.js', () => {
  return jest.fn().mockImplementation(() => {
    return {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };
  });
});

describe('HTTP Transport', () => {
  let mockServer: MCPServer;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock server
    mockServer = new MCPServer({});
    
    // Create mock request and response
    mockRequest = {
      body: { type: 'test' }
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      on: jest.fn().mockImplementation((event, callback) => {
        if (event === 'close') {
          // Store the callback to simulate close event
          (mockResponse as any).closeCallback = callback;
        }
        return mockResponse;
      })
    };
  });
  
  test('createExpressApp returns an Express app with MCP endpoint', () => {
    const app = createExpressApp(mockServer, 3000);
    
    // Verify app is created
    expect(app).toBeDefined();
    expect(app.post).toBeDefined();
    expect(app.get).toBeDefined();
  });
  
  test('MCP endpoint creates transport and connects to server', async () => {
    const app = createExpressApp(mockServer, 3000);
    
    // Get the route handler for /mcp
    const routes = (app as any)._router.stack.filter((layer: any) => layer.route && layer.route.path === '/mcp');
    expect(routes.length).toBe(1);
    
    const mcpHandler = routes[0].route.stack[0].handle;
    
    // Call the handler with mock request and response
    await mcpHandler(mockRequest as Request, mockResponse as Response);
    
    // Verify transport was created and connected
    expect(StreamableHTTPServerTransport).toHaveBeenCalledWith({ sessionIdGenerator: undefined });
    expect(mockServer.connect).toHaveBeenCalled();
    
    // Verify handleRequest was called with correct parameters
    const transport = (StreamableHTTPServerTransport as jest.Mock).mock.results[0].value;
    expect(transport.handleRequest).toHaveBeenCalledWith(
      mockRequest,
      mockResponse,
      mockRequest.body
    );
  });
  
  test('Transport is closed when response is closed', async () => {
    const app = createExpressApp(mockServer, 3000);
    
    // Get the route handler for /mcp
    const routes = (app as any)._router.stack.filter((layer: any) => layer.route && layer.route.path === '/mcp');
    const mcpHandler = routes[0].route.stack[0].handle;
    
    // Call the handler with mock request and response
    await mcpHandler(mockRequest as Request, mockResponse as Response);
    
    // Get the transport instance
    const transport = (StreamableHTTPServerTransport as jest.Mock).mock.results[0].value;
    
    // Simulate response close event
    (mockResponse as any).closeCallback();
    
    // Verify transport.close was called
    expect(transport.close).toHaveBeenCalled();
  });
  
  test('Health check endpoint returns status ok', async () => {
    const app = createExpressApp(mockServer, 3000);
    
    // Get the route handler for /health
    const routes = (app as any)._router.stack.filter((layer: any) => layer.route && layer.route.path === '/health');
    expect(routes.length).toBe(1);
    
    const healthHandler = routes[0].route.stack[0].handle;
    
    // Call the handler with mock request and response
    await healthHandler(mockRequest as Request, mockResponse as Response);
    
    // Verify response
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith({ status: 'ok' });
  });
  
  test('MCP endpoint handles errors properly', async () => {
    const app = createExpressApp(mockServer, 3000);
    
    // Mock server.connect to throw an error
    (mockServer.connect as jest.Mock).mockRejectedValueOnce(new Error('Test error'));
    
    // Get the route handler for /mcp
    const routes = (app as any)._router.stack.filter((layer: any) => layer.route && layer.route.path === '/mcp');
    const mcpHandler = routes[0].route.stack[0].handle;
    
    // Call the handler with mock request and response
    await mcpHandler(mockRequest as Request, mockResponse as Response);
    
    // Verify error response
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Internal server error',
      message: 'Test error'
    });
  });
});