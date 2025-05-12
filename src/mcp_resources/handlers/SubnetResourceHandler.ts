/**
 * Subnet resource handlers for MAAS MCP
 * Implements detail and list resource handlers for MAAS subnets
 */
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MaasApiClient } from "../../maas/MaasApiClient.ts";
import {
  DetailResourceHandler,
  ListResourceHandler
} from "../BaseResourceHandler.ts";
import {
  MaasSubnet,
  MaasSubnetSchema,
  GetSubnetParams,
  GetSubnetParamsSchema,
  SUBNET_DETAILS_URI_PATTERN,
  SUBNETS_LIST_URI_PATTERN,
  SubnetCollectionQueryParams,
  SubnetCollectionQueryParamsSchema
} from "../schemas/index.ts";
import { z } from "zod";

/**
 * Zod schema defining the structure for an array of MAAS Subnet objects.
 * Used for validating the response from the MAAS API when listing multiple subnets.
 */
const MaasSubnetsArraySchema = z.array(MaasSubnetSchema);

/**
 * TypeScript type representing an array of MAAS Subnet objects, inferred from
 * the `MaasSubnetsArraySchema`.
 */
type MaasSubnetsArray = z.infer<typeof MaasSubnetsArraySchema>;

/**
 * TypeScript type alias for subnet collection query parameters.
 * Represents the allowed query parameters when listing subnets.
 * @see SubnetCollectionQueryParams
 */
type SubnetsListParams = SubnetCollectionQueryParams;

/**
 * Zod schema for validating subnet collection query parameters.
 * Ensures that any query parameters used for listing subnets are valid.
 * @see SubnetCollectionQueryParamsSchema
 */
const SubnetsListParamsSchema = SubnetCollectionQueryParamsSchema;

/**
 * Handles requests for individual MAAS subnet details.
 * Extends `DetailResourceHandler` to provide specific implementation for fetching
 * and validating a single MAAS subnet based on its ID (which can be an integer ID or CIDR string).
 */
export class SubnetDetailsResourceHandler extends DetailResourceHandler<MaasSubnet, GetSubnetParams> {
  /**
   * Constructs a new `SubnetDetailsResourceHandler`.
   * Initializes the base handler with subnet-specific schemas, URI patterns, and API endpoint.
   *
   * @param server The `McpServer` instance.
   * @param maasClient The `MaasApiClient` instance for interacting with the MAAS API.
   */
  constructor(server: McpServer, maasClient: MaasApiClient) {
    const resourceTemplate = new ResourceTemplate(SUBNET_DETAILS_URI_PATTERN, { list: undefined });
    
    super(
      server,
      maasClient,
      "Subnet",
      resourceTemplate,
      SUBNET_DETAILS_URI_PATTERN,
      MaasSubnetSchema,
      GetSubnetParamsSchema,
      "/subnets"
    );
  }

  /**
   * Gets the resource ID from the validated parameters
   * 
   * @param params The validated parameters
   * @returns The subnet_id parameter
   */
  protected getResourceIdFromParams(params: GetSubnetParams): string {
    return params.subnet_id;
  }
}

/**
 * Handles requests for a list of MAAS subnets.
 * Extends `ListResourceHandler` to provide specific implementation for fetching,
 * validating, and potentially filtering/paginating a collection of MAAS subnets.
 */
export class SubnetsListResourceHandler extends ListResourceHandler<MaasSubnet, SubnetsListParams> {
  /**
   * Constructs a new `SubnetsListResourceHandler`.
   * Initializes the base handler with subnet list-specific schemas, URI patterns, and API endpoint.
   *
   * @param server The `McpServer` instance.
   * @param maasClient The `MaasApiClient` instance for interacting with the MAAS API.
   */
  constructor(server: McpServer, maasClient: MaasApiClient) {
    const resourceTemplate = new ResourceTemplate(SUBNETS_LIST_URI_PATTERN, { list: undefined });
    
    super(
      server,
      maasClient,
      "Subnets",
      resourceTemplate,
      SUBNETS_LIST_URI_PATTERN,
      MaasSubnetsArraySchema,
      SubnetsListParamsSchema,
      "/subnets"
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
  protected getResourceIdFromParams(params?: SubnetsListParams): undefined {
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
  protected async fetchResourceData(params: SubnetsListParams, signal: AbortSignal): Promise<unknown> {
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
    if (params.cidr) queryParams.cidr = params.cidr;
    if (params.name) queryParams.name = params.name;
    if (params.vlan) queryParams.vlan = params.vlan;
    if (params.space) queryParams.space = params.space;
    
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
 * Registers all subnet resources with the MCP server
 * 
 * @param server The MCP server instance
 * @param maasClient The MAAS API client instance
 */
export function registerSubnetResources(server: McpServer, maasClient: MaasApiClient): void {
  // Register subnet details resource
  const subnetDetailsHandler = new SubnetDetailsResourceHandler(server, maasClient);
  subnetDetailsHandler.register("maas_subnet_details");
  
  // Register subnets list resource
  const subnetsListHandler = new SubnetsListResourceHandler(server, maasClient);
  subnetsListHandler.register("maas_subnets_list");
}