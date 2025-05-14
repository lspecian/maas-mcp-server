"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable */
// @ts-nocheck
const path = require('path');
const sdkPath = path.join(__dirname, '..', '..', 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'cjs');
const { McpServer, ResourceTemplate } = require(path.join(sdkPath, 'server', 'mcp.js'));
const { MaasApiClient } = require("../maas/MaasApiClient");
const { z } = require('zod');
const { DOMAIN_DETAILS_URI_PATTERN, DOMAINS_LIST_URI_PATTERN, MaasDomainSchema, GetDomainParamsSchema } = require('./schemas/domainResourceSchema');
const logger = require('../utils/logger');
const { MaasApiError } = require('../types/maas');
const { ZodError } = require('zod');
/**
 * ResourceTemplate for fetching details of a single MAAS domain.
 * Defines the URI pattern used to identify specific domain detail requests.
 * The URI pattern expects a 'domain_id' parameter (which can be an ID or name).
 * Example URI: maas://domains/{domain_id}
 */
const domainDetailsTemplate = new ResourceTemplate({
    uriPattern: DOMAIN_DETAILS_URI_PATTERN,
    schema: MaasDomainSchema,
    paramsSchema: GetDomainParamsSchema,
    handler: async (uri, params, signal) => {
        try {
            // Validate domain_id parameter
            const { domain_id } = params;
            if (!domain_id || domain_id.trim() === '') {
                logger.error('Domain ID is missing or empty in the resource URI');
                throw new MaasApiError('Domain ID is missing or empty in the resource URI', 400, 'missing_parameter');
            }
            logger.info(`Fetching details for MAAS domain: ${domain_id}`);
            // Fetch domain details from MAAS API
            const domainDetails = await maasClient.get(`/domains/${domain_id}/`);
            // Check if the response is empty or null
            if (!domainDetails) {
                logger.error(`Domain not found: ${domain_id}`);
                throw new MaasApiError(`Domain '${domain_id}' not found`, 404, 'resource_not_found');
            }
            return domainDetails;
        }
        catch (error) {
            logger.error({ error, params }, 'Error fetching domain details');
            if (error instanceof ZodError) {
                throw new MaasApiError('Invalid domain parameters', 400, 'invalid_parameters', { zodErrors: error.errors });
            }
            if (error instanceof MaasApiError) {
                throw error;
            }
            throw new MaasApiError('Failed to fetch domain details', 500, 'unexpected_error', { originalError: error });
        }
    }
});
/**
 * ResourceTemplate for fetching a list of all MAAS domains.
 * Defines the URI pattern used to identify requests for the domains collection.
 * Example URI: maas://domains
 */
const domainsListTemplate = new ResourceTemplate({
    uriPattern: DOMAINS_LIST_URI_PATTERN,
    schema: MaasDomainSchema.array(),
    handler: async (uri, params, signal) => {
        try {
            logger.info('Fetching MAAS domains list');
            // Fetch domains list from MAAS API
            const domainsList = await maasClient.get('/domains/');
            if (!Array.isArray(domainsList)) {
                logger.error('Invalid response format: Expected an array of domains');
                throw new MaasApiError('Invalid response format: Expected an array of domains', 500, 'invalid_response_format');
            }
            return domainsList;
        }
        catch (error) {
            logger.error({ error }, 'Error fetching domains list');
            if (error instanceof MaasApiError) {
                throw error;
            }
            throw new MaasApiError('Failed to fetch domains list', 500, 'unexpected_error', { originalError: error });
        }
    }
});
// Reference to the MAAS API client, set during registration
let maasClient;
/**
 * Register domain resources with the MCP server
 *
 * @param {McpServer} server - The MCP server instance
 * @param {MaasApiClient} client - The MAAS API client instance
 */
function registerDomainResource(server, client) {
    maasClient = client;
    // Register all domain-related resources
    server.resource(domainDetailsTemplate);
    server.resource(domainsListTemplate);
    logger.info('Registered MAAS domain resources');
}
module.exports = { registerDomainResource };
