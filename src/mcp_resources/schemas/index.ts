/**
 * Re-exports all schema definitions from the mcp_resources/schemas directory.
 * This file provides a convenient way to import multiple schemas from a single location.
 */

// Export all URI patterns from a centralized location
export * from './uriPatterns.ts';

// Export all schema definitions
export * from './machineDetailsSchema.js';
export * from './tagResourcesSchema.js';
export * from './zoneResourceSchema.js';
export * from './deviceResourceSchema.js';
export * from './domainResourceSchema.js';
export * from './subnetResourceSchema.js';

// Export collection query parameter schemas
export * from './collectionQueryParams.js';