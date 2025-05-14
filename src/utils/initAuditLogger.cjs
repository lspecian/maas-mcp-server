/**
 * Initialize audit logger with configuration options (CommonJS version)
 */
const config = require('../config.cjs');
const logger = require('./logger.cjs');

/**
 * Initialize the audit logger with configuration options
 * This is a simplified version for the FastMCP server
 */
function initializeAuditLogger() {
  // Log initialization
  logger.info('Audit logger initialized', {
    enabled: config && config.auditLogEnabled,
    includeResourceState: config && config.auditLogIncludeResourceState,
    maskSensitiveFields: config && config.auditLogMaskSensitiveFields,
    logToFile: config && config.auditLogToFile
  });
}

// Export the function
module.exports = { initializeAuditLogger };