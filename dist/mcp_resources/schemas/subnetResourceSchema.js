"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetSubnetParamsSchema = exports.MaasSubnetSchema = exports.SUBNETS_LIST_URI_PATTERN = exports.SUBNET_DETAILS_URI_PATTERN = void 0;
const zod_1 = require("zod");
const uriPatterns_ts_1 = require("./uriPatterns.ts");
Object.defineProperty(exports, "SUBNET_DETAILS_URI_PATTERN", { enumerable: true, get: function () { return uriPatterns_ts_1.SUBNET_DETAILS_URI_PATTERN; } });
Object.defineProperty(exports, "SUBNETS_LIST_URI_PATTERN", { enumerable: true, get: function () { return uriPatterns_ts_1.SUBNETS_LIST_URI_PATTERN; } });
/**
 * Schema for MAAS Subnet object.
 * Defines the structure and validation rules for subnet data returned by the MAAS API.
 */
exports.MaasSubnetSchema = zod_1.z.object({
    id: zod_1.z.number().describe("The unique identifier for the subnet"),
    name: zod_1.z.string().describe("The name of the subnet"),
    cidr: zod_1.z.string().describe("The CIDR notation for the subnet"),
    vlan: zod_1.z.object({
        id: zod_1.z.number(),
        name: zod_1.z.string(),
        fabric: zod_1.z.string(),
        vid: zod_1.z.number(),
        // Add more VLAN fields as needed
    }).describe("The VLAN this subnet is on"),
    gateway_ip: zod_1.z.string().nullable().describe("The gateway IP address for this subnet"),
    dns_servers: zod_1.z.array(zod_1.z.string()).nullable().describe("DNS servers for this subnet"),
    space: zod_1.z.string().describe("The network space this subnet is in"),
    managed: zod_1.z.boolean().describe("Whether this subnet is managed by MAAS"),
    active_discovery: zod_1.z.boolean().describe("Whether active discovery is enabled on this subnet"),
    allow_dns: zod_1.z.boolean().describe("Whether DNS resolution is allowed for this subnet"),
    allow_proxy: zod_1.z.boolean().describe("Whether proxy is allowed for this subnet"),
    resource_uri: zod_1.z.string().describe("The URI for the subnet resource"),
    // Add more fields as needed based on MAAS API documentation
}).passthrough().describe("MAAS Subnet object with network configuration information");
/**
 * Schema for validating input parameters to get subnet details.
 * This schema defines the parameters required to fetch a specific subnet.
 */
exports.GetSubnetParamsSchema = zod_1.z.object({
    subnet_id: zod_1.z.string()
        .describe("The ID of the subnet to retrieve details for"),
}).describe("Parameters for retrieving a specific subnet's details");
