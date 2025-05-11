import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MaasApiClient } from '../maas/MaasApiClient.js';
import {
  errorToMcpResult,
  handleMaasApiError,
  handleValidationError,
  ErrorType,
  MaasServerError
} from '../utils/errorHandler.js';
import { ErrorMessages } from '../utils/errorMessages.js';
import { basePostRequestSchema, postSuccessResponseSchema } from './schemas/writeOps.js';
import { createRequestLogger } from '../utils/logger.js';
import { metaSchema } from './schemas/common.js';

const createMachinePayloadSchema = z.object({
  architecture: z.string().optional().describe('CPU architecture, e.g., amd64, arm64'),
  min_hba: z.number().int().positive().optional().describe('Minimum number of Host Bus Adapters'),
  min_cpu_count: z.number().int().positive().optional().describe('Minimum number of CPU cores'),
  min_memory: z.number().int().positive().optional().describe('Minimum memory in MB'),
  tags: z.array(z.string()).optional().describe('List of tags to apply to the machine'),
  pool: z.string().optional().describe('Name or ID of the resource pool to allocate from'),
  zone: z.string().optional().describe('Name or ID of the zone to allocate from'),
  interfaces: z.array(z.string()).optional().describe('Interface constraints, e.g., "name=eth0,subnet_id=123"'),
  hostname: z.string().optional().describe('Desired hostname for the machine'),
  // Add other MAAS specific fields as necessary based on API docs
}).describe('Payload for creating/allocating a MAAS machine');

export const createMachineRequestSchema = basePostRequestSchema(createMachinePayloadSchema);
// The outputSchema is implicitly defined by the handler's return type and postSuccessResponseSchema usage.

export function registerCreateMachineTool(server: McpServer, maasClient: MaasApiClient): void {
  const toolSchema = z.object({
    ...createMachineRequestSchema.shape,
    _meta: metaSchema.optional(),
  }).describe('Allocates a new machine in MAAS. Defines parameters for machine creation including hardware specs, tags, pool, zone, and hostname.');

  server.tool(
    'maas_create_machine',
    toolSchema.shape, // Pass the .shape of the Zod schema
    async (
      params: z.infer<typeof toolSchema>,
      // The 'extra' object contains 'id', 'signal', 'sendNotification'
      extra: { id?: string; signal?: AbortSignal; sendNotification?: (notification: any) => Promise<void> }
    ) => {
      const { payload } = params;
      const requestId = extra.id || Date.now().toString(36);
      const logger = createRequestLogger(requestId, 'maas_create_machine', params);
      logger.info('Attempting to allocate machine...');
      const { signal, sendNotification } = extra; // Destructure for use

      const progressToken = params._meta?.progressToken;

      try {
        if (progressToken && sendNotification) {
          await sendNotification({
            method: "notifications/progress",
            params: { progressToken, progress: 0, total: 100, message: "Initiating machine allocation..." }
          });
        }

        const maasPayload: Record<string, any> = { ...payload };
        Object.keys(maasPayload).forEach(key => {
          if (maasPayload[key] === undefined) {
            delete maasPayload[key];
          }
        });

        logger.debug({ maasPayload }, 'Sending payload to MAAS API /machines?op=allocate');
        if (progressToken && sendNotification) {
          await sendNotification({
            method: "notifications/progress",
            params: { progressToken, progress: 30, total: 100, message: "Contacting MAAS API..." }
          });
        }
        
        const result = await maasClient.post('/machines?op=allocate', maasPayload, signal);
        
        if (progressToken && sendNotification) {
          await sendNotification({
            method: "notifications/progress",
            params: { progressToken, progress: 70, total: 100, message: "Machine allocation API call successful." }
          });
        }
        logger.info({ machineId: result.system_id }, 'Machine allocated successfully.');
        
        const successResponseData = {
          id: result.system_id,
          message: 'Machine allocated successfully.',
        };
        
        const validatedSuccessOutput = postSuccessResponseSchema.parse({
            success: true,
            data: successResponseData
        });

        if (progressToken && sendNotification) {
          await sendNotification({
            method: "notifications/progress",
            params: { progressToken, progress: 100, total: 100, message: "Machine allocated successfully." }
          });
        }
        // Return structure based on listMachines.ts
        return {
          content: [{ type: "text", text: JSON.stringify(validatedSuccessOutput) }]
        };

      } catch (error: any) {
        logger.error({ error: error.message, stack: error.stack }, 'Failed to allocate machine.');
        
        // Send error notification if progress tracking is enabled
        if (progressToken && sendNotification) {
          await sendNotification({
            method: "notifications/progress",
            params: { progressToken, progress: 100, total: 100, message: `Error: ${error.message}` }
          });
        }
        
        // Handle specific error cases
        if (error.status === 404 || error.message?.includes('not found')) {
          return errorToMcpResult(
            new MaasServerError(
              ErrorMessages.resourceNotFound('Machine pool', payload.pool || 'default'),
              ErrorType.NOT_FOUND,
              404
            )
          );
        }
        
        // Handle validation errors
        if (error.status === 400 || error.message?.includes('invalid') || error.message?.includes('required')) {
          return errorToMcpResult(
            new MaasServerError(
              ErrorMessages.operationFailed('allocate', 'machine', error.message || 'Invalid parameters'),
              ErrorType.VALIDATION,
              400,
              { originalError: error.message }
            )
          );
        }
        
        // Handle authentication errors
        if (error.status === 401 || error.message?.includes('auth') || error.message?.includes('unauthorized')) {
          return errorToMcpResult(
            new MaasServerError(
              ErrorMessages.authenticationFailed(error.message),
              ErrorType.AUTHENTICATION,
              401
            )
          );
        }
        
        // Handle permission errors
        if (error.status === 403 || error.message?.includes('permission') || error.message?.includes('forbidden')) {
          return errorToMcpResult(
            new MaasServerError(
              ErrorMessages.permissionDenied('allocate', 'machine'),
              ErrorType.PERMISSION_DENIED,
              403
            )
          );
        }
        
        // Handle resource conflict errors
        if (error.status === 409 || error.message?.includes('conflict') || error.message?.includes('already exists')) {
          return errorToMcpResult(
            new MaasServerError(
              ErrorMessages.resourceConflict('Machine', payload.hostname || 'unknown'),
              ErrorType.RESOURCE_CONFLICT,
              409
            )
          );
        }
        
        // Handle network errors
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
          return errorToMcpResult(
            new MaasServerError(
              ErrorMessages.networkError(error.message || error.code),
              ErrorType.NETWORK_ERROR,
              500
            )
          );
        }
        
        // Default to generic MAAS API error
        return errorToMcpResult(
          handleMaasApiError(error)
        );
      }
    }
  );
}