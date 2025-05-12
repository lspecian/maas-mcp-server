const { z } = require('zod');
const { metaSchema } = require('./common');

/**
 * Schema for validating input parameters to the list subnets tool.
 * This schema defines the parameters that can be used to filter the list of subnets.
 */
const listSubnetsSchema = z.object({
  cidr: z.string().optional()
    .describe("Filter subnets by CIDR notation."),
  name: z.string().optional()
    .describe("Filter subnets by name."),
  vlan: z.string().optional()
    .describe("Filter subnets by VLAN ID."),
  fabric: z.string().optional()
    .describe("Filter subnets by fabric ID."),
  space: z.string().optional()
    .describe("Filter subnets by space ID."),
  _meta: metaSchema
});

/**
 * Schema for validating the output of the list subnets tool.
 * This schema defines the structure of the subnet objects returned by the tool.
 */
const listSubnetsOutputSchema = z.object({
  subnets: z.array(z.object({
    id: z.number().describe("Subnet ID"),
    name: z.string().describe("Subnet name"),
    cidr: z.string().describe("Subnet CIDR notation"),
    vlan: z.object({
      id: z.number().describe("VLAN ID"),
      name: z.string().describe("VLAN name"),
      fabric: z.string().describe("Fabric name")
    }).describe("VLAN information"),
    space: z.string().describe("Space name"),
    gateway_ip: z.string().nullable().describe("Gateway IP address"),
    dns_servers: z.array(z.string()).describe("DNS servers"),
    managed: z.boolean().describe("Whether the subnet is managed by MAAS"),
    active_discovery: z.boolean().describe("Whether active discovery is enabled"),
    allow_dns: z.boolean().describe("Whether DNS resolution is allowed"),
    allow_proxy: z.boolean().describe("Whether proxy is allowed"),
    rdns_mode: z.number().describe("Reverse DNS mode"),
    description: z.string().describe("Subnet description")
  })).describe("List of subnets"),
  _meta: metaSchema
});

module.exports = {
  listSubnetsSchema,
  listSubnetsOutputSchema
};