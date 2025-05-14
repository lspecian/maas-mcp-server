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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractAndValidateParams = extractAndValidateParams;
exports.validateResourceData = validateResourceData;
exports.handleResourceFetchError = handleResourceFetchError;
/**
 * Utility functions for MCP resources
 */
const uriPatterns_js_1 = require("../schemas/uriPatterns.js");
const maas_ts_1 = require("../../types/maas.ts");
const logger_ts_1 = __importStar(require("../../utils/logger.ts"));
const zod_1 = require("zod");
const auditLogger_js_1 = __importDefault(require("../../utils/auditLogger.js"));
/**
 * Extracts and validates parameters from a URI using a Zod schema
 *
 * @param uri The URI to extract parameters from
 * @param pattern The URI pattern to match against
 * @param schema The Zod schema to validate the parameters against
 * @param resourceName The name of the resource (for error messages)
 * @returns The validated parameters
 * @throws MaasApiError if the parameters are invalid or missing
 */
function extractAndValidateParams(uri, pattern, schema, resourceName) {
    try {
        // Extract parameters from URI
        const params = (0, uriPatterns_js_1.extractParamsFromUri)(uri, pattern);
        // Validate parameters against schema
        return schema.parse(params);
    }
    catch (error) {
        // Generate a request ID for audit logging
        const requestId = (0, logger_ts_1.generateRequestId)();
        if (error instanceof zod_1.ZodError) {
            logger_ts_1.default.error(`Invalid parameters for ${resourceName} request`, {
                error: error.message,
                issues: error.errors
            });
            // Create the error object
            const maasError = new maas_ts_1.MaasApiError(`Invalid parameters for ${resourceName} request`, 400, 'invalid_parameters', { zodErrors: error.errors });
            // Log to audit logger
            auditLogger_js_1.default.logResourceAccessFailure(resourceName, undefined, // No resource ID for this case
            'validate_params', requestId, maasError, undefined, // No user ID
            undefined, // No IP address
            {
                uri,
                pattern
            });
            throw maasError;
        }
        // If it's already a MaasApiError, just log and re-throw it
        if (error instanceof maas_ts_1.MaasApiError) {
            // Log to audit logger
            auditLogger_js_1.default.logResourceAccessFailure(resourceName, undefined, // No resource ID for this case
            'validate_params', requestId, error, undefined, // No user ID
            undefined, // No IP address
            {
                uri,
                pattern
            });
            throw error;
        }
        // Otherwise, wrap it
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger_ts_1.default.error(`Error processing ${resourceName} request: ${errorMessage}`);
        // Create the error object
        const maasError = new maas_ts_1.MaasApiError(`Error processing ${resourceName} request: ${errorMessage}`, 500, 'unexpected_error');
        // Log to audit logger
        auditLogger_js_1.default.logResourceAccessFailure(resourceName, undefined, // No resource ID for this case
        'validate_params', requestId, maasError, undefined, // No user ID
        undefined, // No IP address
        {
            uri,
            pattern,
            originalError: errorMessage
        });
        throw maasError;
    }
}
/**
 * Validates data against a schema and handles validation errors
 *
 * @param data The data to validate
 * @param schema The Zod schema to validate against
 * @param resourceName The name of the resource (for error messages)
 * @param resourceId Optional resource ID for more specific error messages
 * @returns The validated data
 * @throws MaasApiError if validation fails
 */
function validateResourceData(data, schema, resourceName, resourceId) {
    try {
        return schema.parse(data);
    }
    catch (error) {
        // Generate a request ID for audit logging
        const requestId = (0, logger_ts_1.generateRequestId)();
        if (error instanceof zod_1.ZodError) {
            const idMessage = resourceId ? ` for '${resourceId}'` : '';
            logger_ts_1.default.error(`${resourceName} data validation failed${idMessage}`, {
                error: error.message,
                issues: error.errors
            });
            // Create the error object
            const maasError = new maas_ts_1.MaasApiError(`${resourceName} data validation failed${idMessage}: The MAAS API returned data in an unexpected format`, 422, 'validation_error', { zodErrors: error.errors });
            // Log to audit logger
            auditLogger_js_1.default.logResourceAccessFailure(resourceName, resourceId, 'validate_data', requestId, maasError, undefined, // No user ID
            undefined, // No IP address
            {
                data
            });
            throw maasError;
        }
        // If it's not a ZodError, log it to audit logger and re-throw
        auditLogger_js_1.default.logResourceAccessFailure(resourceName, resourceId, 'validate_data', requestId, error instanceof Error ? error : new Error(String(error)), undefined, // No user ID
        undefined, // No IP address
        {
            data
        });
        throw error; // Re-throw if it's not a ZodError
    }
}
/**
 * Handles common API errors for resource fetching
 *
 * @param error The error to handle
 * @param resourceName The name of the resource (for error messages)
 * @param resourceId Optional resource ID for more specific error messages
 * @throws MaasApiError with appropriate error details
 */
function handleResourceFetchError(error, resourceName, resourceId, context) {
    const idMessage = resourceId ? ` for ${resourceId}` : '';
    // Generate a request ID for audit logging
    const requestId = (0, logger_ts_1.generateRequestId)();
    if (error instanceof maas_ts_1.MaasApiError) {
        // Already a MaasApiError, just log and re-throw
        logger_ts_1.default.error(`MAAS API error fetching ${resourceName}${idMessage}: ${error.message}`, {
            statusCode: error.statusCode,
            errorCode: error.maasErrorCode,
            ...context
        });
        // Special handling for 404 errors
        if (error.statusCode === 404 && resourceId) {
            const notFoundError = new maas_ts_1.MaasApiError(`${resourceName} '${resourceId}' not found`, 404, 'resource_not_found');
            // Log to audit logger
            auditLogger_js_1.default.logResourceAccessFailure(resourceName, resourceId, 'fetch', requestId, notFoundError, undefined, // No user ID
            undefined, // No IP address
            context);
            throw notFoundError;
        }
        // Log to audit logger
        auditLogger_js_1.default.logResourceAccessFailure(resourceName, resourceId, 'fetch', requestId, error, undefined, // No user ID
        undefined, // No IP address
        context);
        throw error;
    }
    else if (error.name === 'AbortError') {
        // Request was aborted
        logger_ts_1.default.warn(`${resourceName} request${idMessage} was aborted`, context);
        const abortError = new maas_ts_1.MaasApiError(`${resourceName} request${idMessage} was aborted by the client`, 499, 'request_aborted');
        // Log to audit logger
        auditLogger_js_1.default.logResourceAccessFailure(resourceName, resourceId, 'fetch', requestId, abortError, undefined, // No user ID
        undefined, // No IP address
        context);
        throw abortError;
    }
    else if (error.cause?.code === 'ECONNREFUSED' || error.cause?.code === 'ENOTFOUND') {
        // Network connectivity issues
        logger_ts_1.default.error(`Network error fetching ${resourceName}${idMessage}: ${error.message}`, {
            code: error.cause?.code,
            errno: error.cause?.errno,
            ...context
        });
        const networkError = new maas_ts_1.MaasApiError('Failed to connect to MAAS API: Network connectivity issue', 503, 'network_error', { originalError: error.message });
        // Log to audit logger
        auditLogger_js_1.default.logResourceAccessFailure(resourceName, resourceId, 'fetch', requestId, networkError, undefined, // No user ID
        undefined, // No IP address
        {
            ...context,
            code: error.cause?.code,
            errno: error.cause?.errno
        });
        throw networkError;
    }
    else if (error.cause?.code === 'ETIMEDOUT') {
        // Timeout issues
        logger_ts_1.default.error(`Timeout error fetching ${resourceName}${idMessage}: ${error.message}`, context);
        const timeoutError = new maas_ts_1.MaasApiError(`MAAS API request timed out while fetching ${resourceName}${idMessage}`, 504, 'request_timeout', { originalError: error.message });
        // Log to audit logger
        auditLogger_js_1.default.logResourceAccessFailure(resourceName, resourceId, 'fetch', requestId, timeoutError, undefined, // No user ID
        undefined, // No IP address
        context);
        throw timeoutError;
    }
    else {
        // Generic error handling
        logger_ts_1.default.error(`Unexpected error fetching ${resourceName}${idMessage}: ${error.message}`, {
            stack: error.stack,
            ...context
        });
        const genericError = new maas_ts_1.MaasApiError(`Could not fetch ${resourceName}${idMessage}: ${error.message}`, 500, 'unexpected_error', { originalError: error.message });
        // Log to audit logger
        auditLogger_js_1.default.logResourceAccessFailure(resourceName, resourceId, 'fetch', requestId, genericError, undefined, // No user ID
        undefined, // No IP address
        {
            ...context,
            stack: error.stack
        });
        throw genericError;
    }
}
