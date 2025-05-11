import { z } from 'zod';
import { metaSchema } from './common.js';

/**
 * Schema for validating input parameters to the list subnets tool.
 * This schema defines the parameters that can be used to filter the list of subnets.
 */
export const listSubnetsSchema = z.object({
  cidr: z.string().optional()
    .describe("Filter subnets by CIDR notation."),
  
  name: z.string().optional()
    .describe("Filter subnets by name."),
  
  vlan: z.number().optional()
    .describe("Filter subnets by VLAN ID."),
  
  fabric: z.string().optional()
    .describe("Filter subnets by fabric name."),
  
  space: z.string().optional()
    .describe("Filter subnets by space name."),
  
  id: z.number().optional()
    .describe("Filter subnets by ID."),
  
  limit: z.number().positive().optional()
    .describe("Limit the number of subnets returned."),
  
  offset: z.number().nonnegative().optional()
    .describe("Skip the first N subnets in the result set."),
    
  _meta: metaSchema,
}).describe("Lists subnets registered in MAAS, with optional filters.");

// Export the type for use in other files
export type ListSubnetsParams = z.infer<typeof listSubnetsSchema>;