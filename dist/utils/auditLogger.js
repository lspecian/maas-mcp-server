"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditEventType = exports.AuditLogLevel = void 0;
exports.setAuditLogOptions = setAuditLogOptions;
exports.getAuditLogOptions = getAuditLogOptions;
exports.logResourceAccess = logResourceAccess;
exports.logResourceAccessFailure = logResourceAccessFailure;
exports.logResourceModification = logResourceModification;
exports.logResourceModificationFailure = logResourceModificationFailure;
exports.logCacheOperation = logCacheOperation;
/**
 * Audit logger for MCP resources
 * Provides specialized logging for resource access and modifications to support auditing requirements
 */
const pino = require('pino');
const config = require('../config');
const logger = require('./logger');
const { generateRequestId } = require('./logger');
// Create a child logger specifically for audit logs
const auditLogger = logger.child({
    module: 'AuditLog',
    // Add a special marker to easily filter audit logs
    audit: true
});
/**
 * Log levels for audit events
 */
var AuditLogLevel;
(function (AuditLogLevel) {
    AuditLogLevel["INFO"] = "info";
    AuditLogLevel["WARN"] = "warn";
    AuditLogLevel["ERROR"] = "error";
})(AuditLogLevel || (exports.AuditLogLevel = AuditLogLevel = {}));
/**
 * Types of audit events
 */
var AuditEventType;
(function (AuditEventType) {
    AuditEventType["RESOURCE_ACCESS"] = "resource_access";
    AuditEventType["RESOURCE_MODIFICATION"] = "resource_modification";
    AuditEventType["RESOURCE_CREATION"] = "resource_creation";
    AuditEventType["RESOURCE_DELETION"] = "resource_deletion";
    AuditEventType["CACHE_OPERATION"] = "cache_operation";
    AuditEventType["AUTHENTICATION"] = "authentication";
    AuditEventType["AUTHORIZATION"] = "authorization";
})(AuditEventType || (exports.AuditEventType = AuditEventType = {}));
// Default audit log options
const defaultAuditLogOptions = {
    includeResourceState: false,
    maskSensitiveFields: true,
    sensitiveFields: ['password', 'token', 'secret', 'key', 'credential'],
    logToFile: false
};
// Current audit log options
let auditLogOptions = { ...defaultAuditLogOptions };
/**
 * Set audit log options
 *
 * @param options The options to set
 */
function setAuditLogOptions(options) {
    auditLogOptions = {
        ...auditLogOptions,
        ...options
    };
    logger.debug('Updated audit log options', auditLogOptions);
}
/**
 * Get current audit log options
 *
 * @returns The current audit log options
 */
function getAuditLogOptions() {
    return { ...auditLogOptions };
}
/**
 * Mask sensitive fields in an object
 *
 * @param obj The object to mask
 * @param sensitiveFields Array of sensitive field names
 * @returns A new object with sensitive fields masked
 */
function maskSensitiveData(obj, sensitiveFields = auditLogOptions.sensitiveFields) {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }
    const result = Array.isArray(obj) ? [...obj] : { ...obj };
    for (const key in result) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
            result[key] = '********';
        }
        else if (typeof result[key] === 'object') {
            result[key] = maskSensitiveData(result[key], sensitiveFields);
        }
    }
    return result;
}
/**
 * Prepare resource state for logging
 *
 * @param state The resource state
 * @returns The prepared state for logging
 */
function prepareResourceState(state) {
    if (!auditLogOptions.includeResourceState) {
        return undefined;
    }
    if (!state) {
        return state;
    }
    if (auditLogOptions.maskSensitiveFields) {
        return maskSensitiveData(state);
    }
    return state;
}
/**
 * Log an audit event
 *
 * @param level The log level
 * @param entry The audit log entry
 */
function logAuditEvent(level, entry) {
    // Prepare the entry for logging
    const logEntry = {
        ...entry,
        beforeState: prepareResourceState(entry.beforeState),
        afterState: prepareResourceState(entry.afterState)
    };
    // Log the event
    auditLogger[level](logEntry, `${entry.eventType}: ${entry.action} ${entry.resourceType}${entry.resourceId ? ` (${entry.resourceId})` : ''} - ${entry.status}`);
}
/**
 * Log a resource access event
 *
 * @param resourceType The type of resource being accessed
 * @param resourceId The ID of the resource (optional)
 * @param action The action being performed
 * @param requestId The request ID
 * @param userId The user ID (optional)
 * @param ipAddress The IP address (optional)
 * @param details Additional details (optional)
 * @param resourceState The state of the resource (optional)
 */
function logResourceAccess(resourceType, resourceId, action, requestId, userId, ipAddress, details, resourceState) {
    logAuditEvent(AuditLogLevel.INFO, {
        eventType: AuditEventType.RESOURCE_ACCESS,
        resourceType,
        resourceId,
        action,
        status: 'success',
        userId,
        ipAddress,
        requestId,
        timestamp: new Date().toISOString(),
        details,
        afterState: resourceState
    });
}
/**
 * Log a resource access failure event
 *
 * @param resourceType The type of resource being accessed
 * @param resourceId The ID of the resource (optional)
 * @param action The action being performed
 * @param requestId The request ID
 * @param error The error that occurred
 * @param userId The user ID (optional)
 * @param ipAddress The IP address (optional)
 * @param details Additional details (optional)
 */
function logResourceAccessFailure(resourceType, resourceId, action, requestId, error, userId, ipAddress, details) {
    logAuditEvent(AuditLogLevel.ERROR, {
        eventType: AuditEventType.RESOURCE_ACCESS,
        resourceType,
        resourceId,
        action,
        status: 'failure',
        userId,
        ipAddress,
        requestId,
        timestamp: new Date().toISOString(),
        details,
        errorDetails: error instanceof Error ? { message: error.message, stack: error.stack } : error
    });
}
/**
 * Log a resource modification event
 *
 * @param resourceType The type of resource being modified
 * @param resourceId The ID of the resource
 * @param action The action being performed
 * @param requestId The request ID
 * @param beforeState The state before modification (optional)
 * @param afterState The state after modification (optional)
 * @param userId The user ID (optional)
 * @param ipAddress The IP address (optional)
 * @param details Additional details (optional)
 */
function logResourceModification(resourceType, resourceId, action, requestId, beforeState, afterState, userId, ipAddress, details) {
    logAuditEvent(AuditLogLevel.INFO, {
        eventType: AuditEventType.RESOURCE_MODIFICATION,
        resourceType,
        resourceId,
        action,
        status: 'success',
        userId,
        ipAddress,
        requestId,
        timestamp: new Date().toISOString(),
        details,
        beforeState,
        afterState
    });
}
/**
 * Log a resource modification failure event
 *
 * @param resourceType The type of resource being modified
 * @param resourceId The ID of the resource
 * @param action The action being performed
 * @param requestId The request ID
 * @param error The error that occurred
 * @param beforeState The state before the attempted modification (optional)
 * @param userId The user ID (optional)
 * @param ipAddress The IP address (optional)
 * @param details Additional details (optional)
 */
function logResourceModificationFailure(resourceType, resourceId, action, requestId, error, beforeState, userId, ipAddress, details) {
    logAuditEvent(AuditLogLevel.ERROR, {
        eventType: AuditEventType.RESOURCE_MODIFICATION,
        resourceType,
        resourceId,
        action,
        status: 'failure',
        userId,
        ipAddress,
        requestId,
        timestamp: new Date().toISOString(),
        details,
        beforeState,
        errorDetails: error instanceof Error ? { message: error.message, stack: error.stack } : error
    });
}
/**
 * Log a cache operation event
 *
 * @param resourceType The type of resource
 * @param action The cache action (e.g., 'hit', 'miss', 'set', 'invalidate')
 * @param requestId The request ID
 * @param resourceId The ID of the resource (optional)
 * @param details Additional details (optional)
 */
function logCacheOperation(resourceType, action, requestId, resourceId, details) {
    logAuditEvent(AuditLogLevel.INFO, {
        eventType: AuditEventType.CACHE_OPERATION,
        resourceType,
        resourceId,
        action,
        status: 'success',
        requestId,
        timestamp: new Date().toISOString(),
        details
    });
}
exports.default = {
    logResourceAccess,
    logResourceAccessFailure,
    logResourceModification,
    logResourceModificationFailure,
    logCacheOperation,
    setAuditLogOptions,
    getAuditLogOptions
};
