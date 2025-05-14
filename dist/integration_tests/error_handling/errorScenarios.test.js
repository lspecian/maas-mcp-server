"use strict";
/**
 * Error Scenario Integration Tests
 *
 * These tests verify that the server properly handles various error conditions,
 * including network failures, MAAS API errors, and client errors.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const testServerSetup_js_1 = require("../setup/testServerSetup.js");
const mockMaasApiClient_js_1 = require("../mocks/mockMaasApiClient.js");
const maas_ts_1 = require("../../types/maas.ts");
describe('Error Scenario Handling', () => {
    let testEnv;
    afterEach(async () => {
        // Clean up the test server after each test
        if (testEnv) {
            await testEnv.cleanup();
        }
    });
    describe('MAAS API Errors', () => {
        beforeEach(async () => {
            // Create a mock MAAS API client that always returns errors
            const mockMaasClient = (0, mockMaasApiClient_js_1.createMockMaasApiClient)({
                simulateRandomErrors: true,
                errorProbability: 1.0 // Always return errors
            });
            // Set up the test server with the error-prone MAAS API client
            testEnv = await (0, testServerSetup_js_1.setupTestServer)({
                port: 3002,
                mockMaasApiClient: mockMaasClient
            });
        });
        it('should handle MAAS API errors during tool execution', async () => {
            // Make a request to execute a tool
            const response = await testEnv.request
                .post('/mcp')
                .send((0, testServerSetup_js_1.createToolCallRequest)('maas_list_machines', {}));
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
                .send((0, testServerSetup_js_1.createResourceAccessRequest)('maas://machines/list'));
            // Verify the response
            expect(response.status).toBe(200); // MCP protocol returns 200 even for errors
            expect(response.body).toBeDefined();
            expect(response.body.isError).toBe(true);
        });
    });
    describe('Network Failures', () => {
        beforeEach(async () => {
            // Create a mock MAAS API client that simulates network timeouts
            const mockMaasClient = (0, mockMaasApiClient_js_1.createMockMaasApiClient)({
                customHandlers: {
                    '/machines/': async () => {
                        // Simulate a long delay followed by a timeout
                        await new Promise(resolve => setTimeout(resolve, 100));
                        throw new Error('Network timeout');
                    }
                }
            });
            // Set up the test server with the timeout-prone MAAS API client
            testEnv = await (0, testServerSetup_js_1.setupTestServer)({
                port: 3003,
                mockMaasApiClient: mockMaasClient
            });
        });
        it('should handle network timeouts', async () => {
            // Make a request to execute a tool that will time out
            const response = await testEnv.request
                .post('/mcp')
                .send((0, testServerSetup_js_1.createToolCallRequest)('maas_list_machines', {}));
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
            const mockMaasClient = (0, mockMaasApiClient_js_1.createMockMaasApiClient)({
                customHandlers: {
                    '/machines/nonexistent': async () => {
                        throw new maas_ts_1.MaasApiError('Machine not found', 404);
                    }
                }
            });
            // Set up the test server with the MAAS API client
            testEnv = await (0, testServerSetup_js_1.setupTestServer)({
                port: 3004,
                mockMaasApiClient: mockMaasClient
            });
        });
        it('should handle 404 errors from MAAS API', async () => {
            // Make a request to access a non-existent machine
            const response = await testEnv.request
                .post('/mcp')
                .send((0, testServerSetup_js_1.createResourceAccessRequest)('maas://machines/nonexistent/details'));
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
            testEnv = await (0, testServerSetup_js_1.setupTestServer)({
                port: 3005
            });
        });
        it('should handle invalid tool parameters', async () => {
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
            expect(response.body.content[0].text).toContain('validation');
        });
        it('should handle invalid resource URIs', async () => {
            // Make a request with an invalid URI
            const response = await testEnv.request
                .post('/mcp')
                .send((0, testServerSetup_js_1.createResourceAccessRequest)('invalid://uri'));
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
            const mockMaasClient = (0, mockMaasApiClient_js_1.createMockMaasApiClient)({
                simulateNetworkDelay: true,
                networkDelayMs: 500 // Long enough to abort
            });
            // Set up the test server with the MAAS API client
            testEnv = await (0, testServerSetup_js_1.setupTestServer)({
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
                body: JSON.stringify((0, testServerSetup_js_1.createToolCallRequest)('maas_list_machines', {})),
                signal
            });
            // Abort the request after a short delay
            setTimeout(() => controller.abort(), 10);
            // Verify that the request was aborted
            try {
                await requestPromise;
                fail('Request should have been aborted');
            }
            catch (error) {
                expect(error.name).toBe('AbortError');
            }
        });
    });
    describe('Server Errors', () => {
        beforeEach(async () => {
            // Create a mock MAAS API client that simulates server errors
            const mockMaasClient = (0, mockMaasApiClient_js_1.createMockMaasApiClient)({
                customHandlers: {
                    '/machines/': async () => {
                        throw new maas_ts_1.MaasApiError('Internal server error', 500);
                    }
                }
            });
            // Set up the test server with the error-prone MAAS API client
            testEnv = await (0, testServerSetup_js_1.setupTestServer)({
                port: 3007,
                mockMaasApiClient: mockMaasClient
            });
        });
        it('should handle server errors from MAAS API', async () => {
            // Make a request to execute a tool
            const response = await testEnv.request
                .post('/mcp')
                .send((0, testServerSetup_js_1.createToolCallRequest)('maas_list_machines', {}));
            // Verify the response
            expect(response.status).toBe(200); // MCP protocol returns 200 even for errors
            expect(response.body).toBeDefined();
            expect(response.body.isError).toBe(true);
            expect(response.body.content).toBeDefined();
            expect(response.body.content[0].text).toContain('server error');
        });
    });
});
