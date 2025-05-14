"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const McpServer_1 = require("../../../mcp_server/McpServer");
const mockMaasApiClient_1 = require("../../mocks/mockMaasApiClient");
const uriPatterns_1 = require("../../../mcp_resources/schemas/uriPatterns");
const cacheManager_1 = require("../../../mcp_resources/cache/cacheManager");
const lruCacheStrategy_1 = require("../../../mcp_resources/cache/lruCacheStrategy");
// Helper function to construct detail URIs, as uriPatterns.ts exports patterns not functions
const machineDetailUriFn = (systemId) => `maas://machines/${String(systemId)}`;
const tagDetailUriFn = (tagName) => `maas://tags/${String(tagName)}`;
const subnetDetailUriFn = (subnetId) => `maas://subnets/${String(subnetId)}`;
const zoneDetailUriFn = (zoneName) => `maas://zones/${String(zoneName)}`;
const deviceDetailUriFn = (deviceId) => `maas://devices/${String(deviceId)}`;
const domainDetailUriFn = (domainId) => `maas://domains/${String(domainId)}`;
describe('MCP Resource Integration Tests', () => {
    let app;
    let mcpServer;
    let mockMaasClient;
    let cacheManager;
    const serverName = 'maas-mcp-server-integration-test';
    const mockLogger = {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        child: jest.fn().mockReturnThis(), // Add child method mock
    };
    const mockAuditLogger = {
        log: jest.fn(),
    };
    beforeAll(async () => {
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        mockMaasClient = new mockMaasApiClient_1.MockMaasApiClient({
            oauthHost: 'mock-oauth-host',
            apiKey: 'mock-api-key',
            maasUrl: 'http://mock-maas-url',
            logger: mockLogger,
        });
        cacheManager = new cacheManager_1.CacheManager(new lruCacheStrategy_1.LruCacheStrategy({ maxSize: 100 }), {
            enabled: true,
            defaultTTL: 300, // 5 minutes
        });
        const serverOptions = {
            name: serverName,
            maasApiClient: mockMaasClient,
            cacheManager: cacheManager,
            logger: mockLogger,
            auditLogger: mockAuditLogger,
            transports: [],
        };
        mcpServer = new McpServer_1.McpServer(serverOptions);
        app.use(`/mcp/${serverName}`, mcpServer.router);
    });
    afterEach(() => {
        jest.clearAllMocks();
        cacheManager.clear();
    });
    const testResourceCollection = (resourceName, collectionUri, mockClientMethod, sampleData, 
    // Changed to support multiple/complex filter examples
    exampleFilterParams, 
    // Added to help test sorting more thoroughly
    sortableFields) => {
        describe(`GET Collection (${resourceName}) - Edge Cases and Core Functionality`, () => {
            it(`should return a list of ${resourceName.toLowerCase()}`, async () => {
                mockMaasClient[mockClientMethod].mockResolvedValue(sampleData.slice(0, 2));
                const response = await (0, supertest_1.default)(app)
                    .get(`/mcp/${serverName}/resources/${encodeURIComponent(collectionUri)}`)
                    .expect(200);
                expect(response.body).toEqual(sampleData.slice(0, 2));
                expect(mockMaasClient[mockClientMethod]).toHaveBeenCalledTimes(1);
                expect(mockMaasClient[mockClientMethod]).toHaveBeenCalledWith({});
            });
            it('should handle pagination parameters (limit, offset)', async () => {
                mockMaasClient[mockClientMethod].mockResolvedValue([sampleData[0]]);
                const limit = 1;
                const offset = 5;
                const paginatedUri = `${collectionUri}?limit=${limit}&offset=${offset}`;
                await (0, supertest_1.default)(app)
                    .get(`/mcp/${serverName}/resources/${encodeURIComponent(paginatedUri)}`)
                    .expect(200);
                expect(mockMaasClient[mockClientMethod]).toHaveBeenCalledWith({ limit, offset });
            });
            it('should handle sorting parameters (sort_by, order)', async () => {
                mockMaasClient[mockClientMethod].mockResolvedValue(sampleData);
                const sortByField = sortableFields && sortableFields.length > 0 ? sortableFields[0] : 'name'; // Use provided or default
                const order = 'desc';
                const sortedUri = `${collectionUri}?sort_by=${sortByField}&order=${order}`;
                await (0, supertest_1.default)(app)
                    .get(`/mcp/${serverName}/resources/${encodeURIComponent(sortedUri)}`)
                    .expect(200);
                expect(mockMaasClient[mockClientMethod]).toHaveBeenCalledWith({ sort_by: sortByField, order });
            });
            // Test for empty collections
            it('should handle empty collections returned by MAAS', async () => {
                mockMaasClient[mockClientMethod].mockResolvedValue([]);
                const response = await (0, supertest_1.default)(app)
                    .get(`/mcp/${serverName}/resources/${encodeURIComponent(collectionUri)}`)
                    .expect(200);
                expect(response.body).toEqual([]);
                expect(mockMaasClient[mockClientMethod]).toHaveBeenCalledWith({});
            });
            // Enhanced Pagination Tests
            it('should handle pagination with limit=1', async () => {
                mockMaasClient[mockClientMethod].mockResolvedValue(sampleData.length > 0 ? [sampleData[0]] : []);
                const paginatedUri = `${collectionUri}?limit=1`;
                const response = await (0, supertest_1.default)(app)
                    .get(`/mcp/${serverName}/resources/${encodeURIComponent(paginatedUri)}`)
                    .expect(200);
                if (sampleData.length > 0) {
                    expect(response.body).toEqual([sampleData[0]]);
                }
                else {
                    expect(response.body).toEqual([]);
                }
                expect(mockMaasClient[mockClientMethod]).toHaveBeenCalledWith({ limit: 1 });
            });
            it('should handle pagination with offset greater than total items', async () => {
                mockMaasClient[mockClientMethod].mockResolvedValue([]); // MAAS would return empty
                const offset = sampleData.length + 10;
                const paginatedUri = `${collectionUri}?offset=${offset}`;
                const response = await (0, supertest_1.default)(app)
                    .get(`/mcp/${serverName}/resources/${encodeURIComponent(paginatedUri)}`)
                    .expect(200);
                expect(response.body).toEqual([]);
                expect(mockMaasClient[mockClientMethod]).toHaveBeenCalledWith({ offset });
            });
            it('should handle pagination with a large limit value', async () => {
                mockMaasClient[mockClientMethod].mockResolvedValue(sampleData);
                const largeLimit = 500;
                const paginatedUri = `${collectionUri}?limit=${largeLimit}`;
                await (0, supertest_1.default)(app)
                    .get(`/mcp/${serverName}/resources/${encodeURIComponent(paginatedUri)}`)
                    .expect(200);
                expect(mockMaasClient[mockClientMethod]).toHaveBeenCalledWith({ limit: largeLimit });
            });
            // Test for complex filtering
            if (exampleFilterParams && Object.keys(exampleFilterParams).length > 0) {
                it('should handle complex filtering parameters', async () => {
                    mockMaasClient[mockClientMethod].mockResolvedValue([sampleData[0]]); // Assume first item matches
                    const queryParams = new URLSearchParams();
                    for (const key in exampleFilterParams) {
                        queryParams.append(key, String(exampleFilterParams[key]));
                    }
                    const filteredUri = `${collectionUri}?${queryParams.toString()}`;
                    await (0, supertest_1.default)(app)
                        .get(`/mcp/${serverName}/resources/${encodeURIComponent(filteredUri)}`)
                        .expect(200);
                    // Construct expected params for the mock call
                    const expectedMockParams = {};
                    for (const key in exampleFilterParams) {
                        // query params are strings, convert boolean to string for mock check if necessary
                        // However, the schema validation should handle type conversion for the actual handler
                        expectedMockParams[key] = exampleFilterParams[key];
                    }
                    expect(mockMaasClient[mockClientMethod]).toHaveBeenCalledWith(expect.objectContaining(expectedMockParams));
                });
            }
            // Sorting Edge Cases (basic test, more can be added if specific MAAS behaviors are known)
            if (sortableFields && sortableFields.length > 1) {
                it('should handle sorting by a secondary sortable field', async () => {
                    mockMaasClient[mockClientMethod].mockResolvedValue(sampleData);
                    const sortByField = sortableFields[1]; // Use the second sortable field
                    const order = 'asc';
                    const sortedUri = `${collectionUri}?sort_by=${sortByField}&order=${order}`;
                    await (0, supertest_1.default)(app)
                        .get(`/mcp/${serverName}/resources/${encodeURIComponent(sortedUri)}`)
                        .expect(200);
                    expect(mockMaasClient[mockClientMethod]).toHaveBeenCalledWith({ sort_by: sortByField, order });
                });
            }
            // Invalid Query Parameter Tests
            describe('Invalid Query Parameters', () => {
                const invalidCases = [
                    { param: 'limit=abc', expectedMsg: /'limit' must be a number/i, field: 'limit' },
                    { param: 'offset=xyz', expectedMsg: /'offset' must be a number/i, field: 'offset' },
                    { param: 'order=sideways', expectedMsg: /'order' must be one of \[asc, desc]/i, field: 'order' },
                    { param: 'unsupported_filter=test', expectedMsg: /Unsupported filter parameter/i, field: 'unsupported_filter' },
                    // Add more specific invalid filter values based on actual resource schemas if needed
                    // e.g. for a boolean filter: { param: 'some_bool_filter=notabool', expectedMsg: /must be a boolean/i, field: 'some_bool_filter'}
                ];
                invalidCases.forEach(({ param, expectedMsg, field }) => {
                    it(`should return 400 for invalid parameter: ${param}`, async () => {
                        // Reset mock for this specific scope to ensure it's not called
                        mockMaasClient[mockClientMethod].mockClear();
                        mockMaasClient[mockClientMethod].mockResolvedValue(sampleData); // Default mock if it were to be called
                        const invalidUri = `${collectionUri}?${param}`;
                        const response = await (0, supertest_1.default)(app)
                            .get(`/mcp/${serverName}/resources/${encodeURIComponent(invalidUri)}`)
                            .expect(400);
                        expect(response.body).toHaveProperty('error');
                        const error = response.body.error;
                        expect(error.code).toBe('INVALID_PARAMETERS');
                        expect(error.message).toMatch(expectedMsg);
                        if (error.details && error.details.length > 0) {
                            expect(error.details[0].field).toBe(field);
                        }
                        // Ensure MAAS client was NOT called due to validation failure
                        expect(mockMaasClient[mockClientMethod]).not.toHaveBeenCalled();
                    });
                });
            });
            it('should use cache for identical subsequent requests', async () => {
                mockMaasClient[mockClientMethod].mockResolvedValue(sampleData.slice(0, 1));
                await (0, supertest_1.default)(app).get(`/mcp/${serverName}/resources/${encodeURIComponent(collectionUri)}`).expect(200);
                expect(mockMaasClient[mockClientMethod]).toHaveBeenCalledTimes(1);
                const cachedResponse = await (0, supertest_1.default)(app).get(`/mcp/${serverName}/resources/${encodeURIComponent(collectionUri)}`).expect(200);
                expect(cachedResponse.body).toEqual(sampleData.slice(0, 1));
                expect(mockMaasClient[mockClientMethod]).toHaveBeenCalledTimes(1); // Should not call client again
            });
            it('should not use cache for different requests', async () => {
                mockMaasClient[mockClientMethod]
                    .mockResolvedValueOnce(sampleData.slice(0, 1))
                    .mockResolvedValueOnce(sampleData.slice(1, 2));
                await (0, supertest_1.default)(app).get(`/mcp/${serverName}/resources/${encodeURIComponent(collectionUri)}`).expect(200);
                expect(mockMaasClient[mockClientMethod]).toHaveBeenCalledTimes(1);
                const differentUri = `${collectionUri}?param=value`; // Generic different param
                await (0, supertest_1.default)(app).get(`/mcp/${serverName}/resources/${encodeURIComponent(differentUri)}`).expect(200);
                expect(mockMaasClient[mockClientMethod]).toHaveBeenCalledTimes(2);
            });
            // Error handling tests
            const errorScenarios = [
                { statusCode: 400, mcpErrorCode: 'INVALID_PARAMETERS', maasMessage: 'Bad Request from MAAS' },
                { statusCode: 401, mcpErrorCode: 'AUTHENTICATION_ERROR', maasMessage: 'Unauthorized by MAAS' },
                { statusCode: 403, mcpErrorCode: 'PERMISSION_DENIED', maasMessage: 'Forbidden by MAAS' },
                { statusCode: 404, mcpErrorCode: 'RESOURCE_NOT_FOUND', maasMessage: 'Not Found from MAAS' },
                { statusCode: 500, mcpErrorCode: 'REMOTE_SERVER_ERROR', maasMessage: 'Internal Server Error from MAAS' },
            ];
            errorScenarios.forEach(scenario => {
                it(`should handle MAAS API ${scenario.statusCode} error`, async () => {
                    mockMaasClient[mockClientMethod].mockRejectedValue({ isMaasApiError: true, response: { status: scenario.statusCode, data: scenario.maasMessage } });
                    const response = await (0, supertest_1.default)(app)
                        .get(`/mcp/${serverName}/resources/${encodeURIComponent(collectionUri)}`)
                        .expect(scenario.statusCode); // MCP error response status should mirror MAAS for these
                    expect(response.body).toHaveProperty('error');
                    const error = response.body.error;
                    expect(error.code).toBe(scenario.mcpErrorCode);
                    expect(error.message).toContain(scenario.maasMessage);
                });
            });
        });
    };
    const testResourceDetail = (resourceName, detailUriFn, mockClientMethod, sampleId, sampleData) => {
        describe(`GET Detail (${resourceName})`, () => {
            const detailUri = detailUriFn(sampleId);
            it(`should return ${resourceName.toLowerCase()} details for a valid ID`, async () => {
                mockMaasClient[mockClientMethod].mockResolvedValue(sampleData);
                const response = await (0, supertest_1.default)(app)
                    .get(`/mcp/${serverName}/resources/${encodeURIComponent(detailUri)}`)
                    .expect(200);
                expect(response.body).toEqual(sampleData);
                expect(mockMaasClient[mockClientMethod]).toHaveBeenCalledTimes(1);
                expect(mockMaasClient[mockClientMethod]).toHaveBeenCalledWith(sampleId);
            });
            it('should use cache for identical subsequent detail requests', async () => {
                mockMaasClient[mockClientMethod].mockResolvedValue(sampleData);
                await (0, supertest_1.default)(app).get(`/mcp/${serverName}/resources/${encodeURIComponent(detailUri)}`).expect(200);
                expect(mockMaasClient[mockClientMethod]).toHaveBeenCalledTimes(1);
                const cachedResponse = await (0, supertest_1.default)(app).get(`/mcp/${serverName}/resources/${encodeURIComponent(detailUri)}`).expect(200);
                expect(cachedResponse.body).toEqual(sampleData);
                expect(mockMaasClient[mockClientMethod]).toHaveBeenCalledTimes(1);
            });
            // Error handling tests
            const errorScenarios = [
                // 400 might not apply to GET by ID if ID format is validated by pattern first
                { statusCode: 401, mcpErrorCode: 'AUTHENTICATION_ERROR', maasMessage: 'Unauthorized by MAAS' },
                { statusCode: 403, mcpErrorCode: 'PERMISSION_DENIED', maasMessage: 'Forbidden by MAAS' },
                { statusCode: 404, mcpErrorCode: 'RESOURCE_NOT_FOUND', maasMessage: 'Not Found from MAAS' },
                { statusCode: 500, mcpErrorCode: 'REMOTE_SERVER_ERROR', maasMessage: 'Internal Server Error from MAAS' },
            ];
            errorScenarios.forEach(scenario => {
                it(`should handle MAAS API ${scenario.statusCode} error for detail`, async () => {
                    mockMaasClient[mockClientMethod].mockRejectedValue({ isMaasApiError: true, response: { status: scenario.statusCode, data: scenario.maasMessage } });
                    const response = await (0, supertest_1.default)(app)
                        .get(`/mcp/${serverName}/resources/${encodeURIComponent(detailUri)}`)
                        .expect(scenario.statusCode);
                    expect(response.body).toHaveProperty('error');
                    const error = response.body.error;
                    expect(error.code).toBe(scenario.mcpErrorCode);
                    expect(error.message).toContain(scenario.maasMessage);
                });
            });
        });
    };
    // --- Machines ---
    describe('Machines Resource', () => {
        testResourceCollection('Machines', uriPatterns_1.machineCollectionUri, 'getMachines', [{ system_id: 'm1', hostname: 'host1', status: 6 }, { system_id: 'm2', hostname: 'host2', status: 4 }, { system_id: 'm3', hostname: 'host3', status: 6 }], { hostname: 'host1', status: 6 }, // Example complex filter params
        ['hostname', 'status', 'created'] // Example sortable fields
        );
        testResourceDetail('Machine', machineDetailUriFn, 'getMachineDetails', 'm1', { system_id: 'm1', hostname: 'host1', osystem: 'ubuntu' });
    });
    // --- Tags ---
    describe('Tags Resource', () => {
        testResourceCollection('Tags', uriPatterns_1.tagCollectionUri, 'getTags', [{ name: 'tag1', definition: 'def1', kernel_opt: 'quiet' }, { name: 'tag2', definition: 'def2', kernel_opt: '' }, { name: 'tag3', definition: 'def3', kernel_opt: 'splash' }], { name: 'tag1', 'kernel_opt': 'quiet' }, // Tags can be filtered by name, definition, kernel_opt
        ['name', 'definition', 'kernel_opt']);
        testResourceDetail('Tag', tagDetailUriFn, 'getTag', // MockMaasApiClient.getTag(name)
        'tag1', { name: 'tag1', definition: 'def1', machines: [] });
    });
    // --- Subnets ---
    describe('Subnets Resource', () => {
        testResourceCollection('Subnets', uriPatterns_1.subnetCollectionUri, 'getSubnets', [{ id: 1, name: 'subnet1', cidr: '192.168.1.0/24', fabric: 'fabric-0' }, { id: 2, name: 'subnet2', cidr: '10.0.0.0/8', fabric: 'fabric-1' }], { name: 'subnet1', fabric: 'fabric-0' }, ['name', 'cidr', 'fabric', 'vlan']);
        testResourceDetail('Subnet', subnetDetailUriFn, 'getSubnet', // MockMaasApiClient.getSubnet(id)
        1, { id: 1, name: 'subnet1', cidr: '192.168.1.0/24', vlan: { vid: 10 } });
    });
    // --- Zones ---
    describe('Zones Resource', () => {
        testResourceCollection('Zones', uriPatterns_1.zoneCollectionUri, 'getZones', [{ name: 'zone1', description: 'desc1' }, { name: 'zone2', description: 'desc2', id: 20 }], { name: 'zone1' }, // Zones can be filtered by name
        ['name', 'description']);
        testResourceDetail('Zone', zoneDetailUriFn, 'getZone', // MockMaasApiClient.getZone(name)
        'zone1', { name: 'zone1', description: 'desc1', resource_pools: [] });
    });
    // --- Devices (Standalone) ---
    describe('Devices Resource (Standalone)', () => {
        testResourceCollection('Devices', uriPatterns_1.deviceCollectionUri, 'getDevices', // MockMaasApiClient.getDevices() - for standalone
        [{ id: 'dev1', name: 'eth0', mac_address: 'AA:BB:CC:DD:EE:FF', type: 'physical' }, { id: 'dev2', name: 'wlan0', mac_address: '11:22:33:44:55:66', type: 'physical' }], { name: 'eth0', type: 'physical' }, // Devices can be filtered by name, id, mac_address, hostname, type
        ['name', 'id', 'mac_address', 'hostname', 'type']);
        testResourceDetail('Device', deviceDetailUriFn, 'getDevice', // MockMaasApiClient.getDevice(id) - for standalone
        'dev1', { id: 'dev1', name: 'eth0', mac_address: 'AA:BB:CC:DD:EE:FF', type: 'physical' });
    });
    // --- Domains ---
    describe('Domains Resource', () => {
        testResourceCollection('Domains', uriPatterns_1.domainCollectionUri, 'getDomains', [{ id: 1, name: 'example.com', authoritative: true }, { id: 2, name: 'internal.local', authoritative: false, ttl: 600 }], { name: 'example.com', authoritative: true }, // Domains can be filtered by name, authoritative
        ['name', 'authoritative', 'ttl']);
        testResourceDetail('Domain', domainDetailUriFn, 'getDomain', // MockMaasApiClient.getDomain(id)
        1, { id: 1, name: 'example.com', authoritative: true, ttl: 3600 });
    });
    // --- BaseResourceHandler Cache Integration Tests ---
    describe('BaseResourceHandler Cache Integration', () => {
        const machineDetailUri = machineDetailUriFn('cache-test-m1');
        const sampleMachineData = { system_id: 'cache-test-m1', hostname: 'cache-host1', osystem: 'ubuntu' };
        let getSpy;
        let setSpy;
        let originalCacheOptions;
        let machineResourceHandler;
        beforeEach(() => {
            // Setup spies on CacheManager methods
            getSpy = jest.spyOn(cacheManager, 'get');
            setSpy = jest.spyOn(cacheManager, 'set');
            // Mock MAAS client response
            mockMaasClient.getMachineDetails.mockResolvedValue(sampleMachineData);
            // Get reference to the MachineResourceHandler instance
            // This is a bit hacky but necessary to modify cache options for specific tests
            const machineDetailPattern = 'maas://machines/{system_id}';
            const resourceRegistration = mcpServer['resources']?.get(machineDetailPattern);
            if (resourceRegistration?.handlerInstance) {
                machineResourceHandler = resourceRegistration.handlerInstance;
                // Store original cache options to restore after tests
                if (machineResourceHandler.cacheOptions) {
                    originalCacheOptions = { ...machineResourceHandler.cacheOptions };
                }
            }
        });
        afterEach(() => {
            // Restore original cache options if they were modified
            if (machineResourceHandler && originalCacheOptions) {
                machineResourceHandler.setCacheOptions(originalCacheOptions);
            }
            // Restore spies
            getSpy.mockRestore();
            setSpy.mockRestore();
        });
        describe('Cache Control Headers', () => {
            it('should set "Cache-Control: max-age=<ttl>" on initial fetch', async () => {
                const response = await (0, supertest_1.default)(app)
                    .get(`/mcp/${serverName}/resources/${encodeURIComponent(machineDetailUri)}`)
                    .expect(200);
                expect(response.headers['cache-control']).toBeDefined();
                expect(response.headers['cache-control']).toContain(`max-age=${cacheManager.getResourceTTL('Machine')}`);
            });
            it('should set "Cache-Control: max-age=<ttl>" and "Age" header on cache hit', async () => {
                // First request to populate cache
                await (0, supertest_1.default)(app)
                    .get(`/mcp/${serverName}/resources/${encodeURIComponent(machineDetailUri)}`)
                    .expect(200);
                // Second request (should be a cache hit)
                const response = await (0, supertest_1.default)(app)
                    .get(`/mcp/${serverName}/resources/${encodeURIComponent(machineDetailUri)}`)
                    .expect(200);
                expect(response.headers['cache-control']).toBeDefined();
                expect(response.headers['cache-control']).toContain(`max-age=${cacheManager.getResourceTTL('Machine')}`);
                expect(response.headers['age']).toBeDefined();
            });
            it('should include "private" in Cache-Control when configured', async () => {
                // Skip test if we couldn't get the handler instance
                if (!machineResourceHandler || !machineResourceHandler.setCacheOptions) {
                    console.warn('Could not access MachineResourceHandler instance. Skipping test.');
                    return;
                }
                // Set private cache control
                machineResourceHandler.setCacheOptions({
                    enabled: true,
                    ttl: 120,
                    cacheControl: { private: true }
                });
                const response = await (0, supertest_1.default)(app)
                    .get(`/mcp/${serverName}/resources/${encodeURIComponent(machineDetailUri)}`)
                    .expect(200);
                expect(response.headers['cache-control']).toContain('private');
                expect(response.headers['cache-control']).toContain('max-age=120');
            });
            it('should include "must-revalidate" in Cache-Control when configured', async () => {
                // Skip test if we couldn't get the handler instance
                if (!machineResourceHandler || !machineResourceHandler.setCacheOptions) {
                    console.warn('Could not access MachineResourceHandler instance. Skipping test.');
                    return;
                }
                // Set must-revalidate cache control
                machineResourceHandler.setCacheOptions({
                    enabled: true,
                    ttl: 120,
                    cacheControl: { mustRevalidate: true }
                });
                const response = await (0, supertest_1.default)(app)
                    .get(`/mcp/${serverName}/resources/${encodeURIComponent(machineDetailUri)}`)
                    .expect(200);
                expect(response.headers['cache-control']).toContain('must-revalidate');
                expect(response.headers['cache-control']).toContain('max-age=120');
            });
            it('should include "immutable" in Cache-Control when configured', async () => {
                // Skip test if we couldn't get the handler instance
                if (!machineResourceHandler || !machineResourceHandler.setCacheOptions) {
                    console.warn('Could not access MachineResourceHandler instance. Skipping test.');
                    return;
                }
                // Set immutable cache control
                machineResourceHandler.setCacheOptions({
                    enabled: true,
                    ttl: 120,
                    cacheControl: { immutable: true }
                });
                const response = await (0, supertest_1.default)(app)
                    .get(`/mcp/${serverName}/resources/${encodeURIComponent(machineDetailUri)}`)
                    .expect(200);
                expect(response.headers['cache-control']).toContain('immutable');
                expect(response.headers['cache-control']).toContain('max-age=120');
            });
            it('should NOT include caching headers if cacheOptions.enabled is false', async () => {
                // Skip test if we couldn't get the handler instance
                if (!machineResourceHandler || !machineResourceHandler.setCacheOptions) {
                    console.warn('Could not access MachineResourceHandler instance. Skipping test.');
                    return;
                }
                // Disable caching for this handler
                machineResourceHandler.setCacheOptions({
                    enabled: false,
                    ttl: 120
                });
                const response = await (0, supertest_1.default)(app)
                    .get(`/mcp/${serverName}/resources/${encodeURIComponent(machineDetailUri)}`)
                    .expect(200);
                // No cache-control header should be present
                expect(response.headers['cache-control']).toBeUndefined();
                expect(response.headers['age']).toBeUndefined();
            });
        });
        describe('CacheManager Interaction', () => {
            it('should call CacheManager.get() before MAAS API call on cache miss', async () => {
                // Clear any existing cache
                cacheManager.clear();
                getSpy.mockClear();
                mockMaasClient.getMachineDetails.mockClear();
                await (0, supertest_1.default)(app)
                    .get(`/mcp/${serverName}/resources/${encodeURIComponent(machineDetailUri)}`)
                    .expect(200);
                expect(getSpy).toHaveBeenCalledTimes(1);
                expect(mockMaasClient.getMachineDetails).toHaveBeenCalledTimes(1);
                // Verify get() was called before the MAAS API call
                const getCallOrder = getSpy.mock.invocationCallOrder[0];
                const maasCallOrder = mockMaasClient.getMachineDetails.mock.invocationCallOrder[0];
                expect(getCallOrder).toBeLessThan(maasCallOrder);
            });
            it('should call CacheManager.set() after MAAS API call on cache miss', async () => {
                // Clear any existing cache
                cacheManager.clear();
                setSpy.mockClear();
                mockMaasClient.getMachineDetails.mockClear();
                await (0, supertest_1.default)(app)
                    .get(`/mcp/${serverName}/resources/${encodeURIComponent(machineDetailUri)}`)
                    .expect(200);
                expect(setSpy).toHaveBeenCalledTimes(1);
                expect(setSpy).toHaveBeenCalledWith(expect.any(String), // cache key
                sampleMachineData, 'Machine', // resource name
                expect.objectContaining({
                    enabled: true,
                    ttl: expect.any(Number)
                }));
                // Verify set() was called after the MAAS API call
                const setCallOrder = setSpy.mock.invocationCallOrder[0];
                const maasCallOrder = mockMaasClient.getMachineDetails.mock.invocationCallOrder[0];
                expect(setCallOrder).toBeGreaterThan(maasCallOrder);
            });
            it('should call CacheManager.get() and NOT MAAS API nor CacheManager.set() on cache hit', async () => {
                // First request to populate cache
                await (0, supertest_1.default)(app)
                    .get(`/mcp/${serverName}/resources/${encodeURIComponent(machineDetailUri)}`)
                    .expect(200);
                // Clear mocks for second request
                getSpy.mockClear();
                setSpy.mockClear();
                mockMaasClient.getMachineDetails.mockClear();
                // Second request (should be a cache hit)
                await (0, supertest_1.default)(app)
                    .get(`/mcp/${serverName}/resources/${encodeURIComponent(machineDetailUri)}`)
                    .expect(200);
                expect(getSpy).toHaveBeenCalledTimes(1);
                expect(mockMaasClient.getMachineDetails).not.toHaveBeenCalled();
                expect(setSpy).not.toHaveBeenCalled();
            });
            it('should NOT call CacheManager.get() or .set() if handler cacheOptions.enabled is false', async () => {
                // Skip test if we couldn't get the handler instance
                if (!machineResourceHandler || !machineResourceHandler.setCacheOptions) {
                    console.warn('Could not access MachineResourceHandler instance. Skipping test.');
                    return;
                }
                // Disable caching for this handler
                machineResourceHandler.setCacheOptions({
                    enabled: false,
                    ttl: 120
                });
                // Clear mocks
                getSpy.mockClear();
                setSpy.mockClear();
                mockMaasClient.getMachineDetails.mockClear();
                await (0, supertest_1.default)(app)
                    .get(`/mcp/${serverName}/resources/${encodeURIComponent(machineDetailUri)}`)
                    .expect(200);
                expect(getSpy).not.toHaveBeenCalled();
                expect(setSpy).not.toHaveBeenCalled();
                expect(mockMaasClient.getMachineDetails).toHaveBeenCalledTimes(1);
            });
        });
        describe('Cache Invalidation', () => {
            it('should have methods to invalidate cache', () => {
                // Skip test if we couldn't get the handler instance
                if (!machineResourceHandler) {
                    console.warn('Could not access MachineResourceHandler instance. Skipping test.');
                    return;
                }
                // Verify the handler has invalidation methods
                expect(typeof machineResourceHandler.invalidateCache).toBe('function');
                expect(typeof machineResourceHandler.invalidateCacheById).toBe('function');
            });
            it('should call CacheManager.invalidateByPrefix when invalidateCache is called', async () => {
                // Skip test if we couldn't get the handler instance
                if (!machineResourceHandler) {
                    console.warn('Could not access MachineResourceHandler instance. Skipping test.');
                    return;
                }
                const invalidateSpy = jest.spyOn(cacheManager, 'invalidateByPrefix');
                machineResourceHandler.invalidateCache();
                expect(invalidateSpy).toHaveBeenCalledTimes(1);
                expect(invalidateSpy).toHaveBeenCalledWith('Machine');
                invalidateSpy.mockRestore();
            });
            it('should call CacheManager.delete when invalidateCacheById is called', async () => {
                // Skip test if we couldn't get the handler instance
                if (!machineResourceHandler) {
                    console.warn('Could not access MachineResourceHandler instance. Skipping test.');
                    return;
                }
                const deleteSpy = jest.spyOn(cacheManager, 'delete');
                const resourceId = 'test-id';
                machineResourceHandler.invalidateCacheById(resourceId);
                expect(deleteSpy).toHaveBeenCalledTimes(1);
                expect(deleteSpy).toHaveBeenCalledWith(expect.stringContaining(resourceId));
                deleteSpy.mockRestore();
            });
        });
    });
    // --- XML Content Negotiation Tests ---
    describe('XML Content Negotiation', () => {
        const testUri = machineDetailUriFn('xml-negotiation-test');
        const sampleJsonResponse = {
            system_id: 'xml-sys-id',
            hostname: 'xml-test-host',
            power_state: 'on',
            tags: ['tag1', 'tag2'],
            network: {
                ip_address: '192.168.1.100',
                mac_address: '00:1A:2B:3C:4D:5E',
            },
        };
        // Helper to generate expected XML. This is an assumption.
        // The actual XML structure depends on the library used in BaseResourceHandler.
        // For testing, we'll check for key elements and well-formedness.
        const escapeXml = (unsafe) => {
            let safe = String(unsafe);
            safe = safe.replace(/&/g, '&amp;');
            safe = safe.replace(/</g, '&lt;');
            safe = safe.replace(/>/g, '&gt;');
            safe = safe.replace(/"/g, '&quot;');
            safe = safe.replace(/'/g, '&apos;');
            return safe;
        };
        const generateExpectedXml = (json) => {
            let xml = '<root>';
            for (const key in json) {
                if (Object.prototype.hasOwnProperty.call(json, key)) {
                    const value = json[key];
                    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                        xml += '<' + key + '>';
                        for (const subKey in value) {
                            xml += '<' + subKey + '>' + escapeXml(value[subKey]) + '</' + subKey + '>';
                        }
                        xml += '</' + key + '>';
                    }
                    else if (Array.isArray(value)) {
                        xml += '<' + key + '>';
                        value.forEach(item => {
                            xml += '<item>' + escapeXml(item) + '</item>';
                        });
                        xml += '</' + key + '>';
                    }
                    else {
                        xml += '<' + key + '>' + escapeXml(value) + '</' + key + '>';
                    }
                }
            }
            xml += '</root>';
            return xml;
        };
        const sampleXmlResponse = generateExpectedXml(sampleJsonResponse);
        beforeEach(() => {
            // Ensure mock is reset and configured for each test
            mockMaasClient.getMachineDetails.mockReset();
            mockMaasClient.getMachineDetails.mockResolvedValue(sampleJsonResponse);
        });
        describe('1. XML Response Formatting & Structure', () => {
            it('should return XML with Content-Type application/xml when ?format=xml is used', async () => {
                const response = await (0, supertest_1.default)(app)
                    .get(`/mcp/${serverName}/resources/${encodeURIComponent(testUri + '?format=xml')}`)
                    .expect(200);
                expect(response.headers['content-type']).toMatch(/application\/xml/);
                expect(response.text).toMatch(/^<root>.+<\/root>$/s); // Basic check for root element
                expect(response.text).toContain('<system_id>xml-sys-id</system_id>');
                expect(response.text).toContain('<hostname>xml-test-host</hostname>');
            });
            it('should handle simple JSON objects', async () => {
                const simpleJson = { id: 1, name: 'simple' };
                mockMaasClient.getMachineDetails.mockResolvedValue(simpleJson);
                const response = await (0, supertest_1.default)(app)
                    .get(`/mcp/${serverName}/resources/${encodeURIComponent(testUri + '?format=xml')}`)
                    .expect(200);
                expect(response.headers['content-type']).toMatch(/application\/xml/);
                expect(response.text).toContain('<id>1</id>');
                expect(response.text).toContain('<name>simple</name>');
            });
            it('should handle nested JSON objects', async () => {
                const nestedJson = { id: 1, data: { value: 'nested_val', count: 2 } };
                mockMaasClient.getMachineDetails.mockResolvedValue(nestedJson);
                const response = await (0, supertest_1.default)(app)
                    .get(`/mcp/${serverName}/resources/${encodeURIComponent(testUri + '?format=xml')}`)
                    .expect(200);
                expect(response.headers['content-type']).toMatch(/application\/xml/);
                expect(response.text).toContain('<data>');
                expect(response.text).toContain('<value>nested_val</value>');
                expect(response.text).toContain('<count>2</count>');
                expect(response.text).toContain('</data>');
            });
            it('should handle arrays in JSON', async () => {
                const arrayJson = { id: 1, items: ['a', 'b', 'c'] };
                mockMaasClient.getMachineDetails.mockResolvedValue(arrayJson);
                const response = await (0, supertest_1.default)(app)
                    .get(`/mcp/${serverName}/resources/${encodeURIComponent(testUri + '?format=xml')}`)
                    .expect(200);
                expect(response.headers['content-type']).toMatch(/application\/xml/);
                expect(response.text).toContain('<items>');
                expect(response.text).toContain('<item>a</item>');
                expect(response.text).toContain('<item>b</item>');
                expect(response.text).toContain('<item>c</item>');
                expect(response.text).toContain('</items>');
            });
            it('should handle empty JSON objects', async () => {
                mockMaasClient.getMachineDetails.mockResolvedValue({});
                const response = await (0, supertest_1.default)(app)
                    .get(`/mcp/${serverName}/resources/${encodeURIComponent(testUri + '?format=xml')}`)
                    .expect(200);
                expect(response.headers['content-type']).toMatch(/application\/xml/);
                // Exact representation of empty object as XML can vary (e.g. <root/> or <root></root>)
                expect(response.text).toMatch(/^<root\s*\/>$|^<root><\/root>$/s);
            });
            it('should handle empty arrays in JSON', async () => {
                const emptyArrayJson = { id: 1, items: [] };
                mockMaasClient.getMachineDetails.mockResolvedValue(emptyArrayJson);
                const response = await (0, supertest_1.default)(app)
                    .get(`/mcp/${serverName}/resources/${encodeURIComponent(testUri + '?format=xml')}`)
                    .expect(200);
                expect(response.headers['content-type']).toMatch(/application\/xml/);
                expect(response.text).toContain('<items'); // Could be <items/> or <items></items>
                expect(response.text).not.toContain('<item>');
            });
            it('should correctly escape special XML characters', async () => {
                const specialCharsJson = { data: 'value with <>&"\' characters' };
                mockMaasClient.getMachineDetails.mockResolvedValue(specialCharsJson);
                const response = await (0, supertest_1.default)(app)
                    .get(`/mcp/${serverName}/resources/${encodeURIComponent(testUri + '?format=xml')}`)
                    .expect(200);
                expect(response.headers['content-type']).toMatch(/application\/xml/);
                // The escapeXml function should convert 'value with <>&"\' characters'
                // to 'value with &lt;&amp;&gt;&quot;&apos; characters'
                const expectedEscapedString = '<data>value with &lt;&amp;&gt;&quot;&apos; characters</data>';
                expect(response.text).toContain(expectedEscapedString);
            });
        });
        describe('2. Content Type Detection Logic', () => {
            it('should return XML when Accept: application/xml header is used (and ?format=xml is NOT present)', async () => {
                const response = await (0, supertest_1.default)(app)
                    .get(`/mcp/${serverName}/resources/${encodeURIComponent(testUri)}`)
                    .set('Accept', 'application/xml')
                    .expect(200);
                expect(response.headers['content-type']).toMatch(/application\/xml/);
                expect(response.text).toContain('<system_id>xml-sys-id</system_id>');
            });
            it('should prioritize ?format=xml over Accept header (format=xml, Accept=json -> XML)', async () => {
                const response = await (0, supertest_1.default)(app)
                    .get(`/mcp/${serverName}/resources/${encodeURIComponent(testUri + '?format=xml')}`)
                    .set('Accept', 'application/json')
                    .expect(200);
                expect(response.headers['content-type']).toMatch(/application\/xml/);
                expect(response.text).toContain('<system_id>xml-sys-id</system_id>');
            });
            it('should return JSON when Accept: application/json header is used (and ?format is not xml)', async () => {
                const response = await (0, supertest_1.default)(app)
                    .get(`/mcp/${serverName}/resources/${encodeURIComponent(testUri)}`)
                    .set('Accept', 'application/json')
                    .expect(200);
                expect(response.headers['content-type']).toMatch(/application\/json/);
                expect(response.body).toEqual(sampleJsonResponse);
            });
            it('should default to JSON when no Accept header and no ?format=xml', async () => {
                const response = await (0, supertest_1.default)(app)
                    .get(`/mcp/${serverName}/resources/${encodeURIComponent(testUri)}`)
                    .expect(200);
                expect(response.headers['content-type']).toMatch(/application\/json/);
                expect(response.body).toEqual(sampleJsonResponse);
            });
            it('should default to JSON when Accept: */* and no ?format=xml', async () => {
                const response = await (0, supertest_1.default)(app)
                    .get(`/mcp/${serverName}/resources/${encodeURIComponent(testUri)}`)
                    .set('Accept', '*/*')
                    .expect(200);
                expect(response.headers['content-type']).toMatch(/application\/json/);
                expect(response.body).toEqual(sampleJsonResponse);
            });
            it('should return 406 Not Acceptable for unsupported Accept type (e.g., application/yaml) when ?format=xml is not present', async () => {
                const response = await (0, supertest_1.default)(app)
                    .get(`/mcp/${serverName}/resources/${encodeURIComponent(testUri)}`)
                    .set('Accept', 'application/yaml')
                    .expect(406);
                expect(response.body).toHaveProperty('error');
                expect(response.body.error.code).toBe('NOT_ACCEPTABLE');
                expect(response.body.error.message).toMatch(/Unsupported media type requested/i);
            });
            it('should still return XML if ?format=xml is present, even with unsupported Accept type (e.g. application/yaml)', async () => {
                const response = await (0, supertest_1.default)(app)
                    .get(`/mcp/${serverName}/resources/${encodeURIComponent(testUri + '?format=xml')}`)
                    .set('Accept', 'application/yaml')
                    .expect(200);
                expect(response.headers['content-type']).toMatch(/application\/xml/);
                expect(response.text).toContain('<system_id>xml-sys-id</system_id>');
            });
        });
        describe('3. Request Content Type Tests', () => {
            it('should accept JSON content type for POST/PUT requests', async () => {
                const testData = { name: 'test-machine', description: 'Test machine' };
                // Mock the MAAS client method that would be called for a POST request
                mockMaasClient.createMachine = jest.fn().mockResolvedValue({
                    ...testData,
                    system_id: 'new-machine-id'
                });
                const response = await (0, supertest_1.default)(app)
                    .post(`/mcp/${serverName}/tools/create-machine`)
                    .set('Content-Type', 'application/json')
                    .send(testData)
                    .expect(200);
                expect(response.body).toHaveProperty('system_id', 'new-machine-id');
            });
            it('should accept XML content type for POST/PUT requests', async () => {
                // XML equivalent of { name: 'test-machine', description: 'Test machine' }
                const xmlData = '<root><name>test-machine</name><description>Test machine</description></root>';
                // Mock the MAAS client method that would be called for a POST request
                mockMaasClient.createMachine = jest.fn().mockResolvedValue({
                    name: 'test-machine',
                    description: 'Test machine',
                    system_id: 'new-machine-id'
                });
                const response = await (0, supertest_1.default)(app)
                    .post(`/mcp/${serverName}/tools/create-machine`)
                    .set('Content-Type', 'application/xml')
                    .send(xmlData)
                    .expect(200);
                expect(response.body).toHaveProperty('system_id', 'new-machine-id');
            });
            it('should reject unsupported content types with 415 Unsupported Media Type', async () => {
                const response = await (0, supertest_1.default)(app)
                    .post(`/mcp/${serverName}/tools/create-machine`)
                    .set('Content-Type', 'application/yaml')
                    .send('name: test-machine\ndescription: Test machine')
                    .expect(415);
                expect(response.body).toHaveProperty('error');
                expect(response.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
            });
        });
        describe('4. Content Type Conversion Tests', () => {
            it('should convert JSON to XML when Accept: application/xml is specified', async () => {
                const response = await (0, supertest_1.default)(app)
                    .get(`/mcp/${serverName}/resources/${encodeURIComponent(testUri)}`)
                    .set('Accept', 'application/xml')
                    .expect(200);
                expect(response.headers['content-type']).toMatch(/application\/xml/);
                expect(response.text).toContain('<system_id>xml-sys-id</system_id>');
            });
            it('should convert XML to JSON when Accept: application/json is specified', async () => {
                // This test assumes the server can handle XML input and convert it to JSON output
                const xmlData = '<root><name>test-machine</name><description>Test machine</description></root>';
                // Mock the MAAS client method
                mockMaasClient.createMachine = jest.fn().mockResolvedValue({
                    name: 'test-machine',
                    description: 'Test machine',
                    system_id: 'new-machine-id'
                });
                const response = await (0, supertest_1.default)(app)
                    .post(`/mcp/${serverName}/tools/create-machine`)
                    .set('Content-Type', 'application/xml')
                    .set('Accept', 'application/json')
                    .send(xmlData)
                    .expect(200);
                expect(response.headers['content-type']).toMatch(/application\/json/);
                expect(response.body).toEqual({
                    name: 'test-machine',
                    description: 'Test machine',
                    system_id: 'new-machine-id'
                });
            });
        });
        describe('5. Error Handling Tests', () => {
            it('should handle malformed JSON gracefully', async () => {
                const malformedJson = '{"name": "test-machine", "description": "Missing closing brace"';
                const response = await (0, supertest_1.default)(app)
                    .post(`/mcp/${serverName}/tools/create-machine`)
                    .set('Content-Type', 'application/json')
                    .send(malformedJson)
                    .expect(400);
                expect(response.body).toHaveProperty('error');
                expect(response.body.error.code).toBe('INVALID_REQUEST_BODY');
                expect(response.body.error.message).toMatch(/Invalid JSON/i);
            });
            it('should handle malformed XML gracefully', async () => {
                const malformedXml = '<root><name>test-machine</name><description>Missing closing tag';
                const response = await (0, supertest_1.default)(app)
                    .post(`/mcp/${serverName}/tools/create-machine`)
                    .set('Content-Type', 'application/xml')
                    .send(malformedXml)
                    .expect(400);
                expect(response.body).toHaveProperty('error');
                expect(response.body.error.code).toBe('INVALID_REQUEST_BODY');
                expect(response.body.error.message).toMatch(/Invalid XML/i);
            });
        });
        describe('6. Edge Case Tests', () => {
            it('should handle empty response bodies correctly', async () => {
                // Mock a response that would return no content (204)
                mockMaasClient.deleteMachine = jest.fn().mockResolvedValue(undefined);
                const response = await (0, supertest_1.default)(app)
                    .delete(`/mcp/${serverName}/tools/delete-machine`)
                    .query({ system_id: 'machine-to-delete' })
                    .expect(204);
                expect(response.body).toEqual({});
            });
            it('should handle large payloads', async () => {
                // Create a large object
                const largeObject = { items: [] };
                for (let i = 0; i < 1000; i++) {
                    largeObject.items.push({ id: i, name: `Item ${i}`, description: `Description for item ${i}` });
                }
                // Mock the MAAS client method
                mockMaasClient.bulkOperation = jest.fn().mockResolvedValue({
                    success: true,
                    processed: 1000
                });
                const response = await (0, supertest_1.default)(app)
                    .post(`/mcp/${serverName}/tools/bulk-operation`)
                    .set('Content-Type', 'application/json')
                    .send(largeObject)
                    .expect(200);
                expect(response.body).toHaveProperty('success', true);
                expect(response.body).toHaveProperty('processed', 1000);
            });
            it('should handle nested structures correctly in XML', async () => {
                const deeplyNestedJson = {
                    level1: {
                        level2: {
                            level3: {
                                level4: {
                                    level5: "deeply nested value"
                                }
                            }
                        }
                    }
                };
                mockMaasClient.getMachineDetails.mockResolvedValue(deeplyNestedJson);
                const response = await (0, supertest_1.default)(app)
                    .get(`/mcp/${serverName}/resources/${encodeURIComponent(testUri + '?format=xml')}`)
                    .expect(200);
                expect(response.headers['content-type']).toMatch(/application\/xml/);
                expect(response.text).toContain('<level1>');
                expect(response.text).toContain('<level2>');
                expect(response.text).toContain('<level3>');
                expect(response.text).toContain('<level4>');
                expect(response.text).toContain('<level5>deeply nested value</level5>');
            });
        });
        describe('7. XML Conversion Fallback', () => {
            // This test is tricky without knowing the exact XML conversion mechanism and how to make it fail.
            // We'll simulate a scenario where the data itself might cause an issue if not handled well by the converter.
            // A more robust test would involve mocking the XML conversion utility itself to throw an error.
            it('should gracefully handle potential XML conversion issues (e.g., by returning a server error in JSON)', async () => {
                // Simulate data that might be problematic for some naive XML converters if not handled.
                // For a robust test, we'd mock the internal XML converter to throw.
                // Here, we're just checking if the server handles an unexpected error during response processing.
                const problematicData = {
                    a: Symbol('problem'), // Symbols cannot be directly converted to JSON or XML easily
                };
                mockMaasClient.getMachineDetails.mockResolvedValue(problematicData);
                // If XML conversion fails internally, BaseResourceHandler should catch it and return an error.
                // The error response itself should ideally be JSON, as XML conversion failed.
                const response = await (0, supertest_1.default)(app)
                    .get(`/mcp/${serverName}/resources/${encodeURIComponent(testUri + '?format=xml')}`)
                    .expect(500); // Expecting a server error
                expect(response.headers['content-type']).toMatch(/application\/json/); // Error should be JSON
                expect(response.body).toHaveProperty('error');
                expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
                // The message might vary depending on how the error is caught and reported.
                expect(response.body.error.message).toMatch(/Failed to serialize response to XML|Internal server error/i);
            });
        });
    });
});
