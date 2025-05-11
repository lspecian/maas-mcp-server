# Resource Handlers Documentation

## Introduction

Resource handlers are the core components of the MAAS API Resources module, responsible for processing requests for MAAS resources, fetching data from the MAAS API, validating responses, and handling caching and error conditions. This document provides detailed information about the implementation, usage, and extension of resource handlers.

## Table of Contents

- [Architecture](#architecture)
- [Base Resource Handler](#base-resource-handler)
- [Detail Resource Handler](#detail-resource-handler)
- [List Resource Handler](#list-resource-handler)
- [Resource Handler Lifecycle](#resource-handler-lifecycle)
- [Implementing Custom Resource Handlers](#implementing-custom-resource-handlers)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)
- [Known Limitations](#known-limitations)
- [Related Documentation](#related-documentation)

## Architecture

Resource handlers follow a hierarchical architecture:

```
┌─────────────────────────────────────┐
│       BaseResourceHandler           │
│                                     │
│ - Common functionality              │
│ - Request handling                  │
│ - Parameter validation              │
│ - Data validation                   │
│ - Caching                           │
│ - Error handling                    │
│ - Audit logging                     │
└───────────────┬─────────────────────┘
                │
                ├─────────────────────┐
                │                     │
┌───────────────▼─────────────────────┐
│      DetailResourceHandler          │
│                                     │
│ - Single resource instance          │
│ - Resource ID extraction            │
│ - Specific API endpoint handling    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│      ListResourceHandler            │
│                                     │
│ - Resource collections              │
│ - Pagination                        │
│ - Filtering                         │
│ - Sorting                           │
└─────────────────────────────────────┘
```

Each resource type (machines, subnets, zones, etc.) has its own implementation of `DetailResourceHandler` and `ListResourceHandler` that extends the base classes and provides specific functionality for that resource type.

## Base Resource Handler

The `BaseResourceHandler` is an abstract class that provides common functionality for all resource handlers. It handles request processing, parameter validation, data validation, caching, error handling, and audit logging.

### Key Properties

```typescript
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
```

### Key Methods

#### `register(resourceId: string): void`

Registers the resource handler with the MCP server.

```typescript
public register(resourceId: string): void {
  this.server.resource(
    resourceId,
    this.resourceTemplate,
    this.handleRequest.bind(this)
  );
}
```

#### `handleRequest(uri: URL, variables: Record<string, string | string[]>, options: { signal: AbortSignal })`

Handles a resource request, including parameter validation, data fetching, response validation, caching, and error handling.

```typescript
protected async handleRequest(
  uri: URL,
  variables: Record<string, string | string[]>,
  options: { signal: AbortSignal }
) {
  // Generate a request ID for tracking
  const requestId = generateRequestId();
  
  // Convert variables to params
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(variables)) {
    if (typeof value === 'string') {
      params[key] = value;
    } else if (Array.isArray(value) && value.length > 0) {
      params[key] = value[0];
    }
  }
  
  // Extract client information
  const clientInfo = this.extractClientInfo(uri);
  
  const { signal } = options;
  try {
    // Validate parameters
    const validatedParams = this.validateParams(uri.toString(), params);
    
    // Get resource ID for logging
    const resourceId = this.getResourceIdFromParams(validatedParams);
    
    // Log the request
    this.logRequest(resourceId, requestId);
    
    // Audit log the resource access attempt
    if (this.auditEnabled) {
      auditLogger.logResourceAccess(/* ... */);
    }
    
    // Check cache
    if (this.cacheOptions.enabled && this.cacheManager.isEnabled()) {
      // Generate cache key
      const cacheKey = this.cacheManager.generateCacheKey(/* ... */);
      
      // Try to get from cache
      const cachedData = this.cacheManager.get<T>(cacheKey);
      if (cachedData) {
        // Return cached data
        return this.formatResponse(uri, cachedData, true, requestId);
      }
    }
    
    try {
      // Fetch resource data
      const data = await this.fetchResourceData(validatedParams, signal);
      
      // Validate response data
      const validatedData = this.validateData(data, resourceId);
      
      // Cache the result
      if (this.cacheOptions.enabled && this.cacheManager.isEnabled()) {
        // Cache the data
        this.cacheManager.set(/* ... */);
      }
      
      // Return the formatted response
      return this.formatResponse(uri, validatedData, false, requestId);
    } catch (error: any) {
      // Handle fetch errors
      throw this.handleFetchError(error, resourceId, requestId);
    }
  } catch (paramError: any) {
    // Handle parameter validation errors
    throw this.handleParamError(paramError, requestId);
  }
}
```

#### `validateParams(uri: string, params: Record<string, string>): P`

Validates parameters from a URI against the parameter schema.

```typescript
protected validateParams(uri: string, params: Record<string, string>): P {
  return extractAndValidateParams(
    uri,
    this.uriPattern,
    this.paramsSchema,
    this.resourceName
  );
}
```

#### `validateData(data: unknown, resourceId?: string): T`

Validates resource data against the data schema.

```typescript
protected validateData(data: unknown, resourceId?: string): T {
  return validateResourceData(
    data,
    this.dataSchema,
    this.resourceName,
    resourceId
  );
}
```

#### `formatResponse(uri: URL, data: T, fromCache: boolean = false, requestId?: string): any`

Formats the response for the MCP server, including content negotiation and cache control headers.

```typescript
protected formatResponse(uri: URL, data: T, fromCache: boolean = false, requestId?: string): any {
  // Default to JSON format
  const jsonString = JSON.stringify(data);
  
  // Check for format query parameter
  const format = uri.searchParams.get('format')?.toLowerCase();
  
  // Prepare headers with cache control information
  const headers: Record<string, string> = {};
  
  // Add cache control headers if caching is enabled
  if (this.cacheOptions.enabled && this.cacheManager.isEnabled()) {
    // Add cache control headers
  }
  
  // If XML format is requested, convert data to XML
  if (format === 'xml') {
    try {
      const xmlString = this.convertToXml(data);
      return {
        contents: [{
          uri: uri.toString(),
          text: xmlString,
          mimeType: "application/xml",
          headers
        }]
      };
    } catch (error) {
      // Fall back to JSON
    }
  }
  
  // Default JSON response
  return {
    contents: [{
      uri: uri.toString(),
      text: jsonString,
      mimeType: "application/json",
      headers
    }]
  };
}
```

#### Abstract Methods

The `BaseResourceHandler` defines several abstract methods that must be implemented by subclasses:

```typescript
/**
 * Gets the resource ID from the validated parameters.
 */
protected abstract getResourceIdFromParams(params: P): string | undefined;

/**
 * Fetches resource data from the MAAS API.
 */
protected abstract fetchResourceData(params: P, signal: AbortSignal): Promise<unknown>;
```

## Detail Resource Handler

The `DetailResourceHandler` extends `BaseResourceHandler` and provides functionality for handling requests for individual resource instances. It implements the `fetchResourceData` method to retrieve a single resource instance from the MAAS API.

### Implementation

```typescript
export abstract class DetailResourceHandler<T, P> extends BaseResourceHandler<T, P> {
  /**
   * Fetches resource data for a single resource instance.
   * This implementation appends the resource ID to the API endpoint.
   */
  protected async fetchResourceData(params: P, signal: AbortSignal): Promise<unknown> {
    // Get the resource ID from the parameters
    const resourceId = this.getResourceIdFromParams(params);
    
    if (!resourceId) {
      throw new Error(`Cannot fetch ${this.resourceName} without an ID`);
    }
    
    try {
      // Fetch the resource data from the MAAS API
      const data = await this.maasClient.get(
        `${this.apiEndpoint}/${resourceId}`,
        undefined,
        signal
      );
      
      return data;
    } catch (error: any) {
      // Wrap the error with resource-specific information
      throw new MaasApiError(
        `Failed to fetch ${this.resourceName} ${resourceId}: ${error.message}`,
        error.statusCode || 500
      );
    }
  }
}
```

### Example Usage

```typescript
export class MachineDetailsResourceHandler extends DetailResourceHandler<MaasMachine, GetMachineParams> {
  constructor(server: McpServer, maasClient: MaasApiClient) {
    const resourceTemplate = new ResourceTemplate(MACHINE_DETAILS_URI_PATTERN, { list: undefined });
    
    super(
      server,
      maasClient,
      "Machine",
      resourceTemplate,
      MACHINE_DETAILS_URI_PATTERN,
      MaasMachineSchema,
      GetMachineParamsSchema,
      "/machines",
      {
        ttl: 60,
        cacheControl: {
          maxAge: 60,
          mustRevalidate: true,
        }
      }
    );
  }

  protected getResourceIdFromParams(params: GetMachineParams): string {
    return params.system_id;
  }
}
```

## List Resource Handler

The `ListResourceHandler` extends `BaseResourceHandler` and provides functionality for handling requests for collections of resources. It implements the `fetchResourceData` method to retrieve a collection of resource instances from the MAAS API, with support for filtering, pagination, and sorting.

### Implementation

```typescript
export abstract class ListResourceHandler<T, P> extends BaseResourceHandler<T[], P> {
  /**
   * Fetches resource data for a collection of resources.
   * This implementation supports query parameters for filtering, pagination, and sorting.
   */
  protected async fetchResourceData(params: P, signal: AbortSignal): Promise<unknown> {
    try {
      // Extract query parameters from the params object
      const queryParams = this.extractQueryParams(params);
      
      // Fetch the resource data from the MAAS API
      const data = await this.maasClient.get(
        this.apiEndpoint,
        Object.keys(queryParams).length > 0 ? queryParams : undefined,
        signal
      );
      
      // Check if the response is an array
      if (!Array.isArray(data)) {
        throw new Error(`Invalid response format: Expected an array of ${this.resourceName}`);
      }
      
      return data;
    } catch (error: any) {
      // Wrap the error with resource-specific information
      throw new MaasApiError(
        `Failed to fetch ${this.resourceName}: ${error.message}`,
        error.statusCode || 500
      );
    }
  }
  
  /**
   * Extracts query parameters from the params object.
   * This method should be overridden by subclasses to extract specific query parameters.
   */
  protected extractQueryParams(params: P): Record<string, string> {
    // Default implementation returns an empty object
    return {};
  }
  
  /**
   * Validates resource data against the schema.
   * This implementation validates each item in the array.
   */
  protected validateData(data: unknown): T[] {
    if (!Array.isArray(data)) {
      throw new Error(`Invalid response format: Expected an array of ${this.resourceName}`);
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
   * Logs a successful resource fetch.
   * This implementation includes the count of items in the log message.
   */
  protected logSuccess(resourceId?: string): void {
    logger.info(`Successfully fetched ${this.resourceName}`);
  }
}
```

### Example Usage

```typescript
export class MachinesListResourceHandler extends ListResourceHandler<MaasMachine, MachinesListParams> {
  constructor(server: McpServer, maasClient: MaasApiClient) {
    const resourceTemplate = new ResourceTemplate(MACHINES_LIST_URI_PATTERN, { list: undefined });
    
    super(
      server,
      maasClient,
      "Machines",
      resourceTemplate,
      MACHINES_LIST_URI_PATTERN,
      MaasMachinesArraySchema,
      MachinesListParamsSchema,
      "/machines",
      {
        ttl: 30,
        includeQueryParams: true,
        includeQueryParamsList: [
          'hostname', 'status', 'zone', 'pool', 'tags', 'owner', 'architecture',
          'limit', 'offset', 'page', 'per_page', 'sort', 'order'
        ],
        cacheControl: {
          maxAge: 30,
          mustRevalidate: true,
        }
      }
    );
  }

  protected getResourceIdFromParams(params?: MachinesListParams): undefined {
    return undefined;
  }
  
  protected extractQueryParams(params: MachinesListParams): Record<string, string> {
    const queryParams: Record<string, string> = {};
    
    // Add pagination parameters
    if (params.limit) queryParams.limit = params.limit.toString();
    if (params.offset) queryParams.offset = params.offset.toString();
    if (params.page) queryParams.page = params.page.toString();
    if (params.per_page) queryParams.per_page = params.per_page.toString();
    
    // Add sorting parameters
    if (params.sort) queryParams.sort = params.sort;
    if (params.order) queryParams.order = params.order;
    
    // Add filtering parameters
    if (params.hostname) queryParams.hostname = params.hostname;
    if (params.status) queryParams.status = params.status;
    if (params.zone) queryParams.zone = params.zone;
    if (params.pool) queryParams.pool = params.pool;
    if (params.tags) queryParams.tags = params.tags;
    if (params.owner) queryParams.owner = params.owner;
    if (params.architecture) queryParams.architecture = params.architecture;
    
    return queryParams;
  }
}
```

## Resource Handler Lifecycle

Resource handlers follow a lifecycle for processing requests:

1. **Registration**: The resource handler is registered with the MCP server using the `register` method.
2. **Request Handling**: When a request is received, the `handleRequest` method is called with the URI, variables, and options.
3. **Parameter Validation**: The request parameters are validated against the parameter schema.
4. **Cache Check**: If caching is enabled, the handler checks if the requested data is available in the cache.
5. **Data Fetching**: If the data is not in the cache, the handler fetches it from the MAAS API using the `fetchResourceData` method.
6. **Data Validation**: The fetched data is validated against the data schema.
7. **Caching**: If caching is enabled, the validated data is stored in the cache.
8. **Response Formatting**: The validated data is formatted as a response for the MCP server.
9. **Error Handling**: If any errors occur during the process, they are handled and appropriate error responses are returned.

## Implementing Custom Resource Handlers

To implement a custom resource handler, follow these steps:

1. **Create a Parameter Schema**: Define a Zod schema for validating request parameters.
2. **Create a Data Schema**: Define a Zod schema for validating resource data.
3. **Define a URI Pattern**: Define a URI pattern for the resource.
4. **Implement a Detail Resource Handler**: Extend `DetailResourceHandler` for handling individual resource instances.
5. **Implement a List Resource Handler**: Extend `ListResourceHandler` for handling collections of resources.
6. **Register the Resource Handlers**: Create a function to register the resource handlers with the MCP server.

### Example: Implementing a Custom Resource Handler

```typescript
// 1. Create a Parameter Schema
export interface GetCustomResourceParams {
  id: string;
}

export const GetCustomResourceParamsSchema = z.object({
  id: z.string()
});

// 2. Create a Data Schema
export interface CustomResource {
  id: string;
  name: string;
  description: string;
  // Add other properties as needed
}

export const CustomResourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string()
  // Add other properties as needed
});

// 3. Define a URI Pattern
export const CUSTOM_RESOURCE_DETAILS_URI_PATTERN = 'maas://custom-resource/:id';
export const CUSTOM_RESOURCES_LIST_URI_PATTERN = 'maas://custom-resources';

// 4. Implement a Detail Resource Handler
export class CustomResourceDetailsHandler extends DetailResourceHandler<CustomResource, GetCustomResourceParams> {
  constructor(server: McpServer, maasClient: MaasApiClient) {
    const resourceTemplate = new ResourceTemplate(CUSTOM_RESOURCE_DETAILS_URI_PATTERN, { list: undefined });
    
    super(
      server,
      maasClient,
      "CustomResource",
      resourceTemplate,
      CUSTOM_RESOURCE_DETAILS_URI_PATTERN,
      CustomResourceSchema,
      GetCustomResourceParamsSchema,
      "/custom-resources",
      {
        ttl: 60,
        cacheControl: {
          maxAge: 60,
          mustRevalidate: true,
        }
      }
    );
  }

  protected getResourceIdFromParams(params: GetCustomResourceParams): string {
    return params.id;
  }
}

// 5. Implement a List Resource Handler
export class CustomResourcesListHandler extends ListResourceHandler<CustomResource, {}> {
  constructor(server: McpServer, maasClient: MaasApiClient) {
    const resourceTemplate = new ResourceTemplate(CUSTOM_RESOURCES_LIST_URI_PATTERN, { list: undefined });
    
    super(
      server,
      maasClient,
      "CustomResources",
      resourceTemplate,
      CUSTOM_RESOURCES_LIST_URI_PATTERN,
      z.array(CustomResourceSchema),
      z.object({}),
      "/custom-resources",
      {
        ttl: 30,
        cacheControl: {
          maxAge: 30,
          mustRevalidate: true,
        }
      }
    );
  }

  protected getResourceIdFromParams(params?: {}): undefined {
    return undefined;
  }
}

// 6. Register the Resource Handlers
export function registerCustomResourceHandlers(server: McpServer, maasClient: MaasApiClient): void {
  // Register custom resource details handler
  const customResourceDetailsHandler = new CustomResourceDetailsHandler(server, maasClient);
  customResourceDetailsHandler.register("maas_custom_resource_details");
  
  // Register custom resources list handler
  const customResourcesListHandler = new CustomResourcesListHandler(server, maasClient);
  customResourcesListHandler.register("maas_custom_resources_list");
  
  logger.info('Registered custom resource handlers');
}
```

## Best Practices

### 1. Use Descriptive Resource Names

Choose descriptive and consistent names for resources to make the code more readable and maintainable.

```typescript
// Good
const resourceName = "Machine";

// Avoid
const resourceName = "m";
```

### 2. Define Clear URI Patterns

Define clear and consistent URI patterns for resources to make them easier to understand and use.

```typescript
// Good
export const MACHINE_DETAILS_URI_PATTERN = 'maas://machine/:system_id';
export const MACHINES_LIST_URI_PATTERN = 'maas://machines';

// Avoid
export const MACHINE_DETAILS_URI_PATTERN = 'maas://m/:id';
export const MACHINES_LIST_URI_PATTERN = 'maas://m';
```

### 3. Use Appropriate Cache Settings

Configure cache settings based on the nature of the resource and how frequently it changes.

```typescript
// For resources that change frequently
{
  ttl: 30,
  cacheControl: {
    maxAge: 30,
    mustRevalidate: true,
  }
}

// For resources that change infrequently
{
  ttl: 3600,
  cacheControl: {
    maxAge: 3600,
    immutable: true,
  }
}
```

### 4. Handle Errors Gracefully

Provide clear and informative error messages to help diagnose issues.

```typescript
// Good
throw new MaasApiError(
  `Failed to fetch ${this.resourceName} ${resourceId}: ${error.message}`,
  error.statusCode || 500
);

// Avoid
throw new Error("Failed to fetch resource");
```

### 5. Validate Data Thoroughly

Use Zod schemas to validate data thoroughly to ensure that it conforms to the expected structure.

```typescript
// Good
export const MaasMachineSchema = z.object({
  system_id: z.string(),
  hostname: z.string(),
  // Other properties with specific validation
});

// Avoid
export const MaasMachineSchema = z.any();
```

## Common Patterns

### 1. Resource Registration

```typescript
export function registerMachineResources(server: McpServer, maasClient: MaasApiClient): void {
  // Register machine details resource
  const machineDetailsHandler = new MachineDetailsResourceHandler(server, maasClient);
  machineDetailsHandler.register("maas_machine_details");
  
  // Register machines list resource
  const machinesListHandler = new MachinesListResourceHandler(server, maasClient);
  machinesListHandler.register("maas_machines_list");
  
  logger.info('Registered machine resources');
}
```

### 2. Parameter Extraction

```typescript
protected extractQueryParams(params: MachinesListParams): Record<string, string> {
  const queryParams: Record<string, string> = {};
  
  // Add pagination parameters
  if (params.limit) queryParams.limit = params.limit.toString();
  if (params.offset) queryParams.offset = params.offset.toString();
  
  // Add filtering parameters
  if (params.hostname) queryParams.hostname = params.hostname;
  if (params.status) queryParams.status = params.status;
  
  return queryParams;
}
```

### 3. Cache Invalidation

```typescript
// Invalidate all entries for a resource type
public invalidateCache(): number {
  return this.cacheManager.invalidateByPrefix(`${this.resourceName}:`);
}

// Invalidate entries for a specific resource ID
public invalidateCacheById(resourceId: string): number {
  return this.cacheManager.invalidateByPrefix(`${this.resourceName}:${resourceId}`);
}
```

### 4. Content Negotiation

```typescript
protected formatResponse(uri: URL, data: T, fromCache: boolean = false, requestId?: string): any {
  // Default to JSON format
  const jsonString = JSON.stringify(data);
  
  // Check for format query parameter
  const format = uri.searchParams.get('format')?.toLowerCase();
  
  // If XML format is requested, convert data to XML
  if (format === 'xml') {
    try {
      const xmlString = this.convertToXml(data);
      return {
        contents: [{
          uri: uri.toString(),
          text: xmlString,
          mimeType: "application/xml",
          headers
        }]
      };
    } catch (error) {
      // Fall back to JSON
    }
  }
  
  // Default JSON response
  return {
    contents: [{
      uri: uri.toString(),
      text: jsonString,
      mimeType: "application/json",
      headers
    }]
  };
}
```

## Known Limitations

### 1. Limited Content Negotiation

The current implementation supports only JSON and XML formats for responses. Additional formats would require extending the `formatResponse` method.

### 2. Basic Cache Invalidation

The cache invalidation strategy is basic and may not be suitable for all use cases. More sophisticated invalidation strategies might be needed for complex resources with interdependencies.

### 3. Limited Error Handling

The error handling is focused on common error cases and may not cover all possible error scenarios. Additional error handling might be needed for specific use cases.

### 4. No Built-in Pagination Support

The `ListResourceHandler` does not provide built-in pagination support. Pagination must be implemented manually in the `extractQueryParams` method.

### 5. Limited Content Type Support

The current implementation assumes that the MAAS API returns JSON data. Support for other content types would require extending the `fetchResourceData` method.

## Related Documentation

- [MAAS API Resources Documentation](maas_api_resources.md): Overview of the MAAS API resources architecture.
- [Mock Factories Documentation](mock_factories.md): Documentation for the centralized mock factories used for testing.
- [API Schemas Documentation](api_schemas.md): Documentation for API schemas and data structures.
- [Testing Resources Documentation](testing_resources.md): Documentation for testing MAAS API resources.