"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DomainsListResourceHandler = exports.DomainDetailsResourceHandler = void 0;
exports.registerDomainResources = registerDomainResources;
/**
 * Domain resource handlers for MAAS MCP
 * Implements detail and list resource handlers for MAAS domains
 */
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const BaseResourceHandler_ts_1 = require("../BaseResourceHandler.ts");
const index_ts_1 = require("../schemas/index.ts");
const zod_1 = require("zod");
/**
 * Zod schema defining the structure for an array of MAAS Domain objects.
 * Used for validating the response from the MAAS API when listing multiple domains.
 */
const MaasDomainsArraySchema = zod_1.z.array(index_ts_1.MaasDomainSchema);
/**
 * Zod schema for validating domain collection query parameters.
 * Ensures that any query parameters used for listing domains are valid.
 * @see DomainCollectionQueryParamsSchema
 */
const DomainsListParamsSchema = index_ts_1.DomainCollectionQueryParamsSchema;
/**
 * Handles requests for individual MAAS domain details.
 * Extends `DetailResourceHandler` to provide specific implementation for fetching
 * and validating a single MAAS domain based on its ID or name.
 */
class DomainDetailsResourceHandler extends BaseResourceHandler_ts_1.DetailResourceHandler {
    /**
     * Constructs a new `DomainDetailsResourceHandler`.
     * Initializes the base handler with domain-specific schemas, URI patterns, and API endpoint.
     *
     * @param server The `McpServer` instance.
     * @param maasClient The `MaasApiClient` instance for interacting with the MAAS API.
     */
    constructor(server, maasClient) {
        const resourceTemplate = new mcp_js_1.ResourceTemplate(index_ts_1.DOMAIN_DETAILS_URI_PATTERN, { list: undefined });
        super(server, maasClient, "Domain", resourceTemplate, index_ts_1.DOMAIN_DETAILS_URI_PATTERN, index_ts_1.MaasDomainSchema, index_ts_1.GetDomainParamsSchema, "/domains");
    }
    /**
     * Gets the resource ID from the validated parameters
     *
     * @param params The validated parameters
     * @returns The domain_id parameter
     */
    getResourceIdFromParams(params) {
        return params.domain_id;
    }
}
exports.DomainDetailsResourceHandler = DomainDetailsResourceHandler;
/**
 * Handles requests for a list of MAAS domains.
 * Extends `ListResourceHandler` to provide specific implementation for fetching,
 * validating, and potentially filtering/paginating a collection of MAAS domains.
 */
class DomainsListResourceHandler extends BaseResourceHandler_ts_1.ListResourceHandler {
    /**
     * Constructs a new `DomainsListResourceHandler`.
     * Initializes the base handler with domain list-specific schemas, URI patterns, and API endpoint.
     *
     * @param server The `McpServer` instance.
     * @param maasClient The `MaasApiClient` instance for interacting with the MAAS API.
     */
    constructor(server, maasClient) {
        const resourceTemplate = new mcp_js_1.ResourceTemplate(index_ts_1.DOMAINS_LIST_URI_PATTERN, { list: undefined });
        super(server, maasClient, "Domains", resourceTemplate, index_ts_1.DOMAINS_LIST_URI_PATTERN, MaasDomainsArraySchema, DomainsListParamsSchema, "/domains");
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
     * Fetches a list of MAAS domains from the API.
     * This method constructs query parameters based on the `params` argument
     * to support filtering (e.g., by name, authoritative status), pagination, and sorting.
     *
     * @param params The validated query parameters for listing domains.
     * @param signal An `AbortSignal` to allow for cancellation of the request.
     * @returns A promise that resolves to the raw array of domain data from the MAAS API.
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
        if (params.authoritative)
            queryParams.authoritative = params.authoritative;
        // Fetch the resource data with query parameters
        const data = await this.maasClient.get(this.apiEndpoint, Object.keys(queryParams).length > 0 ? queryParams : undefined, signal);
        // Check if the response is an array
        if (!Array.isArray(data)) {
            throw new Error(`Invalid response format: Expected an array of ${this.resourceName}`);
        }
        return data;
    }
}
exports.DomainsListResourceHandler = DomainsListResourceHandler;
/**
 * Registers all domain resources with the MCP server
 *
 * @param server The MCP server instance
 * @param maasClient The MAAS API client instance
 */
function registerDomainResources(server, maasClient) {
    // Register domain details resource
    const domainDetailsHandler = new DomainDetailsResourceHandler(server, maasClient);
    domainDetailsHandler.register("maas_domain_details");
    // Register domains list resource
    const domainsListHandler = new DomainsListResourceHandler(server, maasClient);
    domainsListHandler.register("maas_domains_list");
}
