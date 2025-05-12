// Import logger module - this will be mocked in tests
const logger = require('./logger');

// In tests, this will be the mock implementation
// In production, this will be the actual logger

// Error types enum for consistent error categorization
const ErrorType = {
  CONFIGURATION: 'CONFIGURATION_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  AUTHENTICATION: 'AUTHENTICATION_ERROR',
  AUTHORIZATION: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND_ERROR',
  MAAS_API: 'MAAS_API_ERROR',
  INTERNAL: 'INTERNAL_ERROR',
  NETWORK: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR'
};

// Base error class for MAAS server errors
class MaasServerError extends Error {
  constructor(message, type = ErrorType.UNKNOWN, details = {}) {
    super(message);
    this.name = 'MaasServerError';
    this.type = type;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Handle validation errors from zod or other validation libraries
 * @param {Error} error The validation error
 * @returns {MaasServerError} A standardized error object
 */
function handleValidationError(error) {
  logger.error({ error }, 'Validation error occurred');
  
  // Extract validation details if available (e.g., from zod)
  const details = error.errors || error.issues || {};
  
  return new MaasServerError(
    'Validation failed: ' + error.message,
    ErrorType.VALIDATION,
    details
  );
}

/**
 * Handle errors from the MAAS API
 * @param {Error} error The error from the MAAS API
 * @returns {MaasServerError} A standardized error object
 */
function handleMaasApiError(error) {
  logger.error({ error }, 'MAAS API error occurred');
  
  // Extract status code and response body if available
  const statusCode = error.statusCode || error.status || 500;
  const details = {
    statusCode,
    body: error.body || error.response || {},
    message: error.message
  };
  
  return new MaasServerError(
    'MAAS API error: ' + error.message,
    ErrorType.MAAS_API,
    details
  );
}

/**
 * Convert an error to a standardized MCP result object
 * @param {Error} error The error to convert
 * @returns {Object} An object with error details formatted for MCP response
 */
function errorToMcpResult(error) {
  // If it's already a MaasServerError, use it directly
  if (error instanceof MaasServerError) {
    return {
      success: false,
      error: {
        type: error.type,
        message: error.message,
        details: error.details
      }
    };
  }
  
  // Otherwise, create a generic error response
  logger.error({ error }, 'Converting error to MCP result');
  
  return {
    success: false,
    error: {
      type: ErrorType.UNKNOWN,
      message: error.message || 'An unknown error occurred',
      details: {}
    }
  };
}

module.exports = {
  ErrorType,
  MaasServerError,
  handleValidationError,
  handleMaasApiError,
  errorToMcpResult
};