import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MaasApiClient } from "../maas/MaasApiClient.js";
import { z } from "zod";
import { metaSchema, paginationSchema } from "./schemas/common.js";
import { createRequestLogger } from "../utils/logger.js";

// Define schema for list machines tool parameters
const listMachinesParamsSchema = z.object({
  hostname: z.string().optional().describe("Filter machines by hostname (supports globbing)."),
  mac_address: z.string().optional().describe("Filter machines by a MAC address."),
  tag_names: z.array(z.string()).optional().describe("Filter machines by a list of tag names."),
  status: z.string().optional().describe("Filter machines by status."),
  zone: z.string().optional().describe("Filter machines by zone."),
  pool: z.string().optional().describe("Filter machines by pool."),
  ...paginationSchema.unwrap().shape,
  _meta: metaSchema,
});
// Note: The overall tool description "Lists machines registered in MAAS, with optional filters."
// is not part of this schema object. If the SDK supports a separate description field
// for the tool (e.g., via an annotations object or another parameter), that would be
// the place for it. For now, focusing on type compatibility.

export function registerListMachinesTool(server: McpServer, maasClient: MaasApiClient) {
  server.tool(
    "maas_list_machines",
    listMachinesParamsSchema.shape, // Provide the raw shape
    async (params: z.infer<typeof listMachinesParamsSchema>, { signal, sendNotification }) => {
      const requestId = Date.now().toString(36);
      const logger = createRequestLogger(requestId, 'maas_list_machines', params);
      
      try {
        logger.info('Executing list machines tool');
        
        // Send initial progress notification if progressToken is provided
        const progressToken = params._meta?.progressToken;
        if (progressToken && sendNotification) {
          await sendNotification({
            method: "notifications/progress",
            params: { progressToken, progress: 0, total: 100, message: "Starting machine list retrieval..." }
          });
        }
        
        // Transform MCP parameters to MAAS API parameters
        const apiParams: Record<string, any> = {};
        if (params.hostname) apiParams.hostname = params.hostname;
        if (params.mac_address) apiParams.mac_addresses = params.mac_address;
        if (params.tag_names) apiParams.tags = params.tag_names.join(',');
        if (params.status) apiParams.status = params.status;
        if (params.zone) apiParams.zone = params.zone;
        if (params.pool) apiParams.pool = params.pool;
        if (params.offset) apiParams.offset = params.offset.toString();
        if (params.limit) apiParams.limit = params.limit.toString();

        // Send progress update
        if (progressToken && sendNotification) {
          await sendNotification({
            method: "notifications/progress",
            params: { progressToken, progress: 50, total: 100, message: "Fetching machines from MAAS API..." }
          });
        }

        // Call MAAS API
        const machines = await maasClient.get('/machines', apiParams, signal);
        
        // Send completion notification
        if (progressToken && sendNotification) {
          await sendNotification({
            method: "notifications/progress",
            params: { progressToken, progress: 100, total: 100, message: "Machine list retrieved successfully." }
          });
        }
        
        logger.info({ machineCount: machines.length }, 'Successfully retrieved machines');
        
        return {
          content: [{ type: "text", text: JSON.stringify(machines) }]
        };
      } catch (error: any) {
        logger.error({ error: error.message }, 'Error listing machines');
        
        // Send error notification
        const currentProgressTokenInCatch = params._meta?.progressToken;
        if (currentProgressTokenInCatch && sendNotification) {
          await sendNotification({
            method: "notifications/progress",
            params: { progressToken: currentProgressTokenInCatch, progress: 100, total: 100, message: `Error: ${error.message}` }
          });
        }
        
        return {
          content: [{ type: "text", text: `Error listing machines: ${error.message}` }],
          isError: true
        };
      }
    }
  );
}