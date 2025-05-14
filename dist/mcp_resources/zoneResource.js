"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.zonesListTemplate = exports.zoneDetailsTemplate = void 0;
exports.registerZoneDetailsResource = registerZoneDetailsResource;
exports.registerZonesListResource = registerZonesListResource;
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const zoneResourceSchema_ts_1 = require("./schemas/zoneResourceSchema.ts");
const logger_ts_1 = __importDefault(require("../utils/logger.ts"));
const maas_ts_1 = require("../types/maas.ts");
const zod_1 = require("zod");
/**
 * ResourceTemplate for fetching details of a single MAAS zone.
 * Defines the URI pattern used to identify specific zone detail requests.
 * The URI pattern expects a 'zone_id' parameter (which can be an ID or name).
 * Example URI: maas://zones/{zone_id}
 */
exports.zoneDetailsTemplate = new mcp_js_1.ResourceTemplate(zoneResourceSchema_ts_1.ZONE_DETAILS_URI_PATTERN, { list: undefined } // Indicates this is not a list/collection endpoint
);
/**
 * ResourceTemplate for fetching a list of all MAAS zones.
 * Defines the URI pattern used to identify requests for the zones collection.
 * Example URI: maas://zones
 */
exports.zonesListTemplate = new mcp_js_1.ResourceTemplate(zoneResourceSchema_ts_1.ZONES_LIST_URI_PATTERN, { list: undefined } // Indicates this is a list/collection endpoint
);
/**
 * Registers the zone details resource with the MCP server.
 * This function sets up a handler that can extract `zone_id` from the URI
 * and fetch zone details accordingly, with AbortSignal support.
 *
 * @param server The MCP server instance.
 * @param maasClient The MAAS API client instance.
 */
function registerZoneDetailsResource(server, maasClient) {
    server.resource("maas_zone_details", exports.zoneDetailsTemplate, async (uri, params, { signal }) => {
        // Validate zone_id parameter
        try {
            const validatedParams = zoneResourceSchema_ts_1.GetZoneParamsSchema.parse(params);
            const { zone_id } = validatedParams;
            if (!zone_id || zone_id.trim() === '') {
                logger_ts_1.default.error('Zone ID is missing or empty in the resource URI');
                throw new maas_ts_1.MaasApiError('Zone ID is missing or empty in the resource URI', 400, 'missing_parameter');
            }
            logger_ts_1.default.info(`Fetching details for MAAS zone: ${zone_id}`);
            try {
                // Pass signal to MaasApiClient method to fetch the specific zone
                const zoneDetails = await maasClient.get(`/zones/${zone_id}/`, undefined, signal);
                // Check if the response is empty or null
                if (!zoneDetails) {
                    logger_ts_1.default.error(`Zone not found: ${zone_id}`);
                    throw new maas_ts_1.MaasApiError(`Zone '${zone_id}' not found`, 404, 'resource_not_found');
                }
                // Validate response against schema
                try {
                    const validatedData = zoneResourceSchema_ts_1.MaasZoneSchema.parse(zoneDetails);
                    logger_ts_1.default.info(`Successfully fetched details for MAAS zone: ${zone_id}`);
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
                        logger_ts_1.default.error(`Zone data validation failed for zone ${zone_id}`, {
                            error: validationError.message,
                            issues: validationError.errors
                        });
                        throw new maas_ts_1.MaasApiError(`Zone data validation failed for '${zone_id}': The MAAS API returned data in an unexpected format`, 422, 'validation_error', { zodErrors: validationError.errors });
                    }
                    throw validationError; // Re-throw if it's not a ZodError
                }
            }
            catch (error) {
                // Handle different error types
                if (error instanceof maas_ts_1.MaasApiError) {
                    // Already a MaasApiError, just log and re-throw
                    logger_ts_1.default.error(`MAAS API error fetching zone details for ${zone_id}: ${error.message}`, {
                        statusCode: error.statusCode,
                        errorCode: error.maasErrorCode
                    });
                    // Special handling for 404 errors
                    if (error.statusCode === 404) {
                        throw new maas_ts_1.MaasApiError(`Zone '${zone_id}' not found`, 404, 'resource_not_found');
                    }
                    throw error;
                }
                else if (error.name === 'AbortError') {
                    // Request was aborted
                    logger_ts_1.default.warn(`Zone details request for ${zone_id} was aborted`);
                    throw new maas_ts_1.MaasApiError(`Zone details request for '${zone_id}' was aborted by the client`, 499, 'request_aborted');
                }
                else if (error.cause?.code === 'ECONNREFUSED' || error.cause?.code === 'ENOTFOUND') {
                    // Network connectivity issues
                    logger_ts_1.default.error(`Network error fetching zone details for ${zone_id}: ${error.message}`, {
                        code: error.cause?.code,
                        errno: error.cause?.errno
                    });
                    throw new maas_ts_1.MaasApiError('Failed to connect to MAAS API: Network connectivity issue', 503, 'network_error', { originalError: error.message });
                }
                else if (error.cause?.code === 'ETIMEDOUT') {
                    // Timeout issues
                    logger_ts_1.default.error(`Timeout error fetching zone details for ${zone_id}: ${error.message}`);
                    throw new maas_ts_1.MaasApiError(`MAAS API request timed out while fetching zone details for '${zone_id}'`, 504, 'request_timeout', { originalError: error.message });
                }
                else {
                    // Generic error handling
                    logger_ts_1.default.error(`Unexpected error fetching details for MAAS zone ${zone_id}: ${error.message}`, {
                        stack: error.stack
                    });
                    throw new maas_ts_1.MaasApiError(`Could not fetch details for MAAS zone '${zone_id}': ${error.message}`, 500, 'unexpected_error', { originalError: error.message });
                }
            }
        }
        catch (paramError) {
            if (paramError instanceof zod_1.ZodError) {
                logger_ts_1.default.error('Invalid parameters for zone details request', {
                    error: paramError.message,
                    issues: paramError.errors
                });
                throw new maas_ts_1.MaasApiError('Invalid parameters for zone details request', 400, 'invalid_parameters', { zodErrors: paramError.errors });
            }
            // If it's already a MaasApiError, just re-throw it
            if (paramError instanceof maas_ts_1.MaasApiError) {
                throw paramError;
            }
            // Otherwise, wrap it
            const errorMessage = paramError instanceof Error ? paramError.message : 'Unknown error';
            logger_ts_1.default.error(`Error processing zone details request: ${errorMessage}`);
            throw new maas_ts_1.MaasApiError(`Error processing zone details request: ${errorMessage}`, 500, 'unexpected_error');
        }
    });
}
/**
 * Registers the zones list resource with the MCP server.
 * This function sets up a handler that fetches all zones from the MAAS API,
 * with AbortSignal support.
 *
 * @param server The MCP server instance.
 * @param maasClient The MAAS API client instance.
 */
function registerZonesListResource(server, maasClient) {
    server.resource("maas_zones_list", exports.zonesListTemplate, async (uri, params, { signal }) => {
        logger_ts_1.default.info('Fetching MAAS zones list');
        try {
            // Pass signal to MaasApiClient method to fetch all zones
            const zonesList = await maasClient.get('/zones/', undefined, signal);
            if (!Array.isArray(zonesList)) {
                logger_ts_1.default.error('Invalid response format: Expected an array of zones');
                throw new maas_ts_1.MaasApiError('Invalid response format: Expected an array of zones', 500, 'invalid_response_format');
            }
            // Validate response against schema
            try {
                const validatedData = zonesList.map((zone) => zoneResourceSchema_ts_1.MaasZoneSchema.parse(zone));
                logger_ts_1.default.info(`Successfully fetched ${validatedData.length} MAAS zones`);
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
                    logger_ts_1.default.error('Zone data validation failed', {
                        error: validationError.message,
                        issues: validationError.errors
                    });
                    throw new maas_ts_1.MaasApiError('Zone data validation failed: The MAAS API returned data in an unexpected format', 422, 'validation_error', { zodErrors: validationError.errors });
                }
                throw validationError; // Re-throw if it's not a ZodError
            }
        }
        catch (error) {
            // Handle different error types
            if (error instanceof maas_ts_1.MaasApiError) {
                // Already a MaasApiError, just log and re-throw
                logger_ts_1.default.error(`MAAS API error fetching zones list: ${error.message}`, {
                    statusCode: error.statusCode,
                    errorCode: error.maasErrorCode
                });
                throw error;
            }
            else if (error.name === 'AbortError') {
                // Request was aborted
                logger_ts_1.default.warn('Zones list request was aborted');
                throw new maas_ts_1.MaasApiError('Zones list request was aborted by the client', 499, 'request_aborted');
            }
            else if (error.cause?.code === 'ECONNREFUSED' || error.cause?.code === 'ENOTFOUND') {
                // Network connectivity issues
                logger_ts_1.default.error(`Network error fetching zones list: ${error.message}`, {
                    code: error.cause?.code,
                    errno: error.cause?.errno
                });
                throw new maas_ts_1.MaasApiError('Failed to connect to MAAS API: Network connectivity issue', 503, 'network_error', { originalError: error.message });
            }
            else if (error.cause?.code === 'ETIMEDOUT') {
                // Timeout issues
                logger_ts_1.default.error(`Timeout error fetching zones list: ${error.message}`);
                throw new maas_ts_1.MaasApiError('MAAS API request timed out while fetching zones list', 504, 'request_timeout', { originalError: error.message });
            }
            else {
                // Generic error handling
                logger_ts_1.default.error(`Unexpected error fetching MAAS zones list: ${error.message}`, {
                    stack: error.stack
                });
                throw new maas_ts_1.MaasApiError(`Could not fetch MAAS zones list: ${error.message}`, 500, 'unexpected_error', { originalError: error.message });
            }
        }
    });
}
