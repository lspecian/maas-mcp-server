"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable */
// @ts-nocheck
const path = require('path');
const sdkPath = path.join(__dirname, '..', '..', 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'cjs');
const { McpServer } = require(path.join(sdkPath, 'server', 'mcp.js'));
const { MaasApiClient } = require("../maas/MaasApiClient");
const { z } = require("zod");
const { tagNameSchema, metaSchema } = require("./schemas/common");
const { createRequestLogger } = require("../utils/logger");
const { createProgressSender } = require("../utils/progressNotification");
/**
 * Schema for creating a tag in MAAS
 * Defines the parameters required to create a new tag
 */
const createTagSchema = z.object({
    name: tagNameSchema,
    comment: z.string().optional().describe("Optional comment for the tag"),
    kernel_opts: z.string().optional().describe("Kernel options for the tag"),
    definition: z.string().optional().describe("Tag definition (XPath expression)"),
    _meta: metaSchema
});
/**
 * Schema for the output of the create tag operation
 */
const createTagOutputSchema = z.object({
    name: tagNameSchema,
    comment: z.string().optional(),
    kernel_opts: z.string().optional(),
    definition: z.string().optional(),
    _meta: metaSchema
});
/**
 * Schema for deleting a tag in MAAS
 */
const deleteTagSchema = z.object({
    name: tagNameSchema,
    _meta: metaSchema
});
/**
 * Schema for the output of the delete tag operation
 */
const deleteTagOutputSchema = z.object({
    success: z.boolean(),
    name: tagNameSchema,
    _meta: metaSchema
});
/**
 * Schema for updating a tag in MAAS
 */
const updateTagSchema = z.object({
    name: tagNameSchema,
    new_name: tagNameSchema.optional().describe("New name for the tag"),
    comment: z.string().optional().describe("New comment for the tag"),
    kernel_opts: z.string().optional().describe("New kernel options for the tag"),
    definition: z.string().optional().describe("New tag definition (XPath expression)"),
    _meta: metaSchema
});
/**
 * Schema for the output of the update tag operation
 */
const updateTagOutputSchema = z.object({
    name: tagNameSchema,
    comment: z.string().optional(),
    kernel_opts: z.string().optional(),
    definition: z.string().optional(),
    _meta: metaSchema
});
/**
 * Register tag management tools with the MCP server
 * @param server The MCP server instance
 * @param maasClient The MAAS API client instance
 */
function registerTagManagementTools(server, maasClient) {
    // Register the create tag tool
    server.tool("createTag", createTagSchema.shape, async (params) => {
        const logger = createRequestLogger('createTag');
        logger.info({ params }, 'Executing createTag tool');
        try {
            // Prepare parameters for MAAS API
            const apiParams = {
                name: params.name
            };
            // Add optional parameters if provided
            if (params.comment)
                apiParams.comment = params.comment;
            if (params.kernel_opts)
                apiParams.kernel_opts = params.kernel_opts;
            if (params.definition)
                apiParams.definition = params.definition;
            // Call MAAS API to create the tag
            const response = await maasClient.post('/tags/', apiParams);
            logger.info({ tagName: response.name }, 'Successfully created tag');
            // Return the response
            return {
                name: response.name,
                comment: response.comment,
                kernel_opts: response.kernel_opts,
                definition: response.definition,
                _meta: params._meta || {}
            };
        }
        catch (error) {
            logger.error({ error, tagName: params.name }, 'Error creating tag');
            throw error;
        }
    });
    // Register the delete tag tool
    server.tool("deleteTag", deleteTagSchema.shape, async (params) => {
        const logger = createRequestLogger('deleteTag');
        logger.info({ params }, 'Executing deleteTag tool');
        try {
            // Call MAAS API to delete the tag
            await maasClient.delete(`/tags/${params.name}/`);
            logger.info({ tagName: params.name }, 'Successfully deleted tag');
            // Return success response
            return {
                success: true,
                name: params.name,
                _meta: params._meta || {}
            };
        }
        catch (error) {
            logger.error({ error, tagName: params.name }, 'Error deleting tag');
            throw error;
        }
    });
    // Register the update tag tool
    server.tool("updateTag", updateTagSchema.shape, async (params) => {
        const logger = createRequestLogger('updateTag');
        logger.info({ params }, 'Executing updateTag tool');
        try {
            // Prepare parameters for MAAS API
            const apiParams = {};
            // Add parameters if provided
            if (params.new_name)
                apiParams.name = params.new_name;
            if (params.comment)
                apiParams.comment = params.comment;
            if (params.kernel_opts)
                apiParams.kernel_opts = params.kernel_opts;
            if (params.definition)
                apiParams.definition = params.definition;
            // Call MAAS API to update the tag
            const response = await maasClient.put(`/tags/${params.name}/`, apiParams);
            logger.info({ tagName: params.name }, 'Successfully updated tag');
            // Return the response
            return {
                name: response.name,
                comment: response.comment,
                kernel_opts: response.kernel_opts,
                definition: response.definition,
                _meta: params._meta || {}
            };
        }
        catch (error) {
            logger.error({ error, tagName: params.name }, 'Error updating tag');
            throw error;
        }
    });
}
module.exports = { registerTagManagementTools };
