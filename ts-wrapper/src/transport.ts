import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { JSONRPCMessage, JSONRPCMessageSchema, RequestId, isJSONRPCError, isJSONRPCResponse } from './types.js';

/**
 * Interface for a transport that can send and receive messages
 */
export interface Transport {
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;
  send(message: JSONRPCMessage, options?: { relatedRequestId?: RequestId }): Promise<void>;
  close(): Promise<void>;
}

/**
 * Server transport for SSE: this will send messages over an SSE connection and receive messages from HTTP POST requests.
 */
export class SSEServerTransport implements Transport {
  private _sseResponse?: Response;
  private _sessionId: string;

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  /**
   * Creates a new SSE server transport
   */
  constructor(
    private _endpoint: string,
    private res: Response,
  ) {
    this._sessionId = randomUUID();
  }

  /**
   * Handles the initial SSE connection request.
   */
  async start(): Promise<void> {
    if (this._sseResponse) {
      throw new Error(
        "SSEServerTransport already started!"
      );
    }

    this.res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": "true",
    });

    // Send the endpoint event
    const endpointUrl = new URL(this._endpoint, 'http://localhost');
    endpointUrl.searchParams.set('sessionId', this._sessionId);

    // Reconstruct the relative URL string
    const relativeUrlWithSession = endpointUrl.pathname + endpointUrl.search + endpointUrl.hash;

    this.res.write(
      `event: endpoint\ndata: ${relativeUrlWithSession}\n\n`,
    );

    this._sseResponse = this.res;
    this.res.on("close", () => {
      this._sseResponse = undefined;
      this.onclose?.();
    });
  }

  /**
   * Handles incoming POST messages.
   */
  async handlePostMessage(
    req: Request,
    res: Response,
    parsedBody?: unknown,
  ): Promise<void> {
    if (!this._sseResponse) {
      const message = "SSE connection not established";
      res.status(500).send(message);
      throw new Error(message);
    }

    let body = parsedBody ?? req.body;

    try {
      await this.handleMessage(body);
    } catch (error) {
      res.status(400).send(`Invalid message: ${JSON.stringify(body)}`);
      return;
    }

    res.status(202).send("Accepted");
  }

  /**
   * Handle a client message
   */
  async handleMessage(message: unknown): Promise<void> {
    let parsedMessage: JSONRPCMessage;
    try {
      parsedMessage = JSONRPCMessageSchema.parse(message);
    } catch (error) {
      this.onerror?.(error as Error);
      throw error;
    }

    this.onmessage?.(parsedMessage);
  }

  async close(): Promise<void> {
    this._sseResponse?.end();
    this._sseResponse = undefined;
    this.onclose?.();
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (!this._sseResponse) {
      throw new Error("Not connected");
    }

    this._sseResponse.write(
      `event: message\ndata: ${JSON.stringify(message)}\n\n`,
    );
  }

  /**
   * Returns the session ID for this transport.
   */
  get sessionId(): string {
    return this._sessionId;
  }
}