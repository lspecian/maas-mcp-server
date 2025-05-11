/**
 * Client-Server Communication Integration Tests
 * 
 * These tests verify the proper communication between MCP client and server components,
 * testing API endpoint accessibility, request formatting, and response handling.
 */

import { setupTestServer, TestServerEnvironment, createToolCallRequest, createResourceAccessRequest } from '../setup/testServerSetup.js';
import { mockClientConfigs } from '../mocks/mockMaasApiClient.js';
// Mock MCP client since we don't have access to the actual client package
interface MCPClient {
  initialize: () => Promise<void>;
  executeTool: (tool: string, params: any) => Promise<any>;
  accessResource: (uri: string) => Promise<any>;
  close: () => Promise<void>;
}

describe('Client-Server Communication', () => {
  let testEnv: TestServerEnvironment;
  
  beforeAll(async () => {
    // Set up the test server with a mock MAAS API client
    testEnv = await setupTestServer({
      port: 3001,
      mockMaasApiClient: mockClientConfigs.default()
    });
  });
  
  afterAll(async () => {
    // Clean up the test server
    await testEnv.cleanup();
  });
  
  describe('HTTP Transport', () => {
    it('should respond to health check requests', async () => {
      // Make a request to the health check endpoint
      const response = await testEnv.request.get('/health');
      
      // Verify the response
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
    
    it('should handle MCP endpoint requests', async () => {
      // Make a request to the MCP endpoint
      const response = await testEnv.request
        .post('/mcp')
        .send(createToolCallRequest('maas_list_machines', {}));
      
      // Verify the response
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(response.body.content).toBeDefined();
    });
    
    it('should reject invalid requests with appropriate error', async () => {
      // Make an invalid request to the MCP endpoint
      const response = await testEnv.request
        .post('/mcp')
        .send({ invalid: 'request' });
      
      // Verify the response
      expect(response.status).toBe(200); // MCP protocol returns 200 even for errors
      expect(response.body).toBeDefined();
      expect(response.body.isError).toBe(true);
    });
  });
  
  describe('MCP Client Integration', () => {
    let mcpClient: MCPClient;
    
    beforeAll(async () => {
      // Create a mock MCP client
      mcpClient = {
        initialize: jest.fn().mockResolvedValue(undefined),
        executeTool: jest.fn().mockImplementation(async (tool, params) => {
          const response = await testEnv.request
            .post('/mcp')
            .send(createToolCallRequest(tool, params));
          return response.body;
        }),
        accessResource: jest.fn().mockImplementation(async (uri) => {
          const response = await testEnv.request
            .post('/mcp')
            .send(createResourceAccessRequest(uri));
          return response.body;
        }),
        close: jest.fn().mockResolvedValue(undefined)
      };
      
      // Initialize the client
      await mcpClient.initialize();
    });
    
    afterAll(async () => {
      // Close the client
      await mcpClient.close();
    });
    
    it('should execute tools through the MCP client', async () => {
      // Execute a tool through the MCP client
      const result = await mcpClient.executeTool('maas_list_machines', {});
      
      // Verify the result
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.isError).toBeFalsy();
    });
    
    it('should access resources through the MCP client', async () => {
      // Access a resource through the MCP client
      const result = await mcpClient.accessResource('maas://machines/list');
      
      // Verify the result
      expect(result).toBeDefined();
      expect(result.contents).toBeDefined();
      expect(result.isError).toBeFalsy();
    });
    
    it('should handle tool execution errors', async () => {
      // Execute a non-existent tool
      try {
        await mcpClient.executeTool('non_existent_tool', {});
        fail('Should have thrown an error');
      } catch (error) {
        // Verify the error
        expect(error).toBeDefined();
      }
    });
    
    it('should handle resource access errors', async () => {
      // Access a non-existent resource
      try {
        await mcpClient.accessResource('maas://non/existent/resource');
        fail('Should have thrown an error');
      } catch (error) {
        // Verify the error
        expect(error).toBeDefined();
      }
    });
  });
  
  describe('Request Validation', () => {
    it('should validate tool parameters', async () => {
      // Make a request with invalid parameters
      const response = await testEnv.request
        .post('/mcp')
        .send(createToolCallRequest('maas_create_tag', {
          // Missing required 'name' parameter
        }));
      
      // Verify the response
      expect(response.status).toBe(200); // MCP protocol returns 200 even for errors
      expect(response.body).toBeDefined();
      expect(response.body.isError).toBe(true);
      expect(response.body.content).toBeDefined();
      expect(response.body.content[0].text).toContain('name');
    });
    
    it('should validate resource URIs', async () => {
      // Make a request with an invalid URI
      const response = await testEnv.request
        .post('/mcp')
        .send(createResourceAccessRequest('invalid://uri'));
      
      // Verify the response
      expect(response.status).toBe(200); // MCP protocol returns 200 even for errors
      expect(response.body).toBeDefined();
      expect(response.body.isError).toBe(true);
    });
  });
  
  describe('Content Types', () => {
    it('should handle JSON content', async () => {
      // Make a request to the MCP endpoint
      const response = await testEnv.request
        .post('/mcp')
        .send(createToolCallRequest('maas_list_machines', {}));
      
      // Verify the response
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
    });
    
    it('should reject non-JSON requests', async () => {
      // Make a request with non-JSON content
      const response = await testEnv.request
        .post('/mcp')
        .set('Content-Type', 'text/plain')
        .send('This is not JSON');
      
      // Verify the response
      expect(response.status).toBe(400);
    });
  });
});