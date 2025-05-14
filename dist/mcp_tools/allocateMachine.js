"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable */
// @ts-nocheck
const path = require('path');
const sdkPath = path.join(__dirname, '..', '..', 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'cjs');
const { McpServer } = require(path.join(sdkPath, 'server', 'mcp.js'));
const { MaasApiClient } = require("../maas/MaasApiClient"); // Adjusted path if necessary
const { z } = require("zod");
const { metaSchema } = require("./schemas/common"); // Adjusted path if necessary
const { createRequestLogger } = require("../utils/logger"); // Adjusted path if necessary
// Define schema for allocate machine tool
const allocateMachineSchema = z.object({
    name: z.string().optional().describe("Hostname to assign to the allocated machine."),
    system_id: z.string().optional().describe("System ID of a specific machine to allocate."),
    zone: z.string().optional().describe("Zone name to allocate the machine from."),
    pool: z.string().optional().describe("Pool name to allocate the machine from."),
    cpu_count: z.number().int().positive().optional().describe("Minimum CPU count required."),
    memory: z.number().int().positive().optional().describe("Minimum memory in MB required."),
    architecture: z.string().optional().describe("Architecture required (e.g., 'amd64/generic')."),
    tags: z.string().optional().describe("Comma-separated list of tags the machine must have."),
    _meta: metaSchema
});
// Define schema for allocate machine output
const allocateMachineOutputSchema = z.object({
    system_id: z.string().describe("System ID of the allocated machine."),
    hostname: z.string().describe("Hostname of the allocated machine."),
    status: z.string().describe("Status of the machine after allocation."),
    owner: z.string().describe("Owner of the machine after allocation."),
    _meta: metaSchema
});
/**
 * Register the allocate machine tool with the MCP server
 * @param server The MCP server instance
 * @param maasClient The MAAS API client instance
 */
function registerAllocateMachineTool(server, maasClient) {
    server.tool("allocateMachine", allocateMachineSchema.shape, async (params) => {
        const logger = createRequestLogger('allocateMachine');
        logger.info({ params }, 'Executing allocateMachine tool');
        try {
            // Prepare parameters for MAAS API
            const apiParams = {};
            // Add parameters if provided
            if (params.name)
                apiParams.hostname = params.name;
            if (params.system_id)
                apiParams.system_id = params.system_id;
            if (params.zone)
                apiParams.zone = params.zone;
            if (params.pool)
                apiParams.pool = params.pool;
            if (params.cpu_count)
                apiParams.cpu_count = params.cpu_count;
            if (params.memory)
                apiParams.memory = params.memory;
            if (params.architecture)
                apiParams.architecture = params.architecture;
            if (params.tags)
                apiParams.tags = params.tags;
            // Call MAAS API to allocate the machine
            let response;
            if (params.system_id) {
                // If system_id is provided, allocate that specific machine
                response = await maasClient.post(`/machines/${params.system_id}/`, {
                    action: 'allocate'
                });
            }
            else {
                // Otherwise, allocate a machine based on the provided criteria
                response = await maasClient.post('/machines/', {
                    action: 'allocate',
                    ...apiParams
                });
            }
            logger.info({ machineId: response.system_id }, 'Successfully allocated machine');
            // Return the response
            return {
                system_id: response.system_id,
                hostname: response.hostname,
                status: response.status_name,
                owner: response.owner,
                _meta: params._meta || {}
            };
        }
        catch (error) {
            logger.error({ error }, 'Error allocating machine');
            throw error;
        }
    });
}
module.exports = { registerAllocateMachineTool };
