# PRD - Stage 5: Long-Running Operations & MCP Notifications

## Original PRD Reference:
Based on "Report: Building an MCP Server for Canonical MAAS API in TypeScript (MCP v2024-11-05)" ([`scripts/prd.txt`](scripts/prd.txt))

## Stage Focus:
Implementing support for long-running MAAS tasks (e.g., machine deployment, commissioning) using MCP progress notifications (`notifications/progress`). This involves handling the `_meta.progressToken` from client requests and using the `sendNotification` function provided to tool handlers. It also includes robust handling of `AbortSignal` for cancellation.

## Relevant Sections from Original PRD ([`scripts/prd.txt`](scripts/prd.txt)):

### 7. Advanced: Handling Long-Running Operations and Notifications
Certain MAAS operations, such as deploying an operating system or running commissioning scripts, can be time-consuming. MCP provides a mechanism for progress notifications.

#### 7.1. Identifying Long-Running MAAS Tasks
Operations like machine deployment (`op=deploy`), commissioning (`op=commission`) are candidates.

#### 7.2. Implementing MCP Progress Notifications (`notifications/progress`)
The MCP specification version 2024-11-05 supports progress tracking.
*   Client includes `progressToken` in `_meta` field of its request.
*   Server sends `notifications/progress` messages with the `progressToken`, `progress`, `total` (optional), and `message` (optional).

#### 7.3. Using `sendNotification` in Tool Handlers
The MCP SDK provides `sendNotification` via the `extra` (or context) argument to tool handlers.

**Example Tool: Deploy Machine with Progress**
This example enhances a hypothetical `maas_deploy_machine` tool to include progress updates.
```typescript
// src/mcp_tools/schemas/deployMachineSchema.ts (or update existing)
import { z } from 'zod';

export const deployMachineSchema = z.object({
    system_id: z.string().describe("System ID of the machine to deploy."),
    osystem: z.string().optional().describe("Operating system to deploy (e.g., 'ubuntu')."),
    distro_series: z.string().optional().describe("Distribution series (e.g., 'jammy')."),
    // Add other MAAS deployment parameters as needed
    _meta: z.object({ // MCP metadata field
        progressToken: z.union([z.string(), z.number()]).optional()
    }).optional().describe("MCP metadata, including optional progressToken for progress updates.")
});

// src/mcp_tools/deployMachineWithProgress.ts (or modify existing deployMachine.ts)
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MaasApiClient } from "../maas/MaasApiClient"; // Corrected path
import { deployMachineSchema } from "./schemas/deployMachineSchema"; // Corrected path
import { z } from "zod";
import { JSONRPCNotification } from "@modelcontextprotocol/sdk/types"; // For typing sendNotification

type DeployMachineParams = z.infer<typeof deployMachineSchema>;

export function registerDeployMachineWithProgressTool(server: McpServer, maasClient: MaasApiClient) {
    server.tool(
        "maas_deploy_machine_with_progress", // Or update existing "maas_deploy_machine"
        deployMachineSchema,
        async (params: DeployMachineParams, { sendNotification, signal }) => {
            const progressToken = params._meta?.progressToken;
            let currentProgressPercentage = 0;

            const trySendProgress = async (progress: number, total: number, message: string) => {
                if (progressToken && sendNotification) {
                    currentProgressPercentage = progress;
                    try {
                        await (sendNotification as (notification: JSONRPCNotification) => Promise<void>)({
                            method: "notifications/progress",
                            params: { progressToken, progress, total, message }
                        });
                    } catch (e: any) {
                        console.warn(`Failed to send progress notification for token ${progressToken}: ${e.message}`);
                    }
                }
            };

            try {
                await trySendProgress(0, 100, `Initiating deployment for machine ${params.system_id}...`);

                const deployPayload: Record<string, any> = { op: 'deploy' };
                if (params.osystem) deployPayload.osystem = params.osystem;
                if (params.distro_series) deployPayload.distro_series = params.distro_series;
                // ... add other deployment params from 'params' to 'deployPayload'

                // Initial MAAS API call to start deployment
                await maasClient.post(`/machines/${params.system_id}`, deployPayload, signal);
                await trySendProgress(10, 100, "Deployment command sent to MAAS. Monitoring status...");

                // MAAS deployment is asynchronous. True progress requires polling.
                const maxPolls = 60; // e.g., 5 minutes if polling every 5 seconds (300s / 5s = 60)
                let polls = 0;
                let status = "";
                let machineState;

                while (polls < maxPolls) {
                    if (signal?.aborted) {
                        await trySendProgress(currentProgressPercentage, 100, "Deployment monitoring cancelled by client.");
                        throw new Error("Deployment monitoring cancelled by client.");
                    }
                    await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds

                    try {
                        machineState = await maasClient.get(`/machines/${params.system_id}`, undefined, signal);
                        status = machineState?.status_name || "UNKNOWN";
                    } catch (pollError: any) {
                        console.warn(`Polling error for ${params.system_id}: ${pollError.message}`);
                        status = "POLLING_ERROR";
                        // Optionally send a progress update about the polling error
                        await trySendProgress(currentProgressPercentage, 100, `Machine status: POLLING_ERROR (${pollError.message.substring(0,50)})`);
                        polls++; // Continue polling for a few times in case it's transient
                        if (polls > maxPolls - 5) { // If multiple polling errors, give up
                             throw new Error(`Persistent polling error for machine ${params.system_id}. Last error: ${pollError.message}`);
                        }
                        continue;
                    }
                    
                    let progressMessage = `Machine status: ${status}`;
                    // Example MAAS statuses: NEW, COMMISSIONING, READY, DEPLOYING, DEPLOYED, FAILED_DEPLOYMENT, BROKEN, ...
                    if (status === "DEPLOYING") {
                        currentProgressPercentage = Math.min(currentProgressPercentage + 5, 70);
                    } else if (status === "DEPLOYED") {
                        currentProgressPercentage = 100;
                        progressMessage = "Deployment successfully completed.";
                    } else if (status.startsWith("FAILED_") || status === "BROKEN") {
                        currentProgressPercentage = 100; // Final state, even if error
                        await trySendProgress(currentProgressPercentage, 100, `Deployment failed with status: ${status}`);
                        throw new Error(`Deployment failed with status: ${status}`);
                    } else if (status === "READY" && currentProgressPercentage > 10) {
                        // This logic might need refinement based on exact MAAS state transitions.
                        // If it reverted to READY after being in DEPLOYING, it might be an issue or completion.
                        currentProgressPercentage = 100;
                        progressMessage = "Machine is READY. Assuming deployment finished or reverted.";
                    }

                    await trySendProgress(currentProgressPercentage, 100, progressMessage);
                    if (currentProgressPercentage === 100) break;
                    polls++;
                }

                if (currentProgressPercentage < 100) {
                   await trySendProgress(currentProgressPercentage, 100, `Deployment monitoring timed out. Last status: ${status}`);
                   // Depending on requirements, this might be considered an error or just an incomplete state.
                }
                
                return { content: [{ type: "text", text: `Machine ${params.system_id} deployment process finished with status: ${status}.` }] };

            } catch (error: any) {
                console.error(`Error in maas_deploy_machine_with_progress for ${params.system_id}: ${error.message}`);
                await trySendProgress(currentProgressPercentage, 100, `Error during deployment: ${error.message.substring(0,100)}`);
                return {
                    content: [{ type: "text", text: `Error deploying machine ${params.system_id}: ${error.message}` }],
                    isError: true
                };
            }
        }
    );
}
```
**Polling MAAS for Status:**
The MAAS API's asynchronous nature for operations like deployment necessitates a polling mechanism on the MCP server side to provide meaningful progress. The MCP server will periodically query the MAAS API (e.g., `GET /machines/{system_id}`) to fetch the machine's current status and translate this into progress updates.

**`AbortSignal` Handling:**
The `signal` object (an `AbortSignal`) provided to the tool handler is crucial. It should be checked:
*   Before initiating long operations.
*   Within polling loops.
*   Before sending notifications (to avoid work if already aborted).
If `signal.aborted` is true, the handler should clean up and terminate its work, potentially sending a final "cancelled" progress update.

## Sanity Checks for Stage 5:
*   Test a tool that triggers a long-running MAAS operation (e.g., `maas_deploy_machine_with_progress` or a similar tool for `commission`).
*   Verify that `notifications/progress` messages are sent correctly by the server if a `progressToken` is provided by the client.
*   Confirm the client (e.g., MCP Inspector or a custom test client) can receive and process these notifications.
*   Test the cancellation of a long-running operation by triggering `AbortSignal` from the client side (if test client supports it) or simulating it in tests. Verify the server-side operation stops and potentially sends a cancellation progress update.
*   Verify the polling logic:
    *   It polls at reasonable intervals.
    *   It correctly interprets various MAAS machine statuses.
    *   It handles MAAS API errors during polling gracefully.
    *   It times out appropriately if the operation takes too long.
*   Ensure the `_meta.progressToken` field in Zod schemas is correctly defined and optional.

## Auditing Points for Stage 5:
*   Code review of tool handlers for long-running operations:
    *   Correct checking and usage of `params._meta?.progressToken`.
    *   Proper use of `sendNotification` with the `notifications/progress` method and payload structure.
    *   Robustness of any polling logic (status interpretation, error handling during polls, timeout conditions).
    *   Thorough and timely checking of `AbortSignal` at all relevant points (before/during async calls, within loops).
    *   Error handling specific to the long-running operation, including sending final error progress updates.
*   Review Zod schemas for tools supporting progress to ensure `_meta.progressToken` is correctly defined.
*   Verify that the `MaasApiClient` methods used by these tools correctly accept and pass through the `AbortSignal`.