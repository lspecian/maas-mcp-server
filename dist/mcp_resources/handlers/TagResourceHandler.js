"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TagMachinesResourceHandler = exports.TagsListResourceHandler = exports.TagDetailsResourceHandler = void 0;
exports.registerTagResources = registerTagResources;
/**
 * Tag resource handlers for MAAS MCP
 * Implements detail, list, and machines resource handlers for MAAS tags
 */
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const BaseResourceHandler_ts_1 = require("../BaseResourceHandler.ts");
const index_ts_1 = require("../schemas/index.ts");
const machineDetailsSchema_ts_1 = require("../schemas/machineDetailsSchema.ts");
const logger_ts_1 = __importDefault(require("../../utils/logger.ts"));
const maas_ts_1 = require("../../types/maas.ts");
const zod_1 = require("zod");
/**
 * Zod schema defining the structure for an array of MAAS Tag objects.
 * Used for validating the response from the MAAS API when listing multiple tags.
 */
const MaasTagsArraySchema = zod_1.z.array(index_ts_1.MaasTagSchema);
/**
 * Zod schema defining the structure for an array of MAAS Machine objects.
 * Used specifically for validating the response when listing machines associated with a tag.
 */
const MaasMachinesArraySchema = zod_1.z.array(machineDetailsSchema_ts_1.MaasMachineSchema);
/**
 * Zod schema for validating tag collection query parameters.
 * Ensures that any query parameters used for listing tags are valid.
 * @see TagCollectionQueryParamsSchema
 */
const TagsListParamsSchema = index_ts_1.TagCollectionQueryParamsSchema;
/**
 * Handles requests for individual MAAS tag details.
 * Extends `DetailResourceHandler` to provide specific implementation for fetching
 * and validating a single MAAS tag based on its name. Includes additional
 * validation for the tag name format.
 */
class TagDetailsResourceHandler extends BaseResourceHandler_ts_1.DetailResourceHandler {
    /**
     * Constructs a new `TagDetailsResourceHandler`.
     * Initializes the base handler with tag-specific schemas, URI patterns, and API endpoint.
     *
     * @param server The `McpServer` instance.
     * @param maasClient The `MaasApiClient` instance for interacting with the MAAS API.
     */
    constructor(server, maasClient) {
        const resourceTemplate = new mcp_js_1.ResourceTemplate(index_ts_1.TAG_DETAILS_URI_PATTERN, { list: undefined });
        super(server, maasClient, "Tag", resourceTemplate, index_ts_1.TAG_DETAILS_URI_PATTERN, index_ts_1.MaasTagSchema, index_ts_1.GetTagParamsSchema, "/tags");
    }
    /**
     * Gets the resource ID from the validated parameters
     *
     * @param params The validated parameters
     * @returns The tag_name parameter
     */
    getResourceIdFromParams(params) {
        return params.tag_name;
    }
    /**
     * Validates parameters extracted from a URI for a tag details request.
     * Extends the base validation to include a specific check for the `tag_name` format,
     * ensuring it only contains alphanumeric characters, underscores, and hyphens.
     *
     * @param uri The URI string from which parameters were extracted.
     * @param params A record of string parameters extracted from the URI.
     * @returns The validated parameters, conforming to `GetTagParams`.
     * @throws `MaasApiError` if `tag_name` has an invalid format.
     */
    validateParams(uri, params) {
        const validatedParams = super.validateParams(uri, params);
        // Additional validation for tag_name format
        if (!/^[a-zA-Z0-9_-]+$/.test(validatedParams.tag_name)) {
            logger_ts_1.default.error(`Invalid tag name format: ${validatedParams.tag_name}`);
            throw new maas_ts_1.MaasApiError('Tag name contains invalid characters. Only alphanumeric characters, underscores, and hyphens are allowed.', 400, 'invalid_parameter_format');
        }
        return validatedParams;
    }
}
exports.TagDetailsResourceHandler = TagDetailsResourceHandler;
/**
 * Handles requests for a list of MAAS tags.
 * Extends `ListResourceHandler` to provide specific implementation for fetching,
 * validating, and potentially filtering/paginating a collection of MAAS tags.
 */
class TagsListResourceHandler extends BaseResourceHandler_ts_1.ListResourceHandler {
    /**
     * Constructs a new `TagsListResourceHandler`.
     * Initializes the base handler with tag list-specific schemas, URI patterns, and API endpoint.
     *
     * @param server The `McpServer` instance.
     * @param maasClient The `MaasApiClient` instance for interacting with the MAAS API.
     */
    constructor(server, maasClient) {
        const resourceTemplate = new mcp_js_1.ResourceTemplate(index_ts_1.TAGS_LIST_URI_PATTERN, { list: undefined });
        super(server, maasClient, "Tags", resourceTemplate, index_ts_1.TAGS_LIST_URI_PATTERN, MaasTagsArraySchema, TagsListParamsSchema, "/tags");
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
     * Fetches a list of MAAS tags from the API.
     * This method constructs query parameters based on the `params` argument
     * to support filtering (e.g., by name, definition, kernel_opts), pagination, and sorting.
     *
     * @param params The validated query parameters for listing tags.
     * @param signal An `AbortSignal` to allow for cancellation of the request.
     * @returns A promise that resolves to the raw array of tag data from the MAAS API.
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
        if (params.definition)
            queryParams.definition = params.definition;
        if (params.kernel_opts)
            queryParams.kernel_opts = params.kernel_opts;
        // Fetch the resource data with query parameters
        const data = await this.maasClient.get(this.apiEndpoint, Object.keys(queryParams).length > 0 ? queryParams : undefined, signal);
        // Check if the response is an array
        if (!Array.isArray(data)) {
            throw new Error(`Invalid response format: Expected an array of ${this.resourceName}`);
        }
        return data;
    }
}
exports.TagsListResourceHandler = TagsListResourceHandler;
/**
 * Handles requests for listing MAAS machines associated with a specific tag.
 * This is a custom handler extending `BaseResourceHandler` because it returns a list
 * of `MaasMachine` objects but is identified by a `tag_name` parameter, similar to a detail endpoint.
 * It includes specific validation for the `tag_name` format and custom logic to first verify
 * the tag's existence before fetching associated machines.
 */
class TagMachinesResourceHandler extends BaseResourceHandler_ts_1.BaseResourceHandler {
    /**
     * Constructs a new `TagMachinesResourceHandler`.
     * Initializes the base handler with schemas for an array of machines,
     * URI patterns for tag-specific machine listing, and the base `/machines` API endpoint
     * (as filtering by tag is done via query parameters on the machines endpoint).
     *
     * @param server The `McpServer` instance.
     * @param maasClient The `MaasApiClient` instance for interacting with the MAAS API.
     */
    constructor(server, maasClient) {
        const resourceTemplate = new mcp_js_1.ResourceTemplate(index_ts_1.TAG_MACHINES_URI_PATTERN, { list: undefined });
        super(server, maasClient, "Tag Machines", resourceTemplate, index_ts_1.TAG_MACHINES_URI_PATTERN, MaasMachinesArraySchema, index_ts_1.GetTagMachinesParamsSchema, "/machines");
    }
    /**
     * Gets the resource ID from the validated parameters
     *
     * @param params The validated parameters
     * @returns The tag_name parameter
     */
    getResourceIdFromParams(params) {
        return params.tag_name;
    }
    /**
     * Validates parameters extracted from a URI for a tag-machines request.
     * Extends the base validation to include a specific check for the `tag_name` format,
     * ensuring it only contains alphanumeric characters, underscores, and hyphens.
     *
     * @param uri The URI string from which parameters were extracted.
     * @param params A record of string parameters extracted from the URI.
     * @returns The validated parameters, conforming to `GetTagMachinesParams`.
     * @throws `MaasApiError` if `tag_name` has an invalid format.
     */
    validateParams(uri, params) {
        const validatedParams = super.validateParams(uri, params);
        // Additional validation for tag_name format
        if (!/^[a-zA-Z0-9_-]+$/.test(validatedParams.tag_name)) {
            logger_ts_1.default.error(`Invalid tag name format: ${validatedParams.tag_name}`);
            throw new maas_ts_1.MaasApiError('Tag name contains invalid characters. Only alphanumeric characters, underscores, and hyphens are allowed.', 400, 'invalid_parameter_format');
        }
        return validatedParams;
    }
    /**
     * Fetches a list of MAAS machines associated with a specific tag.
     * This custom implementation first attempts to verify the existence of the specified tag.
     * If the tag is not found, a 404 error is thrown. Otherwise, it proceeds to fetch
     * machines from the `/machines` endpoint, filtering by the provided `tag_name`
     * using a query parameter.
     *
     * @param params The validated parameters, containing the `tag_name`.
     * @param signal An `AbortSignal` to allow for cancellation of the request.
     * @returns A promise that resolves to the raw array of machine data from the MAAS API.
     * @throws `MaasApiError` if the tag is not found or if there's an issue fetching machines.
     */
    async fetchResourceData(params, signal) {
        const { tag_name } = params;
        // Step 1: Verify the tag exists.
        // This prevents attempting to list machines for a non-existent tag,
        // providing a clearer error to the user if the tag itself is the issue.
        try {
            await this.maasClient.get(`/tags/${tag_name}/`, undefined, signal);
        }
        catch (tagError) {
            // If the tag doesn't exist, return a specific error
            if (tagError.statusCode === 404) {
                logger_ts_1.default.error(`Tag not found: ${tag_name}`);
                throw new maas_ts_1.MaasApiError(`Tag '${tag_name}' not found`, 404, 'resource_not_found');
            }
            // For other errors, continue with the machines request
            // as the tag might exist but there was an error fetching its details
            logger_ts_1.default.warn(`Error checking tag existence for ${tag_name}: ${tagError.message}. Proceeding with machines request.`);
        }
        // Use the MAAS API client to fetch machines with the specified tag
        // The MAAS API allows filtering machines by tag using the 'tags' query parameter
        const machines = await this.maasClient.get('/machines/', { tags: tag_name }, signal);
        // Check if the response is valid
        if (!Array.isArray(machines)) {
            logger_ts_1.default.error('Invalid response format: Expected an array of machines');
            throw new maas_ts_1.MaasApiError('Invalid response format: Expected an array of machines', 500, 'invalid_response_format');
        }
        return machines;
    }
}
exports.TagMachinesResourceHandler = TagMachinesResourceHandler;
/**
 * Registers all tag resources with the MCP server
 *
 * @param server The MCP server instance
 * @param maasClient The MAAS API client instance
 */
function registerTagResources(server, maasClient) {
    // Register tag details resource
    const tagDetailsHandler = new TagDetailsResourceHandler(server, maasClient);
    tagDetailsHandler.register("maas_tag_details");
    // Register tags list resource
    const tagsListHandler = new TagsListResourceHandler(server, maasClient);
    tagsListHandler.register("maas_tags_list");
    // Register tag machines resource
    const tagMachinesHandler = new TagMachinesResourceHandler(server, maasClient);
    tagMachinesHandler.register("maas_tag_machines");
}
