/**
 * Base class for MAAS MCP resource handlers
 * Provides common functionality for resource fetching, validation, and error handling
 */
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MaasApiClient } from "../maas/MaasApiClient.ts";
import { ZodSchema } from 'zod';
import logger from '../utils/logger.ts';
import { generateRequestId } from '../utils/logger.ts';
import { MaasApiError } from '../types/maas.ts';
import {
  extractAndValidateParams,
  validateResourceData,
  handleResourceFetchError
} from './utils/resourceUtils.js';
import { CacheManager, CacheOptions } from './cache/index.js';
import config from '../config.js';
import auditLogger from '../utils/auditLogger.js';

/**
 * Base class for MAAS MCP resource handlers
 */
export abstract class BaseResourceHandler<T, P> {
  protected server: McpServer;
  protected maasClient: MaasApiClient;
  protected resourceName: string;
  protected resourceTemplate: ResourceTemplate;
  protected uriPattern: string;
  protected dataSchema: ZodSchema<T>;
  protected paramsSchema: ZodSchema<P>;
  protected apiEndpoint: string;
  protected cacheManager: CacheManager;
  protected cacheOptions: CacheOptions;
  protected auditEnabled: boolean;

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
  constructor(
    server: McpServer,
    maasClient: MaasApiClient,
    resourceName: string,
    resourceTemplate: ResourceTemplate,
    uriPattern: string,
    dataSchema: ZodSchema<T>,
    paramsSchema: ZodSchema<P>,
    apiEndpoint: string,
    cacheOptions?: Partial<CacheOptions>
  ) {
    this.server = server;
    this.maasClient = maasClient;
    this.resourceName = resourceName;
    this.resourceTemplate = resourceTemplate;
    this.uriPattern = uriPattern;
    this.dataSchema = dataSchema;
    this.paramsSchema = paramsSchema;
    this.apiEndpoint = apiEndpoint;
    this.cacheManager = CacheManager.getInstance();
    
    // Set default cache options
    this.cacheOptions = {
      enabled: config.cacheEnabled,
      ttl: this.cacheManager.getResourceTTL(resourceName),
      includeQueryParams: true,
      ...cacheOptions
    };
    
    // Set audit logging enabled flag
    this.auditEnabled = config.auditLogEnabled;
    
    logger.debug(`Initialized ${resourceName} resource handler with cache options:`, {
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
  public register(resourceId: string): void {
    this.server.resource(
      resourceId,
      this.resourceTemplate,
      this.handleRequest.bind(this)
    );
  }

  /**
   * Handles a resource request
   *
   * @param uri The URI of the request
   * @param variables The variables extracted from the URI
   * @param options Request options including AbortSignal
   * @returns The resource response
   */
  protected async handleRequest(
    uri: URL,
    variables: Record<string, string | string[]>,
    options: { signal: AbortSignal }
  ) {
    // Generate a request ID for tracking this request through logs
    const requestId = generateRequestId();
    
    // Convert variables to params (string only)
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(variables)) {
      if (typeof value === 'string') {
        params[key] = value;
      } else if (Array.isArray(value) && value.length > 0) {
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
        auditLogger.logResourceAccess(
          this.resourceName,
          resourceId,
          'read',
          requestId,
          clientInfo.userId,
          clientInfo.ipAddress,
          { uri: uri.toString(), params: validatedParams }
        );
      }
      
      // Check if caching is enabled for this resource
      if (this.cacheOptions.enabled && this.cacheManager.isEnabled()) {
        // Generate cache key
        const cacheKey = this.cacheManager.generateCacheKey(
          this.resourceName,
          uri,
          validatedParams as unknown as Record<string, any>,
          this.cacheOptions
        );
        
        // Try to get from cache
        const cachedData = this.cacheManager.get<T>(cacheKey);
        if (cachedData) {
          logger.debug(`Cache hit for ${this.resourceName}${resourceId ? ` (${resourceId})` : ''}`);
          
          // Audit log the cache hit
          if (this.auditEnabled) {
            auditLogger.logCacheOperation(
              this.resourceName,
              'hit',
              requestId,
              resourceId,
              { cacheKey }
            );
          }
          
          return this.formatResponse(uri, cachedData, true, requestId);
        }
        
        logger.debug(`Cache miss for ${this.resourceName}${resourceId ? ` (${resourceId})` : ''}`);
        
        // Audit log the cache miss
        if (this.auditEnabled) {
          auditLogger.logCacheOperation(
            this.resourceName,
            'miss',
            requestId,
            resourceId,
            { cacheKey }
          );
        }
      }
      
      try {
        // Fetch the resource data
        const data = await this.fetchResourceData(validatedParams, signal);
        
        // Validate the response data
        const validatedData = this.validateData(data, resourceId);
        
        // Log success
        if (Array.isArray(validatedData)) {
          logger.info(`Successfully fetched ${validatedData.length} ${this.resourceName}`);
          
          // Audit log the successful resource access for collection
          if (this.auditEnabled) {
            auditLogger.logResourceAccess(
              this.resourceName,
              resourceId,
              'read',
              requestId,
              clientInfo.userId,
              clientInfo.ipAddress,
              { count: validatedData.length },
              validatedData
            );
          }
        } else {
          this.logSuccess(resourceId, requestId);
          
          // Audit log the successful resource access for single resource
          if (this.auditEnabled) {
            auditLogger.logResourceAccess(
              this.resourceName,
              resourceId,
              'read',
              requestId,
              clientInfo.userId,
              clientInfo.ipAddress,
              undefined,
              validatedData
            );
          }
        }
        
        // Cache the result if caching is enabled
        if (this.cacheOptions.enabled && this.cacheManager.isEnabled()) {
          const cacheKey = this.cacheManager.generateCacheKey(
            this.resourceName,
            uri,
            validatedParams as unknown as Record<string, any>,
            this.cacheOptions
          );
          
          this.cacheManager.set(
            cacheKey,
            validatedData,
            this.resourceName,
            this.cacheOptions
          );
          
          logger.debug(`Cached ${this.resourceName}${resourceId ? ` (${resourceId})` : ''} with key ${cacheKey}`);
          
          // Audit log the cache set operation
          if (this.auditEnabled) {
            auditLogger.logCacheOperation(
              this.resourceName,
              'set',
              requestId,
              resourceId,
              { cacheKey, ttl: this.cacheOptions.ttl }
            );
          }
        }
        
        // Return the formatted response
        return this.formatResponse(uri, validatedData, false, requestId);
      } catch (error: any) {
        // Audit log the resource access failure
        if (this.auditEnabled) {
          auditLogger.logResourceAccessFailure(
            this.resourceName,
            resourceId,
            'read',
            requestId,
            error,
            clientInfo.userId,
            clientInfo.ipAddress,
            { uri: uri.toString(), params: validatedParams }
          );
        }
        
        // Handle resource fetch errors
        throw this.handleFetchError(error, resourceId, requestId);
      }
    } catch (paramError: any) {
      // Audit log the parameter validation failure
      if (this.auditEnabled) {
        auditLogger.logResourceAccessFailure(
          this.resourceName,
          undefined,
          'read',
          requestId,
          paramError,
          clientInfo.userId,
          clientInfo.ipAddress,
          { uri: uri.toString(), params }
        );
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
  protected validateParams(uri: string, params: Record<string, string>): P {
    return extractAndValidateParams(
      uri,
      this.uriPattern,
      this.paramsSchema,
      this.resourceName
    );
  }

  /**
   * Gets the resource ID from the validated parameters.
   * This method must be implemented by subclasses to extract a meaningful
   * identifier for the specific resource instance being accessed, primarily used for logging.
   *
   * @param params The validated parameters for the request.
   * @returns The resource ID as a string, or undefined if no specific ID is applicable (e.g., for collection endpoints).
   */
  protected abstract getResourceIdFromParams(params: P): string | undefined;

  /**
   * Extract client information from the request URI
   * This is a placeholder implementation that should be overridden
   * in a real implementation to extract client information from headers
   *
   * @param uri The request URI
   * @returns Client information
   */
  protected extractClientInfo(uri: URL): { userId?: string, ipAddress?: string } {
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
  protected logRequest(resourceId?: string, requestId?: string): void {
    const idMessage = resourceId ? `: ${resourceId}` : '';
    const reqIdMessage = requestId ? ` [${requestId}]` : '';
    logger.info(`Fetching ${this.resourceName}${idMessage}${reqIdMessage}`);
  }

  /**
   * Fetches resource data from the MAAS API.
   * This method must be implemented by subclasses to perform the actual API call
   * to retrieve the resource data.
   *
   * @param params The validated parameters for the request, specific to the resource.
   * @param signal An AbortSignal that can be used to cancel the request.
   * @returns A Promise that resolves to the raw resource data fetched from the API.
   *          The structure of this data is unknown at this stage and will be validated later.
   */
  protected abstract fetchResourceData(params: P, signal: AbortSignal): Promise<unknown>;

  /**
   * Validates resource data against the schema
   * 
   * @param data The data to validate
   * @param resourceId The ID of the resource
   * @returns The validated data
   */
  protected validateData(data: unknown, resourceId?: string): T {
    return validateResourceData(
      data,
      this.dataSchema,
      this.resourceName,
      resourceId
    );
  }

  /**
   * Logs a successful resource fetch
   *
   * @param resourceId The ID of the resource
   * @param requestId The ID of the request
   */
  protected logSuccess(resourceId?: string, requestId?: string): void {
    const idMessage = resourceId ? ` for ${resourceId}` : '';
    const reqIdMessage = requestId ? ` [${requestId}]` : '';
    logger.info(`Successfully fetched ${this.resourceName}${idMessage}${reqIdMessage}`);
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
  protected formatResponse(uri: URL, data: T, fromCache: boolean = false, requestId?: string): any {
    // Default to JSON format
    const jsonString = JSON.stringify(data);
    
    // Check for format query parameter (e.g., ?format=xml)
    const format = uri.searchParams.get('format')?.toLowerCase();
    
    // Prepare headers with cache control information
    const headers: Record<string, string> = {};
    
    // Add cache control headers if caching is enabled
    if (this.cacheOptions.enabled && this.cacheManager.isEnabled()) {
      const cacheControl: string[] = [];
      
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
        
        logger.debug(`Returning ${this.resourceName} in XML format${requestId ? ` [${requestId}]` : ''}`);
        
        return {
          contents: [{
            uri: uri.toString(),
            text: xmlString,
            mimeType: "application/xml",
            headers
          }]
        };
      } catch (error) {
        // If XML conversion fails, fall back to JSON
        logger.warn(`Failed to convert ${this.resourceName} to XML format, falling back to JSON`, { error });
      }
    }
    
    // Default JSON response
    logger.debug(`Returning ${this.resourceName} in JSON format${requestId ? ` [${requestId}]` : ''}`);
    
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
  private convertToXml(data: any): string {
    /**
     * Recursively converts a JavaScript object or value to an XML string.
     * @param obj The object or value to convert.
     * @param rootName The name for the root XML element.
     * @returns XML string.
     */
    const objectToXml = (obj: any, rootName: string): string => {
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
        if (value === null || value === undefined) continue;
        
        if (Array.isArray(value)) {
          xml += `<${key}s>`;
          xml += value.map(item => objectToXml(item, key)).join('');
          xml += `</${key}s>`;
        } else if (typeof value === 'object') {
          xml += objectToXml(value, key);
        } else {
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
  protected handleFetchError(error: any, resourceId?: string, requestId?: string): never {
    // Add request ID to error context if available
    const context = requestId ? { requestId } : undefined;
    return handleResourceFetchError(error, this.resourceName, resourceId, context);
  }

  /**
   * Handles parameter validation errors
   *
   * @param error The error to handle
   * @param requestId The ID of the request
   * @returns Never - always throws an error
   */
  protected handleParamError(error: any, requestId?: string): never {
    // If it's already a MaasApiError, just re-throw it
    if (error instanceof MaasApiError) {
      throw error;
    }
    
    // Otherwise, wrap it
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const reqIdMessage = requestId ? ` [${requestId}]` : '';
    logger.error(`Error processing ${this.resourceName} request${reqIdMessage}: ${errorMessage}`);
    throw new MaasApiError(
      `Error processing ${this.resourceName} request: ${errorMessage}`,
      500,
      'unexpected_error'
    );
  }

  /**
   * Invalidate cache for this resource
   * @returns The number of cache entries invalidated
   */
  public invalidateCache(): number {
    if (!this.cacheOptions.enabled || !this.cacheManager.isEnabled()) {
      return 0;
    }
    
    // Generate a request ID for this operation
    const requestId = generateRequestId();
    
    const count = this.cacheManager.invalidateResource(this.resourceName);
    logger.debug(`Invalidated ${count} cache entries for ${this.resourceName} [${requestId}]`);
    
    // Audit log the cache invalidation
    if (this.auditEnabled) {
      auditLogger.logCacheOperation(
        this.resourceName,
        'invalidate_all',
        requestId,
        undefined,
        { count }
      );
    }
    return count;
  }

  /**
   * Invalidate cache for a specific resource ID
   * @param resourceId The ID of the resource to invalidate
   * @returns The number of cache entries invalidated
   */
  public invalidateCacheById(resourceId: string): number {
    if (!this.cacheOptions.enabled || !this.cacheManager.isEnabled() || !resourceId) {
      return 0;
    }
    
    // Generate a request ID for this operation
    const requestId = generateRequestId();
    
    const count = this.cacheManager.invalidateResourceById(this.resourceName, resourceId);
    logger.debug(`Invalidated ${count} cache entries for ${this.resourceName} with ID ${resourceId} [${requestId}]`);
    
    // Audit log the cache invalidation
    if (this.auditEnabled) {
      auditLogger.logCacheOperation(
        this.resourceName,
        'invalidate_by_id',
        requestId,
        resourceId,
        { count }
      );
    }
    return count;
  }

  /**
   * Set cache options for this resource
   * @param options The cache options to set
   */
  public setCacheOptions(options: Partial<CacheOptions>): void {
    this.cacheOptions = {
      ...this.cacheOptions,
      ...options
    };
    
    // Generate a request ID for this operation
    const requestId = generateRequestId();
    
    logger.debug(`Updated cache options for ${this.resourceName} [${requestId}]:`, {
      cacheEnabled: this.cacheOptions.enabled,
      cacheTTL: this.cacheOptions.ttl
    });
    
    // Audit log the cache options update
    if (this.auditEnabled) {
      auditLogger.logCacheOperation(
        this.resourceName,
        'update_options',
        requestId,
        undefined,
        {
          cacheEnabled: this.cacheOptions.enabled,
          cacheTTL: this.cacheOptions.ttl
        }
      );
    }
  }

  /**
   * Get current cache options for this resource
   * @returns The current cache options
   */
  public getCacheOptions(): CacheOptions {
    return { ...this.cacheOptions };
  }
}

/**
 * Base class for detail resource handlers (single resource)
 */
export abstract class DetailResourceHandler<T, P> extends BaseResourceHandler<T, P> {
  /**
   * Fetches resource data from the MAAS API
   * 
   * @param params The validated parameters
   * @param signal The AbortSignal for cancellation
   * @returns The resource data
   */
  protected async fetchResourceData(params: P, signal: AbortSignal): Promise<unknown> {
    const resourceId = this.getResourceIdFromParams(params);
    
    if (!resourceId || resourceId.trim() === '') {
      logger.error(`${this.resourceName} ID is missing or empty in the resource URI`);
      throw new MaasApiError(
        `${this.resourceName} ID is missing or empty in the resource URI`,
        400,
        'missing_parameter'
      );
    }
    
    // Fetch the resource data
    const data = await this.maasClient.get(
      `${this.apiEndpoint}/${resourceId}/`,
      undefined,
      signal
    );
    
    // Check if the response is empty or null
    if (!data) {
      logger.error(`${this.resourceName} not found: ${resourceId}`);
      throw new MaasApiError(
        `${this.resourceName} '${resourceId}' not found`,
        404,
        'resource_not_found'
      );
    }
    
    return data;
  }
}

/**
 * Base class for list resource handlers (multiple resources)
 */
export abstract class ListResourceHandler<T, P> extends BaseResourceHandler<T[], P> {
  /**
   * Fetches resource data from the MAAS API
   * 
   * @param params The validated parameters
   * @param signal The AbortSignal for cancellation
   * @returns The resource data
   */
  protected async fetchResourceData(params: P, signal: AbortSignal): Promise<unknown> {
    // Fetch the resource data
    const data = await this.maasClient.get(
      this.apiEndpoint,
      undefined,
      signal
    );
    
    // Check if the response is an array
    if (!Array.isArray(data)) {
      logger.error(`Invalid response format: Expected an array of ${this.resourceName}`);
      throw new MaasApiError(
        `Invalid response format: Expected an array of ${this.resourceName}`,
        500,
        'invalid_response_format'
      );
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
  protected validateData(data: unknown): T[] {
    if (!Array.isArray(data)) {
      throw new MaasApiError(
        `Invalid response format: Expected an array of ${this.resourceName}`,
        500,
        'invalid_response_format'
      );
    }
    
    return data.map((item: unknown) => 
      validateResourceData(
        item,
        this.dataSchema as unknown as ZodSchema<T>,
        this.resourceName
      )
    );
  }

  /**
   * Gets the resource ID from the validated parameters
   * List resources don't have a specific resource ID
   * 
   * @returns undefined
   */
  protected getResourceIdFromParams(): undefined {
    return undefined;
  }

  /**
   * Logs a successful resource fetch
   * Includes the count of resources fetched
   *
   * @param resourceId Not used in list resources
   */
  protected logSuccess(resourceId?: string): void {
    // For list resources, we get the count from the validated data
    // This will be called after validation in the handleRequest method
    logger.info(`Successfully fetched ${this.resourceName} list`);
  }
}