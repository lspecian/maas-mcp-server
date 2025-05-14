"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockAuditLoggerConfigs = void 0;
exports.createMockAuditLogger = createMockAuditLogger;
exports.setupMockAuditLogger = setupMockAuditLogger;
exports.getAuditLoggerCallCounts = getAuditLoggerCallCounts;
/**
 * Creates a mock AuditLogger with configurable behavior
 *
 * @param options Configuration options for the mock audit logger
 * @returns A mocked AuditLogger instance
 */
function createMockAuditLogger(options = {}) {
    const { simulateErrors = false, trackCalls = true, customImplementations = {} } = options;
    // Call counts for tracking
    const callCounts = {
        logResourceAccess: 0,
        logResourceAccessFailure: 0,
        logResourceModification: 0,
        logResourceModificationFailure: 0,
        logCacheOperation: 0,
        setAuditLogOptions: 0,
        getAuditLogOptions: 0
    };
    // Default audit log options
    const defaultAuditLogOptions = {
        includeResourceState: false,
        maskSensitiveFields: true,
        sensitiveFields: ['password', 'token', 'secret', 'key', 'credential'],
        logToFile: false
    };
    // Current audit log options
    let auditLogOptions = { ...defaultAuditLogOptions };
    // Create the mock instance
    const mockAuditLogger = {
        logResourceAccess: jest.fn(),
        logResourceAccessFailure: jest.fn(),
        logResourceModification: jest.fn(),
        logResourceModificationFailure: jest.fn(),
        logCacheOperation: jest.fn(),
        setAuditLogOptions: jest.fn(),
        getAuditLogOptions: jest.fn()
    };
    // Implement mock methods
    mockAuditLogger.logResourceAccess.mockImplementation((resourceType, resourceId, action, requestId, userId, ipAddress, details, resourceState) => {
        if (trackCalls)
            callCounts.logResourceAccess++;
        if (simulateErrors) {
            throw new Error(`Mock error in logResourceAccess for ${resourceType}`);
        }
        if (customImplementations.logResourceAccess) {
            return customImplementations.logResourceAccess(resourceType, resourceId, action, requestId, userId, ipAddress, details, resourceState);
        }
    });
    mockAuditLogger.logResourceAccessFailure.mockImplementation((resourceType, resourceId, action, requestId, error, userId, ipAddress, details) => {
        if (trackCalls)
            callCounts.logResourceAccessFailure++;
        if (simulateErrors) {
            throw new Error(`Mock error in logResourceAccessFailure for ${resourceType}`);
        }
        if (customImplementations.logResourceAccessFailure) {
            return customImplementations.logResourceAccessFailure(resourceType, resourceId, action, requestId, error, userId, ipAddress, details);
        }
    });
    mockAuditLogger.logResourceModification.mockImplementation((resourceType, resourceId, action, requestId, beforeState, afterState, userId, ipAddress, details) => {
        if (trackCalls)
            callCounts.logResourceModification++;
        if (simulateErrors) {
            throw new Error(`Mock error in logResourceModification for ${resourceType}`);
        }
        if (customImplementations.logResourceModification) {
            return customImplementations.logResourceModification(resourceType, resourceId, action, requestId, beforeState, afterState, userId, ipAddress, details);
        }
    });
    mockAuditLogger.logResourceModificationFailure.mockImplementation((resourceType, resourceId, action, requestId, error, beforeState, userId, ipAddress, details) => {
        if (trackCalls)
            callCounts.logResourceModificationFailure++;
        if (simulateErrors) {
            throw new Error(`Mock error in logResourceModificationFailure for ${resourceType}`);
        }
        if (customImplementations.logResourceModificationFailure) {
            return customImplementations.logResourceModificationFailure(resourceType, resourceId, action, requestId, error, beforeState, userId, ipAddress, details);
        }
    });
    mockAuditLogger.logCacheOperation.mockImplementation((resourceType, action, requestId, resourceId, details) => {
        if (trackCalls)
            callCounts.logCacheOperation++;
        if (simulateErrors) {
            throw new Error(`Mock error in logCacheOperation for ${resourceType}`);
        }
        if (customImplementations.logCacheOperation) {
            return customImplementations.logCacheOperation(resourceType, action, requestId, resourceId, details);
        }
    });
    mockAuditLogger.setAuditLogOptions.mockImplementation((options) => {
        if (trackCalls)
            callCounts.setAuditLogOptions++;
        if (simulateErrors) {
            throw new Error('Mock error in setAuditLogOptions');
        }
        auditLogOptions = {
            ...auditLogOptions,
            ...options
        };
    });
    mockAuditLogger.getAuditLogOptions.mockImplementation(() => {
        if (trackCalls)
            callCounts.getAuditLogOptions++;
        if (simulateErrors) {
            throw new Error('Mock error in getAuditLogOptions');
        }
        return { ...auditLogOptions };
    });
    // Add call counts to the mock for inspection
    mockAuditLogger.callCounts = callCounts;
    // Add reset method to clear call counts
    mockAuditLogger.resetCallCounts = () => {
        Object.keys(callCounts).forEach(key => {
            callCounts[key] = 0;
        });
    };
    return mockAuditLogger;
}
/**
 * Predefined mock audit logger configurations
 */
exports.mockAuditLoggerConfigs = {
    // Default configuration
    default: () => createMockAuditLogger(),
    // Configuration with errors
    withErrors: () => createMockAuditLogger({ simulateErrors: true }),
    // Configuration without call tracking
    withoutTracking: () => createMockAuditLogger({ trackCalls: false }),
    // Configuration with custom implementations
    withCustomImplementations: (customImplementations) => createMockAuditLogger({ customImplementations })
};
/**
 * Setup a mock AuditLogger for testing
 * This is a convenience function that creates a mock and sets it up as the default export
 *
 * @param options Configuration options for the mock audit logger
 * @returns The mocked AuditLogger instance
 */
function setupMockAuditLogger(options = {}) {
    const mockInstance = createMockAuditLogger(options);
    jest.mock('../../utils/auditLogger.js', () => mockInstance);
    return mockInstance;
}
/**
 * Get call counts from a mock audit logger
 *
 * @param mockLogger The mock audit logger instance
 * @returns The call counts for each method
 */
function getAuditLoggerCallCounts(mockLogger) {
    return mockLogger.callCounts;
}
