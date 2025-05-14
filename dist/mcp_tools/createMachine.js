"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable */
// @ts-nocheck
const { z } = require('zod');
const path = require('path');
const sdkPath = path.join(__dirname, '..', '..', 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'cjs');
const { McpServer } = require(path.join(sdkPath, 'server', 'mcp.js'));
const { MaasApiClient } = require('../maas/MaasApiClient');
const { errorToMcpResult, handleMaasApiError, handleValidationError, ErrorType, MaasServerError } = require('../utils/errorHandler');
const { createRequestLogger } = require('../utils/logger');
const { metaSchema } = require('./schemas/common');
// Define schema for create machine tool
const createMachineSchema = z.object({
    hostname: z.string().describe("Hostname for the new machine"),
    architecture: z.string().describe("Architecture (e.g., 'amd64/generic')"),
    mac_addresses: z.array(z.string()).min(1).describe("MAC addresses for the machine's interfaces"),
    power_type: z.string().describe("Power management type (e.g., 'ipmi', 'virsh')"),
    power_parameters: z.record(z.string()).describe("Power parameters specific to the power type"),
    domain: z.string().optional().describe("Domain name for the machine"),
    zone: z.string().optional().describe("Zone name for the machine"),
    pool: z.string().optional().describe("Resource pool for the machine"),
    _meta: metaSchema
});
// Define schema for create machine output
const createMachineOutputSchema = z.object({
    system_id: z.string().describe("System ID of the created machine"),
    hostname: z.string().describe("Hostname of the created machine"),
    status: z.string().describe("Status of the newly created machine"),
    _meta: metaSchema
});
/**
 * Register the create machine tool with the MCP server
 * @param server The MCP server instance
 * @param maasClient The MAAS API client instance
 */
function registerCreateMachineTool(server, maasClient) {
    server.tool("createMachine", createMachineSchema.shape, async (params) => {
        const logger = createRequestLogger('createMachine');
        logger.info({ params }, 'Executing createMachine tool');
        try {
            // Prepare parameters for MAAS API
            const apiParams = {
                hostname: params.hostname,
                architecture: params.architecture,
                mac_addresses: params.mac_addresses,
                power_type: params.power_type,
                power_parameters: params.power_parameters
            };
            // Add optional parameters if provided
            if (params.domain)
                apiParams.domain = params.domain;
            if (params.zone)
                apiParams.zone = params.zone;
            if (params.pool)
                apiParams.pool = params.pool;
            // Call MAAS API to create the machine
            const response = await maasClient.post('/machines/', apiParams);
            logger.info({ machineId: response.system_id }, 'Successfully created machine');
            // Return the response
            return {
                system_id: response.system_id,
                hostname: response.hostname,
                status: response.status_name,
                _meta: params._meta || {}
            };
        }
        catch (error) {
            logger.error({ error }, 'Error creating machine');
            // Handle different types of errors
            if (error.name === 'ValidationError') {
                throw handleValidationError(error);
            }
            else if (error.statusCode || error.status) {
                throw handleMaasApiError(error);
            }
            else {
                throw new MaasServerError('Failed to create machine: ' + error.message, ErrorType.INTERNAL, { originalError: error.message });
            }
        }
    });
}
module.exports = { registerCreateMachineTool };
