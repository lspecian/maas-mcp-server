import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MaasApiClient } from "../maas/MaasApiClient.js"; // Adjusted path if necessary
import { z } from "zod";
import { metaSchema } from "./schemas/common.js"; // Adjusted path if necessary
import { createRequestLogger } from "../utils/logger.js"; // Adjusted path if necessary

// Define schema for allocate machine tool
const allocateMachineSchema = z.object({
  name: z.string().optional().describe("Hostname to assign to the allocated machine."),
  system_id: z.string().optional().describe("System ID of a specific machine to allocate."),
  min_cpu_count: z.number().int().positive().optional().describe("Minimum number of CPU cores."),
  min_memory: z.number().int().positive().optional().describe("Minimum memory in MB."),
  min_storage: z.number().int().positive().optional().describe("Minimum storage in GB."),
  tags: z.array(z.string()).optional().describe("Tags the machine must have."),
  not_tags: z.array(z.string()).optional().describe("Tags the machine must not have."),
  zone: z.string().optional().describe("Zone name the machine must be in."),
  pool: z.string().optional().describe("Pool name the machine must be in."),
  _meta: metaSchema,
}).describe("Allocate a machine from the MAAS ready pool.");

export function registerAllocateMachineTool(server: McpServer, maasClient: MaasApiClient) {
  server.tool(
    "maas_allocate_machine",
    allocateMachineSchema.shape, // Use .shape to pass the ZodRawShape
    async (
      params: z.infer<typeof allocateMachineSchema>,
      extra: any // Match deployMachine.ts for now
    ) => {
      const { signal, sendNotification } = extra;
      const requestId = Date.now().toString(36);
      const logger = createRequestLogger(requestId, 'maas_allocate_machine', params);
      const progressToken = (params._meta as { progressToken?: string } | undefined)?.progressToken;

      const sendProgress = async (progress: number, message: string) => {
        if (progressToken && sendNotification) {
          try {
            await sendNotification({
              method: "notifications/progress",
              params: { progressToken, progress, total: 100, message }
            });
          } catch (e: any) {
            logger.warn({ error: e.message }, 'Failed to send progress notification');
          }
        }
      };

      try {
        logger.info('Executing allocate machine tool');
        await sendProgress(0, "Starting machine allocation...");

        const allocateParams: Record<string, any> = { op: 'allocate' };

        if (params.name) allocateParams.name = params.name;
        if (params.system_id) allocateParams.system_id = params.system_id;
        // MAAS API uses cpu_count, mem, storage
        if (params.min_cpu_count) allocateParams.cpu_count = params.min_cpu_count.toString();
        if (params.min_memory) allocateParams.mem = params.min_memory.toString();
        if (params.min_storage) allocateParams.storage = params.min_storage.toString(); // Assuming MAAS expects GB as string
        if (params.tags && params.tags.length > 0) allocateParams.tags = params.tags.join(',');
        if (params.not_tags && params.not_tags.length > 0) allocateParams.not_tags = params.not_tags.join(',');
        if (params.zone) allocateParams.zone = params.zone;
        if (params.pool) allocateParams.pool = params.pool;

        await sendProgress(50, "Sending allocation request to MAAS...");

        const result = await maasClient.post('/machines', allocateParams, signal);

        await sendProgress(100, "Machine allocated successfully.");
        logger.info({ systemId: result?.system_id }, 'Successfully allocated machine'); // Added null check for result

        return {
          content: [{
            type: "resource",
            resource: {
              uri: `maas://machine/${result?.system_id || 'unknown'}/allocation_details.json`, // Construct a URI
              text: JSON.stringify(result),
              mimeType: "application/json"
            }
          }]
        };
      } catch (error: any) {
        logger.error({ error: error.message, stack: error.stack?.substring(0,500) }, 'Error allocating machine');
        await sendProgress(100, `Error: ${error.message}`); // Send 100% progress on error to complete
        return {
          content: [{ type: "text", text: `Error allocating machine: ${error.message}` }],
          isError: true
        };
      }
    }
  );
}