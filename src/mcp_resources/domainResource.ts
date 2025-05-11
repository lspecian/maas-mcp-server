import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MaasApiClient } from "../maas/MaasApiClient.js";
import {
  DOMAIN_DETAILS_URI_PATTERN,
  DOMAINS_LIST_URI_PATTERN,
  MaasDomainSchema,
  GetDomainParamsSchema
} from './schemas/domainResourceSchema.js';
import logger from '../utils/logger.js';
import { MaasApiError } from '../types/maas.js';
import { ZodError } from 'zod';

/**
 * ResourceTemplate for fetching details of a single MAAS domain.
 * Defines the URI pattern used to identify specific domain detail requests.
 * The URI pattern expects a 'domain_id' parameter (which can be an ID or name).
 * Example URI: maas://domains/{domain_id}
 */
export const domainDetailsTemplate = new ResourceTemplate(
  DOMAIN_DETAILS_URI_PATTERN,
  { list: undefined } // Indicates this is not a list/collection endpoint
);

/**
 * ResourceTemplate for fetching a list of all MAAS domains.
 * Defines the URI pattern used to identify requests for the domains collection.
 * Example URI: maas://domains
 */
export const domainsListTemplate = new ResourceTemplate(
  DOMAINS_LIST_URI_PATTERN,
  { list: undefined } // Indicates this is a list/collection endpoint
);

/**
 * Registers the domain details resource with the MCP server.
 * This function sets up a handler that can extract `domain_id` from the URI
 * and fetch domain details accordingly, with AbortSignal support.
 *
 * @param server The MCP server instance.
 * @param maasClient The MAAS API client instance.
 */
export function registerDomainDetailsResource(server: McpServer, maasClient: MaasApiClient) {
  server.resource(
    "maas_domain_details",
    domainDetailsTemplate,
    async (uri, params, { signal }) => {
      // Validate domain_id parameter
      try {
        const validatedParams = GetDomainParamsSchema.parse(params);
        const { domain_id } = validatedParams;
        
        if (!domain_id || domain_id.trim() === '') {
          logger.error('Domain ID is missing or empty in the resource URI');
          throw new MaasApiError(
            'Domain ID is missing or empty in the resource URI',
            400,
            'missing_parameter'
          );
        }
        
        logger.info(`Fetching details for MAAS domain: ${domain_id}`);

        try {
          // Pass signal to MaasApiClient method to fetch the specific domain
          const domainDetails = await maasClient.get(`/domains/${domain_id}/`, undefined, signal);
          
          // Check if the response is empty or null
          if (!domainDetails) {
            logger.error(`Domain not found: ${domain_id}`);
            throw new MaasApiError(
              `Domain '${domain_id}' not found`,
              404,
              'resource_not_found'
            );
          }
          
          // Validate response against schema
          try {
            const validatedData = MaasDomainSchema.parse(domainDetails);
            logger.info(`Successfully fetched details for MAAS domain: ${domain_id}`);
            
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
              logger.error(`Domain data validation failed for domain ${domain_id}`, {
                error: validationError.message,
                issues: validationError.errors
              });
              throw new MaasApiError(
                `Domain data validation failed for '${domain_id}': The MAAS API returned data in an unexpected format`,
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
            logger.error(`MAAS API error fetching domain details for ${domain_id}: ${error.message}`, {
              statusCode: error.statusCode,
              errorCode: error.maasErrorCode
            });
            
            // Special handling for 404 errors
            if (error.statusCode === 404) {
              throw new MaasApiError(
                `Domain '${domain_id}' not found`,
                404,
                'resource_not_found'
              );
            }
            
            throw error;
          } else if (error.name === 'AbortError') {
            // Request was aborted
            logger.warn(`Domain details request for ${domain_id} was aborted`);
            throw new MaasApiError(
              `Domain details request for '${domain_id}' was aborted by the client`,
              499,
              'request_aborted'
            );
          } else if (error.cause?.code === 'ECONNREFUSED' || error.cause?.code === 'ENOTFOUND') {
            // Network connectivity issues
            logger.error(`Network error fetching domain details for ${domain_id}: ${error.message}`, {
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
            logger.error(`Timeout error fetching domain details for ${domain_id}: ${error.message}`);
            throw new MaasApiError(
              `MAAS API request timed out while fetching domain details for '${domain_id}'`,
              504,
              'request_timeout',
              { originalError: error.message }
            );
          } else {
            // Generic error handling
            logger.error(`Unexpected error fetching details for MAAS domain ${domain_id}: ${error.message}`, {
              stack: error.stack
            });
            throw new MaasApiError(
              `Could not fetch details for MAAS domain '${domain_id}': ${error.message}`,
              500,
              'unexpected_error',
              { originalError: error.message }
            );
          }
        }
      } catch (paramError) {
        if (paramError instanceof ZodError) {
          logger.error('Invalid parameters for domain details request', {
            error: paramError.message,
            issues: paramError.errors
          });
          throw new MaasApiError(
            'Invalid parameters for domain details request',
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
        logger.error(`Error processing domain details request: ${errorMessage}`);
        throw new MaasApiError(
          `Error processing domain details request: ${errorMessage}`,
          500,
          'unexpected_error'
        );
      }
    }
  );
}

/**
 * Registers the domains list resource with the MCP server.
 * This function sets up a handler that fetches all domains from the MAAS API,
 * with AbortSignal support.
 *
 * @param server The MCP server instance.
 * @param maasClient The MAAS API client instance.
 */
export function registerDomainsListResource(server: McpServer, maasClient: MaasApiClient) {
  server.resource(
    "maas_domains_list",
    domainsListTemplate,
    async (uri, params, { signal }) => {
      logger.info('Fetching MAAS domains list');

      try {
        // Pass signal to MaasApiClient method to fetch all domains
        const domainsList = await maasClient.get('/domains/', undefined, signal);
        
        if (!Array.isArray(domainsList)) {
          logger.error('Invalid response format: Expected an array of domains');
          throw new MaasApiError('Invalid response format: Expected an array of domains', 500, 'invalid_response_format');
        }

        // Validate response against schema
        try {
          const validatedData = domainsList.map((domain: any) => MaasDomainSchema.parse(domain));
          logger.info(`Successfully fetched ${validatedData.length} MAAS domains`);
          
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
            logger.error('Domain data validation failed', {
              error: validationError.message,
              issues: validationError.errors
            });
            throw new MaasApiError(
              'Domain data validation failed: The MAAS API returned data in an unexpected format',
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
          logger.error(`MAAS API error fetching domains list: ${error.message}`, {
            statusCode: error.statusCode,
            errorCode: error.maasErrorCode
          });
          throw error;
        } else if (error.name === 'AbortError') {
          // Request was aborted
          logger.warn('Domains list request was aborted');
          throw new MaasApiError('Domains list request was aborted by the client', 499, 'request_aborted');
        } else if (error.cause?.code === 'ECONNREFUSED' || error.cause?.code === 'ENOTFOUND') {
          // Network connectivity issues
          logger.error(`Network error fetching domains list: ${error.message}`, {
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
          logger.error(`Timeout error fetching domains list: ${error.message}`);
          throw new MaasApiError(
            'MAAS API request timed out while fetching domains list',
            504,
            'request_timeout',
            { originalError: error.message }
          );
        } else {
          // Generic error handling
          logger.error(`Unexpected error fetching MAAS domains list: ${error.message}`, {
            stack: error.stack
          });
          throw new MaasApiError(
            `Could not fetch MAAS domains list: ${error.message}`,
            500,
            'unexpected_error',
            { originalError: error.message }
          );
        }
      }
    }
  );
}