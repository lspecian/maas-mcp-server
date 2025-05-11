import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MaasApiClient } from "../maas/MaasApiClient.js";
import {
  TAGS_LIST_URI_PATTERN,
  TAG_DETAILS_URI_PATTERN,
  TAG_MACHINES_URI_PATTERN,
  MaasTagSchema,
  GetTagParamsSchema,
  GetTagMachinesParamsSchema
} from './schemas/tagResourcesSchema.js';
import logger from '../utils/logger.js';
import { ConfigurationError } from '../utils/errorHandler.js';
import { MaasApiError } from '../types/maas.js';
import { ZodError } from 'zod';

/**
 * ResourceTemplate for fetching a list of all MAAS tags.
 * Defines the URI pattern used to identify requests for the tags collection.
 * Example URI: maas://tags
 */
export const tagsListTemplate = new ResourceTemplate(
  TAGS_LIST_URI_PATTERN,
  { list: undefined } // Indicates this is a list/collection endpoint
);

/**
 * ResourceTemplate for fetching details of a single MAAS tag.
 * Defines the URI pattern used to identify specific tag detail requests.
 * The URI pattern expects a 'tag_name' parameter.
 * Example URI: maas://tags/{tag_name}
 */
export const tagDetailsTemplate = new ResourceTemplate(
  TAG_DETAILS_URI_PATTERN,
  { list: undefined } // Indicates this is not a list/collection endpoint
);

/**
 * ResourceTemplate for fetching a list of MAAS machines associated with a specific tag.
 * Defines the URI pattern used to identify requests for machines filtered by a tag.
 * The URI pattern expects a 'tag_name' parameter.
 * Example URI: maas://tags/{tag_name}/machines
 */
export const tagMachinesTemplate = new ResourceTemplate(
  TAG_MACHINES_URI_PATTERN,
  { list: undefined } // Indicates this is a list/collection endpoint
);

/**
 * Registers the tag list resource with the MCP server.
 * This function sets up a handler that fetches all tags from the MAAS API,
 * with AbortSignal support.
 *
 * @param server The MCP server instance.
 * @param maasClient The MAAS API client instance.
 */
export function registerTagsListResource(server: McpServer, maasClient: MaasApiClient) {
  server.resource(
    "maas_tags_list",
    tagsListTemplate,
    async (uri, params, { signal }) => {
      logger.info('Fetching MAAS tags list');

      try {
        // Pass signal to MaasApiClient method to fetch all tags
        const tagsList = await maasClient.get('/tags/', undefined, signal);
        
        if (!Array.isArray(tagsList)) {
          logger.error('Invalid response format: Expected an array of tags');
          throw new MaasApiError('Invalid response format: Expected an array of tags', 500, 'invalid_response_format');
        }

        // Validate response against schema
        try {
          const validatedData = tagsList.map((tag: any) => MaasTagSchema.parse(tag));
          logger.info(`Successfully fetched ${validatedData.length} MAAS tags`);
          
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
            logger.error('Tag data validation failed', {
              error: validationError.message,
              issues: validationError.errors
            });
            throw new MaasApiError(
              'Tag data validation failed: The MAAS API returned data in an unexpected format',
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
          logger.error(`MAAS API error fetching tags list: ${error.message}`, {
            statusCode: error.statusCode,
            errorCode: error.maasErrorCode
          });
          throw error;
        } else if (error.name === 'AbortError') {
          // Request was aborted
          logger.warn('Tags list request was aborted');
          throw new MaasApiError('Tags list request was aborted by the client', 499, 'request_aborted');
        } else if (error.cause?.code === 'ECONNREFUSED' || error.cause?.code === 'ENOTFOUND') {
          // Network connectivity issues
          logger.error(`Network error fetching tags list: ${error.message}`, {
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
          logger.error(`Timeout error fetching tags list: ${error.message}`);
          throw new MaasApiError(
            'MAAS API request timed out while fetching tags list',
            504,
            'request_timeout',
            { originalError: error.message }
          );
        } else {
          // Generic error handling
          logger.error(`Unexpected error fetching MAAS tags list: ${error.message}`, {
            stack: error.stack
          });
          throw new MaasApiError(
            `Could not fetch MAAS tags list: ${error.message}`,
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
 * Registers the tag details resource with the MCP server.
 * This function sets up a handler that fetches details for a specific tag from the MAAS API,
 * with AbortSignal support.
 *
 * @param server The MCP server instance.
 * @param maasClient The MAAS API client instance.
 */
export function registerTagDetailsResource(server: McpServer, maasClient: MaasApiClient) {
  server.resource(
    "maas_tag_details",
    tagDetailsTemplate,
    async (uri, params, { signal }) => {
      // Validate tag_name parameter
      try {
        const validatedParams = GetTagParamsSchema.parse(params);
        const { tag_name } = validatedParams;
        
        if (!tag_name || tag_name.trim() === '') {
          logger.error('Tag name is missing or empty in the resource URI');
          throw new MaasApiError(
            'Tag name is missing or empty in the resource URI',
            400,
            'missing_parameter'
          );
        }
        
        // Check for invalid characters in tag_name
        if (!/^[a-zA-Z0-9_-]+$/.test(tag_name)) {
          logger.error(`Invalid tag name format: ${tag_name}`);
          throw new MaasApiError(
            'Tag name contains invalid characters. Only alphanumeric characters, underscores, and hyphens are allowed.',
            400,
            'invalid_parameter_format'
          );
        }
        
        logger.info(`Fetching details for MAAS tag: ${tag_name}`);

        try {
          // Pass signal to MaasApiClient method to fetch the specific tag
          const tagDetails = await maasClient.get(`/tags/${tag_name}/`, undefined, signal);
          
          // Check if the response is empty or null
          if (!tagDetails) {
            logger.error(`Tag not found: ${tag_name}`);
            throw new MaasApiError(
              `Tag '${tag_name}' not found`,
              404,
              'resource_not_found'
            );
          }
          
          // Validate response against schema
          try {
            const validatedData = MaasTagSchema.parse(tagDetails);
            logger.info(`Successfully fetched details for MAAS tag: ${tag_name}`);
            
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
              logger.error(`Tag data validation failed for tag ${tag_name}`, {
                error: validationError.message,
                issues: validationError.errors
              });
              throw new MaasApiError(
                `Tag data validation failed for '${tag_name}': The MAAS API returned data in an unexpected format`,
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
            logger.error(`MAAS API error fetching tag details for ${tag_name}: ${error.message}`, {
              statusCode: error.statusCode,
              errorCode: error.maasErrorCode
            });
            
            // Special handling for 404 errors
            if (error.statusCode === 404) {
              throw new MaasApiError(
                `Tag '${tag_name}' not found`,
                404,
                'resource_not_found'
              );
            }
            
            throw error;
          } else if (error.name === 'AbortError') {
            // Request was aborted
            logger.warn(`Tag details request for ${tag_name} was aborted`);
            throw new MaasApiError(
              `Tag details request for '${tag_name}' was aborted by the client`,
              499,
              'request_aborted'
            );
          } else if (error.cause?.code === 'ECONNREFUSED' || error.cause?.code === 'ENOTFOUND') {
            // Network connectivity issues
            logger.error(`Network error fetching tag details for ${tag_name}: ${error.message}`, {
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
            logger.error(`Timeout error fetching tag details for ${tag_name}: ${error.message}`);
            throw new MaasApiError(
              `MAAS API request timed out while fetching tag details for '${tag_name}'`,
              504,
              'request_timeout',
              { originalError: error.message }
            );
          } else {
            // Generic error handling
            logger.error(`Unexpected error fetching details for MAAS tag ${tag_name}: ${error.message}`, {
              stack: error.stack
            });
            throw new MaasApiError(
              `Could not fetch details for MAAS tag '${tag_name}': ${error.message}`,
              500,
              'unexpected_error',
              { originalError: error.message }
            );
          }
        }
      } catch (paramError) {
        if (paramError instanceof ZodError) {
          logger.error('Invalid parameters for tag details request', {
            error: paramError.message,
            issues: paramError.errors
          });
          throw new MaasApiError(
            'Invalid parameters for tag details request',
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
        logger.error(`Error processing tag details request: ${errorMessage}`);
        throw new MaasApiError(
          `Error processing tag details request: ${errorMessage}`,
          500,
          'unexpected_error'
        );
      }
    }
  );
}

/**
 * Registers the tag machines resource with the MCP server.
 * This function sets up a handler that fetches machines with a specific tag from the MAAS API,
 * with AbortSignal support.
 *
 * @param server The MCP server instance.
 * @param maasClient The MAAS API client instance.
 */
export function registerTagMachinesResource(server: McpServer, maasClient: MaasApiClient) {
  server.resource(
    "maas_tag_machines",
    tagMachinesTemplate,
    async (uri, params, { signal }) => {
      // Validate tag_name parameter
      try {
        const validatedParams = GetTagMachinesParamsSchema.parse(params);
        const { tag_name } = validatedParams;
        
        if (!tag_name || tag_name.trim() === '') {
          logger.error('Tag name is missing or empty in the resource URI');
          throw new MaasApiError(
            'Tag name is missing or empty in the resource URI',
            400,
            'missing_parameter'
          );
        }
        
        // Check for invalid characters in tag_name
        if (!/^[a-zA-Z0-9_-]+$/.test(tag_name)) {
          logger.error(`Invalid tag name format: ${tag_name}`);
          throw new MaasApiError(
            'Tag name contains invalid characters. Only alphanumeric characters, underscores, and hyphens are allowed.',
            400,
            'invalid_parameter_format'
          );
        }
        
        logger.info(`Fetching machines with MAAS tag: ${tag_name}`);

        try {
          // First check if the tag exists
          try {
            await maasClient.get(`/tags/${tag_name}/`, undefined, signal);
          } catch (tagError: any) {
            // If the tag doesn't exist, return a specific error
            if (tagError.statusCode === 404) {
              logger.error(`Tag not found: ${tag_name}`);
              throw new MaasApiError(
                `Tag '${tag_name}' not found`,
                404,
                'resource_not_found'
              );
            }
            // For other errors, continue with the machines request
            // as the tag might exist but there was an error fetching its details
            logger.warn(`Error checking tag existence for ${tag_name}: ${tagError.message}. Proceeding with machines request.`);
          }
          
          // Use the MAAS API client to fetch machines with the specified tag
          // The MAAS API allows filtering machines by tag using the 'tags' query parameter
          const machines = await maasClient.get('/machines/', { tags: tag_name }, signal);
          
          // Check if the response is valid
          if (!Array.isArray(machines)) {
            logger.error('Invalid response format: Expected an array of machines');
            throw new MaasApiError(
              'Invalid response format: Expected an array of machines',
              500,
              'invalid_response_format'
            );
          }
          
          logger.info(`Successfully fetched ${machines.length} machines with tag: ${tag_name}`);
          
          // Create a JSON string of the machines data
          const jsonString = JSON.stringify(machines);
          
          // Return in the format expected by the SDK
          return {
            contents: [{
              uri: uri.toString(),
              text: jsonString,
              mimeType: "application/json"
            }]
          };
        } catch (error: any) {
          // Handle different error types
          if (error instanceof MaasApiError) {
            // Already a MaasApiError, just log and re-throw
            logger.error(`MAAS API error fetching machines with tag ${tag_name}: ${error.message}`, {
              statusCode: error.statusCode,
              errorCode: error.maasErrorCode
            });
            throw error;
          } else if (error.name === 'AbortError') {
            // Request was aborted
            logger.warn(`Machines with tag ${tag_name} request was aborted`);
            throw new MaasApiError(
              `Machines with tag '${tag_name}' request was aborted by the client`,
              499,
              'request_aborted'
            );
          } else if (error.cause?.code === 'ECONNREFUSED' || error.cause?.code === 'ENOTFOUND') {
            // Network connectivity issues
            logger.error(`Network error fetching machines with tag ${tag_name}: ${error.message}`, {
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
            logger.error(`Timeout error fetching machines with tag ${tag_name}: ${error.message}`);
            throw new MaasApiError(
              `MAAS API request timed out while fetching machines with tag '${tag_name}'`,
              504,
              'request_timeout',
              { originalError: error.message }
            );
          } else {
            // Generic error handling
            logger.error(`Unexpected error fetching machines with MAAS tag ${tag_name}: ${error.message}`, {
              stack: error.stack
            });
            throw new MaasApiError(
              `Could not fetch machines with MAAS tag '${tag_name}': ${error.message}`,
              500,
              'unexpected_error',
              { originalError: error.message }
            );
          }
        }
      } catch (paramError) {
        if (paramError instanceof ZodError) {
          logger.error('Invalid parameters for tag machines request', {
            error: paramError.message,
            issues: paramError.errors
          });
          throw new MaasApiError(
            'Invalid parameters for tag machines request',
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
        logger.error(`Error processing tag machines request: ${errorMessage}`);
        throw new MaasApiError(
          `Error processing tag machines request: ${errorMessage}`,
          500,
          'unexpected_error'
        );
      }
    }
  );
}