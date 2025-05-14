"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDeployMachineWithProgressTool = registerDeployMachineWithProgressTool;
/* eslint-disable */
// @ts-nocheck
const path_1 = __importDefault(require("path"));
const sdkPath = path_1.default.join(__dirname, '..', '..', 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'cjs');
const zod_1 = require("zod");
const common_ts_1 = require("./schemas/common.ts");
const operationHandlerUtils_ts_1 = require("../utils/operationHandlerUtils.ts");
const logger_ts_1 = require("../utils/logger.ts");
const progressNotification_ts_1 = require("../utils/progressNotification.ts");
// Define schema for deploy machine with progress tool
const deployMachineWithProgressSchema = zod_1.z.object({
    system_id: common_ts_1.machineIdSchema,
    osystem: common_ts_1.osSystemSchema.optional(),
    distro_series: common_ts_1.distroSeriesSchema.optional(),
    user_data: zod_1.z.string().optional().describe("Cloud-init user data to use when deploying this machine"),
    _meta: common_ts_1.metaSchema
});
// Define schema for deploy machine with progress output
const deployMachineWithProgressOutputSchema = zod_1.z.object({
    system_id: zod_1.z.string().describe("System ID of the deployed machine"),
    hostname: zod_1.z.string().describe("Hostname of the deployed machine"),
    status: zod_1.z.string().describe("Status of the deployed machine"),
    _meta: common_ts_1.metaSchema
});
/**
 * Register the deploy machine with progress tool with the MCP server
 * @param server The MCP server instance
 * @param maasClient The MAAS API client instance
 */
function registerDeployMachineWithProgressTool(server, maasClient) {
    server.tool("deployMachineWithProgress", deployMachineWithProgressSchema.shape, (0, operationHandlerUtils_ts_1.withOperationHandler)(async (params, signal, context) => {
        const logger = (0, logger_ts_1.createRequestLogger)('deployMachineWithProgress');
        const progressSender = (0, progressNotification_ts_1.createProgressSender)(params._meta?.progressToken, context.sendNotification, 'deployMachineWithProgress', 'deployMachine');
        logger.info({ params }, 'Executing deployMachineWithProgress tool');
        try {
            // Start progress notification
            await progressSender(0, 'Preparing to deploy machine');
            // Prepare parameters for MAAS API
            const apiParams = {};
            // Add parameters if provided
            if (params.osystem)
                apiParams.osystem = params.osystem;
            if (params.distro_series)
                apiParams.distro_series = params.distro_series;
            if (params.user_data)
                apiParams.user_data = params.user_data;
            // Update progress
            await progressSender(25, 'Sending deploy request to MAAS');
            // Call MAAS API to deploy the machine
            const response = await maasClient.post(`/machines/${params.system_id}/?op=deploy`, apiParams);
            // Register the operation for polling
            context.registerOperation({
                type: 'DEPLOY',
                resourceId: params.system_id,
                resourceType: 'machine',
                progressSender
            });
            logger.info({ machineId: response.system_id }, 'Successfully initiated machine deployment');
            // Return the response
            return {
                system_id: response.system_id,
                hostname: response.hostname,
                status: response.status_name,
                _meta: params._meta || {}
            };
        }
        catch (error) {
            // Handle error and send error progress
            await progressSender(100, `Error deploying machine: ${error instanceof Error ? error.message : String(error)}`, 100, true);
            logger.error({ error, machineId: params.system_id }, 'Error deploying machine');
            throw (0, operationHandlerUtils_ts_1.handleOperationError)(error, 'Failed to deploy machine');
        }
    }));
}
