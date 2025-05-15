import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MaasApiClient } from "../maas/MaasApiClient.ts";
import {
  DEVICE_DETAILS_URI_PATTERN,
  DEVICES_LIST_URI_PATTERN,
  MaasDeviceSchema,
  GetDeviceParamsSchema
} from './schemas/deviceResourceSchema.ts';
import logger from '../utils/logger.ts';
import { MaasApiError } from '../types/maas.ts';
import { ZodError } from 'zod';

/**
 * ResourceTemplate for fetching details of a single MAAS device.
 * Defines the URI pattern used to identify specific device detail requests.
 * The URI pattern expects a 'system_id' parameter.
 * Example URI: maas://devices/{system_id}
 */
export const deviceDetailsTemplate = new ResourceTemplate(
  DEVICE_DETAILS_URI_PATTERN,
  { list: undefined } // Indicates this is not a list/collection endpoint
);

/**
 * ResourceTemplate for fetching a list of all MAAS devices.
 * Defines the URI pattern used to identify requests for the devices collection.
 * Example URI: maas://devices
 */
export const devicesListTemplate = new ResourceTemplate(
  DEVICES_LIST_URI_PATTERN,
  { list: undefined } // Indicates this is a list/collection endpoint
);

/**
 * Registers the device details resource with the MCP server.
 * This function sets up a handler that can extract `system_id` from the URI
 * and fetch device details accordingly, with AbortSignal support.
 *
 * @param server The MCP server instance.
 * @param maasClient The MAAS API client instance.
 */
export function registerDeviceDetailsResource(server: McpServer, maasClient: MaasApiClient) {
  server.resource(
    "maas_device_details",
    deviceDetailsTemplate,
    async (uri, params, { signal }) => {
      // Validate system_id parameter
      try {
        const validatedParams = GetDeviceParamsSchema.parse(params);
        const { system_id } = validatedParams;
        
        if (!system_id || system_id.trim() === '') {
          logger.error('System ID is missing or empty in the resource URI');
          throw new MaasApiError(
            'System ID is missing or empty in the resource URI',
            400,
            'missing_parameter'
          );
        }
        
        logger.info(`Fetching details for MAAS device: ${system_id}`);

        try {
          // Pass signal to MaasApiClient method to fetch the specific device
          const deviceDetails = await maasClient.get(`/devices/${system_id}/`, undefined, signal);
          
          // Check if the response is empty or null
          if (!deviceDetails) {
            logger.error(`Device not found: ${system_id}`);
            throw new MaasApiError(
              `Device '${system_id}' not found`,
              404,
              'resource_not_found'
            );
          }
          
          // Validate response against schema
          try {
            const validatedData = MaasDeviceSchema.parse(deviceDetails);
            logger.info(`Successfully fetched details for MAAS device: ${system_id}`);
            
            // Create a JSON string of the validated data
            const jsonString = JSON.stringify(validatedData);
            
            // Return in the format expected by the SDK
            return {
              contents: [{
                uri: uri.toString(),
                text: jsonString,
                mimeType: "application/json"
              }]
            };
          } catch (validationError) {
            if (validationError instanceof ZodError) {
              logger.error(`Device data validation failed for device ${system_id}`, {
                error: validationError.message,
                issues: validationError.errors
              });
              throw new MaasApiError(
                `Device data validation failed for '${system_id}': The MAAS API returned data in an unexpected format`,
                422,
                'validation_error',
                { zodErrors: validationError.errors }
              );
            }
            throw validationError; // Re-throw if it's not a ZodError
          }
        } catch (error: any) {
          // Handle different error types
          if (error instanceof MaasApiError) {
            // Already a MaasApiError, just log and re-throw
            logger.error(`MAAS API error fetching device details for ${system_id}: ${error.message}`, {
              statusCode: error.statusCode,
              errorCode: error.maasErrorCode
            });
            
            // Special handling for 404 errors
            if (error.statusCode === 404) {
              throw new MaasApiError(
                `Device '${system_id}' not found`,
                404,
                'resource_not_found'
              );
            }
            
            throw error;
          } else if (error.name === 'AbortError') {
            // Request was aborted
            logger.warn(`Device details request for ${system_id} was aborted`);
            throw new MaasApiError(
              `Device details request for '${system_id}' was aborted by the client`,
              499,
              'request_aborted'
            );
          } else if (error.cause?.code === 'ECONNREFUSED' || error.cause?.code === 'ENOTFOUND') {
            // Network connectivity issues
            logger.error(`Network error fetching device details for ${system_id}: ${error.message}`, {
              code: error.cause?.code,
              errno: error.cause?.errno
            });
            throw new MaasApiError(
              'Failed to connect to MAAS API: Network connectivity issue',
              503,
              'network_error',
              { originalError: error.message }
            );
          } else if (error.cause?.code === 'ETIMEDOUT') {
            // Timeout issues
            logger.error(`Timeout error fetching device details for ${system_id}: ${error.message}`);
            throw new MaasApiError(
              `MAAS API request timed out while fetching device details for '${system_id}'`,
              504,
              'request_timeout',
              { originalError: error.message }
            );
          } else {
            // Generic error handling
            logger.error(`Unexpected error fetching details for MAAS device ${system_id}: ${error.message}`, {
              stack: error.stack
            });
            throw new MaasApiError(
              `Could not fetch details for MAAS device '${system_id}': ${error.message}`,
              500,
              'unexpected_error',
              { originalError: error.message }
            );
          }
        }
      } catch (paramError) {
        if (paramError instanceof ZodError) {
          logger.error('Invalid parameters for device details request', {
            error: paramError.message,
            issues: paramError.errors
          });
          throw new MaasApiError(
            'Invalid parameters for device details request',
            400,
            'invalid_parameters',
            { zodErrors: paramError.errors }
          );
        }
        // If it's already a MaasApiError, just re-throw it
        if (paramError instanceof MaasApiError) {
          throw paramError;
        }
        // Otherwise, wrap it
        const errorMessage = paramError instanceof Error ? paramError.message : 'Unknown error';
        logger.error(`Error processing device details request: ${errorMessage}`);
        throw new MaasApiError(
          `Error processing device details request: ${errorMessage}`,
          500,
          'unexpected_error'
        );
      }
    }
  );
}

/**
 * Registers the devices list resource with the MCP server.
 * This function sets up a handler that fetches all devices from the MAAS API,
 * with AbortSignal support.
 *
 * @param server The MCP server instance.
 * @param maasClient The MAAS API client instance.
 */
export function registerDevicesListResource(server: McpServer, maasClient: MaasApiClient) {
  server.resource(
    "maas_devices_list",
    devicesListTemplate,
    async (uri, params, { signal }) => {
      logger.info('Fetching MAAS devices list');

      try {
        // Pass signal to MaasApiClient method to fetch all devices
        const devicesList = await maasClient.get('/devices/', undefined, signal);
        
        if (!Array.isArray(devicesList)) {
          logger.error('Invalid response format: Expected an array of devices');
          throw new MaasApiError('Invalid response format: Expected an array of devices', 500, 'invalid_response_format');
        }

        // Validate response against schema
        try {
          const validatedData = devicesList.map((device: any) => MaasDeviceSchema.parse(device));
          logger.info(`Successfully fetched ${validatedData.length} MAAS devices`);
          
          // Create a JSON string of the validated data
          const jsonString = JSON.stringify(validatedData);
          
          // Return in the format expected by the SDK
          return {
            contents: [{
              uri: uri.toString(),
              text: jsonString,
              mimeType: "application/json"
            }]
          };
        } catch (validationError) {
          if (validationError instanceof ZodError) {
            logger.error('Device data validation failed', {
              error: validationError.message,
              issues: validationError.errors
            });
            throw new MaasApiError(
              'Device data validation failed: The MAAS API returned data in an unexpected format',
              422,
              'validation_error',
              { zodErrors: validationError.errors }
            );
          }
          throw validationError; // Re-throw if it's not a ZodError
        }
      } catch (error: any) {
        // Handle different error types
        if (error instanceof MaasApiError) {
          // Already a MaasApiError, just log and re-throw
          logger.error(`MAAS API error fetching devices list: ${error.message}`, {
            statusCode: error.statusCode,
            errorCode: error.maasErrorCode
          });
          throw error;
        } else if (error.name === 'AbortError') {
          // Request was aborted
          logger.warn('Devices list request was aborted');
          throw new MaasApiError('Devices list request was aborted by the client', 499, 'request_aborted');
        } else if (error.cause?.code === 'ECONNREFUSED' || error.cause?.code === 'ENOTFOUND') {
          // Network connectivity issues
          logger.error(`Network error fetching devices list: ${error.message}`, {
            code: error.cause?.code,
            errno: error.cause?.errno
          });
          throw new MaasApiError(
            'Failed to connect to MAAS API: Network connectivity issue',
            503,
            'network_error',
            { originalError: error.message }
          );
        } else if (error.cause?.code === 'ETIMEDOUT') {
          // Timeout issues
          logger.error(`Timeout error fetching devices list: ${error.message}`);
          throw new MaasApiError(
            'MAAS API request timed out while fetching devices list',
            504,
            'request_timeout',
            { originalError: error.message }
          );
        } else {
          // Generic error handling
          logger.error(`Unexpected error fetching MAAS devices list: ${error.message}`, {
            stack: error.stack
          });
          throw new MaasApiError(
            `Could not fetch MAAS devices list: ${error.message}`,
            500,
            'unexpected_error',
            { originalError: error.message }
          );
        }
      }
    }
  );
}

/**
 * Registers all device-related resources with the MCP server.
 * This function is a wrapper that calls both registerDeviceDetailsResource and registerDevicesListResource.
 *
 * @param server The MCP server instance.
 * @param maasClient The MAAS API client instance.
 */
export function registerDeviceResource(server: McpServer, maasClient: MaasApiClient) {
  registerDeviceDetailsResource(server, maasClient);
  registerDevicesListResource(server, maasClient);
  
  logger.info('Registered MAAS device resources');
}