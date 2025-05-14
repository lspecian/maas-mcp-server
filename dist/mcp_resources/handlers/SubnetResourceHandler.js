"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubnetsListResourceHandler = exports.SubnetDetailsResourceHandler = void 0;
exports.registerSubnetResources = registerSubnetResources;
/**
 * Subnet resource handlers for MAAS MCP
 * Implements detail and list resource handlers for MAAS subnets
 */
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const BaseResourceHandler_ts_1 = require("../BaseResourceHandler.ts");
const index_ts_1 = require("../schemas/index.ts");
const zod_1 = require("zod");
/**
 * Zod schema defining the structure for an array of MAAS Subnet objects.
 * Used for validating the response from the MAAS API when listing multiple subnets.
 */
const MaasSubnetsArraySchema = zod_1.z.array(index_ts_1.MaasSubnetSchema);
/**
 * Zod schema for validating subnet collection query parameters.
 * Ensures that any query parameters used for listing subnets are valid.
 * @see SubnetCollectionQueryParamsSchema
 */
const SubnetsListParamsSchema = index_ts_1.SubnetCollectionQueryParamsSchema;
/**
 * Handles requests for individual MAAS subnet details.
 * Extends `DetailResourceHandler` to provide specific implementation for fetching
 * and validating a single MAAS subnet based on its ID (which can be an integer ID or CIDR string).
 */
class SubnetDetailsResourceHandler extends BaseResourceHandler_ts_1.DetailResourceHandler {
    /**
     * Constructs a new `SubnetDetailsResourceHandler`.
     * Initializes the base handler with subnet-specific schemas, URI patterns, and API endpoint.
     *
     * @param server The `McpServer` instance.
     * @param maasClient The `MaasApiClient` instance for interacting with the MAAS API.
     */
    constructor(server, maasClient) {
        const resourceTemplate = new mcp_js_1.ResourceTemplate(index_ts_1.SUBNET_DETAILS_URI_PATTERN, { list: undefined });
        super(server, maasClient, "Subnet", resourceTemplate, index_ts_1.SUBNET_DETAILS_URI_PATTERN, index_ts_1.MaasSubnetSchema, index_ts_1.GetSubnetParamsSchema, "/subnets");
    }
    /**
     * Gets the resource ID from the validated parameters
     *
     * @param params The validated parameters
     * @returns The subnet_id parameter
     */
    getResourceIdFromParams(params) {
        return params.subnet_id;
    }
}
exports.SubnetDetailsResourceHandler = SubnetDetailsResourceHandler;
/**
 * Handles requests for a list of MAAS subnets.
 * Extends `ListResourceHandler` to provide specific implementation for fetching,
 * validating, and potentially filtering/paginating a collection of MAAS subnets.
 */
class SubnetsListResourceHandler extends BaseResourceHandler_ts_1.ListResourceHandler {
    /**
     * Constructs a new `SubnetsListResourceHandler`.
     * Initializes the base handler with subnet list-specific schemas, URI patterns, and API endpoint.
     *
     * @param server The `McpServer` instance.
     * @param maasClient The `MaasApiClient` instance for interacting with the MAAS API.
     */
    constructor(server, maasClient) {
        const resourceTemplate = new mcp_js_1.ResourceTemplate(index_ts_1.SUBNETS_LIST_URI_PATTERN, { list: undefined });
        super(server, maasClient, "Subnets", resourceTemplate, index_ts_1.SUBNETS_LIST_URI_PATTERN, MaasSubnetsArraySchema, SubnetsListParamsSchema, "/subnets");
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
     * Fetches a list of MAAS subnets from the API.
     * This method constructs query parameters based on the `params` argument
     * to support filtering (e.g., by CIDR, name, VLAN, space), pagination, and sorting.
     *
     * @param params The validated query parameters for listing subnets.
     * @param signal An `AbortSignal` to allow for cancellation of the request.
     * @returns A promise that resolves to the raw array of subnet data from the MAAS API.
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
        if (params.cidr)
            queryParams.cidr = params.cidr;
        if (params.name)
            queryParams.name = params.name;
        if (params.vlan)
            queryParams.vlan = params.vlan;
        if (params.space)
            queryParams.space = params.space;
        // Fetch the resource data with query parameters
        const data = await this.maasClient.get(this.apiEndpoint, Object.keys(queryParams).length > 0 ? queryParams : undefined, signal);
        // Check if the response is an array
        if (!Array.isArray(data)) {
            throw new Error(`Invalid response format: Expected an array of ${this.resourceName}`);
        }
        return data;
    }
}
exports.SubnetsListResourceHandler = SubnetsListResourceHandler;
/**
 * Registers all subnet resources with the MCP server
 *
 * @param server The MCP server instance
 * @param maasClient The MAAS API client instance
 */
function registerSubnetResources(server, maasClient) {
    // Register subnet details resource
    const subnetDetailsHandler = new SubnetDetailsResourceHandler(server, maasClient);
    subnetDetailsHandler.register("maas_subnet_details");
    // Register subnets list resource
    const subnetsListHandler = new SubnetsListResourceHandler(server, maasClient);
    subnetsListHandler.register("maas_subnets_list");
}
