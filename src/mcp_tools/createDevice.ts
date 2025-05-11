import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MaasApiClient } from '../maas/MaasApiClient.js';
import { basePostRequestSchema, postSuccessResponseSchema } from './schemas/writeOps.js';
import { createRequestLogger } from '../utils/logger.js';
import { metaSchema } from './schemas/common.js';

const createDevicePayloadSchema = z.object({
  name: z.string().describe('The name of the device.'),
  parent: z.string().optional().describe('The system_id of the parent machine or device.'),
  mac_address: z.string().optional().describe('The MAC address of the device.'),
  tags: z.array(z.string()).optional().describe('List of tags to apply to the device.'),
  zone: z.string().optional().describe('Name or ID of the zone for the device.'),
  // Add other MAAS specific fields for device creation based on API docs
}).describe('Payload for creating a MAAS device');

export const createDeviceRequestSchema = basePostRequestSchema(createDevicePayloadSchema);

export function registerCreateDeviceTool(server: McpServer, maasClient: MaasApiClient): void {
  const toolSchema = z.object({
    ...createDeviceRequestSchema.shape,
    _meta: metaSchema.optional(),
  }).describe('Creates a new device in MAAS. Defines parameters for device creation including name, parent, MAC address, tags, and zone.');

  server.tool(
    'maas_create_device',
    toolSchema.shape,
    async (
      params: z.infer<typeof toolSchema>,
      extra: { id?: string; signal?: AbortSignal; sendNotification?: (notification: any) => Promise<void> }
    ) => {
      const { payload } = params;
      const requestId = extra.id || Date.now().toString(36);
      const logger = createRequestLogger(requestId, 'maas_create_device', params);
      logger.info('Attempting to create device...');
      const { signal, sendNotification } = extra;
      const progressToken = params._meta?.progressToken;

      try {
        if (progressToken && sendNotification) {
          await sendNotification({
            method: "notifications/progress",
            params: { progressToken, progress: 0, total: 100, message: "Initiating device creation..." }
          });
        }

        const maasPayload: Record<string, any> = { ...payload };
        Object.keys(maasPayload).forEach(key => {
          if (maasPayload[key] === undefined) {
            delete maasPayload[key];
          }
        });

        logger.debug({ maasPayload }, 'Sending payload to MAAS API /devices');
        if (progressToken && sendNotification) {
          await sendNotification({
            method: "notifications/progress",
            params: { progressToken, progress: 30, total: 100, message: "Contacting MAAS API..." }
          });
        }

        // Assuming MAAS API endpoint for creating a device is POST /devices
        const result = await maasClient.post('/devices', maasPayload, signal);
        
        if (progressToken && sendNotification) {
          await sendNotification({
            method: "notifications/progress",
            params: { progressToken, progress: 70, total: 100, message: "Device creation API call successful." }
          });
        }
        logger.info({ deviceId: result.system_id || result.id }, 'Device created successfully.'); // Adjust based on actual MAAS response
        
        const successResponseData = {
          id: result.system_id || result.id, // Adjust based on actual MAAS response
          message: 'Device created successfully.',
        };
        
        const validatedSuccessOutput = postSuccessResponseSchema.parse({
            success: true,
            data: successResponseData
        });

        if (progressToken && sendNotification) {
          await sendNotification({
            method: "notifications/progress",
            params: { progressToken, progress: 100, total: 100, message: "Device created successfully." }
          });
        }
        return {
          content: [{ type: "text", text: JSON.stringify(validatedSuccessOutput) }]
        };

      } catch (error: any) {
        logger.error({ error: error.message, stack: error.stack }, 'Failed to create device.');
        if (progressToken && sendNotification) {
          await sendNotification({
            method: "notifications/progress",
            params: { progressToken, progress: 100, total: 100, message: `Error: ${error.message}` }
          });
        }
        return {
          content: [{ type: "text", text: `Failed to create device: ${error.message}` }],
          isError: true
        };
      }
    }
  );
}