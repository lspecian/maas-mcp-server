import { createRequestLogger } from "./logger.js";
import { 
  createDerivedSignal, 
  onAbort, 
  throwIfAborted, 
  isAbortError, 
  handleAbortError,
  AbortedOperationError
} from "./abortSignalUtils.js";
import { 
  createProgressSender, 
  SendNotificationFunction, 
  RateLimitConfig, 
  DEFAULT_RATE_LIMIT_CONFIG 
} from "./progressNotification.js";
import {
  registerOperation,
  updateOperation,
  OperationStatus,
  OperationDetails
} from "./operationsRegistry.js";
import { errorToMcpResult, MaasServerError, ErrorType } from "./errorHandler.js";

/**
 * Interface defining the operation context that's passed to operation handlers
 *
 * This context provides all the necessary utilities and information for handling
 * long-running operations, including progress reporting, logging, abort handling,
 * and access to operation details in the registry.
 */
export interface OperationContext {
  /** Unique identifier for the operation */
  progressToken: string | number;
  /** Request ID for logging */
  requestId: string;
  /** Name of the operation/tool */
  operationName: string;
  /** Function to send progress notifications */
  sendProgress: (progress: number, message: string, total?: number, important?: boolean) => Promise<void>;
  /** AbortSignal for the operation */
  signal: AbortSignal;
  /** Logger instance for the operation */
  logger: ReturnType<typeof createRequestLogger>;
  /** Function to unregister cleanup handlers */
  unregisterCleanup: () => void;
  /** Operation details from the registry */
  operationDetails: OperationDetails;
}

/**
 * Interface defining options for configuring operation handlers
 *
 * These options control various aspects of operation handling, including
 * timeouts, progress reporting, and initial state. Default values are
 * provided for all options in DEFAULT_OPERATION_HANDLER_OPTIONS.
 */
export interface OperationHandlerOptions {
  /** Optional timeout in milliseconds for the operation */
  timeout?: number;
  /** Optional rate limit configuration for progress notifications */
  rateLimitConfig?: RateLimitConfig;
  /** Optional initial status for the operation */
  initialStatus?: OperationStatus;
  /** Optional initial progress for the operation */
  initialProgress?: number;
  /** Optional total progress value */
  total?: number;
  /** Optional initial message */
  initialMessage?: string;
}

/**
 * Default configuration options for operation handlers
 *
 * These defaults provide reasonable values for most operations:
 * - 5-minute timeout
 * - Default rate limiting for progress notifications
 * - Initial PENDING status
 * - Progress starting at 0 out of 100
 * - Generic initial message
 */
export const DEFAULT_OPERATION_HANDLER_OPTIONS: OperationHandlerOptions = {
  timeout: 300000, // 5 minutes
  rateLimitConfig: DEFAULT_RATE_LIMIT_CONFIG,
  initialStatus: OperationStatus.PENDING,
  initialProgress: 0,
  total: 100,
  initialMessage: "Operation started"
};

/**
 * Creates an operation context with all necessary utilities for handling long-running operations
 *
 * This function sets up a complete environment for managing a long-running operation,
 * including:
 * - Progress notification handling
 * - Abort signal management with timeout support
 * - Operation registration in the central registry
 * - Logging with request ID tracking
 * - Automatic cleanup on abort
 *
 * @param progressToken - Token identifying the operation
 * @param operationName - Name of the operation/tool
 * @param sendNotification - MCP sendNotification function
 * @param signal - Optional parent AbortSignal
 * @param options - Optional operation handler options
 * @returns Operation context with utilities for progress notifications, abort handling, etc.
 *         Returns undefined if no progressToken is provided
 *
 * @example
 * // Create an operation context for a file upload operation
 * const context = createOperationContext(
 *   "upload-123",
 *   "uploadImage",
 *   sendNotification,
 *   parentSignal,
 *   {
 *     timeout: 600000, // 10 minutes
 *     initialMessage: "Preparing to upload image"
 *   }
 * );
 *
 * if (context) {
 *   // Use the context for the operation
 *   context.logger.info("Starting image upload");
 *   await context.sendProgress(0, "Initializing upload...");
 *
 *   // Check for abort before expensive operations
 *   throwIfAborted(context.signal, "Upload was aborted");
 *
 *   // Perform the operation...
 * }
 */
export function createOperationContext(
  progressToken: string | number | undefined,
  operationName: string,
  sendNotification: SendNotificationFunction | undefined,
  signal?: AbortSignal,
  options: OperationHandlerOptions = {}
): OperationContext | undefined {
  // If no progressToken, we can't create a proper operation context
  if (!progressToken) {
    return undefined;
  }

  // Merge options with defaults
  const mergedOptions = { ...DEFAULT_OPERATION_HANDLER_OPTIONS, ...options };
  
  // Generate a request ID if not provided
  const requestId = Date.now().toString(36);
  
  // Create a logger for this operation
  const logger = createRequestLogger(requestId, operationName, {});
  
  // Create a derived signal with timeout
  const derivedSignal = createDerivedSignal(signal, {
    timeout: mergedOptions.timeout,
    reason: `Operation ${operationName} timed out after ${mergedOptions.timeout}ms`,
    requestId,
    operationName
  });
  
  // Register the operation in the registry
  const operationDetails = registerOperation(progressToken, operationName, {
    initialStatus: mergedOptions.initialStatus,
    initialProgress: mergedOptions.initialProgress,
    total: mergedOptions.total,
    message: mergedOptions.initialMessage,
    signal: derivedSignal,
    requestId
  });
  
  // Create a progress sender
  const sendProgress = createProgressSender(
    progressToken,
    sendNotification,
    requestId,
    operationName,
    mergedOptions.rateLimitConfig,
    derivedSignal
  );
  
  // Register cleanup function to be called if aborted
  const unregisterCleanup = onAbort(derivedSignal, async () => {
    logger.warn('Operation aborted, cleaning up resources');
    
    // Update operation status in registry
    updateOperation(progressToken, {
      status: OperationStatus.ABORTED,
      message: `Operation aborted: ${derivedSignal.reason || 'Unknown reason'}`
    });
    
    // Send final progress notification
    await sendProgress(
      operationDetails.total, 
      `Operation aborted: ${derivedSignal.reason || 'Unknown reason'}`,
      operationDetails.total,
      true
    );
  });
  
  return {
    progressToken,
    requestId,
    operationName,
    sendProgress,
    signal: derivedSignal,
    logger,
    unregisterCleanup,
    operationDetails
  };
}

/**
 * Type definition for operation handler functions
 *
 * This type represents the signature of functions that implement the actual
 * business logic for long-running operations. These functions receive the
 * operation parameters and context, and return a promise that resolves to
 * the operation result.
 */
export type OperationHandlerFunction<T, P> = (
  params: P,
  context: OperationContext
) => Promise<T>;

/**
 * Wraps an operation handler function with common functionality for progress notifications,
 * abort handling, and operation registry integration
 *
 * This higher-order function takes an operation handler and wraps it with standardized
 * functionality for:
 * - Creating and managing the operation context
 * - Registering the operation in the central registry
 * - Sending initial and final progress notifications
 * - Handling errors and aborts consistently
 * - Updating operation status in the registry
 * - Cleaning up resources when the operation completes or fails
 *
 * @param operationName - Name of the operation
 * @param handler - The operation handler function implementing the business logic
 * @param options - Optional operation handler options
 * @returns A wrapped function that handles common tasks and delegates to the handler
 *
 * @example
 * // Define an operation handler
 * async function uploadImageHandler(
 *   params: UploadImageParams,
 *   context: OperationContext
 * ) {
 *   // Implementation...
 *   return { imageId: "img-123" };
 * }
 *
 * // Wrap the handler with common functionality
 * const wrappedHandler = withOperationHandler(
 *   "uploadImage",
 *   uploadImageHandler,
 *   { timeout: 600000 }
 * );
 *
 * // Register with MCP server
 * server.tool(
 *   "maas_upload_image",
 *   uploadImageSchema.shape,
 *   async (params, extra) => wrappedHandler(params, extra)
 * );
 */
export function withOperationHandler<T, P extends { _meta?: { progressToken?: string | number } }>(
  operationName: string,
  handler: OperationHandlerFunction<T, P>,
  options: OperationHandlerOptions = {}
): (params: P, extras: { signal?: AbortSignal; sendNotification?: SendNotificationFunction }) => Promise<T> {
  return async (
    params: P,
    { signal, sendNotification }: { signal?: AbortSignal; sendNotification?: SendNotificationFunction }
  ): Promise<T> => {
    const progressToken = params._meta?.progressToken;
    
    // Create operation context
    const context = createOperationContext(
      progressToken,
      operationName,
      sendNotification,
      signal,
      options
    );
    
    // If no context (no progressToken), just call the handler directly
    if (!context) {
      return handler(params, {
        progressToken: undefined as any,
        requestId: Date.now().toString(36),
        operationName,
        sendProgress: async () => {},
        signal: signal || new AbortController().signal,
        logger: createRequestLogger(Date.now().toString(36), operationName, {}),
        unregisterCleanup: () => {},
        operationDetails: {} as any
      });
    }
    
    try {
      // Update operation status to running
      updateOperation(context.progressToken, {
        status: OperationStatus.RUNNING,
        message: `Operation ${operationName} started`
      });
      
      // Send initial progress notification
      await context.sendProgress(
        context.operationDetails.progress,
        context.operationDetails.message,
        context.operationDetails.total,
        true
      );
      
      // Call the handler
      const result = await handler(params, context);
      
      // Update operation status to completed
      updateOperation(context.progressToken, {
        status: OperationStatus.COMPLETED,
        progress: context.operationDetails.total,
        message: `Operation ${operationName} completed successfully`,
        result
      });
      
      // Send final progress notification
      await context.sendProgress(
        context.operationDetails.total,
        `Operation ${operationName} completed successfully`,
        context.operationDetails.total,
        true
      );
      
      // Unregister cleanup as operation completed successfully
      context.unregisterCleanup();
      
      return result;
    } catch (error: any) {
      // Unregister cleanup as we're handling the error
      context.unregisterCleanup();
      
      // Check if this is an abort error
      if (isAbortError(error)) {
        context.logger.warn({ error: error.message }, 'Operation aborted');
        
        // Update operation status to aborted
        updateOperation(context.progressToken, {
          status: OperationStatus.ABORTED,
          message: `Operation aborted: ${error.message}`
        });
        
        // Send final progress notification
        await context.sendProgress(
          context.operationDetails.progress,
          `Operation aborted: ${error.message}`,
          context.operationDetails.total,
          true
        );
        
        throw error;
      }
      
      // Handle other errors
      context.logger.error({ error: error.message }, 'Operation failed');
      
      // Update operation status to failed
      updateOperation(context.progressToken, {
        status: OperationStatus.FAILED,
        message: `Operation failed: ${error.message}`,
        error: error.message
      });
      
      // Send final progress notification
      await context.sendProgress(
        context.operationDetails.progress,
        `Operation failed: ${error.message}`,
        context.operationDetails.total,
        true
      );
      
      throw error;
    }
  };
}

/**
 * Helper function to handle common error patterns in operation handlers
 *
 * This function provides standardized error handling for operation handlers,
 * converting various error types into appropriate MCP error responses.
 * It supports:
 * - Special handling for abort errors
 * - Custom error handlers for operation-specific error patterns
 * - Default error handling for unhandled errors
 *
 * @param error - The error to handle
 * @param context - The operation context
 * @param customErrorHandlers - Optional custom error handlers that can process specific error types
 * @returns The MCP result with error information formatted for the client
 *
 * @example
 * // Handle errors in an operation handler
 * try {
 *   // Operation implementation...
 * } catch (error) {
 *   return handleOperationError(error, context, [
 *     // Custom handler for validation errors
 *     (error) => {
 *       if (error.name === 'ValidationError') {
 *         return {
 *           isHandled: true,
 *           result: {
 *             content: [{ type: "text", text: `Invalid parameters: ${error.message}` }],
 *             isError: true
 *           }
 *         };
 *       }
 *       return undefined; // Not handled
 *     }
 *   ]);
 * }
 */
export function handleOperationError(
  error: any,
  context: OperationContext,
  customErrorHandlers?: ((error: any) => { isHandled: boolean; result: any } | undefined)[]
): { content: { type: string; text: string }[]; isError: boolean } {
  // Check if this is an abort error
  if (isAbortError(error)) {
    return errorToMcpResult(
      new MaasServerError(
        `Operation ${context.operationName} was aborted: ${error.message}`,
        ErrorType.OPERATION_ABORTED,
        499 // Client Closed Request
      )
    );
  }
  
  // Try custom error handlers if provided
  if (customErrorHandlers) {
    for (const handler of customErrorHandlers) {
      const result = handler(error);
      if (result?.isHandled) {
        return result.result;
      }
    }
  }
  
  // Default error handling
  return errorToMcpResult(
    new MaasServerError(
      `Operation ${context.operationName} failed: ${error.message}`,
      ErrorType.INTERNAL,
      500
    )
  );
}