"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRequestId = exports.createRequestLogger = void 0;
const pino_1 = __importDefault(require("pino"));
const config_js_1 = __importDefault(require("../config.js"));
// Create a unique request ID generator
const generateRequestId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
};
exports.generateRequestId = generateRequestId;
// Configure pino logger
console.log('Config:', config_js_1.default);
// Create the logger instance with pino
const logger = (0, pino_1.default)({
    level: config_js_1.default.logLevel || 'info',
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
exports.createRequestLogger = createRequestLogger;
// Export the logger directly so it has the child method
exports.default = logger;
