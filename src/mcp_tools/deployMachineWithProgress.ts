import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MaasApiClient } from "../maas/MaasApiClient.js";
import { z } from "zod";
import { machineIdSchema, osSystemSchema, distroSeriesSchema, metaSchema } from "./schemas/common.js";
import { 
  withOperationHandler, 
  OperationContext, 
  handleOperationError 
} from "../utils/operationHandlerUtils.js";
import { MaasServerError, ErrorType } from "../utils/errorHandler.js";
import { throwIfAborted } from "../utils/abortSignalUtils.js";

// Extended operation context with MAAS client
interface DeployMachineContext extends OperationContext {
  maasClient: MaasApiClient;
}

// Define schema for deploy machine tool
const deployMachineWithProgressSchema = z.object({
  system_id: machineIdSchema,
  osystem: osSystemSchema.optional(),
  distro_series: distroSeriesSchema.optional(),
  user_data: z.string().optional().describe("Cloud-init user data to use when deploying."),
  enable_hw_sync: z.boolean().optional().describe("Whether to enable hardware sync during deployment."),
  _meta: metaSchema,
}).describe("Deploy an operating system to a machine with progress notifications.");

/**
 * Handles the deployment of a machine with progress notifications
 * 
 * @param params - The deployment parameters
 * @param context - The operation context
 * @returns The deployment result
 */
async function deployMachineHandler(
  params: z.infer<typeof deployMachineWithProgressSchema>,
  context: DeployMachineContext
) {
  const { logger, sendProgress, signal } = context;
  
  try {
    logger.info({ machine_id: params.system_id }, 'Starting machine deployment');
    await sendProgress(0, `Initiating deployment for machine ${params.system_id}...`);
    
    // Check if already aborted before starting
    throwIfAborted(signal, `Deployment of machine ${params.system_id} was aborted before starting`);
    
    // Prepare deployment payload
    const deployPayload: Record<string, any> = { op: 'deploy' };
    if (params.osystem) deployPayload.osystem = params.osystem;
    if (params.distro_series) deployPayload.distro_series = params.distro_series;
    if (params.user_data) deployPayload.user_data = params.user_data;
    if (params.enable_hw_sync !== undefined) deployPayload.enable_hw_sync = params.enable_hw_sync.toString();
    
    // Send deployment command to MAAS
    await context.maasClient.post(`/machines/${params.system_id}`, deployPayload, signal);
    await sendProgress(10, "Deployment command sent to MAAS. Monitoring status...");
    
    // Monitor deployment status
    const maxPolls = 60;
    let polls = 0;
    let status = "";
    let isDeployed = false;
    let currentProgressPercentage = 10;
    
    while (polls < maxPolls && !isDeployed) {
      // Check if aborted
      throwIfAborted(signal, `Deployment of machine ${params.system_id} was aborted during monitoring`);
      
      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Get machine status
      const machineState = await context.maasClient.get(`/machines/${params.system_id}`, undefined, signal);
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
        throw new MaasServerError(
          `Deployment failed with status: ${status}`,
          ErrorType.MAAS_API,
          500
        );
      }
      
      await sendProgress(currentProgressPercentage, progressMessage);
      polls++;
    }
    
    if (!isDeployed) {
      throw new MaasServerError(
        `Deployment monitoring timed out. Last status: ${status}`,
        ErrorType.MAAS_API,
        500
      );
    }
    
    return {
      content: [{
        type: "resource",
        resource: {
          uri: `maas://machine/${params.system_id}/deployment_status.json`,
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
    return handleOperationError(error, context, [
      (error) => {
        // Handle specific deployment errors
        if (error.message?.includes("failed") || error.message?.includes("FAILED_")) {
          return {
            isHandled: true,
            result: {
              content: [{ 
                type: "text", 
                text: `Deployment failed for machine ${params.system_id}: ${error.message}` 
              }],
              isError: true
            }
          };
        }
        return undefined;
      }
    ]);
  }
}

/**
 * Registers the deploy machine with progress tool with the MCP server
 * @param server MCP server instance
 * @param maasClient MAAS API client instance
 */
export function registerDeployMachineWithProgressTool(server: McpServer, maasClient: MaasApiClient) {
  const toolName = "maas_deploy_machine_with_progress";
  
  // Create the wrapped handler with operation handling
  const wrappedHandler = withOperationHandler<
    { content: any[] },
    z.infer<typeof deployMachineWithProgressSchema>
  >(
    toolName,
    // Inject maasClient into the context
    async (params, context) => deployMachineHandler(params, { ...context, maasClient }),
    {
      timeout: 600000, // 10 minutes timeout for deployment
      initialMessage: "Preparing to deploy machine"
    }
  );
  
  // Register the tool with the MCP server
  server.tool(
    toolName,
    deployMachineWithProgressSchema.shape,
    async (
      params: z.infer<typeof deployMachineWithProgressSchema>,
      extra: { signal?: AbortSignal; sendNotification?: (notification: any) => Promise<void> }
    ) => {
      return wrappedHandler(params, extra);
    }
  );
}