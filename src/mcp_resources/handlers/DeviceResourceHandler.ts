/**
 * Device resource handlers for MAAS MCP
 * Implements detail and list resource handlers for MAAS devices
 */
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MaasApiClient } from "../../maas/MaasApiClient.ts";
import {
  DetailResourceHandler,
  ListResourceHandler
} from "../BaseResourceHandler.ts";
import {
  MaasDevice,
  MaasDeviceSchema,
  GetDeviceParams,
  GetDeviceParamsSchema,
  DEVICE_DETAILS_URI_PATTERN,
  DEVICES_LIST_URI_PATTERN,
  DeviceCollectionQueryParams,
  DeviceCollectionQueryParamsSchema
} from "../schemas/index.ts";
import { z } from "zod";

/**
 * Zod schema defining the structure for an array of MAAS Device objects.
 * Used for validating the response from the MAAS API when listing multiple devices.
 */
const MaasDevicesArraySchema = z.array(MaasDeviceSchema);

/**
 * TypeScript type representing an array of MAAS Device objects, inferred from
 * the `MaasDevicesArraySchema`.
 */
type MaasDevicesArray = z.infer<typeof MaasDevicesArraySchema>;

/**
 * TypeScript type alias for device collection query parameters.
 * Represents the allowed query parameters when listing devices.
 * @see DeviceCollectionQueryParams
 */
type DevicesListParams = DeviceCollectionQueryParams;

/**
 * Zod schema for validating device collection query parameters.
 * Ensures that any query parameters used for listing devices are valid.
 * @see DeviceCollectionQueryParamsSchema
 */
const DevicesListParamsSchema = DeviceCollectionQueryParamsSchema;

/**
 * Handles requests for individual MAAS device details.
 * Extends `DetailResourceHandler` to provide specific implementation for fetching
 * and validating a single MAAS device based on its system_id.
 */
export class DeviceDetailsResourceHandler extends DetailResourceHandler<MaasDevice, GetDeviceParams> {
  /**
   * Constructs a new `DeviceDetailsResourceHandler`.
   * Initializes the base handler with device-specific schemas, URI patterns, and API endpoint.
   *
   * @param server The `McpServer` instance.
   * @param maasClient The `MaasApiClient` instance for interacting with the MAAS API.
   */
  constructor(server: McpServer, maasClient: MaasApiClient) {
    const resourceTemplate = new ResourceTemplate(DEVICE_DETAILS_URI_PATTERN, { list: undefined });
    
    super(
      server,
      maasClient,
      "Device",
      resourceTemplate,
      DEVICE_DETAILS_URI_PATTERN,
      MaasDeviceSchema,
      GetDeviceParamsSchema,
      "/devices"
    );
  }

  /**
   * Gets the resource ID from the validated parameters
   * 
   * @param params The validated parameters
   * @returns The system_id parameter
   */
  protected getResourceIdFromParams(params: GetDeviceParams): string {
    return params.system_id;
  }
}

/**
 * Handles requests for a list of MAAS devices.
 * Extends `ListResourceHandler` to provide specific implementation for fetching,
 * validating, and potentially filtering/paginating a collection of MAAS devices.
 */
export class DevicesListResourceHandler extends ListResourceHandler<MaasDevice, DevicesListParams> {
  /**
   * Constructs a new `DevicesListResourceHandler`.
   * Initializes the base handler with device list-specific schemas, URI patterns, and API endpoint.
   *
   * @param server The `McpServer` instance.
   * @param maasClient The `MaasApiClient` instance for interacting with the MAAS API.
   */
  constructor(server: McpServer, maasClient: MaasApiClient) {
    const resourceTemplate = new ResourceTemplate(DEVICES_LIST_URI_PATTERN, { list: undefined });
    
    super(
      server,
      maasClient,
      "Devices",
      resourceTemplate,
      DEVICES_LIST_URI_PATTERN,
      MaasDevicesArraySchema,
      DevicesListParamsSchema,
      "/devices"
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
  protected getResourceIdFromParams(params?: DevicesListParams): undefined {
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
  protected async fetchResourceData(params: DevicesListParams, signal: AbortSignal): Promise<unknown> {
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
    if (params.mac_address) queryParams.mac_address = params.mac_address;
    if (params.zone) queryParams.zone = params.zone;
    if (params.owner) queryParams.owner = params.owner;
    
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
 * Registers all device resources with the MCP server
 * 
 * @param server The MCP server instance
 * @param maasClient The MAAS API client instance
 */
export function registerDeviceResources(server: McpServer, maasClient: MaasApiClient): void {
  // Register device details resource
  const deviceDetailsHandler = new DeviceDetailsResourceHandler(server, maasClient);
  deviceDetailsHandler.register("maas_device_details");
  
  // Register devices list resource
  const devicesListHandler = new DevicesListResourceHandler(server, maasClient);
  devicesListHandler.register("maas_devices_list");
}