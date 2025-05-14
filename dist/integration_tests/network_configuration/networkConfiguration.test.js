"use strict";
/**
 * Network Configuration Integration Tests
 *
 * These tests verify the end-to-end flow for network configuration operations,
 * including subnets, interfaces, and DHCP management.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const testServerSetup_js_1 = require("../setup/testServerSetup.js");
const mockMaasApiClient_js_1 = require("../mocks/mockMaasApiClient.js");
describe('Network Configuration Features', () => {
    let testEnv;
    beforeAll(async () => {
        // Create a mock MAAS API client with predefined responses
        const mockMaasClient = (0, mockMaasApiClient_js_1.createMockMaasApiClient)({
            simulateNetworkDelay: true,
            networkDelayMs: 50 // Small delay for realism
        });
        // Set up the test server with the mock MAAS API client
        testEnv = await (0, testServerSetup_js_1.setupTestServer)({
            port: 3009,
            mockMaasApiClient: mockMaasClient
        });
    });
    afterAll(async () => {
        // Clean up the test server
        await testEnv.cleanup();
    });
    describe('Subnet Management', () => {
        it('should list all subnets', async () => {
            // Make a request to list all subnets
            const response = await testEnv.request
                .post('/mcp')
                .send((0, testServerSetup_js_1.createToolCallRequest)('maas_list_subnets', {}));
            // Verify the response
            expect(response.status).toBe(200);
            expect(response.body).toBeDefined();
            expect(response.body.content).toBeDefined();
            // Parse the response content
            const content = JSON.parse(response.body.content[0].text);
            // Verify the content
            expect(Array.isArray(content)).toBe(true);
            expect(content.length).toBeGreaterThan(0);
            expect(content[0].id).toBeDefined();
            expect(content[0].name).toBeDefined();
            expect(content[0].cidr).toBeDefined();
        });
        it('should get subnet details', async () => {
            // Make a request to get subnet details
            const response = await testEnv.request
                .post('/mcp')
                .send({
                type: 'resource_access',
                uri: 'maas://subnet/1/details'
            });
            // Verify the response
            expect(response.status).toBe(200);
            expect(response.body).toBeDefined();
            expect(response.body.contents).toBeDefined();
            // Parse the response content
            const content = JSON.parse(response.body.contents[0].text);
            // Verify the content
            expect(content.id).toBeDefined();
            expect(content.name).toBeDefined();
            expect(content.cidr).toBeDefined();
            expect(content.vlan).toBeDefined();
        });
        it('should create a subnet', async () => {
            // Make a request to create a subnet
            const response = await testEnv.request
                .post('/mcp')
                .send((0, testServerSetup_js_1.createToolCallRequest)('maas_create_subnet', {
                cidr: '192.168.100.0/24',
                name: 'test-subnet',
                vlan: 1,
                gateway_ip: '192.168.100.1',
                dns_servers: '8.8.8.8,8.8.4.4'
            }));
            // Verify the response
            expect(response.status).toBe(200);
            expect(response.body).toBeDefined();
            expect(response.body.isError).toBeFalsy();
            // Parse the response content
            const content = JSON.parse(response.body.content[0].text);
            // Verify the content
            expect(content.name).toBe('test-subnet');
            expect(content.cidr).toBe('192.168.100.0/24');
        });
    });
    describe('VLAN Management', () => {
        it('should list all VLANs', async () => {
            // Make a request to list all VLANs
            const response = await testEnv.request
                .post('/mcp')
                .send({
                type: 'resource_access',
                uri: 'maas://vlans/list'
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
            expect(content[0].id).toBeDefined();
            expect(content[0].name).toBeDefined();
        });
    });
    describe('DHCP Management', () => {
        it('should enable DHCP on a VLAN', async () => {
            // Make a request to enable DHCP on a VLAN
            const response = await testEnv.request
                .post('/mcp')
                .send((0, testServerSetup_js_1.createToolCallRequest)('maas_enable_dhcp', {
                vlan_id: 1,
                rack_controller: 'default'
            }));
            // Verify the response
            expect(response.status).toBe(200);
            expect(response.body).toBeDefined();
            expect(response.body.isError).toBeFalsy();
        });
    });
    describe('Interface Management', () => {
        it('should list machine interfaces', async () => {
            // Make a request to list machine interfaces
            const response = await testEnv.request
                .post('/mcp')
                .send({
                type: 'resource_access',
                uri: 'maas://machine/abc123/interfaces'
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
            expect(content[0].id).toBeDefined();
            expect(content[0].name).toBeDefined();
            expect(content[0].type).toBeDefined();
        });
        it('should configure a machine interface', async () => {
            // Make a request to configure a machine interface
            const response = await testEnv.request
                .post('/mcp')
                .send((0, testServerSetup_js_1.createToolCallRequest)('maas_configure_interface', {
                system_id: 'abc123',
                interface_id: 1,
                mode: 'static',
                ip_address: '192.168.1.100',
                subnet: 1
            }));
            // Verify the response
            expect(response.status).toBe(200);
            expect(response.body).toBeDefined();
            expect(response.body.isError).toBeFalsy();
        });
    });
    describe('Space Management', () => {
        it('should list all spaces', async () => {
            // Make a request to list all spaces
            const response = await testEnv.request
                .post('/mcp')
                .send({
                type: 'resource_access',
                uri: 'maas://spaces/list'
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
            expect(content[0].id).toBeDefined();
            expect(content[0].name).toBeDefined();
        });
        it('should create a space', async () => {
            // Make a request to create a space
            const response = await testEnv.request
                .post('/mcp')
                .send((0, testServerSetup_js_1.createToolCallRequest)('maas_create_space', {
                name: 'test-space',
                description: 'Test space for integration tests'
            }));
            // Verify the response
            expect(response.status).toBe(200);
            expect(response.body).toBeDefined();
            expect(response.body.isError).toBeFalsy();
            // Parse the response content
            const content = JSON.parse(response.body.content[0].text);
            // Verify the content
            expect(content.name).toBe('test-space');
            expect(content.description).toBe('Test space for integration tests');
        });
    });
    describe('Fabric Management', () => {
        it('should list all fabrics', async () => {
            // Make a request to list all fabrics
            const response = await testEnv.request
                .post('/mcp')
                .send({
                type: 'resource_access',
                uri: 'maas://fabrics/list'
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
            expect(content[0].id).toBeDefined();
            expect(content[0].name).toBeDefined();
        });
    });
});
