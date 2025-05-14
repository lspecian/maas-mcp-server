"use strict";
/**
 * @file Mock MAAS API Client
 *
 * This module provides a configurable mock implementation of the MaasApiClient
 * for testing purposes. It includes mock data, factory functions for creating
 * mock clients with different behaviors, and predefined configurations for
 * common testing scenarios.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockClientConfigs = exports.mockErrorResponse = exports.mockDevices = exports.mockDomains = exports.mockTags = exports.mockZones = exports.mockSubnets = exports.mockEmptyResult = exports.deployedMachine = exports.readyMachine = exports.mockMachine = exports.mockMachines = void 0;
exports.createMockMaasApiClient = createMockMaasApiClient;
const index_js_1 = require("../../types/index.js");
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
 * Mock data for a collection of machines
 *
 * This array contains sample machine data that mimics the structure and properties
 * of real machine objects returned by the MAAS API. It's useful for testing
 * components that process or display machine data.
 */
exports.mockMachines = [
    {
        system_id: "abc123",
        hostname: "test-machine-1",
        domain: { id: 1, name: "maas" },
        architecture: "amd64/generic",
        status: 4,
        status_name: "Ready",
        owner: "admin",
        owner_data: { key: "value" },
        ip_addresses: ["192.168.1.100"],
        cpu_count: 4,
        memory: 8192,
        zone: { id: 1, name: "default" },
        pool: { id: 1, name: "default" },
        tags: ["tag1", "tag2"],
        created: "2025-01-15T08:30:45Z",
        updated: "2025-05-10T14:22:18Z",
        power_state: "off",
        power_type: "ipmi",
        osystem: "ubuntu",
        distro_series: "jammy",
        hardware_info: {
            cpu_model: "Intel(R) Xeon(R) CPU E5-2680 v4 @ 2.40GHz",
            storage: 512000,
            interfaces: [
                {
                    id: 101,
                    name: "eth0",
                    mac_address: "52:54:00:12:34:56",
                    type: "physical"
                }
            ]
        }
    },
    {
        system_id: "def456",
        hostname: "test-machine-2",
        domain: { id: 1, name: "maas" },
        architecture: "amd64/generic",
        status: 6,
        status_name: "Deployed",
        owner: "user1",
        owner_data: null,
        ip_addresses: ["192.168.1.101"],
        cpu_count: 8,
        memory: 16384,
        zone: { id: 1, name: "default" },
        pool: { id: 2, name: "production" },
        tags: ["tag3"],
        created: "2025-02-20T10:15:30Z",
        updated: "2025-05-12T09:45:22Z",
        power_state: "on",
        power_type: "ipmi",
        osystem: "ubuntu",
        distro_series: "focal",
        hardware_info: {
            cpu_model: "AMD EPYC 7302 16-Core Processor",
            storage: 1024000,
            interfaces: [
                {
                    id: 201,
                    name: "eth0",
                    mac_address: "52:54:00:98:76:54",
                    type: "physical"
                },
                {
                    id: 202,
                    name: "eth1",
                    mac_address: "52:54:00:ab:cd:ef",
                    type: "physical"
                }
            ]
        }
    }
];
/**
 * Mock data for a single machine
 *
 * A convenience export of the first machine from the mockMachines array.
 * Useful for tests that only need a single machine object.
 */
exports.mockMachine = exports.mockMachines[0];
/**
 * Mock data for a machine in Ready state
 */
exports.readyMachine = exports.mockMachines[0];
/**
 * Mock data for a machine in Deployed state
 */
exports.deployedMachine = exports.mockMachines[1];
/**
 * Mock data for an empty result
 *
 * Represents an empty collection response from the MAAS API.
 * Useful for testing empty state handling in components.
 */
exports.mockEmptyResult = [];
/**
 * Mock data for subnets
 */
exports.mockSubnets = [
    {
        id: 1,
        name: "subnet-1",
        cidr: "192.168.1.0/24",
        vlan: { id: 1, name: "vlan-1", fabric: "fabric-1" },
        space: "default",
        gateway_ip: "192.168.1.1",
        dns_servers: ["8.8.8.8", "8.8.4.4"],
        managed: true,
        active_discovery: true,
        allow_dns: true,
        allow_proxy: true,
        created: "2025-01-10T08:30:45Z",
        updated: "2025-05-08T14:22:18Z"
    },
    {
        id: 2,
        name: "subnet-2",
        cidr: "10.0.0.0/24",
        vlan: { id: 2, name: "vlan-2", fabric: "fabric-1" },
        space: "default",
        gateway_ip: "10.0.0.1",
        dns_servers: ["8.8.8.8", "8.8.4.4"],
        managed: true,
        active_discovery: false,
        allow_dns: true,
        allow_proxy: false,
        created: "2025-02-15T10:45:30Z",
        updated: "2025-05-09T11:32:45Z"
    }
];
/**
 * Mock data for zones
 */
exports.mockZones = [
    { id: 1, name: "default", description: "Default zone", created: "2024-12-01T00:00:00Z" },
    { id: 2, name: "zone-1", description: "Zone 1", created: "2025-01-15T14:30:00Z" },
    { id: 3, name: "zone-2", description: "Zone 2", created: "2025-02-20T09:15:00Z" }
];
/**
 * Mock data for tags
 */
exports.mockTags = [
    { id: 1, name: "tag1", definition: "", comment: "Test tag 1", kernel_opts: "", created: "2025-01-05T08:30:45Z" },
    { id: 2, name: "tag2", definition: "", comment: "Test tag 2", kernel_opts: "", created: "2025-01-10T14:22:18Z" },
    { id: 3, name: "tag3", definition: "", comment: "Test tag 3", kernel_opts: "", created: "2025-02-15T10:45:30Z" }
];
/**
 * Mock data for domains
 */
exports.mockDomains = [
    { id: 1, name: "maas", resource_record_count: 10, ttl: 3600, authoritative: true, created: "2024-12-01T00:00:00Z" },
    { id: 2, name: "example.com", resource_record_count: 5, ttl: 3600, authoritative: true, created: "2025-01-15T14:30:00Z" }
];
/**
 * Mock data for devices
 */
exports.mockDevices = [
    {
        id: 1,
        system_id: "device1",
        hostname: "device-1",
        domain: { id: 1, name: "maas" },
        ip_addresses: ["192.168.1.150"],
        created: "2025-03-10T09:30:00Z",
        updated: "2025-05-01T11:45:22Z"
    },
    {
        id: 2,
        system_id: "device2",
        hostname: "device-2",
        domain: { id: 1, name: "maas" },
        ip_addresses: ["192.168.1.151"],
        created: "2025-03-15T14:20:00Z",
        updated: "2025-05-02T16:30:15Z"
    }
];
/**
 * Mock data for an error response
 *
 * Represents the structure of error responses from the MAAS API.
 * Useful for testing error handling in components.
 */
exports.mockErrorResponse = {
    error: 'An error occurred',
    detail: 'Detailed error information'
};
/**
 * Creates a mock MaasApiClient with configurable behavior
 *
 * This factory function creates a mock implementation of the MaasApiClient
 * that can be configured to simulate various response scenarios, network
 * conditions, and error states. It's useful for testing components that
 * interact with the MAAS API without making actual network requests.
 *
 * @example
 * // Create a mock client that returns successful responses
 * const mockClient = createMockMaasApiClient();
 *
 * @example
 * // Create a mock client that simulates network errors
 * const errorClient = createMockMaasApiClient({
 *   errorResponse: new Error('Network failure'),
 *   statusCode: 500
 * });
 *
 * @example
 * // Create a mock client that simulates slow network
 * const slowClient = createMockMaasApiClient({
 *   simulateNetworkDelay: 2000 // 2 seconds delay
 * });
 *
 * @param options Configuration options for the mock client
 * @returns A mocked MaasApiClient instance
 */
function createMockMaasApiClient(options = {}) {
    const { successResponse = exports.mockMachines, errorResponse, statusCode, simulateNetworkDelay = 0, networkJitterMs = 0, simulateTimeout = false, timeoutMs = 30000, respectAbortSignal = true, simulatePagination = false, itemsPerPage = 10, simulateRateLimiting = false, rateLimitThreshold = 10, rateLimitStatusCode = 429, simulateIntermittentFailures = false, intermittentFailureProbability = 0.2, intermittentFailurePattern = 'random', intermittentFailureInterval = 3, intermittentFailureEndpoints = [], specificErrors = {}, 
    // New options for enhanced network simulation
    simulateVariableLatency = false, latencyPerKb = 10, simulateBandwidthLimits = false, bandwidthKBps = 100, simulateConnectionDrops = false, connectionDropProbability = 0.05, simulateProgressiveDegradation = false, degradationFactor = 1.1, maxDegradationMultiplier = 10, simulateGeographicLatency = false, geographicLocation = 'local', geographicLatencyMap = {
        local: 10,
        regional: 50,
        continental: 100,
        global: 300
    } } = options;
    // Track request counts for rate limiting and pattern-based failures
    const requestCounts = new Map();
    // Track degradation multipliers for progressive degradation
    const degradationMultipliers = new Map();
    // Create the mock client with required properties
    const mockClient = {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        postMultipart: jest.fn(),
        // Add private properties to satisfy TypeScript
        maasApiUrl: 'https://mock-maas-api.example.com/MAAS',
        apiKeyComponents: {
            consumerKey: 'mock-consumer-key',
            token: 'mock-token',
            tokenSecret: 'mock-token-secret'
        },
        makeRequest: jest.fn()
    };
    // Helper function to create a response with delay and abort handling
    const createResponse = (endpoint, params, signal) => {
        return new Promise((resolve, reject) => {
            // Track request count for this endpoint
            const currentCount = requestCounts.get(endpoint) || 0;
            requestCounts.set(endpoint, currentCount + 1);
            // Handle abort signal
            if (respectAbortSignal && signal) {
                if (signal.aborted) {
                    reject(new index_js_1.MaasApiError('Request aborted', undefined, 'request_aborted'));
                    return;
                }
                signal.addEventListener('abort', () => {
                    reject(new index_js_1.MaasApiError('Request aborted', undefined, 'request_aborted'));
                });
            }
            // Simulate connection drops
            if (simulateConnectionDrops && Math.random() < connectionDropProbability) {
                // Simulate a partial delay before dropping the connection
                const partialDelay = calculateTotalDelay() / 2;
                setTimeout(() => {
                    reject(new index_js_1.MaasApiError('Connection dropped', undefined, 'connection_dropped', {
                        error: 'connection_dropped',
                        detail: 'The connection was dropped during request processing'
                    }));
                }, partialDelay);
                return;
            }
            // Check for specific error for this endpoint
            const specificError = Object.entries(specificErrors).find(([pattern, _]) => {
                if (pattern.startsWith('/') && pattern.endsWith('/')) {
                    // It's a regex pattern
                    const regexPattern = new RegExp(pattern.slice(1, -1));
                    return regexPattern.test(endpoint);
                }
                return endpoint.includes(pattern);
            });
            if (specificError) {
                const [_, errorCode] = specificError;
                const error = new index_js_1.MaasApiError(`Simulated ${errorCode} error for ${endpoint}`, errorCode, getErrorCodeName(errorCode), {
                    error: getErrorCodeName(errorCode),
                    detail: `Simulated error response with status ${errorCode}`
                });
                // Apply network delay with jitter
                const totalDelay = calculateTotalDelay();
                setTimeout(() => reject(error), totalDelay);
                return;
            }
            // Handle rate limiting
            if (simulateRateLimiting && currentCount > rateLimitThreshold) {
                const error = new index_js_1.MaasApiError('Rate limit exceeded', rateLimitStatusCode, 'rate_limit_exceeded', {
                    error: 'rate_limit_exceeded',
                    detail: 'You have exceeded the rate limit for this API',
                    retry_after: 60 // Seconds until rate limit resets
                });
                // Apply network delay with jitter
                const totalDelay = calculateTotalDelay();
                setTimeout(() => reject(error), totalDelay);
                return;
            }
            // Handle intermittent failures
            if (simulateIntermittentFailures && shouldFailIntermittently(endpoint, currentCount)) {
                const error = new index_js_1.MaasApiError('Intermittent failure', 503, 'service_unavailable', {
                    error: 'service_unavailable',
                    detail: 'The service is temporarily unavailable due to an intermittent failure'
                });
                // Apply network delay with jitter
                const totalDelay = calculateTotalDelay();
                setTimeout(() => reject(error), totalDelay);
                return;
            }
            // Handle timeout
            if (simulateTimeout) {
                // Apply network delay with jitter
                const totalDelay = calculateTotalDelay();
                setTimeout(() => {
                    reject(new index_js_1.MaasApiError('Request timed out', 408, 'request_timeout'));
                }, Math.min(totalDelay, timeoutMs));
                return;
            }
            // Handle error response
            if (errorResponse) {
                const error = typeof errorResponse === 'string'
                    ? new index_js_1.MaasApiError(errorResponse, statusCode, 'api_error')
                    : errorResponse;
                // Apply network delay with jitter
                const totalDelay = calculateTotalDelay();
                setTimeout(() => reject(error), totalDelay);
                return;
            }
            // Handle pagination if enabled
            if (simulatePagination && Array.isArray(successResponse)) {
                const page = parseInt(params?.page || '1', 10);
                const start = (page - 1) * itemsPerPage;
                const end = start + itemsPerPage;
                const paginatedData = successResponse.slice(start, end);
                const response = {
                    items: paginatedData,
                    total: successResponse.length,
                    page: page,
                    pages: Math.ceil(successResponse.length / itemsPerPage)
                };
                // Apply network delay with jitter
                const totalDelay = calculateTotalDelay();
                setTimeout(() => resolve(response), totalDelay);
                return;
            }
            // Handle success response
            // Apply network delay with jitter
            const totalDelay = calculateTotalDelay();
            setTimeout(() => resolve(successResponse), totalDelay);
        });
    };
    // Helper function to calculate total delay with jitter and other factors
    const calculateTotalDelay = (dataSize = 1) => {
        // Base delay with jitter
        const jitter = networkJitterMs > 0 ? Math.floor(Math.random() * networkJitterMs) : 0;
        let totalDelay = simulateNetworkDelay + jitter;
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
        return totalDelay;
    };
    // Helper function to determine if a request should fail intermittently
    const shouldFailIntermittently = (endpoint, requestCount) => {
        switch (intermittentFailurePattern) {
            case 'random':
                return Math.random() < intermittentFailureProbability;
            case 'every-n':
                return requestCount % intermittentFailureInterval === 0;
            case 'specific-endpoints':
                return intermittentFailureEndpoints.some(e => endpoint.includes(e));
            default:
                return false;
        }
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
    // Implement mock methods
    mockClient.get.mockImplementation(createResponse);
    mockClient.post.mockImplementation(createResponse);
    mockClient.put.mockImplementation(createResponse);
    mockClient.delete.mockImplementation(createResponse);
    mockClient.postMultipart.mockImplementation(createResponse);
    return mockClient;
}
/**
 * Predefined mock client configurations for common testing scenarios
 *
 * This object provides factory functions for creating mock clients with
 * preconfigured behaviors that simulate common API response scenarios.
 * These configurations make it easy to test how components handle different
 * API responses without having to manually configure each mock client.
 */
exports.mockClientConfigs = {
    /**
     * Default configuration that returns successful responses with mock machine data
     * @returns A mock client that returns successful responses
     */
    default: () => createMockMaasApiClient(),
    /**
     * Configuration that returns empty result arrays
     * Useful for testing empty state handling
     * @returns A mock client that returns empty arrays
     */
    empty: () => createMockMaasApiClient({ successResponse: exports.mockEmptyResult }),
    /**
     * Configuration that simulates network timeouts
     * Useful for testing timeout handling and retry logic
     * @returns A mock client that simulates timeouts
     */
    timeout: () => createMockMaasApiClient({ simulateTimeout: true }),
    /**
     * Configuration that simulates slow network responses
     * Useful for testing loading states and progress indicators
     * @param delay Milliseconds to delay the response (default: 500ms)
     * @returns A mock client with delayed responses
     */
    slow: (delay = 500) => createMockMaasApiClient({ simulateNetworkDelay: delay }),
    /**
     * Configuration that simulates 404 Not Found errors
     * Useful for testing resource not found handling
     * @returns A mock client that returns 404 errors
     */
    notFound: () => createMockMaasApiClient({
        errorResponse: new index_js_1.MaasApiError('Resource not found', 404, 'not_found', {
            error: 'not_found',
            detail: 'The requested resource could not be found'
        })
    }),
    /**
     * Configuration that simulates 500 Internal Server errors
     * Useful for testing server error handling
     * @returns A mock client that returns 500 errors
     */
    serverError: () => createMockMaasApiClient({
        errorResponse: new index_js_1.MaasApiError('Internal server error', 500, 'server_error', {
            error: 'server_error',
            detail: 'An unexpected error occurred on the server'
        })
    }),
    /**
     * Configuration that simulates 401 Unauthorized errors
     * Useful for testing authentication error handling
     * @returns A mock client that returns 401 errors
     */
    unauthorized: () => createMockMaasApiClient({
        errorResponse: new index_js_1.MaasApiError('Unauthorized access', 401, 'unauthorized', {
            error: 'unauthorized',
            detail: 'Authentication credentials were not provided or are invalid'
        })
    }),
    /**
     * Configuration that simulates 403 Forbidden errors
     * Useful for testing permission error handling
     * @returns A mock client that returns 403 errors
     */
    forbidden: () => createMockMaasApiClient({
        errorResponse: new index_js_1.MaasApiError('Forbidden', 403, 'forbidden', {
            error: 'forbidden',
            detail: 'You do not have permission to perform this action'
        })
    }),
    /**
     * Configuration that simulates 422 Validation errors
     * Useful for testing form validation error handling
     * @returns A mock client that returns 422 errors
     */
    validationError: () => createMockMaasApiClient({
        errorResponse: new index_js_1.MaasApiError('Validation error', 422, 'validation_error', {
            error: 'validation_error',
            detail: 'The request data failed validation',
            fields: {
                name: ['This field is required'],
                value: ['Must be a positive number']
            }
        })
    }),
    /**
     * Configuration that simulates paginated responses
     * Useful for testing pagination handling
     * @param itemsPerPage Number of items per page (default: 10)
     * @returns A mock client that returns paginated responses
     */
    paginated: (itemsPerPage = 10) => createMockMaasApiClient({
        simulatePagination: true,
        itemsPerPage
    }),
    /**
     * Configuration that returns malformed but successful responses
     * Useful for testing error handling of unexpected response formats
     * @returns A mock client that returns malformed responses
     */
    malformed: () => createMockMaasApiClient({
        successResponse: exports.mockErrorResponse
    }),
    /**
     * Configuration that simulates variable latency based on response size
     * Useful for testing performance with large responses
     * @returns A mock client with variable latency
     */
    variableLatency: () => createMockMaasApiClient({
        simulateNetworkDelay: 50,
        simulateVariableLatency: true,
        latencyPerKb: 20
    }),
    /**
     * Configuration that simulates bandwidth limitations
     * Useful for testing performance with limited bandwidth
     * @param kbps Bandwidth in KB/s (default: 50)
     * @returns A mock client with bandwidth limitations
     */
    limitedBandwidth: (kbps = 50) => createMockMaasApiClient({
        simulateBandwidthLimits: true,
        bandwidthKBps: kbps
    }),
    /**
     * Configuration that simulates connection drops
     * Useful for testing resilience to connection failures
     * @param probability Probability of connection drop (default: 0.2)
     * @returns A mock client that simulates connection drops
     */
    connectionDrops: (probability = 0.2) => createMockMaasApiClient({
        simulateConnectionDrops: true,
        connectionDropProbability: probability
    }),
    /**
     * Configuration that simulates progressive degradation of service
     * Useful for testing behavior under gradually worsening conditions
     * @returns A mock client that simulates progressive degradation
     */
    progressiveDegradation: () => createMockMaasApiClient({
        simulateNetworkDelay: 50,
        simulateProgressiveDegradation: true,
        degradationFactor: 1.2
    }),
    /**
     * Configuration that simulates geographic latency
     * Useful for testing with different simulated geographic locations
     * @param location Geographic location (default: 'global')
     * @returns A mock client that simulates geographic latency
     */
    geographicLatency: (location = 'global') => createMockMaasApiClient({
        simulateGeographicLatency: true,
        geographicLocation: location
    }),
    /**
     * Configuration that simulates realistic network conditions
     * Combines multiple network simulation features for realistic testing
     * @returns A mock client with realistic network simulation
     */
    realisticNetwork: () => createMockMaasApiClient({
        simulateNetworkDelay: 100,
        networkJitterMs: 50,
        simulateVariableLatency: true,
        latencyPerKb: 10,
        simulateConnectionDrops: true,
        connectionDropProbability: 0.02,
        simulateIntermittentFailures: true,
        intermittentFailureProbability: 0.05
    })
};
