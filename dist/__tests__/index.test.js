"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Mock the MCPServer class
jest.mock('@modelcontextprotocol/sdk', () => {
    return {
        MCPServer: jest.fn().mockImplementation(() => {
            return {
                start: jest.fn().mockResolvedValue(undefined),
                connect: jest.fn().mockResolvedValue(undefined),
                addTool: jest.fn(),
                addResource: jest.fn()
            };
        }),
        LATEST_PROTOCOL_VERSION: '2024-11-05'
    };
});
// Mock the config module
jest.mock('../config.js', () => ({
    MAAS_API_URL: 'https://example.com/MAAS/api/2.0',
    MAAS_API_KEY: 'consumer_key:token:secret',
    PORT: 3000,
    NODE_ENV: 'test',
    mcpServer: {
        name: 'MAAS-API-MCP-Server',
        version: '1.0.0',
        protocolVersion: '2024-11-05',
        serverInfo: {
            name: 'Canonical MAAS API Bridge for MCP',
            version: '0.1.0',
            instructions: 'This server provides access to the Canonical MAAS API through the Model Context Protocol. Use the provided tools and resources to interact with MAAS machines and other resources.'
        },
        capabilities: {
            resources: {
                listChanged: false,
            },
            tools: {
                listChanged: false,
            },
        },
    }
}));
// Mock the HTTP transport module
jest.mock('../transport/http.js', () => {
    return {
        startHttpServer: jest.fn().mockReturnValue({
            on: jest.fn(),
            close: jest.fn()
        })
    };
});
describe('MCP Server Entry Point', () => {
    let originalConsoleLog;
    let originalConsoleError;
    let consoleLogMock;
    let consoleErrorMock;
    beforeEach(() => {
        // Save original console methods
        originalConsoleLog = console.log;
        originalConsoleError = console.error;
        // Mock console methods
        consoleLogMock = jest.fn();
        consoleErrorMock = jest.fn();
        console.log = consoleLogMock;
        console.error = consoleErrorMock;
        // Clear module cache to ensure a fresh instance for each test
        jest.resetModules();
    });
    afterEach(() => {
        // Restore original console methods
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
    });
    test('should initialize and start the MCP server', async () => {
        // Import the module to test
        const { MCPServer } = require('@modelcontextprotocol/sdk');
        // Execute the main function by importing the index module
        await require('../index');
        // Import the mocked config
        const mockedConfig = require('../config.js');
        // Verify MCPServer was instantiated with correct parameters from config
        expect(MCPServer).toHaveBeenCalledWith(mockedConfig.mcpServer);
        // Get the instance of MCPServer that was created
        const serverInstance = MCPServer.mock.results[0].value;
        // Verify server.start() was called
        expect(serverInstance.start).toHaveBeenCalled();
        // Import the startHttpServer function
        const { startHttpServer } = require('../transport/http.js');
        // Verify logger.info was called with the expected message
        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('Starting MAAS MCP Server in test mode'));
        expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('MAAS MCP Server running on port 3000'));
        // Verify startHttpServer was called with the server instance and port
        expect(startHttpServer).toHaveBeenCalledWith(serverInstance, 3000);
    });
    test('should handle server startup errors', async () => {
        // Import the module to test
        const { MCPServer } = require('@modelcontextprotocol/sdk');
        // Make the start method throw an error
        const serverInstance = MCPServer.mock.results[0].value;
        serverInstance.start.mockRejectedValueOnce(new Error('Server startup failed'));
        // Mock process.exit to prevent the test from exiting
        const originalProcessExit = process.exit;
        process.exit = jest.fn();
        try {
            // Execute the main function by importing the index module
            await require('../index');
            // Verify console.error was called with the expected error message
            expect(consoleErrorMock).toHaveBeenCalledWith(expect.stringContaining('Failed to start MAAS MCP Server'));
            // Verify process.exit was called with exit code 1
            expect(process.exit).toHaveBeenCalledWith(1);
        }
        finally {
            // Restore original process.exit
            process.exit = originalProcessExit;
        }
    });
});
