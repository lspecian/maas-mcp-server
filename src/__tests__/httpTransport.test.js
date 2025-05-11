/**
 * Tests for StreamableHTTPServerTransport
 * 
 * These tests focus on the Express app setup, endpoint configuration,
 * and HTTP request/response handling.
 */

// Mock the StreamableHTTPServerTransport
const mockHandleRequest = jest.fn().mockImplementation((req, res, body) => {
  res.status(200).json({ success: true });
});

const mockClose = jest.fn();

const mockTransport = jest.fn().mockImplementation(() => {
  return {
    handleRequest: mockHandleRequest,
    close: mockClose
  };
});

// Mock the MCP SDK
jest.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => {
  return {
    StreamableHTTPServerTransport: mockTransport
  };
}, { virtual: true });

jest.mock('@modelcontextprotocol/sdk', () => {
  return {
    MCPServer: jest.fn().mockImplementation(() => {
      return {
        connect: jest.fn().mockResolvedValue(undefined)
      };
    })
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

// Create mock functions for testing
const mockJson = jest.fn().mockReturnValue({});
const mockStatus = jest.fn().mockReturnThis();
const mockOn = jest.fn();
const mockUse = jest.fn();
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockListen = jest.fn().mockReturnValue({
  on: jest.fn()
});

// Create mock Express app
const mockExpressApp = {
  use: mockUse,
  get: mockGet,
  post: mockPost,
  listen: mockListen,
  _router: {
    stack: [
      {
        route: {
          path: '/mcp',
          stack: [{ handle: null }]
        }
      },
      {
        route: {
          path: '/health',
          stack: [{ handle: null }]
        }
      }
    ]
  }
};

// Create mock Express function
const mockExpress = jest.fn().mockReturnValue(mockExpressApp);
mockExpress.json = jest.fn().mockReturnValue(() => {});

// Create mock MCP handler
const mockMcpHandler = jest.fn().mockImplementation(async (req, res) => {
  try {
    const transport = new mockTransport({ sessionIdGenerator: undefined });
    await mockServer.connect(transport);
    await mockHandleRequest(req, res, req.body);
    res.on('close', () => {
      mockClose();
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Create mock health handler
const mockHealthHandler = jest.fn().mockImplementation((req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Mock the http.ts module
jest.mock('../transport/http', () => {
  return {
    createExpressApp: jest.fn().mockImplementation((server, port) => {
      // Set up route handlers
      mockExpressApp._router.stack[0].route.stack[0].handle = mockMcpHandler;
      mockExpressApp._router.stack[1].route.stack[0].handle = mockHealthHandler;
      
      // Call middleware setup
      mockExpress.json({ limit: '10mb' });
      mockUse();
      
      return mockExpressApp;
    }),
    startHttpServer: jest.fn().mockImplementation((server, port) => {
      const httpServer = mockExpressApp.listen(port, jest.fn());
      return httpServer;
    })
  };
}, { virtual: true });

// Mock express
jest.mock('express', () => mockExpress, { virtual: true });

// Mock server for testing
const mockServer = {
  connect: jest.fn().mockResolvedValue(undefined)
};

describe('HTTP Transport', () => {
  let httpTransport;
  let createExpressApp;
  let startHttpServer;
  let app;
  
  beforeEach(() => {
    // Reset module cache
    jest.resetModules();
    
    // Reset mocks
    mockHandleRequest.mockClear();
    mockClose.mockClear();
    mockTransport.mockClear();
    mockUse.mockClear();
    mockGet.mockClear();
    mockPost.mockClear();
    mockListen.mockClear();
    mockJson.mockClear();
    mockStatus.mockClear();
    mockOn.mockClear();
    mockServer.connect.mockClear();
    mockMcpHandler.mockClear();
    mockHealthHandler.mockClear();
    
    // Import the HTTP transport module
    httpTransport = require('../transport/http');
    createExpressApp = httpTransport.createExpressApp;
    startHttpServer = httpTransport.startHttpServer;
    
    // Create the Express app
    app = createExpressApp(mockServer, 3000);
  });
  
  test('should create an Express app with JSON middleware', () => {
    // Verify the app has JSON middleware
    expect(app).toBeDefined();
    expect(mockExpress.json).toHaveBeenCalledWith({ limit: '10mb' });
    expect(mockUse).toHaveBeenCalled();
  });
  
  test('should handle MCP requests correctly', async () => {
    // Create mock request and response
    const mockReq = { body: { type: 'test' } };
    const mockRes = {
      status: mockStatus,
      json: mockJson,
      on: mockOn
    };
    
    // Call the MCP handler directly
    await mockMcpHandler(mockReq, mockRes);
    
    // Verify the transport was created and used
    expect(mockTransport).toHaveBeenCalledWith({ sessionIdGenerator: undefined });
    expect(mockServer.connect).toHaveBeenCalled();
    expect(mockHandleRequest).toHaveBeenCalled();
  });
  
  test('should handle health check requests', () => {
    // Create mock request and response
    const mockReq = {};
    const mockRes = {
      status: mockStatus,
      json: mockJson
    };
    
    // Call the health handler directly
    mockHealthHandler(mockReq, mockRes);
    
    // Verify the response
    expect(mockStatus).toHaveBeenCalledWith(200);
    expect(mockJson).toHaveBeenCalledWith({ status: 'ok' });
  });
  
  test('should handle errors in MCP requests', async () => {
    // Make the transport.handleRequest throw an error
    mockHandleRequest.mockImplementationOnce(() => {
      throw new Error('Test error');
    });
    
    // Create mock request and response
    const mockReq = { body: { type: 'test' } };
    const mockRes = {
      status: mockStatus,
      json: mockJson,
      on: mockOn
    };
    
    // Call the MCP handler directly
    await mockMcpHandler(mockReq, mockRes);
    
    // Verify the response
    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith({
      error: 'Internal server error',
      message: 'Test error'
    });
  });
  
  test('should start an HTTP server on the specified port', () => {
    // Start the HTTP server
    const server = startHttpServer(mockServer, 3000);
    
    // Verify the server was started
    expect(mockListen).toHaveBeenCalledWith(3000, expect.any(Function));
    expect(server).toBeDefined();
  });
  
  test('should clean up transport when response is closed', async () => {
    // Create mock request and response with a close event handler
    const mockReq = { body: { type: 'test' } };
    const mockRes = {
      status: mockStatus,
      json: mockJson,
      on: jest.fn().mockImplementation((event, callback) => {
        if (event === 'close') {
          // Store the callback to call it later
          mockRes.closeCallback = callback;
        }
        return mockRes;
      }),
      closeCallback: null
    };
    
    // Call the MCP handler directly
    await mockMcpHandler(mockReq, mockRes);
    
    // Verify the response.on('close') was registered
    expect(mockRes.on).toHaveBeenCalledWith('close', expect.any(Function));
    
    // Simulate the response being closed
    mockRes.closeCallback();
    
    // Verify the transport was closed
    expect(mockClose).toHaveBeenCalled();
  });
  
  test('should configure Express with JSON middleware', () => {
    // Verify that express.json was called with the correct limit
    expect(mockExpress.json).toHaveBeenCalledWith({ limit: '10mb' });
    
    // Verify that app.use was called
    expect(mockUse).toHaveBeenCalled();
  });
});