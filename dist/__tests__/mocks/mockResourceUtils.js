"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockResourceUtilsConfigs = void 0;
exports.createMockResourceUtils = createMockResourceUtils;
exports.setupMockResourceUtils = setupMockResourceUtils;
exports.extractRegisteredCallback = extractRegisteredCallback;
const maas_ts_1 = require("../../types/maas.ts");
const actualResourceUtils = __importStar(require("../../mcp_resources/utils/resourceUtils.js"));
/**
 * Creates mock implementations of ResourceUtils functions
 *
 * @param options Configuration options for the mock resource utils
 * @returns Mocked ResourceUtils functions
 */
function createMockResourceUtils(options = {}) {
    const { useActualImplementations = {
        extractAndValidateParams: false,
        validateResourceData: false,
        handleResourceFetchError: false
    }, simulateErrors = {
        extractAndValidateParams: false,
        validateResourceData: false,
        handleResourceFetchError: false
    }, errorMessages = {
        extractAndValidateParams: 'Mock error in extractAndValidateParams',
        validateResourceData: 'Mock error in validateResourceData',
        handleResourceFetchError: 'Mock error in handleResourceFetchError'
    }, customImplementations = {} } = options;
    // Create the mock functions
    const mockResourceUtils = {
        extractAndValidateParams: jest.fn(),
        validateResourceData: jest.fn(),
        handleResourceFetchError: jest.fn()
    };
    // Implement extractAndValidateParams
    mockResourceUtils.extractAndValidateParams.mockImplementation((uri, pattern, schema, resourceName) => {
        // Use custom implementation if provided
        if (customImplementations.extractAndValidateParams) {
            return customImplementations.extractAndValidateParams(uri, pattern, schema, resourceName);
        }
        // Use actual implementation if specified
        if (useActualImplementations.extractAndValidateParams) {
            return actualResourceUtils.extractAndValidateParams(uri, pattern, schema, resourceName);
        }
        // Simulate error if specified
        if (simulateErrors.extractAndValidateParams) {
            throw new maas_ts_1.MaasApiError(errorMessages.extractAndValidateParams || 'Mock error in extractAndValidateParams', 400, 'invalid_parameters');
        }
        // Default mock implementation: extract system_id from URI if present
        const match = uri.match(/\/([^\/]+)\/details$/);
        const systemId = match ? match[1] : undefined;
        // Create a mock params object with system_id if found
        const mockParams = {};
        if (systemId) {
            mockParams.system_id = systemId;
        }
        // Add any query parameters if present
        try {
            const url = new URL(uri);
            url.searchParams.forEach((value, key) => {
                mockParams[key] = value;
            });
        }
        catch (error) {
            // Not a valid URL, ignore
        }
        // Return the mock params, assuming they pass schema validation
        return schema.parse(mockParams);
    });
    // Implement validateResourceData
    mockResourceUtils.validateResourceData.mockImplementation((data, schema, resourceName, resourceId) => {
        // Use custom implementation if provided
        if (customImplementations.validateResourceData) {
            return customImplementations.validateResourceData(data, schema, resourceName, resourceId);
        }
        // Use actual implementation if specified
        if (useActualImplementations.validateResourceData) {
            return actualResourceUtils.validateResourceData(data, schema, resourceName, resourceId);
        }
        // Simulate error if specified
        if (simulateErrors.validateResourceData) {
            throw new maas_ts_1.MaasApiError(errorMessages.validateResourceData || 'Mock error in validateResourceData', 422, 'validation_error', { zodErrors: [{ message: 'Mock validation error' }] });
        }
        // Default mock implementation: pass through the data, assuming it passes schema validation
        return schema.parse(data);
    });
    // Implement handleResourceFetchError
    mockResourceUtils.handleResourceFetchError.mockImplementation((error, resourceName, resourceId, context) => {
        // Use custom implementation if provided
        if (customImplementations.handleResourceFetchError) {
            return customImplementations.handleResourceFetchError(error, resourceName, resourceId, context);
        }
        // Use actual implementation if specified
        if (useActualImplementations.handleResourceFetchError) {
            return actualResourceUtils.handleResourceFetchError(error, resourceName, resourceId, context);
        }
        // Simulate error if specified
        if (simulateErrors.handleResourceFetchError) {
            throw new maas_ts_1.MaasApiError(errorMessages.handleResourceFetchError || 'Mock error in handleResourceFetchError', 500, 'unexpected_error');
        }
        // Default mock implementation: wrap the error in a MaasApiError if it's not already one
        if (error instanceof maas_ts_1.MaasApiError) {
            throw error;
        }
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new maas_ts_1.MaasApiError(`Error fetching ${resourceName}${resourceId ? ` '${resourceId}'` : ''}: ${errorMessage}`, 500, 'unexpected_error', { originalError: errorMessage });
    });
    return mockResourceUtils;
}
/**
 * Predefined mock resource utils configurations
 */
exports.mockResourceUtilsConfigs = {
    // Default configuration
    default: () => createMockResourceUtils(),
    // Configuration with all actual implementations
    useActual: () => createMockResourceUtils({
        useActualImplementations: {
            extractAndValidateParams: true,
            validateResourceData: true,
            handleResourceFetchError: true
        }
    }),
    // Configuration with all simulated errors
    withErrors: () => createMockResourceUtils({
        simulateErrors: {
            extractAndValidateParams: true,
            validateResourceData: true,
            handleResourceFetchError: true
        }
    }),
    // Configuration with selective actual implementations
    selective: (useActual) => createMockResourceUtils({
        useActualImplementations: {
            extractAndValidateParams: false,
            validateResourceData: false,
            handleResourceFetchError: false,
            ...useActual
        }
    })
};
/**
 * Setup mock ResourceUtils functions for testing
 * This is a convenience function that creates mocks and sets them up for the module
 *
 * @param options Configuration options for the mock resource utils
 * @returns The mocked ResourceUtils functions
 */
function setupMockResourceUtils(options = {}) {
    const mockFunctions = createMockResourceUtils(options);
    jest.mock('../../mcp_resources/utils/resourceUtils.js', () => ({
        extractAndValidateParams: mockFunctions.extractAndValidateParams,
        validateResourceData: mockFunctions.validateResourceData,
        handleResourceFetchError: mockFunctions.handleResourceFetchError
    }));
    return mockFunctions;
}
/**
 * Utility function to extract the registered callback from a mock server
 *
 * @param mockServer The mock MCP server instance
 * @param callIndex The index of the resource.mock.calls array to extract from (default: 0)
 * @returns The registered callback function
 */
function extractRegisteredCallback(mockServer, callIndex = 0) {
    if (mockServer.resource.mock.calls.length <= callIndex) {
        throw new Error(`No resource registered at index ${callIndex}`);
    }
    const call = mockServer.resource.mock.calls[callIndex];
    if (call.length < 3) {
        throw new Error(`Resource call at index ${callIndex} does not have a callback`);
    }
    return call[2];
}
