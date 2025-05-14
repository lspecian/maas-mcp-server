"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.machinesListTemplate = exports.machineDetailsTemplate = exports.MACHINES_LIST_URI_PATTERN = exports.MACHINE_DETAILS_URI_PATTERN = void 0;
exports.registerMachineDetailsResource = registerMachineDetailsResource;
exports.registerMachinesListResource = registerMachinesListResource;
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const machineDetailsSchema_ts_1 = require("./schemas/machineDetailsSchema.ts");
const logger_ts_1 = __importDefault(require("../utils/logger.ts"));
const maas_ts_1 = require("../types/maas.ts");
const zod_1 = require("zod");
/**
 * Defines the URI pattern string for accessing details of a specific MAAS machine.
 * This pattern is used by the MCP server to route requests to the appropriate handler.
 * It includes a placeholder `{system_id}` for the machine's unique identifier.
 * Format: maas://machine/{system_id}/details
 */
exports.MACHINE_DETAILS_URI_PATTERN = 'maas://machine/{system_id}/details';
/**
 * Defines the URI pattern string for listing all MAAS machines.
 * This pattern is used by the MCP server to route requests for the machine collection.
 * Format: maas://machines/list
 */
exports.MACHINES_LIST_URI_PATTERN = 'maas://machines/list';
/**
 * ResourceTemplate for machine details
 */
exports.machineDetailsTemplate = new mcp_js_1.ResourceTemplate(exports.MACHINE_DETAILS_URI_PATTERN, { list: undefined });
/**
 * ResourceTemplate for machines list
 */
exports.machinesListTemplate = new mcp_js_1.ResourceTemplate(exports.MACHINES_LIST_URI_PATTERN, { list: undefined });
/**
 * Registers the machine details resource with the MCP server.
 * This function sets up a handler that can extract `system_id` from the URI
 * and fetch machine details accordingly, with AbortSignal support.
 *
 * @param server The MCP server instance.
 * @param maasClient The MAAS API client instance.
 */
function registerMachineDetailsResource(server, maasClient) {
    server.resource("maas_machine_details", exports.machineDetailsTemplate, async (uri, params, { signal }) => {
        // Validate system_id parameter
        try {
            const validatedParams = machineDetailsSchema_ts_1.GetMachineParamsSchema.parse(params);
            const { system_id } = validatedParams;
            if (!system_id || system_id.trim() === '') {
                logger_ts_1.default.error('System ID is missing or empty in the resource URI');
                throw new maas_ts_1.MaasApiError('System ID is missing or empty in the resource URI', 400, 'missing_parameter');
            }
            logger_ts_1.default.info(`Fetching details for MAAS machine: ${system_id}`);
            try {
                // Pass signal to MaasApiClient method to fetch the specific machine
                const machineDetails = await maasClient.get(`/machines/${system_id}/`, undefined, signal);
                // Check if the response is empty or null
                if (!machineDetails) {
                    logger_ts_1.default.error(`Machine not found: ${system_id}`);
                    throw new maas_ts_1.MaasApiError(`Machine '${system_id}' not found`, 404, 'resource_not_found');
                }
                // Validate response against schema
                try {
                    const validatedData = machineDetailsSchema_ts_1.MaasMachineSchema.parse(machineDetails);
                    logger_ts_1.default.info(`Successfully fetched details for MAAS machine: ${system_id}`);
                    // Create a JSON string of the validated data
                    const jsonString = JSON.stringify(validatedData);
                    // Return in the format expected by the SDK
                    return {
                        contents: [{
                                uri: uri.toString(),
                                text: jsonString,
                                mimeType: "application/json"
                            }]
                    };
                }
                catch (validationError) {
                    if (validationError instanceof zod_1.ZodError) {
                        logger_ts_1.default.error(`Machine data validation failed for machine ${system_id}`, {
                            error: validationError.message,
                            issues: validationError.errors
                        });
                        throw new maas_ts_1.MaasApiError(`Machine data validation failed for '${system_id}': The MAAS API returned data in an unexpected format`, 422, 'validation_error', { zodErrors: validationError.errors });
                    }
                    throw validationError; // Re-throw if it's not a ZodError
                }
            }
            catch (error) {
                // Handle different error types
                if (error instanceof maas_ts_1.MaasApiError) {
                    // Already a MaasApiError, just log and re-throw
                    logger_ts_1.default.error(`MAAS API error fetching machine details for ${system_id}: ${error.message}`, {
                        statusCode: error.statusCode,
                        errorCode: error.maasErrorCode
                    });
                    // Special handling for 404 errors
                    if (error.statusCode === 404) {
                        throw new maas_ts_1.MaasApiError(`Machine '${system_id}' not found`, 404, 'resource_not_found');
                    }
                    throw error;
                }
                else if (error.name === 'AbortError') {
                    // Request was aborted
                    logger_ts_1.default.warn(`Machine details request for ${system_id} was aborted`);
                    throw new maas_ts_1.MaasApiError(`Machine details request for '${system_id}' was aborted by the client`, 499, 'request_aborted');
                }
                else if (error.cause?.code === 'ECONNREFUSED' || error.cause?.code === 'ENOTFOUND') {
                    // Network connectivity issues
                    logger_ts_1.default.error(`Network error fetching machine details for ${system_id}: ${error.message}`, {
                        code: error.cause?.code,
                        errno: error.cause?.errno
                    });
                    throw new maas_ts_1.MaasApiError('Failed to connect to MAAS API: Network connectivity issue', 503, 'network_error', { originalError: error.message });
                }
                else if (error.cause?.code === 'ETIMEDOUT') {
                    // Timeout issues
                    logger_ts_1.default.error(`Timeout error fetching machine details for ${system_id}: ${error.message}`);
                    throw new maas_ts_1.MaasApiError(`MAAS API request timed out while fetching machine details for '${system_id}'`, 504, 'request_timeout', { originalError: error.message });
                }
                else {
                    // Generic error handling
                    logger_ts_1.default.error(`Unexpected error fetching details for MAAS machine ${system_id}: ${error.message}`, {
                        stack: error.stack
                    });
                    throw new maas_ts_1.MaasApiError(`Could not fetch details for MAAS machine '${system_id}': ${error.message}`, 500, 'unexpected_error', { originalError: error.message });
                }
            }
        }
        catch (paramError) {
            if (paramError instanceof zod_1.ZodError) {
                logger_ts_1.default.error('Invalid parameters for machine details request', {
                    error: paramError.message,
                    issues: paramError.errors
                });
                throw new maas_ts_1.MaasApiError('Invalid parameters for machine details request', 400, 'invalid_parameters', { zodErrors: paramError.errors });
            }
            // If it's already a MaasApiError, just re-throw it
            if (paramError instanceof maas_ts_1.MaasApiError) {
                throw paramError;
            }
            // Otherwise, wrap it
            const errorMessage = paramError instanceof Error ? paramError.message : 'Unknown error';
            logger_ts_1.default.error(`Error processing machine details request: ${errorMessage}`);
            throw new maas_ts_1.MaasApiError(`Error processing machine details request: ${errorMessage}`, 500, 'unexpected_error');
        }
    });
}
/**
 * Registers the machines list resource with the MCP server.
 * This function sets up a handler that fetches all machines from the MAAS API,
 * with AbortSignal support.
 *
 * @param server The MCP server instance.
 * @param maasClient The MAAS API client instance.
 */
function registerMachinesListResource(server, maasClient) {
    server.resource("maas_machines_list", exports.machinesListTemplate, async (uri, params, { signal }) => {
        logger_ts_1.default.info('Fetching MAAS machines list');
        try {
            // Pass signal to MaasApiClient method to fetch all machines
            const machinesList = await maasClient.get('/machines/', undefined, signal);
            if (!Array.isArray(machinesList)) {
                logger_ts_1.default.error('Invalid response format: Expected an array of machines');
                throw new maas_ts_1.MaasApiError('Invalid response format: Expected an array of machines', 500, 'invalid_response_format');
            }
            // Validate response against schema
            try {
                const validatedData = machinesList.map((machine) => machineDetailsSchema_ts_1.MaasMachineSchema.parse(machine));
                logger_ts_1.default.info(`Successfully fetched ${validatedData.length} MAAS machines`);
                // Create a JSON string of the validated data
                const jsonString = JSON.stringify(validatedData);
                // Return in the format expected by the SDK
                return {
                    contents: [{
                            uri: uri.toString(),
                            text: jsonString,
                            mimeType: "application/json"
                        }]
                };
            }
            catch (validationError) {
                if (validationError instanceof zod_1.ZodError) {
                    logger_ts_1.default.error('Machine data validation failed', {
                        error: validationError.message,
                        issues: validationError.errors
                    });
                    throw new maas_ts_1.MaasApiError('Machine data validation failed: The MAAS API returned data in an unexpected format', 422, 'validation_error', { zodErrors: validationError.errors });
                }
                throw validationError; // Re-throw if it's not a ZodError
            }
        }
        catch (error) {
            // Handle different error types
            if (error instanceof maas_ts_1.MaasApiError) {
                // Already a MaasApiError, just log and re-throw
                logger_ts_1.default.error(`MAAS API error fetching machines list: ${error.message}`, {
                    statusCode: error.statusCode,
                    errorCode: error.maasErrorCode
                });
                throw error;
            }
            else if (error.name === 'AbortError') {
                // Request was aborted
                logger_ts_1.default.warn('Machines list request was aborted');
                throw new maas_ts_1.MaasApiError('Machines list request was aborted by the client', 499, 'request_aborted');
            }
            else if (error.cause?.code === 'ECONNREFUSED' || error.cause?.code === 'ENOTFOUND') {
                // Network connectivity issues
                logger_ts_1.default.error(`Network error fetching machines list: ${error.message}`, {
                    code: error.cause?.code,
                    errno: error.cause?.errno
                });
                throw new maas_ts_1.MaasApiError('Failed to connect to MAAS API: Network connectivity issue', 503, 'network_error', { originalError: error.message });
            }
            else if (error.cause?.code === 'ETIMEDOUT') {
                // Timeout issues
                logger_ts_1.default.error(`Timeout error fetching machines list: ${error.message}`);
                throw new maas_ts_1.MaasApiError('MAAS API request timed out while fetching machines list', 504, 'request_timeout', { originalError: error.message });
            }
            else {
                // Generic error handling
                logger_ts_1.default.error(`Unexpected error fetching MAAS machines list: ${error.message}`, {
                    stack: error.stack
                });
                throw new maas_ts_1.MaasApiError(`Could not fetch MAAS machines list: ${error.message}`, 500, 'unexpected_error', { originalError: error.message });
            }
        }
    });
}
