"use strict";
/**
 * Mock MAAS API Client for Integration Tests
 *
 * This module provides a configurable mock implementation of the MaasApiClient
 * specifically designed for integration tests. It extends the unit test mock
 * with additional functionality for simulating realistic API behavior.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockClientConfigs = exports.mockData = void 0;
exports.createMockMaasApiClient = createMockMaasApiClient;
const mockMaasApiClient_js_1 = require("../../__tests__/mocks/mockMaasApiClient.js");
const maas_js_1 = require("../../types/maas.js");
const crypto_1 = require("crypto");
/**
 * Utility function to generate realistic timestamps
 * @returns ISO string timestamp
 */
const generateTimestamp = () => new Date().toISOString();
/**
 * Utility function to generate realistic IDs
 * @returns UUID string
 */
const generateId = () => (0, crypto_1.randomUUID)();
/**
 * Extended mock data for integration tests
 */
exports.mockData = {
    // Machine data
    machines: mockMaasApiClient_js_1.mockMachines,
    readyMachine: mockMaasApiClient_js_1.mockMachines[0],
    deployedMachine: mockMaasApiClient_js_1.mockMachines[1],
    // Network data
    subnets: mockMaasApiClient_js_1.mockSubnets,
    // Zone data
    zones: mockMaasApiClient_js_1.mockZones,
    // Tag data
    tags: mockMaasApiClient_js_1.mockTags,
    // Domain data
    domains: mockMaasApiClient_js_1.mockDomains,
    // Device data
    devices: mockMaasApiClient_js_1.mockDevices,
    // Script data
    scripts: [
        {
            id: 1,
            name: "commissioning-script-1",
            description: "Test commissioning script",
            tags: ["commissioning"],
            type: "commissioning",
            timeout: 60,
            created: "2025-03-10T09:30:00Z",
            updated: "2025-05-01T11:45:22Z"
        },
        {
            id: 2,
            name: "testing-script-1",
            description: "Test hardware testing script",
            tags: ["testing"],
            type: "testing",
            timeout: 120,
            created: "2025-03-15T14:20:00Z",
            updated: "2025-05-02T16:30:15Z"
        }
    ],
    // Image data
    images: [
        {
            id: 1,
            name: "ubuntu/focal",
            architecture: "amd64/generic",
            type: "os",
            size: 1024000,
            created: "2025-01-15T08:30:45Z",
            updated: "2025-05-10T14:22:18Z"
        },
        {
            id: 2,
            name: "ubuntu/jammy",
            architecture: "amd64/generic",
            type: "os",
            size: 1536000,
            created: "2025-02-20T10:15:30Z",
            updated: "2025-05-12T09:45:22Z"
        }
    ],
    // DHCP snippets
    dhcpSnippets: [
        {
            id: 1,
            name: "dns-servers",
            description: "Custom DNS servers",
            value: "option domain-name-servers 8.8.8.8, 8.8.4.4;",
            enabled: true,
            created: "2025-03-10T09:30:00Z",
            updated: "2025-05-01T11:45:22Z"
        },
        {
            id: 2,
            name: "ntp-servers",
            description: "Custom NTP servers",
            value: "option ntp-servers 0.pool.ntp.org, 1.pool.ntp.org;",
            enabled: true,
            created: "2025-03-15T14:20:00Z",
            updated: "2025-05-02T16:30:15Z"
        }
    ],
    // Resource pools
    resourcePools: [
        {
            id: 1,
            name: "default",
            description: "Default pool",
            created: "2024-12-01T00:00:00Z"
        },
        {
            id: 2,
            name: "production",
            description: "Production pool",
            created: "2025-01-15T14:30:00Z"
        },
        {
            id: 3,
            name: "testing",
            description: "Testing pool",
            created: "2025-02-20T09:15:00Z"
        }
    ]
};
/**
 * Create a mock MAAS API client for integration tests
 *
 * @param options Configuration options
 * @returns Mock MAAS API client
 */
function createMockMaasApiClient(options = {}) {
    const { simulateNetworkDelay = false, networkDelayMs = 100, simulateNetworkJitter = false, networkJitterMs = 50, simulateRandomErrors = false, errorProbability = 0.1, simulateSpecificErrors = false, specificErrors = {}, simulateTimeouts = false, timeoutProbability = 0.05, timeoutMs = 30000, simulatePagination = false, itemsPerPage = 10, simulateRetries = false, retriesBeforeSuccess = 2, simulateRateLimiting = false, rateLimitThreshold = 5, rateLimitStatusCode = 429, simulateIntermittentFailures = false, intermittentFailureProbability = 0.2, intermittentFailurePattern = 'random', intermittentFailureInterval = 3, intermittentFailureEndpoints = [], customHandlers = {}, 
    // New options for enhanced network simulation
    simulateVariableLatency = false, latencyPerKb = 10, simulateBandwidthLimits = false, bandwidthKBps = 100, simulateConnectionDrops = false, connectionDropProbability = 0.05, simulateProgressiveDegradation = false, degradationFactor = 1.1, maxDegradationMultiplier = 10, simulateGeographicLatency = false, geographicLocation = 'local', geographicLatencyMap = {
        local: 10,
        regional: 50,
        continental: 100,
        global: 300
    } } = options;
    // Create the base mock client with enhanced network simulation options
    const mockClient = (0, mockMaasApiClient_js_1.createMockMaasApiClient)({
        simulateNetworkDelay: simulateNetworkDelay ? networkDelayMs : 0,
        networkJitterMs: simulateNetworkJitter ? networkJitterMs : 0,
        simulateTimeout: simulateTimeouts,
        timeoutMs: timeoutMs,
        simulatePagination: simulatePagination,
        itemsPerPage: itemsPerPage,
        simulateRateLimiting: simulateRateLimiting,
        rateLimitThreshold: rateLimitThreshold,
        rateLimitStatusCode: rateLimitStatusCode,
        simulateIntermittentFailures: simulateIntermittentFailures,
        intermittentFailureProbability: intermittentFailureProbability,
        intermittentFailurePattern: intermittentFailurePattern,
        intermittentFailureInterval: intermittentFailureInterval,
        intermittentFailureEndpoints: intermittentFailureEndpoints,
        specificErrors: simulateSpecificErrors ? specificErrors : {},
        // New network simulation options
        simulateVariableLatency: simulateVariableLatency,
        latencyPerKb: latencyPerKb,
        simulateBandwidthLimits: simulateBandwidthLimits,
        bandwidthKBps: bandwidthKBps,
        simulateConnectionDrops: simulateConnectionDrops,
        connectionDropProbability: connectionDropProbability,
        simulateProgressiveDegradation: simulateProgressiveDegradation,
        degradationFactor: degradationFactor,
        maxDegradationMultiplier: maxDegradationMultiplier,
        simulateGeographicLatency: simulateGeographicLatency,
        geographicLocation: geographicLocation,
        geographicLatencyMap: geographicLatencyMap
    });
    // Add delay function with jitter and other network simulation features
    const delay = (ms, dataSize = 1) => {
        // Base delay with jitter
        const jitter = simulateNetworkJitter ? Math.floor(Math.random() * networkJitterMs) : 0;
        let totalDelay = ms + jitter;
        // Apply variable latency based on data size
        if (simulateVariableLatency) {
            // Convert to KB and apply latency per KB
            const sizeInKb = Math.max(1, Math.ceil(dataSize / 1024));
            totalDelay += sizeInKb * latencyPerKb;
        }
        // Apply bandwidth limitations
        if (simulateBandwidthLimits) {
            // Calculate how long it would take to transfer the data at the limited bandwidth
            const sizeInKb = Math.max(1, Math.ceil(dataSize / 1024));
            const transferTimeMs = (sizeInKb / bandwidthKBps) * 1000;
            totalDelay = Math.max(totalDelay, transferTimeMs);
        }
        // Apply geographic latency
        if (simulateGeographicLatency) {
            totalDelay += geographicLatencyMap[geographicLocation] || 0;
        }
        // Apply progressive degradation
        if (simulateProgressiveDegradation) {
            const endpoint = 'global'; // Use a global key for all endpoints
            const currentMultiplier = degradationMultipliers.get(endpoint) || 1;
            // Increase the multiplier for next time, but cap it
            const newMultiplier = Math.min(currentMultiplier * degradationFactor, maxDegradationMultiplier);
            degradationMultipliers.set(endpoint, newMultiplier);
            // Apply the current multiplier to the delay
            totalDelay *= currentMultiplier;
        }
        return new Promise(resolve => setTimeout(resolve, totalDelay));
    };
    // Track degradation multipliers for progressive degradation
    const degradationMultipliers = new Map();
    // Add random error function
    const maybeThrowError = () => {
        // Simulate connection drops
        if (simulateConnectionDrops && Math.random() < connectionDropProbability) {
            throw new maas_js_1.MaasApiError('Connection dropped', undefined, 'connection_dropped', {
                error: 'connection_dropped',
                detail: 'The connection was dropped during request processing'
            });
        }
        // Simulate random errors
        if (simulateRandomErrors && Math.random() < errorProbability) {
            throw new maas_js_1.MaasApiError('Simulated random error', 500, 'random_error', {
                error: 'random_error',
                detail: 'A random error occurred during request processing'
            });
        }
        // Check for timeout simulation
        if (simulateTimeouts && Math.random() < timeoutProbability) {
            throw new maas_js_1.MaasApiError('Request timed out', 408, 'request_timeout', {
                error: 'request_timeout',
                detail: 'The request timed out while waiting for a response'
            });
        }
    };
    // Add retry counter for simulating retry behavior
    const retryCounters = new Map();
    // Helper function to handle pagination
    const paginateResults = (results, params) => {
        if (!simulatePagination || !Array.isArray(results)) {
            return results;
        }
        const page = parseInt(params?.page || '1', 10);
        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const paginatedData = results.slice(start, end);
        return {
            items: paginatedData,
            total: results.length,
            page: page,
            pages: Math.ceil(results.length / itemsPerPage),
            per_page: itemsPerPage
        };
    };
    // Helper function to handle retries
    const handleRetry = (endpoint) => {
        if (!simulateRetries) {
            return false;
        }
        const currentCount = retryCounters.get(endpoint) || 0;
        if (currentCount < retriesBeforeSuccess) {
            retryCounters.set(endpoint, currentCount + 1);
            return true;
        }
        return false;
    };
    // Helper function to get a readable error code name from HTTP status code
    const getErrorCodeName = (statusCode) => {
        const errorCodes = {
            400: 'bad_request',
            401: 'unauthorized',
            403: 'forbidden',
            404: 'not_found',
            408: 'request_timeout',
            409: 'conflict',
            422: 'validation_error',
            429: 'rate_limit_exceeded',
            500: 'server_error',
            502: 'bad_gateway',
            503: 'service_unavailable',
            504: 'gateway_timeout'
        };
        return errorCodes[statusCode] || 'unknown_error';
    };
    // Override the get method
    const originalGet = mockClient.get;
    mockClient.get = async (endpoint, params, signal) => {
        // Check for abort signal
        if (signal?.aborted) {
            throw new maas_js_1.MaasApiError('Request aborted', undefined, 'request_aborted');
        }
        // Check for custom handler
        if (customHandlers[endpoint]) {
            return customHandlers[endpoint](params, signal);
        }
        // Check for specific error simulation
        if (simulateSpecificErrors && specificErrors[endpoint]) {
            const errorCode = specificErrors[endpoint];
            // Add network delay if configured
            if (simulateNetworkDelay) {
                await delay(networkDelayMs);
            }
            throw new maas_js_1.MaasApiError(`Simulated ${errorCode} error for ${endpoint}`, errorCode, getErrorCodeName(errorCode), {
                error: getErrorCodeName(errorCode),
                detail: `Simulated error response with status ${errorCode}`
            });
        }
        // Check for rate limiting
        if (simulateRateLimiting) {
            const requestCount = retryCounters.get(`rate_limit:${endpoint}`) || 0;
            retryCounters.set(`rate_limit:${endpoint}`, requestCount + 1);
            if (requestCount >= rateLimitThreshold) {
                // Add network delay if configured
                if (simulateNetworkDelay) {
                    await delay(networkDelayMs);
                }
                throw new maas_js_1.MaasApiError('Rate limit exceeded', rateLimitStatusCode, 'rate_limit_exceeded', {
                    error: 'rate_limit_exceeded',
                    detail: 'You have exceeded the rate limit for this API',
                    retry_after: 60 // Seconds until rate limit resets
                });
            }
        }
        // Check for intermittent failures
        if (simulateIntermittentFailures) {
            const failureCount = retryCounters.get(`failure:${endpoint}`) || 0;
            retryCounters.set(`failure:${endpoint}`, failureCount + 1);
            let shouldFail = false;
            switch (intermittentFailurePattern) {
                case 'random':
                    shouldFail = Math.random() < intermittentFailureProbability;
                    break;
                case 'every-n':
                    shouldFail = (failureCount % intermittentFailureInterval === 0);
                    break;
                case 'specific-endpoints':
                    shouldFail = intermittentFailureEndpoints.some(e => endpoint.includes(e));
                    break;
            }
            if (shouldFail) {
                // Add network delay if configured
                if (simulateNetworkDelay) {
                    await delay(networkDelayMs);
                }
                throw new maas_js_1.MaasApiError('Intermittent failure', 503, 'service_unavailable', {
                    error: 'service_unavailable',
                    detail: 'The service is temporarily unavailable due to an intermittent failure'
                });
            }
        }
        // Add network delay if configured
        if (simulateNetworkDelay) {
            await delay(networkDelayMs);
        }
        // Maybe throw a random error
        maybeThrowError();
        // Handle retry simulation
        if (handleRetry(endpoint)) {
            throw new maas_js_1.MaasApiError('Temporary error, please retry', 503, 'service_unavailable', {
                error: 'service_unavailable',
                detail: 'The service is temporarily unavailable, please retry'
            });
        }
        // Handle specific endpoints
        if (endpoint === '/machines/') {
            return paginateResults(exports.mockData.machines, params);
        }
        else if (endpoint.startsWith('/machines/') && endpoint.length > 10) {
            const machineId = endpoint.split('/')[2];
            const machine = exports.mockData.machines.find(m => m.system_id === machineId);
            if (!machine) {
                throw new maas_js_1.MaasApiError('Machine not found', 404, 'not_found', {
                    error: 'not_found',
                    detail: `Machine with system_id ${machineId} not found`
                });
            }
            return machine;
        }
        else if (endpoint === '/subnets/') {
            return paginateResults(exports.mockData.subnets, params);
        }
        else if (endpoint === '/zones/') {
            return paginateResults(exports.mockData.zones, params);
        }
        else if (endpoint === '/tags/') {
            return paginateResults(exports.mockData.tags, params);
        }
        else if (endpoint === '/domains/') {
            return paginateResults(exports.mockData.domains, params);
        }
        else if (endpoint === '/devices/') {
            return paginateResults(exports.mockData.devices, params);
        }
        else if (endpoint === '/scripts/') {
            return paginateResults(exports.mockData.scripts, params);
        }
        else if (endpoint === '/images/') {
            return paginateResults(exports.mockData.images, params);
        }
        else if (endpoint === '/dhcp-snippets/') {
            return paginateResults(exports.mockData.dhcpSnippets, params);
        }
        else if (endpoint === '/resource-pools/') {
            return paginateResults(exports.mockData.resourcePools, params);
        }
        // Fall back to original implementation
        return originalGet(endpoint, params, signal);
    };
    // Override the post method
    const originalPost = mockClient.post;
    mockClient.post = async (endpoint, params, signal) => {
        // Check for abort signal
        if (signal?.aborted) {
            throw new maas_js_1.MaasApiError('Request aborted', undefined, 'request_aborted');
        }
        // Check for custom handler
        if (customHandlers[endpoint]) {
            return customHandlers[endpoint](params, signal);
        }
        // Check for specific error simulation
        if (simulateSpecificErrors && specificErrors[endpoint]) {
            const errorCode = specificErrors[endpoint];
            // Add network delay if configured
            if (simulateNetworkDelay) {
                await delay(networkDelayMs);
            }
            throw new maas_js_1.MaasApiError(`Simulated ${errorCode} error for ${endpoint}`, errorCode, getErrorCodeName(errorCode), {
                error: getErrorCodeName(errorCode),
                detail: `Simulated error response with status ${errorCode}`
            });
        }
        // Check for rate limiting
        if (simulateRateLimiting) {
            const requestCount = retryCounters.get(`rate_limit:${endpoint}`) || 0;
            retryCounters.set(`rate_limit:${endpoint}`, requestCount + 1);
            if (requestCount >= rateLimitThreshold) {
                // Add network delay if configured
                if (simulateNetworkDelay) {
                    await delay(networkDelayMs);
                }
                throw new maas_js_1.MaasApiError('Rate limit exceeded', rateLimitStatusCode, 'rate_limit_exceeded', {
                    error: 'rate_limit_exceeded',
                    detail: 'You have exceeded the rate limit for this API',
                    retry_after: 60 // Seconds until rate limit resets
                });
            }
        }
        // Check for intermittent failures
        if (simulateIntermittentFailures) {
            const failureCount = retryCounters.get(`failure:${endpoint}`) || 0;
            retryCounters.set(`failure:${endpoint}`, failureCount + 1);
            let shouldFail = false;
            switch (intermittentFailurePattern) {
                case 'random':
                    shouldFail = Math.random() < intermittentFailureProbability;
                    break;
                case 'every-n':
                    shouldFail = (failureCount % intermittentFailureInterval === 0);
                    break;
                case 'specific-endpoints':
                    shouldFail = intermittentFailureEndpoints.some(e => endpoint.includes(e));
                    break;
            }
            if (shouldFail) {
                // Add network delay if configured
                if (simulateNetworkDelay) {
                    await delay(networkDelayMs);
                }
                throw new maas_js_1.MaasApiError('Intermittent failure', 503, 'service_unavailable', {
                    error: 'service_unavailable',
                    detail: 'The service is temporarily unavailable due to an intermittent failure'
                });
            }
        }
        // Add network delay if configured
        if (simulateNetworkDelay) {
            await delay(networkDelayMs);
        }
        // Maybe throw a random error
        maybeThrowError();
        // Handle retry simulation
        if (handleRetry(endpoint)) {
            throw new maas_js_1.MaasApiError('Temporary error, please retry', 503, 'service_unavailable', {
                error: 'service_unavailable',
                detail: 'The service is temporarily unavailable, please retry'
            });
        }
        // Handle specific endpoints
        if (endpoint.startsWith('/machines/') && params?.op === 'deploy') {
            const machineId = endpoint.split('/')[2];
            const machine = exports.mockData.machines.find(m => m.system_id === machineId);
            if (!machine) {
                throw new maas_js_1.MaasApiError('Machine not found', 404, 'not_found', {
                    error: 'not_found',
                    detail: `Machine with system_id ${machineId} not found`
                });
            }
            // Return a realistic deployment response
            return {
                system_id: machineId,
                status: 10, // Deploying status code
                status_name: 'Deploying',
                hostname: machine.hostname,
                domain: machine.domain,
                owner: machine.owner,
                osystem: params.osystem || 'ubuntu',
                distro_series: params.distro_series || 'focal',
                deploy_started: generateTimestamp(),
                deploy_status_message: 'Deployment started',
                resource_uri: `/MAAS/api/2.0/machines/${machineId}/`
            };
        }
        else if (endpoint.startsWith('/machines/') && params?.op === 'commission') {
            const machineId = endpoint.split('/')[2];
            const machine = exports.mockData.machines.find(m => m.system_id === machineId);
            if (!machine) {
                throw new maas_js_1.MaasApiError('Machine not found', 404, 'not_found', {
                    error: 'not_found',
                    detail: `Machine with system_id ${machineId} not found`
                });
            }
            // Return a realistic commissioning response
            return {
                system_id: machineId,
                status: 2, // Commissioning status code
                status_name: 'Commissioning',
                hostname: machine.hostname,
                domain: machine.domain,
                owner: machine.owner,
                commissioning_started: generateTimestamp(),
                commissioning_status_message: 'Commissioning started',
                resource_uri: `/MAAS/api/2.0/machines/${machineId}/`
            };
        }
        else if (endpoint === '/tags/') {
            // Create a new tag
            const newTag = {
                id: exports.mockData.tags.length + 1,
                name: params.name,
                definition: params.definition || '',
                comment: params.comment || '',
                kernel_opts: params.kernel_opts || '',
                created: generateTimestamp()
            };
            // Add to mock data
            exports.mockData.tags.push(newTag);
            return newTag;
        }
        else if (endpoint === '/resource-pools/') {
            // Create a new resource pool
            const newPool = {
                id: exports.mockData.resourcePools.length + 1,
                name: params.name,
                description: params.description || '',
                created: generateTimestamp()
            };
            // Add to mock data
            exports.mockData.resourcePools.push(newPool);
            return newPool;
        }
        // Fall back to original implementation
        return originalPost(endpoint, params, signal);
    };
    // Override the put method
    const originalPut = mockClient.put;
    mockClient.put = async (endpoint, params, signal) => {
        // Check for abort signal
        if (signal?.aborted) {
            throw new maas_js_1.MaasApiError('Request aborted', undefined, 'request_aborted');
        }
        // Check for custom handler
        if (customHandlers[endpoint]) {
            return customHandlers[endpoint](params, signal);
        }
        // Check for specific error simulation
        if (simulateSpecificErrors && specificErrors[endpoint]) {
            const errorCode = specificErrors[endpoint];
            // Add network delay if configured
            if (simulateNetworkDelay) {
                await delay(networkDelayMs);
            }
            throw new maas_js_1.MaasApiError(`Simulated ${errorCode} error for ${endpoint}`, errorCode, getErrorCodeName(errorCode), {
                error: getErrorCodeName(errorCode),
                detail: `Simulated error response with status ${errorCode}`
            });
        }
        // Check for rate limiting
        if (simulateRateLimiting) {
            const requestCount = retryCounters.get(`rate_limit:${endpoint}`) || 0;
            retryCounters.set(`rate_limit:${endpoint}`, requestCount + 1);
            if (requestCount >= rateLimitThreshold) {
                // Add network delay if configured
                if (simulateNetworkDelay) {
                    await delay(networkDelayMs);
                }
                throw new maas_js_1.MaasApiError('Rate limit exceeded', rateLimitStatusCode, 'rate_limit_exceeded', {
                    error: 'rate_limit_exceeded',
                    detail: 'You have exceeded the rate limit for this API',
                    retry_after: 60 // Seconds until rate limit resets
                });
            }
        }
        // Check for intermittent failures
        if (simulateIntermittentFailures) {
            const failureCount = retryCounters.get(`failure:${endpoint}`) || 0;
            retryCounters.set(`failure:${endpoint}`, failureCount + 1);
            let shouldFail = false;
            switch (intermittentFailurePattern) {
                case 'random':
                    shouldFail = Math.random() < intermittentFailureProbability;
                    break;
                case 'every-n':
                    shouldFail = (failureCount % intermittentFailureInterval === 0);
                    break;
                case 'specific-endpoints':
                    shouldFail = intermittentFailureEndpoints.some(e => endpoint.includes(e));
                    break;
            }
            if (shouldFail) {
                // Add network delay if configured
                if (simulateNetworkDelay) {
                    await delay(networkDelayMs);
                }
                throw new maas_js_1.MaasApiError('Intermittent failure', 503, 'service_unavailable', {
                    error: 'service_unavailable',
                    detail: 'The service is temporarily unavailable due to an intermittent failure'
                });
            }
        }
        // Add network delay if configured
        if (simulateNetworkDelay) {
            await delay(networkDelayMs);
        }
        // Maybe throw a random error
        maybeThrowError();
        // Handle retry simulation
        if (handleRetry(endpoint)) {
            throw new maas_js_1.MaasApiError('Temporary error, please retry', 503, 'service_unavailable', {
                error: 'service_unavailable',
                detail: 'The service is temporarily unavailable, please retry'
            });
        }
        // Handle specific endpoints
        if (endpoint.startsWith('/machines/')) {
            const machineId = endpoint.split('/')[2];
            const machineIndex = exports.mockData.machines.findIndex(m => m.system_id === machineId);
            if (machineIndex === -1) {
                throw new maas_js_1.MaasApiError('Machine not found', 404, 'not_found', {
                    error: 'not_found',
                    detail: `Machine with system_id ${machineId} not found`
                });
            }
            // Update the machine
            const updatedMachine = {
                ...exports.mockData.machines[machineIndex],
                ...params,
                updated: generateTimestamp()
            };
            // Update in mock data
            exports.mockData.machines[machineIndex] = updatedMachine;
            return updatedMachine;
        }
        else if (endpoint.startsWith('/tags/')) {
            const tagName = endpoint.split('/')[2];
            const tagIndex = exports.mockData.tags.findIndex(t => t.name === tagName);
            if (tagIndex === -1) {
                throw new maas_js_1.MaasApiError('Tag not found', 404, 'not_found', {
                    error: 'not_found',
                    detail: `Tag with name ${tagName} not found`
                });
            }
            // Update the tag
            const updatedTag = {
                ...exports.mockData.tags[tagIndex],
                ...params,
                updated: generateTimestamp()
            };
            // Update in mock data
            exports.mockData.tags[tagIndex] = updatedTag;
            return updatedTag;
        }
        // Fall back to original implementation
        return originalPut(endpoint, params, signal);
    };
    // Override the delete method
    const originalDelete = mockClient.delete;
    mockClient.delete = async (endpoint, params, signal) => {
        // Check for abort signal
        if (signal?.aborted) {
            throw new maas_js_1.MaasApiError('Request aborted', undefined, 'request_aborted');
        }
        // Check for custom handler
        if (customHandlers[endpoint]) {
            return customHandlers[endpoint](params, signal);
        }
        // Check for specific error simulation
        if (simulateSpecificErrors && specificErrors[endpoint]) {
            const errorCode = specificErrors[endpoint];
            // Add network delay if configured
            if (simulateNetworkDelay) {
                await delay(networkDelayMs);
            }
            throw new maas_js_1.MaasApiError(`Simulated ${errorCode} error for ${endpoint}`, errorCode, getErrorCodeName(errorCode), {
                error: getErrorCodeName(errorCode),
                detail: `Simulated error response with status ${errorCode}`
            });
        }
        // Check for rate limiting
        if (simulateRateLimiting) {
            const requestCount = retryCounters.get(`rate_limit:${endpoint}`) || 0;
            retryCounters.set(`rate_limit:${endpoint}`, requestCount + 1);
            if (requestCount >= rateLimitThreshold) {
                // Add network delay if configured
                if (simulateNetworkDelay) {
                    await delay(networkDelayMs);
                }
                throw new maas_js_1.MaasApiError('Rate limit exceeded', rateLimitStatusCode, 'rate_limit_exceeded', {
                    error: 'rate_limit_exceeded',
                    detail: 'You have exceeded the rate limit for this API',
                    retry_after: 60 // Seconds until rate limit resets
                });
            }
        }
        // Check for intermittent failures
        if (simulateIntermittentFailures) {
            const failureCount = retryCounters.get(`failure:${endpoint}`) || 0;
            retryCounters.set(`failure:${endpoint}`, failureCount + 1);
            let shouldFail = false;
            switch (intermittentFailurePattern) {
                case 'random':
                    shouldFail = Math.random() < intermittentFailureProbability;
                    break;
                case 'every-n':
                    shouldFail = (failureCount % intermittentFailureInterval === 0);
                    break;
                case 'specific-endpoints':
                    shouldFail = intermittentFailureEndpoints.some(e => endpoint.includes(e));
                    break;
            }
            if (shouldFail) {
                // Add network delay if configured
                if (simulateNetworkDelay) {
                    await delay(networkDelayMs);
                }
                throw new maas_js_1.MaasApiError('Intermittent failure', 503, 'service_unavailable', {
                    error: 'service_unavailable',
                    detail: 'The service is temporarily unavailable due to an intermittent failure'
                });
            }
        }
        // Add network delay if configured
        if (simulateNetworkDelay) {
            await delay(networkDelayMs);
        }
        // Maybe throw a random error
        maybeThrowError();
        // Handle retry simulation
        if (handleRetry(endpoint)) {
            throw new maas_js_1.MaasApiError('Temporary error, please retry', 503, 'service_unavailable', {
                error: 'service_unavailable',
                detail: 'The service is temporarily unavailable, please retry'
            });
        }
        // Handle specific endpoints
        if (endpoint.startsWith('/machines/')) {
            const machineId = endpoint.split('/')[2];
            const machineIndex = exports.mockData.machines.findIndex(m => m.system_id === machineId);
            if (machineIndex === -1) {
                throw new maas_js_1.MaasApiError('Machine not found', 404, 'not_found', {
                    error: 'not_found',
                    detail: `Machine with system_id ${machineId} not found`
                });
            }
            // Remove from mock data if op is 'delete'
            if (params?.op === 'delete') {
                exports.mockData.machines.splice(machineIndex, 1);
            }
            return { status: 'success' };
        }
        else if (endpoint.startsWith('/tags/')) {
            const tagName = endpoint.split('/')[2];
            const tagIndex = exports.mockData.tags.findIndex(t => t.name === tagName);
            if (tagIndex === -1) {
                throw new maas_js_1.MaasApiError('Tag not found', 404, 'not_found', {
                    error: 'not_found',
                    detail: `Tag with name ${tagName} not found`
                });
            }
            // Remove from mock data
            exports.mockData.tags.splice(tagIndex, 1);
            return { status: 'success' };
        }
        // Fall back to original implementation
        return originalDelete(endpoint, params, signal);
    };
    // Implement the postMultipart method
    mockClient.postMultipart = async (endpoint, formData, signal) => {
        // Check for abort signal
        if (signal?.aborted) {
            throw new maas_js_1.MaasApiError('Request aborted', undefined, 'request_aborted');
        }
        // Check for custom handler
        if (customHandlers[endpoint]) {
            return customHandlers[endpoint](formData, signal);
        }
        // Check for specific error simulation
        if (simulateSpecificErrors && specificErrors[endpoint]) {
            const errorCode = specificErrors[endpoint];
            // Add network delay if configured
            if (simulateNetworkDelay) {
                await delay(networkDelayMs);
            }
            throw new maas_js_1.MaasApiError(`Simulated ${errorCode} error for ${endpoint}`, errorCode, getErrorCodeName(errorCode), {
                error: getErrorCodeName(errorCode),
                detail: `Simulated error response with status ${errorCode}`
            });
        }
        // Check for rate limiting
        if (simulateRateLimiting) {
            const requestCount = retryCounters.get(`rate_limit:${endpoint}`) || 0;
            retryCounters.set(`rate_limit:${endpoint}`, requestCount + 1);
            if (requestCount >= rateLimitThreshold) {
                // Add network delay if configured
                if (simulateNetworkDelay) {
                    await delay(networkDelayMs);
                }
                throw new maas_js_1.MaasApiError('Rate limit exceeded', rateLimitStatusCode, 'rate_limit_exceeded', {
                    error: 'rate_limit_exceeded',
                    detail: 'You have exceeded the rate limit for this API',
                    retry_after: 60 // Seconds until rate limit resets
                });
            }
        }
        // Check for intermittent failures
        if (simulateIntermittentFailures) {
            const failureCount = retryCounters.get(`failure:${endpoint}`) || 0;
            retryCounters.set(`failure:${endpoint}`, failureCount + 1);
            let shouldFail = false;
            switch (intermittentFailurePattern) {
                case 'random':
                    shouldFail = Math.random() < intermittentFailureProbability;
                    break;
                case 'every-n':
                    shouldFail = (failureCount % intermittentFailureInterval === 0);
                    break;
                case 'specific-endpoints':
                    shouldFail = intermittentFailureEndpoints.some(e => endpoint.includes(e));
                    break;
            }
            if (shouldFail) {
                // Add network delay if configured
                if (simulateNetworkDelay) {
                    await delay(networkDelayMs);
                }
                throw new maas_js_1.MaasApiError('Intermittent failure', 503, 'service_unavailable', {
                    error: 'service_unavailable',
                    detail: 'The service is temporarily unavailable due to an intermittent failure'
                });
            }
        }
        // Add network delay if configured
        if (simulateNetworkDelay) {
            await delay(networkDelayMs);
        }
        // Maybe throw a random error
        maybeThrowError();
        // Handle retry simulation
        if (handleRetry(endpoint)) {
            throw new maas_js_1.MaasApiError('Temporary error, please retry', 503, 'service_unavailable', {
                error: 'service_unavailable',
                detail: 'The service is temporarily unavailable, please retry'
            });
        }
        // Handle specific endpoints
        if (endpoint === '/scripts/') {
            // Create a new script
            const newScript = {
                id: exports.mockData.scripts.length + 1,
                name: formData.get('name') || `script-${generateId().substring(0, 8)}`,
                description: formData.get('description') || '',
                tags: formData.get('tags') ? formData.get('tags').split(',') : [],
                type: formData.get('type') || 'testing',
                timeout: parseInt(formData.get('timeout') || '60', 10),
                created: generateTimestamp(),
                updated: generateTimestamp()
            };
            // Add to mock data
            exports.mockData.scripts.push(newScript);
            return newScript;
        }
        else if (endpoint === '/images/') {
            // Create a new image
            const newImage = {
                id: exports.mockData.images.length + 1,
                name: formData.get('name') || `image-${generateId().substring(0, 8)}`,
                architecture: formData.get('architecture') || 'amd64/generic',
                type: formData.get('type') || 'os',
                size: parseInt(formData.get('size') || '1024000', 10),
                created: generateTimestamp(),
                updated: generateTimestamp()
            };
            // Add to mock data
            exports.mockData.images.push(newImage);
            return newImage;
        }
        else if (endpoint.startsWith('/machines/') && endpoint.includes('/files/')) {
            // Upload a file to a machine
            return {
                status: 'success',
                path: formData.get('path') || '/tmp/uploaded-file',
                uploaded_at: generateTimestamp()
            };
        }
        // Default response for unhandled endpoints
        return {
            status: 'success',
            message: 'Multipart request processed successfully',
            timestamp: generateTimestamp()
        };
    };
    return mockClient;
}
/**
 * Predefined mock client configurations for common testing scenarios
 */
exports.mockClientConfigs = {
    /**
     * Default configuration with realistic behavior
     */
    default: () => createMockMaasApiClient({
        simulateNetworkDelay: true,
        networkDelayMs: 100
    }),
    /**
     * Configuration that simulates slow network
     */
    slow: () => createMockMaasApiClient({
        simulateNetworkDelay: true,
        networkDelayMs: 1000,
        simulateNetworkJitter: true,
        networkJitterMs: 200
    }),
    /**
     * Configuration that simulates random errors
     */
    flaky: () => createMockMaasApiClient({
        simulateNetworkDelay: true,
        simulateRandomErrors: true,
        errorProbability: 0.3
    }),
    /**
     * Configuration that simulates retry behavior
     */
    retry: () => createMockMaasApiClient({
        simulateNetworkDelay: true,
        simulateRetries: true,
        retriesBeforeSuccess: 2
    }),
    /**
     * Configuration that simulates pagination
     */
    paginated: () => createMockMaasApiClient({
        simulateNetworkDelay: true,
        simulatePagination: true,
        itemsPerPage: 5
    }),
    /**
     * Configuration for testing error handling
     */
    alwaysError: () => {
        const mockClient = (0, mockMaasApiClient_js_1.createMockMaasApiClient)({
            errorResponse: new maas_js_1.MaasApiError('Simulated error', 500, 'server_error', {
                error: 'server_error',
                detail: 'A simulated server error occurred'
            })
        });
        return mockClient;
    },
    /**
     * Configuration that simulates high latency network conditions
     */
    highLatency: () => createMockMaasApiClient({
        simulateNetworkDelay: true,
        networkDelayMs: 2000,
        simulateNetworkJitter: true,
        networkJitterMs: 1000
    }),
    /**
     * Configuration that simulates connection timeouts
     */
    timeout: () => createMockMaasApiClient({
        simulateTimeouts: true,
        timeoutProbability: 0.5,
        timeoutMs: 5000
    }),
    /**
     * Configuration that simulates rate limiting
     */
    rateLimited: () => createMockMaasApiClient({
        simulateRateLimiting: true,
        rateLimitThreshold: 3,
        simulateNetworkDelay: true
    }),
    /**
     * Configuration that simulates intermittent failures
     */
    intermittent: () => createMockMaasApiClient({
        simulateIntermittentFailures: true,
        intermittentFailurePattern: 'random',
        intermittentFailureProbability: 0.3,
        simulateNetworkDelay: true
    }),
    /**
     * Configuration that simulates specific HTTP error codes for different endpoints
     */
    specificErrors: () => createMockMaasApiClient({
        simulateSpecificErrors: true,
        specificErrors: {
            '/machines/': 404,
            '/tags/': 403,
            '/subnets/': 500,
            '/zones/': 422
        },
        simulateNetworkDelay: true
    }),
    /**
     * Configuration that simulates every-n-request failures
     */
    patternedFailures: () => createMockMaasApiClient({
        simulateIntermittentFailures: true,
        intermittentFailurePattern: 'every-n',
        intermittentFailureInterval: 3,
        simulateNetworkDelay: true
    })
};
