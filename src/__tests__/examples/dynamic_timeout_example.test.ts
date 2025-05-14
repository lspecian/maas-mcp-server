/**
 * Dynamic Timeout Usage Example
 * 
 * This file demonstrates how to use the dynamic timeout utilities
 * for complex test scenarios.
 */

import { 
  calculateDynamicTimeout, 
  getTimeoutByComplexity, 
  setTimeoutByComplexity,
  ComplexityLevel,
  getFileUploadTimeout,
  getApiOperationTimeout,
  getDatabaseOperationTimeout
} from '../utils/dynamicTimeouts.js';

/**
 * Example 1: Using complexity levels
 */
describe('Example 1: Using complexity levels', () => {
  it('should handle a low complexity operation', async () => {
    // Set timeout based on low complexity
    setTimeoutByComplexity(ComplexityLevel.LOW);
    
    // Simulate a low complexity operation
    await new Promise(resolve => setTimeout(resolve, 200));
    expect(true).toBe(true);
  });
  
  it('should handle a medium complexity operation', async () => {
    // Set timeout based on medium complexity
    setTimeoutByComplexity(ComplexityLevel.MEDIUM);
    
    // Simulate a medium complexity operation
    await new Promise(resolve => setTimeout(resolve, 500));
    expect(true).toBe(true);
  });
  
  it('should handle a high complexity operation', async () => {
    // Set timeout based on high complexity
    setTimeoutByComplexity(ComplexityLevel.HIGH);
    
    // Simulate a high complexity operation
    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(true).toBe(true);
  });
  
  it('should handle an extreme complexity operation', async () => {
    // Set timeout based on extreme complexity
    setTimeoutByComplexity(ComplexityLevel.EXTREME);
    
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
    const timeout = getFileUploadTimeout(100 * 1024, false);
    jest.setTimeout(timeout);
    
    console.log(`Timeout for 100KB file upload: ${timeout}ms`);
    
    // Simulate a small file upload
    await new Promise(resolve => setTimeout(resolve, 500));
    expect(true).toBe(true);
  });
  
  it('should handle a large file upload with progress notifications', async () => {
    // Calculate timeout for a 10MB file upload with progress notifications
    const timeout = getFileUploadTimeout(10 * 1024 * 1024, true);
    jest.setTimeout(timeout);
    
    console.log(`Timeout for 10MB file upload with progress: ${timeout}ms`);
    
    // Simulate a large file upload
    await new Promise(resolve => setTimeout(resolve, 1500));
    expect(true).toBe(true);
  });
  
  it('should handle a simple API operation', async () => {
    // Calculate timeout for a single API call
    const timeout = getApiOperationTimeout(1, false);
    jest.setTimeout(timeout);
    
    console.log(`Timeout for single API call: ${timeout}ms`);
    
    // Simulate a simple API call
    await new Promise(resolve => setTimeout(resolve, 300));
    expect(true).toBe(true);
  });
  
  it('should handle multiple API calls with progress notifications', async () => {
    // Calculate timeout for 5 API calls with progress notifications
    const timeout = getApiOperationTimeout(5, true);
    jest.setTimeout(timeout);
    
    console.log(`Timeout for 5 API calls with progress: ${timeout}ms`);
    
    // Simulate multiple API calls
    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(true).toBe(true);
  });
  
  it('should handle database operations', async () => {
    // Calculate timeout for 3 database operations
    const timeout = getDatabaseOperationTimeout(3);
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
    const timeout = calculateDynamicTimeout({
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
    const timeout = calculateDynamicTimeout({
      dataSize: 5 * 1024 * 1024, // 5MB
      hasFileIO: true,
      complexityLevel: ComplexityLevel.HIGH
    });
    jest.setTimeout(timeout);
    
    console.log(`Timeout for file processing: ${timeout}ms`);
    
    // Simulate file processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(true).toBe(true);
  });
  
  it('should handle a data analysis operation', async () => {
    // Calculate timeout for data analysis
    const timeout = calculateDynamicTimeout({
      dataSize: 20 * 1024 * 1024, // 20MB
      complexityLevel: ComplexityLevel.VERY_HIGH
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
    const timeout = calculateDynamicTimeout({
      dataSize: imageSize,
      apiCallCount: 2,
      hasNetworkRequests: true,
      hasProgressNotifications: true,
      complexityLevel: ComplexityLevel.HIGH
    });
    jest.setTimeout(timeout);
    
    console.log(`Timeout for image upload and processing: ${timeout}ms`);
    
    // Simulate image upload and processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    expect(true).toBe(true);
  });
  
  it('should handle machine deployment with progress tracking', async () => {
    // Calculate timeout for machine deployment
    const timeout = calculateDynamicTimeout({
      apiCallCount: 5,
      hasNetworkRequests: true,
      hasProgressNotifications: true,
      complexityLevel: ComplexityLevel.VERY_HIGH
    });
    jest.setTimeout(timeout);
    
    console.log(`Timeout for machine deployment: ${timeout}ms`);
    
    // Simulate machine deployment
    await new Promise(resolve => setTimeout(resolve, 2000));
    expect(true).toBe(true);
  });
  
  it('should handle resource synchronization', async () => {
    // Calculate timeout for resource synchronization
    const timeout = calculateDynamicTimeout({
      apiCallCount: 10,
      dbOperationCount: 5,
      hasNetworkRequests: true,
      complexityLevel: ComplexityLevel.EXTREME
    });
    jest.setTimeout(timeout);
    
    console.log(`Timeout for resource synchronization: ${timeout}ms`);
    
    // Simulate resource synchronization
    await new Promise(resolve => setTimeout(resolve, 3000));
    expect(true).toBe(true);
  });
});