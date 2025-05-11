import { createRequestLogger } from "./logger.js";
import { AbortedOperationError, onAbort } from "./abortSignalUtils.js";

/**
 * Enum representing the possible states of a long-running operation
 *
 * These status values track the lifecycle of an operation from creation to completion:
 * - PENDING: Operation has been created but not yet started
 * - RUNNING: Operation is currently in progress
 * - COMPLETED: Operation has successfully completed
 * - FAILED: Operation encountered an error and could not complete
 * - ABORTED: Operation was manually cancelled or timed out
 */
export enum OperationStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  ABORTED = "aborted"
}

/**
 * Interface defining the structure of operation details
 *
 * This interface represents all the information tracked for a long-running operation,
 * including its current status, progress, timestamps, and associated metadata.
 * It serves as the central data structure for operation tracking and management.
 */
export interface OperationDetails {
  /** Unique token identifying the operation */
  progressToken: string | number;
  /** Type of operation (e.g., "deployMachine", "uploadImage") */
  operationType: string;
  /** Current status of the operation */
  status: OperationStatus;
  /** Timestamp when the operation was registered */
  startTime: number;
  /** Timestamp of the last update to the operation */
  lastUpdateTime: number;
  /** Current progress value */
  progress: number;
  /** Total progress value */
  total: number;
  /** Latest message associated with the operation */
  message: string;
  /** Optional error message if the operation failed */
  error?: string;
  /** Optional result data for completed operations */
  result?: any;
  /** Optional AbortController for the operation */
  abortController?: AbortController;
  /** Optional request ID for logging */
  requestId?: string;
}

/**
 * Interface defining options when registering a new operation
 *
 * These options allow customizing the initial state of an operation when it's
 * first registered in the operations registry. Default values will be used for
 * any options not explicitly provided.
 */
export interface RegisterOperationOptions {
  /** Optional initial status (default: PENDING) */
  initialStatus?: OperationStatus;
  /** Optional initial progress (default: 0) */
  initialProgress?: number;
  /** Optional total progress (default: 100) */
  total?: number;
  /** Optional initial message */
  message?: string;
  /** Optional AbortSignal to abort the operation */
  signal?: AbortSignal;
  /** Optional request ID for logging */
  requestId?: string;
}

/**
 * Interface defining options when updating an existing operation
 *
 * These options specify which aspects of an operation should be updated.
 * Only the properties explicitly included in the options object will be modified.
 */
export interface UpdateOperationOptions {
  /** Optional new status */
  status?: OperationStatus;
  /** Optional new progress value */
  progress?: number;
  /** Optional new message */
  message?: string;
  /** Optional error message (if status is FAILED) */
  error?: string;
  /** Optional result data (if status is COMPLETED) */
  result?: any;
}

/**
 * Interface defining options for querying operations
 *
 * These options allow filtering and paginating the results when querying
 * the operations registry. Multiple filters can be combined to narrow down
 * the results to specific operations.
 */
export interface QueryOperationsOptions {
  /** Optional status to filter by */
  status?: OperationStatus;
  /** Optional operation type to filter by */
  operationType?: string;
  /** Optional minimum start time (timestamp) */
  startedAfter?: number;
  /** Optional maximum start time (timestamp) */
  startedBefore?: number;
  /** Optional minimum last update time (timestamp) */
  updatedAfter?: number;
  /** Optional maximum last update time (timestamp) */
  updatedBefore?: number;
  /** Optional pagination offset */
  offset?: number;
  /** Optional pagination limit */
  limit?: number;
}

/**
 * Interface defining configuration options for automatic cleanup
 *
 * These options control how and when stale operations are automatically
 * removed from the registry to prevent memory leaks and ensure the registry
 * doesn't grow indefinitely.
 */
export interface CleanupConfig {
  /** 
   * Interval in milliseconds between cleanup runs
   * Default: 60000 (1 minute)
   */
  cleanupInterval?: number;
  /**
   * Maximum age in milliseconds for completed/failed/aborted operations
   * Default: 3600000 (1 hour)
   */
  maxCompletedAge?: number;
  /**
   * Maximum age in milliseconds for operations without updates
   * Default: 86400000 (24 hours)
   */
  maxStaleAge?: number;
}

/**
 * Default cleanup configuration
 */
export const DEFAULT_CLEANUP_CONFIG: CleanupConfig = {
  cleanupInterval: 60000, // 1 minute
  maxCompletedAge: 3600000, // 1 hour
  maxStaleAge: 86400000 // 24 hours
};

/**
 * Registry for tracking and managing long-running operations
 *
 * This class provides a centralized system for registering, updating, querying,
 * and cleaning up long-running operations. It maintains the state of all operations
 * and provides methods for interacting with them.
 *
 * The registry supports:
 * - Registering new operations with unique tokens
 * - Updating operation status, progress, and messages
 * - Querying operations based on various criteria
 * - Automatic cleanup of completed and stale operations
 * - Aborting operations that are still in progress
 */
export class OperationsRegistry {
  private operations = new Map<string, OperationDetails>();
  private cleanupTimer: NodeJS.Timeout | null = null;
  private cleanupConfig: CleanupConfig;
  private logger = createRequestLogger("operations-registry", "OperationsRegistry", {});

  /**
   * Creates a new operations registry
   *
   * Initializes a new registry for tracking long-running operations.
   * The registry will automatically clean up completed and stale operations
   * based on the provided configuration.
   *
   * @param cleanupConfig - Optional configuration for automatic cleanup
   *
   * @example
   * // Create a registry with custom cleanup settings
   * const registry = new OperationsRegistry({
   *   cleanupInterval: 120000, // Run cleanup every 2 minutes
   *   maxCompletedAge: 7200000, // Keep completed operations for 2 hours
   *   maxStaleAge: 43200000 // Consider operations stale after 12 hours
   * });
   */
  constructor(cleanupConfig: CleanupConfig = DEFAULT_CLEANUP_CONFIG) {
    this.cleanupConfig = { ...DEFAULT_CLEANUP_CONFIG, ...cleanupConfig };
    this.startCleanupTimer();
  }

  /**
   * Registers a new operation in the registry
   *
   * Creates a new entry in the operations registry with the specified token and type.
   * The operation is initialized with the provided options or default values.
   * If an AbortSignal is provided, the operation will be automatically aborted
   * if the signal is aborted.
   *
   * @param progressToken - Unique token identifying the operation
   * @param operationType - Type of operation (e.g., "deployMachine", "uploadImage")
   * @param options - Optional registration options
   * @returns The registered operation details
   *
   * @example
   * // Register a new operation with a timeout
   * const controller = new AbortController();
   * setTimeout(() => controller.abort("Operation timed out"), 30000);
   *
   * const operation = registry.registerOperation(
   *   "upload-123",
   *   "uploadImage",
   *   {
   *     initialStatus: OperationStatus.RUNNING,
   *     initialProgress: 0,
   *     total: 100,
   *     message: "Starting image upload...",
   *     signal: controller.signal,
   *     requestId: "req-456"
   *   }
   * );
   */
  registerOperation(
    progressToken: string | number,
    operationType: string,
    options: RegisterOperationOptions = {}
  ): OperationDetails {
    const tokenKey = progressToken.toString();
    const now = Date.now();
    
    // Create abort controller if signal is provided
    let abortController: AbortController | undefined;
    let initialStatus = options.initialStatus || OperationStatus.PENDING;
    
    if (options.signal) {
      abortController = new AbortController();
      
      // If parent signal is already aborted, abort the operation immediately
      if (options.signal.aborted) {
        abortController.abort(options.signal.reason);
        initialStatus = OperationStatus.ABORTED;
      } else {
        // Forward abort from parent signal
        onAbort(options.signal, () => {
          abortController?.abort(options.signal?.reason);
          // Update the operation status to aborted
          const tokenKey = progressToken.toString();
          const op = this.operations.get(tokenKey);
          if (op) {
            op.status = OperationStatus.ABORTED;
            op.message = `Operation aborted: ${options.signal?.reason || 'Parent signal was aborted'}`;
            op.lastUpdateTime = Date.now();
            this.operations.set(tokenKey, op);
          }
        });
      }
    }
    
    const operation: OperationDetails = {
      progressToken,
      operationType,
      status: initialStatus,
      startTime: now,
      lastUpdateTime: now,
      progress: options.initialProgress !== undefined ? options.initialProgress : 0,
      total: options.total || 100,
      message: options.message || `Operation ${operationType} started`,
      abortController,
      requestId: options.requestId
    };
    
    this.operations.set(tokenKey, operation);
    
    this.logger.debug(
      { progressToken, operationType, status: operation.status },
      `Registered new operation`
    );
    
    return operation;
  }

  /**
   * Updates an existing operation in the registry
   *
   * Modifies the state of an operation identified by the provided token.
   * Only the properties specified in the options object will be updated.
   * The operation's lastUpdateTime is always updated to the current time.
   *
   * @param progressToken - Token of the operation to update
   * @param options - Update options
   * @returns The updated operation details or undefined if not found
   *
   * @example
   * // Update an operation's progress and message
   * registry.updateOperation("upload-123", {
   *   progress: 75,
   *   message: "Uploading image: 75% complete"
   * });
   *
   * // Mark an operation as completed with a result
   * registry.updateOperation("upload-123", {
   *   status: OperationStatus.COMPLETED,
   *   progress: 100,
   *   message: "Upload completed successfully",
   *   result: { imageId: "img-789", url: "https://example.com/images/img-789.jpg" }
   * });
   */
  updateOperation(
    progressToken: string | number,
    options: UpdateOperationOptions
  ): OperationDetails | undefined {
    const tokenKey = progressToken.toString();
    const operation = this.operations.get(tokenKey);
    
    if (!operation) {
      this.logger.warn(
        { progressToken },
        `Attempted to update non-existent operation`
      );
      return undefined;
    }
    
    // Update the operation
    if (options.status !== undefined) {
      operation.status = options.status;
    }
    
    if (options.progress !== undefined) {
      operation.progress = options.progress;
    }
    
    if (options.message !== undefined) {
      operation.message = options.message;
    }
    
    if (options.error !== undefined) {
      operation.error = options.error;
    }
    
    if (options.result !== undefined) {
      operation.result = options.result;
    }
    
    // Update the last update time
    operation.lastUpdateTime = Date.now();
    
    // If status is terminal, clean up the abort controller
    if (
      operation.status === OperationStatus.COMPLETED ||
      operation.status === OperationStatus.FAILED ||
      operation.status === OperationStatus.ABORTED
    ) {
      operation.abortController = undefined;
    }
    
    this.operations.set(tokenKey, operation);
    
    this.logger.debug(
      { 
        progressToken, 
        status: operation.status, 
        progress: operation.progress,
        message: operation.message
      },
      `Updated operation`
    );
    
    return operation;
  }

  /**
   * Retrieves an operation from the registry
   *
   * Looks up an operation by its unique token and returns its details.
   * Returns undefined if no operation with the specified token exists.
   *
   * @param progressToken - Token of the operation to retrieve
   * @returns The operation details or undefined if not found
   *
   * @example
   * // Get operation details
   * const operation = registry.getOperation("upload-123");
   * if (operation) {
   *   console.log(`Operation status: ${operation.status}`);
   *   console.log(`Progress: ${operation.progress}/${operation.total}`);
   *   console.log(`Last message: ${operation.message}`);
   * } else {
   *   console.log("Operation not found");
   * }
   */
  getOperation(progressToken: string | number): OperationDetails | undefined {
    const tokenKey = progressToken.toString();
    return this.operations.get(tokenKey);
  }

  /**
   * Removes an operation from the registry
   *
   * Deletes an operation from the registry and aborts it if it's still in progress.
   * This method is useful for manually cleaning up operations that are no longer needed.
   *
   * @param progressToken - Token of the operation to remove
   * @returns True if the operation was removed, false if not found
   *
   * @example
   * // Remove an operation from the registry
   * const removed = registry.removeOperation("upload-123");
   * console.log(removed ? "Operation removed" : "Operation not found");
   */
  removeOperation(progressToken: string | number): boolean {
    const tokenKey = progressToken.toString();
    const operation = this.operations.get(tokenKey);
    
    if (!operation) {
      return false;
    }
    
    // Abort the operation if it has an abort controller
    if (operation.abortController) {
      operation.abortController.abort("Operation removed from registry");
    }
    
    const removed = this.operations.delete(tokenKey);
    
    if (removed) {
      this.logger.debug(
        { progressToken, operationType: operation.operationType },
        `Removed operation from registry`
      );
    }
    
    return removed;
  }

  /**
   * Aborts an operation
   *
   * Cancels an in-progress operation and updates its status to ABORTED.
   * This method has no effect on operations that are already in a terminal state
   * (COMPLETED, FAILED, or ABORTED).
   *
   * @param progressToken - Token of the operation to abort
   * @param reason - Optional reason for the abort
   * @returns True if the operation was aborted, false if not found or already completed
   *
   * @example
   * // Abort an operation with a reason
   * const aborted = registry.abortOperation("upload-123", "User cancelled the upload");
   * if (aborted) {
   *   console.log("Operation was successfully aborted");
   * } else {
   *   console.log("Operation could not be aborted (not found or already completed)");
   * }
   */
  abortOperation(progressToken: string | number, reason?: string): boolean {
    const tokenKey = progressToken.toString();
    const operation = this.operations.get(tokenKey);
    
    if (!operation) {
      return false;
    }
    
    // Cannot abort already completed/failed/aborted operations
    if (
      operation.status === OperationStatus.COMPLETED ||
      operation.status === OperationStatus.FAILED ||
      operation.status === OperationStatus.ABORTED
    ) {
      return false;
    }
    
    // Abort the operation
    if (operation.abortController) {
      operation.abortController.abort(reason || "Operation aborted");
    }
    
    // Update the operation status
    this.updateOperation(progressToken, {
      status: OperationStatus.ABORTED,
      message: reason || "Operation aborted"
    });
    
    return true;
  }

  /**
   * Queries operations based on specified criteria
   *
   * Searches the operations registry for operations matching the provided criteria.
   * Multiple filters can be combined to narrow down the results. Results are sorted
   * by start time (newest first) and can be paginated using offset and limit.
   *
   * @param options - Query options
   * @returns Array of matching operations
   *
   * @example
   * // Get all failed operations from the last hour
   * const oneHourAgo = Date.now() - 3600000;
   * const failedOperations = registry.queryOperations({
   *   status: OperationStatus.FAILED,
   *   startedAfter: oneHourAgo
   * });
   *
   * // Get the 10 most recent operations of a specific type
   * const recentUploads = registry.queryOperations({
   *   operationType: "uploadImage",
   *   limit: 10
   * });
   */
  queryOperations(options: QueryOperationsOptions = {}): OperationDetails[] {
    let results = Array.from(this.operations.values());
    
    // Apply filters
    if (options.status !== undefined) {
      results = results.filter(op => op.status === options.status);
    }
    
    if (options.operationType !== undefined) {
      results = results.filter(op => op.operationType === options.operationType);
    }
    
    if (options.startedAfter !== undefined) {
      results = results.filter(op => op.startTime >= options.startedAfter!);
    }
    
    if (options.startedBefore !== undefined) {
      results = results.filter(op => op.startTime <= options.startedBefore!);
    }
    
    if (options.updatedAfter !== undefined) {
      results = results.filter(op => op.lastUpdateTime >= options.updatedAfter!);
    }
    
    if (options.updatedBefore !== undefined) {
      results = results.filter(op => op.lastUpdateTime <= options.updatedBefore!);
    }
    
    // Sort by start time (newest first)
    results.sort((a, b) => b.startTime - a.startTime);
    
    // Apply pagination
    if (options.offset !== undefined || options.limit !== undefined) {
      const offset = options.offset || 0;
      const limit = options.limit !== undefined ? options.limit : results.length;
      results = results.slice(offset, offset + limit);
    }
    
    return results;
  }

  /**
   * Gets all active operations (pending or running)
   * 
   * @param options - Optional pagination options
   * @returns Array of active operations
   */
  getActiveOperations(options: { offset?: number; limit?: number } = {}): OperationDetails[] {
    return this.queryOperations({
      status: OperationStatus.RUNNING,
      offset: options.offset,
      limit: options.limit
    });
  }

  /**
   * Gets all operations of a specific type
   * 
   * @param operationType - Type of operations to retrieve
   * @param options - Optional pagination options
   * @returns Array of operations of the specified type
   */
  getOperationsByType(
    operationType: string,
    options: { offset?: number; limit?: number } = {}
  ): OperationDetails[] {
    return this.queryOperations({
      operationType,
      offset: options.offset,
      limit: options.limit
    });
  }

  /**
   * Starts the automatic cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    const interval = this.cleanupConfig.cleanupInterval || DEFAULT_CLEANUP_CONFIG.cleanupInterval!;
    
    this.cleanupTimer = setInterval(() => {
      this.cleanupStaleOperations();
    }, interval);
    
    // Ensure the timer doesn't prevent the process from exiting
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Cleans up stale operations based on the cleanup configuration
   */
  cleanupStaleOperations(): void {
    const now = Date.now();
    const maxCompletedAge = this.cleanupConfig.maxCompletedAge || DEFAULT_CLEANUP_CONFIG.maxCompletedAge!;
    const maxStaleAge = this.cleanupConfig.maxStaleAge || DEFAULT_CLEANUP_CONFIG.maxStaleAge!;
    
    let cleanedCount = 0;
    
    for (const [tokenKey, operation] of this.operations.entries()) {
      // Clean up completed/failed/aborted operations that are older than maxCompletedAge
      if (
        (operation.status === OperationStatus.COMPLETED ||
         operation.status === OperationStatus.FAILED ||
         operation.status === OperationStatus.ABORTED) &&
        now - operation.lastUpdateTime > maxCompletedAge
      ) {
        this.operations.delete(tokenKey);
        cleanedCount++;
        continue;
      }
      
      // Clean up any operations that haven't been updated for maxStaleAge
      if (now - operation.lastUpdateTime > maxStaleAge) {
        // Abort the operation if it has an abort controller
        if (operation.abortController) {
          operation.abortController.abort("Operation timed out due to inactivity");
        }
        
        this.operations.delete(tokenKey);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      this.logger.info(
        { cleanedCount, remainingCount: this.operations.size },
        `Cleaned up ${cleanedCount} stale operations`
      );
    }
  }

  /**
   * Stops the cleanup timer
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Gets the total number of operations in the registry
   */
  get size(): number {
    return this.operations.size;
  }

  /**
   * Clears all operations from the registry
   */
  clear(): void {
    // Abort all operations with abort controllers
    for (const operation of this.operations.values()) {
      if (operation.abortController) {
        operation.abortController.abort("Registry cleared");
      }
    }
    
    this.operations.clear();
    this.logger.info("Cleared all operations from registry");
  }
}

// Create a singleton instance of the operations registry
const operationsRegistry = new OperationsRegistry();

/**
 * Registers a new operation in the registry
 * 
 * @param progressToken - Unique token identifying the operation
 * @param operationType - Type of operation
 * @param options - Optional registration options
 * @returns The registered operation details
 */
export function registerOperation(
  progressToken: string | number,
  operationType: string,
  options: RegisterOperationOptions = {}
): OperationDetails {
  return operationsRegistry.registerOperation(progressToken, operationType, options);
}

/**
 * Updates an existing operation in the registry
 * 
 * @param progressToken - Token of the operation to update
 * @param options - Update options
 * @returns The updated operation details or undefined if not found
 */
export function updateOperation(
  progressToken: string | number,
  options: UpdateOperationOptions
): OperationDetails | undefined {
  return operationsRegistry.updateOperation(progressToken, options);
}

/**
 * Retrieves an operation from the registry
 * 
 * @param progressToken - Token of the operation to retrieve
 * @returns The operation details or undefined if not found
 */
export function getOperation(
  progressToken: string | number
): OperationDetails | undefined {
  return operationsRegistry.getOperation(progressToken);
}

/**
 * Removes an operation from the registry
 * 
 * @param progressToken - Token of the operation to remove
 * @returns True if the operation was removed, false if not found
 */
export function removeOperation(progressToken: string | number): boolean {
  return operationsRegistry.removeOperation(progressToken);
}

/**
 * Aborts an operation
 * 
 * @param progressToken - Token of the operation to abort
 * @param reason - Optional reason for the abort
 * @returns True if the operation was aborted, false if not found or already completed
 */
export function abortOperation(
  progressToken: string | number,
  reason?: string
): boolean {
  return operationsRegistry.abortOperation(progressToken, reason);
}

/**
 * Queries operations based on specified criteria
 * 
 * @param options - Query options
 * @returns Array of matching operations
 */
export function queryOperations(
  options: QueryOperationsOptions = {}
): OperationDetails[] {
  return operationsRegistry.queryOperations(options);
}

/**
 * Gets all active operations (pending or running)
 * 
 * @param options - Optional pagination options
 * @returns Array of active operations
 */
export function getActiveOperations(
  options: { offset?: number; limit?: number } = {}
): OperationDetails[] {
  return operationsRegistry.getActiveOperations(options);
}

/**
 * Gets all operations of a specific type
 * 
 * @param operationType - Type of operations to retrieve
 * @param options - Optional pagination options
 * @returns Array of operations of the specified type
 */
export function getOperationsByType(
  operationType: string,
  options: { offset?: number; limit?: number } = {}
): OperationDetails[] {
  return operationsRegistry.getOperationsByType(operationType, options);
}

/**
 * Manually triggers cleanup of stale operations
 */
export function cleanupStaleOperations(): void {
  operationsRegistry.cleanupStaleOperations();
}

/**
 * Gets the singleton instance of the operations registry
 */
export function getOperationsRegistry(): OperationsRegistry {
  return operationsRegistry;
}

export default operationsRegistry;