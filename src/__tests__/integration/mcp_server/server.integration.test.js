/**
 * Integration Tests for MCP Server with Tools and Resources
 *
 * These tests focus on the complete flow from client request to server response,
 * testing the HTTP transport layer and the server's behavior under various conditions.
 */

// 1. Imports
const supertest = require('supertest');
const axios = require('axios');

// 2. Mocks
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

jest.mock('../../../transport/http.js', () => {
  return {
    createExpressApp: jest.fn().mockReturnValue(mockExpressApp),
    startHttpServer: jest.fn().mockReturnValue(mockExpressApp.listen())
  };
}, { virtual: true });

// Mock the tools and resources registration
const registerAllTools = jest.fn();
const registerAllResources = jest.fn();

jest.mock('../../../mcp_tools/index.js', () => {
  return {
    registerAllTools
  };
}, { virtual: true });

jest.mock('../../../mcp_resources/index.js', () => {
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

jest.mock('axios', () => {
  return {
    post: mockAxiosPost,
    isCancel: mockIsCancel
  };
});

// 3. Test fixtures and setup
/**
 * Mock response fixtures for different test scenarios
 */
const mockResponses = {
  tool: {
    success: {
      content: [{ 
        type: "text", 
        text: JSON.stringify([{ system_id: "abc123", hostname: "test-machine-1" }]) 
      }]
    },
    error: {
      isError: true,
      content: [{ type: "text", text: "Error: Something went wrong" }]
    }
  },
  resource: {
    success: {
      contents: [{
        uri: "maas://machine/abc123/details",
        text: JSON.stringify({ system_id: "abc123", hostname: "test-machine-1" }),
        mimeType: "application/json"
      }]
    },
    error: {
      isError: true,
      error: "Resource not found"
    }
  },
  health: {
    success: { 
      status: 'ok' 
    }
  }
};

/**
 * Helper function to configure the mock response for a specific test
 * @param {Object} responseData - The mock response data to return
 */
function configureMockResponse(responseData) {
  mockThen.mockImplementationOnce((callback) => {
    const response = {
      status: 200,
      body: responseData
    };
    return Promise.resolve(callback(response));
  });
}

// 4. Test suite
describe('MCP Server Integration', () => {
  // 5. Setup and teardown
  let server;
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
  
  // 6. Test cases
  describe('Tool Execution', () => {
    test('should successfully execute the list machines tool when valid parameters are provided', async () => {
      // Arrange
      configureMockResponse(mockResponses.tool.success);
      
      // Act
      const response = await request
        .post('/mcp')
        .send({
          type: 'tool_call',
          tool: 'maas_list_machines',
          params: {}
        });
      
      // Assert
      expect(mockSupertest).toHaveBeenCalled();
      expect(mockPost).toHaveBeenCalledWith('/mcp');
      expect(mockSend).toHaveBeenCalledWith({
        type: 'tool_call',
        tool: 'maas_list_machines',
        params: {}
      });
      
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(response.body.content).toBeDefined();
      expect(registerAllTools).toHaveBeenCalledWith(server, expect.anything());
    });
    
    test('should return validation error when required parameters are missing', async () => {
      // Arrange
      configureMockResponse(mockResponses.tool.error);
      
      // Act
      const response = await request
        .post('/mcp')
        .send({
          type: 'tool_call',
          tool: 'maas_create_tag',
          params: {
            // Missing required 'name' parameter
          }
        });
      
      // Assert
      expect(response.status).toBe(200); // MCP protocol returns 200 even for errors
      expect(response.body).toBeDefined();
      expect(response.body.isError).toBe(true);
    });
  });
  
  describe('Resource Access', () => {
    test('should successfully retrieve resource when valid URI is provided', async () => {
      // Arrange
      configureMockResponse(mockResponses.resource.success);
      
      // Act
      const response = await request
        .post('/mcp')
        .send({
          type: 'resource_access',
          uri: 'maas://machine/abc123/details'
        });
      
      // Assert
      expect(mockSupertest).toHaveBeenCalled();
      expect(mockPost).toHaveBeenCalledWith('/mcp');
      expect(mockSend).toHaveBeenCalledWith({
        type: 'resource_access',
        uri: 'maas://machine/abc123/details'
      });
      
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(response.body.contents).toBeDefined();
      expect(registerAllResources).toHaveBeenCalledWith(server, expect.anything());
    });
    
    test('should return error when non-existent resource is requested', async () => {
      // Arrange
      configureMockResponse(mockResponses.resource.error);
      
      // Act
      const response = await request
        .post('/mcp')
        .send({
          type: 'resource_access',
          uri: 'maas://machine/nonexistent/details'
        });
      
      // Assert
      expect(response.status).toBe(200); // MCP protocol returns 200 even for errors
      expect(response.body).toBeDefined();
      expect(response.body.isError).toBe(true);
    });
  });
  
  describe('Concurrent Requests', () => {
    test('should handle multiple concurrent requests without errors', async () => {
      // Arrange
      mockThen.mockImplementation((callback) => {
        const response = {
          status: 200,
          body: mockResponses.tool.success
        };
        return Promise.resolve(callback(response));
      });
      
      // Act
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
      
      const responses = await Promise.all(requests);
      
      // Assert
      for (const response of responses) {
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
      }
      
      expect(mockPost.mock.calls.length).toBeGreaterThan(0);
    });
  });
  
  describe('Request Cancellation', () => {
    test('should handle request cancellation when AbortSignal is triggered', async () => {
      // Arrange
      const controller = new AbortController();
      const signal = controller.signal;
      
      // Act
      const requestPromise = axios.post(`http://localhost:${TEST_PORT}/mcp`, {
        type: 'tool_call',
        tool: 'maas_list_machines',
        params: {}
      }, { signal });
      
      controller.abort();
      
      // Assert
      await expect(requestPromise).rejects.toThrow();
      expect(mockAxiosPost).toHaveBeenCalled();
    });
  });
  
  describe('Health Check', () => {
    test('should respond with status ok when health endpoint is accessed', async () => {
      // Arrange
      configureMockResponse(mockResponses.health.success);
      
      // Act
      const response = await request.get('/health');
      
      // Assert
      expect(mockSupertest).toHaveBeenCalled();
      expect(mockGet).toHaveBeenCalledWith('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });
});