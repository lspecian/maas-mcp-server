"use strict";
/**
 * Client-Server Communication Integration Tests
 *
 * These tests verify the proper communication between MCP client and server components,
 * testing API endpoint accessibility, request formatting, and response handling.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const testServerSetup_js_1 = require("../setup/testServerSetup.js");
const mockMaasApiClient_js_1 = require("../mocks/mockMaasApiClient.js");
const timeoutHelpers_js_1 = require("../../__tests__/utils/timeoutHelpers.js");
describe('Client-Server Communication', () => {
    // Apply an integration timeout to all tests in this suite
    (0, timeoutHelpers_js_1.applyIntegrationTimeout)();
    let testEnv;
    beforeAll(async () => {
        // Set up the test server with a mock MAAS API client
        testEnv = await (0, testServerSetup_js_1.setupTestServer)({
            port: 3001,
            mockMaasApiClient: mockMaasApiClient_js_1.mockClientConfigs.default()
        });
    });
    afterAll(async () => {
        // Clean up the test server
        await testEnv.cleanup();
    });
    describe('HTTP Transport', () => {
        (0, timeoutHelpers_js_1.integrationTest)('should respond to health check requests', async () => {
            // Make a request to the health check endpoint
            const response = await testEnv.request.get('/health');
            // Verify the response
            expect(response.status).toBe(200);
            expect(response.body).toEqual({ status: 'ok' });
        });
        (0, timeoutHelpers_js_1.integrationTest)('should handle MCP endpoint requests', async () => {
            // Make a request to the MCP endpoint
            const response = await testEnv.request
                .post('/mcp')
                .send((0, testServerSetup_js_1.createToolCallRequest)('maas_list_machines', {}));
            // Verify the response
            expect(response.status).toBe(200);
            expect(response.body).toBeDefined();
            expect(response.body.content).toBeDefined();
        });
        (0, timeoutHelpers_js_1.integrationTest)('should reject invalid requests with appropriate error', async () => {
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
        let mcpClient;
        beforeAll(async () => {
            // Create a mock MCP client
            mcpClient = {
                initialize: jest.fn().mockResolvedValue(undefined),
                executeTool: jest.fn().mockImplementation(async (tool, params) => {
                    const response = await testEnv.request
                        .post('/mcp')
                        .send((0, testServerSetup_js_1.createToolCallRequest)(tool, params));
                    return response.body;
                }),
                accessResource: jest.fn().mockImplementation(async (uri) => {
                    const response = await testEnv.request
                        .post('/mcp')
                        .send((0, testServerSetup_js_1.createResourceAccessRequest)(uri));
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
        (0, timeoutHelpers_js_1.integrationTest)('should execute tools through the MCP client', async () => {
            // Execute a tool through the MCP client
            const result = await mcpClient.executeTool('maas_list_machines', {});
            // Verify the result
            expect(result).toBeDefined();
            expect(result.content).toBeDefined();
            expect(result.isError).toBeFalsy();
        });
        (0, timeoutHelpers_js_1.integrationTest)('should access resources through the MCP client', async () => {
            // Access a resource through the MCP client
            const result = await mcpClient.accessResource('maas://machines/list');
            // Verify the result
            expect(result).toBeDefined();
            expect(result.contents).toBeDefined();
            expect(result.isError).toBeFalsy();
        });
        (0, timeoutHelpers_js_1.integrationTest)('should handle tool execution errors', async () => {
            // Execute a non-existent tool
            try {
                await mcpClient.executeTool('non_existent_tool', {});
                fail('Should have thrown an error');
            }
            catch (error) {
                // Verify the error
                expect(error).toBeDefined();
            }
        });
        (0, timeoutHelpers_js_1.integrationTest)('should handle resource access errors', async () => {
            // Access a non-existent resource
            try {
                await mcpClient.accessResource('maas://non/existent/resource');
                fail('Should have thrown an error');
            }
            catch (error) {
                // Verify the error
                expect(error).toBeDefined();
            }
        });
    });
    describe('Request Validation', () => {
        (0, timeoutHelpers_js_1.integrationTest)('should validate tool parameters', async () => {
            // Make a request with invalid parameters
            const response = await testEnv.request
                .post('/mcp')
                .send((0, testServerSetup_js_1.createToolCallRequest)('maas_create_tag', {
            // Missing required 'name' parameter
            }));
            // Verify the response
            expect(response.status).toBe(200); // MCP protocol returns 200 even for errors
            expect(response.body).toBeDefined();
            expect(response.body.isError).toBe(true);
            expect(response.body.content).toBeDefined();
            expect(response.body.content[0].text).toContain('name');
        });
        (0, timeoutHelpers_js_1.integrationTest)('should validate resource URIs', async () => {
            // Make a request with an invalid URI
            const response = await testEnv.request
                .post('/mcp')
                .send((0, testServerSetup_js_1.createResourceAccessRequest)('invalid://uri'));
            // Verify the response
            expect(response.status).toBe(200); // MCP protocol returns 200 even for errors
            expect(response.body).toBeDefined();
            expect(response.body.isError).toBe(true);
        });
    });
    describe('Content Types', () => {
        (0, timeoutHelpers_js_1.integrationTest)('should handle JSON content', async () => {
            // Make a request to the MCP endpoint
            const response = await testEnv.request
                .post('/mcp')
                .send((0, testServerSetup_js_1.createToolCallRequest)('maas_list_machines', {}));
            // Verify the response
            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toContain('application/json');
        });
        (0, timeoutHelpers_js_1.integrationTest)('should reject non-JSON requests', async () => {
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
