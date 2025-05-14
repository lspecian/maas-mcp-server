"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorMessages = void 0;
/**
 * Error message templates for common scenarios in MAAS MCP server
 * Provides consistent error messaging across all tools
 */
exports.ErrorMessages = {
    // Resource not found
    resourceNotFound: (resourceType, id) => `${resourceType} with ID '${id}' not found`,
    // Resource already exists
    resourceExists: (resourceType, identifier) => `${resourceType} with identifier '${identifier}' already exists`,
    // Invalid resource state
    invalidState: (resourceType, id, currentState, requiredState) => `${resourceType} '${id}' is in state '${currentState}' but must be in state '${requiredState}' for this operation`,
    // Permission denied
    permissionDenied: (operation, resourceType, id) => id ? `Permission denied to ${operation} ${resourceType} '${id}'` : `Permission denied to ${operation} ${resourceType}`,
    // Validation errors
    invalidParameter: (param, reason) => `Invalid parameter '${param}': ${reason}`,
    missingParameter: (param) => `Missing required parameter: '${param}'`,
    // Network errors
    networkError: (details) => `Network error communicating with MAAS API: ${details}`,
    // Authentication errors
    authenticationFailed: (details) => details ? `Authentication failed: ${details}` : 'Authentication failed with MAAS API',
    // General errors
    operationFailed: (operation, resourceType, reason) => `Failed to ${operation} ${resourceType}: ${reason}`,
    // Resource busy
    resourceBusy: (resourceType, id) => `${resourceType} '${id}' is currently busy or locked`,
    // Resource conflict
    resourceConflict: (resourceType, id, details) => details ? `Conflict with ${resourceType} '${id}': ${details}` : `Conflict with ${resourceType} '${id}'`,
    // Internal server error
    internalError: (details) => details ? `Internal server error: ${details}` : 'Internal server error',
    // API error
    apiError: (statusCode, details) => details ? `MAAS API error (${statusCode}): ${details}` : `MAAS API error (${statusCode})`,
    // Invalid credentials
    invalidCredentials: () => 'Invalid MAAS API credentials',
    // Connection error
    connectionError: (details) => details ? `Connection error: ${details}` : 'Connection error to MAAS API',
    // Timeout error
    timeoutError: (operation) => `Timeout while ${operation}`,
    // Resource in use
    resourceInUse: (resourceType, id) => `${resourceType} '${id}' is currently in use and cannot be modified`,
    // Invalid configuration
    invalidConfiguration: (details) => `Invalid configuration: ${details}`
};
