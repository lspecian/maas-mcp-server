"use strict";
/**
 * @file MaasMockFactory.ts
 *
 * Provides a factory for creating and configuring mock MaasApiClient instances
 * with consistent patterns and flexible configuration options for testing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaasMockFactory = void 0;
const mockMaasApiClient_js_1 = require("./mockMaasApiClient.js"); // Assuming this is the base mock client
const index_js_1 = require("../../types/index.js");
class MaasMockFactory {
    options;
    constructor(defaultOptions = {}) {
        this.options = { ...defaultOptions };
    }
    /**
     * Sets the response to return for successful requests.
     * @param response The success response data.
     * @returns The factory instance for chaining.
     */
    withSuccessResponse(response) {
        this.options.successResponse = response;
        return this;
    }
    /**
     * Sets the error to throw for failed requests.
     * @param errorResponse The error object or message.
     * @param statusCode Optional HTTP status code for the error.
     * @returns The factory instance for chaining.
     */
    withErrorResponse(errorResponse, statusCode) {
        this.options.errorResponse = errorResponse;
        if (statusCode !== undefined) {
            this.options.statusCode = statusCode;
        }
        return this;
    }
    /**
     * Configures basic network delay and jitter.
     * @param delayMs Milliseconds to delay.
     * @param jitterMs Maximum additional random delay (jitter).
     * @returns The factory instance for chaining.
     */
    withNetworkDelay(delayMs, jitterMs = 0) {
        this.options.simulateNetworkDelay = delayMs;
        this.options.networkJitterMs = jitterMs;
        return this;
    }
    /**
     * Configures network timeout simulation.
     * @param timeoutMs Timeout duration in milliseconds.
     * @returns The factory instance for chaining.
     */
    withTimeout(timeoutMs = 30000) {
        this.options.simulateTimeout = true;
        this.options.timeoutMs = timeoutMs;
        return this;
    }
    /**
     * Configures response pagination.
     * @param itemsPerPage Number of items per page.
     * @returns The factory instance for chaining.
     */
    withPagination(itemsPerPage = 10) {
        this.options.simulatePagination = true;
        this.options.itemsPerPage = itemsPerPage;
        return this;
    }
    /**
     * Configures rate limiting simulation.
     * @param threshold Maximum requests before rate limiting.
     * @param statusCode HTTP status code for rate limit response.
     * @returns The factory instance for chaining.
     */
    withRateLimiting(threshold = 10, statusCode = 429) {
        this.options.simulateRateLimiting = true;
        this.options.rateLimitThreshold = threshold;
        this.options.rateLimitStatusCode = statusCode;
        return this;
    }
    /**
     * Configures intermittent failures.
     * @param probability Probability of failure (0-1).
     * @param pattern Failure pattern ('random', 'every-n', 'specific-endpoints').
     * @param interval Interval for 'every-n' pattern.
     * @param endpoints Endpoints for 'specific-endpoints' pattern.
     * @returns The factory instance for chaining.
     */
    withIntermittentFailures(probability = 0.2, pattern = 'random', interval = 3, endpoints = []) {
        this.options.simulateIntermittentFailures = true;
        this.options.intermittentFailureProbability = probability;
        this.options.intermittentFailurePattern = pattern;
        this.options.intermittentFailureInterval = interval;
        this.options.intermittentFailureEndpoints = endpoints;
        return this;
    }
    /**
     * Configures specific HTTP error codes for endpoints.
     * @param errors A record mapping endpoint patterns to HTTP status codes.
     * @returns The factory instance for chaining.
     */
    withSpecificErrors(errors) {
        this.options.specificErrors = { ...(this.options.specificErrors || {}), ...errors };
        return this;
    }
    /**
     * Configures variable latency based on response size.
     * @param latencyPerKb Milliseconds of latency per KB of data.
     * @returns The factory instance for chaining.
     */
    withVariableLatency(latencyPerKb = 10) {
        this.options.simulateVariableLatency = true;
        this.options.latencyPerKb = latencyPerKb;
        return this;
    }
    /**
     * Configures bandwidth limitation simulation.
     * @param bandwidthKBps Simulated bandwidth in KB per second.
     * @returns The factory instance for chaining.
     */
    withBandwidthLimits(bandwidthKBps = 100) {
        this.options.simulateBandwidthLimits = true;
        this.options.bandwidthKBps = bandwidthKBps;
        return this;
    }
    /**
     * Configures connection drop simulation.
     * @param probability Probability (0-1) of a connection drop.
     * @returns The factory instance for chaining.
     */
    withConnectionDrops(probability = 0.05) {
        this.options.simulateConnectionDrops = true;
        this.options.connectionDropProbability = probability;
        return this;
    }
    /**
     * Configures progressive degradation simulation.
     * @param degradationFactor Factor to increase delay with each request.
     * @param maxMultiplier Maximum degradation multiplier.
     * @returns The factory instance for chaining.
     */
    withProgressiveDegradation(degradationFactor = 1.1, maxMultiplier = 10) {
        this.options.simulateProgressiveDegradation = true;
        this.options.degradationFactor = degradationFactor;
        this.options.maxDegradationMultiplier = maxMultiplier;
        return this;
    }
    /**
     * Configures geographic latency simulation.
     * @param location Simulated geographic location.
     * @param latencyMap Custom latency map.
     * @returns The factory instance for chaining.
     */
    withGeographicLatency(location = 'local', latencyMap) {
        this.options.simulateGeographicLatency = true;
        this.options.geographicLocation = location;
        if (latencyMap) {
            this.options.geographicLatencyMap = latencyMap;
        }
        return this;
    }
    /**
     * Allows setting any specific option directly.
     * @param options Partial options to merge.
     * @returns The factory instance for chaining.
     */
    withOptions(options) {
        this.options = { ...this.options, ...options };
        return this;
    }
    /**
     * Builds and returns the configured mock MaasApiClient.
     * @returns A mocked MaasApiClient instance.
     */
    create() {
        // Ensure a default success response if none is set and no error is set
        if (this.options.successResponse === undefined && this.options.errorResponse === undefined) {
            this.options.successResponse = mockMaasApiClient_js_1.mockMachines;
        }
        return (0, mockMaasApiClient_js_1.createMockMaasApiClient)(this.options);
    }
    // --- Predefined Configurations ---
    /**
     * Creates a client with default successful responses.
     */
    static defaultClient() {
        return new MaasMockFactory().create();
    }
    /**
     * Creates a client that returns empty results.
     */
    static emptyClient() {
        return new MaasMockFactory({ successResponse: [] }).create();
    }
    /**
     * Creates a client that simulates network timeouts.
     */
    static timeoutClient(timeoutMs = 30000) {
        return new MaasMockFactory().withTimeout(timeoutMs).create();
    }
    /**
     * Creates a client that simulates slow network responses.
     * (Corresponds to baseMockConfigs.slow)
     */
    static slowClient(delay = 500) {
        return new MaasMockFactory().withNetworkDelay(delay).create();
    }
    /**
     * Creates a client that simulates high latency network conditions.
     * (Corresponds to integrationMockConfigs.highLatency)
     */
    static highLatencyClient(delay = 2000, jitter = 1000) {
        return new MaasMockFactory().withNetworkDelay(delay, jitter).create();
    }
    /**
     * Creates a client that returns 404 Not Found errors.
     */
    static notFoundClient() {
        return new MaasMockFactory({
            errorResponse: new index_js_1.MaasApiError('Resource not found', 404, 'not_found', {
                error: 'not_found',
                detail: 'The requested resource could not be found'
            })
        }).create();
    }
    /**
     * Creates a client that returns 500 Internal Server errors.
     */
    static serverErrorClient() {
        return new MaasMockFactory({
            errorResponse: new index_js_1.MaasApiError('Internal server error', 500, 'server_error', {
                error: 'server_error',
                detail: 'An unexpected error occurred on the server'
            })
        }).create();
    }
    /**
     * Creates a client that returns 401 Unauthorized errors.
     */
    static unauthorizedClient() {
        return new MaasMockFactory({
            errorResponse: new index_js_1.MaasApiError('Unauthorized access', 401, 'unauthorized', {
                error: 'unauthorized',
                detail: 'Authentication credentials were not provided or are invalid'
            })
        }).create();
    }
    /**
     * Creates a client that returns 403 Forbidden errors.
     */
    static forbiddenClient() {
        return new MaasMockFactory({
            errorResponse: new index_js_1.MaasApiError('Forbidden', 403, 'forbidden', {
                error: 'forbidden',
                detail: 'You do not have permission to perform this action'
            })
        }).create();
    }
    /**
     * Creates a client that returns 422 Validation errors.
     */
    static validationErrorClient() {
        return new MaasMockFactory({
            errorResponse: new index_js_1.MaasApiError('Validation error', 422, 'validation_error', {
                error: 'validation_error',
                detail: 'The request data failed validation',
                fields: {
                    name: ['This field is required'],
                    value: ['Must be a positive number']
                }
            })
        }).create();
    }
    /**
     * Creates a client that simulates paginated responses.
     */
    static paginatedClient(itemsPerPage = 10) {
        return new MaasMockFactory().withPagination(itemsPerPage).create();
    }
    /**
     * Creates a client that simulates flaky network with random errors.
     * (Corresponds to integrationMockConfigs.flaky)
     */
    static flakyClient(errorProbability = 0.3, networkDelayMs = 100) {
        return new MaasMockFactory()
            .withNetworkDelay(networkDelayMs)
            .withIntermittentFailures(errorProbability, 'random') // Using intermittent as a proxy for general random errors
            .create();
    }
    /**
     * Creates a client that simulates rate limiting.
     * (Corresponds to integrationMockConfigs.rateLimited)
     */
    static rateLimitedClient(threshold = 3, networkDelayMs = 100) {
        return new MaasMockFactory()
            .withNetworkDelay(networkDelayMs)
            .withRateLimiting(threshold)
            .create();
    }
    /**
     * Creates a client that simulates realistic network conditions.
     * (Corresponds to baseMockConfigs.realisticNetwork)
     */
    static realisticNetworkClient() {
        // Replicating options from baseMockConfigs.realisticNetwork
        return new MaasMockFactory({
            simulateNetworkDelay: 100,
            networkJitterMs: 50,
            simulateVariableLatency: true,
            latencyPerKb: 10,
            simulateConnectionDrops: true,
            connectionDropProbability: 0.02,
            simulateIntermittentFailures: true,
            intermittentFailureProbability: 0.05
        }).create();
    }
    /**
     * Creates a client that simulates variable latency.
     */
    static variableLatencyClient(latencyPerKb = 20, baseDelay = 50) {
        return new MaasMockFactory()
            .withNetworkDelay(baseDelay)
            .withVariableLatency(latencyPerKb)
            .create();
    }
    /**
     * Creates a client that simulates limited bandwidth.
     */
    static limitedBandwidthClient(kbps = 50) {
        return new MaasMockFactory().withBandwidthLimits(kbps).create();
    }
    /**
     * Creates a client that simulates connection drops.
     */
    static connectionDropsClient(probability = 0.2) {
        return new MaasMockFactory().withConnectionDrops(probability).create();
    }
    /**
     * Creates a client that simulates progressive degradation.
     */
    static progressiveDegradationClient(baseDelay = 50, factor = 1.2) {
        return new MaasMockFactory()
            .withNetworkDelay(baseDelay)
            .withProgressiveDegradation(factor)
            .create();
    }
    /**
     * Creates a client that simulates geographic latency.
     */
    static geographicLatencyClient(location = 'global') {
        return new MaasMockFactory().withGeographicLatency(location).create();
    }
}
exports.MaasMockFactory = MaasMockFactory;
// Example usage (for testing the factory itself, or for documentation)
/*
const factory = new MaasMockFactory();

const defaultClient = factory.create();
const slowClient = factory.withNetworkDelay(1000).create();
const errorClient = factory.withErrorResponse(new MaasApiError('Test Error', 500)).create();
const paginatedClient = factory.withPagination(5).create();

const staticSlowClient = MaasMockFactory.slowClient(2000);
const staticRealisticClient = MaasMockFactory.realisticNetworkClient();
*/ 
