import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MaasApiClient } from "../maas/MaasApiClient.js";
import { z } from "zod";
import { tagNameSchema, metaSchema } from "./schemas/common.js";
import { createRequestLogger } from "../utils/logger.js";
import { createProgressSender } from "../utils/progressNotification.js";

/**
 * Schema for creating a tag in MAAS
 * Defines the parameters required to create a new tag
 */
const createTagSchema = z.object({
  /** The name of the tag to create */
  name: tagNameSchema,
  /** Optional comment describing the purpose of the tag */
  comment: z.string().optional().describe("Optional comment for the tag."),
  /** Optional kernel options to apply to machines with this tag during boot */
  kernel_opts: z.string().optional().describe("Optional kernel options for nodes with this tag."),
  /** Optional XPath expression for automatic tag application based on hardware characteristics */
  definition: z.string().optional().describe("Definition for automatic tag application."),
  /** Metadata including optional progress token for notifications */
  _meta: metaSchema,
}).describe("Parameters for creating a new tag in MAAS");

/**
 * Schema for updating tag node associations
 * Defines the parameters required to add or remove machines from a tag
 */
const updateTagNodesSchema = z.object({
  /** The name of the tag to update */
  tag_name: tagNameSchema,
  /** Array of system IDs to add this tag to */
  add: z.array(z.string()).optional().describe("System IDs of machines to add this tag to."),
  /** Array of system IDs to remove this tag from */
  remove: z.array(z.string()).optional().describe("System IDs of machines to remove this tag from."),
  /** Metadata including optional progress token for notifications */
  _meta: metaSchema,
}).describe("Parameters for updating which machines have a specific tag");

/**
 * Schema for deleting a tag from MAAS
 * Defines the parameters required to delete a tag
 */
const deleteTagSchema = z.object({
  /** The name of the tag to delete */
  tag_name: tagNameSchema,
  /** Metadata including optional progress token for notifications */
  _meta: metaSchema,
}).describe("Parameters for deleting a tag from MAAS");
/**
 * Registers tag management tools with the MCP server
 *
 * This function registers three tools for tag management:
 * 1. maas_create_tag - Creates a new tag in MAAS
 * 2. maas_update_tag_nodes - Updates which machines have a specific tag
 * 3. maas_delete_tag - Deletes a tag from MAAS
 *
 * All tools support progress notifications through the _meta.progressToken parameter
 * and can be aborted using the AbortSignal.
 *
 * @param server - The MCP server instance to register the tools with
 * @param maasClient - The MAAS API client instance for making API calls
 */
export function registerTagManagementTools(server: McpServer, maasClient: MaasApiClient) {
  /**
   * Create Tag Tool
   *
   * Registers a tool that creates a new tag in MAAS with the specified parameters.
   * The tool accepts a name (required) and optional comment, kernel options, and definition.
   *
   * @example
   * // Example usage in MCP:
   * {
   *   "name": "high-memory",
   *   "comment": "Machines with high memory capacity",
   *   "kernel_opts": "mem=4G",
   *   "definition": "//node[memory>8192]",
   *   "_meta": { "progressToken": "create-tag-123" }
   * }
   *
   * @returns JSON representation of the created tag
   */
  server.tool(
    "maas_create_tag",
    createTagSchema.shape,
    { description: "Creates a new tag in MAAS." },
    async (params: z.infer<typeof createTagSchema>, extra: any) => {
      // Extract abort signal and notification function from extras
      const { signal, sendNotification } = extra;
      
      // Generate a unique request ID and create a logger instance
      const requestId = Date.now().toString(36);
      const logger = createRequestLogger(requestId, 'maas_create_tag', params);
      
      // Extract progress token from metadata and create progress notification sender
      const progressToken = params._meta?.progressToken;
      const sendProgress = createProgressSender(progressToken, sendNotification, requestId, 'maas_create_tag');
      
      try {
        logger.info('Executing create tag tool');
        await sendProgress(0, "Starting tag creation...");
        
        const maasApiParams: Record<string, any> = {
          op: 'new',
          name: params.name,
        };
        
        if (params.comment) maasApiParams.comment = params.comment;
        if (params.kernel_opts) maasApiParams.kernel_opts = params.kernel_opts;
        if (params.definition) maasApiParams.definition = params.definition;

        await sendProgress(50, "Sending tag creation request to MAAS...");
        
        const result = await maasClient.post('/tags', maasApiParams, signal);
        
        await sendProgress(100, "Tag created successfully.");
        logger.info({ tagName: params.name }, 'Successfully created tag');
        
        return {
          content: [{ type: "text", text: JSON.stringify(result) }]
        };
      } catch (error: any) {
        logger.error({ error: error.message }, 'Error creating tag');
        await sendProgress(100, `Error: ${error.message}`);
        
        return {
          content: [{ type: "text", text: `Error creating tag: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  /**
   * Update Tag Nodes Tool
   *
   * Registers a tool that updates which machines have a specific tag.
   * The tool accepts a tag name and arrays of system IDs to add or remove from the tag.
   *
   * @example
   * // Example usage in MCP:
   * {
   *   "tag_name": "high-memory",
   *   "add": ["abc123", "def456"],
   *   "remove": ["ghi789"],
   *   "_meta": { "progressToken": "update-tag-nodes-123" }
   * }
   *
   * @returns JSON representation of the updated tag
   */
  server.tool(
    "maas_update_tag_nodes",
    updateTagNodesSchema.shape,
    { description: "Updates which machines have a specific tag." },
    async (params: z.infer<typeof updateTagNodesSchema>, extra: any) => {
      // Extract abort signal and notification function from extras
      const { signal, sendNotification } = extra;
      
      // Generate a unique request ID and create a logger instance
      const requestId = Date.now().toString(36);
      const logger = createRequestLogger(requestId, 'maas_update_tag_nodes', params);
      
      // Extract progress token from metadata and create progress notification sender
      const progressToken = params._meta?.progressToken;
      const sendProgress = createProgressSender(progressToken, sendNotification, requestId, 'maas_update_tag_nodes');
      
      try {
        logger.info('Executing update tag nodes tool');
        await sendProgress(0, "Starting tag node update...");
        
        const maasApiParams: Record<string, any> = {
          op: 'update_nodes',
        };
        
        if (params.add && params.add.length > 0) {
          maasApiParams.add = params.add.join(',');
        }
        
        if (params.remove && params.remove.length > 0) {
          maasApiParams.remove = params.remove.join(',');
        }
        
        await sendProgress(50, "Updating tag nodes...");

        const result = await maasClient.post(`/tags/${params.tag_name}`, maasApiParams, signal);
        
        await sendProgress(100, "Tag nodes updated successfully.");
        logger.info({ tagName: params.tag_name }, 'Successfully updated tag nodes');
        
        return {
          content: [{ type: "text", text: JSON.stringify(result) }]
        };
      } catch (error: any) {
        logger.error({ error: error.message }, 'Error updating tag nodes');
        await sendProgress(100, `Error: ${error.message}`);
        
        return {
          content: [{ type: "text", text: `Error updating tag nodes: ${error.message}` }],
          isError: true
        };
      }
    }
  );
/**
 * Delete Tag Tool
 *
 * Registers a tool that deletes a tag from MAAS.
 * The tool accepts a tag name to identify which tag to delete.
 *
 * @example
 * // Example usage in MCP:
 * {
 *   "tag_name": "high-memory",
 *   "_meta": { "progressToken": "delete-tag-123" }
 * }
 *
 * @returns Success message confirming the tag was deleted
 */
server.tool(
  "maas_delete_tag",
  deleteTagSchema.shape,
  { description: "Deletes a tag from MAAS." },
  async (params: z.infer<typeof deleteTagSchema>, extra: any) => {
    // Extract abort signal and notification function from extras
    const { signal, sendNotification } = extra;
    
    // Generate a unique request ID and create a logger instance
    const requestId = Date.now().toString(36);
    const logger = createRequestLogger(requestId, 'maas_delete_tag', params);
    
    // Extract progress token from metadata and create progress notification sender
    const progressToken = params._meta?.progressToken;
    const sendProgress = createProgressSender(progressToken, sendNotification, requestId, 'maas_delete_tag');
    
    try {
      logger.info('Executing delete tag tool');
      await sendProgress(0, `Starting deletion of tag '${params.tag_name}'...`);
      
      await sendProgress(50, "Sending delete request to MAAS...");
      
      await maasClient.delete(`/tags/${params.tag_name}`, undefined, signal);
      
      await sendProgress(100, "Tag deleted successfully.");
      logger.info({ tagName: params.tag_name }, 'Successfully deleted tag');
      
      return {
        content: [{ type: "text", text: `Tag '${params.tag_name}' deleted successfully.` }]
      };
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error deleting tag');
      await sendProgress(100, `Error: ${error.message}`);
      
      return {
        content: [{ type: "text", text: `Error deleting tag: ${error.message}` }],
        isError: true
      };
    }
  }
  );
}