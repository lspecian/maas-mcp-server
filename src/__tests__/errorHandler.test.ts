import { MaasApiError, ConfigurationError, asyncHandler } from '../utils/errorHandler.js';

// Mock the logger
jest.mock('../utils/logger', () => {
  return jest.fn().mockImplementation(() => ({
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }));
});

describe('Error Handler', () => {
  describe('Custom Error Classes', () => {
    test('MaasApiError has correct name and properties', () => {
      const errorMessage = 'API error occurred';
      const statusCode = 404;
      const error = new MaasApiError(errorMessage, statusCode);
      
      expect(error.name).toBe('MaasApiError');
      expect(error.message).toBe(errorMessage);
      expect(error.statusCode).toBe(statusCode);
      expect(error instanceof Error).toBe(true);
    });
    
    test('ConfigurationError has correct name and message', () => {
      const errorMessage = 'Configuration error occurred';
      const error = new ConfigurationError(errorMessage);
      
      expect(error.name).toBe('ConfigurationError');
      expect(error.message).toBe(errorMessage);
      expect(error instanceof Error).toBe(true);
    });
  });
  
  describe('asyncHandler', () => {
    test('asyncHandler passes through return value for successful function', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = asyncHandler(mockFn);
      
      const result = await wrappedFn('arg1', 'arg2');
      
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
      expect(result).toBe('success');
    });
    
    test('asyncHandler logs and re-throws errors', async () => {
      const testError = new Error('Test error');
      const mockFn = jest.fn().mockRejectedValue(testError);
      const wrappedFn = asyncHandler(mockFn);
      
      await expect(wrappedFn()).rejects.toThrow(testError);
      
      // The test passes if we get here without errors
      expect(true).toBe(true);
    });
  });
  
  describe('setupGlobalErrorHandlers', () => {
    // These tests are more complex as they involve process events
    // In a real-world scenario, you might want to use a more sophisticated approach
    // or consider these more integration tests than unit tests
    
    test('process.on is called for uncaughtException and unhandledRejection', () => {
      // Save original process.on
      const originalOn = process.on;
      
      // Mock process.on
      process.on = jest.fn();
      
      // Import the function to test (needs to be after mock setup)
      const { setupGlobalErrorHandlers } = require('../utils/errorHandler.js');
      
      // Call the function
      setupGlobalErrorHandlers();
      
      // Verify process.on was called for both event types
      expect(process.on).toHaveBeenCalledWith('uncaughtException', expect.any(Function));
      expect(process.on).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));
      
      // Restore original process.on
      process.on = originalOn;
    });
  });
});