const { z } = require('zod');
const path = require('path');
const sdkPath = path.join(__dirname, '..', '..', 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'cjs');
const { McpServer } = require(path.join(sdkPath, 'server', 'mcp.js'));
const { MaasApiClient } = require('../maas/MaasApiClient');
const {
  createDerivedSignal,
  onAbort,
  throwIfAborted,
  isAbortError,
  handleAbortError
} = require('../utils/abortSignalUtils');
const { createRequestLogger } = require('../utils/logger');
const { createProgressSender } = require('../utils/progressNotification');
const { metaSchema } = require('./schemas/common');
const { createMultipartFormData } = require('../transport/multipart');
const fs = require('fs');

// Define schema for upload image tool
const uploadImageSchema = z.object({
  title: z.string().describe("Title for the image"),
  architecture: z.string().describe("Architecture for the image (e.g., 'amd64/generic')"),
  filePath: z.string().describe("Path to the image file on the server"),
  _meta: metaSchema
});

// Define schema for upload image output
const uploadImageOutputSchema = z.object({
  id: z.number().describe("ID of the uploaded image"),
  title: z.string().describe("Title of the uploaded image"),
  architecture: z.string().describe("Architecture of the uploaded image"),
  size: z.number().describe("Size of the uploaded image in bytes"),
  _meta: metaSchema
});

/**
 * Register the upload image tool with the MCP server
 * @param server The MCP server instance
 * @param maasClient The MAAS API client instance
 */
function registerUploadImageTool(server, maasClient) {
  server.tool(
    "uploadImage",
    "Upload a boot image to MAAS",
    uploadImageSchema,
    async (params, signal) => {
      const logger = createRequestLogger('uploadImage');
      const progressSender = createProgressSender(params._meta?.requestId);
      
      logger.info({ params }, 'Executing uploadImage tool');
      
      try {
        // Start progress notification
        progressSender.start('Preparing to upload image');
        
        // Check if the file exists
        if (!fs.existsSync(params.filePath)) {
          throw new Error(`File not found: ${params.filePath}`);
        }
        
        // Get file stats
        const stats = fs.statSync(params.filePath);
        
        // Create a derived abort signal
        const derivedSignal = signal ? createDerivedSignal(signal) : null;
        
        // Register abort handler
        if (derivedSignal) {
          onAbort(derivedSignal, () => {
            logger.info('Upload operation aborted');
            progressSender.error('Upload operation was aborted');
          });
        }
        
        // Check if aborted before starting
        if (derivedSignal) {
          throwIfAborted(derivedSignal, 'Upload operation aborted before starting');
        }
        
        // Update progress
        progressSender.update('Reading file and preparing upload');
        
        // Create form data
        const formData = createMultipartFormData();
        formData.append('title', params.title);
        formData.append('architecture', params.architecture);
        
        // Read file and append to form data
        const fileStream = fs.createReadStream(params.filePath);
        formData.append('file', fileStream);
        
        // Update progress
        progressSender.update('Uploading image to MAAS');
        
        // Upload the image
        const response = await maasClient.post('/boot-resources/', formData, {
          signal: derivedSignal,
          headers: formData.getHeaders()
        });
        
        // Complete progress
        progressSender.complete('Successfully uploaded image');
        
        logger.info({ imageId: response.id }, 'Successfully uploaded image');
        
        // Return the response
        return {
          id: response.id,
          title: response.title,
          architecture: response.architecture,
          size: stats.size,
          _meta: params._meta || {}
        };
      } catch (error) {
        // Handle abort error
        if (isAbortError(error)) {
          handleAbortError(error, 'Image upload was aborted');
        }
        
        // Handle other errors
        logger.error({ error }, 'Error uploading image');
        progressSender.error(`Error uploading image: ${error.message}`);
        throw error;
      }
    }
  );
}

module.exports = { registerUploadImageTool };