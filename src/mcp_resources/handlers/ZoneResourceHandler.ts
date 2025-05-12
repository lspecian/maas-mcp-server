/**
 * Zone resource handlers for MAAS MCP
 * Implements detail and list resource handlers for MAAS zones
 */
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MaasApiClient } from "../../maas/MaasApiClient.ts";
import {
  DetailResourceHandler,
  ListResourceHandler
} from "../BaseResourceHandler.ts";
import {
  MaasZone,
  MaasZoneSchema,
  GetZoneParams,
  GetZoneParamsSchema,
  ZONE_DETAILS_URI_PATTERN,
  ZONES_LIST_URI_PATTERN,
  ZoneCollectionQueryParams,
  ZoneCollectionQueryParamsSchema
} from "../schemas/index.ts";
import { z } from "zod";

/**
 * Zod schema defining the structure for an array of MAAS Zone objects.
 * Used for validating the response from the MAAS API when listing multiple zones.
 */
const MaasZonesArraySchema = z.array(MaasZoneSchema);

/**
 * TypeScript type representing an array of MAAS Zone objects, inferred from
 * the `MaasZonesArraySchema`.
 */
type MaasZonesArray = z.infer<typeof MaasZonesArraySchema>;

/**
 * TypeScript type alias for zone collection query parameters.
 * Represents the allowed query parameters when listing zones.
 * @see ZoneCollectionQueryParams
 */
type ZonesListParams = ZoneCollectionQueryParams;

/**
 * Zod schema for validating zone collection query parameters.
 * Ensures that any query parameters used for listing zones are valid.
 * @see ZoneCollectionQueryParamsSchema
 */
const ZonesListParamsSchema = ZoneCollectionQueryParamsSchema;

/**
 * Handles requests for individual MAAS zone details.
 * Extends `DetailResourceHandler` to provide specific implementation for fetching
 * and validating a single MAAS zone based on its ID (which can be an integer ID or name string).
 */
export class ZoneDetailsResourceHandler extends DetailResourceHandler<MaasZone, GetZoneParams> {
  /**
   * Constructs a new `ZoneDetailsResourceHandler`.
   * Initializes the base handler with zone-specific schemas, URI patterns, and API endpoint.
   *
   * @param server The `McpServer` instance.
   * @param maasClient The `MaasApiClient` instance for interacting with the MAAS API.
   */
  constructor(server: McpServer, maasClient: MaasApiClient) {
    const resourceTemplate = new ResourceTemplate(ZONE_DETAILS_URI_PATTERN, { list: undefined });
    
    super(
      server,
      maasClient,
      "Zone",
      resourceTemplate,
      ZONE_DETAILS_URI_PATTERN,
      MaasZoneSchema,
      GetZoneParamsSchema,
      "/zones"
    );
  }

  /**
   * Gets the resource ID from the validated parameters
   * 
   * @param params The validated parameters
   * @returns The zone_id parameter
   */
  protected getResourceIdFromParams(params: GetZoneParams): string {
    return params.zone_id;
  }
}

/**
 * Handles requests for a list of MAAS zones.
 * Extends `ListResourceHandler` to provide specific implementation for fetching,
 * validating, and potentially filtering/paginating a collection of MAAS zones.
 */
export class ZonesListResourceHandler extends ListResourceHandler<MaasZone, ZonesListParams> {
  /**
   * Constructs a new `ZonesListResourceHandler`.
   * Initializes the base handler with zone list-specific schemas, URI patterns, and API endpoint.
   *
   * @param server The `McpServer` instance.
   * @param maasClient The `MaasApiClient` instance for interacting with the MAAS API.
   */
  constructor(server: McpServer, maasClient: MaasApiClient) {
    const resourceTemplate = new ResourceTemplate(ZONES_LIST_URI_PATTERN, { list: undefined });
    
    super(
      server,
      maasClient,
      "Zones",
      resourceTemplate,
      ZONES_LIST_URI_PATTERN,
      MaasZonesArraySchema,
      ZonesListParamsSchema,
      "/zones"
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
  protected getResourceIdFromParams(params?: ZonesListParams): undefined {
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
  protected async fetchResourceData(params: ZonesListParams, signal: AbortSignal): Promise<unknown> {
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
 * Registers all zone resources with the MCP server
 * 
 * @param server The MCP server instance
 * @param maasClient The MAAS API client instance
 */
export function registerZoneResources(server: McpServer, maasClient: MaasApiClient): void {
  // Register zone details resource
  const zoneDetailsHandler = new ZoneDetailsResourceHandler(server, maasClient);
  zoneDetailsHandler.register("maas_zone_details");
  
  // Register zones list resource
  const zonesListHandler = new ZonesListResourceHandler(server, maasClient);
  zonesListHandler.register("maas_zones_list");
}