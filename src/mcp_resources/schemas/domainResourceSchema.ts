import { z } from 'zod';
import { DOMAIN_DETAILS_URI_PATTERN, DOMAINS_LIST_URI_PATTERN } from './uriPatterns.js';

/**
 * Re-exports URI patterns related to domain resources from './uriPatterns.js'.
 * This is done for convenience and to consolidate domain-related schema definitions.
 */
export { DOMAIN_DETAILS_URI_PATTERN, DOMAINS_LIST_URI_PATTERN };

/**
 * Schema for MAAS Domain object.
 * Defines the structure and validation rules for domain data returned by the MAAS API.
 */
export const MaasDomainSchema = z.object({
  id: z.number().describe("The unique identifier for the domain"),
  name: z.string().describe("The name of the domain"),
  authoritative: z.boolean().describe("Whether this domain is authoritative"),
  ttl: z.number().nullable().describe("The default TTL for this domain"),
  resource_record_count: z.number().describe("The number of resource records in this domain"),
  is_default: z.boolean().describe("Whether this is the default domain"),
  resource_uri: z.string().describe("The URI for the domain resource"),
  // Add more fields as needed based on MAAS API documentation
}).passthrough().describe("MAAS Domain object with DNS configuration information");

/**
 * Schema for validating input parameters to get domain details.
 * This schema defines the parameters required to fetch a specific domain.
 */
export const GetDomainParamsSchema = z.object({
  domain_id: z.string()
    .describe("The ID of the domain to retrieve details for"),
}).describe("Parameters for retrieving a specific domain's details");

// Export the types for use in other files
export type MaasDomain = z.infer<typeof MaasDomainSchema>;
export type GetDomainParams = z.infer<typeof GetDomainParamsSchema>;