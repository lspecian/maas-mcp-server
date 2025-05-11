import express, { Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { MCPServer } from '@modelcontextprotocol/sdk';
import logger from '../utils/logger.js';

/**
 * Creates and configures an Express app with an MCP endpoint
 * @param server The MCPServer instance to connect to the transport
 * @param port The port to listen on
 * @returns The configured Express app
 */
export function createExpressApp(server: MCPServer, port: number) {
  const app = express();
  
  // Configure middleware
  app.use(express.json({ limit: '10mb' }));
  
  // Set up the MCP endpoint
  app.post('/mcp', async (req: Request, res: Response) => {
    logger.info(`Received request to /mcp endpoint`);
    
    try {
      // Create a new transport instance for this request
      const transport = new StreamableHTTPServerTransport({ 
        sessionIdGenerator: undefined // Use stateless mode
      });
      
      // Connect the transport to the server
      await server.connect(transport);
      
      // Handle the request
      await transport.handleRequest(req, res, req.body);
      
      // Clean up when the response is closed
      res.on('close', () => {
        logger.debug('Response closed, cleaning up transport');
        transport.close();
      });
    } catch (error: any) {
      logger.error('Error handling MCP request', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });
  
  // Add a health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });
  
  return app;
}

/**
 * Starts the HTTP server with the MCP endpoint
 * @param server The MCPServer instance to connect to the transport
 * @param port The port to listen on
 * @returns The HTTP server instance
 */
export function startHttpServer(server: MCPServer, port: number) {
  const app = createExpressApp(server, port);
  
  // Start the server
  const httpServer = app.listen(port, () => {
    logger.info(`MCP Server for MAAS API listening on http://localhost:${port}/mcp`);
  });
  
  // Handle server errors
  httpServer.on('error', (error) => {
    logger.error('HTTP server error', error);
  });
  
  return httpServer;
}