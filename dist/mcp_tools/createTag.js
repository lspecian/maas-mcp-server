"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCreateTagTool = registerCreateTagTool;
const createTagSchema_js_1 = require("./schemas/createTagSchema.js");
const logger_js_1 = require("../utils/logger.js");
const progressNotification_js_1 = require("../utils/progressNotification.js");
/**
 * Registers the create tag tool with the MCP server.
 * This tool allows creating a new tag in MAAS with optional metadata.
 *
 * The tool accepts parameters for the tag name, optional comment, definition expression,
 * and kernel options. It supports progress notifications through the _meta.progressToken
 * parameter and can be aborted using the AbortSignal.
 *
 * @param server - The MCP server instance to register the tool with
 * @param maasApiClient - The MAAS API client instance for making API calls
 *
 * @example
 * // Example usage in MCP:
 * {
 *   "name": "my-tag",
 *   "comment": "Machines with specific hardware",
 *   "definition": "//node[contains(@class, 'network')]",
 *   "kernel_opts": "console=ttyS0",
 *   "_meta": { "progressToken": "create-tag-123" }
 * }
 *
 * @returns JSON representation of the created tag
 * @throws Will throw an error if the tag creation fails
 */
function registerCreateTagTool(server, maasApiClient) {
    const toolName = "maas_create_tag";
    const toolSchemaObject = createTagSchema_js_1.createTagSchema; // Keep the original ZodObject for inference
    server.tool(toolName, toolSchemaObject.shape, // Pass the shape for ZodRawShape compatibility
    async (params, // Infer from the original ZodObject
    { signal, sendNotification }) => {
        // Generate a unique request ID for tracking and create a logger instance
        const requestId = Date.now().toString(36);
        const logger = (0, logger_js_1.createRequestLogger)(requestId, toolName, params);
        // Extract progress token from metadata and create progress notification sender
        const progressToken = params._meta?.progressToken;
        const sendProgress = (0, progressNotification_js_1.createProgressSender)(progressToken, sendNotification, requestId, toolName);
        try {
            logger.info('Executing create tag tool');
            // Send initial progress notification (0%)
            await sendProgress(0, "Starting tag creation...");
            // Extract parameters from the request
            const { name, comment, definition, kernel_opts } = params;
            // Prepare request body with required and optional parameters
            const requestBody = { name };
            if (comment)
                requestBody.comment = comment;
            if (definition)
                requestBody.definition = definition;
            if (kernel_opts)
                requestBody.kernel_opts = kernel_opts;
            // Send progress update (50%)
            await sendProgress(50, "Sending tag creation request to MAAS...");
            // Call MAAS API to create the tag, passing the abort signal for cancellation support
            const tag = await maasApiClient.post('/tags/', requestBody, signal);
            // Send completion progress notification (100%)
            await sendProgress(100, "Tag created successfully.");
            logger.info({ tagName: name }, 'Successfully created tag');
            return {
                content: [{ type: "text", text: JSON.stringify(tag) }]
            };
        }
        catch (error) {
            // Log the error and send error progress notification
            logger.error({ error: error.message }, 'Error creating tag');
            await sendProgress(100, `Error: ${error.message}`);
            // Return error response in the expected MCP format
            return {
                content: [{ type: "text", text: `Error creating tag: ${error.message}` }],
                isError: true
            };
        }
    });
}
