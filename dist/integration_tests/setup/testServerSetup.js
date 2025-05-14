"use strict";
/**
 * Test Server Setup Utilities
 *
 * This module provides utilities for setting up a test server environment
 * for integration tests. It includes functions for creating a test server,
 * configuring the environment, and cleaning up after tests.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupTestServer = setupTestServer;
exports.createTestClient = createTestClient;
exports.createToolCallRequest = createToolCallRequest;
exports.createResourceAccessRequest = createResourceAccessRequest;
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const streamableHttp_js_1 = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const mockMaasApiClient_js_1 = require("../../__tests__/mocks/mockMaasApiClient.js");
const index_js_1 = require("../../mcp_tools/index.js");
const index_js_2 = require("../../mcp_resources/index.js");
const http_js_1 = require("../../transport/http.js");
const supertest_1 = __importDefault(require("supertest"));
/**
 * Create a test server environment for integration tests
 *
 * @param options Test server configuration options
 * @returns Test server environment
 */
async function setupTestServer(options = {}) {
    const { port = 3001, mockMaasApiClient, serverName = 'Test MAAS MCP Server', serverVersion = '0.1.0', protocolVersion = '2024-11-05' } = options;
    // Create the MCP server
    const server = new mcp_js_1.McpServer({
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
    const maasClient = mockMaasApiClient || (0, mockMaasApiClient_js_1.createMockMaasApiClient)();
    // Register all tools and resources
    (0, index_js_1.registerTools)(server, maasClient);
    (0, index_js_2.registerResources)(server, maasClient);
    // Create the Express app and HTTP server
    const app = (0, http_js_1.createExpressApp)(server, port);
    const httpServer = (0, http_js_1.startHttpServer)(server, port);
    // Create the transport for this test environment
    const transport = new streamableHttp_js_1.StreamableHTTPServerTransport({
        sessionIdGenerator: undefined // Use stateless mode
    });
    // Connect the transport to the server
    await server.connect(transport);
    // Create a supertest instance for making requests to the server
    const request = (0, supertest_1.default)(`http://localhost:${port}`);
    const baseUrl = `http://localhost:${port}`;
    // Create a cleanup function
    const cleanup = async () => {
        return new Promise((resolve, reject) => {
            httpServer.close((err) => {
                if (err) {
                    reject(err);
                }
                else {
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
        request: request,
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
function createTestClient(baseUrl) {
    return (0, supertest_1.default)(baseUrl);
}
/**
 * Helper function to create a tool call request body
 *
 * @param tool Tool name
 * @param params Tool parameters
 * @returns Request body for a tool call
 */
function createToolCallRequest(tool, params = {}) {
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
function createResourceAccessRequest(uri) {
    return {
        type: 'resource_access',
        uri
    };
}
