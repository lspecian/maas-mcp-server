/**
 * Initialize audit logger with configuration options
 */
const config = require('../config');
const auditLogger = require('./auditLogger');
const { setAuditLogOptions } = require('./auditLogger');
const logger = require('./logger');

/**
 * Initialize the audit logger with configuration options
 */
function initializeAuditLogger() {
  // Set audit log options from configuration
  setAuditLogOptions({
    includeResourceState: config && config.auditLogIncludeResourceState,
    maskSensitiveFields: config && config.auditLogMaskSensitiveFields,
    sensitiveFields: config && config.auditLogSensitiveFields ? config.auditLogSensitiveFields.split(',').map(field => field.trim()) : [],
    logToFile: config && config.auditLogToFile,
    logFilePath: config && config.auditLogFilePath
  });
  
  logger.info('Audit logger initialized', {
    enabled: config && config.auditLogEnabled,
    includeResourceState: config && config.auditLogIncludeResourceState,
    maskSensitiveFields: config && config.auditLogMaskSensitiveFields,
    logToFile: config && config.auditLogToFile
  });
}

// Export the function
module.exports = { initializeAuditLogger };