// Import logger module - this will be mocked in tests
import logger from './logger.js';

// In tests, this will be the mock implementation
// In production, this will be the actual logger

// Error types enum for consistent error categorization
export enum ErrorType {
  CONFIGURATION = 'CONFIGURATION_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  MAAS_API = 'MAAS_API_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  INTERNAL = 'INTERNAL_ERROR',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED_ERROR',
  RESOURCE_BUSY = 'RESOURCE_BUSY_ERROR',
  INVALID_STATE = 'INVALID_STATE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  OPERATION_ABORTED = 'OPERATION_ABORTED_ERROR',
}

// Enhanced MaasServerError class with type and details
export class MaasServerError extends Error {
  constructor(
    message: string,
    public type: ErrorType,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'MaasServerError';
  }
}

// Legacy error classes for backward compatibility
export class MaasApiError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'MaasApiError';
  }
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

// Global error handler for uncaught exceptions
export function setupGlobalErrorHandlers() {
  process.on('uncaughtException', (error) => {
    try {
      if (typeof logger?.error === 'function') {
        logger.error('Uncaught exception', error);
      }
    } catch (logError) {
      // Ignore logging errors in tests
    }
    
    // In production, you might want to restart the process or notify administrators
    if (process.env.NODE_ENV === 'production') {
      // Perform graceful shutdown or restart
      process.exit(1);
    }
  });

  process.on('unhandledRejection', (reason, promise) => {
    try {
      if (typeof logger?.error === 'function') {
        logger.error(`Unhandled promise rejection`, reason as Error);
      }
    } catch (logError) {
      // Ignore logging errors in tests
    }
  });
}

// Helper function to handle errors in async routes/handlers
export function asyncHandler(fn: (...args: any[]) => Promise<any>) {
  return async function(...args: any[]) {
    try {
      return await fn(...args);
    } catch (error) {
      // Try to log the error, but don't fail if logger is not available
      try {
        if (typeof logger?.error === 'function') {
          logger.error('Error in async handler', error as Error);
        }
      } catch (logError) {
        // Ignore logging errors in tests
      }
      throw error; // Re-throw for the MCP server to handle
    }
  };
}

/**
 * Converts an error to a standardized MCP result format
 * @param error The error to convert
 * @param defaultMessage Default message to use if error doesn't have a message
 * @returns MCP formatted error result
 */
export function errorToMcpResult(error: any, defaultMessage: string = 'An unexpected error occurred'): any {
  try {
    if (typeof logger?.error === 'function') {
      logger.error({ error }, 'Converting error to MCP result');
    }
  } catch (logError) {
    // Ignore logging errors in tests
  }
  
  // Handle MaasServerError specifically
  if (error instanceof MaasServerError) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: error.message
        },
        {
          type: 'json',
          json: {
            type: error.type,
            statusCode: error.statusCode,
            details: error.details
          }
        }
      ]
    };
  }
  
  // Handle generic Error objects
  if (error instanceof Error) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: error.message || defaultMessage
        }
      ]
    };
  }
  
  // Handle non-Error objects
  return {
    isError: true,
    content: [
      {
        type: 'text',
        text: typeof error === 'string' ? error : defaultMessage
      }
    ]
  };
}

/**
 * Handles MAAS API errors and converts them to MaasServerError
 * @param error The error from MAAS API
 * @returns MaasServerError with appropriate type and status code
 */
export function handleMaasApiError(error: any): MaasServerError {
  try {
    if (typeof logger?.debug === 'function') {
      logger.debug({ error }, 'Handling MAAS API error');
    }
  } catch (logError) {
    // Ignore logging errors in tests
  }
  
  const message = error.message || 'Unknown MAAS API error';
  const status = error.status || error.statusCode || 500;
  
  // Check for abort errors
  if (error.name === 'AbortedOperationError' ||
      error.name === 'AbortError' ||
      message.includes('aborted') ||
      message.includes('canceled')) {
    return new MaasServerError(
      `Operation aborted: ${message}`,
      ErrorType.OPERATION_ABORTED,
      499 // Client Closed Request
    );
  }
  
  // Authentication errors
  if (status === 401 || message.includes('auth') || message.includes('unauthorized')) {
    return new MaasServerError(
      'Authentication failed with MAAS API',
      ErrorType.AUTHENTICATION,
      401
    );
  }
  
  // Not found errors
  if (status === 404 || message.includes('not found')) {
    return new MaasServerError(
      'Resource not found in MAAS API',
      ErrorType.NOT_FOUND,
      404
    );
  }
  
  // Permission errors
  if (status === 403 || message.includes('permission') || message.includes('forbidden')) {
    return new MaasServerError(
      'Permission denied for this MAAS API operation',
      ErrorType.PERMISSION_DENIED,
      403
    );
  }
  
  // Conflict errors
  if (status === 409 || message.includes('conflict') || message.includes('already exists')) {
    return new MaasServerError(
      'Resource conflict in MAAS API',
      ErrorType.RESOURCE_CONFLICT,
      409
    );
  }
  
  // Invalid state errors
  if (message.includes('invalid state') || message.includes('cannot be') || message.includes('not in')) {
    return new MaasServerError(
      'Resource is in an invalid state for this operation',
      ErrorType.INVALID_STATE,
      400
    );
  }
  
  // Network errors
  if (message.includes('network') || message.includes('connection') || message.includes('timeout') ||
      error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return new MaasServerError(
      'Network error while communicating with MAAS API',
      ErrorType.NETWORK_ERROR,
      500
    );
  }
  
  // Resource busy errors
  if (message.includes('busy') || message.includes('in use') || message.includes('locked')) {
    return new MaasServerError(
      'Resource is busy or locked',
      ErrorType.RESOURCE_BUSY,
      423
    );
  }
  
  // Default to generic MAAS API error
  return new MaasServerError(
    `MAAS API error: ${message}`,
    ErrorType.MAAS_API,
    status,
    { originalError: error.message }
  );
}

/**
 * Handles validation errors
 * @param message Error message
 * @param details Additional error details
 * @returns MaasServerError with VALIDATION type
 */
export function handleValidationError(message: string, details?: any): MaasServerError {
  return new MaasServerError(
    message,
    ErrorType.VALIDATION,
    400,
    details
  );
}