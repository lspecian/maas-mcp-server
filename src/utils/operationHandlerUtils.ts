const { createRequestLogger } = require("./logger");
const { 
  createDerivedSignal, 
  onAbort, 
  throwIfAborted, 
  isAbortError, 
  handleAbortError,
  AbortedOperationError
} = require("./abortSignalUtils");
const { 
  registerOperation, 
  unregisterOperation, 
  getOperation, 
  updateOperation 
} = require("./operationsRegistry");
const { MaasServerError, ErrorType } = require("./errorHandler");

/**
 * Context for operation handlers
 * 
 * This context is passed to operation handlers and provides methods for
 * registering, updating, and unregistering operations.
 */
class OperationContext {
  constructor() {
    this.operations = [];
  }

  /**
   * Register a new operation
   * 
   * @param {Object} operation - The operation to register
   * @returns {string} The operation ID
   */
  registerOperation(operation) {
    const operationId = registerOperation(operation);
    this.operations.push(operationId);
    return operationId;
  }

  /**
   * Update an operation
   * 
   * @param {string} operationId - The ID of the operation to update
   * @param {Object} updates - The updates to apply to the operation
   */
  updateOperation(operationId, updates) {
    updateOperation(operationId, updates);
  }

  /**
   * Unregister an operation
   * 
   * @param {string} operationId - The ID of the operation to unregister
   */
  unregisterOperation(operationId) {
    unregisterOperation(operationId);
    this.operations = this.operations.filter(id => id !== operationId);
  }

  /**
   * Get an operation
   * 
   * @param {string} operationId - The ID of the operation to get
   * @returns {Object} The operation
   */
  getOperation(operationId) {
    return getOperation(operationId);
  }

  /**
   * Clean up all operations registered by this context
   */
  cleanup() {
    this.operations.forEach(operationId => {
      try {
        unregisterOperation(operationId);
      } catch (error) {
        // Ignore errors during cleanup
      }
    });
    this.operations = [];
  }
}

/**
 * Wrap an operation handler with common error handling and cleanup
 * 
 * This function wraps an operation handler with common error handling and
 * cleanup logic. It creates a new OperationContext for the handler, and
 * ensures that all operations registered by the handler are cleaned up
 * when the handler completes, whether successfully or with an error.
 * 
 * @param {Function} handler - The operation handler to wrap
 * @returns {Function} The wrapped handler
 */
function withOperationHandler(handler) {
  return async (params, signal) => {
    const context = new OperationContext();
    
    try {
      return await handler(params, signal, context);
    } finally {
      context.cleanup();
    }
  };
}

/**
 * Handle an operation error
 * 
 * This function handles errors from operations, converting them to
 * appropriate MaasServerError instances.
 * 
 * @param {Error} error - The error to handle
 * @param {string} message - The error message
 * @returns {Error} The handled error
 * @throws {MaasServerError} If the error is a MaasServerError
 */
function handleOperationError(error, message) {
  if (error instanceof MaasServerError) {
    throw error;
  }
  
  if (isAbortError(error) || error instanceof AbortedOperationError) {
    throw new MaasServerError(
      message || 'Operation was aborted',
      ErrorType.OPERATION_ABORTED,
      { originalError: error }
    );
  }
  
  throw new MaasServerError(
    message || 'Operation failed',
    ErrorType.OPERATION_FAILED,
    { originalError: error }
  );
}

module.exports = {
  OperationContext,
  withOperationHandler,
  handleOperationError
};