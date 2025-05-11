/**
 * Utility functions for MCP resources
 */
import { extractParamsFromUri } from '../schemas/uriPatterns.js';
import { MaasApiError } from '../../types/maas.js';
import logger, { generateRequestId } from '../../utils/logger.js';
import { ZodError, ZodSchema } from 'zod';
import auditLogger from '../../utils/auditLogger.js';

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
export function extractAndValidateParams<T>(
  uri: string,
  pattern: string,
  schema: ZodSchema<T>,
  resourceName: string
): T {
  try {
    // Extract parameters from URI
    const params = extractParamsFromUri(uri, pattern);
    
    // Validate parameters against schema
    return schema.parse(params);
  } catch (error) {
    // Generate a request ID for audit logging
    const requestId = generateRequestId();
    
    if (error instanceof ZodError) {
      logger.error(`Invalid parameters for ${resourceName} request`, {
        error: error.message,
        issues: error.errors
      });
      
      // Create the error object
      const maasError = new MaasApiError(
        `Invalid parameters for ${resourceName} request`,
        400,
        'invalid_parameters',
        { zodErrors: error.errors }
      );
      
      // Log to audit logger
      auditLogger.logResourceAccessFailure(
        resourceName,
        undefined, // No resource ID for this case
        'validate_params',
        requestId,
        maasError,
        undefined, // No user ID
        undefined, // No IP address
        {
          uri,
          pattern
        }
      );
      
      throw maasError;
    }
    
    // If it's already a MaasApiError, just log and re-throw it
    if (error instanceof MaasApiError) {
      // Log to audit logger
      auditLogger.logResourceAccessFailure(
        resourceName,
        undefined, // No resource ID for this case
        'validate_params',
        requestId,
        error,
        undefined, // No user ID
        undefined, // No IP address
        {
          uri,
          pattern
        }
      );
      
      throw error;
    }
    
    // Otherwise, wrap it
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Error processing ${resourceName} request: ${errorMessage}`);
    
    // Create the error object
    const maasError = new MaasApiError(
      `Error processing ${resourceName} request: ${errorMessage}`,
      500,
      'unexpected_error'
    );
    
    // Log to audit logger
    auditLogger.logResourceAccessFailure(
      resourceName,
      undefined, // No resource ID for this case
      'validate_params',
      requestId,
      maasError,
      undefined, // No user ID
      undefined, // No IP address
      {
        uri,
        pattern,
        originalError: errorMessage
      }
    );
    
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
export function validateResourceData<T>(
  data: unknown,
  schema: ZodSchema<T>,
  resourceName: string,
  resourceId?: string
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    // Generate a request ID for audit logging
    const requestId = generateRequestId();
    
    if (error instanceof ZodError) {
      const idMessage = resourceId ? ` for '${resourceId}'` : '';
      logger.error(`${resourceName} data validation failed${idMessage}`, {
        error: error.message,
        issues: error.errors
      });
      
      // Create the error object
      const maasError = new MaasApiError(
        `${resourceName} data validation failed${idMessage}: The MAAS API returned data in an unexpected format`,
        422,
        'validation_error',
        { zodErrors: error.errors }
      );
      
      // Log to audit logger
      auditLogger.logResourceAccessFailure(
        resourceName,
        resourceId,
        'validate_data',
        requestId,
        maasError,
        undefined, // No user ID
        undefined, // No IP address
        {
          data
        }
      );
      
      throw maasError;
    }
    
    // If it's not a ZodError, log it to audit logger and re-throw
    auditLogger.logResourceAccessFailure(
      resourceName,
      resourceId,
      'validate_data',
      requestId,
      error instanceof Error ? error : new Error(String(error)),
      undefined, // No user ID
      undefined, // No IP address
      {
        data
      }
    );
    
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
export function handleResourceFetchError(
  error: any,
  resourceName: string,
  resourceId?: string,
  context?: Record<string, any>
): never {
  const idMessage = resourceId ? ` for ${resourceId}` : '';
  
  // Generate a request ID for audit logging
  const requestId = generateRequestId();
  
  if (error instanceof MaasApiError) {
    // Already a MaasApiError, just log and re-throw
    logger.error(`MAAS API error fetching ${resourceName}${idMessage}: ${error.message}`, {
      statusCode: error.statusCode,
      errorCode: error.maasErrorCode,
      ...context
    });
    
    // Special handling for 404 errors
    if (error.statusCode === 404 && resourceId) {
      const notFoundError = new MaasApiError(
        `${resourceName} '${resourceId}' not found`,
        404,
        'resource_not_found'
      );
      
      // Log to audit logger
      auditLogger.logResourceAccessFailure(
        resourceName,
        resourceId,
        'fetch',
        requestId,
        notFoundError,
        undefined, // No user ID
        undefined, // No IP address
        context
      );
      
      throw notFoundError;
    }
    
    // Log to audit logger
    auditLogger.logResourceAccessFailure(
      resourceName,
      resourceId,
      'fetch',
      requestId,
      error,
      undefined, // No user ID
      undefined, // No IP address
      context
    );
    
    throw error;
  } else if (error.name === 'AbortError') {
    // Request was aborted
    logger.warn(`${resourceName} request${idMessage} was aborted`, context);
    
    const abortError = new MaasApiError(
      `${resourceName} request${idMessage} was aborted by the client`,
      499,
      'request_aborted'
    );
    
    // Log to audit logger
    auditLogger.logResourceAccessFailure(
      resourceName,
      resourceId,
      'fetch',
      requestId,
      abortError,
      undefined, // No user ID
      undefined, // No IP address
      context
    );
    
    throw abortError;
  } else if (error.cause?.code === 'ECONNREFUSED' || error.cause?.code === 'ENOTFOUND') {
    // Network connectivity issues
    logger.error(`Network error fetching ${resourceName}${idMessage}: ${error.message}`, {
      code: error.cause?.code,
      errno: error.cause?.errno,
      ...context
    });
    
    const networkError = new MaasApiError(
      'Failed to connect to MAAS API: Network connectivity issue',
      503,
      'network_error',
      { originalError: error.message }
    );
    
    // Log to audit logger
    auditLogger.logResourceAccessFailure(
      resourceName,
      resourceId,
      'fetch',
      requestId,
      networkError,
      undefined, // No user ID
      undefined, // No IP address
      {
        ...context,
        code: error.cause?.code,
        errno: error.cause?.errno
      }
    );
    
    throw networkError;
  } else if (error.cause?.code === 'ETIMEDOUT') {
    // Timeout issues
    logger.error(`Timeout error fetching ${resourceName}${idMessage}: ${error.message}`, context);
    
    const timeoutError = new MaasApiError(
      `MAAS API request timed out while fetching ${resourceName}${idMessage}`,
      504,
      'request_timeout',
      { originalError: error.message }
    );
    
    // Log to audit logger
    auditLogger.logResourceAccessFailure(
      resourceName,
      resourceId,
      'fetch',
      requestId,
      timeoutError,
      undefined, // No user ID
      undefined, // No IP address
      context
    );
    
    throw timeoutError;
  } else {
    // Generic error handling
    logger.error(`Unexpected error fetching ${resourceName}${idMessage}: ${error.message}`, {
      stack: error.stack,
      ...context
    });
    
    const genericError = new MaasApiError(
      `Could not fetch ${resourceName}${idMessage}: ${error.message}`,
      500,
      'unexpected_error',
      { originalError: error.message }
    );
    
    // Log to audit logger
    auditLogger.logResourceAccessFailure(
      resourceName,
      resourceId,
      'fetch',
      requestId,
      genericError,
      undefined, // No user ID
      undefined, // No IP address
      {
        ...context,
        stack: error.stack
      }
    );
    
    throw genericError;
  }
}