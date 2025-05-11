import pino from 'pino';
import config from '../config.js';

// Create a unique request ID generator
export const generateRequestId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Configure pino logger
const logger = pino({
  level: config.logLevel,
  transport: config.nodeEnv === 'development'
    ? { target: 'pino-pretty' }
    : undefined,
  base: undefined, // Don't include pid and hostname in every log
});

// Create a child logger with request context
export const createRequestLogger = (requestId: string, method?: string, params?: any) => {
  return logger.child({
    requestId,
    method,
    params: params ? JSON.stringify(params).substring(0, 200) : undefined,
  });
};

export default logger;