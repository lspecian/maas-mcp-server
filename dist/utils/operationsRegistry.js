"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { createRequestLogger } = require("./logger");
const { AbortedOperationError, onAbort } = require("./abortSignalUtils");
/**
 * Enum representing the possible states of a long-running operation
 *
 * These status values track the lifecycle of an operation from creation to completion:
 * - PENDING: Operation has been created but not yet started
 * - RUNNING: Operation is currently in progress
 * - COMPLETED: Operation has successfully completed
 * - FAILED: Operation has failed
 * - ABORTED: Operation was aborted
 */
const OperationStatus = {
    PENDING: 'PENDING',
    RUNNING: 'RUNNING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    ABORTED: 'ABORTED'
};
/**
 * Registry for tracking long-running operations
 *
 * This registry maintains a map of operation IDs to operation objects,
 * allowing the system to track the status of operations and provide
 * updates to clients.
 */
const operations = new Map();
const logger = createRequestLogger('operationsRegistry');
/**
 * Generate a unique operation ID
 *
 * @returns {string} A unique operation ID
 */
function generateOperationId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
/**
 * Register a new operation in the registry
 *
 * @param {Object} operation - The operation to register
 * @returns {string} The operation ID
 */
function registerOperation(operation) {
    const operationId = generateOperationId();
    const registeredOperation = {
        id: operationId,
        status: OperationStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...operation
    };
    operations.set(operationId, registeredOperation);
    logger.info({ operationId, operation: registeredOperation }, 'Registered operation');
    return operationId;
}
/**
 * Get an operation from the registry
 *
 * @param {string} operationId - The ID of the operation to get
 * @returns {Object} The operation
 * @throws {Error} If the operation is not found
 */
function getOperation(operationId) {
    const operation = operations.get(operationId);
    if (!operation) {
        throw new Error(`Operation not found: ${operationId}`);
    }
    return operation;
}
/**
 * Update an operation in the registry
 *
 * @param {string} operationId - The ID of the operation to update
 * @param {Object} updates - The updates to apply to the operation
 * @returns {Object} The updated operation
 * @throws {Error} If the operation is not found
 */
function updateOperation(operationId, updates) {
    const operation = getOperation(operationId);
    const updatedOperation = {
        ...operation,
        ...updates,
        updatedAt: new Date()
    };
    operations.set(operationId, updatedOperation);
    logger.info({ operationId, updates, operation: updatedOperation }, 'Updated operation');
    return updatedOperation;
}
/**
 * Unregister an operation from the registry
 *
 * @param {string} operationId - The ID of the operation to unregister
 * @throws {Error} If the operation is not found
 */
function unregisterOperation(operationId) {
    getOperation(operationId); // Throws if not found
    operations.delete(operationId);
    logger.info({ operationId }, 'Unregistered operation');
}
/**
 * Get all operations from the registry
 *
 * @returns {Array} All operations
 */
function getAllOperations() {
    return Array.from(operations.values());
}
module.exports = {
    OperationStatus,
    registerOperation,
    getOperation,
    updateOperation,
    unregisterOperation,
    getAllOperations
};
