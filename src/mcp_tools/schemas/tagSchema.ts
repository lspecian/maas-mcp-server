import { z } from 'zod';
import { metaSchema } from './common.js';

/**
 * Schema for MAAS Tag object.
 * Defines the structure and validation rules for tag data returned by the MAAS API.
 */
export const MaasTagSchema = z.object({
  id: z.number(),
  name: z.string(),
  definition: z.string().nullable(),
  comment: z.string().nullable(),
  kernel_opts: z.string().nullable(),
  _meta: metaSchema,
}).describe("MAAS Tag object with identification and configuration information");

// Export the type for use in other files
export type MaasTag = z.infer<typeof MaasTagSchema>;