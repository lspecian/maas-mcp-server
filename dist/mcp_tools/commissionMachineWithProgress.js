"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommissionMachineWithProgressTool = registerCommissionMachineWithProgressTool;
/* eslint-disable */
// @ts-nocheck
const path_1 = __importDefault(require("path"));
const sdkPath = path_1.default.join(__dirname, '..', '..', 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'cjs');
const zod_1 = require("zod");
const common_ts_1 = require("./schemas/common.ts");
const operationHandlerUtils_ts_1 = require("../utils/operationHandlerUtils.ts");
const logger_ts_1 = require("../utils/logger.ts");
const progressNotification_ts_1 = require("../utils/progressNotification.ts");
// Define schema for commission machine with progress tool
const commissionMachineWithProgressSchema = zod_1.z.object({
    system_id: common_ts_1.machineIdSchema,
    enable_ssh: zod_1.z.boolean().optional().describe("Whether to enable SSH for the commissioning environment"),
    skip_networking: zod_1.z.boolean().optional().describe("Whether to skip networking configuration during commissioning"),
    skip_storage: zod_1.z.boolean().optional().describe("Whether to skip storage configuration during commissioning"),
    commissioning_scripts: zod_1.z.array(zod_1.z.string()).optional().describe("List of commissioning script names to run"),
    testing_scripts: zod_1.z.array(zod_1.z.string()).optional().describe("List of testing script names to run"),
    _meta: common_ts_1.metaSchema
});
// Define schema for commission machine with progress output
const commissionMachineWithProgressOutputSchema = zod_1.z.object({
    system_id: zod_1.z.string().describe("System ID of the commissioned machine"),
    hostname: zod_1.z.string().describe("Hostname of the commissioned machine"),
    status: zod_1.z.string().describe("Status of the commissioned machine"),
    _meta: common_ts_1.metaSchema
});
/**
 * Register the commission machine with progress tool with the MCP server
 * @param server The MCP server instance
 * @param maasClient The MAAS API client instance
 */
function registerCommissionMachineWithProgressTool(server, maasClient) {
    server.tool("commissionMachineWithProgress", commissionMachineWithProgressSchema.shape, (0, operationHandlerUtils_ts_1.withOperationHandler)(async (params, signal, context) => {
        const logger = (0, logger_ts_1.createRequestLogger)('commissionMachineWithProgress');
        const progressSender = (0, progressNotification_ts_1.createProgressSender)(params._meta?.progressToken, context.sendNotification, 'commissionMachineWithProgress', 'commissionMachine');
        logger.info({ params }, 'Executing commissionMachineWithProgress tool');
        try {
            // Start progress notification
            await progressSender(0, 'Preparing to commission machine');
            // Prepare parameters for MAAS API
            const apiParams = {};
            // Add parameters if provided
            if (params.enable_ssh !== undefined)
                apiParams.enable_ssh = params.enable_ssh;
            if (params.skip_networking !== undefined)
                apiParams.skip_networking = params.skip_networking;
            if (params.skip_storage !== undefined)
                apiParams.skip_storage = params.skip_storage;
            if (params.commissioning_scripts)
                apiParams.commissioning_scripts = params.commissioning_scripts;
            if (params.testing_scripts)
                apiParams.testing_scripts = params.testing_scripts;
            // Update progress
            await progressSender(25, 'Sending commission request to MAAS');
            // Call MAAS API to commission the machine
            const response = await maasClient.post(`/machines/${params.system_id}/?op=commission`, apiParams);
            // Register the operation for polling
            context.registerOperation({
                type: 'COMMISSION',
                resourceId: params.system_id,
                resourceType: 'machine',
                progressSender
            });
            logger.info({ machineId: response.system_id }, 'Successfully initiated machine commissioning');
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
            await progressSender(100, `Error commissioning machine: ${error instanceof Error ? error.message : String(error)}`, 100, true);
            logger.error({ error, machineId: params.system_id }, 'Error commissioning machine');
            throw (0, operationHandlerUtils_ts_1.handleOperationError)(error, 'Failed to commission machine');
        }
    }));
}
