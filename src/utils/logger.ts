import pino from 'pino';
// Import config as a CommonJS module
const config = require('../config');

// Create a unique request ID generator
const generateRequestId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Configure pino logger
// Don't use console.log in MCP server mode as it breaks the protocol
// If you need to debug config, use environment variables or conditional logging

// Create the logger instance with pino
// Check if we should be completely silent (for MCP Inspector)
const isSilent = process.env.SILENT === 'true';

const logger = isSilent
  ? pino({ level: 'silent' }) // Completely silent logger
  : pino({
      level: config.logLevel || 'info',
      // Always use file transport to avoid interfering with MCP protocol
      transport: {
        target: 'pino/file',
        options: { destination: './logs/mcp-server.log' }
      }
    });

// Create a child logger with request context
const createRequestLogger = (operation: string) => {
  const requestId = generateRequestId();
  return logger.child({
    requestId,
    operation
  });
};

// Export the logger directly so it has the child method
module.exports = logger;

// Also export the helper functions
module.exports.createRequestLogger = createRequestLogger;
module.exports.generateRequestId = generateRequestId;