"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable */
// @ts-nocheck
const path = require('path');
const sdkPath = path.join(__dirname, '..', '..', 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'cjs');
const { McpServer } = require(path.join(sdkPath, 'server', 'mcp.js'));
const { MaasApiClient } = require("../maas/MaasApiClient");
const { z } = require("zod");
const { metaSchema, paginationSchema } = require("./schemas/common");
const { createRequestLogger } = require("../utils/logger");
// Define schema for list machines tool parameters
const listMachinesParamsSchema = z.object({
    hostname: z.string().optional().describe("Filter machines by hostname (supports globbing)."),
    mac_address: z.string().optional().describe("Filter machines by a MAC address."),
    zone: z.string().optional().describe("Filter machines by zone name."),
    pool: z.string().optional().describe("Filter machines by pool name."),
    status: z.string().optional().describe("Filter machines by status."),
    owner: z.string().optional().describe("Filter machines by owner."),
    tags: z.string().optional().describe("Filter machines by tag name (comma-separated)."),
    offset: z.number().nonnegative().optional().describe("Skip the first N machines in the result set."),
    limit: z.number().positive().optional().describe("Limit the number of machines returned."),
    _meta: metaSchema
});
// Define schema for list machines tool output
const listMachinesOutputSchema = z.object({
    machines: z.array(z.object({
        system_id: z.string(),
        hostname: z.string(),
        status: z.string(),
        owner: z.string().nullable(),
        architecture: z.string(),
        cpu_count: z.number(),
        memory: z.number(),
        zone: z.object({
            name: z.string()
        }),
        pool: z.object({
            name: z.string()
        }),
        ip_addresses: z.array(z.string()).optional(),
        tags: z.array(z.string())
    })),
    count: z.number().int().nonnegative(),
    _meta: metaSchema
});
/**
 * Register the list machines tool with the MCP server
 * @param server The MCP server instance
 * @param maasClient The MAAS API client instance
 */
function registerListMachinesTool(server, maasClient) {
    server.tool("listMachines", listMachinesParamsSchema.shape, async (params) => {
        const logger = createRequestLogger('listMachines');
        logger.info({ params }, 'Executing listMachines tool');
        try {
            // Convert parameters to MAAS API format
            const apiParams = {};
            // Map tool parameters to MAAS API parameters
            if (params.hostname)
                apiParams.hostname = params.hostname;
            if (params.mac_address)
                apiParams.mac_address = params.mac_address;
            if (params.zone)
                apiParams.zone = params.zone;
            if (params.pool)
                apiParams.pool = params.pool;
            if (params.status)
                apiParams.status = params.status;
            if (params.owner)
                apiParams.owner = params.owner;
            if (params.tags)
                apiParams.tags = params.tags;
            // Add pagination parameters
            if (params.offset !== undefined)
                apiParams.offset = params.offset;
            if (params.limit !== undefined)
                apiParams.limit = params.limit;
            // Call MAAS API to get machines
            const response = await maasClient.get('/machines/', apiParams);
            // Transform response to match output schema
            const machines = response.map(machine => ({
                system_id: machine.system_id,
                hostname: machine.hostname,
                status: machine.status_name,
                owner: machine.owner || null,
                architecture: machine.architecture,
                cpu_count: machine.cpu_count,
                memory: machine.memory,
                zone: {
                    name: machine.zone.name
                },
                pool: {
                    name: machine.pool.name
                },
                ip_addresses: machine.ip_addresses,
                tags: machine.tag_names || []
            }));
            logger.info({ machineCount: machines.length }, 'Successfully retrieved machines');
            return {
                machines,
                count: machines.length,
                _meta: {}
            };
        }
        catch (error) {
            logger.error({ error }, 'Error listing machines');
            throw error;
        }
    });
}
module.exports = { registerListMachinesTool };
