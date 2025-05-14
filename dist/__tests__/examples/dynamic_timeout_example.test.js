"use strict";
/**
 * Dynamic Timeout Usage Example
 *
 * This file demonstrates how to use the dynamic timeout utilities
 * for complex test scenarios.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const dynamicTimeouts_js_1 = require("../utils/dynamicTimeouts.js");
/**
 * Example 1: Using complexity levels
 */
describe('Example 1: Using complexity levels', () => {
    it('should handle a low complexity operation', async () => {
        // Set timeout based on low complexity
        (0, dynamicTimeouts_js_1.setTimeoutByComplexity)(dynamicTimeouts_js_1.ComplexityLevel.LOW);
        // Simulate a low complexity operation
        await new Promise(resolve => setTimeout(resolve, 200));
        expect(true).toBe(true);
    });
    it('should handle a medium complexity operation', async () => {
        // Set timeout based on medium complexity
        (0, dynamicTimeouts_js_1.setTimeoutByComplexity)(dynamicTimeouts_js_1.ComplexityLevel.MEDIUM);
        // Simulate a medium complexity operation
        await new Promise(resolve => setTimeout(resolve, 500));
        expect(true).toBe(true);
    });
    it('should handle a high complexity operation', async () => {
        // Set timeout based on high complexity
        (0, dynamicTimeouts_js_1.setTimeoutByComplexity)(dynamicTimeouts_js_1.ComplexityLevel.HIGH);
        // Simulate a high complexity operation
        await new Promise(resolve => setTimeout(resolve, 1000));
        expect(true).toBe(true);
    });
    it('should handle an extreme complexity operation', async () => {
        // Set timeout based on extreme complexity
        (0, dynamicTimeouts_js_1.setTimeoutByComplexity)(dynamicTimeouts_js_1.ComplexityLevel.EXTREME);
        // Simulate an extreme complexity operation
        await new Promise(resolve => setTimeout(resolve, 2000));
        expect(true).toBe(true);
    });
});
/**
 * Example 2: Using operation-specific timeout helpers
 */
describe('Example 2: Operation-specific timeout helpers', () => {
    it('should handle a small file upload', async () => {
        // Calculate timeout for a 100KB file upload
        const timeout = (0, dynamicTimeouts_js_1.getFileUploadTimeout)(100 * 1024, false);
        jest.setTimeout(timeout);
        console.log(`Timeout for 100KB file upload: ${timeout}ms`);
        // Simulate a small file upload
        await new Promise(resolve => setTimeout(resolve, 500));
        expect(true).toBe(true);
    });
    it('should handle a large file upload with progress notifications', async () => {
        // Calculate timeout for a 10MB file upload with progress notifications
        const timeout = (0, dynamicTimeouts_js_1.getFileUploadTimeout)(10 * 1024 * 1024, true);
        jest.setTimeout(timeout);
        console.log(`Timeout for 10MB file upload with progress: ${timeout}ms`);
        // Simulate a large file upload
        await new Promise(resolve => setTimeout(resolve, 1500));
        expect(true).toBe(true);
    });
    it('should handle a simple API operation', async () => {
        // Calculate timeout for a single API call
        const timeout = (0, dynamicTimeouts_js_1.getApiOperationTimeout)(1, false);
        jest.setTimeout(timeout);
        console.log(`Timeout for single API call: ${timeout}ms`);
        // Simulate a simple API call
        await new Promise(resolve => setTimeout(resolve, 300));
        expect(true).toBe(true);
    });
    it('should handle multiple API calls with progress notifications', async () => {
        // Calculate timeout for 5 API calls with progress notifications
        const timeout = (0, dynamicTimeouts_js_1.getApiOperationTimeout)(5, true);
        jest.setTimeout(timeout);
        console.log(`Timeout for 5 API calls with progress: ${timeout}ms`);
        // Simulate multiple API calls
        await new Promise(resolve => setTimeout(resolve, 1000));
        expect(true).toBe(true);
    });
    it('should handle database operations', async () => {
        // Calculate timeout for 3 database operations
        const timeout = (0, dynamicTimeouts_js_1.getDatabaseOperationTimeout)(3);
        jest.setTimeout(timeout);
        console.log(`Timeout for 3 database operations: ${timeout}ms`);
        // Simulate database operations
        await new Promise(resolve => setTimeout(resolve, 500));
        expect(true).toBe(true);
    });
});
/**
 * Example 3: Using custom operation factors
 */
describe('Example 3: Custom operation factors', () => {
    it('should handle a complex operation with multiple factors', async () => {
        // Calculate timeout based on multiple factors
        const timeout = (0, dynamicTimeouts_js_1.calculateDynamicTimeout)({
            dataSize: 2 * 1024 * 1024, // 2MB
            apiCallCount: 2,
            dbOperationCount: 1,
            hasNetworkRequests: true,
            hasProgressNotifications: true
        });
        jest.setTimeout(timeout);
        console.log(`Timeout for complex operation: ${timeout}ms`);
        // Simulate a complex operation
        await new Promise(resolve => setTimeout(resolve, 1500));
        expect(true).toBe(true);
    });
    it('should handle a file processing operation', async () => {
        // Calculate timeout for file processing
        const timeout = (0, dynamicTimeouts_js_1.calculateDynamicTimeout)({
            dataSize: 5 * 1024 * 1024, // 5MB
            hasFileIO: true,
            complexityLevel: dynamicTimeouts_js_1.ComplexityLevel.HIGH
        });
        jest.setTimeout(timeout);
        console.log(`Timeout for file processing: ${timeout}ms`);
        // Simulate file processing
        await new Promise(resolve => setTimeout(resolve, 1000));
        expect(true).toBe(true);
    });
    it('should handle a data analysis operation', async () => {
        // Calculate timeout for data analysis
        const timeout = (0, dynamicTimeouts_js_1.calculateDynamicTimeout)({
            dataSize: 20 * 1024 * 1024, // 20MB
            complexityLevel: dynamicTimeouts_js_1.ComplexityLevel.VERY_HIGH
        });
        jest.setTimeout(timeout);
        console.log(`Timeout for data analysis: ${timeout}ms`);
        // Simulate data analysis
        await new Promise(resolve => setTimeout(resolve, 2000));
        expect(true).toBe(true);
    });
});
/**
 * Example 4: Real-world scenarios
 */
describe('Example 4: Real-world scenarios', () => {
    it('should handle image upload with processing', async () => {
        // Calculate timeout for image upload and processing
        const imageSize = 3 * 1024 * 1024; // 3MB
        const timeout = (0, dynamicTimeouts_js_1.calculateDynamicTimeout)({
            dataSize: imageSize,
            apiCallCount: 2,
            hasNetworkRequests: true,
            hasProgressNotifications: true,
            complexityLevel: dynamicTimeouts_js_1.ComplexityLevel.HIGH
        });
        jest.setTimeout(timeout);
        console.log(`Timeout for image upload and processing: ${timeout}ms`);
        // Simulate image upload and processing
        await new Promise(resolve => setTimeout(resolve, 1500));
        expect(true).toBe(true);
    });
    it('should handle machine deployment with progress tracking', async () => {
        // Calculate timeout for machine deployment
        const timeout = (0, dynamicTimeouts_js_1.calculateDynamicTimeout)({
            apiCallCount: 5,
            hasNetworkRequests: true,
            hasProgressNotifications: true,
            complexityLevel: dynamicTimeouts_js_1.ComplexityLevel.VERY_HIGH
        });
        jest.setTimeout(timeout);
        console.log(`Timeout for machine deployment: ${timeout}ms`);
        // Simulate machine deployment
        await new Promise(resolve => setTimeout(resolve, 2000));
        expect(true).toBe(true);
    });
    it('should handle resource synchronization', async () => {
        // Calculate timeout for resource synchronization
        const timeout = (0, dynamicTimeouts_js_1.calculateDynamicTimeout)({
            apiCallCount: 10,
            dbOperationCount: 5,
            hasNetworkRequests: true,
            complexityLevel: dynamicTimeouts_js_1.ComplexityLevel.EXTREME
        });
        jest.setTimeout(timeout);
        console.log(`Timeout for resource synchronization: ${timeout}ms`);
        // Simulate resource synchronization
        await new Promise(resolve => setTimeout(resolve, 3000));
        expect(true).toBe(true);
    });
});
