/**
 * Tag resource handlers for MAAS MCP
 * Implements detail, list, and machines resource handlers for MAAS tags
 */
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MaasApiClient } from "../../maas/MaasApiClient.ts";
import {
  DetailResourceHandler,
  ListResourceHandler,
  BaseResourceHandler
} from "../BaseResourceHandler.ts";
import {
  MaasTag,
  MaasTagSchema,
  GetTagParams,
  GetTagParamsSchema,
  GetTagMachinesParams,
  GetTagMachinesParamsSchema,
  TAG_DETAILS_URI_PATTERN,
  TAGS_LIST_URI_PATTERN,
  TAG_MACHINES_URI_PATTERN,
  TagCollectionQueryParams,
  TagCollectionQueryParamsSchema
} from "../schemas/index.ts";
import { MaasMachine, MaasMachineSchema } from "../schemas/machineDetailsSchema.ts";
import logger from "../../utils/logger.ts";
import { MaasApiError } from "../../types/maas.ts";
import { z } from "zod";

/**
 * Zod schema defining the structure for an array of MAAS Tag objects.
 * Used for validating the response from the MAAS API when listing multiple tags.
 */
const MaasTagsArraySchema = z.array(MaasTagSchema);

/**
 * TypeScript type representing an array of MAAS Tag objects, inferred from
 * the `MaasTagsArraySchema`.
 */
type MaasTagsArray = z.infer<typeof MaasTagsArraySchema>;

/**
 * Zod schema defining the structure for an array of MAAS Machine objects.
 * Used specifically for validating the response when listing machines associated with a tag.
 */
const MaasMachinesArraySchema = z.array(MaasMachineSchema);

/**
 * TypeScript type representing an array of MAAS Machine objects, inferred from
 * the `MaasMachinesArraySchema`. Used for the `TagMachinesResourceHandler`.
 */
type MaasMachinesArray = z.infer<typeof MaasMachinesArraySchema>;

/**
 * TypeScript type alias for tag collection query parameters.
 * Represents the allowed query parameters when listing tags.
 * @see TagCollectionQueryParams
 */
type TagsListParams = TagCollectionQueryParams;

/**
 * Zod schema for validating tag collection query parameters.
 * Ensures that any query parameters used for listing tags are valid.
 * @see TagCollectionQueryParamsSchema
 */
const TagsListParamsSchema = TagCollectionQueryParamsSchema;

/**
 * Handles requests for individual MAAS tag details.
 * Extends `DetailResourceHandler` to provide specific implementation for fetching
 * and validating a single MAAS tag based on its name. Includes additional
 * validation for the tag name format.
 */
export class TagDetailsResourceHandler extends DetailResourceHandler<MaasTag, GetTagParams> {
  /**
   * Constructs a new `TagDetailsResourceHandler`.
   * Initializes the base handler with tag-specific schemas, URI patterns, and API endpoint.
   *
   * @param server The `McpServer` instance.
   * @param maasClient The `MaasApiClient` instance for interacting with the MAAS API.
   */
  constructor(server: McpServer, maasClient: MaasApiClient) {
    const resourceTemplate = new ResourceTemplate(TAG_DETAILS_URI_PATTERN, { list: undefined });
    
    super(
      server,
      maasClient,
      "Tag",
      resourceTemplate,
      TAG_DETAILS_URI_PATTERN,
      MaasTagSchema,
      GetTagParamsSchema,
      "/tags"
    );
  }

  /**
   * Gets the resource ID from the validated parameters
   * 
   * @param params The validated parameters
   * @returns The tag_name parameter
   */
  protected getResourceIdFromParams(params: GetTagParams): string {
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
  protected validateParams(uri: string, params: Record<string, string>): GetTagParams {
    const validatedParams = super.validateParams(uri, params);
    
    // Additional validation for tag_name format
    if (!/^[a-zA-Z0-9_-]+$/.test(validatedParams.tag_name)) {
      logger.error(`Invalid tag name format: ${validatedParams.tag_name}`);
      throw new MaasApiError(
        'Tag name contains invalid characters. Only alphanumeric characters, underscores, and hyphens are allowed.',
        400,
        'invalid_parameter_format'
      );
    }
    
    return validatedParams;
  }
}

/**
 * Handles requests for a list of MAAS tags.
 * Extends `ListResourceHandler` to provide specific implementation for fetching,
 * validating, and potentially filtering/paginating a collection of MAAS tags.
 */
export class TagsListResourceHandler extends ListResourceHandler<MaasTag, TagsListParams> {
  /**
   * Constructs a new `TagsListResourceHandler`.
   * Initializes the base handler with tag list-specific schemas, URI patterns, and API endpoint.
   *
   * @param server The `McpServer` instance.
   * @param maasClient The `MaasApiClient` instance for interacting with the MAAS API.
   */
  constructor(server: McpServer, maasClient: MaasApiClient) {
    const resourceTemplate = new ResourceTemplate(TAGS_LIST_URI_PATTERN, { list: undefined });
    
    super(
      server,
      maasClient,
      "Tags",
      resourceTemplate,
      TAGS_LIST_URI_PATTERN,
      MaasTagsArraySchema,
      TagsListParamsSchema,
      "/tags"
    );
  }

  /**
   * Gets the resource ID from the validated parameters.
   * For list resources like this one, there isn't a single specific resource ID,
   * so this method always returns `undefined`.
   *
   * @param params The validated parameters (not used for list resources).
   * @returns Always `undefined`.
   */
  protected getResourceIdFromParams(params?: TagsListParams): undefined {
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
  protected async fetchResourceData(params: TagsListParams, signal: AbortSignal): Promise<unknown> {
    // Extract and map provided parameters to MAAS API query parameters
    const queryParams: Record<string, string> = {};
    
    // Add pagination parameters
    if (params.limit) queryParams.limit = params.limit.toString();
    if (params.offset) queryParams.offset = params.offset.toString();
    if (params.page) queryParams.page = params.page.toString();
    if (params.per_page) queryParams.per_page = params.per_page.toString();
    
    // Add sorting parameters
    if (params.sort) queryParams.sort = params.sort;
    if (params.order) queryParams.order = params.order;
    
    // Add filtering parameters
    if (params.name) queryParams.name = params.name;
    if (params.definition) queryParams.definition = params.definition;
    if (params.kernel_opts) queryParams.kernel_opts = params.kernel_opts;
    
    // Fetch the resource data with query parameters
    const data = await this.maasClient.get(
      this.apiEndpoint,
      Object.keys(queryParams).length > 0 ? queryParams : undefined,
      signal
    );
    
    // Check if the response is an array
    if (!Array.isArray(data)) {
      throw new Error(`Invalid response format: Expected an array of ${this.resourceName}`);
    }
    
    return data;
  }
}

/**
 * Handles requests for listing MAAS machines associated with a specific tag.
 * This is a custom handler extending `BaseResourceHandler` because it returns a list
 * of `MaasMachine` objects but is identified by a `tag_name` parameter, similar to a detail endpoint.
 * It includes specific validation for the `tag_name` format and custom logic to first verify
 * the tag's existence before fetching associated machines.
 */
export class TagMachinesResourceHandler extends BaseResourceHandler<MaasMachine[], GetTagMachinesParams> {
  /**
   * Constructs a new `TagMachinesResourceHandler`.
   * Initializes the base handler with schemas for an array of machines,
   * URI patterns for tag-specific machine listing, and the base `/machines` API endpoint
   * (as filtering by tag is done via query parameters on the machines endpoint).
   *
   * @param server The `McpServer` instance.
   * @param maasClient The `MaasApiClient` instance for interacting with the MAAS API.
   */
  constructor(server: McpServer, maasClient: MaasApiClient) {
    const resourceTemplate = new ResourceTemplate(TAG_MACHINES_URI_PATTERN, { list: undefined });
    
    super(
      server,
      maasClient,
      "Tag Machines",
      resourceTemplate,
      TAG_MACHINES_URI_PATTERN,
      MaasMachinesArraySchema,
      GetTagMachinesParamsSchema,
      "/machines"
    );
  }

  /**
   * Gets the resource ID from the validated parameters
   * 
   * @param params The validated parameters
   * @returns The tag_name parameter
   */
  protected getResourceIdFromParams(params: GetTagMachinesParams): string {
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
  protected validateParams(uri: string, params: Record<string, string>): GetTagMachinesParams {
    const validatedParams = super.validateParams(uri, params);
    
    // Additional validation for tag_name format
    if (!/^[a-zA-Z0-9_-]+$/.test(validatedParams.tag_name)) {
      logger.error(`Invalid tag name format: ${validatedParams.tag_name}`);
      throw new MaasApiError(
        'Tag name contains invalid characters. Only alphanumeric characters, underscores, and hyphens are allowed.',
        400,
        'invalid_parameter_format'
      );
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
  protected async fetchResourceData(params: GetTagMachinesParams, signal: AbortSignal): Promise<unknown> {
    const { tag_name } = params;
    
    // Step 1: Verify the tag exists.
    // This prevents attempting to list machines for a non-existent tag,
    // providing a clearer error to the user if the tag itself is the issue.
    try {
      await this.maasClient.get(`/tags/${tag_name}/`, undefined, signal);
    } catch (tagError: any) {
      // If the tag doesn't exist, return a specific error
      if (tagError.statusCode === 404) {
        logger.error(`Tag not found: ${tag_name}`);
        throw new MaasApiError(
          `Tag '${tag_name}' not found`,
          404,
          'resource_not_found'
        );
      }
      // For other errors, continue with the machines request
      // as the tag might exist but there was an error fetching its details
      logger.warn(`Error checking tag existence for ${tag_name}: ${tagError.message}. Proceeding with machines request.`);
    }
    
    // Use the MAAS API client to fetch machines with the specified tag
    // The MAAS API allows filtering machines by tag using the 'tags' query parameter
    const machines = await this.maasClient.get('/machines/', { tags: tag_name }, signal);
    
    // Check if the response is valid
    if (!Array.isArray(machines)) {
      logger.error('Invalid response format: Expected an array of machines');
      throw new MaasApiError(
        'Invalid response format: Expected an array of machines',
        500,
        'invalid_response_format'
      );
    }
    
    return machines;
  }
}

/**
 * Registers all tag resources with the MCP server
 * 
 * @param server The MCP server instance
 * @param maasClient The MAAS API client instance
 */
export function registerTagResources(server: McpServer, maasClient: MaasApiClient): void {
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