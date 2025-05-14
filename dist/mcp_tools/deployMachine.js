"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable */
// @ts-nocheck
const path = require('path');
const sdkPath = path.join(__dirname, '..', '..', 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'cjs');
const { McpServer } = require(path.join(sdkPath, 'server', 'mcp.js'));
const { MaasApiClient } = require("../maas/MaasApiClient"); // Adjust path if necessary
const { z } = require("zod");
const { machineIdSchema, osSystemSchema, distroSeriesSchema, metaSchema } = require("./schemas/common"); // Adjust path if necessary
const { createRequestLogger } = require("../utils/logger"); // Adjust path if necessary
// Define schema for deploy machine tool
const deployMachineSchema = z.object({
    system_id: machineIdSchema,
    osystem: osSystemSchema.optional(),
    distro_series: distroSeriesSchema.optional(),
    user_data: z.string().optional().describe("Cloud-init user data to use when deploying."),
    install_kvm: z.boolean().optional().describe("Whether to install KVM on the machine."),
    _meta: metaSchema
});
// Define schema for deploy machine output
const deployMachineOutputSchema = z.object({
    system_id: machineIdSchema,
    status: z.string().describe("Status of the machine after deployment request."),
    hostname: z.string().describe("Hostname of the machine."),
    _meta: metaSchema
});
/**
 * Register the deploy machine tool with the MCP server
 * @param server The MCP server instance
 * @param maasClient The MAAS API client instance
 */
function registerDeployMachineTool(server, maasClient) {
    server.tool("deployMachine", deployMachineSchema.shape, async (params) => {
        const logger = createRequestLogger('deployMachine');
        logger.info({ params }, 'Executing deployMachine tool');
        try {
            // Prepare parameters for MAAS API
            const apiParams = {
                system_id: params.system_id
            };
            // Add optional parameters if provided
            if (params.osystem)
                apiParams.osystem = params.osystem;
            if (params.distro_series)
                apiParams.distro_series = params.distro_series;
            if (params.user_data)
                apiParams.user_data = params.user_data;
            if (params.install_kvm !== undefined)
                apiParams.install_kvm = params.install_kvm;
            // Call MAAS API to deploy the machine
            const response = await maasClient.post(`/machines/${params.system_id}/`, {
                action: 'deploy',
                ...apiParams
            });
            logger.info({ machineId: response.system_id }, 'Successfully initiated machine deployment');
            // Return the response
            return {
                system_id: response.system_id,
                status: response.status_name,
                hostname: response.hostname,
                _meta: params._meta || {}
            };
        }
        catch (error) {
            logger.error({ error, machineId: params.system_id }, 'Error deploying machine');
            throw error;
        }
    });
}
module.exports = { registerDeployMachineTool };
