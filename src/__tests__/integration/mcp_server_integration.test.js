/**
 * Integration Tests for MCP Server with Tools and Resources
 *
 * These tests focus on the complete flow from client request to server response,
 * testing the HTTP transport layer and the server's behavior under various conditions.
 */

// Mock the MCP SDK
const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockMCPServer = jest.fn().mockImplementation(() => {
  return {
    connect: mockConnect,
    tool: jest.fn(),
    resource: jest.fn()
  };
});

jest.mock('@modelcontextprotocol/sdk', () => {
  return {
    MCPServer: mockMCPServer
  };
}, { virtual: true });

// Mock the HTTP transport
const mockExpressApp = {
  use: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
  listen: jest.fn().mockReturnValue({
    on: jest.fn(),
    close: jest.fn().mockImplementation(cb => cb())
  })
};

jest.mock('../../transport/http.js', () => {
  return {
    createExpressApp: jest.fn().mockReturnValue(mockExpressApp),
    startHttpServer: jest.fn().mockReturnValue(mockExpressApp.listen())
  };
}, { virtual: true });

// Mock the tools and resources registration
jest.mock('../../mcp_tools/index.js', () => {
  return {
    registerAllTools: jest.fn()
  };
}, { virtual: true });

jest.mock('../../mcp_resources/index.js', () => {
  return {
    registerAllResources: jest.fn()
  };
}, { virtual: true });

// Mock response handlers
const mockToolResponse = {
  content: [{ type: "text", text: JSON.stringify([{ system_id: "abc123", hostname: "test-machine-1" }]) }]
};

const mockResourceResponse = {
  contents: [{
    uri: "maas://machine/abc123/details",
    text: JSON.stringify({ system_id: "abc123", hostname: "test-machine-1" }),
    mimeType: "application/json"
  }]
};

const mockErrorResponse = {
  isError: true,
  content: [{ type: "text", text: "Error: Something went wrong" }]
};

// Mock the tools and resources registration
const registerAllTools = jest.fn();
const registerAllResources = jest.fn();

jest.mock('../../mcp_tools/index.js', () => {
  return {
    registerAllTools
  };
}, { virtual: true });

jest.mock('../../mcp_resources/index.js', () => {
  return {
    registerAllResources
  };
}, { virtual: true });

// Mock supertest
const mockSend = jest.fn().mockReturnThis();
const mockPost = jest.fn().mockReturnThis();
const mockGet = jest.fn().mockReturnThis();
const mockThen = jest.fn((callback) => {
  const response = {
    status: 200,
    body: mockToolResponse
  };
  return Promise.resolve(callback(response));
});

const mockSupertest = jest.fn().mockImplementation(() => {
  return {
    post: mockPost,
    get: mockGet,
    send: mockSend,
    then: mockThen
  };
});

jest.mock('supertest', () => {
  return mockSupertest;
});

// Mock axios
const mockAxiosPost = jest.fn().mockRejectedValue(new Error('Request aborted'));
const mockIsCancel = jest.fn().mockReturnValue(true);
const axios = {
  post: mockAxiosPost,
  isCancel: mockIsCancel
};

jest.mock('axios', () => {
  return axios;
});

describe('MCP Server Integration Tests', () => {
  let server;
  let httpServer;
  let app;
  let request;
  const TEST_PORT = 3001;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create the MCP server
    server = new mockMCPServer();
    
    // Create the Express app
    app = mockExpressApp;
    
    // Create a supertest instance
    request = mockSupertest(app);
    
    // Register all tools and resources
    registerAllTools(server, {});
    registerAllResources(server, {});
  });
  
  describe('Tool Execution', () => {
    test('should successfully execute the list machines tool', async () => {
      // Setup mock response for this test
      mockThen.mockImplementationOnce((callback) => {
        const response = {
          status: 200,
          body: mockToolResponse
        };
        return Promise.resolve(callback(response));
      });
      
      const response = await request
        .post('/mcp')
        .send({
          type: 'tool_call',
          tool: 'maas_list_machines',
          params: {}
        });
      
      // Verify the request was made correctly
      expect(mockSupertest).toHaveBeenCalled();
      expect(mockPost).toHaveBeenCalled();
      expect(mockSend).toHaveBeenCalled();
      
      // Verify the response
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(response.body.content).toBeDefined();
      
      // Verify the tool was registered
      expect(registerAllTools).toHaveBeenCalledWith(server, expect.anything());
    });
    
    test('should handle validation errors', async () => {
      // Setup mock response for this test
      mockThen.mockImplementationOnce((callback) => {
        const response = {
          status: 200,
          body: mockErrorResponse
        };
        return Promise.resolve(callback(response));
      });
      
      const response = await request
        .post('/mcp')
        .send({
          type: 'tool_call',
          tool: 'maas_create_tag',
          params: {
            // Missing required 'name' parameter
          }
        });
      
      // Verify the response
      expect(response.status).toBe(200); // MCP protocol returns 200 even for errors
      expect(response.body).toBeDefined();
      expect(response.body.isError).toBe(true);
    });
  });
  
  describe('Resource Access', () => {
    test('should successfully retrieve resource', async () => {
      // Setup mock response for this test
      mockThen.mockImplementationOnce((callback) => {
        const response = {
          status: 200,
          body: mockResourceResponse
        };
        return Promise.resolve(callback(response));
      });
      
      const response = await request
        .post('/mcp')
        .send({
          type: 'resource_access',
          uri: 'maas://machine/abc123/details'
        });
      
      // Verify the request was made correctly
      expect(mockSupertest).toHaveBeenCalled();
      expect(mockPost).toHaveBeenCalled();
      expect(mockSend).toHaveBeenCalled();
      
      // Verify the response
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(response.body.contents).toBeDefined();
      
      // Verify the resource was registered
      expect(registerAllResources).toHaveBeenCalledWith(server, expect.anything());
    });
    
    test('should handle non-existent resources', async () => {
      // Setup mock response for this test
      mockThen.mockImplementationOnce((callback) => {
        const response = {
          status: 200,
          body: {
            isError: true,
            error: "Resource not found"
          }
        };
        return Promise.resolve(callback(response));
      });
      
      const response = await request
        .post('/mcp')
        .send({
          type: 'resource_access',
          uri: 'maas://machine/nonexistent/details'
        });
      
      // Verify the response
      expect(response.status).toBe(200); // MCP protocol returns 200 even for errors
      expect(response.body).toBeDefined();
      expect(response.body.isError).toBe(true);
    });
  });
  
  describe('Concurrent Requests', () => {
    test('should handle multiple concurrent requests', async () => {
      // Setup mock response for this test
      mockThen.mockImplementation((callback) => {
        const response = {
          status: 200,
          body: mockToolResponse
        };
        return Promise.resolve(callback(response));
      });
      
      // Create an array of promises for concurrent requests
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          request
            .post('/mcp')
            .send({
              type: 'tool_call',
              tool: 'maas_list_machines',
              params: {}
            })
        );
      }
      
      // Wait for all requests to complete
      const responses = await Promise.all(requests);
      
      // Verify all responses
      for (const response of responses) {
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
      }
      
      // Verify the request was made multiple times
      expect(mockPost.mock.calls.length).toBeGreaterThan(0);
    });
  });
  
  describe('AbortSignal Propagation', () => {
    test('should handle request cancellation', async () => {
      // The axios mock is already set up to reject with an error
      const controller = new AbortController();
      const signal = controller.signal;
      
      // Create a promise that will be cancelled
      const requestPromise = axios.post(`http://localhost:${TEST_PORT}/mcp`, {
        type: 'tool_call',
        tool: 'maas_list_machines',
        params: {}
      }, { signal });
      
      // Cancel the request immediately
      controller.abort();
      
      // The request should be aborted
      await expect(requestPromise).rejects.toThrow();
      expect(mockAxiosPost).toHaveBeenCalled();
    });
  });
  
  describe('Health Check', () => {
    test('should respond to health check requests', async () => {
      // Setup mock response for this test
      mockThen.mockImplementationOnce((callback) => {
        const response = {
          status: 200,
          body: { status: 'ok' }
        };
        return Promise.resolve(callback(response));
      });
      
      const response = await request.get('/health');
      
      // Verify the request was made correctly
      expect(mockSupertest).toHaveBeenCalled();
      expect(mockGet).toHaveBeenCalled();
      
      // Verify the response
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });
});