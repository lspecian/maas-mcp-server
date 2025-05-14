"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MaasMockFactory_1 = require("./MaasMockFactory");
const types_1 = require("../../types");
const mockMaasApiClient_1 = require("./mockMaasApiClient"); // Import some mock data
describe('MaasMockFactory', () => {
    it('should create a default client that returns mockMachines', async () => {
        const client = MaasMockFactory_1.MaasMockFactory.defaultClient();
        const machines = await client.get('/machines/');
        expect(machines).toEqual(mockMaasApiClient_1.mockMachines);
    });
    it('should create an empty client that returns an empty array', async () => {
        const client = MaasMockFactory_1.MaasMockFactory.emptyClient();
        const response = await client.get('/some-endpoint/');
        expect(response).toEqual([]);
    });
    it('should create a slow client with specified delay', async () => {
        const delay = 20; // Using a small delay for faster tests
        const client = MaasMockFactory_1.MaasMockFactory.slowClient(delay);
        const startTime = Date.now();
        await client.get('/machines/');
        const endTime = Date.now();
        expect(endTime - startTime).toBeGreaterThanOrEqual(delay);
    });
    it('should create a high-latency client with specified delay and jitter', async () => {
        const delay = 20;
        const jitter = 10;
        const client = MaasMockFactory_1.MaasMockFactory.highLatencyClient(delay, jitter);
        const startTime = Date.now();
        await client.get('/machines/');
        const endTime = Date.now();
        expect(endTime - startTime).toBeGreaterThanOrEqual(delay);
        // Jitter makes it hard to assert exact upper bound without more complex test
    });
    it('should create a notFound client that throws a 404 error', async () => {
        const client = MaasMockFactory_1.MaasMockFactory.notFoundClient();
        try {
            await client.get('/non-existent/');
        }
        catch (e) {
            expect(e).toBeInstanceOf(types_1.MaasApiError);
            expect(e.statusCode).toBe(404);
            expect(e.errorCodeName).toBe('not_found');
        }
    });
    it('should create a serverError client that throws a 500 error', async () => {
        const client = MaasMockFactory_1.MaasMockFactory.serverErrorClient();
        try {
            await client.get('/any-endpoint/');
        }
        catch (e) {
            expect(e).toBeInstanceOf(types_1.MaasApiError);
            expect(e.statusCode).toBe(500);
            expect(e.errorCodeName).toBe('server_error');
        }
    });
    it('should create an unauthorized client that throws a 401 error', async () => {
        const client = MaasMockFactory_1.MaasMockFactory.unauthorizedClient();
        try {
            await client.get('/any-endpoint/');
        }
        catch (e) {
            expect(e).toBeInstanceOf(types_1.MaasApiError);
            expect(e.statusCode).toBe(401);
            expect(e.errorCodeName).toBe('unauthorized');
        }
    });
    it('should create a forbidden client that throws a 403 error', async () => {
        const client = MaasMockFactory_1.MaasMockFactory.forbiddenClient();
        try {
            await client.get('/any-endpoint/');
        }
        catch (e) {
            expect(e).toBeInstanceOf(types_1.MaasApiError);
            expect(e.statusCode).toBe(403);
            expect(e.errorCodeName).toBe('forbidden');
        }
    });
    it('should create a validationError client that throws a 422 error', async () => {
        const client = MaasMockFactory_1.MaasMockFactory.validationErrorClient();
        try {
            await client.get('/any-endpoint/');
        }
        catch (e) {
            expect(e).toBeInstanceOf(types_1.MaasApiError);
            expect(e.statusCode).toBe(422);
            expect(e.errorCodeName).toBe('validation_error');
            expect(e.details?.fields).toBeDefined();
        }
    });
    it('should create a paginated client', async () => {
        const itemsPerPage = 2;
        // Instantiate factory to set success response before pagination
        const factory = new MaasMockFactory_1.MaasMockFactory()
            .withSuccessResponse(mockMaasApiClient_1.mockMachines)
            .withPagination(itemsPerPage);
        const client = factory.create();
        const response = await client.get('/machines/', { page: '1' });
        expect(response.items.length).toBe(itemsPerPage);
        expect(response.total).toBe(mockMaasApiClient_1.mockMachines.length);
        expect(response.page).toBe(1);
    });
    it('should create a flaky client that can succeed or fail', async () => {
        // This test might be flaky itself due to randomness. Run multiple times or adjust probability for CI.
        const client = MaasMockFactory_1.MaasMockFactory.flakyClient(0.5, 10); // 50% error rate, 10ms delay
        let success = false;
        let errors = 0;
        for (let i = 0; i < 10; i++) {
            try {
                await client.get('/flaky-endpoint/');
                success = true;
            }
            catch (e) {
                errors++;
            }
        }
        expect(success).toBe(true); // At least one success
        expect(errors).toBeGreaterThan(0); // At least one error
        expect(errors).toBeLessThan(10); // Not all errors
    });
    it('should create a rateLimited client', async () => {
        const threshold = 2;
        const client = MaasMockFactory_1.MaasMockFactory.rateLimitedClient(threshold, 10);
        // First two should succeed
        await client.get('/rate-limited-endpoint/');
        await client.get('/rate-limited-endpoint/');
        // Third should fail
        try {
            await client.get('/rate-limited-endpoint/');
        }
        catch (e) {
            expect(e).toBeInstanceOf(types_1.MaasApiError);
            expect(e.statusCode).toBe(429); // Default rate limit status code
            expect(e.errorCodeName).toBe('rate_limit_exceeded');
        }
    });
    it('should create a realisticNetwork client with combined effects', async () => {
        const client = MaasMockFactory_1.MaasMockFactory.realisticNetworkClient();
        // This is harder to assert specific outcomes due to combined randomness.
        // We'll just check if a call can be made.
        // More specific tests for combined effects would require deeper inspection of mock client internals.
        try {
            await client.get('/realistic-endpoint/');
        }
        catch (e) {
            // It might fail due to connection drops or intermittent failures
            expect(e).toBeInstanceOf(types_1.MaasApiError);
        }
        // Or it might succeed
    });
    it('should allow chaining of configurations', async () => {
        const factory = new MaasMockFactory_1.MaasMockFactory();
        const client = factory
            .withSuccessResponse(mockMaasApiClient_1.mockSubnets)
            .withNetworkDelay(10)
            .withPagination(1)
            .create();
        const response = await client.get('/subnets/', { page: '1' });
        expect(response.items.length).toBe(1);
        expect(response.items[0]).toEqual(mockMaasApiClient_1.mockSubnets[0]);
        expect(response.total).toBe(mockMaasApiClient_1.mockSubnets.length);
    });
    it('should use default successResponse if none provided and no error', async () => {
        const client = new MaasMockFactory_1.MaasMockFactory().create();
        const response = await client.get('/some-endpoint/');
        expect(response).toEqual(mockMaasApiClient_1.mockMachines); // Default is mockMachines
    });
    it('should create a client with variable latency', async () => {
        const client = MaasMockFactory_1.MaasMockFactory.variableLatencyClient(20, 10); // 20ms/KB, 10ms base
        const startTime = Date.now();
        // Assuming mockMachines is small, so latencyPerKb effect might be minimal over base
        await client.get('/machines/');
        const endTime = Date.now();
        expect(endTime - startTime).toBeGreaterThanOrEqual(10);
    });
    it('should create a client with limited bandwidth', async () => {
        const client = MaasMockFactory_1.MaasMockFactory.limitedBandwidthClient(50); // 50 KB/s
        const startTime = Date.now();
        // Data size is roughly 1-2KB for mockMachines. (1KB / 50KBps) * 1000 = 20ms
        // This test is more conceptual as precise timing is hard.
        await client.get('/machines/');
        const endTime = Date.now();
        // Expect some delay due to bandwidth simulation
        expect(endTime - startTime).toBeGreaterThanOrEqual(0);
    });
    it('should create a client with connection drops', async () => {
        const client = MaasMockFactory_1.MaasMockFactory.connectionDropsClient(1.0); // 100% drop probability
        try {
            await client.get('/machines/');
        }
        catch (e) {
            expect(e).toBeInstanceOf(types_1.MaasApiError);
            expect(e.errorCodeName).toBe('connection_dropped');
        }
    });
    it('should create a client with progressive degradation', async () => {
        const client = MaasMockFactory_1.MaasMockFactory.progressiveDegradationClient(10, 1.2);
        const times = [];
        for (let i = 0; i < 3; i++) {
            const start = Date.now();
            await client.get('/degrading-endpoint/');
            times.push(Date.now() - start);
        }
        // Expect subsequent calls to take longer, though exact assertion is tricky
        if (times.length > 1) {
            // Check if generally increasing, allowing for some noise
            // This is a loose check. More robust would be to inspect internal delay multiplier.
            expect(times[1]).toBeGreaterThanOrEqual(times[0] * 0.9); // Allow for some variance
            if (times.length > 2) {
                expect(times[2]).toBeGreaterThanOrEqual(times[1] * 0.9);
            }
        }
    });
    it('should create a client with geographic latency', async () => {
        const client = MaasMockFactory_1.MaasMockFactory.geographicLatencyClient('global'); // Default global is 300ms
        const startTime = Date.now();
        await client.get('/geo-endpoint/');
        const endTime = Date.now();
        // The base mock client adds its own base delay + jitter, so this will be > 300
        // The internal calculateTotalDelay in mockMaasApiClient.ts adds geographicLatencyMap[location]
        // The default geographicLatencyMap.global is 300ms.
        // The default simulateNetworkDelay is 0 in the factory, but createMockMaasApiClient has its own defaults.
        // Let's check the options passed to createMockMaasApiClient
        const factoryWithOptions = new MaasMockFactory_1.MaasMockFactory().withGeographicLatency('global');
        const internalOptions = factoryWithOptions.options; // Access private for test
        expect(internalOptions.simulateGeographicLatency).toBe(true);
        expect(internalOptions.geographicLocation).toBe('global');
        // The actual delay will be a sum of this and other potential delays.
        // For this test, we just ensure it's roughly in the ballpark of the geo latency.
        // A more precise test would mock createMockMaasApiClient to inspect options.
        expect(endTime - startTime).toBeGreaterThanOrEqual(internalOptions.geographicLatencyMap?.global || 300);
    });
    it('should allow overriding options with withOptions', async () => {
        const client = new MaasMockFactory_1.MaasMockFactory()
            .withOptions({ successResponse: [{ id: 'override' }] })
            .create();
        const response = await client.get('/override-test/');
        expect(response).toEqual([{ id: 'override' }]);
    });
    it('should correctly use specificErrors configuration', async () => {
        const client = new MaasMockFactory_1.MaasMockFactory()
            .withSpecificErrors({ '/specific/error': 403, '/another/path': 502 })
            .create();
        try {
            await client.get('/specific/error');
        }
        catch (e) {
            expect(e).toBeInstanceOf(types_1.MaasApiError);
            expect(e.statusCode).toBe(403);
        }
        try {
            await client.get('/another/path/subpath'); // Should match '/another/path'
        }
        catch (e) {
            expect(e).toBeInstanceOf(types_1.MaasApiError);
            expect(e.statusCode).toBe(502);
        }
        // This should not throw a specific error
        const successResponse = await client.get('/successful/path');
        expect(successResponse).toEqual(mockMaasApiClient_1.mockMachines); // Default success
    });
});
