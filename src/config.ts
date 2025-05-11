/**
 * Configuration Module
 *
 * This module handles loading, validating, and providing access to the server configuration.
 * It uses Zod for schema validation to ensure all configuration values are valid and
 * provides sensible defaults where appropriate.
 *
 * @module config
 */

import dotenv from 'dotenv';
import { z } from 'zod';

/**
 * Load environment variables from .env file in development mode
 * In production, environment variables should be set in the deployment environment
 */
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
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
const configSchema = z.object({
  // MAAS API connection settings
  maasApiUrl: z.string().url('MAAS_API_URL must be a valid URL'),
  maasApiKey: z.string().regex(/^[^:]+:[^:]+:[^:]+$/, 'MAAS_API_KEY must be in format consumer_key:token:secret'),
  
  // Server settings
  mcpPort: z.coerce.number().int().positive().default(3000),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  logLevel: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  
  // Cache configuration
  cacheEnabled: z.boolean().default(true),
  cacheStrategy: z.enum(['time-based', 'lru']).default('time-based'),
  cacheMaxSize: z.coerce.number().int().positive().default(1000), // Maximum number of items in the cache
  cacheMaxAge: z.coerce.number().int().positive().default(300), // Default TTL in seconds (5 minutes)
  cacheResourceSpecificTTL: z.record(z.string(), z.number().int().positive()).default({}), // Resource-specific TTL overrides
  
  // Audit logging configuration
  auditLogEnabled: z.boolean().default(true),
  auditLogIncludeResourceState: z.boolean().default(false),
  auditLogMaskSensitiveFields: z.boolean().default(true),
  auditLogSensitiveFields: z.string().default('password,token,secret,key,credential'),
  auditLogToFile: z.boolean().default(false),
  auditLogFilePath: z.string().optional(),
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
export default config;