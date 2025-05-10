import { JSONRPCMessage, JSONRPCRequest, JSONRPCResponse, JSONRPCNotification, RequestId, isJSONRPCRequest } from './types.js';
import { Transport } from './transport.js';
import axios from 'axios';

import { MaasConfig } from './types.js';

export interface ServerOptions {
  name: string;
  version: string;
  goServerUrl?: string;
  maasConfig?: MaasConfig;
}

export class MCPServer {
  private _transport?: Transport;
  private _tools: Map<string, ToolDefinition> = new Map();
  private _goServerUrl: string;
  private _maasConfig?: MaasConfig;

  constructor(private options: ServerOptions) {
    this._goServerUrl = options.goServerUrl || 'http://localhost:8081';
    this._maasConfig = options.maasConfig;
  }

  /**
   * Connect a transport to this server
   */
  async connect(transport: Transport): Promise<void> {
    // Allow reconnecting with a new transport
    if (this._transport) {
      this._transport.onmessage = undefined;
      this._transport.onclose = undefined;
    }

    this._transport = transport;
    this._transport.onmessage = this._handleMessage.bind(this);
    this._transport.onclose = () => {
      this._transport = undefined;
    };
  }

  /**
   * Register a tool with the server
   */
  tool<T>(
    name: string,
    description: string,
    inputSchema: unknown,
    handler: ToolHandler<T>,
  ): void {
    this._tools.set(name, {
      name,
      description,
      inputSchema,
      handler,
    });
  }

  /**
   * Handle an incoming message from the transport
   */
  private async _handleMessage(message: JSONRPCMessage): Promise<void> {
    // Log the incoming message for debugging
    console.log("Received message:", JSON.stringify(message, null, 2));
    
    if (!isJSONRPCRequest(message)) {
      // Ignore non-request messages
      return;
    }

    try {
      // Check if this is a notification (no ID)
      if ('id' in message) {
        // This is a regular request
        if (message.method === 'initialize') {
          await this._handleInitialize(message);
        } else if (message.method === 'tools/call') {
          // Handle tools/call method (used by Roo)
          await this._handleToolsCall(message);
        } else if (message.method.startsWith('maas_')) {
          await this._handleMaasRequest(message);
        } else {
          const tool = this._tools.get(message.method);
          if (!tool) {
            await this._sendError(message.id, -32601, `Method not found: ${message.method}`);
            return;
          }

          await this._handleToolRequest(message, tool);
        }
      } else {
        // This is a notification
        await this._handleNotification(message);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      if ('id' in message) {
        await this._sendError(
          message.id,
          -32603,
          `Internal error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  /**
   * Handle a notification message (no ID)
   */
  private async _handleNotification(notification: JSONRPCNotification): Promise<void> {
    console.log(`Received notification: ${notification.method}`);
    
    // Handle specific notifications
    if (notification.method === 'notifications/initialized') {
      // Client is telling us it's initialized its notification system
      console.log('Client notification system initialized');
    }
    
    // Add more notification handlers as needed
  }

  /**
   * Handle an initialize request
   */
  private async _handleInitialize(request: JSONRPCRequest): Promise<void> {
    // Convert tools to an object with name as key
    const toolsObject: Record<string, { description: string, input_schema: unknown }> = {};
    
    // Add custom tools
    Array.from(this._tools.values()).forEach((tool) => {
      toolsObject[tool.name] = {
        description: tool.description,
        input_schema: tool.inputSchema,
      };
    });

    // Add MAAS tools
    toolsObject['maas_list_machines'] = {
      description: 'List all machines managed by MAAS',
      input_schema: { filters: {} },
    };
    
    toolsObject['maas_get_machine_details'] = {
      description: 'Get detailed information about a specific machine',
      input_schema: { system_id: '' },
    };
    
    toolsObject['maas_allocate_machine'] = {
      description: 'Allocate a machine based on constraints',
      input_schema: { constraints: {}, tags: [] },
    };
    
    toolsObject['maas_deploy_machine'] = {
      description: 'Deploy an operating system to a machine',
      input_schema: { system_id: '', os_name: '', kernel: '' },
    };
    
    toolsObject['maas_release_machine'] = {
      description: 'Release a machine back to the available pool',
      input_schema: { system_id: '' },
    };
    
    toolsObject['maas_get_machine_power_state'] = {
      description: 'Get the current power state of a machine',
      input_schema: { system_id: '' },
    };
    
    toolsObject['maas_power_on_machine'] = {
      description: 'Power on a machine',
      input_schema: { system_id: '' },
    };
    
    toolsObject['maas_power_off_machine'] = {
      description: 'Power off a machine',
      input_schema: { system_id: '' },
    };
    
    toolsObject['maas_list_subnets'] = {
      description: 'List all subnets managed by MAAS',
      input_schema: { fabric_id: 0 },
    };
    
    toolsObject['maas_get_subnet_details'] = {
      description: 'Get detailed information about a specific subnet',
      input_schema: { subnet_id: 0 },
    };

    const response: JSONRPCResponse = {
      jsonrpc: '2.0',
      result: {
        protocolVersion: '2024-11-05',
        serverInfo: {
          name: this.options.name,
          version: this.options.version,
        },
        capabilities: {
          tools: toolsObject,
        },
      },
      id: request.id,
    };

    await this._transport?.send(response);
  }

  /**
   * Handle a MAAS request by proxying to the Go server
   */
  private async _handleMaasRequest(request: JSONRPCRequest): Promise<void> {
    try {
      // Use the full method name for the URL
      const methodName = request.method;
      
      // Add MAAS configuration to the request if available
      const requestParams = {
        ...(request.params || {}),
        _maasConfig: this._maasConfig,
      };

      // Special handling for maas_get_machine_details
      if (methodName === 'maas_get_machine_details') {
        console.log("Original request params:", JSON.stringify(request.params, null, 2));
        
        // Try different variations of the system_id parameter
        if (request.params && typeof request.params === 'object') {
          const params = request.params as any;
          if (params.system_id) {
            // Use type assertion to add properties
            (requestParams as any).SystemID = params.system_id;
            (requestParams as any).system_id = params.system_id;
          } else if (params.SystemID) {
            // Use type assertion to add properties
            (requestParams as any).system_id = params.SystemID;
            (requestParams as any).SystemID = params.SystemID;
          }
        }
      }

      // Log the request parameters for debugging
      console.log("MAAS request params:", JSON.stringify(requestParams, null, 2));
      console.log("MAAS request URL:", `${this._goServerUrl}/mcp/${methodName}`);

      // Make a request to the Go server
      const response = await axios.post(
        `${this._goServerUrl}/mcp/${methodName}`,
        requestParams,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      // Log the response data for debugging
      console.log("MAAS response data:", JSON.stringify(response.data, null, 2));

      // Format the response for Roo with explicit text content
      // The response must have a content array with items of specific types
      const responseText = JSON.stringify(response.data, null, 2);
      
      const formattedResponse = {
        content: [
          {
            type: "text",
            text: responseText
          }
        ]
      };
      
      console.log("Formatted response:", JSON.stringify(formattedResponse, null, 2));

      // Send the response back to the client
      await this._transport?.send({
        jsonrpc: '2.0',
        result: formattedResponse,
        id: request.id,
      });
    } catch (error) {
      console.error('Error proxying to Go server:', error);
      
      if (axios.isAxiosError(error) && error.response) {
        // If we got a response from the Go server, use that error
        await this._sendError(
          request.id,
          -32603,
          `MAAS error: ${error.response.data.error || error.message}`,
        );
      } else {
        // Otherwise, use a generic error
        await this._sendError(
          request.id,
          -32603,
          `Error communicating with MAAS server: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  /**
   * Handle a tools/call request (used by Roo)
   */
  private async _handleToolsCall(request: JSONRPCRequest): Promise<void> {
    try {
      // Log the full request for debugging
      console.log("tools/call request:", JSON.stringify(request, null, 2));
      
      // Extract the tool name and arguments from the request
      const params = request.params as any;
      if (!params || !params.name) {
        await this._sendError(request.id, -32602, 'Invalid params: missing tool name');
        return;
      }

      // Make sessionId parameter optional for testing
      if (!params.sessionId) {
        console.log("Warning: Missing sessionId parameter in tools/call request, but continuing anyway");
      }

      const toolName = params.name;
      const toolArgs = params.arguments || {};

      // Check if this is a MAAS tool
      if (toolName.startsWith('maas_')) {
        // Log the tool arguments for debugging
        console.log(`MAAS tool call: ${toolName}`, JSON.stringify(toolArgs, null, 2));
        
        // Create a copy of the arguments that we can modify
        let modifiedArgs = { ...toolArgs };
        
        // Special handling for maas_get_machine_details
        if (toolName === 'maas_get_machine_details') {
          console.log("Original system_id:", toolArgs.system_id);
          
          // Try different variations of the system_id parameter
          if (toolArgs.system_id) {
            modifiedArgs = {
              ...modifiedArgs,
              SystemID: toolArgs.system_id,
              system_id: toolArgs.system_id
            };
          } else if (toolArgs.SystemID) {
            modifiedArgs = {
              ...modifiedArgs,
              system_id: toolArgs.SystemID,
              SystemID: toolArgs.SystemID
            };
          }
          
          console.log("Modified tool args:", JSON.stringify(modifiedArgs, null, 2));
        }
        
        // Create a new request with the MAAS tool name and arguments
        const maasRequest: JSONRPCRequest = {
          jsonrpc: '2.0',
          method: toolName,
          params: modifiedArgs,
          id: request.id,
        };

        console.log("Sending MAAS request:", JSON.stringify(maasRequest, null, 2));

        // Handle the MAAS request
        await this._handleMaasRequest(maasRequest);
        return;
      }

      // Check if this is a custom tool
      const tool = this._tools.get(toolName);
      if (!tool) {
        await this._sendError(request.id, -32601, `Method not found: ${toolName}`);
        return;
      }

      // Handle the custom tool request
      const result = await tool.handler(toolArgs, {
        sendNotification: async (notification) => {
          if (!this._transport) return;
          
          await this._transport.send({
            jsonrpc: '2.0',
            method: notification.method,
            params: notification.params,
            id: null,
          });
        },
      });

      // Format the result for Roo
      const formattedResult = {
        content: [
          {
            type: "text",
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
          }
        ]
      };

      console.log("Formatted tool result:", JSON.stringify(formattedResult, null, 2));

      // Send the response
      await this._transport?.send({
        jsonrpc: '2.0',
        result: formattedResult,
        id: request.id,
      });
    } catch (error) {
      console.error('Error handling tools/call request:', error);
      await this._sendError(
        request.id,
        -32603,
        `Internal error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Handle a tool request
   */
  private async _handleToolRequest(
    request: JSONRPCRequest,
    tool: ToolDefinition,
  ): Promise<void> {
    try {
      const result = await tool.handler(request.params as any, {
        sendNotification: async (notification) => {
          if (!this._transport) return;
          
          await this._transport.send({
            jsonrpc: '2.0',
            method: notification.method,
            params: notification.params,
            id: null,
          });
        },
      });

      await this._transport?.send({
        jsonrpc: '2.0',
        result,
        id: request.id,
      });
    } catch (error) {
      await this._sendError(
        request.id,
        -32603,
        `Tool error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Send an error response
   */
  private async _sendError(
    id: RequestId,
    code: number,
    message: string,
    data?: unknown,
  ): Promise<void> {
    await this._transport?.send({
      jsonrpc: '2.0',
      error: {
        code,
        message,
        data,
      },
      id,
    });
  }
}

export interface ToolContext {
  sendNotification: (notification: { method: string; params: unknown }) => Promise<void>;
}

export type ToolHandler<T> = (
  params: T,
  context: ToolContext,
) => Promise<unknown>;

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: unknown;
  handler: ToolHandler<any>;
}