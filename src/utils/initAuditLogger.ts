/**
 * Initialize audit logger with configuration options
 */
import config from '../config.js';
import auditLogger, { setAuditLogOptions } from './auditLogger.js';
import logger from './logger.js';

/**
 * Initialize the audit logger with configuration options
 */
export function initializeAuditLogger(): void {
  // Set audit log options from configuration
  setAuditLogOptions({
    includeResourceState: config.auditLogIncludeResourceState,
    maskSensitiveFields: config.auditLogMaskSensitiveFields,
    sensitiveFields: config.auditLogSensitiveFields.split(',').map(field => field.trim()),
    logToFile: config.auditLogToFile,
    logFilePath: config.auditLogFilePath
  });

  logger.info('Audit logger initialized', {
    enabled: config.auditLogEnabled,
    includeResourceState: config.auditLogIncludeResourceState,
    maskSensitiveFields: config.auditLogMaskSensitiveFields,
    logToFile: config.auditLogToFile
  });
}

export default initializeAuditLogger;