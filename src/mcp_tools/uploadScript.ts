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

// Define schema for upload script tool
const uploadScriptSchema = z.object({
  name: z.string().describe("Name for the script"),
  filePath: z.string().describe("Path to the script file on the server"),
  type: z.enum(['commissioning', 'testing']).describe("Type of script (commissioning or testing)"),
  _meta: metaSchema
});

// Define schema for upload script output
const uploadScriptOutputSchema = z.object({
  id: z.number().describe("ID of the uploaded script"),
  name: z.string().describe("Name of the uploaded script"),
  type: z.string().describe("Type of the uploaded script"),
  size: z.number().describe("Size of the uploaded script in bytes"),
  _meta: metaSchema
});

/**
 * Register the upload script tool with the MCP server
 * @param server The MCP server instance
 * @param maasClient The MAAS API client instance
 */
function registerUploadScriptTool(server, maasClient) {
  server.tool(
    "uploadScript",
    "Upload a script to MAAS",
    uploadScriptSchema,
    async (params, signal) => {
      const logger = createRequestLogger('uploadScript');
      const progressSender = createProgressSender(params._meta?.requestId);
      
      logger.info({ params }, 'Executing uploadScript tool');
      
      try {
        // Start progress notification
        progressSender.start('Preparing to upload script');
        
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
        formData.append('name', params.name);
        formData.append('type', params.type);
        
        // Read file and append to form data
        const fileStream = fs.createReadStream(params.filePath);
        formData.append('script', fileStream);
        
        // Update progress
        progressSender.update('Uploading script to MAAS');
        
        // Upload the script
        const response = await maasClient.post('/scripts/', formData, {
          signal: derivedSignal,
          headers: formData.getHeaders()
        });
        
        // Complete progress
        progressSender.complete('Successfully uploaded script');
        
        logger.info({ scriptId: response.id }, 'Successfully uploaded script');
        
        // Return the response
        return {
          id: response.id,
          name: response.name,
          type: response.script_type,
          size: stats.size,
          _meta: params._meta || {}
        };
      } catch (error) {
        // Handle abort error
        if (isAbortError(error)) {
          handleAbortError(error, 'Script upload was aborted');
        }
        
        // Handle other errors
        logger.error({ error }, 'Error uploading script');
        progressSender.error(`Error uploading script: ${error.message}`);
        throw error;
      }
    }
  );
}

module.exports = { registerUploadScriptTool };