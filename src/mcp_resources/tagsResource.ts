const path = require('path');
const sdkPath = path.join(__dirname, '..', '..', 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'cjs');
const { McpServer, ResourceTemplate } = require(path.join(sdkPath, 'server', 'mcp.js'));
const { MaasApiClient } = require("../maas/MaasApiClient");
const { z } = require('zod');
const {
  TAGS_LIST_URI_PATTERN,
  TAG_DETAILS_URI_PATTERN,
  TAG_MACHINES_URI_PATTERN,
  MaasTagSchema,
  GetTagParamsSchema,
  GetTagMachinesParamsSchema
} = require('./schemas/tagResourcesSchema');
const logger = require('../utils/logger');
const { ConfigurationError } = require('../utils/errorHandler');
const { MaasApiError } = require('../types/maas');
const { ZodError } = require('zod');

/**
 * ResourceTemplate for fetching a list of all MAAS tags.
 * Defines the URI pattern used to identify requests for the tags collection.
 * Example URI: maas://tags
 */
const tagsListResource = new ResourceTemplate({
  uriPattern: TAGS_LIST_URI_PATTERN,
  schema: MaasTagSchema.array(),
  handler: async (uri, params, signal) => {
    try {
      // Fetch tags from MAAS API
      const tags = await maasClient.get('/tags/');
      return tags;
    } catch (error) {
      logger.error({ error }, 'Error fetching tags list');
      if (error instanceof MaasApiError) {
        throw error;
      }
      throw new ConfigurationError('Failed to fetch tags list', { cause: error });
    }
  }
});

/**
 * ResourceTemplate for fetching details of a specific MAAS tag.
 * Defines the URI pattern used to identify requests for a specific tag.
 * Example URI: maas://tag/my-tag/details
 */
const tagDetailsResource = new ResourceTemplate({
  uriPattern: TAG_DETAILS_URI_PATTERN,
  schema: MaasTagSchema,
  paramsSchema: GetTagParamsSchema,
  handler: async (uri, params, signal) => {
    try {
      // Validate parameters
      const { tag_name } = params;
      
      // Fetch tag details from MAAS API
      const tag = await maasClient.get(`/tags/${tag_name}/`);
      return tag;
    } catch (error) {
      logger.error({ error, params }, 'Error fetching tag details');
      if (error instanceof ZodError) {
        throw new ConfigurationError('Invalid tag parameters', { cause: error });
      }
      if (error instanceof MaasApiError) {
        throw error;
      }
      throw new ConfigurationError('Failed to fetch tag details', { cause: error });
    }
  }
});

/**
 * ResourceTemplate for fetching machines with a specific MAAS tag.
 * Defines the URI pattern used to identify requests for machines with a tag.
 * Example URI: maas://tag/my-tag/machines
 */
const tagMachinesResource = new ResourceTemplate({
  uriPattern: TAG_MACHINES_URI_PATTERN,
  schema: z.array(z.object({
    system_id: z.string(),
    hostname: z.string(),
    status: z.string(),
    // Add more fields as needed
  })),
  paramsSchema: GetTagMachinesParamsSchema,
  handler: async (uri, params, signal) => {
    try {
      // Validate parameters
      const { tag_name } = params;
      
      // Fetch machines with this tag from MAAS API
      const machines = await maasClient.get(`/tags/${tag_name}/machines/`);
      return machines;
    } catch (error) {
      logger.error({ error, params }, 'Error fetching machines with tag');
      if (error instanceof ZodError) {
        throw new ConfigurationError('Invalid tag parameters', { cause: error });
      }
      if (error instanceof MaasApiError) {
        throw error;
      }
      throw new ConfigurationError('Failed to fetch machines with tag', { cause: error });
    }
  }
});

// Reference to the MAAS API client, set during registration
let maasClient;

/**
 * Register tag resources with the MCP server
 * 
 * @param {McpServer} server - The MCP server instance
 * @param {MaasApiClient} client - The MAAS API client instance
 */
function registerTagsResource(server, client) {
  maasClient = client;
  
  // Register all tag-related resources
  server.resource("tagsList", tagsListResource);
  server.resource("tagDetails", tagDetailsResource);
  server.resource("tagMachines", tagMachinesResource);
  
  logger.info('Registered MAAS tag resources');
}

module.exports = { registerTagsResource };