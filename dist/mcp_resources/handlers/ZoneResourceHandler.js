"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZonesListResourceHandler = exports.ZoneDetailsResourceHandler = void 0;
exports.registerZoneResources = registerZoneResources;
/**
 * Zone resource handlers for MAAS MCP
 * Implements detail and list resource handlers for MAAS zones
 */
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const BaseResourceHandler_ts_1 = require("../BaseResourceHandler.ts");
const index_ts_1 = require("../schemas/index.ts");
const zod_1 = require("zod");
/**
 * Zod schema defining the structure for an array of MAAS Zone objects.
 * Used for validating the response from the MAAS API when listing multiple zones.
 */
const MaasZonesArraySchema = zod_1.z.array(index_ts_1.MaasZoneSchema);
/**
 * Zod schema for validating zone collection query parameters.
 * Ensures that any query parameters used for listing zones are valid.
 * @see ZoneCollectionQueryParamsSchema
 */
const ZonesListParamsSchema = index_ts_1.ZoneCollectionQueryParamsSchema;
/**
 * Handles requests for individual MAAS zone details.
 * Extends `DetailResourceHandler` to provide specific implementation for fetching
 * and validating a single MAAS zone based on its ID (which can be an integer ID or name string).
 */
class ZoneDetailsResourceHandler extends BaseResourceHandler_ts_1.DetailResourceHandler {
    /**
     * Constructs a new `ZoneDetailsResourceHandler`.
     * Initializes the base handler with zone-specific schemas, URI patterns, and API endpoint.
     *
     * @param server The `McpServer` instance.
     * @param maasClient The `MaasApiClient` instance for interacting with the MAAS API.
     */
    constructor(server, maasClient) {
        const resourceTemplate = new mcp_js_1.ResourceTemplate(index_ts_1.ZONE_DETAILS_URI_PATTERN, { list: undefined });
        super(server, maasClient, "Zone", resourceTemplate, index_ts_1.ZONE_DETAILS_URI_PATTERN, index_ts_1.MaasZoneSchema, index_ts_1.GetZoneParamsSchema, "/zones");
    }
    /**
     * Gets the resource ID from the validated parameters
     *
     * @param params The validated parameters
     * @returns The zone_id parameter
     */
    getResourceIdFromParams(params) {
        return params.zone_id;
    }
}
exports.ZoneDetailsResourceHandler = ZoneDetailsResourceHandler;
/**
 * Handles requests for a list of MAAS zones.
 * Extends `ListResourceHandler` to provide specific implementation for fetching,
 * validating, and potentially filtering/paginating a collection of MAAS zones.
 */
class ZonesListResourceHandler extends BaseResourceHandler_ts_1.ListResourceHandler {
    /**
     * Constructs a new `ZonesListResourceHandler`.
     * Initializes the base handler with zone list-specific schemas, URI patterns, and API endpoint.
     *
     * @param server The `McpServer` instance.
     * @param maasClient The `MaasApiClient` instance for interacting with the MAAS API.
     */
    constructor(server, maasClient) {
        const resourceTemplate = new mcp_js_1.ResourceTemplate(index_ts_1.ZONES_LIST_URI_PATTERN, { list: undefined });
        super(server, maasClient, "Zones", resourceTemplate, index_ts_1.ZONES_LIST_URI_PATTERN, MaasZonesArraySchema, ZonesListParamsSchema, "/zones");
    }
    /**
     * Gets the resource ID from the validated parameters.
     * For list resources like this one, there isn't a single specific resource ID,
     * so this method always returns `undefined`.
     *
     * @param params The validated parameters (not used for list resources).
     * @returns Always `undefined`.
     */
    getResourceIdFromParams(params) {
        return undefined;
    }
    /**
     * Fetches a list of MAAS zones from the API.
     * This method constructs query parameters based on the `params` argument
     * to support filtering (e.g., by name), pagination, and sorting.
     *
     * @param params The validated query parameters for listing zones.
     * @param signal An `AbortSignal` to allow for cancellation of the request.
     * @returns A promise that resolves to the raw array of zone data from the MAAS API.
     */
    async fetchResourceData(params, signal) {
        // Extract and map provided parameters to MAAS API query parameters
        const queryParams = {};
        // Add pagination parameters
        if (params.limit)
            queryParams.limit = params.limit.toString();
        if (params.offset)
            queryParams.offset = params.offset.toString();
        if (params.page)
            queryParams.page = params.page.toString();
        if (params.per_page)
            queryParams.per_page = params.per_page.toString();
        // Add sorting parameters
        if (params.sort)
            queryParams.sort = params.sort;
        if (params.order)
            queryParams.order = params.order;
        // Add filtering parameters
        if (params.name)
            queryParams.name = params.name;
        // Fetch the resource data with query parameters
        const data = await this.maasClient.get(this.apiEndpoint, Object.keys(queryParams).length > 0 ? queryParams : undefined, signal);
        // Check if the response is an array
        if (!Array.isArray(data)) {
            throw new Error(`Invalid response format: Expected an array of ${this.resourceName}`);
        }
        return data;
    }
}
exports.ZonesListResourceHandler = ZonesListResourceHandler;
/**
 * Registers all zone resources with the MCP server
 *
 * @param server The MCP server instance
 * @param maasClient The MAAS API client instance
 */
function registerZoneResources(server, maasClient) {
    // Register zone details resource
    const zoneDetailsHandler = new ZoneDetailsResourceHandler(server, maasClient);
    zoneDetailsHandler.register("maas_zone_details");
    // Register zones list resource
    const zonesListHandler = new ZonesListResourceHandler(server, maasClient);
    zonesListHandler.register("maas_zones_list");
}
