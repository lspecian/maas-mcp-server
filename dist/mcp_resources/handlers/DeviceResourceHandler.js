"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevicesListResourceHandler = exports.DeviceDetailsResourceHandler = void 0;
exports.registerDeviceResources = registerDeviceResources;
/**
 * Device resource handlers for MAAS MCP
 * Implements detail and list resource handlers for MAAS devices
 */
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const BaseResourceHandler_ts_1 = require("../BaseResourceHandler.ts");
const index_ts_1 = require("../schemas/index.ts");
const zod_1 = require("zod");
/**
 * Zod schema defining the structure for an array of MAAS Device objects.
 * Used for validating the response from the MAAS API when listing multiple devices.
 */
const MaasDevicesArraySchema = zod_1.z.array(index_ts_1.MaasDeviceSchema);
/**
 * Zod schema for validating device collection query parameters.
 * Ensures that any query parameters used for listing devices are valid.
 * @see DeviceCollectionQueryParamsSchema
 */
const DevicesListParamsSchema = index_ts_1.DeviceCollectionQueryParamsSchema;
/**
 * Handles requests for individual MAAS device details.
 * Extends `DetailResourceHandler` to provide specific implementation for fetching
 * and validating a single MAAS device based on its system_id.
 */
class DeviceDetailsResourceHandler extends BaseResourceHandler_ts_1.DetailResourceHandler {
    /**
     * Constructs a new `DeviceDetailsResourceHandler`.
     * Initializes the base handler with device-specific schemas, URI patterns, and API endpoint.
     *
     * @param server The `McpServer` instance.
     * @param maasClient The `MaasApiClient` instance for interacting with the MAAS API.
     */
    constructor(server, maasClient) {
        const resourceTemplate = new mcp_js_1.ResourceTemplate(index_ts_1.DEVICE_DETAILS_URI_PATTERN, { list: undefined });
        super(server, maasClient, "Device", resourceTemplate, index_ts_1.DEVICE_DETAILS_URI_PATTERN, index_ts_1.MaasDeviceSchema, index_ts_1.GetDeviceParamsSchema, "/devices");
    }
    /**
     * Gets the resource ID from the validated parameters
     *
     * @param params The validated parameters
     * @returns The system_id parameter
     */
    getResourceIdFromParams(params) {
        return params.system_id;
    }
}
exports.DeviceDetailsResourceHandler = DeviceDetailsResourceHandler;
/**
 * Handles requests for a list of MAAS devices.
 * Extends `ListResourceHandler` to provide specific implementation for fetching,
 * validating, and potentially filtering/paginating a collection of MAAS devices.
 */
class DevicesListResourceHandler extends BaseResourceHandler_ts_1.ListResourceHandler {
    /**
     * Constructs a new `DevicesListResourceHandler`.
     * Initializes the base handler with device list-specific schemas, URI patterns, and API endpoint.
     *
     * @param server The `McpServer` instance.
     * @param maasClient The `MaasApiClient` instance for interacting with the MAAS API.
     */
    constructor(server, maasClient) {
        const resourceTemplate = new mcp_js_1.ResourceTemplate(index_ts_1.DEVICES_LIST_URI_PATTERN, { list: undefined });
        super(server, maasClient, "Devices", resourceTemplate, index_ts_1.DEVICES_LIST_URI_PATTERN, MaasDevicesArraySchema, DevicesListParamsSchema, "/devices");
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
     * Fetches a list of MAAS devices from the API.
     * This method constructs query parameters based on the `params` argument
     * to support filtering (e.g., by hostname, zone), pagination (limit, offset, page, per_page),
     * and sorting (sort, order).
     *
     * @param params The validated query parameters for listing devices.
     * @param signal An `AbortSignal` to allow for cancellation of the request.
     * @returns A promise that resolves to the raw array of device data from the MAAS API.
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
        if (params.hostname)
            queryParams.hostname = params.hostname;
        if (params.mac_address)
            queryParams.mac_address = params.mac_address;
        if (params.zone)
            queryParams.zone = params.zone;
        if (params.owner)
            queryParams.owner = params.owner;
        // Fetch the resource data with query parameters
        const data = await this.maasClient.get(this.apiEndpoint, Object.keys(queryParams).length > 0 ? queryParams : undefined, signal);
        // Check if the response is an array
        if (!Array.isArray(data)) {
            throw new Error(`Invalid response format: Expected an array of ${this.resourceName}`);
        }
        return data;
    }
}
exports.DevicesListResourceHandler = DevicesListResourceHandler;
/**
 * Registers all device resources with the MCP server
 *
 * @param server The MCP server instance
 * @param maasClient The MAAS API client instance
 */
function registerDeviceResources(server, maasClient) {
    // Register device details resource
    const deviceDetailsHandler = new DeviceDetailsResourceHandler(server, maasClient);
    deviceDetailsHandler.register("maas_device_details");
    // Register devices list resource
    const devicesListHandler = new DevicesListResourceHandler(server, maasClient);
    devicesListHandler.register("maas_devices_list");
}
