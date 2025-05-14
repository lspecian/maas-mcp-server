"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
// import { McpServer } from '../../../mcpServer.js'; // Removed: File not found/defined
const MaasApiClient_js_1 = require("../../maas/MaasApiClient.js");
const index_js_1 = require("../../mcp_resources/schemas/index.js");
const xml2js_1 = require("xml2js");
const auditLogger_js_1 = require("../../utils/auditLogger.js");
// Mock MaasApiClient and AuditLogger
jest.mock('../../../maas/MaasApiClient');
jest.mock('../../utils/auditLogger.js');
const MockedMaasApiClient = MaasApiClient_js_1.MaasApiClient;
const MockedAuditLogger = auditLogger_js_1.AuditLogger;
describe('MCP Resource API Contract Tests', () => {
    // let server: McpServer; // Removed: Part of the old custom server setup
    let apiClientMock;
    let auditLoggerMock;
    let app;
    const mockMachinesData = [{ id: 'machine-1', hostname: 'test-machine-1' }];
    const mockMachineDetailsData = { id: 'machine-1', hostname: 'test-machine-1', power_state: 'on' };
    const mockTagsData = [{ id: 'tag-1', name: 'test-tag-1' }];
    const mockTagDetailsData = { id: 'tag-1', name: 'test-tag-1', machines: [] };
    const mockSubnetsData = [{ id: 'subnet-1', name: 'test-subnet-1', cidr: '192.168.1.0/24' }];
    const mockSubnetDetailsData = { id: 'subnet-1', name: 'test-subnet-1', cidr: '192.168.1.0/24', vlan: { vid: 100 } };
    const mockZonesData = [{ id: 'zone-1', name: 'test-zone-1' }];
    const mockZoneDetailsData = { id: 'zone-1', name: 'test-zone-1', description: 'A test zone' };
    const mockDevicesData = [{ id: 'device-1', system_id: 'system-id-1', hostname: 'test-device-1' }];
    const mockDeviceDetailsData = { id: 'device-1', system_id: 'system-id-1', hostname: 'test-device-1', mac_addresses: [] };
    const mockDomainsData = [{ id: 'domain-1', name: 'test-domain-1' }];
    const mockDomainDetailsData = { id: 'domain-1', name: 'test-domain-1', authoritative: true };
    // Standard error response format for validation
    const standardErrorFormat = {
        error: expect.any(String),
        message: expect.any(String),
        requestId: expect.any(String),
        timestamp: expect.any(String)
    };
    // Helper function to verify error response format
    const verifyErrorFormat = (response) => {
        expect(response.body).toMatchObject({
            error: expect.any(String),
            message: expect.any(String)
        });
        // Check for optional but recommended fields
        if (response.body.requestId) {
            expect(typeof response.body.requestId).toBe('string');
        }
        if (response.body.timestamp) {
            expect(typeof response.body.timestamp).toBe('string');
            // Optionally validate timestamp format
            expect(new Date(response.body.timestamp).toString()).not.toBe('Invalid Date');
        }
        // Check for details field if present
        if (response.body.details) {
            expect(typeof response.body.details).toBe('string');
        }
    };
    // Helper function to test a single query parameter
    const testQueryParameter = async (app, uri, paramName, paramValue, expectedStatus = 200) => {
        apiClientMock.get.mockImplementationOnce(async (endpoint, params) => {
            expect(params).toHaveProperty('params');
            expect(params.params).toHaveProperty(paramName, paramValue);
            return { data: [], headers: { 'content-type': 'application/json' } };
        });
        const response = await (0, supertest_1.default)(app)
            .get(`${uri}?${paramName}=${encodeURIComponent(paramValue)}`)
            .set('Accept', 'application/json');
        expect(response.status).toBe(expectedStatus);
        expect(apiClientMock.get).toHaveBeenCalled();
        return response;
    };
    // Helper function to test multiple query parameters
    const testMultipleQueryParameters = async (app, uri, paramsObject, expectedStatus = 200) => {
        apiClientMock.get.mockImplementationOnce(async (endpoint, params) => {
            expect(params).toHaveProperty('params');
            // Check that all parameters are passed correctly
            Object.entries(paramsObject).forEach(([key, value]) => {
                expect(params.params).toHaveProperty(key, value);
            });
            return { data: [], headers: { 'content-type': 'application/json' } };
        });
        // Build query string
        const queryString = Object.entries(paramsObject)
            .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
            .join('&');
        const response = await (0, supertest_1.default)(app)
            .get(`${uri}?${queryString}`)
            .set('Accept', 'application/json');
        expect(response.status).toBe(expectedStatus);
        expect(apiClientMock.get).toHaveBeenCalled();
        return response;
    };
    beforeAll(async () => {
        apiClientMock = new MockedMaasApiClient({
            apiUrl: 'http://fake-maas',
            apiKey: 'fake-key',
        });
        auditLoggerMock = new MockedAuditLogger();
        auditLoggerMock.log.mockImplementation(() => Promise.resolve());
        // Initialize Express app
        app = (0, express_1.default)();
        app.use(express_1.default.json()); // Middleware to parse JSON bodies
        // Add request ID middleware for testing
        app.use((req, res, next) => {
            req.headers['x-request-id'] = req.headers['x-request-id'] || 'test-request-id';
            next();
        });
        // Mock default implementation for get to avoid undefined errors
        // This mock will be used by route handlers we'll define later
        apiClientMock.get.mockImplementation(async (endpoint) => {
            if (endpoint.includes('/machines/machine-1'))
                return { data: mockMachineDetailsData, headers: {} };
            if (endpoint.includes('/machines'))
                return { data: mockMachinesData, headers: {} };
            if (endpoint.includes('/tags/tag-1'))
                return { data: mockTagDetailsData, headers: {} };
            if (endpoint.includes('/tags'))
                return { data: mockTagsData, headers: {} };
            if (endpoint.includes('/subnets/subnet-1'))
                return { data: mockSubnetDetailsData, headers: {} };
            if (endpoint.includes('/subnets'))
                return { data: mockSubnetsData, headers: {} };
            if (endpoint.includes('/zones/zone-1'))
                return { data: mockZoneDetailsData, headers: {} };
            if (endpoint.includes('/zones'))
                return { data: mockZonesData, headers: {} };
            if (endpoint.includes('/devices/device-1'))
                return { data: mockDeviceDetailsData, headers: {} };
            if (endpoint.includes('/devices'))
                return { data: mockDevicesData, headers: {} };
            if (endpoint.includes('/domains/domain-1'))
                return { data: mockDomainDetailsData, headers: {} };
            if (endpoint.includes('/domains'))
                return { data: mockDomainsData, headers: {} };
            return { data: {}, headers: {} };
        });
        // The original server setup is removed.
        // `app` is now the express instance.
        // Route setup for `app` to handle test requests will be done in a subsequent step.
    });
    afterAll(async () => {
        // No server to stop in this simplified setup yet.
        // If we were listening on a port, we'd close it here. Supertest handles this.
    });
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset mocks for specific endpoints if necessary
        apiClientMock.get.mockImplementation(async (endpoint) => {
            if (endpoint.startsWith('machines/machine-1'))
                return { data: mockMachineDetailsData, headers: { 'cache-control': 'public, max-age=60' } };
            if (endpoint.startsWith('machines'))
                return { data: mockMachinesData, headers: { 'cache-control': 'public, max-age=60' } };
            if (endpoint.startsWith('tags/tag-1'))
                return { data: mockTagDetailsData, headers: { 'cache-control': 'public, max-age=300' } };
            if (endpoint.startsWith('tags'))
                return { data: mockTagsData, headers: { 'cache-control': 'public, max-age=300' } };
            if (endpoint.startsWith('subnets/subnet-1'))
                return { data: mockSubnetDetailsData, headers: { 'cache-control': 'public, max-age=3600' } };
            if (endpoint.startsWith('subnets'))
                return { data: mockSubnetsData, headers: { 'cache-control': 'public, max-age=3600' } };
            if (endpoint.startsWith('zones/zone-1'))
                return { data: mockZoneDetailsData, headers: { 'cache-control': 'public, max-age=86400' } };
            if (endpoint.startsWith('zones'))
                return { data: mockZonesData, headers: { 'cache-control': 'public, max-age=86400' } };
            if (endpoint.startsWith('devices/device-1'))
                return { data: mockDeviceDetailsData, headers: { 'cache-control': 'public, max-age=60' } };
            if (endpoint.startsWith('devices'))
                return { data: mockDevicesData, headers: { 'cache-control': 'public, max-age=60' } };
            if (endpoint.startsWith('domains/domain-1'))
                return { data: mockDomainDetailsData, headers: { 'cache-control': 'public, max-age=3600' } };
            if (endpoint.startsWith('domains'))
                return { data: mockDomainsData, headers: { 'cache-control': 'public, max-age=3600' } };
            return { data: {}, headers: {} };
        });
        // Reset audit logger mock
        auditLoggerMock.log.mockClear();
    });
    const testResourceEndpoints = ({ resourceName, collectionUri, itemUriBase, itemId, mockCollectionData, mockItemData, collectionSchema, itemSchema, expectedCacheControl, queryParams, }) => {
        describe(`${resourceName} Resources`, () => {
            // Collection Endpoint Tests
            describe(`GET ${collectionUri}`, () => {
                it('should return 200 OK with JSON data matching schema', async () => {
                    apiClientMock.get.mockResolvedValueOnce({ data: mockCollectionData, headers: { 'content-type': 'application/json', 'cache-control': expectedCacheControl } });
                    const response = await (0, supertest_1.default)(app)
                        .get(collectionUri)
                        .set('Accept', 'application/json');
                    expect(response.status).toBe(200);
                    expect(response.headers['content-type']).toMatch(/application\/json/);
                    expect(() => collectionSchema.parse(response.body)).not.toThrow();
                    expect(response.headers['cache-control']).toBe(expectedCacheControl);
                });
                it('should return 200 OK with XML data matching schema (converted)', async () => {
                    apiClientMock.get.mockResolvedValueOnce({ data: mockCollectionData, headers: { 'content-type': 'application/xml', 'cache-control': expectedCacheControl } });
                    const response = await (0, supertest_1.default)(app)
                        .get(collectionUri)
                        .set('Accept', 'application/xml');
                    expect(response.status).toBe(200);
                    expect(response.headers['content-type']).toMatch(/application\/xml/);
                    const xmlResponse = await (0, xml2js_1.parseStringPromise)(response.text, { explicitArray: false, mergeAttrs: true });
                    // XML to JSON conversion might require transformation before schema validation
                    expect(xmlResponse).toBeDefined();
                    expect(response.headers['cache-control']).toBe(expectedCacheControl);
                    // Validate XML structure matches expected format
                    const resourceKey = resourceName.toLowerCase();
                    expect(xmlResponse).toHaveProperty(resourceKey);
                    expect(Array.isArray(xmlResponse[resourceKey][`${resourceKey.slice(0, -1)}`])).toBe(true);
                });
                // Query Parameters and Filtering Tests
                if (queryParams) {
                    it('should support filtering resources', async () => {
                        const filterParam = queryParams.filter || 'status=active';
                        apiClientMock.get.mockImplementationOnce(async (endpoint, params) => {
                            expect(params).toHaveProperty('params');
                            expect(params.params).toHaveProperty('filter', filterParam);
                            return { data: mockCollectionData, headers: { 'content-type': 'application/json' } };
                        });
                        await (0, supertest_1.default)(app)
                            .get(`${collectionUri}?filter=${filterParam}`)
                            .set('Accept', 'application/json');
                        expect(apiClientMock.get).toHaveBeenCalled();
                    });
                    it('should support sorting resources', async () => {
                        const sortParam = queryParams.sort || 'name';
                        apiClientMock.get.mockImplementationOnce(async (endpoint, params) => {
                            expect(params).toHaveProperty('params');
                            expect(params.params).toHaveProperty('sort', sortParam);
                            return { data: mockCollectionData, headers: { 'content-type': 'application/json' } };
                        });
                        await (0, supertest_1.default)(app)
                            .get(`${collectionUri}?sort=${sortParam}`)
                            .set('Accept', 'application/json');
                        expect(apiClientMock.get).toHaveBeenCalled();
                    });
                    it('should support pagination of resources', async () => {
                        const pageParam = queryParams.page || '1';
                        const limitParam = queryParams.limit || '10';
                        apiClientMock.get.mockImplementationOnce(async (endpoint, params) => {
                            expect(params).toHaveProperty('params');
                            expect(params.params).toHaveProperty('page', pageParam);
                            expect(params.params).toHaveProperty('limit', limitParam);
                            return { data: mockCollectionData, headers: { 'content-type': 'application/json' } };
                        });
                        await (0, supertest_1.default)(app)
                            .get(`${collectionUri}?page=${pageParam}&limit=${limitParam}`)
                            .set('Accept', 'application/json');
                        expect(apiClientMock.get).toHaveBeenCalled();
                    });
                    // Test multiple query parameters simultaneously
                    it('should support multiple query parameters simultaneously', async () => {
                        const params = {
                            filter: queryParams.filter || 'status=active',
                            sort: queryParams.sort || 'name',
                            page: queryParams.page || '1',
                            limit: queryParams.limit || '10'
                        };
                        await testMultipleQueryParameters(app, collectionUri, params);
                    });
                    // Test boundary values for numeric parameters
                    it('should handle boundary values for numeric parameters', async () => {
                        // Test minimum value (1)
                        await testQueryParameter(app, collectionUri, 'page', '1');
                        // Test zero value (should be handled gracefully)
                        apiClientMock.get.mockRejectedValueOnce({
                            isAxiosError: true,
                            response: {
                                status: 400,
                                data: { error: 'Invalid parameter', message: 'Page must be a positive integer' }
                            }
                        });
                        const zeroResponse = await (0, supertest_1.default)(app)
                            .get(`${collectionUri}?page=0`)
                            .set('Accept', 'application/json');
                        expect(zeroResponse.status).toBe(400);
                        verifyErrorFormat(zeroResponse);
                        // Test negative value (should be rejected)
                        apiClientMock.get.mockRejectedValueOnce({
                            isAxiosError: true,
                            response: {
                                status: 400,
                                data: { error: 'Invalid parameter', message: 'Page must be a positive integer' }
                            }
                        });
                        const negativeResponse = await (0, supertest_1.default)(app)
                            .get(`${collectionUri}?page=-1`)
                            .set('Accept', 'application/json');
                        expect(negativeResponse.status).toBe(400);
                        verifyErrorFormat(negativeResponse);
                        // Test maximum value (implementation specific, using a large value)
                        await testQueryParameter(app, collectionUri, 'limit', '1000');
                    });
                    // Test special characters and encoding in query parameters
                    it('should handle special characters and encoding in query parameters', async () => {
                        // Test spaces in filter value
                        await testQueryParameter(app, collectionUri, 'filter', 'name=Test Server');
                        // Test special characters
                        await testQueryParameter(app, collectionUri, 'filter', 'name=test@example.com');
                        // Test URL-unsafe characters
                        await testQueryParameter(app, collectionUri, 'filter', 'name=test&special+chars');
                    });
                    // Resource-specific query parameter tests
                    if (resourceName === 'Machines') {
                        it('should support machine-specific query parameters', async () => {
                            // Test status parameter
                            await testQueryParameter(app, collectionUri, 'status', 'deployed');
                            // Test power_state parameter
                            await testQueryParameter(app, collectionUri, 'power_state', 'on');
                            // Test zone parameter
                            await testQueryParameter(app, collectionUri, 'zone', 'default');
                            // Test multiple machine-specific parameters
                            await testMultipleQueryParameters(app, collectionUri, {
                                status: 'deployed',
                                power_state: 'on',
                                zone: 'default'
                            });
                        });
                    }
                    else if (resourceName === 'Subnets') {
                        it('should support subnet-specific query parameters', async () => {
                            // Test CIDR parameter
                            await testQueryParameter(app, collectionUri, 'cidr', '192.168.1.0/24');
                            // Test VLAN parameter
                            await testQueryParameter(app, collectionUri, 'vlan', '100');
                            // Test multiple subnet-specific parameters
                            await testMultipleQueryParameters(app, collectionUri, {
                                cidr: '192.168.1.0/24',
                                vlan: '100'
                            });
                        });
                    }
                    // Test invalid query parameters
                    it('should handle invalid query parameters appropriately', async () => {
                        // Test unknown parameter
                        apiClientMock.get.mockImplementationOnce(async (endpoint, params) => {
                            // The API client should pass through unknown parameters
                            expect(params).toHaveProperty('params');
                            expect(params.params).toHaveProperty('unknown_param', 'value');
                            return { data: mockCollectionData, headers: { 'content-type': 'application/json' } };
                        });
                        const unknownParamResponse = await (0, supertest_1.default)(app)
                            .get(`${collectionUri}?unknown_param=value`)
                            .set('Accept', 'application/json');
                        // Unknown parameters should be passed through to the underlying API
                        expect(unknownParamResponse.status).toBe(200);
                        // Test invalid parameter value format
                        apiClientMock.get.mockRejectedValueOnce({
                            isAxiosError: true,
                            response: {
                                status: 400,
                                data: { error: 'Invalid parameter', message: 'Invalid format for parameter' }
                            }
                        });
                        const invalidFormatResponse = await (0, supertest_1.default)(app)
                            .get(`${collectionUri}?page=not_a_number`)
                            .set('Accept', 'application/json');
                        expect(invalidFormatResponse.status).toBe(400);
                        verifyErrorFormat(invalidFormatResponse);
                    });
                }
                // Edge Case Tests
                it('should handle empty collections gracefully', async () => {
                    apiClientMock.get.mockResolvedValueOnce({
                        data: [],
                        headers: { 'content-type': 'application/json', 'cache-control': expectedCacheControl }
                    });
                    const response = await (0, supertest_1.default)(app)
                        .get(collectionUri)
                        .set('Accept', 'application/json');
                    expect(response.status).toBe(200);
                    expect(response.body).toEqual([]);
                    expect(() => collectionSchema.parse(response.body)).not.toThrow();
                });
                it('should handle rate limiting responses', async () => {
                    apiClientMock.get.mockRejectedValueOnce({
                        isAxiosError: true,
                        response: {
                            status: 429,
                            data: 'Too Many Requests',
                            headers: { 'retry-after': '30' }
                        }
                    });
                    const response = await (0, supertest_1.default)(app)
                        .get(collectionUri)
                        .set('Accept', 'application/json');
                    expect(response.status).toBe(429);
                    expect(response.headers).toHaveProperty('retry-after', '30');
                });
                it('should return 406 Not Acceptable for unsupported Accept header', async () => {
                    const response = await (0, supertest_1.default)(app)
                        .get(collectionUri)
                        .set('Accept', 'application/yaml');
                    expect(response.status).toBe(406);
                });
                // Error Response Format Tests
                it('should return properly formatted error responses', async () => {
                    apiClientMock.get.mockRejectedValueOnce({
                        isAxiosError: true,
                        response: {
                            status: 400,
                            data: { error: 'Invalid parameters', details: 'Missing required field' }
                        }
                    });
                    const response = await (0, supertest_1.default)(app)
                        .get(collectionUri)
                        .set('Accept', 'application/json');
                    expect(response.status).toBe(400);
                    expect(response.body).toHaveProperty('error');
                    expect(response.body).toHaveProperty('details');
                    expect(response.body.error).toBe('Invalid parameters');
                    // Verify standard error format
                    verifyErrorFormat(response);
                });
                // Test specific error types
                describe('Specific Error Types', () => {
                    const errorTypes = [
                        { status: 400, name: 'Bad Request', message: 'Invalid query parameters' },
                        { status: 401, name: 'Unauthorized', message: 'Authentication required' },
                        { status: 403, name: 'Forbidden', message: 'Insufficient permissions' },
                        { status: 404, name: 'Not Found', message: 'Resource not found' },
                        { status: 405, name: 'Method Not Allowed', message: 'Method not supported for this resource' },
                        { status: 406, name: 'Not Acceptable', message: 'Requested content type not available' },
                        { status: 408, name: 'Request Timeout', message: 'Request timed out' },
                        { status: 409, name: 'Conflict', message: 'Resource conflict' },
                        { status: 413, name: 'Payload Too Large', message: 'Request payload too large' },
                        { status: 414, name: 'URI Too Long', message: 'Request URI too long' },
                        { status: 415, name: 'Unsupported Media Type', message: 'Unsupported content type' },
                        { status: 429, name: 'Too Many Requests', message: 'Rate limit exceeded' },
                        { status: 500, name: 'Internal Server Error', message: 'Server encountered an error' },
                        { status: 501, name: 'Not Implemented', message: 'Functionality not implemented' },
                        { status: 502, name: 'Bad Gateway', message: 'Invalid response from upstream server' },
                        { status: 503, name: 'Service Unavailable', message: 'Service temporarily unavailable' },
                        { status: 504, name: 'Gateway Timeout', message: 'Upstream server timeout' }
                    ];
                    errorTypes.forEach(({ status, name, message }) => {
                        it(`should handle ${status} ${name} errors correctly`, async () => {
                            const headers = {};
                            // Add retry-after header for rate limiting errors
                            if (status === 429) {
                                headers['retry-after'] = '30';
                            }
                            apiClientMock.get.mockRejectedValueOnce({
                                isAxiosError: true,
                                response: {
                                    status,
                                    data: { error: name, message },
                                    headers
                                }
                            });
                            const response = await (0, supertest_1.default)(app)
                                .get(collectionUri)
                                .set('Accept', 'application/json');
                            expect(response.status).toBe(status);
                            verifyErrorFormat(response);
                            if (status === 429) {
                                expect(response.headers).toHaveProperty('retry-after', '30');
                            }
                        });
                    });
                });
                // Test malformed requests
                it('should handle extremely long query parameters', async () => {
                    // Generate a very long query parameter value
                    const longValue = 'a'.repeat(10000);
                    apiClientMock.get.mockRejectedValueOnce({
                        isAxiosError: true,
                        response: {
                            status: 414,
                            data: { error: 'URI Too Long', message: 'Request URI too long' }
                        }
                    });
                    const response = await (0, supertest_1.default)(app)
                        .get(`${collectionUri}?filter=${longValue}`)
                        .set('Accept', 'application/json');
                    expect(response.status).toBe(414);
                    verifyErrorFormat(response);
                });
                it('should handle malformed URIs', async () => {
                    // Test with invalid URI characters
                    apiClientMock.get.mockRejectedValueOnce({
                        isAxiosError: true,
                        response: {
                            status: 400,
                            data: { error: 'Bad Request', message: 'Malformed URI' }
                        }
                    });
                    // Note: supertest will encode this, but we're testing the error handling
                    const response = await (0, supertest_1.default)(app)
                        .get(`${collectionUri}?invalid=%%invalid`)
                        .set('Accept', 'application/json');
                    expect(response.status).toBe(400);
                    verifyErrorFormat(response);
                });
                // Test error headers
                it('should include appropriate headers in error responses', async () => {
                    // Test CORS headers in error responses
                    apiClientMock.get.mockRejectedValueOnce({
                        isAxiosError: true,
                        response: {
                            status: 400,
                            data: { error: 'Bad Request', message: 'Invalid parameters' },
                            headers: {
                                'access-control-allow-origin': '*',
                                'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
                                'access-control-allow-headers': 'Content-Type, Authorization'
                            }
                        }
                    });
                    const response = await (0, supertest_1.default)(app)
                        .get(collectionUri)
                        .set('Accept', 'application/json')
                        .set('Origin', 'http://example.com');
                    expect(response.status).toBe(400);
                    // CORS headers should be preserved in error responses
                    expect(response.headers).toHaveProperty('access-control-allow-origin');
                });
                // Audit Logging Tests
                it(`should log audit information for GET ${collectionUri}`, async () => {
                    apiClientMock.get.mockResolvedValueOnce({
                        data: mockCollectionData,
                        headers: { 'content-type': 'application/json' }
                    });
                    await (0, supertest_1.default)(app)
                        .get(collectionUri)
                        .set('Accept', 'application/json')
                        .set('X-Request-ID', 'test-audit-request-id');
                    expect(auditLoggerMock.log).toHaveBeenCalledWith(expect.objectContaining({
                        requestId: 'test-audit-request-id',
                        action: 'GET',
                        resourceType: resourceName,
                        status: 200
                    }));
                });
            });
            // Item Endpoint Tests
            const itemUri = `${itemUriBase}/${itemId}`;
            describe(`GET ${itemUri}`, () => {
                it('should return 200 OK with JSON data matching schema', async () => {
                    apiClientMock.get.mockResolvedValueOnce({ data: mockItemData, headers: { 'content-type': 'application/json', 'cache-control': expectedCacheControl } });
                    const response = await (0, supertest_1.default)(app)
                        .get(itemUri)
                        .set('Accept', 'application/json');
                    expect(response.status).toBe(200);
                    expect(response.headers['content-type']).toMatch(/application\/json/);
                    expect(() => itemSchema.parse(response.body)).not.toThrow();
                    expect(response.headers['cache-control']).toBe(expectedCacheControl);
                });
                it('should return 200 OK with XML data matching schema (converted)', async () => {
                    apiClientMock.get.mockResolvedValueOnce({ data: mockItemData, headers: { 'content-type': 'application/xml', 'cache-control': expectedCacheControl } });
                    const response = await (0, supertest_1.default)(app)
                        .get(itemUri)
                        .set('Accept', 'application/xml');
                    expect(response.status).toBe(200);
                    expect(response.headers['content-type']).toMatch(/application\/xml/);
                    const xmlResponse = await (0, xml2js_1.parseStringPromise)(response.text, { explicitArray: false, mergeAttrs: true });
                    expect(xmlResponse).toBeDefined();
                    expect(response.headers['cache-control']).toBe(expectedCacheControl);
                    // Validate XML structure matches expected format
                    const resourceKey = resourceName.toLowerCase().slice(0, -1);
                    expect(xmlResponse).toHaveProperty(resourceKey);
                });
                it('should return 404 Not Found for non-existent item ID', async () => {
                    apiClientMock.get.mockRejectedValueOnce({ isAxiosError: true, response: { status: 404, data: 'Not Found' } });
                    const response = await (0, supertest_1.default)(app)
                        .get(`${itemUriBase}/non-existent-id`)
                        .set('Accept', 'application/json');
                    expect(response.status).toBe(404);
                });
                it('should return 406 Not Acceptable for unsupported Accept header', async () => {
                    const response = await (0, supertest_1.default)(app)
                        .get(itemUri)
                        .set('Accept', 'application/yaml');
                    expect(response.status).toBe(406);
                    expect(response.body).toHaveProperty('error', 'Not Acceptable');
                    expect(response.body).toHaveProperty('message', 'Supported content types: application/json, application/xml');
                });
                // Error Response Format Tests
                it('should return properly formatted error responses for item requests', async () => {
                    apiClientMock.get.mockRejectedValueOnce({
                        isAxiosError: true,
                        response: {
                            status: 400,
                            data: { error: 'Invalid resource ID', details: 'Resource ID must be a valid UUID' }
                        }
                    });
                    const response = await (0, supertest_1.default)(app)
                        .get(itemUri)
                        .set('Accept', 'application/json');
                    expect(response.status).toBe(400);
                    expect(response.body).toHaveProperty('error');
                    expect(response.body).toHaveProperty('details');
                    expect(response.body.error).toBe('Invalid resource ID');
                    // Verify standard error format
                    verifyErrorFormat(response);
                });
                // Test resource-specific query parameters for item endpoints
                if (queryParams) {
                    it('should support query parameters for item requests', async () => {
                        // Test with a common parameter like 'fields' for field selection
                        await testQueryParameter(app, itemUri, 'fields', 'id,name,status');
                        // Resource-specific parameters for item endpoints
                        if (resourceName === 'Machines') {
                            await testQueryParameter(app, itemUri, 'include_config', 'true');
                            await testQueryParameter(app, itemUri, 'include_network', 'true');
                        }
                        else if (resourceName === 'Subnets') {
                            await testQueryParameter(app, itemUri, 'include_statistics', 'true');
                        }
                    });
                }
                // Audit Logging Tests
                it(`should log audit information for GET ${itemUri}`, async () => {
                    apiClientMock.get.mockResolvedValueOnce({
                        data: mockItemData,
                        headers: { 'content-type': 'application/json' }
                    });
                    await (0, supertest_1.default)(app)
                        .get(itemUri)
                        .set('Accept', 'application/json')
                        .set('X-Request-ID', 'test-audit-request-id');
                    expect(auditLoggerMock.log).toHaveBeenCalledWith(expect.objectContaining({
                        requestId: 'test-audit-request-id',
                        action: 'GET',
                        resourceType: resourceName,
                        resourceId: itemId,
                        status: 200
                    }));
                });
            });
            // HTTP Status Code Mapping Tests
            describe('HTTP Status Code Mapping', () => {
                const testCases = [
                    { maasStatus: 400, mcpStatus: 400, description: 'Bad Request' },
                    { maasStatus: 401, mcpStatus: 401, description: 'Unauthorized' },
                    { maasStatus: 403, mcpStatus: 403, description: 'Forbidden' },
                    { maasStatus: 404, mcpStatus: 404, description: 'Not Found' },
                    { maasStatus: 429, mcpStatus: 429, description: 'Too Many Requests' },
                    { maasStatus: 500, mcpStatus: 500, description: 'Internal Server Error' },
                    { maasStatus: 503, mcpStatus: 503, description: 'Service Unavailable' },
                ];
                testCases.forEach(({ maasStatus, mcpStatus, description }) => {
                    it(`should map MAAS ${maasStatus} to MCP ${mcpStatus} (${description}) for collection`, async () => {
                        const headers = maasStatus === 429 ? { 'retry-after': '30' } : {};
                        apiClientMock.get.mockRejectedValueOnce({
                            isAxiosError: true,
                            response: {
                                status: maasStatus,
                                data: { error: description, details: `MAAS returned ${description}` },
                                headers
                            }
                        });
                        const response = await (0, supertest_1.default)(app).get(collectionUri).set('Accept', 'application/json');
                        expect(response.status).toBe(mcpStatus);
                        expect(response.body).toHaveProperty('error');
                        if (maasStatus === 429) {
                            expect(response.headers).toHaveProperty('retry-after', '30');
                        }
                    });
                    it(`should map MAAS ${maasStatus} to MCP ${mcpStatus} (${description}) for item`, async () => {
                        const headers = maasStatus === 429 ? { 'retry-after': '30' } : {};
                        apiClientMock.get.mockRejectedValueOnce({
                            isAxiosError: true,
                            response: {
                                status: maasStatus,
                                data: { error: description, details: `MAAS returned ${description}` },
                                headers
                            }
                        });
                        const response = await (0, supertest_1.default)(app).get(itemUri).set('Accept', 'application/json');
                        expect(response.status).toBe(mcpStatus);
                        expect(response.body).toHaveProperty('error');
                        if (maasStatus === 429) {
                            expect(response.headers).toHaveProperty('retry-after', '30');
                        }
                    });
                });
            });
        });
    };
    // Test suites for each resource type
    testResourceEndpoints({
        resourceName: 'Machines',
        collectionUri: '/mcp/resources/maas/machines',
        itemUriBase: '/mcp/resources/maas/machines',
        itemId: 'machine-1',
        mockCollectionData: mockMachinesData,
        mockItemData: mockMachineDetailsData,
        collectionSchema: index_js_1.MachinesSchema,
        itemSchema: index_js_1.MachineDetailsSchema,
        expectedCacheControl: 'public, max-age=60',
        queryParams: {
            filter: 'status=deployed',
            sort: 'hostname',
            page: '1',
            limit: '25',
            // Machine-specific query parameters
            status: 'deployed',
            power_state: 'on',
            zone: 'default',
            pool: 'default',
            owner: 'admin'
        }
    });
    testResourceEndpoints({
        resourceName: 'Tags',
        collectionUri: '/mcp/resources/maas/tags',
        itemUriBase: '/mcp/resources/maas/tags',
        itemId: 'tag-1',
        mockCollectionData: mockTagsData,
        mockItemData: mockTagDetailsData,
        collectionSchema: index_js_1.TagsSchema,
        itemSchema: index_js_1.TagResourceSchema, // Assuming TagResourceSchema is for individual tag details
        expectedCacheControl: 'public, max-age=300',
        queryParams: {
            filter: 'name=test',
            sort: 'name',
            page: '1',
            limit: '10'
        }
    });
    testResourceEndpoints({
        resourceName: 'Subnets',
        collectionUri: '/mcp/resources/maas/subnets',
        itemUriBase: '/mcp/resources/maas/subnets',
        itemId: 'subnet-1',
        mockCollectionData: mockSubnetsData,
        mockItemData: mockSubnetDetailsData,
        collectionSchema: index_js_1.SubnetsSchema,
        itemSchema: index_js_1.SubnetResourceSchema,
        expectedCacheControl: 'public, max-age=3600',
        queryParams: {
            filter: 'cidr=192.168.1.0/24',
            sort: 'name',
            page: '1',
            limit: '15',
            // Subnet-specific query parameters
            cidr: '192.168.1.0/24',
            vlan: '100',
            space: 'default',
            include_statistics: 'true'
        }
    });
    testResourceEndpoints({
        resourceName: 'Zones',
        collectionUri: '/mcp/resources/maas/zones',
        itemUriBase: '/mcp/resources/maas/zones',
        itemId: 'zone-1',
        mockCollectionData: mockZonesData,
        mockItemData: mockZoneDetailsData,
        collectionSchema: index_js_1.ZonesSchema,
        itemSchema: index_js_1.ZoneResourceSchema,
        expectedCacheControl: 'public, max-age=86400',
        queryParams: {
            filter: 'name=test',
            sort: 'name',
            page: '1',
            limit: '5'
        }
    });
    testResourceEndpoints({
        resourceName: 'Devices',
        collectionUri: '/mcp/resources/maas/devices',
        itemUriBase: '/mcp/resources/maas/devices',
        itemId: 'device-1',
        mockCollectionData: mockDevicesData,
        mockItemData: mockDeviceDetailsData,
        collectionSchema: index_js_1.DevicesSchema,
        itemSchema: index_js_1.DeviceResourceSchema,
        expectedCacheControl: 'public, max-age=60',
        queryParams: {
            filter: 'hostname=test',
            sort: 'hostname',
            page: '1',
            limit: '20'
        }
    });
    testResourceEndpoints({
        resourceName: 'Domains',
        collectionUri: '/mcp/resources/maas/domains',
        itemUriBase: '/mcp/resources/maas/domains',
        itemId: 'domain-1',
        mockCollectionData: mockDomainsData,
        mockItemData: mockDomainDetailsData,
        collectionSchema: index_js_1.DomainsSchema,
        itemSchema: index_js_1.DomainResourceSchema,
        expectedCacheControl: 'public, max-age=3600',
        queryParams: {
            filter: 'name=test',
            sort: 'name',
            page: '1',
            limit: '10'
        }
    });
});
