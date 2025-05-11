import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MaasApiClient } from "../maas/MaasApiClient.js";
import { z } from "zod";
import { machineIdSchema, metaSchema } from "./schemas/common.js";
import { 
  withOperationHandler, 
  OperationContext, 
  handleOperationError 
} from "../utils/operationHandlerUtils.js";
import { MaasServerError, ErrorType } from "../utils/errorHandler.js";
import { throwIfAborted } from "../utils/abortSignalUtils.js";

// Define schema for commission machine tool
const commissionMachineWithProgressSchema = z.object({
  system_id: machineIdSchema,
  enable_ssh: z.boolean().optional().describe("Whether to enable SSH for the commissioning environment."),
  skip_networking: z.boolean().optional().describe("Whether to skip networking configuration."),
  skip_storage: z.boolean().optional().describe("Whether to skip storage configuration."),
  commissioning_scripts: z.array(z.string()).optional().describe("List of commissioning script names to run."),
  testing_scripts: z.array(z.string()).optional().describe("List of testing script names to run."),
  _meta: metaSchema,
}).describe("Commission a machine with progress notifications.");

// Extended operation context with MAAS client
interface CommissionMachineContext extends OperationContext {
  maasClient: MaasApiClient;
}

/**
 * Handles the commissioning of a machine with progress notifications
 * 
 * @param params - The commissioning parameters
 * @param context - The operation context
 * @returns The commissioning result
 */
async function commissionMachineHandler(
  params: z.infer<typeof commissionMachineWithProgressSchema>,
  context: CommissionMachineContext
) {
  const { logger, sendProgress, signal } = context;
  
  try {
    logger.info({ machine_id: params.system_id }, 'Starting machine commissioning');
    await sendProgress(0, `Initiating commissioning for machine ${params.system_id}...`);
    
    // Check if already aborted before starting
    throwIfAborted(signal, `Commissioning of machine ${params.system_id} was aborted before starting`);
    
    // Prepare commissioning payload
    const commissionPayload: Record<string, any> = { op: 'commission' };
    if (params.enable_ssh !== undefined) commissionPayload.enable_ssh = params.enable_ssh.toString();
    if (params.skip_networking !== undefined) commissionPayload.skip_networking = params.skip_networking.toString();
    if (params.skip_storage !== undefined) commissionPayload.skip_storage = params.skip_storage.toString();
    if (params.commissioning_scripts) commissionPayload.commissioning_scripts = params.commissioning_scripts.join(',');
    if (params.testing_scripts) commissionPayload.testing_scripts = params.testing_scripts.join(',');
    
    // Send commissioning command to MAAS
    await context.maasClient.post(`/machines/${params.system_id}`, commissionPayload, signal);
    await sendProgress(10, "Commissioning command sent to MAAS. Monitoring status...");
    
    // Monitor commissioning status
    const maxPolls = 60;
    let polls = 0;
    let status = "";
    let isCommissioned = false;
    let currentProgressPercentage = 10;
    
    while (polls < maxPolls && !isCommissioned) {
      // Check if aborted
      throwIfAborted(signal, `Commissioning of machine ${params.system_id} was aborted during monitoring`);
      
      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Get machine status
      const machineState = await context.maasClient.get(`/machines/${params.system_id}`, undefined, signal);
      status = machineState?.status_name || "UNKNOWN";
      logger.debug({ machine_id: params.system_id, status }, 'Current machine status');
      
      let progressMessage = `Machine status: ${status}`;
      
      if (status === "COMMISSIONING") {
        currentProgressPercentage = Math.min(currentProgressPercentage + 5, 70);
        progressMessage = `Commissioning machine ${params.system_id}...`;
      } else if (status === "TESTING") {
        currentProgressPercentage = Math.min(currentProgressPercentage + 3, 90);
        progressMessage = `Running tests on machine ${params.system_id}...`;
      } else if (status === "READY") {
        currentProgressPercentage = 100;
        progressMessage = "Commissioning successfully completed.";
        isCommissioned = true;
      } else if (status.startsWith("FAILED_")) {
        throw new MaasServerError(
          `Commissioning failed with status: ${status}`,
          ErrorType.MAAS_API,
          500
        );
      }
      
      await sendProgress(currentProgressPercentage, progressMessage);
      polls++;
    }
    
    if (!isCommissioned) {
      throw new MaasServerError(
        `Commissioning monitoring timed out. Last status: ${status}`,
        ErrorType.MAAS_API,
        500
      );
    }
    
    return {
      content: [{
        type: "resource",
        resource: {
          uri: `maas://machine/${params.system_id}/commissioning_status.json`,
          text: JSON.stringify({
            system_id: params.system_id,
            status,
            completed: isCommissioned
          }),
          mimeType: "application/json"
        }
      }]
    };
  } catch (error: any) {
    return handleOperationError(error, context, [
      (error) => {
        // Handle specific commissioning errors
        if (error.message?.includes("failed") || error.message?.includes("FAILED_")) {
          return {
            isHandled: true,
            result: {
              content: [{ 
                type: "text", 
                text: `Commissioning failed for machine ${params.system_id}: ${error.message}` 
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
 * Registers the commission machine with progress tool with the MCP server
 * @param server MCP server instance
 * @param maasClient MAAS API client instance
 */
export function registerCommissionMachineWithProgressTool(server: McpServer, maasClient: MaasApiClient) {
  const toolName = "maas_commission_machine_with_progress";
  
  // Create the wrapped handler with operation handling
  const wrappedHandler = withOperationHandler<
    { content: any[] },
    z.infer<typeof commissionMachineWithProgressSchema>
  >(
    toolName,
    // Inject maasClient into the context
    async (params, context) => commissionMachineHandler(params, { ...context, maasClient }),
    {
      timeout: 600000, // 10 minutes timeout for commissioning
      initialMessage: "Preparing to commission machine"
    }
  );
  
  // Register the tool with the MCP server
  server.tool(
    toolName,
    commissionMachineWithProgressSchema.shape,
    async (
      params: z.infer<typeof commissionMachineWithProgressSchema>,
      extra: { signal?: AbortSignal; sendNotification?: (notification: any) => Promise<void> }
    ) => {
      return wrappedHandler(params, extra);
    }
  );
}