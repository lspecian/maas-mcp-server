# API Schemas Documentation

## Introduction

API schemas are a critical component of the MAAS API Resources module, providing type definitions and validation rules for MAAS API data structures. This document details the schema implementation, usage patterns, and best practices for working with and extending the schema system.

## Table of Contents

- [Overview](#overview)
- [Schema Implementation](#schema-implementation)
- [Resource Schemas](#resource-schemas)
- [Parameter Schemas](#parameter-schemas)
- [URI Patterns](#uri-patterns)
- [Schema Validation](#schema-validation)
- [Type Inference](#type-inference)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)
- [Known Limitations](#known-limitations)
- [Related Documentation](#related-documentation)

## Overview

The MAAS API Resources module uses [Zod](https://github.com/colinhacks/zod) for schema definition and validation. Zod provides a type-safe, declarative way to define schemas and automatically infer TypeScript types from them. This approach ensures consistency between runtime validation and compile-time type checking.

The schema system includes:

1. **Resource Schemas**: Define the structure of MAAS resources (machines, subnets, zones, etc.)
2. **Parameter Schemas**: Define the structure of request parameters
3. **URI Patterns**: Define the structure of resource URIs
4. **Collection Query Parameter Schemas**: Define the structure of query parameters for collection endpoints

## Schema Implementation

Schemas are implemented using Zod and organized by resource type. Each resource type has its own schema file that defines the structure of the resource and related parameters.

### Directory Structure

```
src/mcp_resources/schemas/
├── collectionQueryParams.ts    # Common query parameters for collections
├── deviceResourceSchema.ts     # Device resource schemas
├── domainResourceSchema.ts     # Domain resource schemas
├── index.ts                    # Re-exports all schemas
├── machineDetailsSchema.ts     # Machine resource schemas
├── subnetResourceSchema.ts     # Subnet resource schemas
├── tagResourcesSchema.ts       # Tag resource schemas
├── uriPatterns.ts              # URI pattern definitions
└── zoneResourceSchema.ts       # Zone resource schemas
```

### Schema Definition Pattern

Each schema file follows a consistent pattern:

1. Define the resource schema
2. Define parameter schemas for accessing the resource
3. Define URI patterns for the resource
4. Export types inferred from the schemas

Example:

```typescript
import { z } from 'zod';

// 1. Define the resource schema
export const MaasMachineSchema = z.object({
  system_id: z.string(),
  hostname: z.string(),
  // ... other properties
});

// Export the inferred type
export type MaasMachine = z.infer<typeof MaasMachineSchema>;

// 2. Define parameter schemas
export const GetMachineParamsSchema = z.object({
  system_id: z.string()
});

export type GetMachineParams = z.infer<typeof GetMachineParamsSchema>;

// 3. Define URI patterns
export const MACHINE_DETAILS_URI_PATTERN = 'maas://machine/:system_id';
export const MACHINES_LIST_URI_PATTERN = 'maas://machines';
```

## Resource Schemas

Resource schemas define the structure of MAAS resources. They specify the properties, types, and validation rules for each resource type.

### Machine Schema

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

export type MaasMachine = z.infer<typeof MaasMachineSchema>;
```

### Subnet Schema

```typescript
export const MaasSubnetSchema = z.object({
  id: z.number(),
  name: z.string(),
  cidr: z.string(),
  vlan: z.object({
    id: z.number(),
    name: z.string(),
    fabric: z.string()
  }),
  gateway_ip: z.string().nullable(),
  dns_servers: z.array(z.string()).nullable(),
  active_discovery: z.boolean(),
  managed: z.boolean(),
  space: z.string()
});

export type MaasSubnet = z.infer<typeof MaasSubnetSchema>;
```

### Zone Schema

```typescript
export const MaasZoneSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string()
});

export type MaasZone = z.infer<typeof MaasZoneSchema>;
```

### Device Schema

```typescript
export const MaasDeviceSchema = z.object({
  system_id: z.string(),
  hostname: z.string(),
  domain: z.object({
    id: z.number(),
    name: z.string()
  }),
  ip_addresses: z.array(z.string()).nullable(),
  owner: z.string().nullable(),
  zone: z.object({
    id: z.number(),
    name: z.string()
  }),
  tag_names: z.array(z.string())
});

export type MaasDevice = z.infer<typeof MaasDeviceSchema>;
```

### Domain Schema

```typescript
export const MaasDomainSchema = z.object({
  id: z.number(),
  name: z.string(),
  ttl: z.number().nullable(),
  authoritative: z.boolean(),
  is_default: z.boolean()
});

export type MaasDomain = z.infer<typeof MaasDomainSchema>;
```

### Tag Schema

```typescript
export const MaasTagSchema = z.object({
  id: z.number(),
  name: z.string(),
  definition: z.string(),
  comment: z.string(),
  kernel_opts: z.string().nullable()
});

export type MaasTag = z.infer<typeof MaasTagSchema>;
```

## Parameter Schemas

Parameter schemas define the structure of request parameters for accessing resources. They specify the parameters that can be extracted from resource URIs and query strings.

### Machine Parameters

```typescript
export const GetMachineParamsSchema = z.object({
  system_id: z.string()
});

export type GetMachineParams = z.infer<typeof GetMachineParamsSchema>;
```

### Subnet Parameters

```typescript
export const GetSubnetParamsSchema = z.object({
  id: z.string().transform(id => parseInt(id, 10))
});

export type GetSubnetParams = z.infer<typeof GetSubnetParamsSchema>;
```

### Zone Parameters

```typescript
export const GetZoneParamsSchema = z.object({
  id: z.string().transform(id => parseInt(id, 10))
});

export type GetZoneParams = z.infer<typeof GetZoneParamsSchema>;
```

### Device Parameters

```typescript
export const GetDeviceParamsSchema = z.object({
  system_id: z.string()
});

export type GetDeviceParams = z.infer<typeof GetDeviceParamsSchema>;
```

### Domain Parameters

```typescript
export const GetDomainParamsSchema = z.object({
  id: z.string().transform(id => parseInt(id, 10))
});

export type GetDomainParams = z.infer<typeof GetDomainParamsSchema>;
```

### Tag Parameters

```typescript
export const GetTagParamsSchema = z.object({
  name: z.string()
});

export type GetTagParams = z.infer<typeof GetTagParamsSchema>;
```

## URI Patterns

URI patterns define the structure of resource URIs. They specify the format of URIs for accessing resources and the parameters that can be extracted from them.

```typescript
// Machine URI patterns
export const MACHINE_DETAILS_URI_PATTERN = 'maas://machine/:system_id';
export const MACHINES_LIST_URI_PATTERN = 'maas://machines';

// Subnet URI patterns
export const SUBNET_DETAILS_URI_PATTERN = 'maas://subnet/:id';
export const SUBNETS_LIST_URI_PATTERN = 'maas://subnets';

// Zone URI patterns
export const ZONE_DETAILS_URI_PATTERN = 'maas://zone/:id';
export const ZONES_LIST_URI_PATTERN = 'maas://zones';

// Device URI patterns
export const DEVICE_DETAILS_URI_PATTERN = 'maas://device/:system_id';
export const DEVICES_LIST_URI_PATTERN = 'maas://devices';

// Domain URI patterns
export const DOMAIN_DETAILS_URI_PATTERN = 'maas://domain/:id';
export const DOMAINS_LIST_URI_PATTERN = 'maas://domains';

// Tag URI patterns
export const TAG_DETAILS_URI_PATTERN = 'maas://tag/:name';
export const TAGS_LIST_URI_PATTERN = 'maas://tags';
```

## Collection Query Parameters

Collection query parameters define the structure of query parameters for collection endpoints. They specify the parameters that can be used for filtering, pagination, and sorting.

```typescript
export const CollectionQueryParamsSchema = z.object({
  // Pagination parameters
  limit: z.string().transform(limit => parseInt(limit, 10)).optional(),
  offset: z.string().transform(offset => parseInt(offset, 10)).optional(),
  page: z.string().transform(page => parseInt(page, 10)).optional(),
  per_page: z.string().transform(perPage => parseInt(perPage, 10)).optional(),
  
  // Sorting parameters
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional()
});

export type CollectionQueryParams = z.infer<typeof CollectionQueryParamsSchema>;
```

Resource-specific collection query parameters extend the base schema:

```typescript
export const MachineCollectionQueryParamsSchema = CollectionQueryParamsSchema.extend({
  // Filtering parameters
  hostname: z.string().optional(),
  status: z.string().optional(),
  zone: z.string().optional(),
  pool: z.string().optional(),
  tags: z.string().optional(),
  owner: z.string().optional(),
  architecture: z.string().optional()
});

export type MachineCollectionQueryParams = z.infer<typeof MachineCollectionQueryParamsSchema>;
```

## Schema Validation

Schema validation is performed using Zod's `parse` and `safeParse` methods. The MAAS API Resources module provides utility functions for validating resource data and request parameters.

### Resource Data Validation

```typescript
export function validateResourceData<T>(
  data: unknown,
  schema: ZodSchema<T>,
  resourceName: string,
  resourceId?: string
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedErrors = formatZodErrors(error);
      const idMessage = resourceId ? ` (${resourceId})` : '';
      throw new Error(`Invalid ${resourceName}${idMessage} data: ${formattedErrors}`);
    }
    throw error;
  }
}
```

### Parameter Validation

```typescript
export function extractAndValidateParams<T>(
  uri: string,
  uriPattern: string,
  schema: ZodSchema<T>,
  resourceName: string
): T {
  try {
    // Extract parameters from URI
    const params = extractParamsFromUri(uri, uriPattern);
    
    // Validate parameters against schema
    return schema.parse(params);
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedErrors = formatZodErrors(error);
      throw new Error(`Invalid ${resourceName} parameters: ${formattedErrors}`);
    }
    throw error;
  }
}
```

## Type Inference

Zod schemas automatically infer TypeScript types, ensuring consistency between runtime validation and compile-time type checking. This approach eliminates the need to maintain separate type definitions and validation schemas.

```typescript
// Define the schema
export const MaasMachineSchema = z.object({
  system_id: z.string(),
  hostname: z.string(),
  // ... other properties
});

// Infer the type
export type MaasMachine = z.infer<typeof MaasMachineSchema>;

// Use the type
function processMachine(machine: MaasMachine) {
  // TypeScript knows the structure of MaasMachine
  console.log(machine.system_id);
  console.log(machine.hostname);
}
```

## Best Practices

### 1. Use Zod's Type Inference

Always use Zod's type inference to ensure consistency between runtime validation and compile-time type checking.

```typescript
// Good
export const MaasMachineSchema = z.object({
  system_id: z.string(),
  hostname: z.string()
});

export type MaasMachine = z.infer<typeof MaasMachineSchema>;

// Avoid
export const MaasMachineSchema = z.object({
  system_id: z.string(),
  hostname: z.string()
});

export interface MaasMachine {
  system_id: string;
  hostname: string;
}
```

### 2. Be Specific with Types

Use specific Zod types to ensure proper validation.

```typescript
// Good
export const MaasMachineSchema = z.object({
  system_id: z.string(),
  cpu_count: z.number().int().positive(),
  memory: z.number().positive(),
  tags: z.array(z.string())
});

// Avoid
export const MaasMachineSchema = z.object({
  system_id: z.any(),
  cpu_count: z.any(),
  memory: z.any(),
  tags: z.any()
});
```

### 3. Use Transformations for Type Conversion

Use Zod's transformation feature to convert types when needed.

```typescript
// Good
export const GetSubnetParamsSchema = z.object({
  id: z.string().transform(id => parseInt(id, 10))
});

// Avoid
export const GetSubnetParamsSchema = z.object({
  id: z.string()
});

// Then manually converting
const id = parseInt(params.id, 10);
```

### 4. Handle Nullable Fields

Use `.nullable()` for fields that can be null.

```typescript
// Good
export const MaasMachineSchema = z.object({
  owner: z.string().nullable(),
  owner_data: z.record(z.any()).nullable(),
  ip_addresses: z.array(z.string()).nullable()
});

// Avoid
export const MaasMachineSchema = z.object({
  owner: z.union([z.string(), z.null()]),
  owner_data: z.union([z.record(z.any()), z.null()]),
  ip_addresses: z.union([z.array(z.string()), z.null()])
});
```

### 5. Use Enums for Fixed Values

Use Zod's enum for fields with fixed values.

```typescript
// Good
export const MachineCollectionQueryParamsSchema = CollectionQueryParamsSchema.extend({
  order: z.enum(['asc', 'desc']).optional()
});

// Avoid
export const MachineCollectionQueryParamsSchema = CollectionQueryParamsSchema.extend({
  order: z.string().optional()
});
```

## Common Patterns

### 1. Schema Extension

Extend existing schemas to add additional properties or validation rules.

```typescript
// Base schema
export const CollectionQueryParamsSchema = z.object({
  limit: z.string().transform(limit => parseInt(limit, 10)).optional(),
  offset: z.string().transform(offset => parseInt(offset, 10)).optional()
});

// Extended schema
export const MachineCollectionQueryParamsSchema = CollectionQueryParamsSchema.extend({
  hostname: z.string().optional(),
  status: z.string().optional(),
  zone: z.string().optional()
});
```

### 2. Schema Composition

Compose schemas to create more complex structures.

```typescript
// Component schemas
export const DomainSchema = z.object({
  id: z.number(),
  name: z.string()
});

export const ZoneSchema = z.object({
  id: z.number(),
  name: z.string()
});

// Composed schema
export const MaasMachineSchema = z.object({
  system_id: z.string(),
  hostname: z.string(),
  domain: DomainSchema,
  zone: ZoneSchema
});
```

### 3. Array Schemas

Define schemas for arrays of resources.

```typescript
export const MaasMachineSchema = z.object({
  system_id: z.string(),
  hostname: z.string()
  // ... other properties
});

export const MaasMachinesArraySchema = z.array(MaasMachineSchema);
```

### 4. Optional Properties

Define optional properties using `.optional()`.

```typescript
export const MachineCollectionQueryParamsSchema = z.object({
  hostname: z.string().optional(),
  status: z.string().optional(),
  zone: z.string().optional()
});
```

### 5. Default Values

Provide default values for properties using `.default()`.

```typescript
export const MachineCollectionQueryParamsSchema = z.object({
  limit: z.number().default(10),
  offset: z.number().default(0),
  order: z.enum(['asc', 'desc']).default('asc')
});
```

## Known Limitations

### 1. Limited Support for Complex Transformations

Zod's transformation feature is limited to simple transformations. Complex transformations may require additional processing outside of the schema.

### 2. No Built-in Support for Recursive Schemas

Zod does not provide built-in support for recursive schemas. Recursive schemas must be defined using `z.lazy()`.

### 3. Limited Support for Union Types

Zod's support for union types is limited compared to TypeScript's. Complex union types may require additional validation logic.

### 4. No Built-in Support for Discriminated Unions

Zod does not provide built-in support for discriminated unions. Discriminated unions must be implemented using `z.union()` and custom validation logic.

### 5. Limited Support for Generic Types

Zod's support for generic types is limited compared to TypeScript's. Generic types may require additional validation logic.

## Related Documentation

- [MAAS API Resources Documentation](maas_api_resources.md): Overview of the MAAS API resources architecture.
- [Mock Factories Documentation](mock_factories.md): Documentation for the centralized mock factories used for testing.
- [Resource Handlers Documentation](resource_handlers.md): Detailed documentation for resource handlers and their implementation.
- [Testing Resources Documentation](testing_resources.md): Documentation for testing MAAS API resources.