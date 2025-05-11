import { z } from 'zod';
import { ZONE_DETAILS_URI_PATTERN, ZONES_LIST_URI_PATTERN } from './uriPatterns.js';

/**
 * Re-exports URI patterns related to zone resources from './uriPatterns.js'.
 * This is done for convenience and to consolidate zone-related schema definitions.
 */
export { ZONE_DETAILS_URI_PATTERN, ZONES_LIST_URI_PATTERN };

/**
 * Schema for MAAS Zone object.
 * Defines the structure and validation rules for zone data returned by the MAAS API.
 */
export const MaasZoneSchema = z.object({
  id: z.number().describe("The unique identifier for the zone"),
  name: z.string().describe("The name of the zone"),
  description: z.string().describe("A description of the zone"),
  resource_uri: z.string().describe("The URI for the zone resource"),
  // Add more fields as needed based on MAAS API documentation
}).passthrough().describe("MAAS Zone object with identification and descriptive information");

/**
 * Schema for validating input parameters to get zone details.
 * This schema defines the parameters required to fetch a specific zone.
 */
export const GetZoneParamsSchema = z.object({
  zone_id: z.string()
    .describe("The ID of the zone to retrieve details for"),
}).describe("Parameters for retrieving a specific zone's details");

// Export the types for use in other files
export type MaasZone = z.infer<typeof MaasZoneSchema>;
export type GetZoneParams = z.infer<typeof GetZoneParamsSchema>;