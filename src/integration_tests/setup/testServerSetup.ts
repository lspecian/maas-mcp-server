/**
 * Test Server Setup Utilities
 *
 * This module provides utilities for setting up a test server environment
 * for integration tests. It includes functions for creating a test server,
 * configuring the environment, and cleaning up after tests.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { MaasApiClient } from '../../maas/MaasApiClient.js';
import { createMockMaasApiClient } from '../../__tests__/mocks/mockMaasApiClient.js';
import { registerTools } from '../../mcp_tools/index.js';
import { registerResources } from '../../mcp_resources/index.js';
import { createExpressApp, startHttpServer } from '../../transport/http.js';
import supertest from 'supertest';
import { Server } from 'http';

/**
 * Test server configuration options
 */
export interface TestServerOptions {
  port?: number;
  mockMaasApiClient?: MaasApiClient;
  serverName?: string;
  serverVersion?: string;
  protocolVersion?: string;
}

/**
 * Test server environment
 */
export interface TestServerEnvironment {
  server: McpServer;
  transport: StreamableHTTPServerTransport;
  httpServer: Server;
  maasClient: MaasApiClient;
  request: any; // Using any to avoid type issues with supertest
  baseUrl: string;
  cleanup: () => Promise<void>;
}

/**
 * Create a test server environment for integration tests
 * 
 * @param options Test server configuration options
 * @returns Test server environment
 */
export async function setupTestServer(options: TestServerOptions = {}): Promise<TestServerEnvironment> {
  const {
    port = 3001,
    mockMaasApiClient,
    serverName = 'Test MAAS MCP Server',
    serverVersion = '0.1.0',
    protocolVersion = '2024-11-05'
  } = options;

  // Create the MCP server
  const server = new McpServer({
    name: serverName,
    version: serverVersion,
    protocolVersion,
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
  });

  // Create the MAAS API client (use mock if provided, otherwise create a default mock)
  const maasClient = mockMaasApiClient || createMockMaasApiClient();

  // Register all tools and resources
  registerTools(server, maasClient);
  registerResources(server, maasClient);

  // Create the Express app and HTTP server
  const app = createExpressApp(server as any, port);
  const httpServer = startHttpServer(server as any, port);
  
  // Create the transport for this test environment
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined // Use stateless mode
  });
  
  // Connect the transport to the server
  await server.connect(transport as any);
  
  // Create a supertest instance for making requests to the server
  const request = supertest(`http://localhost:${port}`);
  const baseUrl = `http://localhost:${port}`;

  // Create a cleanup function
  const cleanup = async () => {
    return new Promise<void>((resolve, reject) => {
      httpServer.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  };

  return {
    server,
    transport,
    httpServer,
    maasClient,
    request: request as any,
    baseUrl,
    cleanup
  };
}

/**
 * Create a test client for making requests to the MCP server
 * 
 * @param baseUrl Base URL of the MCP server
 * @returns Supertest instance for making requests
 */
export function createTestClient(baseUrl: string): supertest.SuperTest<supertest.Test> {
  return supertest(baseUrl) as any;
}

/**
 * Helper function to create a tool call request body
 * 
 * @param tool Tool name
 * @param params Tool parameters
 * @returns Request body for a tool call
 */
export function createToolCallRequest(tool: string, params: Record<string, any> = {}) {
  return {
    type: 'tool_call',
    tool,
    params
  };
}

/**
 * Helper function to create a resource access request body
 * 
 * @param uri Resource URI
 * @returns Request body for a resource access
 */
export function createResourceAccessRequest(uri: string) {
  return {
    type: 'resource_access',
    uri
  };
}