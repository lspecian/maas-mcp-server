declare module '@modelcontextprotocol/sdk' {
  export class MCPServer {
    constructor(options: any);
    start(): Promise<void>;
    stop(): Promise<void>;
    connect(transport: any): Promise<void>;
    addTool(name: string, tool: any): void;
    addResource(uri: string, resource: any): void;
  }

  export interface MCPToolDefinition {
    name: string;
    description: string;
    schema: any;
    execute: (params: any) => Promise<any>;
  }

  export interface MCPResourceDefinition {
    uri: string;
    description: string;
    retrieve: () => Promise<any>;
  }
  
  // Add declaration for StreamableHTTPServerTransport
  export interface StreamableHTTPServerTransportOptions {
    sessionIdGenerator?: () => string;
  }
  
  export class StreamableHTTPServerTransport {
    constructor(options?: StreamableHTTPServerTransportOptions);
    handleRequest(req: any, res: any, body: any): Promise<void>;
    close(): void;
  }
}

// Add declaration for streamableHttp.js module
declare module '@modelcontextprotocol/sdk/server/streamableHttp.js' {
  export { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk';
}