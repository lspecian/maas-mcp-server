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

/**
 * Schema for boot image upload
 * Defines the parameters required to upload a boot image to MAAS
 */
const uploadImageSchema = z.object({
  /** Metadata including optional progress token for notifications */
  _meta: metaSchema,
  
  /** Name of the boot image (required) */
  name: z.string().min(1).describe("Name of the boot image"),
  
  /** Architecture for the boot image (e.g., 'amd64') */
  architecture: z.string().describe("Architecture for the boot image (e.g., 'amd64')"),
  
  /** Content of the image file (base64 encoded or raw) */
  image_content: z.string().min(1).describe("Content of the image file (base64 encoded)"),
  
  /** Type of boot image (one of the enumerated values) */
  image_type: z.enum(["boot-kernel", "boot-initrd", "boot-dtb", "squashfs"]).describe("Type of boot image"),
  
  /** Optional file type of the image (e.g., 'tgz', 'tbz', 'txz', 'ddtgz') */
  filetype: z.string().optional().describe("File type of the image (e.g., 'tgz', 'tbz', 'txz', 'ddtgz')"),
  
  /** Optional sub-architecture for the boot image */
  subarchitecture: z.string().optional().describe("Sub-architecture for the boot image"),
  
  /** Optional comma-separated list of supported sub-architectures */
  supported_subarches: z.string().optional().describe("Comma-separated list of supported sub-architectures"),
  
  /** Optional Ubuntu release name (e.g., 'jammy') */
  release: z.string().optional().describe("Ubuntu release name (e.g., 'jammy')"),
  
  /** Optional label for the boot image */
  label: z.string().optional().describe("Label for the boot image")
}).describe("Parameters for uploading a boot image to MAAS");

/**
 * Registers the upload image tool with the MCP server
 *
 * This tool allows uploading boot images to MAAS. It supports various image types
 * including boot-kernel, boot-initrd, boot-dtb, and squashfs. The image content
 * can be provided as base64-encoded data or raw content.
 *
 * The tool handles progress notifications, timeout management, and proper error
 * handling for various failure scenarios. It automatically determines the appropriate
 * content type based on the image_type parameter.
 *
 * @param server - The MCP server instance to register the tool with
 * @param maasClient - The MAAS API client instance for making API calls
 *
 * @example
 * // Example usage in MCP:
 * {
 *   "name": "ubuntu-kernel-22.04",
 *   "architecture": "amd64",
 *   "image_type": "boot-kernel",
 *   "image_content": "base64_encoded_content_here",
 *   "release": "jammy",
 *   "_meta": { "progressToken": "upload-image-123" }
 * }
 *
 * @returns JSON object with success message and resource ID
 * @throws Will throw an error if the upload fails for any reason
 */
export function registerUploadImageTool(server: McpServer, maasClient: MaasApiClient) {
  const toolName = "maas_upload_image";
  const toolSchemaObject = uploadImageSchema; // Keep the original ZodObject for inference

  server.tool(
    toolName,
    toolSchemaObject.shape,
    async (
      params: z.infer<typeof toolSchemaObject>,
      { signal, sendNotification }: { signal?: AbortSignal; sendNotification?: (notification: any) => Promise<void> }
    ): Promise<{ content: { type: "text"; text: string; }[]; isError?: boolean }> => {
      // Generate a unique request ID for tracking and create a logger instance
      const requestId = Date.now().toString(36);
      const logger = createRequestLogger(requestId, 'maas_upload_image', params);
      
      // Extract progress token from metadata
      const progressToken = params._meta?.progressToken;
      
      // Create a derived signal with a timeout to handle long-running uploads
      const derivedSignal = createDerivedSignal(signal, {
        timeout: 300000, // 5 minutes timeout for image upload
        reason: 'Image upload timed out after 5 minutes',
        requestId,
        operationName: 'maas_upload_image'
      });
      
      // Create progress sender with the derived signal for progress notifications
      const sendProgress = createProgressSender(
        progressToken,
        sendNotification,
        requestId,
        'maas_upload_image',
        undefined, // Use default rate limit config
        derivedSignal
      );
      
      // Register cleanup function to be called if the operation is aborted
      const unregisterCleanup = onAbort(derivedSignal, async () => {
        logger.warn('Image upload operation aborted, cleaning up resources');
        // Send final progress notification indicating the operation was aborted
        await sendProgress(100, 'Operation aborted', 100, true);
        // Additional cleanup could be performed here if needed
      });
      
      try {
        logger.info({
          name: params.name,
          architecture: params.architecture,
          image_type: params.image_type,
          contentLength: params.image_content.length
        }, 'Uploading boot image to MAAS');
        
        // Check if already aborted before starting
        throwIfAborted(derivedSignal, `Upload of boot image '${params.name}' was aborted before starting`);
        
        await sendProgress(0, `Starting upload of boot image '${params.name}'...`);
        
        // Decode base64 content if needed
        let fileContent: Buffer | string = params.image_content;
        // Check if aborted before decoding
        throwIfAborted(derivedSignal);
        
        if (params.image_content.match(/^[A-Za-z0-9+/=]+$/)) {
          try {
            fileContent = Buffer.from(params.image_content, 'base64');
            logger.debug('Decoded base64 image content');
            await sendProgress(10, "Decoded base64 image content");
          } catch (error) {
            logger.warn('Failed to decode as base64, treating as raw content');
            await sendProgress(10, "Using raw image content (base64 decoding failed)");
          }
        } else {
          await sendProgress(10, "Using raw image content");
        }
        
        // Check if aborted after decoding
        throwIfAborted(derivedSignal);
        
        // Determine content type based on image_type
        let contentType = 'application/octet-stream';
        if (params.image_type === 'squashfs') {
          contentType = 'application/vnd.squashfs';
        } else if (params.image_type === 'boot-kernel') {
          contentType = 'application/x-kernel';
        } else if (params.image_type === 'boot-initrd') {
          contentType = 'application/x-initrd';
        } else if (params.image_type === 'boot-dtb') {
          contentType = 'application/x-dtb';
        }
        
        await sendProgress(20, "Preparing image data for upload...");
        
        // Prepare file upload options
        const fileOptions: FileUploadOptions = {
          fieldName: 'file',
          fileName: params.name,
          fileContent: fileContent,
          contentType: contentType,
          maxSizeBytes: 1024 * 1024 * 100, // 100MB max size
          allowedTypes: [
            'application/octet-stream',
            'application/vnd.squashfs',
            'application/x-kernel',
            'application/x-initrd',
            'application/x-dtb'
          ]
        };
        
        // Prepare additional fields
        const additionalFields: Record<string, string> = {
          name: params.name,
          architecture: params.architecture,
          type: params.image_type
        };
        
        if (params.filetype) additionalFields.filetype = params.filetype;
        if (params.subarchitecture) additionalFields.subarchitecture = params.subarchitecture;
        if (params.supported_subarches) additionalFields.supported_subarches = params.supported_subarches;
        if (params.release) additionalFields.release = params.release;
        if (params.label) additionalFields.label = params.label;
        
        await sendProgress(40, "Creating multipart form data...");
        
        // Create multipart form data
        const formData = createMultipartFormData(fileOptions, additionalFields);
        
        await sendProgress(50, "Uploading image to MAAS API (this may take a while)...");
        
        // Send request to MAAS API using the derived signal
        const result = await maasClient.postMultipart('/boot-resources/', formData, derivedSignal);
        
        // Unregister cleanup as operation completed successfully
        unregisterCleanup();
        
        await sendProgress(100, "Boot image uploaded successfully.");
        logger.info({ result }, 'Boot image uploaded successfully');
        
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({
              message: `Boot image '${params.name}' uploaded successfully`,
              id: result.id || result.name
            })
          }]
        };
      } catch (error: any) {
        // Unregister cleanup as we're handling the error
        unregisterCleanup();
        
        // Check if this is an abort error
        if (isAbortError(error)) {
          logger.warn({ error: error.message }, 'Boot image upload aborted');
          await sendProgress(100, `Upload aborted: ${error.message}`, 100, true);
          
          return errorToMcpResult(
            new MaasServerError(
              `Upload of boot image '${params.name}' was aborted: ${error.message}`,
              ErrorType.OPERATION_ABORTED,
              499 // Client Closed Request
            )
          );
        }
        
        logger.error({ error: error.message }, 'Error uploading boot image');
        await sendProgress(100, `Error: ${error.message}`);
        
        // Handle validation errors
        if (!params.name || !params.image_content || !params.architecture) {
          const missingParam = !params.name ? 'name' : (!params.image_content ? 'image_content' : 'architecture');
          return errorToMcpResult(
            handleValidationError(
              ErrorMessages.missingParameter(missingParam),
              { parameter: missingParam }
            )
          );
        }
        
        // Handle base64 decoding errors
        if (error.message?.includes('base64')) {
          return errorToMcpResult(
            new MaasServerError(
              ErrorMessages.invalidParameter('image_content', 'Invalid base64 encoding'),
              ErrorType.VALIDATION,
              400
            )
          );
        }
        
        // Handle file size errors
        if (error.message?.includes('size') || error.message?.includes('too large')) {
          return errorToMcpResult(
            new MaasServerError(
              ErrorMessages.invalidParameter('image_content', 'File size exceeds maximum allowed size (100MB)'),
              ErrorType.VALIDATION,
              400
            )
          );
        }
        
        // Handle file type errors
        if (error.message?.includes('type') || error.message?.includes('format')) {
          return errorToMcpResult(
            new MaasServerError(
              ErrorMessages.invalidParameter('image_content', 'Invalid file type or format'),
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
              ErrorMessages.permissionDenied('upload', 'boot image', params.name),
              ErrorType.PERMISSION_DENIED,
              403
            )
          );
        }
        
        // Handle conflict errors (image already exists)
        if (error.status === 409 || error.message?.includes('conflict') || error.message?.includes('already exists')) {
          return errorToMcpResult(
            new MaasServerError(
              ErrorMessages.resourceExists('Boot image', params.name),
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