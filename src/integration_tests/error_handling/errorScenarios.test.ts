/**
 * Error Scenario Integration Tests
 * 
 * These tests verify that the server properly handles various error conditions,
 * including network failures, MAAS API errors, and client errors.
 */

import { setupTestServer, TestServerEnvironment, createToolCallRequest, createResourceAccessRequest } from '../setup/testServerSetup.js';
import { createMockMaasApiClient } from '../mocks/mockMaasApiClient.js';
import { MaasApiError } from '../../types/maas.js';

describe('Error Scenario Handling', () => {
  let testEnv: TestServerEnvironment;
  
  afterEach(async () => {
    // Clean up the test server after each test
    if (testEnv) {
      await testEnv.cleanup();
    }
  });
  
  describe('MAAS API Errors', () => {
    beforeEach(async () => {
      // Create a mock MAAS API client that always returns errors
      const mockMaasClient = createMockMaasApiClient({
        simulateRandomErrors: true,
        errorProbability: 1.0 // Always return errors
      });
      
      // Set up the test server with the error-prone MAAS API client
      testEnv = await setupTestServer({
        port: 3002,
        mockMaasApiClient: mockMaasClient
      });
    });
    
    it('should handle MAAS API errors during tool execution', async () => {
      // Make a request to execute a tool
      const response = await testEnv.request
        .post('/mcp')
        .send(createToolCallRequest('maas_list_machines', {}));
      
      // Verify the response
      expect(response.status).toBe(200); // MCP protocol returns 200 even for errors
      expect(response.body).toBeDefined();
      expect(response.body.isError).toBe(true);
      expect(response.body.content).toBeDefined();
      expect(response.body.content[0].text).toContain('error');
    });
    
    it('should handle MAAS API errors during resource access', async () => {
      // Make a request to access a resource
      const response = await testEnv.request
        .post('/mcp')
        .send(createResourceAccessRequest('maas://machines/list'));
      
      // Verify the response
      expect(response.status).toBe(200); // MCP protocol returns 200 even for errors
      expect(response.body).toBeDefined();
      expect(response.body.isError).toBe(true);
    });
  });
  
  describe('Network Failures', () => {
    beforeEach(async () => {
      // Create a mock MAAS API client that simulates network timeouts
      const mockMaasClient = createMockMaasApiClient({
        customHandlers: {
          '/machines/': async () => {
            // Simulate a long delay followed by a timeout
            await new Promise(resolve => setTimeout(resolve, 100));
            throw new Error('Network timeout');
          }
        }
      });
      
      // Set up the test server with the timeout-prone MAAS API client
      testEnv = await setupTestServer({
        port: 3003,
        mockMaasApiClient: mockMaasClient
      });
    });
    
    it('should handle network timeouts', async () => {
      // Make a request to execute a tool that will time out
      const response = await testEnv.request
        .post('/mcp')
        .send(createToolCallRequest('maas_list_machines', {}));
      
      // Verify the response
      expect(response.status).toBe(200); // MCP protocol returns 200 even for errors
      expect(response.body).toBeDefined();
      expect(response.body.isError).toBe(true);
      expect(response.body.content).toBeDefined();
      expect(response.body.content[0].text).toContain('timeout');
    });
  });
  
  describe('Not Found Errors', () => {
    beforeEach(async () => {
      // Create a mock MAAS API client that returns 404 errors for specific resources
      const mockMaasClient = createMockMaasApiClient({
        customHandlers: {
          '/machines/nonexistent': async () => {
            throw new MaasApiError('Machine not found', 404);
          }
        }
      });
      
      // Set up the test server with the MAAS API client
      testEnv = await setupTestServer({
        port: 3004,
        mockMaasApiClient: mockMaasClient
      });
    });
    
    it('should handle 404 errors from MAAS API', async () => {
      // Make a request to access a non-existent machine
      const response = await testEnv.request
        .post('/mcp')
        .send(createResourceAccessRequest('maas://machines/nonexistent/details'));
      
      // Verify the response
      expect(response.status).toBe(200); // MCP protocol returns 200 even for errors
      expect(response.body).toBeDefined();
      expect(response.body.isError).toBe(true);
      expect(response.body.error).toContain('not found');
    });
  });
  
  describe('Validation Errors', () => {
    beforeEach(async () => {
      // Set up the test server with a standard mock MAAS API client
      testEnv = await setupTestServer({
        port: 3005
      });
    });
    
    it('should handle invalid tool parameters', async () => {
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
      expect(response.body.content[0].text).toContain('validation');
    });
    
    it('should handle invalid resource URIs', async () => {
      // Make a request with an invalid URI
      const response = await testEnv.request
        .post('/mcp')
        .send(createResourceAccessRequest('invalid://uri'));
      
      // Verify the response
      expect(response.status).toBe(200); // MCP protocol returns 200 even for errors
      expect(response.body).toBeDefined();
      expect(response.body.isError).toBe(true);
      expect(response.body.error).toContain('URI');
    });
  });
  
  describe('Abort Signal Handling', () => {
    beforeEach(async () => {
      // Create a mock MAAS API client that respects abort signals
      const mockMaasClient = createMockMaasApiClient({
        simulateNetworkDelay: true,
        networkDelayMs: 500 // Long enough to abort
      });
      
      // Set up the test server with the MAAS API client
      testEnv = await setupTestServer({
        port: 3006,
        mockMaasApiClient: mockMaasClient
      });
    });
    
    it('should handle aborted requests', async () => {
      // Create a request that will be aborted
      const controller = new AbortController();
      const signal = controller.signal;
      
      // Start the request
      const requestPromise = fetch(`${testEnv.baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createToolCallRequest('maas_list_machines', {})),
        signal
      });
      
      // Abort the request after a short delay
      setTimeout(() => controller.abort(), 10);
      
      // Verify that the request was aborted
      try {
        await requestPromise;
        fail('Request should have been aborted');
      } catch (error: any) {
        expect(error.name).toBe('AbortError');
      }
    });
  });
  
  describe('Server Errors', () => {
    beforeEach(async () => {
      // Create a mock MAAS API client that simulates server errors
      const mockMaasClient = createMockMaasApiClient({
        customHandlers: {
          '/machines/': async () => {
            throw new MaasApiError('Internal server error', 500);
          }
        }
      });
      
      // Set up the test server with the error-prone MAAS API client
      testEnv = await setupTestServer({
        port: 3007,
        mockMaasApiClient: mockMaasClient
      });
    });
    
    it('should handle server errors from MAAS API', async () => {
      // Make a request to execute a tool
      const response = await testEnv.request
        .post('/mcp')
        .send(createToolCallRequest('maas_list_machines', {}));
      
      // Verify the response
      expect(response.status).toBe(200); // MCP protocol returns 200 even for errors
      expect(response.body).toBeDefined();
      expect(response.body.isError).toBe(true);
      expect(response.body.content).toBeDefined();
      expect(response.body.content[0].text).toContain('server error');
    });
  });
});