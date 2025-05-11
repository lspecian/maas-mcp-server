import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from 'zod';
import { MaasApiClient } from "../maas/MaasApiClient.js";
import { listSubnetsSchema } from './schemas/listSubnetsSchema.js';
import { createRequestLogger } from "../utils/logger.js";
import { createProgressSender } from "../utils/progressNotification.js";

/**
 * Registers the list subnets tool with the MCP server.
 * This tool retrieves a list of subnets from the MAAS API with optional filtering parameters.
 *
 * The tool supports filtering by CIDR, name, VLAN ID, fabric name, space name, and subnet ID.
 * It also supports pagination through limit and offset parameters. Progress notifications
 * are supported through the _meta.progressToken parameter, and the operation can be
 * aborted using the AbortSignal.
 *
 * @param server - The MCP server instance to register the tool with
 * @param maasApiClient - The MAAS API client instance for making API calls
 *
 * @example
 * // Example usage in MCP:
 * {
 *   "cidr": "192.168.1.0/24",
 *   "name": "management-network",
 *   "vlan": 100,
 *   "limit": 10,
 *   "offset": 0,
 *   "_meta": { "progressToken": "list-subnets-123" }
 * }
 *
 * @returns JSON array of subnet objects matching the filter criteria
 * @throws Will throw an error if the subnet retrieval fails
 */
export function registerListSubnetsTool(server: McpServer, maasApiClient: MaasApiClient) {
  const toolName = "maas_list_subnets";
  const toolSchemaObject = listSubnetsSchema; // Keep the original ZodObject for inference

  server.tool(
    toolName,
    toolSchemaObject.shape, // Pass the shape for ZodRawShape compatibility
    async (
      params: z.infer<typeof toolSchemaObject>, // Infer from the original ZodObject
      { signal, sendNotification }: { signal?: AbortSignal; sendNotification?: (notification: any) => Promise<void> }
    ): Promise<{ content: { type: "text"; text: string; }[]; isError?: boolean }> => {
      // Generate a unique request ID for tracking and create a logger instance
      const requestId = Date.now().toString(36);
      const logger = createRequestLogger(requestId, toolName, params);
      
      // Extract progress token from metadata and create progress notification sender
      const progressToken = params._meta?.progressToken;
      const sendProgress = createProgressSender(progressToken, sendNotification, requestId, toolName);
      
      try {
        logger.info('Executing list subnets tool');
        // Send initial progress notification (0%)
        await sendProgress(0, "Starting subnet list retrieval...");
        
        // Build API parameters object from the provided filters
        const apiParams: Record<string, any> = {};

        // Add filter parameters if provided
        if (params.cidr) apiParams.cidr = params.cidr;
        if (params.name) apiParams.name = params.name;
        if (params.vlan) apiParams.vlan = params.vlan;
        if (params.fabric) apiParams.fabric = params.fabric;
        if (params.space) apiParams.space = params.space;
        if (params.id) apiParams.id = params.id;
        
        // Add pagination parameters if provided
        if (typeof params.limit === 'number') apiParams.limit = params.limit;
        if (typeof params.offset === 'number') apiParams.offset = params.offset;
        
        // Send progress update (50%)
        await sendProgress(50, "Fetching subnets from MAAS API...");
        
        // Call MAAS API to get subnets with the specified filters, passing the abort signal
        const subnets = await maasApiClient.get('/subnets/', apiParams, signal);
        
        // Send completion progress notification (100%)
        await sendProgress(100, "Subnet list retrieved successfully.");
        logger.info({ subnetCount: subnets.length }, 'Successfully retrieved subnets');
        
        return {
          content: [{ type: "text", text: JSON.stringify(subnets) }]
        };
      } catch (error: any) {
        // Log the error and send error progress notification
        logger.error({ error: error.message }, 'Error listing subnets');
        await sendProgress(100, `Error: ${error.message}`);
        
        // Return error response in the expected MCP format
        return {
          content: [{ type: "text", text: `Error listing subnets: ${error.message}` }],
          isError: true
        };
      }
    }
  );
}