/**
 * Audit logger for MCP resources
 * Provides specialized logging for resource access and modifications to support auditing requirements
 */
import pino from 'pino';
import config from '../config.js';
import logger from './logger.js';
import { generateRequestId } from './logger.js';

// Create a child logger specifically for audit logs
const auditLogger = logger.child({
  module: 'AuditLog',
  // Add a special marker to easily filter audit logs
  audit: true
});

/**
 * Log levels for audit events
 */
export enum AuditLogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * Types of audit events
 */
export enum AuditEventType {
  RESOURCE_ACCESS = 'resource_access',
  RESOURCE_MODIFICATION = 'resource_modification',
  RESOURCE_CREATION = 'resource_creation',
  RESOURCE_DELETION = 'resource_deletion',
  CACHE_OPERATION = 'cache_operation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization'
}

/**
 * Interface for audit log entry
 */
export interface AuditLogEntry {
  eventType: AuditEventType;
  resourceType: string;
  resourceId?: string;
  action: string;
  status: 'success' | 'failure';
  userId?: string;
  ipAddress?: string;
  requestId: string;
  timestamp: string;
  details?: Record<string, any>;
  beforeState?: any;
  afterState?: any;
  errorDetails?: any;
}

/**
 * Options for audit logging
 */
export interface AuditLogOptions {
  // Whether to include the full resource state in logs
  includeResourceState: boolean;
  // Whether to mask sensitive fields in the resource state
  maskSensitiveFields: boolean;
  // List of sensitive field names to mask
  sensitiveFields: string[];
  // Whether to log to a separate file
  logToFile: boolean;
  // Path to the audit log file
  logFilePath?: string;
}

// Default audit log options
const defaultAuditLogOptions: AuditLogOptions = {
  includeResourceState: false,
  maskSensitiveFields: true,
  sensitiveFields: ['password', 'token', 'secret', 'key', 'credential'],
  logToFile: false
};

// Current audit log options
let auditLogOptions: AuditLogOptions = { ...defaultAuditLogOptions };

/**
 * Set audit log options
 * 
 * @param options The options to set
 */
export function setAuditLogOptions(options: Partial<AuditLogOptions>): void {
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
export function getAuditLogOptions(): AuditLogOptions {
  return { ...auditLogOptions };
}

/**
 * Mask sensitive fields in an object
 * 
 * @param obj The object to mask
 * @param sensitiveFields Array of sensitive field names
 * @returns A new object with sensitive fields masked
 */
function maskSensitiveData(obj: any, sensitiveFields: string[] = auditLogOptions.sensitiveFields): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  const result = Array.isArray(obj) ? [...obj] : { ...obj };
  
  for (const key in result) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      result[key] = '********';
    } else if (typeof result[key] === 'object') {
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
function prepareResourceState(state: any): any {
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
function logAuditEvent(level: AuditLogLevel, entry: AuditLogEntry): void {
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
export function logResourceAccess(
  resourceType: string,
  resourceId: string | undefined,
  action: string,
  requestId: string,
  userId?: string,
  ipAddress?: string,
  details?: Record<string, any>,
  resourceState?: any
): void {
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
export function logResourceAccessFailure(
  resourceType: string,
  resourceId: string | undefined,
  action: string,
  requestId: string,
  error: any,
  userId?: string,
  ipAddress?: string,
  details?: Record<string, any>
): void {
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
export function logResourceModification(
  resourceType: string,
  resourceId: string,
  action: string,
  requestId: string,
  beforeState?: any,
  afterState?: any,
  userId?: string,
  ipAddress?: string,
  details?: Record<string, any>
): void {
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
export function logResourceModificationFailure(
  resourceType: string,
  resourceId: string,
  action: string,
  requestId: string,
  error: any,
  beforeState?: any,
  userId?: string,
  ipAddress?: string,
  details?: Record<string, any>
): void {
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
export function logCacheOperation(
  resourceType: string,
  action: string,
  requestId: string,
  resourceId?: string,
  details?: Record<string, any>
): void {
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

export default {
  logResourceAccess,
  logResourceAccessFailure,
  logResourceModification,
  logResourceModificationFailure,
  logCacheOperation,
  setAuditLogOptions,
  getAuditLogOptions
};