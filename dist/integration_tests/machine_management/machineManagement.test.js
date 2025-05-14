"use strict";
/**
 * Machine Management Integration Tests
 *
 * These tests verify the end-to-end flow for machine management operations,
 * including listing, deploying, and commissioning machines.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const testServerSetup_js_1 = require("../setup/testServerSetup.js");
const mockMaasApiClient_js_1 = require("../mocks/mockMaasApiClient.js");
const machineResponses_js_1 = require("../../__tests__/fixtures/machineResponses.js");
describe('Machine Management Features', () => {
    let testEnv;
    beforeAll(async () => {
        // Create a mock MAAS API client with predefined responses
        const mockMaasClient = (0, mockMaasApiClient_js_1.createMockMaasApiClient)({
            simulateNetworkDelay: true,
            networkDelayMs: 50 // Small delay for realism
        });
        // Set up the test server with the mock MAAS API client
        testEnv = await (0, testServerSetup_js_1.setupTestServer)({
            port: 3008,
            mockMaasApiClient: mockMaasClient
        });
    });
    afterAll(async () => {
        // Clean up the test server
        await testEnv.cleanup();
    });
    describe('Machine Listing', () => {
        it('should list all machines', async () => {
            // Make a request to list all machines
            const response = await testEnv.request
                .post('/mcp')
                .send((0, testServerSetup_js_1.createToolCallRequest)('maas_list_machines', {}));
            // Verify the response
            expect(response.status).toBe(200);
            expect(response.body).toBeDefined();
            expect(response.body.content).toBeDefined();
            // Parse the response content
            const content = JSON.parse(response.body.content[0].text);
            // Verify the content
            expect(Array.isArray(content)).toBe(true);
            expect(content.length).toBeGreaterThan(0);
            expect(content[0].system_id).toBeDefined();
            expect(content[0].hostname).toBeDefined();
        });
        it('should filter machines by status', async () => {
            // Make a request to list machines with a specific status
            const response = await testEnv.request
                .post('/mcp')
                .send((0, testServerSetup_js_1.createToolCallRequest)('maas_list_machines', {
                status: 'Ready'
            }));
            // Verify the response
            expect(response.status).toBe(200);
            expect(response.body).toBeDefined();
            expect(response.body.content).toBeDefined();
            // Parse the response content
            const content = JSON.parse(response.body.content[0].text);
            // Verify the content
            expect(Array.isArray(content)).toBe(true);
            content.forEach((machine) => {
                expect(machine.status_name).toBe('Ready');
            });
        });
        it('should filter machines by hostname', async () => {
            // Make a request to list machines with a specific hostname pattern
            const response = await testEnv.request
                .post('/mcp')
                .send((0, testServerSetup_js_1.createToolCallRequest)('maas_list_machines', {
                hostname: 'test-machine'
            }));
            // Verify the response
            expect(response.status).toBe(200);
            expect(response.body).toBeDefined();
            expect(response.body.content).toBeDefined();
            // Parse the response content
            const content = JSON.parse(response.body.content[0].text);
            // Verify the content
            expect(Array.isArray(content)).toBe(true);
            content.forEach((machine) => {
                expect(machine.hostname).toContain('test-machine');
            });
        });
    });
    describe('Machine Deployment', () => {
        it('should deploy a machine', async () => {
            // Get a machine ID to deploy
            const machineId = machineResponses_js_1.machines[0].system_id;
            // Make a request to deploy the machine
            const response = await testEnv.request
                .post('/mcp')
                .send((0, testServerSetup_js_1.createToolCallRequest)('maas_deploy_machine', {
                system_id: machineId,
                osystem: 'ubuntu',
                distro_series: 'jammy'
            }));
            // Verify the response
            expect(response.status).toBe(200);
            expect(response.body).toBeDefined();
            expect(response.body.isError).toBeFalsy();
        });
        it('should deploy a machine with progress notifications', async () => {
            // Get a machine ID to deploy
            const machineId = machineResponses_js_1.machines[0].system_id;
            // Make a request to deploy the machine with progress notifications
            const response = await testEnv.request
                .post('/mcp')
                .send((0, testServerSetup_js_1.createToolCallRequest)('maas_deploy_machine_with_progress', {
                system_id: machineId,
                osystem: 'ubuntu',
                distro_series: 'jammy',
                _meta: { progressToken: 'test-token' }
            }));
            // Verify the response
            expect(response.status).toBe(200);
            expect(response.body).toBeDefined();
            expect(response.body.isError).toBeFalsy();
            expect(response.body.content).toBeDefined();
            // Verify that the response includes a resource URI
            const resourceContent = response.body.content.find((c) => c.type === 'resource');
            expect(resourceContent).toBeDefined();
            expect(resourceContent.resource.uri).toContain(machineId);
        });
    });
    describe('Machine Commissioning', () => {
        it('should commission a machine', async () => {
            // Get a machine ID to commission
            const machineId = machineResponses_js_1.machines[0].system_id;
            // Make a request to commission the machine
            const response = await testEnv.request
                .post('/mcp')
                .send((0, testServerSetup_js_1.createToolCallRequest)('maas_commission_machine_with_progress', {
                system_id: machineId,
                _meta: { progressToken: 'test-token' }
            }));
            // Verify the response
            expect(response.status).toBe(200);
            expect(response.body).toBeDefined();
            expect(response.body.isError).toBeFalsy();
        });
    });
    describe('Machine Details', () => {
        it('should get machine details', async () => {
            // Get a machine ID to get details for
            const machineId = machineResponses_js_1.machines[0].system_id;
            // Make a request to get the machine details
            const response = await testEnv.request
                .post('/mcp')
                .send({
                type: 'resource_access',
                uri: `maas://machine/${machineId}/details`
            });
            // Verify the response
            expect(response.status).toBe(200);
            expect(response.body).toBeDefined();
            expect(response.body.contents).toBeDefined();
            // Parse the response content
            const content = JSON.parse(response.body.contents[0].text);
            // Verify the content
            expect(content.system_id).toBe(machineId);
            expect(content.hostname).toBeDefined();
        });
    });
    describe('Tag Management', () => {
        it('should create a tag', async () => {
            // Make a request to create a tag
            const response = await testEnv.request
                .post('/mcp')
                .send((0, testServerSetup_js_1.createToolCallRequest)('maas_create_tag', {
                name: 'test-tag',
                comment: 'Test tag for integration tests'
            }));
            // Verify the response
            expect(response.status).toBe(200);
            expect(response.body).toBeDefined();
            expect(response.body.isError).toBeFalsy();
            // Parse the response content
            const content = JSON.parse(response.body.content[0].text);
            // Verify the content
            expect(content.name).toBe('test-tag');
            expect(content.comment).toBe('Test tag for integration tests');
        });
        it('should list tags', async () => {
            // Make a request to list tags
            const response = await testEnv.request
                .post('/mcp')
                .send({
                type: 'resource_access',
                uri: 'maas://tags/list'
            });
            // Verify the response
            expect(response.status).toBe(200);
            expect(response.body).toBeDefined();
            expect(response.body.contents).toBeDefined();
            // Parse the response content
            const content = JSON.parse(response.body.contents[0].text);
            // Verify the content
            expect(Array.isArray(content)).toBe(true);
            expect(content.length).toBeGreaterThan(0);
            expect(content[0].name).toBeDefined();
        });
    });
});
