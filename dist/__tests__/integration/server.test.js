"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js"); // .js restored
const streamableHttp_ts_1 = require("@modelcontextprotocol/sdk/server/streamableHttp.ts"); // .js restored
const types_ts_1 = require("@modelcontextprotocol/sdk/types.ts");
const config_js_1 = __importDefault(require("../../config.js"));
const logger_ts_1 = __importStar(require("../../utils/logger.ts"));
// Mock MaasApiClient
jest.mock('../../maas/MaasApiClient.js', () => {
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
let app;
let serverInstance;
let httpServer; // To close the server after tests
const mcpPort = config_js_1.default.mcpPort + 1; // Use a different port for testing to avoid conflicts
beforeAll(async () => {
    // Re-initialize McpServer for each test suite if needed, or ensure it's fresh.
    // For this setup, we'll create it once.
    serverInstance = new mcp_js_1.McpServer({
        name: "MAAS-API-MCP-Server-Test",
        version: "1.0.0",
        protocolVersion: types_ts_1.LATEST_PROTOCOL_VERSION,
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
    app = (0, express_1.default)();
    app.use(express_1.default.json({ limit: '10mb' }));
    app.get('/health', (req, res) => {
        res.status(200).json({ status: 'ok' });
    });
    app.post('/mcp', async (req, res) => {
        const requestId = (0, logger_ts_1.generateRequestId)();
        const requestLogger = logger_ts_1.default.child({ requestId, mcpMethod: req.body?.method });
        requestLogger.info({
            params: req.body?.params ? JSON.stringify(req.body.params).substring(0, 200) : undefined
        }, 'Received MCP request (test)');
        const transport = new streamableHttp_ts_1.StreamableHTTPServerTransport({
            sessionIdGenerator: undefined
        });
        try {
            await serverInstance.connect(transport); // Cast to any to bypass type error
            await transport.handleRequest(req, res, req.body);
            requestLogger.info('MCP request handled successfully (test)');
        }
        catch (error) {
            requestLogger.error({ err: error, errMsg: error.message, errStack: error.stack?.substring(0, 500) }, 'Error handling MCP request (test)');
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
        }
        finally {
            res.on('finish', () => transport.close());
            res.on('close', () => {
                if (!res.writableEnded) {
                    transport.close();
                }
            });
        }
    });
    await new Promise((resolve) => {
        httpServer = app.listen(mcpPort, () => {
            logger_ts_1.default.info(`Test MCP Server listening on http://localhost:${mcpPort}/mcp`);
            resolve();
        });
    });
});
afterAll(async () => {
    await new Promise((resolve, reject) => {
        if (httpServer) {
            httpServer.close((err) => {
                if (err) {
                    logger_ts_1.default.error('Error closing test server:', err);
                    return reject(err);
                }
                logger_ts_1.default.info('Test MCP Server closed');
                resolve();
            });
        }
        else {
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
            const response = await (0, supertest_1.default)(app).get('/health');
            expect(response.status).toBe(200);
            expect(response.body).toEqual({ status: 'ok' });
        });
    });
    // Test 3: Basic MCP initialize request
    describe('POST /mcp - MCP Initialize', () => {
        it('should handle a valid MCP initialize request', async () => {
            const initializeRequest = {
                jsonrpc: '2.0',
                method: "initialize",
                params: {
                    clientName: 'test-client',
                    clientVersion: '0.1.0',
                    protocolVersion: types_ts_1.LATEST_PROTOCOL_VERSION,
                    clientInfo: {},
                    capabilities: {}
                },
                id: 'init-test-1'
            };
            const response = await (0, supertest_1.default)(app)
                .post('/mcp')
                .send(initializeRequest);
            expect(response.status).toBe(200);
            const mcpResponse = response.body;
            expect(mcpResponse.jsonrpc).toBe('2.0');
            expect(mcpResponse.id).toBe('init-test-1');
            expect(mcpResponse.result).toBeDefined();
            if (mcpResponse.result) {
                expect(mcpResponse.result.name).toBe("MAAS-API-MCP-Server-Test");
                expect(mcpResponse.result.protocolVersion).toBe(types_ts_1.LATEST_PROTOCOL_VERSION);
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
            const response = await (0, supertest_1.default)(app)
                .post('/mcp')
                .send(malformedRequest);
            expect(response.status).toBe(400); // MCP SDK StreamableHTTPServerTransport sends 400 for this
            const mcpResponse = response.body;
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
            const response = await (0, supertest_1.default)(app)
                .post('/mcp')
                .send(malformedRequest);
            expect(response.status).toBe(400);
            const mcpResponse = response.body;
            expect(mcpResponse.jsonrpc).toBe('2.0');
            expect(mcpResponse.id).toBe('malformed-test-2');
            expect(mcpResponse.error).toBeDefined();
            if (mcpResponse.error) {
                expect(mcpResponse.error.code).toBe(-32600); // Invalid Request
                expect(mcpResponse.error.message).toContain('Invalid Request');
            }
        });
        it('should return JSON-RPC parse error for non-JSON body', async () => {
            const response = await (0, supertest_1.default)(app)
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
            }
            else {
                // If express.json() middleware catches it, it might not be a JSON-RPC error
                // but a plain text or HTML error page. For this test, a 400 is sufficient.
                expect(response.status).toBe(400);
            }
        });
    });
    // Test 5: Invalid MCP method
    describe('POST /mcp - Invalid MCP Method', () => {
        it('should return JSON-RPC error for an invalid MCP method', async () => {
            const invalidMethodRequest = {
                jsonrpc: '2.0',
                method: 'nonExistentMcpMethod',
                params: {},
                id: 'invalid-method-test-1'
            };
            const response = await (0, supertest_1.default)(app)
                .post('/mcp')
                .send(invalidMethodRequest);
            expect(response.status).toBe(400); // MCP SDK StreamableHTTPServerTransport sends 400
            const mcpResponse = response.body;
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
