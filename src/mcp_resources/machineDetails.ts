import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MaasApiClient } from "../maas/MaasApiClient.js";
import {
  MaasMachineSchema,
  GetMachineParamsSchema
} from './schemas/machineDetailsSchema.js';
import logger from '../utils/logger.js';
import { MaasApiError } from '../types/maas.js';
import { ZodError } from 'zod';

/**
 * Defines the URI pattern string for accessing details of a specific MAAS machine.
 * This pattern is used by the MCP server to route requests to the appropriate handler.
 * It includes a placeholder `{system_id}` for the machine's unique identifier.
 * Format: maas://machine/{system_id}/details
 */
export const MACHINE_DETAILS_URI_PATTERN = 'maas://machine/{system_id}/details';

/**
 * Defines the URI pattern string for listing all MAAS machines.
 * This pattern is used by the MCP server to route requests for the machine collection.
 * Format: maas://machines/list
 */
export const MACHINES_LIST_URI_PATTERN = 'maas://machines/list';

/**
 * ResourceTemplate for machine details
 */
export const machineDetailsTemplate = new ResourceTemplate(
  MACHINE_DETAILS_URI_PATTERN,
  { list: undefined }
);

/**
 * ResourceTemplate for machines list
 */
export const machinesListTemplate = new ResourceTemplate(
  MACHINES_LIST_URI_PATTERN,
  { list: undefined }
);

/**
 * Registers the machine details resource with the MCP server.
 * This function sets up a handler that can extract `system_id` from the URI
 * and fetch machine details accordingly, with AbortSignal support.
 *
 * @param server The MCP server instance.
 * @param maasClient The MAAS API client instance.
 */
export function registerMachineDetailsResource(server: McpServer, maasClient: MaasApiClient) {
  server.resource(
    "maas_machine_details",
    machineDetailsTemplate,
    async (uri, params, { signal }) => {
      // Validate system_id parameter
      try {
        const validatedParams = GetMachineParamsSchema.parse(params);
        const { system_id } = validatedParams;
        
        if (!system_id || system_id.trim() === '') {
          logger.error('System ID is missing or empty in the resource URI');
          throw new MaasApiError(
            'System ID is missing or empty in the resource URI',
            400,
            'missing_parameter'
          );
        }
        
        logger.info(`Fetching details for MAAS machine: ${system_id}`);

        try {
          // Pass signal to MaasApiClient method to fetch the specific machine
          const machineDetails = await maasClient.get(`/machines/${system_id}/`, undefined, signal);
          
          // Check if the response is empty or null
          if (!machineDetails) {
            logger.error(`Machine not found: ${system_id}`);
            throw new MaasApiError(
              `Machine '${system_id}' not found`,
              404,
              'resource_not_found'
            );
          }
          
          // Validate response against schema
          try {
            const validatedData = MaasMachineSchema.parse(machineDetails);
            logger.info(`Successfully fetched details for MAAS machine: ${system_id}`);
            
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
              logger.error(`Machine data validation failed for machine ${system_id}`, {
                error: validationError.message,
                issues: validationError.errors
              });
              throw new MaasApiError(
                `Machine data validation failed for '${system_id}': The MAAS API returned data in an unexpected format`,
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
            logger.error(`MAAS API error fetching machine details for ${system_id}: ${error.message}`, {
              statusCode: error.statusCode,
              errorCode: error.maasErrorCode
            });
            
            // Special handling for 404 errors
            if (error.statusCode === 404) {
              throw new MaasApiError(
                `Machine '${system_id}' not found`,
                404,
                'resource_not_found'
              );
            }
            
            throw error;
          } else if (error.name === 'AbortError') {
            // Request was aborted
            logger.warn(`Machine details request for ${system_id} was aborted`);
            throw new MaasApiError(
              `Machine details request for '${system_id}' was aborted by the client`,
              499,
              'request_aborted'
            );
          } else if (error.cause?.code === 'ECONNREFUSED' || error.cause?.code === 'ENOTFOUND') {
            // Network connectivity issues
            logger.error(`Network error fetching machine details for ${system_id}: ${error.message}`, {
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
            logger.error(`Timeout error fetching machine details for ${system_id}: ${error.message}`);
            throw new MaasApiError(
              `MAAS API request timed out while fetching machine details for '${system_id}'`,
              504,
              'request_timeout',
              { originalError: error.message }
            );
          } else {
            // Generic error handling
            logger.error(`Unexpected error fetching details for MAAS machine ${system_id}: ${error.message}`, {
              stack: error.stack
            });
            throw new MaasApiError(
              `Could not fetch details for MAAS machine '${system_id}': ${error.message}`,
              500,
              'unexpected_error',
              { originalError: error.message }
            );
          }
        }
      } catch (paramError) {
        if (paramError instanceof ZodError) {
          logger.error('Invalid parameters for machine details request', {
            error: paramError.message,
            issues: paramError.errors
          });
          throw new MaasApiError(
            'Invalid parameters for machine details request',
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
        logger.error(`Error processing machine details request: ${errorMessage}`);
        throw new MaasApiError(
          `Error processing machine details request: ${errorMessage}`,
          500,
          'unexpected_error'
        );
      }
    }
  );
}

/**
 * Registers the machines list resource with the MCP server.
 * This function sets up a handler that fetches all machines from the MAAS API,
 * with AbortSignal support.
 *
 * @param server The MCP server instance.
 * @param maasClient The MAAS API client instance.
 */
export function registerMachinesListResource(server: McpServer, maasClient: MaasApiClient) {
  server.resource(
    "maas_machines_list",
    machinesListTemplate,
    async (uri, params, { signal }) => {
      logger.info('Fetching MAAS machines list');

      try {
        // Pass signal to MaasApiClient method to fetch all machines
        const machinesList = await maasClient.get('/machines/', undefined, signal);
        
        if (!Array.isArray(machinesList)) {
          logger.error('Invalid response format: Expected an array of machines');
          throw new MaasApiError('Invalid response format: Expected an array of machines', 500, 'invalid_response_format');
        }

        // Validate response against schema
        try {
          const validatedData = machinesList.map((machine: any) => MaasMachineSchema.parse(machine));
          logger.info(`Successfully fetched ${validatedData.length} MAAS machines`);
          
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
            logger.error('Machine data validation failed', {
              error: validationError.message,
              issues: validationError.errors
            });
            throw new MaasApiError(
              'Machine data validation failed: The MAAS API returned data in an unexpected format',
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
          logger.error(`MAAS API error fetching machines list: ${error.message}`, {
            statusCode: error.statusCode,
            errorCode: error.maasErrorCode
          });
          throw error;
        } else if (error.name === 'AbortError') {
          // Request was aborted
          logger.warn('Machines list request was aborted');
          throw new MaasApiError('Machines list request was aborted by the client', 499, 'request_aborted');
        } else if (error.cause?.code === 'ECONNREFUSED' || error.cause?.code === 'ENOTFOUND') {
          // Network connectivity issues
          logger.error(`Network error fetching machines list: ${error.message}`, {
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
          logger.error(`Timeout error fetching machines list: ${error.message}`);
          throw new MaasApiError(
            'MAAS API request timed out while fetching machines list',
            504,
            'request_timeout',
            { originalError: error.message }
          );
        } else {
          // Generic error handling
          logger.error(`Unexpected error fetching MAAS machines list: ${error.message}`, {
            stack: error.stack
          });
          throw new MaasApiError(
            `Could not fetch MAAS machines list: ${error.message}`,
            500,
            'unexpected_error',
            { originalError: error.message }
          );
        }
      }
    }
  );
}