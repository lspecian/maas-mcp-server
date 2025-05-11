import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MaasApiClient } from '../maas/MaasApiClient.js';
import { basePostRequestSchema, postSuccessResponseSchema } from './schemas/writeOps.js';
import { createRequestLogger } from '../utils/logger.js';
import { metaSchema } from './schemas/common.js';

const createNetworkPayloadSchema = z.object({
  name: z.string().describe('The name of the network.'),
  fabric: z.string().describe('The name or ID of the fabric this network belongs to.'),
  vlan_tag: z.number().int().optional().describe('The VLAN tag for this network (if applicable).'),
  cidr: z.string().optional().describe('The CIDR for the primary subnet on this network (e.g., 192.168.1.0/24).'),
  gateway_ip: z.string().optional().describe('The gateway IP for the primary subnet.'),
  dns_servers: z.array(z.string()).optional().describe('List of DNS servers for the primary subnet.'),
  // MAAS API for network/subnet creation can be complex, e.g. POST /fabrics/{fabric_id}/vlans/{vlan_tag}/spaces/{space_id}/subnets
  // This schema might need to be adjusted based on the exact endpoint and parameters used.
  // For simplicity, assuming a more direct network creation or that subnets are created separately.
  // If creating a subnet directly, additional fields like 'space' would be needed.
}).describe('Payload for creating a MAAS network/subnet');

export const createNetworkRequestSchema = basePostRequestSchema(createNetworkPayloadSchema);

export function registerCreateNetworkTool(server: McpServer, maasClient: MaasApiClient): void {
  const toolSchema = z.object({
    ...createNetworkRequestSchema.shape,
    _meta: metaSchema.optional(),
  }).describe('Creates a new network (or potentially a subnet within a fabric/VLAN/space) in MAAS.');

  server.tool(
    'maas_create_network',
    toolSchema.shape,
    async (
      params: z.infer<typeof toolSchema>,
      extra: { id?: string; signal?: AbortSignal; sendNotification?: (notification: any) => Promise<void> }
    ) => {
      const { payload } = params;
      const requestId = extra.id || Date.now().toString(36);
      const logger = createRequestLogger(requestId, 'maas_create_network', params);
      logger.info('Attempting to create network...');
      const { signal, sendNotification } = extra;
      const progressToken = params._meta?.progressToken;

      try {
        if (progressToken && sendNotification) {
          await sendNotification({
            method: "notifications/progress",
            params: { progressToken, progress: 0, total: 100, message: "Initiating network creation..." }
          });
        }

        const maasPayload: Record<string, any> = { ...payload };
        Object.keys(maasPayload).forEach(key => {
          if (maasPayload[key] === undefined) {
            delete maasPayload[key];
          }
        });

        // The MAAS API endpoint for creating networks/subnets can vary.
        // Example: POST /networks or POST /fabrics/{fabric_id}/vlans/{vlan_tag}/spaces/{space_id}/subnets
        // This example assumes a generic POST /networks. Adjust if a more specific endpoint is needed.
        // If creating a subnet, the path would be more complex and require fabric_id, vlan_tag, space_id.
        // Potentially adjust apiPath and maasPayload based on specific fields like fabric, vlan_tag, etc.
        // For example, if fabric and vlan_tag are provided, it might imply creating a subnet.
        // This logic would need to be more sophisticated based on MAAS API structure.
        // For now, keeping it simple.
        const apiPath = '/networks';

        logger.debug({ maasPayload, apiPath }, `Sending payload to MAAS API ${apiPath}`);
        if (progressToken && sendNotification) {
          await sendNotification({
            method: "notifications/progress",
            params: { progressToken, progress: 30, total: 100, message: "Contacting MAAS API..." }
          });
        }

        const result = await maasClient.post(apiPath, maasPayload, signal);
        
        if (progressToken && sendNotification) {
          await sendNotification({
            method: "notifications/progress",
            params: { progressToken, progress: 70, total: 100, message: "Network creation API call successful." }
          });
        }
        // MAAS response for network/subnet creation might vary. Assuming 'id' or 'resource_uri'.
        const createdId = result.id || result.resource_uri || (result[0] ? result[0].id : undefined); 
        logger.info({ networkId: createdId }, 'Network created successfully.');
        
        const successResponseData = {
          id: createdId,
          message: 'Network created successfully.',
        };
        
        const validatedSuccessOutput = postSuccessResponseSchema.parse({
            success: true,
            data: successResponseData
        });

        if (progressToken && sendNotification) {
          await sendNotification({
            method: "notifications/progress",
            params: { progressToken, progress: 100, total: 100, message: "Network created successfully." }
          });
        }
        return {
          content: [{ type: "text", text: JSON.stringify(validatedSuccessOutput) }]
        };

      } catch (error: any) {
        logger.error({ error: error.message, stack: error.stack }, 'Failed to create network.');
        if (progressToken && sendNotification) {
          await sendNotification({
            method: "notifications/progress",
            params: { progressToken, progress: 100, total: 100, message: `Error: ${error.message}` }
          });
        }
        return {
          content: [{ type: "text", text: `Failed to create network: ${error.message}` }],
          isError: true
        };
      }
    }
  );
}