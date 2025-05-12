import { z } from 'zod';
import { SUBNET_DETAILS_URI_PATTERN, SUBNETS_LIST_URI_PATTERN } from './uriPatterns.ts';

/**
 * Re-exports URI patterns related to subnet resources from './uriPatterns.ts'.
 * This is done for convenience and to consolidate subnet-related schema definitions.
 */
export { SUBNET_DETAILS_URI_PATTERN, SUBNETS_LIST_URI_PATTERN };

/**
 * Schema for MAAS Subnet object.
 * Defines the structure and validation rules for subnet data returned by the MAAS API.
 */
export const MaasSubnetSchema = z.object({
  id: z.number().describe("The unique identifier for the subnet"),
  name: z.string().describe("The name of the subnet"),
  cidr: z.string().describe("The CIDR notation for the subnet"),
  vlan: z.object({
    id: z.number(),
    name: z.string(),
    fabric: z.string(),
    vid: z.number(),
    // Add more VLAN fields as needed
  }).describe("The VLAN this subnet is on"),
  gateway_ip: z.string().nullable().describe("The gateway IP address for this subnet"),
  dns_servers: z.array(z.string()).nullable().describe("DNS servers for this subnet"),
  space: z.string().describe("The network space this subnet is in"),
  managed: z.boolean().describe("Whether this subnet is managed by MAAS"),
  active_discovery: z.boolean().describe("Whether active discovery is enabled on this subnet"),
  allow_dns: z.boolean().describe("Whether DNS resolution is allowed for this subnet"),
  allow_proxy: z.boolean().describe("Whether proxy is allowed for this subnet"),
  resource_uri: z.string().describe("The URI for the subnet resource"),
  // Add more fields as needed based on MAAS API documentation
}).passthrough().describe("MAAS Subnet object with network configuration information");

/**
 * Schema for validating input parameters to get subnet details.
 * This schema defines the parameters required to fetch a specific subnet.
 */
export const GetSubnetParamsSchema = z.object({
  subnet_id: z.string()
    .describe("The ID of the subnet to retrieve details for"),
}).describe("Parameters for retrieving a specific subnet's details");

// Export the types for use in other files
export type MaasSubnet = z.infer<typeof MaasSubnetSchema>;
export type GetSubnetParams = z.infer<typeof GetSubnetParamsSchema>;