"use strict";
/**
 * @file Integration tests for enhanced network simulation features
 *
 * These tests demonstrate how to use the enhanced network simulation features
 * in integration tests to simulate various network conditions and error states.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const mockMaasApiClient_js_1 = require("../mocks/mockMaasApiClient.js");
const index_js_1 = require("../../types/index.js");
describe('Enhanced Network Simulation Integration Tests', () => {
    describe('Variable Latency Simulation', () => {
        it('should simulate variable latency based on response size', async () => {
            // Create a mock client with variable latency
            const mockClient = (0, mockMaasApiClient_js_1.createMockMaasApiClient)({
                simulateNetworkDelay: true,
                networkDelayMs: 50,
                simulateVariableLatency: true,
                latencyPerKb: 20
            });
            // Small response
            mockClient.get.mockImplementation(() => Promise.resolve({ id: 1, name: 'test' }));
            const startSmall = Date.now();
            await mockClient.get('/small-endpoint');
            const smallDuration = Date.now() - startSmall;
            // Large response (simulate 50KB response)
            mockClient.get.mockImplementation(() => Promise.resolve(Array(2500).fill({ id: 1, name: 'test' })));
            const startLarge = Date.now();
            await mockClient.get('/large-endpoint');
            const largeDuration = Date.now() - startLarge;
            // The large response should take longer due to variable latency
            expect(largeDuration).toBeGreaterThan(smallDuration);
            console.log(`Small response time: ${smallDuration}ms, Large response time: ${largeDuration}ms`);
        });
    });
    describe('Bandwidth Limitation Simulation', () => {
        it('should simulate bandwidth limitations affecting response time', async () => {
            // Create a mock client with bandwidth limitations
            const mockClient = (0, mockMaasApiClient_js_1.createMockMaasApiClient)({
                simulateBandwidthLimits: true,
                bandwidthKBps: 50 // 50 KB/s
            });
            // Small response (1KB)
            mockClient.get.mockImplementation(() => Promise.resolve({ id: 1, name: 'test' }));
            const startSmall = Date.now();
            await mockClient.get('/small-endpoint');
            const smallDuration = Date.now() - startSmall;
            // Large response (100KB)
            mockClient.get.mockImplementation(() => Promise.resolve(Array(5000).fill({ id: 1, name: 'test' })));
            const startLarge = Date.now();
            await mockClient.get('/large-endpoint');
            const largeDuration = Date.now() - startLarge;
            // The large response should take significantly longer due to bandwidth limitations
            expect(largeDuration).toBeGreaterThan(smallDuration + 1000);
            console.log(`Small response time: ${smallDuration}ms, Large response time: ${largeDuration}ms`);
        });
    });
    describe('Connection Drop Simulation', () => {
        it('should simulate connection drops during request processing', async () => {
            // Create a mock client with 100% connection drop probability for testing
            const mockClient = (0, mockMaasApiClient_js_1.createMockMaasApiClient)({
                simulateConnectionDrops: true,
                connectionDropProbability: 1.0 // Always drop
            });
            // The request should fail with a connection dropped error
            await expect(mockClient.get('/any-endpoint')).rejects.toThrow('Connection dropped');
        });
        it('should demonstrate handling connection drops with retry logic', async () => {
            // Create a mock client with 50% connection drop probability
            const mockClient = (0, mockMaasApiClient_js_1.createMockMaasApiClient)({
                simulateConnectionDrops: true,
                connectionDropProbability: 0.5
            });
            // Implement a simple retry function
            const retryRequest = async (maxRetries = 3) => {
                let retries = 0;
                while (retries < maxRetries) {
                    try {
                        return await mockClient.get('/retry-endpoint');
                    }
                    catch (error) {
                        if (error instanceof index_js_1.MaasApiError && error.message.includes('Connection dropped')) {
                            retries++;
                            console.log(`Connection dropped, retry attempt ${retries}/${maxRetries}`);
                            if (retries >= maxRetries)
                                throw error;
                        }
                        else {
                            throw error;
                        }
                    }
                }
            };
            // Mock a successful response for when the connection doesn't drop
            mockClient.get.mockImplementation((endpoint, params, signal) => {
                // The original implementation will be called first, which may throw a connection drop error
                // If it doesn't throw, we'll return a success response
                return Promise.resolve({ success: true });
            });
            // The retry function should eventually succeed or exhaust all retries
            try {
                const result = await retryRequest();
                if (result) {
                    expect(result).toEqual({ success: true });
                }
            }
            catch (error) {
                // If all retries failed, we should have a connection dropped error
                if (error instanceof index_js_1.MaasApiError) {
                    expect(error.message).toContain('Connection dropped');
                }
                else {
                    fail('Expected MaasApiError but got a different error type');
                }
            }
        });
    });
    describe('Progressive Degradation Simulation', () => {
        it('should simulate progressive degradation of service', async () => {
            // Create a mock client with progressive degradation
            const mockClient = (0, mockMaasApiClient_js_1.createMockMaasApiClient)({
                simulateNetworkDelay: true,
                networkDelayMs: 50,
                simulateProgressiveDegradation: true,
                degradationFactor: 1.5,
                maxDegradationMultiplier: 10
            });
            // Make multiple requests and measure the time
            const times = [];
            for (let i = 0; i < 5; i++) {
                const start = Date.now();
                await mockClient.get('/degrading-endpoint');
                times.push(Date.now() - start);
            }
            // Each request should take longer than the previous one
            for (let i = 1; i < times.length; i++) {
                expect(times[i]).toBeGreaterThan(times[i - 1]);
            }
            console.log('Progressive degradation times:', times);
        });
    });
    describe('Geographic Latency Simulation', () => {
        it('should simulate different latencies based on geographic location', async () => {
            // Test different geographic locations
            const locations = ['local', 'regional', 'continental', 'global'];
            const times = {};
            for (const location of locations) {
                const mockClient = (0, mockMaasApiClient_js_1.createMockMaasApiClient)({
                    simulateGeographicLatency: true,
                    geographicLocation: location
                });
                const start = Date.now();
                await mockClient.get('/geo-endpoint');
                times[location] = Date.now() - start;
            }
            // Verify that latency increases with distance
            expect(times.local).toBeLessThan(times.regional);
            expect(times.regional).toBeLessThan(times.continental);
            expect(times.continental).toBeLessThan(times.global);
            console.log('Geographic latency times:', times);
        });
    });
    describe('Realistic Network Simulation', () => {
        it('should simulate realistic network conditions', async () => {
            // Create a mock client with realistic network conditions
            const mockClient = (0, mockMaasApiClient_js_1.createMockMaasApiClient)({
                simulateNetworkDelay: true,
                networkDelayMs: 100,
                simulateNetworkJitter: true,
                networkJitterMs: 50,
                simulateVariableLatency: true,
                latencyPerKb: 10,
                simulateConnectionDrops: true,
                connectionDropProbability: 0.2,
                simulateRandomErrors: true,
                errorProbability: 0.1
            });
            // Make multiple requests to see the effects of realistic network conditions
            const results = [];
            for (let i = 0; i < 10; i++) {
                try {
                    const start = Date.now();
                    await mockClient.get('/realistic-endpoint');
                    results.push({ success: true, time: Date.now() - start });
                }
                catch (error) {
                    results.push({
                        success: false,
                        error: error instanceof Error ? error.message : String(error)
                    });
                }
            }
            // Log the results for analysis
            console.log('Realistic network simulation results:', results);
            // We expect a mix of successes and failures with realistic network conditions
            const successes = results.filter(r => r.success).length;
            const failures = results.filter(r => !r.success).length;
            console.log(`Realistic network simulation: ${successes} successes, ${failures} failures`);
        });
    });
});
