"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExpressApp = createExpressApp;
exports.startHttpServer = startHttpServer;
const express_1 = __importDefault(require("express"));
const streamableHttp_js_1 = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
/**
 * Creates and configures an Express app with an MCP endpoint
 * @param server The MCPServer instance to connect to the transport
 * @param port The port to listen on
 * @returns The configured Express app
 */
function createExpressApp(server, port) {
    const app = (0, express_1.default)();
    // Configure middleware
    app.use(express_1.default.json({ limit: '10mb' }));
    // Set up the MCP endpoint
    app.post('/mcp', async (req, res) => {
        logger_js_1.default.info(`Received request to /mcp endpoint`);
        try {
            // Create a new transport instance for this request
            const transport = new streamableHttp_js_1.StreamableHTTPServerTransport({
                sessionIdGenerator: undefined // Use stateless mode
            });
            // Connect the transport to the server
            await server.connect(transport);
            // Handle the request
            await transport.handleRequest(req, res, req.body);
            // Clean up when the response is closed
            res.on('close', () => {
                logger_js_1.default.debug('Response closed, cleaning up transport');
                transport.close();
            });
        }
        catch (error) {
            logger_js_1.default.error('Error handling MCP request', error);
            res.status(500).json({
                error: 'Internal server error',
                message: error.message
            });
        }
    });
    // Add a health check endpoint
    app.get('/health', (req, res) => {
        res.status(200).json({ status: 'ok' });
    });
    return app;
}
/**
 * Starts the HTTP server with the MCP endpoint
 * @param server The MCPServer instance to connect to the transport
 * @param port The port to listen on
 * @returns The HTTP server instance
 */
function startHttpServer(server, port) {
    const app = createExpressApp(server, port);
    // Start the server
    const httpServer = app.listen(port, () => {
        logger_js_1.default.info(`MCP Server for MAAS API listening on http://localhost:${port}/mcp`);
    });
    // Handle server errors
    httpServer.on('error', (error) => {
        logger_js_1.default.error('HTTP server error', error);
    });
    return httpServer;
}
