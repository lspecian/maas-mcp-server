import { z } from 'zod';
import { DEVICE_DETAILS_URI_PATTERN, DEVICES_LIST_URI_PATTERN } from './uriPatterns.ts';

/**
 * Re-exports URI patterns related to device resources from './uriPatterns.ts'.
 * This is done for convenience and to consolidate device-related schema definitions.
 */
export { DEVICE_DETAILS_URI_PATTERN, DEVICES_LIST_URI_PATTERN };

/**
 * Schema for MAAS Device object.
 * Defines the structure and validation rules for device data returned by the MAAS API.
 */
export const MaasDeviceSchema = z.object({
  system_id: z.string().describe("The unique system identifier for the device"),
  hostname: z.string().describe("The hostname of the device"),
  domain: z.object({
    id: z.number(),
    name: z.string(),
  }).describe("The domain this device belongs to"),
  fqdn: z.string().describe("The fully qualified domain name for the device"),
  owner: z.string().nullable().describe("The owner of the device"),
  owner_data: z.record(z.any()).nullable().describe("Owner-specific data for the device"),
  ip_addresses: z.array(z.string()).nullable().describe("IP addresses associated with the device"),
  interface_set: z.array(z.object({
    id: z.number(),
    name: z.string(),
    mac_address: z.string(),
    // Add more interface fields as needed
  })).optional().describe("Network interfaces attached to the device"),
  zone: z.object({
    id: z.number(),
    name: z.string(),
  }).describe("The zone this device is in"),
  tags: z.array(z.string()).describe("Tags associated with this device"),
  // Add more fields as needed based on MAAS API documentation
}).passthrough().describe("MAAS Device object with network and identification information");

/**
 * Schema for validating input parameters to get device details.
 * This schema defines the parameters required to fetch a specific device.
 */
export const GetDeviceParamsSchema = z.object({
  system_id: z.string()
    .describe("The system ID of the device to retrieve details for"),
}).describe("Parameters for retrieving a specific device's details");

// Export the types for use in other files
export type MaasDevice = z.infer<typeof MaasDeviceSchema>;
export type GetDeviceParams = z.infer<typeof GetDeviceParamsSchema>;