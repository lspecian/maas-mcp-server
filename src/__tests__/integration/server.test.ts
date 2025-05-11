import request from 'supertest';
import express, { Express } from 'express';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"; // .js restored
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"; // .js restored
import {
  LATEST_PROTOCOL_VERSION,
  InitializeResult,
  // InitializeParams, RequestMessage, ResponseMessage, ErrorObject removed
} from "@modelcontextprotocol/sdk/types.js";
import config from '../../config.js';
import logger, { generateRequestId } from '../../utils/logger.js';
// Import the original MaasApiClient to mock it
import { MaasApiClient as OriginalMaasApiClient } from '../../maas/MaasApiClient.js'; // .js restored

// Mock MaasApiClient
jest.mock('../../maas/MaasApiClient.js', () => { // .js restored
  return {
    MaasApiClient: jest.fn().mockImplementation(() => {
      return {
        // Mock any methods that might be called during server setup or basic requests
        // For these tests, it's unlikely any MaasApiClient methods are directly called
        // by the MCP initialize or health check, but it's good practice.
        getMachines: jest.fn().mockResolvedValue([]),
      };
    })
  };
});

// Dynamically import the app AFTER mocks are set up
let app: Express;
let serverInstance: McpServer;
let httpServer: any; // To close the server after tests

const mcpPort = config.mcpPort + 1; // Use a different port for testing to avoid conflicts

beforeAll(async () => {
  // Re-initialize McpServer for each test suite if needed, or ensure it's fresh.
  // For this setup, we'll create it once.
  serverInstance = new McpServer({
    name: "MAAS-API-MCP-Server-Test",
    version: "1.0.0",
    protocolVersion: LATEST_PROTOCOL_VERSION,
    serverInfo: {
      name: "Test Canonical MAAS API Bridge for MCP",
      version: "0.1.0",
      instructions: "Test MCP server."
    },
    capabilities: {
      resources: { listChanged: false },
      tools: { listChanged: false },
    },
  });

  app = express();
  app.use(express.json({ limit: '10mb' }));

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.post('/mcp', async (req, res) => {
    const requestId = generateRequestId();
    const requestLogger = logger.child({ requestId, mcpMethod: req.body?.method });

    requestLogger.info({
      params: req.body?.params ? JSON.stringify(req.body.params).substring(0, 200) : undefined
    }, 'Received MCP request (test)');

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined
    });

    try {
      await serverInstance.connect(transport as any); // Cast to any to bypass type error
      await transport.handleRequest(req, res, req.body);
      requestLogger.info('MCP request handled successfully (test)');
    } catch (error: any) {
      requestLogger.error({ err: error, errMsg: error.message, errStack: error.stack?.substring(0,500) }, 'Error handling MCP request (test)');
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Internal server error during MCP request processing.',
          },
          id: req.body?.id || null
        });
      }
    } finally {
      res.on('finish', () => transport.close());
      res.on('close', () => {
        if (!res.writableEnded) {
            transport.close();
        }
      });
    }
  });

  await new Promise<void>((resolve) => {
    httpServer = app.listen(mcpPort, () => {
      logger.info(`Test MCP Server listening on http://localhost:${mcpPort}/mcp`);
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    if (httpServer) {
      httpServer.close((err?: Error) => {
        if (err) {
          logger.error('Error closing test server:', err);
          return reject(err);
        }
        logger.info('Test MCP Server closed');
        resolve();
      });
    } else {
      resolve();
    }
  });
  // Clear all mocks
  jest.clearAllMocks();
});

describe('MCP Server Integration Tests', () => {
  // Test 1: Server starts without errors (implicit by beforeAll completing)
  test('Server should start without errors', () => {
    expect(httpServer).toBeDefined();
    expect(app).toBeDefined();
  });

  // Test 2: Health endpoint works
  describe('GET /health', () => {
    it('should return 200 OK and status ok', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  // Test 3: Basic MCP initialize request
  describe('POST /mcp - MCP Initialize', () => {
    it('should handle a valid MCP initialize request', async () => {
      const initializeRequest: {
        jsonrpc: string;
        method: string;
        params: any; // Using any for params as InitializeParams was an issue
        id: string | number | null;
      } = {
        jsonrpc: '2.0',
        method: "initialize",
        params: {
          clientName: 'test-client',
          clientVersion: '0.1.0',
          protocolVersion: LATEST_PROTOCOL_VERSION,
          clientInfo: {},
          capabilities: {}
        },
        id: 'init-test-1'
      };

      const response = await request(app)
        .post('/mcp')
        .send(initializeRequest);

      expect(response.status).toBe(200);
      const mcpResponse = response.body as { jsonrpc: string; id: string | number | null; result?: InitializeResult; error?: any };
      expect(mcpResponse.jsonrpc).toBe('2.0');
      expect(mcpResponse.id).toBe('init-test-1');
      expect(mcpResponse.result).toBeDefined();
      if (mcpResponse.result) {
        expect(mcpResponse.result.name).toBe("MAAS-API-MCP-Server-Test");
        expect(mcpResponse.result.protocolVersion).toBe(LATEST_PROTOCOL_VERSION);
        expect(mcpResponse.result.serverInfo).toBeDefined();
      }
      expect(mcpResponse.error).toBeUndefined();
    });
  });

  // Test 4: Malformed request error handling
  describe('POST /mcp - Malformed JSON-RPC Requests', () => {
    it('should return JSON-RPC error for request missing "jsonrpc" property', async () => {
      const malformedRequest = {
        // jsonrpc: '2.0', // Missing
        method: "initialize", // Changed from McpMethod.Initialize
        params: {},
        id: 'malformed-test-1'
      };

      const response = await request(app)
        .post('/mcp')
        .send(malformedRequest);

      expect(response.status).toBe(400); // MCP SDK StreamableHTTPServerTransport sends 400 for this
      const mcpResponse = response.body as { jsonrpc: string; id: string | number | null; error?: { code: number; message: string } };
      expect(mcpResponse.jsonrpc).toBe('2.0');
      expect(mcpResponse.id).toBe('malformed-test-1');
      expect(mcpResponse.error).toBeDefined();
      if (mcpResponse.error) {
        expect(mcpResponse.error.code).toBe(-32600); // Invalid Request
        expect(mcpResponse.error.message).toContain('Invalid Request');
      }
    });

    it('should return JSON-RPC error for request missing "method" property', async () => {
      const malformedRequest = {
        jsonrpc: '2.0',
        // method: "initialize", // Missing, ensure consistency if this was intended to be a valid method name
        params: {},
        id: 'malformed-test-2'
      };

      const response = await request(app)
        .post('/mcp')
        .send(malformedRequest);

      expect(response.status).toBe(400);
      const mcpResponse = response.body as { jsonrpc: string; id: string | number | null; error?: { code: number; message: string } };
      expect(mcpResponse.jsonrpc).toBe('2.0');
      expect(mcpResponse.id).toBe('malformed-test-2');
      expect(mcpResponse.error).toBeDefined();
      if (mcpResponse.error) {
        expect(mcpResponse.error.code).toBe(-32600); // Invalid Request
        expect(mcpResponse.error.message).toContain('Invalid Request');
      }
    });

    it('should return JSON-RPC parse error for non-JSON body', async () => {
        const response = await request(app)
          .post('/mcp')
          .set('Content-Type', 'text/plain')
          .send('this is not json');

        // The express.json() middleware handles this before it reaches MCP transport
        expect(response.status).toBe(400); // Or 415 depending on exact express setup for bad content type
        const errorResponse = response.body;
        // Example: {"jsonrpc":"2.0","error":{"code":-32700,"message":"Parse error"},"id":null}
        // The exact response might vary if express.json() catches it first.
        // If express.json() fails, it might not be a JSON-RPC formatted error.
        // Let's check for a JSON-RPC error if it makes it to the MCP handler,
        // otherwise, a generic 400 is fine.
        if (response.body.jsonrpc === '2.0') {
            expect(errorResponse.error).toBeDefined();
            expect(errorResponse.error.code).toBe(-32700); // Parse error
        } else {
            // If express.json() middleware catches it, it might not be a JSON-RPC error
            // but a plain text or HTML error page. For this test, a 400 is sufficient.
            expect(response.status).toBe(400);
        }
      });
  });

  // Test 5: Invalid MCP method
  describe('POST /mcp - Invalid MCP Method', () => {
    it('should return JSON-RPC error for an invalid MCP method', async () => {
      const invalidMethodRequest: { // More generic type
        jsonrpc: string;
        method: string;
        params: any;
        id: string | number | null;
      } = {
        jsonrpc: '2.0',
        method: 'nonExistentMcpMethod',
        params: {},
        id: 'invalid-method-test-1'
      };

      const response = await request(app)
        .post('/mcp')
        .send(invalidMethodRequest);

      expect(response.status).toBe(400); // MCP SDK StreamableHTTPServerTransport sends 400
      const mcpResponse = response.body as { jsonrpc: string; id: string | number | null; error?: { code: number; message: string } };
      expect(mcpResponse.jsonrpc).toBe('2.0');
      expect(mcpResponse.id).toBe('invalid-method-test-1');
      expect(mcpResponse.error).toBeDefined();
      if (mcpResponse.error) {
        expect(mcpResponse.error.code).toBe(-32601); // Method not found
        expect(mcpResponse.error.message).toContain('Method not found');
      }
    });
  });
});