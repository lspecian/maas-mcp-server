import { z } from 'zod';
import { metaSchema } from './common.js';

/**
 * Schema for validating input parameters to the list machines tool.
 * This schema defines the parameters that can be used to filter the list of machines.
 */
export const listMachinesSchema = z.object({
  hostname: z.string().optional()
    .describe("Filter machines by hostname (supports globbing)."),
  
  mac_addresses: z.array(z.string()).optional()
    .describe("Filter machines by a list of MAC addresses."),
  
  tag_names: z.array(z.string()).optional()
    .describe("Filter machines by a list of tag names."),
  
  status: z.string().optional()
    .describe("Filter machines by their status (e.g., 'ready', 'deployed', 'commissioning')."),
  
  zone: z.string().optional()
    .describe("Filter machines by zone name."),
  
  pool: z.string().optional()
    .describe("Filter machines by resource pool name."),
  
  owner: z.string().optional()
    .describe("Filter machines by owner username."),
  
  architecture: z.string().optional()
    .describe("Filter machines by architecture (e.g., 'amd64/generic')."),
  
  limit: z.number().positive().optional()
    .describe("Limit the number of machines returned."),
  
  offset: z.number().nonnegative().optional()
    .describe("Skip the first N machines in the result set."),
    
  _meta: metaSchema,
}).describe("Lists machines registered in MAAS, with optional filters.");

// Export the type for use in other files
export type ListMachinesParams = z.infer<typeof listMachinesSchema>;