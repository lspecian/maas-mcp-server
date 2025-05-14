"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.devicesListTemplate = exports.deviceDetailsTemplate = void 0;
exports.registerDeviceDetailsResource = registerDeviceDetailsResource;
exports.registerDevicesListResource = registerDevicesListResource;
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const deviceResourceSchema_ts_1 = require("./schemas/deviceResourceSchema.ts");
const logger_ts_1 = __importDefault(require("../utils/logger.ts"));
const maas_ts_1 = require("../types/maas.ts");
const zod_1 = require("zod");
/**
 * ResourceTemplate for fetching details of a single MAAS device.
 * Defines the URI pattern used to identify specific device detail requests.
 * The URI pattern expects a 'system_id' parameter.
 * Example URI: maas://devices/{system_id}
 */
exports.deviceDetailsTemplate = new mcp_js_1.ResourceTemplate(deviceResourceSchema_ts_1.DEVICE_DETAILS_URI_PATTERN, { list: undefined } // Indicates this is not a list/collection endpoint
);
/**
 * ResourceTemplate for fetching a list of all MAAS devices.
 * Defines the URI pattern used to identify requests for the devices collection.
 * Example URI: maas://devices
 */
exports.devicesListTemplate = new mcp_js_1.ResourceTemplate(deviceResourceSchema_ts_1.DEVICES_LIST_URI_PATTERN, { list: undefined } // Indicates this is a list/collection endpoint
);
/**
 * Registers the device details resource with the MCP server.
 * This function sets up a handler that can extract `system_id` from the URI
 * and fetch device details accordingly, with AbortSignal support.
 *
 * @param server The MCP server instance.
 * @param maasClient The MAAS API client instance.
 */
function registerDeviceDetailsResource(server, maasClient) {
    server.resource("maas_device_details", exports.deviceDetailsTemplate, async (uri, params, { signal }) => {
        // Validate system_id parameter
        try {
            const validatedParams = deviceResourceSchema_ts_1.GetDeviceParamsSchema.parse(params);
            const { system_id } = validatedParams;
            if (!system_id || system_id.trim() === '') {
                logger_ts_1.default.error('System ID is missing or empty in the resource URI');
                throw new maas_ts_1.MaasApiError('System ID is missing or empty in the resource URI', 400, 'missing_parameter');
            }
            logger_ts_1.default.info(`Fetching details for MAAS device: ${system_id}`);
            try {
                // Pass signal to MaasApiClient method to fetch the specific device
                const deviceDetails = await maasClient.get(`/devices/${system_id}/`, undefined, signal);
                // Check if the response is empty or null
                if (!deviceDetails) {
                    logger_ts_1.default.error(`Device not found: ${system_id}`);
                    throw new maas_ts_1.MaasApiError(`Device '${system_id}' not found`, 404, 'resource_not_found');
                }
                // Validate response against schema
                try {
                    const validatedData = deviceResourceSchema_ts_1.MaasDeviceSchema.parse(deviceDetails);
                    logger_ts_1.default.info(`Successfully fetched details for MAAS device: ${system_id}`);
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
                        logger_ts_1.default.error(`Device data validation failed for device ${system_id}`, {
                            error: validationError.message,
                            issues: validationError.errors
                        });
                        throw new maas_ts_1.MaasApiError(`Device data validation failed for '${system_id}': The MAAS API returned data in an unexpected format`, 422, 'validation_error', { zodErrors: validationError.errors });
                    }
                    throw validationError; // Re-throw if it's not a ZodError
                }
            }
            catch (error) {
                // Handle different error types
                if (error instanceof maas_ts_1.MaasApiError) {
                    // Already a MaasApiError, just log and re-throw
                    logger_ts_1.default.error(`MAAS API error fetching device details for ${system_id}: ${error.message}`, {
                        statusCode: error.statusCode,
                        errorCode: error.maasErrorCode
                    });
                    // Special handling for 404 errors
                    if (error.statusCode === 404) {
                        throw new maas_ts_1.MaasApiError(`Device '${system_id}' not found`, 404, 'resource_not_found');
                    }
                    throw error;
                }
                else if (error.name === 'AbortError') {
                    // Request was aborted
                    logger_ts_1.default.warn(`Device details request for ${system_id} was aborted`);
                    throw new maas_ts_1.MaasApiError(`Device details request for '${system_id}' was aborted by the client`, 499, 'request_aborted');
                }
                else if (error.cause?.code === 'ECONNREFUSED' || error.cause?.code === 'ENOTFOUND') {
                    // Network connectivity issues
                    logger_ts_1.default.error(`Network error fetching device details for ${system_id}: ${error.message}`, {
                        code: error.cause?.code,
                        errno: error.cause?.errno
                    });
                    throw new maas_ts_1.MaasApiError('Failed to connect to MAAS API: Network connectivity issue', 503, 'network_error', { originalError: error.message });
                }
                else if (error.cause?.code === 'ETIMEDOUT') {
                    // Timeout issues
                    logger_ts_1.default.error(`Timeout error fetching device details for ${system_id}: ${error.message}`);
                    throw new maas_ts_1.MaasApiError(`MAAS API request timed out while fetching device details for '${system_id}'`, 504, 'request_timeout', { originalError: error.message });
                }
                else {
                    // Generic error handling
                    logger_ts_1.default.error(`Unexpected error fetching details for MAAS device ${system_id}: ${error.message}`, {
                        stack: error.stack
                    });
                    throw new maas_ts_1.MaasApiError(`Could not fetch details for MAAS device '${system_id}': ${error.message}`, 500, 'unexpected_error', { originalError: error.message });
                }
            }
        }
        catch (paramError) {
            if (paramError instanceof zod_1.ZodError) {
                logger_ts_1.default.error('Invalid parameters for device details request', {
                    error: paramError.message,
                    issues: paramError.errors
                });
                throw new maas_ts_1.MaasApiError('Invalid parameters for device details request', 400, 'invalid_parameters', { zodErrors: paramError.errors });
            }
            // If it's already a MaasApiError, just re-throw it
            if (paramError instanceof maas_ts_1.MaasApiError) {
                throw paramError;
            }
            // Otherwise, wrap it
            const errorMessage = paramError instanceof Error ? paramError.message : 'Unknown error';
            logger_ts_1.default.error(`Error processing device details request: ${errorMessage}`);
            throw new maas_ts_1.MaasApiError(`Error processing device details request: ${errorMessage}`, 500, 'unexpected_error');
        }
    });
}
/**
 * Registers the devices list resource with the MCP server.
 * This function sets up a handler that fetches all devices from the MAAS API,
 * with AbortSignal support.
 *
 * @param server The MCP server instance.
 * @param maasClient The MAAS API client instance.
 */
function registerDevicesListResource(server, maasClient) {
    server.resource("maas_devices_list", exports.devicesListTemplate, async (uri, params, { signal }) => {
        logger_ts_1.default.info('Fetching MAAS devices list');
        try {
            // Pass signal to MaasApiClient method to fetch all devices
            const devicesList = await maasClient.get('/devices/', undefined, signal);
            if (!Array.isArray(devicesList)) {
                logger_ts_1.default.error('Invalid response format: Expected an array of devices');
                throw new maas_ts_1.MaasApiError('Invalid response format: Expected an array of devices', 500, 'invalid_response_format');
            }
            // Validate response against schema
            try {
                const validatedData = devicesList.map((device) => deviceResourceSchema_ts_1.MaasDeviceSchema.parse(device));
                logger_ts_1.default.info(`Successfully fetched ${validatedData.length} MAAS devices`);
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
                    logger_ts_1.default.error('Device data validation failed', {
                        error: validationError.message,
                        issues: validationError.errors
                    });
                    throw new maas_ts_1.MaasApiError('Device data validation failed: The MAAS API returned data in an unexpected format', 422, 'validation_error', { zodErrors: validationError.errors });
                }
                throw validationError; // Re-throw if it's not a ZodError
            }
        }
        catch (error) {
            // Handle different error types
            if (error instanceof maas_ts_1.MaasApiError) {
                // Already a MaasApiError, just log and re-throw
                logger_ts_1.default.error(`MAAS API error fetching devices list: ${error.message}`, {
                    statusCode: error.statusCode,
                    errorCode: error.maasErrorCode
                });
                throw error;
            }
            else if (error.name === 'AbortError') {
                // Request was aborted
                logger_ts_1.default.warn('Devices list request was aborted');
                throw new maas_ts_1.MaasApiError('Devices list request was aborted by the client', 499, 'request_aborted');
            }
            else if (error.cause?.code === 'ECONNREFUSED' || error.cause?.code === 'ENOTFOUND') {
                // Network connectivity issues
                logger_ts_1.default.error(`Network error fetching devices list: ${error.message}`, {
                    code: error.cause?.code,
                    errno: error.cause?.errno
                });
                throw new maas_ts_1.MaasApiError('Failed to connect to MAAS API: Network connectivity issue', 503, 'network_error', { originalError: error.message });
            }
            else if (error.cause?.code === 'ETIMEDOUT') {
                // Timeout issues
                logger_ts_1.default.error(`Timeout error fetching devices list: ${error.message}`);
                throw new maas_ts_1.MaasApiError('MAAS API request timed out while fetching devices list', 504, 'request_timeout', { originalError: error.message });
            }
            else {
                // Generic error handling
                logger_ts_1.default.error(`Unexpected error fetching MAAS devices list: ${error.message}`, {
                    stack: error.stack
                });
                throw new maas_ts_1.MaasApiError(`Could not fetch MAAS devices list: ${error.message}`, 500, 'unexpected_error', { originalError: error.message });
            }
        }
    });
}
