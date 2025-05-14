"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListResourceHandler = exports.DetailResourceHandler = exports.BaseResourceHandler = void 0;
const logger_ts_1 = __importDefault(require("../utils/logger.ts"));
const logger_ts_2 = require("../utils/logger.ts");
const maas_ts_1 = require("../types/maas.ts");
const resourceUtils_js_1 = require("./utils/resourceUtils.js");
const index_js_1 = require("./cache/index.js");
const config_js_1 = __importDefault(require("../config.js"));
const auditLogger_js_1 = __importDefault(require("../utils/auditLogger.js"));
/**
 * Base class for MAAS MCP resource handlers
 */
class BaseResourceHandler {
    server;
    maasClient;
    resourceName;
    resourceTemplate;
    uriPattern;
    dataSchema;
    paramsSchema;
    apiEndpoint;
    cacheManager;
    cacheOptions;
    auditEnabled;
    /**
     * Constructor for BaseResourceHandler
     *
     * @param server The MCP server instance
     * @param maasClient The MAAS API client instance
     * @param resourceName The name of the resource (for error messages)
     * @param resourceTemplate The ResourceTemplate for the resource
     * @param uriPattern The URI pattern for the resource
     * @param dataSchema The Zod schema for validating resource data
     * @param paramsSchema The Zod schema for validating resource parameters
     * @param apiEndpoint The MAAS API endpoint for the resource
     * @param cacheOptions Optional cache options for the resource
     */
    constructor(server, maasClient, resourceName, resourceTemplate, uriPattern, dataSchema, paramsSchema, apiEndpoint, cacheOptions) {
        this.server = server;
        this.maasClient = maasClient;
        this.resourceName = resourceName;
        this.resourceTemplate = resourceTemplate;
        this.uriPattern = uriPattern;
        this.dataSchema = dataSchema;
        this.paramsSchema = paramsSchema;
        this.apiEndpoint = apiEndpoint;
        this.cacheManager = index_js_1.CacheManager.getInstance();
        // Set default cache options
        this.cacheOptions = {
            enabled: config_js_1.default.cacheEnabled,
            ttl: this.cacheManager.getResourceTTL(resourceName),
            includeQueryParams: true,
            ...cacheOptions
        };
        // Set audit logging enabled flag
        this.auditEnabled = config_js_1.default.auditLogEnabled;
        logger_ts_1.default.debug(`Initialized ${resourceName} resource handler with cache options:`, {
            cacheEnabled: this.cacheOptions.enabled,
            cacheTTL: this.cacheOptions.ttl,
            auditEnabled: this.auditEnabled
        });
    }
    /**
     * Registers the resource with the MCP server
     *
     * @param resourceId The ID to register the resource with
     */
    register(resourceId) {
        this.server.resource(resourceId, this.resourceTemplate, this.handleRequest.bind(this));
    }
    /**
     * Handles a resource request
     *
     * @param uri The URI of the request
     * @param variables The variables extracted from the URI
     * @param options Request options including AbortSignal
     * @returns The resource response
     */
    async handleRequest(uri, variables, options) {
        // Generate a request ID for tracking this request through logs
        const requestId = (0, logger_ts_2.generateRequestId)();
        // Convert variables to params (string only)
        const params = {};
        for (const [key, value] of Object.entries(variables)) {
            if (typeof value === 'string') {
                params[key] = value;
            }
            else if (Array.isArray(value) && value.length > 0) {
                params[key] = value[0];
            }
        }
        // Extract client information from headers if available
        const clientInfo = this.extractClientInfo(uri);
        const { signal } = options;
        try {
            // Extract and validate parameters
            const validatedParams = this.validateParams(uri.toString(), params);
            // Get the resource ID for logging and error messages
            const resourceId = this.getResourceIdFromParams(validatedParams);
            // Log the request
            this.logRequest(resourceId, requestId);
            // Audit log the resource access attempt
            if (this.auditEnabled) {
                auditLogger_js_1.default.logResourceAccess(this.resourceName, resourceId, 'read', requestId, clientInfo.userId, clientInfo.ipAddress, { uri: uri.toString(), params: validatedParams });
            }
            // Check if caching is enabled for this resource
            if (this.cacheOptions.enabled && this.cacheManager.isEnabled()) {
                // Generate cache key
                const cacheKey = this.cacheManager.generateCacheKey(this.resourceName, uri, validatedParams, this.cacheOptions);
                // Try to get from cache
                const cachedData = this.cacheManager.get(cacheKey);
                if (cachedData) {
                    logger_ts_1.default.debug(`Cache hit for ${this.resourceName}${resourceId ? ` (${resourceId})` : ''}`);
                    // Audit log the cache hit
                    if (this.auditEnabled) {
                        auditLogger_js_1.default.logCacheOperation(this.resourceName, 'hit', requestId, resourceId, { cacheKey });
                    }
                    return this.formatResponse(uri, cachedData, true, requestId);
                }
                logger_ts_1.default.debug(`Cache miss for ${this.resourceName}${resourceId ? ` (${resourceId})` : ''}`);
                // Audit log the cache miss
                if (this.auditEnabled) {
                    auditLogger_js_1.default.logCacheOperation(this.resourceName, 'miss', requestId, resourceId, { cacheKey });
                }
            }
            try {
                // Fetch the resource data
                const data = await this.fetchResourceData(validatedParams, signal);
                // Validate the response data
                const validatedData = this.validateData(data, resourceId);
                // Log success
                if (Array.isArray(validatedData)) {
                    logger_ts_1.default.info(`Successfully fetched ${validatedData.length} ${this.resourceName}`);
                    // Audit log the successful resource access for collection
                    if (this.auditEnabled) {
                        auditLogger_js_1.default.logResourceAccess(this.resourceName, resourceId, 'read', requestId, clientInfo.userId, clientInfo.ipAddress, { count: validatedData.length }, validatedData);
                    }
                }
                else {
                    this.logSuccess(resourceId, requestId);
                    // Audit log the successful resource access for single resource
                    if (this.auditEnabled) {
                        auditLogger_js_1.default.logResourceAccess(this.resourceName, resourceId, 'read', requestId, clientInfo.userId, clientInfo.ipAddress, undefined, validatedData);
                    }
                }
                // Cache the result if caching is enabled
                if (this.cacheOptions.enabled && this.cacheManager.isEnabled()) {
                    const cacheKey = this.cacheManager.generateCacheKey(this.resourceName, uri, validatedParams, this.cacheOptions);
                    this.cacheManager.set(cacheKey, validatedData, this.resourceName, this.cacheOptions);
                    logger_ts_1.default.debug(`Cached ${this.resourceName}${resourceId ? ` (${resourceId})` : ''} with key ${cacheKey}`);
                    // Audit log the cache set operation
                    if (this.auditEnabled) {
                        auditLogger_js_1.default.logCacheOperation(this.resourceName, 'set', requestId, resourceId, { cacheKey, ttl: this.cacheOptions.ttl });
                    }
                }
                // Return the formatted response
                return this.formatResponse(uri, validatedData, false, requestId);
            }
            catch (error) {
                // Audit log the resource access failure
                if (this.auditEnabled) {
                    auditLogger_js_1.default.logResourceAccessFailure(this.resourceName, resourceId, 'read', requestId, error, clientInfo.userId, clientInfo.ipAddress, { uri: uri.toString(), params: validatedParams });
                }
                // Handle resource fetch errors
                throw this.handleFetchError(error, resourceId, requestId);
            }
        }
        catch (paramError) {
            // Audit log the parameter validation failure
            if (this.auditEnabled) {
                auditLogger_js_1.default.logResourceAccessFailure(this.resourceName, undefined, 'read', requestId, paramError, clientInfo.userId, clientInfo.ipAddress, { uri: uri.toString(), params });
            }
            // Handle parameter validation errors
            throw this.handleParamError(paramError, requestId);
        }
    }
    /**
     * Validates parameters from a URI
     *
     * @param uri The URI to extract parameters from
     * @param params The parameters extracted from the URI
     * @returns The validated parameters
     */
    validateParams(uri, params) {
        return (0, resourceUtils_js_1.extractAndValidateParams)(uri, this.uriPattern, this.paramsSchema, this.resourceName);
    }
    /**
     * Extract client information from the request URI
     * This is a placeholder implementation that should be overridden
     * in a real implementation to extract client information from headers
     *
     * @param uri The request URI
     * @returns Client information
     */
    extractClientInfo(uri) {
        // In a real implementation, this would extract client information from headers
        // For now, we'll just return empty values
        return {
            userId: uri.searchParams.get('userId') || undefined,
            ipAddress: uri.searchParams.get('ipAddress') || undefined
        };
    }
    /**
     * Logs a resource request
     *
     * @param resourceId The ID of the resource being requested
     * @param requestId The ID of the request
     */
    logRequest(resourceId, requestId) {
        const idMessage = resourceId ? `: ${resourceId}` : '';
        const reqIdMessage = requestId ? ` [${requestId}]` : '';
        logger_ts_1.default.info(`Fetching ${this.resourceName}${idMessage}${reqIdMessage}`);
    }
    /**
     * Validates resource data against the schema
     *
     * @param data The data to validate
     * @param resourceId The ID of the resource
     * @returns The validated data
     */
    validateData(data, resourceId) {
        return (0, resourceUtils_js_1.validateResourceData)(data, this.dataSchema, this.resourceName, resourceId);
    }
    /**
     * Logs a successful resource fetch
     *
     * @param resourceId The ID of the resource
     * @param requestId The ID of the request
     */
    logSuccess(resourceId, requestId) {
        const idMessage = resourceId ? ` for ${resourceId}` : '';
        const reqIdMessage = requestId ? ` [${requestId}]` : '';
        logger_ts_1.default.info(`Successfully fetched ${this.resourceName}${idMessage}${reqIdMessage}`);
    }
    /**
     * Formats the response for the MCP server
     * Supports content negotiation for different formats
     * Currently supports JSON (default) and XML formats
     *
     * @param uri The URI of the request
     * @param data The validated data
     * @param fromCache Whether the data was retrieved from cache
     * @param requestId The ID of the request
     * @returns The formatted response
     */
    formatResponse(uri, data, fromCache = false, requestId) {
        // Default to JSON format
        const jsonString = JSON.stringify(data);
        // Check for format query parameter (e.g., ?format=xml)
        const format = uri.searchParams.get('format')?.toLowerCase();
        // Prepare headers with cache control information
        const headers = {};
        // Add cache control headers if caching is enabled
        if (this.cacheOptions.enabled && this.cacheManager.isEnabled()) {
            const cacheControl = [];
            // Add max-age directive
            cacheControl.push(`max-age=${this.cacheOptions.ttl}`);
            // Add other cache control directives if specified
            if (this.cacheOptions.cacheControl) {
                if (this.cacheOptions.cacheControl.private) {
                    cacheControl.push('private');
                }
                if (this.cacheOptions.cacheControl.mustRevalidate) {
                    cacheControl.push('must-revalidate');
                }
                if (this.cacheOptions.cacheControl.immutable) {
                    cacheControl.push('immutable');
                }
            }
            headers['Cache-Control'] = cacheControl.join(', ');
            // Add Age header if from cache
            if (fromCache) {
                // Approximate age - in a real implementation, we would calculate this from the cache entry
                headers['Age'] = '1';
            }
        }
        // If XML format is requested, convert data to XML
        if (format === 'xml') {
            try {
                // Simple JSON to XML conversion for demonstration
                // In a production environment, use a proper XML library
                const xmlString = this.convertToXml(data);
                logger_ts_1.default.debug(`Returning ${this.resourceName} in XML format${requestId ? ` [${requestId}]` : ''}`);
                return {
                    contents: [{
                            uri: uri.toString(),
                            text: xmlString,
                            mimeType: "application/xml",
                            headers
                        }]
                };
            }
            catch (error) {
                // If XML conversion fails, fall back to JSON
                logger_ts_1.default.warn(`Failed to convert ${this.resourceName} to XML format, falling back to JSON`, { error });
            }
        }
        // Default JSON response
        logger_ts_1.default.debug(`Returning ${this.resourceName} in JSON format${requestId ? ` [${requestId}]` : ''}`);
        return {
            contents: [{
                    uri: uri.toString(),
                    text: jsonString,
                    mimeType: "application/json",
                    headers
                }]
        };
    }
    /**
     * Converts data to XML format.
     * This is a basic implementation intended for demonstration purposes.
     * For production use, a more robust XML library should be employed.
     *
     * @param data The data to convert to XML. Can be an object or array.
     * @returns The XML string representation of the data.
     */
    convertToXml(data) {
        /**
         * Recursively converts a JavaScript object or value to an XML string.
         * @param obj The object or value to convert.
         * @param rootName The name for the root XML element.
         * @returns XML string.
         */
        const objectToXml = (obj, rootName) => {
            if (obj === null || obj === undefined) {
                return `<${rootName}/>`;
            }
            if (typeof obj !== 'object') {
                return `<${rootName}>${String(obj)}</${rootName}>`;
            }
            if (Array.isArray(obj)) {
                return obj.map(item => objectToXml(item, rootName.replace(/s$/, ''))).join('');
            }
            let xml = `<${rootName}>`;
            for (const [key, value] of Object.entries(obj)) {
                if (value === null || value === undefined)
                    continue;
                if (Array.isArray(value)) {
                    xml += `<${key}s>`;
                    xml += value.map(item => objectToXml(item, key)).join('');
                    xml += `</${key}s>`;
                }
                else if (typeof value === 'object') {
                    xml += objectToXml(value, key);
                }
                else {
                    xml += `<${key}>${String(value)}</${key}>`;
                }
            }
            xml += `</${rootName}>`;
            return xml;
        };
        // Convert the data to XML
        const rootName = this.resourceName.toLowerCase().replace(/\s+/g, '_');
        const xml = Array.isArray(data)
            ? `<${rootName}s>${objectToXml(data, rootName)}</${rootName}s>`
            : objectToXml(data, rootName);
        // Add XML declaration
        return `<?xml version="1.0" encoding="UTF-8"?>${xml}`;
    }
    /**
     * Handles errors during resource fetching
     *
     * @param error The error to handle
     * @param resourceId The ID of the resource
     * @param requestId The ID of the request
     * @returns Never - always throws an error
     */
    handleFetchError(error, resourceId, requestId) {
        // Add request ID to error context if available
        const context = requestId ? { requestId } : undefined;
        return (0, resourceUtils_js_1.handleResourceFetchError)(error, this.resourceName, resourceId, context);
    }
    /**
     * Handles parameter validation errors
     *
     * @param error The error to handle
     * @param requestId The ID of the request
     * @returns Never - always throws an error
     */
    handleParamError(error, requestId) {
        // If it's already a MaasApiError, just re-throw it
        if (error instanceof maas_ts_1.MaasApiError) {
            throw error;
        }
        // Otherwise, wrap it
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const reqIdMessage = requestId ? ` [${requestId}]` : '';
        logger_ts_1.default.error(`Error processing ${this.resourceName} request${reqIdMessage}: ${errorMessage}`);
        throw new maas_ts_1.MaasApiError(`Error processing ${this.resourceName} request: ${errorMessage}`, 500, 'unexpected_error');
    }
    /**
     * Invalidate cache for this resource
     * @returns The number of cache entries invalidated
     */
    invalidateCache() {
        if (!this.cacheOptions.enabled || !this.cacheManager.isEnabled()) {
            return 0;
        }
        // Generate a request ID for this operation
        const requestId = (0, logger_ts_2.generateRequestId)();
        const count = this.cacheManager.invalidateResource(this.resourceName);
        logger_ts_1.default.debug(`Invalidated ${count} cache entries for ${this.resourceName} [${requestId}]`);
        // Audit log the cache invalidation
        if (this.auditEnabled) {
            auditLogger_js_1.default.logCacheOperation(this.resourceName, 'invalidate_all', requestId, undefined, { count });
        }
        return count;
    }
    /**
     * Invalidate cache for a specific resource ID
     * @param resourceId The ID of the resource to invalidate
     * @returns The number of cache entries invalidated
     */
    invalidateCacheById(resourceId) {
        if (!this.cacheOptions.enabled || !this.cacheManager.isEnabled() || !resourceId) {
            return 0;
        }
        // Generate a request ID for this operation
        const requestId = (0, logger_ts_2.generateRequestId)();
        const count = this.cacheManager.invalidateResourceById(this.resourceName, resourceId);
        logger_ts_1.default.debug(`Invalidated ${count} cache entries for ${this.resourceName} with ID ${resourceId} [${requestId}]`);
        // Audit log the cache invalidation
        if (this.auditEnabled) {
            auditLogger_js_1.default.logCacheOperation(this.resourceName, 'invalidate_by_id', requestId, resourceId, { count });
        }
        return count;
    }
    /**
     * Set cache options for this resource
     * @param options The cache options to set
     */
    setCacheOptions(options) {
        this.cacheOptions = {
            ...this.cacheOptions,
            ...options
        };
        // Generate a request ID for this operation
        const requestId = (0, logger_ts_2.generateRequestId)();
        logger_ts_1.default.debug(`Updated cache options for ${this.resourceName} [${requestId}]:`, {
            cacheEnabled: this.cacheOptions.enabled,
            cacheTTL: this.cacheOptions.ttl
        });
        // Audit log the cache options update
        if (this.auditEnabled) {
            auditLogger_js_1.default.logCacheOperation(this.resourceName, 'update_options', requestId, undefined, {
                cacheEnabled: this.cacheOptions.enabled,
                cacheTTL: this.cacheOptions.ttl
            });
        }
    }
    /**
     * Get current cache options for this resource
     * @returns The current cache options
     */
    getCacheOptions() {
        return { ...this.cacheOptions };
    }
}
exports.BaseResourceHandler = BaseResourceHandler;
/**
 * Base class for detail resource handlers (single resource)
 */
class DetailResourceHandler extends BaseResourceHandler {
    /**
     * Fetches resource data from the MAAS API
     *
     * @param params The validated parameters
     * @param signal The AbortSignal for cancellation
     * @returns The resource data
     */
    async fetchResourceData(params, signal) {
        const resourceId = this.getResourceIdFromParams(params);
        if (!resourceId || resourceId.trim() === '') {
            logger_ts_1.default.error(`${this.resourceName} ID is missing or empty in the resource URI`);
            throw new maas_ts_1.MaasApiError(`${this.resourceName} ID is missing or empty in the resource URI`, 400, 'missing_parameter');
        }
        // Fetch the resource data
        const data = await this.maasClient.get(`${this.apiEndpoint}/${resourceId}/`, undefined, signal);
        // Check if the response is empty or null
        if (!data) {
            logger_ts_1.default.error(`${this.resourceName} not found: ${resourceId}`);
            throw new maas_ts_1.MaasApiError(`${this.resourceName} '${resourceId}' not found`, 404, 'resource_not_found');
        }
        return data;
    }
}
exports.DetailResourceHandler = DetailResourceHandler;
/**
 * Base class for list resource handlers (multiple resources)
 */
class ListResourceHandler extends BaseResourceHandler {
    /**
     * Fetches resource data from the MAAS API
     *
     * @param params The validated parameters
     * @param signal The AbortSignal for cancellation
     * @returns The resource data
     */
    async fetchResourceData(params, signal) {
        // Fetch the resource data
        const data = await this.maasClient.get(this.apiEndpoint, undefined, signal);
        // Check if the response is an array
        if (!Array.isArray(data)) {
            logger_ts_1.default.error(`Invalid response format: Expected an array of ${this.resourceName}`);
            throw new maas_ts_1.MaasApiError(`Invalid response format: Expected an array of ${this.resourceName}`, 500, 'invalid_response_format');
        }
        return data;
    }
    /**
     * Validates resource data against the schema
     * Maps each item in the array to the schema
     *
     * @param data The data to validate
     * @returns The validated data
     */
    validateData(data) {
        if (!Array.isArray(data)) {
            throw new maas_ts_1.MaasApiError(`Invalid response format: Expected an array of ${this.resourceName}`, 500, 'invalid_response_format');
        }
        return data.map((item) => (0, resourceUtils_js_1.validateResourceData)(item, this.dataSchema, this.resourceName));
    }
    /**
     * Gets the resource ID from the validated parameters
     * List resources don't have a specific resource ID
     *
     * @returns undefined
     */
    getResourceIdFromParams() {
        return undefined;
    }
    /**
     * Logs a successful resource fetch
     * Includes the count of resources fetched
     *
     * @param resourceId Not used in list resources
     */
    logSuccess(resourceId) {
        // For list resources, we get the count from the validated data
        // This will be called after validation in the handleRequest method
        logger_ts_1.default.info(`Successfully fetched ${this.resourceName} list`);
    }
}
exports.ListResourceHandler = ListResourceHandler;
