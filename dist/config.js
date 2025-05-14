"use strict";
/**
 * Configuration Module
 *
 * This module handles loading, validating, and providing access to the server configuration.
 * It uses Zod for schema validation to ensure all configuration values are valid and
 * provides sensible defaults where appropriate.
 *
 * @module config
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
/**
 * Load environment variables from .env file in development mode
 * In production, environment variables should be set in the deployment environment
 */
if (process.env.NODE_ENV !== 'production') {
    dotenv_1.default.config();
}
/**
 * Configuration schema with validation rules
 *
 * This schema defines all configuration options for the server, including:
 * - MAAS API connection settings
 * - Server port and environment
 * - Logging configuration
 * - Caching settings
 * - Audit logging options
 *
 * Each option is validated to ensure it meets the required format and constraints.
 * Default values are provided for optional settings.
 */
const configSchema = zod_1.z.object({
    // MAAS API connection settings
    maasApiUrl: zod_1.z.string().url('MAAS_API_URL must be a valid URL'),
    maasApiKey: zod_1.z.string().regex(/^[^:]+:[^:]+:[^:]+$/, 'MAAS_API_KEY must be in format consumer_key:token:secret'),
    // Server settings
    mcpPort: zod_1.z.coerce.number().int().positive().default(3000),
    nodeEnv: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    logLevel: zod_1.z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    // MCP Protocol settings
    mcpProtocolVersion: zod_1.z.string().optional(),
    mcpUseLatestProtocol: zod_1.z.boolean().default(true),
    // Cache configuration
    cacheEnabled: zod_1.z.boolean().default(true),
    cacheStrategy: zod_1.z.enum(['time-based', 'lru']).default('time-based'),
    cacheMaxSize: zod_1.z.coerce.number().int().positive().default(1000), // Maximum number of items in the cache
    cacheMaxAge: zod_1.z.coerce.number().int().positive().default(300), // Default TTL in seconds (5 minutes)
    cacheResourceSpecificTTL: zod_1.z.record(zod_1.z.string(), zod_1.z.number().int().positive()).default({}), // Resource-specific TTL overrides
    // Audit logging configuration
    auditLogEnabled: zod_1.z.boolean().default(true),
    auditLogIncludeResourceState: zod_1.z.boolean().default(false),
    auditLogMaskSensitiveFields: zod_1.z.boolean().default(true),
    auditLogSensitiveFields: zod_1.z.string().default('password,token,secret,key,credential'),
    auditLogToFile: zod_1.z.boolean().default(false),
    auditLogFilePath: zod_1.z.string().optional(),
});
/**
 * Parse environment variables and validate against the schema
 *
 * This loads configuration values from environment variables and validates them
 * against the schema. If any required values are missing or invalid, an error
 * will be thrown during server startup.
 *
 * Default values are used for any options not explicitly set in the environment.
 */
const config = configSchema.parse({
    // MAAS API connection settings
    maasApiUrl: process.env.MAAS_API_URL,
    maasApiKey: process.env.MAAS_API_KEY,
    // Server settings
    mcpPort: process.env.MCP_PORT,
    nodeEnv: process.env.NODE_ENV,
    logLevel: process.env.LOG_LEVEL,
    // MCP Protocol settings
    mcpProtocolVersion: process.env.MCP_PROTOCOL_VERSION,
    mcpUseLatestProtocol: process.env.MCP_USE_LATEST_PROTOCOL !== 'false',
    // Cache configuration
    cacheEnabled: process.env.CACHE_ENABLED === 'false' ? false : true,
    cacheStrategy: process.env.CACHE_STRATEGY || 'time-based',
    cacheMaxSize: process.env.CACHE_MAX_SIZE,
    cacheMaxAge: process.env.CACHE_MAX_AGE,
    cacheResourceSpecificTTL: process.env.CACHE_RESOURCE_SPECIFIC_TTL ?
        JSON.parse(process.env.CACHE_RESOURCE_SPECIFIC_TTL) : {},
    // Audit logging configuration
    auditLogEnabled: process.env.AUDIT_LOG_ENABLED === 'false' ? false : true,
    auditLogIncludeResourceState: process.env.AUDIT_LOG_INCLUDE_RESOURCE_STATE === 'true',
    auditLogMaskSensitiveFields: process.env.AUDIT_LOG_MASK_SENSITIVE_FIELDS === 'false' ? false : true,
    auditLogSensitiveFields: process.env.AUDIT_LOG_SENSITIVE_FIELDS || 'password,token,secret,key,credential',
    auditLogToFile: process.env.AUDIT_LOG_TO_FILE === 'true',
    auditLogFilePath: process.env.AUDIT_LOG_FILE_PATH,
});
/**
 * Export the validated configuration object
 * This is imported by other modules to access configuration values
 */
exports.default = config;
