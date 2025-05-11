import { z } from 'zod';
import { metaSchema } from './common.js';

/**
 * Schema for validating input parameters to the create tag tool.
 * This schema defines the parameters that can be used to create a new tag in MAAS.
 */
export const createTagSchema = z.object({
  name: z.string()
    .describe("The name of the tag to create."),
  
  comment: z.string().optional()
    .describe("Optional comment to describe the purpose of the tag."),
  
  definition: z.string().optional()
    .describe("Optional tag definition expression to automatically tag matching nodes."),
  
  kernel_opts: z.string().optional()
    .describe("Optional kernel options to be used when booting a machine with this tag."),
    
  _meta: metaSchema,
}).describe("Creates a new tag in MAAS with optional comment and definition.");

// Export the type for use in other files
export type CreateTagParams = z.infer<typeof createTagSchema>;