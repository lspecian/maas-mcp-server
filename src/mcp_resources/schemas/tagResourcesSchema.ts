import { z } from 'zod';
import {
  TAGS_LIST_URI_PATTERN,
  TAG_DETAILS_URI_PATTERN,
  TAG_MACHINES_URI_PATTERN
} from './uriPatterns.js';

/**
 * Re-exports URI patterns related to tag resources from './uriPatterns.js'.
 * This is done for convenience and to consolidate tag-related schema definitions.
 */
export {
  TAGS_LIST_URI_PATTERN,
  TAG_DETAILS_URI_PATTERN,
  TAG_MACHINES_URI_PATTERN
};

/**
 * Schema for MAAS Tag object.
 * Defines the structure and validation rules for tag data returned by the MAAS API.
 */
export const MaasTagSchema = z.object({
  name: z.string().describe("The name of the tag"),
  definition: z.string().optional().describe("The XPATH definition of the tag, if any"),
  comment: z.string().optional().describe("A free-form comment about the tag"),
  kernel_opts: z.string().optional().describe("Kernel options for systems with this tag"),
  machine_count: z.number().describe("Number of machines with this tag"),
  // Add more fields as needed based on MAAS API documentation
}).passthrough().describe("MAAS Tag object with name and associated metadata");

/**
 * Schema for validating input parameters to get tag details.
 * This schema defines the parameters required to fetch a specific tag.
 */
export const GetTagParamsSchema = z.object({
  tag_name: z.string()
    .describe("The name of the tag to retrieve details for"),
}).describe("Parameters for retrieving a specific tag's details");

/**
 * Schema for validating input parameters to get machines with a specific tag.
 * This schema defines the parameters required to fetch machines with a tag.
 */
export const GetTagMachinesParamsSchema = z.object({
  tag_name: z.string()
    .describe("The name of the tag to retrieve machines for"),
}).describe("Parameters for retrieving machines with a specific tag");

// Export the types for use in other files
export type MaasTag = z.infer<typeof MaasTagSchema>;
export type GetTagParams = z.infer<typeof GetTagParamsSchema>;
export type GetTagMachinesParams = z.infer<typeof GetTagMachinesParamsSchema>;