"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.subnetsListTemplate = exports.subnetDetailsTemplate = void 0;
exports.registerSubnetDetailsResource = registerSubnetDetailsResource;
exports.registerSubnetsListResource = registerSubnetsListResource;
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const subnetResourceSchema_ts_1 = require("./schemas/subnetResourceSchema.ts");
const logger_ts_1 = __importDefault(require("../utils/logger.ts"));
const maas_ts_1 = require("../types/maas.ts");
const zod_1 = require("zod");
/**
 * ResourceTemplate for fetching details of a single MAAS subnet.
 * Defines the URI pattern used to identify specific subnet detail requests.
 * The URI pattern expects a 'subnet_id' parameter (which can be an ID or CIDR).
 * Example URI: maas://subnets/{subnet_id}
 */
exports.subnetDetailsTemplate = new mcp_js_1.ResourceTemplate(subnetResourceSchema_ts_1.SUBNET_DETAILS_URI_PATTERN, { list: undefined } // Indicates this is not a list/collection endpoint
);
/**
 * ResourceTemplate for fetching a list of all MAAS subnets.
 * Defines the URI pattern used to identify requests for the subnets collection.
 * Example URI: maas://subnets
 */
exports.subnetsListTemplate = new mcp_js_1.ResourceTemplate(subnetResourceSchema_ts_1.SUBNETS_LIST_URI_PATTERN, { list: undefined } // Indicates this is a list/collection endpoint
);
/**
 * Registers the subnet details resource with the MCP server.
 * This function sets up a handler that can extract `subnet_id` from the URI
 * and fetch subnet details accordingly, with AbortSignal support.
 *
 * @param server The MCP server instance.
 * @param maasClient The MAAS API client instance.
 */
function registerSubnetDetailsResource(server, maasClient) {
    server.resource("maas_subnet_details", exports.subnetDetailsTemplate, async (uri, params, { signal }) => {
        // Validate subnet_id parameter
        try {
            const validatedParams = subnetResourceSchema_ts_1.GetSubnetParamsSchema.parse(params);
            const { subnet_id } = validatedParams;
            if (!subnet_id || subnet_id.trim() === '') {
                logger_ts_1.default.error('Subnet ID is missing or empty in the resource URI');
                throw new maas_ts_1.MaasApiError('Subnet ID is missing or empty in the resource URI', 400, 'missing_parameter');
            }
            logger_ts_1.default.info(`Fetching details for MAAS subnet: ${subnet_id}`);
            try {
                // Pass signal to MaasApiClient method to fetch the specific subnet
                const subnetDetails = await maasClient.get(`/subnets/${subnet_id}/`, undefined, signal);
                // Check if the response is empty or null
                if (!subnetDetails) {
                    logger_ts_1.default.error(`Subnet not found: ${subnet_id}`);
                    throw new maas_ts_1.MaasApiError(`Subnet '${subnet_id}' not found`, 404, 'resource_not_found');
                }
                // Validate response against schema
                try {
                    const validatedData = subnetResourceSchema_ts_1.MaasSubnetSchema.parse(subnetDetails);
                    logger_ts_1.default.info(`Successfully fetched details for MAAS subnet: ${subnet_id}`);
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
                        logger_ts_1.default.error(`Subnet data validation failed for subnet ${subnet_id}`, {
                            error: validationError.message,
                            issues: validationError.errors
                        });
                        throw new maas_ts_1.MaasApiError(`Subnet data validation failed for '${subnet_id}': The MAAS API returned data in an unexpected format`, 422, 'validation_error', { zodErrors: validationError.errors });
                    }
                    throw validationError; // Re-throw if it's not a ZodError
                }
            }
            catch (error) {
                // Handle different error types
                if (error instanceof maas_ts_1.MaasApiError) {
                    // Already a MaasApiError, just log and re-throw
                    logger_ts_1.default.error(`MAAS API error fetching subnet details for ${subnet_id}: ${error.message}`, {
                        statusCode: error.statusCode,
                        errorCode: error.maasErrorCode
                    });
                    // Special handling for 404 errors
                    if (error.statusCode === 404) {
                        throw new maas_ts_1.MaasApiError(`Subnet '${subnet_id}' not found`, 404, 'resource_not_found');
                    }
                    throw error;
                }
                else if (error.name === 'AbortError') {
                    // Request was aborted
                    logger_ts_1.default.warn(`Subnet details request for ${subnet_id} was aborted`);
                    throw new maas_ts_1.MaasApiError(`Subnet details request for '${subnet_id}' was aborted by the client`, 499, 'request_aborted');
                }
                else if (error.cause?.code === 'ECONNREFUSED' || error.cause?.code === 'ENOTFOUND') {
                    // Network connectivity issues
                    logger_ts_1.default.error(`Network error fetching subnet details for ${subnet_id}: ${error.message}`, {
                        code: error.cause?.code,
                        errno: error.cause?.errno
                    });
                    throw new maas_ts_1.MaasApiError('Failed to connect to MAAS API: Network connectivity issue', 503, 'network_error', { originalError: error.message });
                }
                else if (error.cause?.code === 'ETIMEDOUT') {
                    // Timeout issues
                    logger_ts_1.default.error(`Timeout error fetching subnet details for ${subnet_id}: ${error.message}`);
                    throw new maas_ts_1.MaasApiError(`MAAS API request timed out while fetching subnet details for '${subnet_id}'`, 504, 'request_timeout', { originalError: error.message });
                }
                else {
                    // Generic error handling
                    logger_ts_1.default.error(`Unexpected error fetching details for MAAS subnet ${subnet_id}: ${error.message}`, {
                        stack: error.stack
                    });
                    throw new maas_ts_1.MaasApiError(`Could not fetch details for MAAS subnet '${subnet_id}': ${error.message}`, 500, 'unexpected_error', { originalError: error.message });
                }
            }
        }
        catch (paramError) {
            if (paramError instanceof zod_1.ZodError) {
                logger_ts_1.default.error('Invalid parameters for subnet details request', {
                    error: paramError.message,
                    issues: paramError.errors
                });
                throw new maas_ts_1.MaasApiError('Invalid parameters for subnet details request', 400, 'invalid_parameters', { zodErrors: paramError.errors });
            }
            // If it's already a MaasApiError, just re-throw it
            if (paramError instanceof maas_ts_1.MaasApiError) {
                throw paramError;
            }
            // Otherwise, wrap it
            const errorMessage = paramError instanceof Error ? paramError.message : 'Unknown error';
            logger_ts_1.default.error(`Error processing subnet details request: ${errorMessage}`);
            throw new maas_ts_1.MaasApiError(`Error processing subnet details request: ${errorMessage}`, 500, 'unexpected_error');
        }
    });
}
/**
 * Registers the subnets list resource with the MCP server.
 * This function sets up a handler that fetches all subnets from the MAAS API,
 * with AbortSignal support.
 *
 * @param server The MCP server instance.
 * @param maasClient The MAAS API client instance.
 */
function registerSubnetsListResource(server, maasClient) {
    server.resource("maas_subnets_list", exports.subnetsListTemplate, async (uri, params, { signal }) => {
        logger_ts_1.default.info('Fetching MAAS subnets list');
        try {
            // Pass signal to MaasApiClient method to fetch all subnets
            const subnetsList = await maasClient.get('/subnets/', undefined, signal);
            if (!Array.isArray(subnetsList)) {
                logger_ts_1.default.error('Invalid response format: Expected an array of subnets');
                throw new maas_ts_1.MaasApiError('Invalid response format: Expected an array of subnets', 500, 'invalid_response_format');
            }
            // Validate response against schema
            try {
                const validatedData = subnetsList.map((subnet) => subnetResourceSchema_ts_1.MaasSubnetSchema.parse(subnet));
                logger_ts_1.default.info(`Successfully fetched ${validatedData.length} MAAS subnets`);
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
                    logger_ts_1.default.error('Subnet data validation failed', {
                        error: validationError.message,
                        issues: validationError.errors
                    });
                    throw new maas_ts_1.MaasApiError('Subnet data validation failed: The MAAS API returned data in an unexpected format', 422, 'validation_error', { zodErrors: validationError.errors });
                }
                throw validationError; // Re-throw if it's not a ZodError
            }
        }
        catch (error) {
            // Handle different error types
            if (error instanceof maas_ts_1.MaasApiError) {
                // Already a MaasApiError, just log and re-throw
                logger_ts_1.default.error(`MAAS API error fetching subnets list: ${error.message}`, {
                    statusCode: error.statusCode,
                    errorCode: error.maasErrorCode
                });
                throw error;
            }
            else if (error.name === 'AbortError') {
                // Request was aborted
                logger_ts_1.default.warn('Subnets list request was aborted');
                throw new maas_ts_1.MaasApiError('Subnets list request was aborted by the client', 499, 'request_aborted');
            }
            else if (error.cause?.code === 'ECONNREFUSED' || error.cause?.code === 'ENOTFOUND') {
                // Network connectivity issues
                logger_ts_1.default.error(`Network error fetching subnets list: ${error.message}`, {
                    code: error.cause?.code,
                    errno: error.cause?.errno
                });
                throw new maas_ts_1.MaasApiError('Failed to connect to MAAS API: Network connectivity issue', 503, 'network_error', { originalError: error.message });
            }
            else if (error.cause?.code === 'ETIMEDOUT') {
                // Timeout issues
                logger_ts_1.default.error(`Timeout error fetching subnets list: ${error.message}`);
                throw new maas_ts_1.MaasApiError('MAAS API request timed out while fetching subnets list', 504, 'request_timeout', { originalError: error.message });
            }
            else {
                // Generic error handling
                logger_ts_1.default.error(`Unexpected error fetching MAAS subnets list: ${error.message}`, {
                    stack: error.stack
                });
                throw new maas_ts_1.MaasApiError(`Could not fetch MAAS subnets list: ${error.message}`, 500, 'unexpected_error', { originalError: error.message });
            }
        }
    });
}
