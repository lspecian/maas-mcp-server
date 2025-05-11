import { z } from 'zod';
import { MACHINE_DETAILS_URI_PATTERN, MACHINES_LIST_URI_PATTERN } from './uriPatterns.js';

/**
 * Re-exports URI patterns related to machine resources from './uriPatterns.js'.
 * This is done for convenience and to consolidate machine-related schema definitions.
 */
export { MACHINE_DETAILS_URI_PATTERN, MACHINES_LIST_URI_PATTERN };

/**
 * Schema for MAAS Machine object.
 * Defines the structure and validation rules for machine data returned by the MAAS API.
 */
export const MaasMachineSchema = z.object({
  system_id: z.string().describe("The unique system identifier for the machine."),
  hostname: z.string().describe("The hostname of the machine."),
  domain: z.object({
    id: z.number().describe("ID of the domain."),
    name: z.string().describe("Name of the domain."),
  }).describe("The domain this machine belongs to."),
  architecture: z.string().describe("The architecture of the machine (e.g., 'amd64/generic')."),
  status: z.number().describe("Numeric status code of the machine."),
  status_name: z.string().describe("Human-readable status of the machine (e.g., 'Deployed', 'Ready')."),
  owner: z.string().nullable().describe("The user who owns the machine, if any."),
  owner_data: z.record(z.any()).nullable().describe("Arbitrary data associated with the owner."),
  ip_addresses: z.array(z.string()).nullable().describe("A list of IP addresses assigned to the machine."),
  cpu_count: z.number().describe("The number of CPU cores on the machine."),
  memory: z.number().describe("The total memory of the machine in MB."),
  zone: z.object({
    id: z.number().describe("ID of the zone."),
    name: z.string().describe("Name of the zone."),
  }).describe("The availability zone the machine is in."),
  pool: z.object({
    id: z.number().describe("ID of the resource pool."),
    name: z.string().describe("Name of the resource pool."),
  }).describe("The resource pool the machine belongs to."),
  tags: z.array(z.string()).describe("A list of tags associated with the machine."),
  // Add more fields as needed based on MAAS API documentation
}).passthrough().describe("MAAS Machine object with hardware and status information");

/**
 * Schema for validating input parameters to get machine details.
 * This schema defines the parameters required to fetch a specific machine.
 */
export const GetMachineParamsSchema = z.object({
  system_id: z.string()
    .describe("The system ID of the machine to retrieve details for."),
}).describe("Parameters for retrieving a specific machine's details");

// Export the types for use in other files
export type MaasMachine = z.infer<typeof MaasMachineSchema>;
export type GetMachineParams = z.infer<typeof GetMachineParamsSchema>;