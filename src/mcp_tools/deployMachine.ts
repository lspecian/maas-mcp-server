import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MaasApiClient } from "../maas/MaasApiClient.js"; // Adjust path if necessary
import { z } from "zod";
import { machineIdSchema, osSystemSchema, distroSeriesSchema, metaSchema } from "./schemas/common.js"; // Adjust path if necessary
import { createRequestLogger } from "../utils/logger.js"; // Adjust path if necessary

// Define schema for deploy machine tool
const deployMachineSchema = z.object({
  system_id: machineIdSchema,
  osystem: osSystemSchema.optional(),
  distro_series: distroSeriesSchema.optional(),
  user_data: z.string().optional().describe("Cloud-init user data to use when deploying."),
  enable_hw_sync: z.boolean().optional().describe("Whether to enable hardware sync during deployment."),
  _meta: metaSchema,
}).describe("Deploy an operating system to a machine.");

export function registerDeployMachineTool(server: McpServer, maasClient: MaasApiClient) {
  server.tool(
    "maas_deploy_machine",
    deployMachineSchema.shape, // Use .shape to pass the ZodRawShape
    async (
      // Note: z.infer will still correctly infer types from the original deployMachineSchema
      params: z.infer<typeof deployMachineSchema>,
      extra: any // Temporarily use any to resolve import errors and isolate overload issue
    ) => {
      const { signal, sendNotification } = extra;
      const requestId = Date.now().toString(36);
      const logger = createRequestLogger(requestId, 'maas_deploy_machine', params);
      // Assuming metaSchema in common.ts should define progressToken.
      // Adding a type assertion here as a local workaround.
      const progressToken = (params._meta as { progressToken?: string } | undefined)?.progressToken;
      let currentProgressPercentage = 0;

      const sendProgress = async (progress: number, message: string) => {
        if (progressToken && sendNotification) {
          currentProgressPercentage = progress;
          try {
            await sendNotification({
              method: "notifications/progress",
              params: { progressToken, progress, total: 100, message }
            });
          } catch (e: any) { // Added type annotation for e
            logger.warn({ error: e.message }, 'Failed to send progress notification');
          }
        }
      };

      try {
        logger.info('Executing deploy machine tool');
        await sendProgress(0, `Initiating deployment for machine ${params.system_id}...`);

        const deployPayload: Record<string, any> = { op: 'deploy' };
        if (params.osystem) deployPayload.osystem = params.osystem;
        if (params.distro_series) deployPayload.distro_series = params.distro_series;
        if (params.user_data) deployPayload.user_data = params.user_data;
        if (params.enable_hw_sync !== undefined) deployPayload.enable_hw_sync = params.enable_hw_sync.toString();

        await maasClient.post(`/machines/${params.system_id}`, deployPayload, signal);
        await sendProgress(10, "Deployment command sent to MAAS. Monitoring status...");

        const maxPolls = 60;
        let polls = 0;
        let status = "";
        let isDeployed = false;

        while (polls < maxPolls && !isDeployed) {
          if (signal?.aborted) {
            await sendProgress(currentProgressPercentage, "Deployment monitoring cancelled by client.");
            throw new Error("Deployment monitoring cancelled by client.");
          }

          await new Promise(resolve => setTimeout(resolve, 5000));

          const machineState = await maasClient.get(`/machines/${params.system_id}`, undefined, signal);
          status = machineState?.status_name || "UNKNOWN";
          logger.debug({ machine_id: params.system_id, status }, 'Current machine status');

          let progressMessage = `Machine status: ${status}`;

          if (status === "DEPLOYING") {
            currentProgressPercentage = Math.min(currentProgressPercentage + 5, 70);
            progressMessage = `Deploying operating system to machine ${params.system_id}...`;
          } else if (status === "DEPLOYED") {
            currentProgressPercentage = 100;
            progressMessage = "Deployment successfully completed.";
            isDeployed = true;
          } else if (status.startsWith("FAILED_")) {
            currentProgressPercentage = 100; // Mark as 100% to indicate completion (failure)
            await sendProgress(currentProgressPercentage, `Deployment failed with status: ${status}`);
            throw new Error(`Deployment failed with status: ${status}`);
          }

          await sendProgress(currentProgressPercentage, progressMessage);
          polls++;
        }

        if (!isDeployed && !(signal?.aborted)) { // Check if not aborted before timeout message
          await sendProgress(currentProgressPercentage, `Deployment monitoring timed out. Last status: ${status}`);
          logger.warn({ machine_id: params.system_id, status }, 'Deployment monitoring timed out');
        }

        return {
          content: [{
            type: "resource",
            resource: {
              uri: `maas://machine/${params.system_id}/deployment_status.json`, // Dummy URI
              text: JSON.stringify({
                system_id: params.system_id,
                status,
                completed: isDeployed
              }),
              mimeType: "application/json"
            }
          }]
        };
      } catch (error: any) {
        logger.error({ machine_id: params.system_id, error: error.message, stack: error.stack?.substring(0,500) }, 'Error deploying machine');
        // Ensure progress is sent even on error, if possible
        if (!String(error.message).includes("cancelled by client")) { // Avoid sending error if already cancelled
           await sendProgress(currentProgressPercentage, `Error during deployment: ${error.message}`);
        }
        return {
          content: [{ type: "text", text: `Error deploying machine ${params.system_id}: ${error.message}` }],
          isError: true
        };
      }
    }
  );
}