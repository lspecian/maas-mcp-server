const pino = require('pino');
const config = require('../config');

// Create a unique request ID generator
const generateRequestId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Configure pino logger
console.log('Config:', config);

// Create the logger instance with pino
const logger = pino({
  level: config.logLevel || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  }
});

// Create a child logger with request context
const createRequestLogger = (operation) => {
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