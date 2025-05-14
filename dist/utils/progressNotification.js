"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const { createRequestLogger } = require('./logger');
/**
 * @typedef {Object} ProgressNotificationParams
 * @property {string} [progressToken] - The progress token
 * @property {number} progress - The current progress value
 * @property {number} total - The total progress value
 * @property {string} message - The message to display
 * @property {boolean} [important] - Whether this is an important notification
 * @property {AbortSignal} [signal] - The abort signal
 */
/**
 * @typedef {Object} RateLimitConfig
 * @property {number} minInterval - The minimum interval between notifications in milliseconds
 * @property {boolean} alwaysSendFirst - Whether to always send the first notification
 * @property {boolean} alwaysSendLast - Whether to always send the last notification
 */
/**
 * Default rate limit configuration
 * @type {RateLimitConfig}
 */
const DEFAULT_RATE_LIMIT_CONFIG = {
    minInterval: 1000, // 1 second
    alwaysSendFirst: true,
    alwaysSendLast: true
};
// Store last notification time for each progress token
const lastNotificationTime = {};
/**
 * Clear rate limit history for testing purposes
 */
function clearRateLimitHistory() {
    Object.keys(lastNotificationTime).forEach(key => {
        delete lastNotificationTime[key];
    });
}
/**
 * Check if a notification should be rate limited
 * @param {string} progressToken - The progress token
 * @param {number} progress - The current progress value
 * @param {number} total - The total progress value
 * @param {boolean} [important=false] - Whether this is an important notification that should bypass rate limiting
 * @param {RateLimitConfig} [config=DEFAULT_RATE_LIMIT_CONFIG] - Rate limit configuration
 * @returns {boolean} Whether the notification should be sent
 */
function shouldSendNotification(progressToken, progress, total, important = false, config = DEFAULT_RATE_LIMIT_CONFIG) {
    // Important notifications always bypass rate limiting
    if (important) {
        return true;
    }
    // First notification (progress = 0) always sent if configured
    if (progress === 0 && config.alwaysSendFirst) {
        return true;
    }
    // Last notification (progress = total) always sent if configured
    if (progress === total && config.alwaysSendLast) {
        return true;
    }
    const now = Date.now();
    const lastTime = lastNotificationTime[progressToken] || 0;
    const timeDiff = now - lastTime;
    // Check if enough time has passed since the last notification
    return timeDiff >= config.minInterval;
}
/**
 * Send a progress notification
 * @param {ProgressNotificationParams} params - The notification parameters
 * @param {function(Object): Promise<void>} [sendNotification] - The function to call to send the notification
 * @param {string} [requestId] - Optional request ID for logging
 * @param {string} [toolName] - Optional tool name for logging
 * @param {RateLimitConfig} [rateLimitConfig=DEFAULT_RATE_LIMIT_CONFIG] - Optional rate limit configuration
 * @returns {Promise<void>} A promise that resolves when the notification has been sent
 */
async function sendProgressNotification(params, sendNotification, requestId, toolName, rateLimitConfig = DEFAULT_RATE_LIMIT_CONFIG) {
    // Skip if no progress token or send notification function
    if (!params.progressToken || !sendNotification) {
        return;
    }
    // Check if the operation has been aborted
    if (params.signal?.aborted) {
        return;
    }
    // Check if we should send this notification (rate limiting)
    if (!shouldSendNotification(params.progressToken, params.progress, params.total, params.important, rateLimitConfig)) {
        return;
    }
    // Update last notification time
    lastNotificationTime[params.progressToken] = Date.now();
    // Create logger if requestId and toolName are provided
    const logger = requestId && toolName ?
        createRequestLogger(requestId, toolName, {}) :
        null;
    try {
        // Send the notification
        await sendNotification({
            method: 'notifications/progress',
            params: {
                progressToken: params.progressToken,
                progress: params.progress,
                total: params.total,
                message: params.message
            }
        });
    }
    catch (error) {
        // Log warning if logger is available
        if (logger) {
            logger.warn({
                error: error instanceof Error ? error.message : String(error),
                progressToken: params.progressToken,
                progress: params.progress,
                total: params.total
            }, 'Failed to send progress notification');
        }
    }
}
/**
 * Create a function that sends progress notifications
 * @param {string} [progressToken] - The progress token
 * @param {function(Object): Promise<void>} [sendNotification] - The function to call to send the notification
 * @param {string} [requestId] - Optional request ID for logging
 * @param {string} [toolName] - Optional tool name for logging
 * @param {RateLimitConfig} [rateLimitConfig=DEFAULT_RATE_LIMIT_CONFIG] - Optional rate limit configuration
 * @param {AbortSignal} [signal] - Optional abort signal
 * @returns {function(number, string, number?, boolean?, AbortSignal?): Promise<void>} A function that can be called to send progress notifications
 */
function createProgressSender(progressToken, sendNotification, requestId, toolName, rateLimitConfig = DEFAULT_RATE_LIMIT_CONFIG, signal) {
    /**
     * Send a progress notification
     * @param {number} progress - The progress value
     * @param {string} message - The message to display
     * @param {number} [total=100] - The total progress value
     * @param {boolean} [important=false] - Whether this is an important notification
     * @param {AbortSignal} [overrideSignal] - Optional override abort signal
     * @returns {Promise<void>} A promise that resolves when the notification has been sent
     */
    return async function (progress, message, total = 100, important = false, overrideSignal) {
        // Use override signal if provided, otherwise use the default signal
        const activeSignal = overrideSignal || signal;
        await sendProgressNotification({
            progressToken,
            progress,
            total,
            message,
            important,
            signal: activeSignal
        }, sendNotification, requestId, toolName, rateLimitConfig);
    };
}
module.exports = {
    createProgressSender,
    sendProgressNotification,
    clearRateLimitHistory,
    DEFAULT_RATE_LIMIT_CONFIG
};
