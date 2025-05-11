/**
 * Error message templates for common scenarios in MAAS MCP server
 * Provides consistent error messaging across all tools
 */
export const ErrorMessages = {
  // Resource not found
  resourceNotFound: (resourceType: string, id: string) => 
    `${resourceType} with ID '${id}' not found`,
  
  // Resource already exists
  resourceExists: (resourceType: string, identifier: string) => 
    `${resourceType} with identifier '${identifier}' already exists`,
  
  // Invalid resource state
  invalidState: (resourceType: string, id: string, currentState: string, requiredState: string) => 
    `${resourceType} '${id}' is in state '${currentState}' but must be in state '${requiredState}' for this operation`,
  
  // Permission denied
  permissionDenied: (operation: string, resourceType: string, id?: string) => 
    id ? `Permission denied to ${operation} ${resourceType} '${id}'` : `Permission denied to ${operation} ${resourceType}`,
  
  // Validation errors
  invalidParameter: (param: string, reason: string) => 
    `Invalid parameter '${param}': ${reason}`,
  
  missingParameter: (param: string) => 
    `Missing required parameter: '${param}'`,
  
  // Network errors
  networkError: (details: string) => 
    `Network error communicating with MAAS API: ${details}`,
  
  // Authentication errors
  authenticationFailed: (details?: string) => 
    details ? `Authentication failed: ${details}` : 'Authentication failed with MAAS API',
  
  // General errors
  operationFailed: (operation: string, resourceType: string, reason: string) => 
    `Failed to ${operation} ${resourceType}: ${reason}`,
  
  // Resource busy
  resourceBusy: (resourceType: string, id: string) => 
    `${resourceType} '${id}' is currently busy or locked`,
  
  // Resource conflict
  resourceConflict: (resourceType: string, id: string, details?: string) => 
    details ? `Conflict with ${resourceType} '${id}': ${details}` : `Conflict with ${resourceType} '${id}'`,
  
  // Internal server error
  internalError: (details?: string) => 
    details ? `Internal server error: ${details}` : 'Internal server error',
  
  // API error
  apiError: (statusCode: number, details?: string) => 
    details ? `MAAS API error (${statusCode}): ${details}` : `MAAS API error (${statusCode})`,
  
  // Invalid credentials
  invalidCredentials: () => 
    'Invalid MAAS API credentials',
  
  // Connection error
  connectionError: (details?: string) => 
    details ? `Connection error: ${details}` : 'Connection error to MAAS API',
  
  // Timeout error
  timeoutError: (operation: string) => 
    `Timeout while ${operation}`,
  
  // Resource in use
  resourceInUse: (resourceType: string, id: string) => 
    `${resourceType} '${id}' is currently in use and cannot be modified`,
  
  // Invalid configuration
  invalidConfiguration: (details: string) => 
    `Invalid configuration: ${details}`
};