import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MaasApiClient } from '../maas/MaasApiClient.js';
import {
  createDerivedSignal,
  onAbort,
  throwIfAborted,
  isAbortError,
  handleAbortError
} from '../utils/abortSignalUtils.js';
import {
  errorToMcpResult,
  handleMaasApiError,
  handleValidationError,
  ErrorType,
  MaasServerError
} from '../utils/errorHandler.js';
import { ErrorMessages } from '../utils/errorMessages.js';
import { createMultipartFormData, FileUploadOptions } from '../transport/multipart.js';
import { createRequestLogger } from '../utils/logger.js';
import { metaSchema } from './schemas/common.js';
import { createProgressSender } from '../utils/progressNotification.js';

// Schema for script upload
const uploadScriptSchema = z.object({
  _meta: metaSchema,
  name: z.string().min(1).describe("Name of the script"),
  description: z.string().optional().describe("Description of the script"),
  tags: z.string().optional().describe("Comma-separated list of tags"),
  script_type: z.enum(["commissioning", "testing"]).describe("Type of script"),
  script_content: z.string().min(1).describe("Content of the script file"),
  timeout: z.number().optional().describe("Script timeout in seconds"),
  parallel: z.boolean().optional().describe("Whether the script can run in parallel"),
  hardware_type: z.enum(["node", "cpu", "memory", "storage"]).optional().describe("Hardware type the script is for"),
  for_hardware: z.string().optional().describe("Hardware the script is specifically for")
}).describe("Parameters for uploading a script to MAAS");

/**
 * Registers the upload script tool with the MCP server
 * @param server MCP server instance
 * @param maasClient MAAS API client instance
 */
export function registerUploadScriptTool(server: McpServer, maasClient: MaasApiClient) {
  const toolName = "maas_upload_script";
  const toolSchemaObject = uploadScriptSchema; // Keep the original ZodObject for inference

  server.tool(
    toolName,
    toolSchemaObject.shape,
    async (
      params: z.infer<typeof toolSchemaObject>,
      { signal, sendNotification }: { signal?: AbortSignal; sendNotification?: (notification: any) => Promise<void> }
    ): Promise<{ content: { type: "text"; text: string; }[]; isError?: boolean }> => {
      const requestId = Date.now().toString(36);
      const logger = createRequestLogger(requestId, 'maas_upload_script', params);
      const progressToken = params._meta?.progressToken;
      // Create a derived signal with a timeout
      const derivedSignal = createDerivedSignal(signal, {
        timeout: 120000, // 2 minutes timeout for script upload
        reason: 'Script upload timed out after 2 minutes',
        requestId,
        operationName: 'maas_upload_script'
      });
      
      // Create progress sender with the derived signal
      const sendProgress = createProgressSender(
        progressToken,
        sendNotification,
        requestId,
        'maas_upload_script',
        undefined, // Use default rate limit config
        derivedSignal
      );
      
      // Register cleanup function to be called if aborted
      const unregisterCleanup = onAbort(derivedSignal, async () => {
        logger.warn('Script upload operation aborted, cleaning up resources');
        await sendProgress(100, 'Operation aborted', 100, true);
        // Additional cleanup could be performed here if needed
      });
      
      try {
        logger.info({
          name: params.name,
          script_type: params.script_type,
          contentLength: params.script_content.length
        }, 'Uploading script to MAAS');
        
        // Check if already aborted before starting
        throwIfAborted(derivedSignal, `Upload of script '${params.name}' was aborted before starting`);
        
        await sendProgress(0, `Starting upload of script '${params.name}'...`);
        
        // Prepare file upload options
        const fileOptions: FileUploadOptions = {
          fieldName: 'script',
          fileName: `${params.name}.sh`,
          fileContent: params.script_content,
          contentType: 'text/x-shellscript',
          maxSizeBytes: 1024 * 1024, // 1MB max size
          allowedTypes: ['text/x-shellscript', 'text/plain']
        };
        
        // Prepare additional fields
        const additionalFields: Record<string, string> = {
          name: params.name
        };
        
        if (params.description) additionalFields.description = params.description;
        if (params.tags) additionalFields.tags = params.tags;
        if (params.script_type) additionalFields.script_type = params.script_type;
        if (params.timeout !== undefined) additionalFields.timeout = params.timeout.toString();
        if (params.parallel !== undefined) additionalFields.parallel = params.parallel.toString();
        if (params.hardware_type) additionalFields.hardware_type = params.hardware_type;
        if (params.for_hardware) additionalFields.for_hardware = params.for_hardware;
        
        // Check if aborted before preparing data
        throwIfAborted(derivedSignal);
        
        await sendProgress(30, "Preparing script data for upload...");
        
        // Create multipart form data
        const formData = createMultipartFormData(fileOptions, additionalFields);
        
        await sendProgress(50, "Sending script to MAAS API...");
        
        // Send request to MAAS API using the derived signal
        const result = await maasClient.postMultipart('/scripts', formData, derivedSignal);
        
        // Unregister cleanup as operation completed successfully
        unregisterCleanup();
        
        await sendProgress(100, "Script uploaded successfully.");
        logger.info({ result }, 'Script uploaded successfully');
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              message: `Script '${params.name}' uploaded successfully`,
              id: result.id || result.name
            })
          }]
        };
      } catch (error: any) {
        // Unregister cleanup as we're handling the error
        unregisterCleanup();
        
        // Check if this is an abort error
        if (isAbortError(error)) {
          logger.warn({ error: error.message }, 'Script upload aborted');
          await sendProgress(100, `Upload aborted: ${error.message}`, 100, true);
          
          return errorToMcpResult(
            new MaasServerError(
              `Upload of script '${params.name}' was aborted: ${error.message}`,
              ErrorType.OPERATION_ABORTED,
              499 // Client Closed Request
            )
          );
        }
        
        logger.error({ error: error.message }, 'Error uploading script');
        await sendProgress(100, `Error: ${error.message}`);
        
        // Handle validation errors
        if (!params.name || !params.script_content) {
          return errorToMcpResult(
            handleValidationError(
              ErrorMessages.missingParameter(!params.name ? 'name' : 'script_content'),
              { parameter: !params.name ? 'name' : 'script_content' }
            )
          );
        }
        
        // Handle file size errors
        if (error.message?.includes('size') || error.message?.includes('too large')) {
          return errorToMcpResult(
            new MaasServerError(
              ErrorMessages.invalidParameter('script_content', 'File size exceeds maximum allowed size'),
              ErrorType.VALIDATION,
              400
            )
          );
        }
        
        // Handle file type errors
        if (error.message?.includes('type') || error.message?.includes('format')) {
          return errorToMcpResult(
            new MaasServerError(
              ErrorMessages.invalidParameter('script_content', 'Invalid file type or format'),
              ErrorType.VALIDATION,
              400
            )
          );
        }
        
        // Handle authentication errors
        if (error.status === 401 || error.message?.includes('auth') || error.message?.includes('unauthorized')) {
          return errorToMcpResult(
            new MaasServerError(
              ErrorMessages.authenticationFailed(error.message),
              ErrorType.AUTHENTICATION,
              401
            )
          );
        }
        
        // Handle permission errors
        if (error.status === 403 || error.message?.includes('permission') || error.message?.includes('forbidden')) {
          return errorToMcpResult(
            new MaasServerError(
              ErrorMessages.permissionDenied('upload', 'script', params.name),
              ErrorType.PERMISSION_DENIED,
              403
            )
          );
        }
        
        // Handle conflict errors (script already exists)
        if (error.status === 409 || error.message?.includes('conflict') || error.message?.includes('already exists')) {
          return errorToMcpResult(
            new MaasServerError(
              ErrorMessages.resourceExists('Script', params.name),
              ErrorType.RESOURCE_CONFLICT,
              409
            )
          );
        }
        
        // Handle network errors
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
          return errorToMcpResult(
            new MaasServerError(
              ErrorMessages.networkError(error.message || error.code),
              ErrorType.NETWORK_ERROR,
              500
            )
          );
        }
        
        // Default to generic MAAS API error
        return errorToMcpResult(
          handleMaasApiError(error)
        );
      }
    }
  );
}