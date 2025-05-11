# MAAS API Resources Documentation

## Introduction

The MAAS API Resources module provides a comprehensive framework for accessing and interacting with MAAS (Metal as a Service) API data through the Model Context Protocol (MCP). This module serves as a bridge between the MCP server and the MAAS API, enabling structured access to MAAS resources such as machines, subnets, zones, devices, domains, and tags.

The implementation follows a resource-oriented architecture with standardized patterns for resource handling, data validation, caching, error handling, and audit logging. This document provides an overview of the architecture, key concepts, and usage guidelines for the MAAS API Resources module.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Key Concepts](#key-concepts)
- [Resource Types](#resource-types)
- [Resource Handlers](#resource-handlers)
- [URI Patterns](#uri-patterns)
- [Data Validation](#data-validation)
- [Caching Mechanism](#caching-mechanism)
- [Error Handling](#error-handling)
- [Audit Logging](#audit-logging)
- [Related Documentation](#related-documentation)

## Architecture Overview

The MAAS API Resources module is structured around the following components:

1. **Base Resource Handlers**: Abstract classes that provide common functionality for resource fetching, validation, caching, and error handling.
2. **Resource-Specific Handlers**: Concrete implementations for each MAAS resource type (machines, subnets, zones, etc.).
3. **Schemas**: Zod schemas for validating resource data and request parameters.
4. **URI Patterns**: Standardized patterns for resource URIs.
5. **Cache Management**: Configurable caching system for optimizing resource access.
6. **Utility Functions**: Helper functions for common operations.

The architecture follows a layered approach:

```
┌─────────────────────────────────────┐
│           MCP Server                │
└───────────────┬─────────────────────┘
                │
┌───────────────▼─────────────────────┐
│        Resource Handlers            │
│  ┌─────────────────────────────────┐│
│  │     BaseResourceHandler         ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │  DetailResourceHandler          ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │  ListResourceHandler            ││
│  └─────────────────────────────────┘│
└───────────────┬─────────────────────┘
                │
┌───────────────▼─────────────────────┐
│        MAAS API Client              │
└───────────────┬─────────────────────┘
                │
┌───────────────▼─────────────────────┐
│        MAAS API                     │
└─────────────────────────────────────┘
```

## Key Concepts

### Resource-Oriented Architecture

The module is designed around the concept of resources, where each MAAS entity (machine, subnet, zone, etc.) is represented as a resource with standardized access patterns. Resources are accessed through URIs that follow a consistent pattern, and the data is validated against predefined schemas.

### Resource Templates

Each resource is defined with a `ResourceTemplate` that specifies the URI pattern and available operations. The template is registered with the MCP server to handle requests for the resource.

### Type Safety

The module uses TypeScript generics and Zod schemas to ensure type safety throughout the resource handling pipeline. This helps catch errors at compile time and provides better developer experience through autocompletion and type checking.

### Caching

Resources can be cached to improve performance and reduce load on the MAAS API. The caching mechanism is configurable per resource type, with options for TTL (Time To Live), cache key generation, and cache control headers.

### Audit Logging

The module includes comprehensive audit logging for resource access, cache operations, and errors. This helps track resource usage and diagnose issues.

## Resource Types

The MAAS API Resources module supports the following resource types:

1. **Machines**: Compute resources that can be deployed with an operating system.
2. **Subnets**: Network resources that define IP address ranges.
3. **Zones**: Physical or logical groupings of resources.
4. **Devices**: Non-deployable network devices.
5. **Domains**: DNS domains for name resolution.
6. **Tags**: Metadata and grouping for resources.

Each resource type has its own handler implementation and schema definition.

## Resource Handlers

Resource handlers are responsible for processing requests for a specific resource type. The module provides two types of resource handlers:

### DetailResourceHandler

Handles requests for individual resource instances, such as a specific machine or subnet. It extends the `BaseResourceHandler` class and implements the `fetchResourceData` method to retrieve a single resource instance.

Example:
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

### ListResourceHandler

Handles requests for collections of resources, such as a list of machines or subnets. It extends the `BaseResourceHandler` class and implements the `fetchResourceData` method to retrieve a collection of resource instances.

Example:
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
}
```

## URI Patterns

URI patterns define the structure of resource URIs and are used to extract parameters from incoming requests. The module uses a standardized pattern for resource URIs:

- Detail resources: `maas://{resource_type}/{resource_id}`
- List resources: `maas://{resource_type}`

Examples:
- `maas://machine/abc123` - A specific machine with ID "abc123"
- `maas://machines` - A list of machines
- `maas://subnet/1` - A specific subnet with ID "1"
- `maas://subnets` - A list of subnets

URI patterns are defined in the `uriPatterns.ts` file and are used by resource handlers to validate and extract parameters from incoming requests.

## Data Validation

The module uses Zod schemas to validate resource data and request parameters. Schemas are defined for each resource type and are used to ensure that data conforms to the expected structure.

Example schema for a MAAS machine:
```typescript
export const MaasMachineSchema = z.object({
  system_id: z.string(),
  hostname: z.string(),
  domain: z.object({
    id: z.number(),
    name: z.string()
  }),
  architecture: z.string(),
  status: z.number(),
  status_name: z.string(),
  owner: z.string().nullable(),
  owner_data: z.record(z.any()).nullable(),
  ip_addresses: z.array(z.string()).nullable(),
  cpu_count: z.number(),
  memory: z.number(),
  zone: z.object({
    id: z.number(),
    name: z.string()
  }),
  pool: z.object({
    id: z.number(),
    name: z.string()
  }),
  tags: z.array(z.string())
});
```

## Caching Mechanism

The module includes a configurable caching system to improve performance and reduce load on the MAAS API. Caching is implemented through the `CacheManager` class, which provides methods for getting, setting, and invalidating cached data.

Cache options can be configured per resource type, with the following options:

- `enabled`: Whether caching is enabled for the resource.
- `ttl`: Time To Live in seconds for cached data.
- `includeQueryParams`: Whether to include query parameters in the cache key.
- `includeQueryParamsList`: List of specific query parameters to include in the cache key.
- `cacheControl`: HTTP Cache-Control header options.

Example cache configuration:
```typescript
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
```

For more details on caching, see the [Caching Documentation](caching.md).

## Error Handling

The module includes comprehensive error handling for resource requests. Errors are categorized into parameter validation errors and resource fetch errors, with appropriate error messages and status codes.

Error handling is implemented in the `BaseResourceHandler` class and includes:

- Parameter validation errors: Errors that occur when validating request parameters.
- Resource fetch errors: Errors that occur when fetching resource data from the MAAS API.
- Schema validation errors: Errors that occur when validating resource data against schemas.

Errors are logged and include detailed information about the error, such as the resource type, resource ID, and error message.

## Audit Logging

The module includes comprehensive audit logging for resource access, cache operations, and errors. Audit logs include information such as:

- Resource type and ID
- Operation type (read, write, delete)
- Request ID
- User ID and IP address
- Request parameters
- Response data (for successful requests)
- Error details (for failed requests)

Audit logging is configurable through the `config.ts` file and can be enabled or disabled per resource type.

For more details on audit logging, see the [Audit Logging Documentation](audit_logging.md).

## Related Documentation

- [Mock Factories Documentation](mock_factories.md): Documentation for the centralized mock factories used for testing.
- [Resource Handlers Documentation](resource_handlers.md): Detailed documentation for resource handlers and their implementation.
- [API Schemas Documentation](api_schemas.md): Documentation for API schemas and data structures.
- [Testing Resources Documentation](testing_resources.md): Documentation for testing MAAS API resources.
- [Caching Documentation](caching.md): Detailed documentation for the caching mechanism.
- [Audit Logging Documentation](audit_logging.md): Detailed documentation for the audit logging system.
- [Tools Documentation](tools.md): Documentation for MCP tools that interact with MAAS API resources.
- [Examples Documentation](examples.md): Usage examples for MAAS API resources.