/**
 * Machine resource handlers for MAAS MCP
 * Implements detail and list resource handlers for MAAS machines
 */
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MaasApiClient } from "../../maas/MaasApiClient.js";
import {
  DetailResourceHandler,
  ListResourceHandler
} from "../BaseResourceHandler.js";
import {
  MaasMachine,
  MaasMachineSchema,
  GetMachineParams,
  GetMachineParamsSchema,
  MACHINE_DETAILS_URI_PATTERN,
  MACHINES_LIST_URI_PATTERN,
  MachineCollectionQueryParams,
  MachineCollectionQueryParamsSchema
} from "../schemas/index.js";
import { z } from "zod";

/**
 * Zod schema defining the structure for an array of MAAS Machine objects.
 * Used for validating the response from the MAAS API when listing multiple machines.
 */
const MaasMachinesArraySchema = z.array(MaasMachineSchema);

/**
 * TypeScript type representing an array of MAAS Machine objects, inferred from
 * the `MaasMachinesArraySchema`.
 */
type MaasMachinesArray = z.infer<typeof MaasMachinesArraySchema>;

/**
 * TypeScript type alias for machine collection query parameters.
 * Represents the allowed query parameters when listing machines.
 * @see MachineCollectionQueryParams
 */
type MachinesListParams = MachineCollectionQueryParams;

/**
 * Zod schema for validating machine collection query parameters.
 * Ensures that any query parameters used for listing machines are valid.
 * @see MachineCollectionQueryParamsSchema
 */
const MachinesListParamsSchema = MachineCollectionQueryParamsSchema;

/**
 * Handles requests for individual MAAS machine details.
 * Extends `DetailResourceHandler` to provide specific implementation for fetching
 * and validating a single MAAS machine based on its system_id.
 * Configures a shorter cache TTL for machine details due to their likelihood of frequent changes.
 */
export class MachineDetailsResourceHandler extends DetailResourceHandler<MaasMachine, GetMachineParams> {
  /**
   * Constructs a new `MachineDetailsResourceHandler`.
   * Initializes the base handler with machine-specific schemas, URI patterns, API endpoint,
   * and custom cache options (shorter TTL of 60 seconds with `must-revalidate`).
   *
   * @param server The `McpServer` instance.
   * @param maasClient The `MaasApiClient` instance for interacting with the MAAS API.
   */
  constructor(server: McpServer, maasClient: MaasApiClient) {
    const resourceTemplate = new ResourceTemplate(MACHINE_DETAILS_URI_PATTERN, { list: undefined });
    
    super(
      server,
      maasClient,
      "Machine", // Resource name for logging and cache keys
      resourceTemplate,
      MACHINE_DETAILS_URI_PATTERN,
      MaasMachineSchema, // Zod schema for validating individual machine data
      GetMachineParamsSchema, // Zod schema for validating URI parameters
      "/machines", // Base MAAS API endpoint for machines
      {
        ttl: 60, // Cache TTL: 1 minute, as machine details can change
        cacheControl: { // HTTP Cache-Control headers
          maxAge: 60,
          mustRevalidate: true, // Client must revalidate with origin server
        }
      }
    );
  }

  /**
   * Gets the resource ID from the validated parameters
   * 
   * @param params The validated parameters
   * @returns The system_id parameter
   */
  protected getResourceIdFromParams(params: GetMachineParams): string {
    return params.system_id;
  }
}

/**
 * Handles requests for a list of MAAS machines.
 * Extends `ListResourceHandler` to provide specific implementation for fetching,
 * validating, and filtering/paginating a collection of MAAS machines.
 * Configures a shorter cache TTL and includes specific query parameters in the cache key
 * to handle frequently changing and filterable machine lists.
 */
export class MachinesListResourceHandler extends ListResourceHandler<MaasMachine, MachinesListParams> {
  /**
   * Constructs a new `MachinesListResourceHandler`.
   * Initializes the base handler with machine list-specific schemas, URI patterns, API endpoint,
   * and custom cache options (shorter TTL of 30 seconds, includes specific query params in cache key).
   *
   * @param server The `McpServer` instance.
   * @param maasClient The `MaasApiClient` instance for interacting with the MAAS API.
   */
  constructor(server: McpServer, maasClient: MaasApiClient) {
    const resourceTemplate = new ResourceTemplate(MACHINES_LIST_URI_PATTERN, { list: undefined });
    
    super(
      server,
      maasClient,
      "Machines", // Resource name for logging and cache keys
      resourceTemplate,
      MACHINES_LIST_URI_PATTERN,
      MaasMachinesArraySchema, // Zod schema for validating an array of machines
      MachinesListParamsSchema, // Zod schema for validating list query parameters
      "/machines", // Base MAAS API endpoint for machines
      {
        ttl: 30, // Cache TTL: 30 seconds, as machine lists can change frequently
        includeQueryParams: true, // Important for caching different filtered/paginated views
        includeQueryParamsList: [ // Specific query params to include in the cache key
          'hostname', 'status', 'zone', 'pool', 'tags', 'owner', 'architecture',
          'limit', 'offset', 'page', 'per_page', 'sort', 'order' // Include pagination/sorting
        ],
        cacheControl: { // HTTP Cache-Control headers
          maxAge: 30,
          mustRevalidate: true, // Client must revalidate with origin server
        }
      }
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
  protected getResourceIdFromParams(params?: MachinesListParams): undefined {
    return undefined;
  }
  
  /**
   * Fetches a list of MAAS machines from the API.
   * This method constructs query parameters based on the `params` argument
   * to support filtering, pagination, and sorting.
   * It includes a basic cache invalidation check: if common filter parameters are present,
   * it invalidates the entire cache for "Machines" to ensure fresh data when filters change.
   * Note: This is a simple invalidation strategy; more sophisticated strategies might be needed
   * depending on specific requirements (e.g., invalidating only specific filtered views).
   *
   * @param params The validated query parameters for listing machines.
   * @param signal An `AbortSignal` to allow for cancellation of the request.
   * @returns A promise that resolves to the raw array of machine data from the MAAS API.
   */
  protected async fetchResourceData(params: MachinesListParams, signal: AbortSignal): Promise<unknown> {
    // Basic cache invalidation: if any of the common filter parameters are used,
    // we assume the user is looking for a potentially different set of data,
    // so we invalidate the cache for the "Machines" resource type.
    // This helps ensure that subsequent requests for filtered lists get fresh data.
    // More granular invalidation (e.g., by specific filter combinations) could be implemented
    // if needed, but would add complexity to cache key generation and invalidation logic.
    const filterKeys: Array<keyof MachinesListParams> = ['hostname', 'status', 'zone', 'pool', 'tags', 'owner', 'architecture'];
    if (filterKeys.some(key => params[key] !== undefined)) {
      this.invalidateCache(); // Invalidates all entries starting with "Machines:"
    }
    
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
    if (params.hostname) queryParams.hostname = params.hostname;
    if (params.status) queryParams.status = params.status;
    if (params.zone) queryParams.zone = params.zone;
    if (params.pool) queryParams.pool = params.pool;
    if (params.tags) queryParams.tags = params.tags;
    if (params.owner) queryParams.owner = params.owner;
    if (params.architecture) queryParams.architecture = params.architecture;
    
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
 * Registers all machine resources with the MCP server
 * 
 * @param server The MCP server instance
 * @param maasClient The MAAS API client instance
 */
export function registerMachineResources(server: McpServer, maasClient: MaasApiClient): void {
  // Register machine details resource
  const machineDetailsHandler = new MachineDetailsResourceHandler(server, maasClient);
  machineDetailsHandler.register("maas_machine_details");
  
  // Register machines list resource
  const machinesListHandler = new MachinesListResourceHandler(server, maasClient);
  machinesListHandler.register("maas_machines_list");
  
  // Log cache configuration
  logger.info('Registered machine resources with caching:', {
    machineDetailsCacheEnabled: machineDetailsHandler.getCacheOptions().enabled,
    machineDetailsCacheTTL: machineDetailsHandler.getCacheOptions().ttl,
    machinesListCacheEnabled: machinesListHandler.getCacheOptions().enabled,
    machinesListCacheTTL: machinesListHandler.getCacheOptions().ttl
  });
}