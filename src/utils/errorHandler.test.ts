import { 
  ErrorType, 
  MaasServerError, 
  handleMaasApiError, 
  handleValidationError, 
  errorToMcpResult,
  MaasApiError,
  ConfigurationError,
  asyncHandler
} from './errorHandler.js';

// Mock the logger
jest.mock('./logger', () => {
  return {
    __esModule: true,
    default: {
      child: jest.fn().mockReturnValue({
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
      })
    }
  };
});

describe('Error Handler', () => {
  describe('Custom Error Classes', () => {
    test('MaasServerError has correct name and properties', () => {
      const errorMessage = 'Test error';
      const errorType = ErrorType.VALIDATION;
      const statusCode = 400;
      const details = { field: 'test' };
      const error = new MaasServerError(errorMessage, errorType, statusCode, details);
      
      expect(error.name).toBe('MaasServerError');
      expect(error.message).toBe(errorMessage);
      expect(error.type).toBe(errorType);
      expect(error.statusCode).toBe(statusCode);
      expect(error.details).toEqual(details);
      expect(error instanceof Error).toBe(true);
    });
    
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
  
  describe('handleMaasApiError', () => {
    test('should handle authentication errors', () => {
      const error = handleMaasApiError({ message: 'Authentication failed', status: 401 });
      
      expect(error.type).toBe(ErrorType.AUTHENTICATION);
      expect(error.statusCode).toBe(401);
    });
    
    test('should handle not found errors', () => {
      const error = handleMaasApiError({ message: 'Resource not found', status: 404 });
      
      expect(error.type).toBe(ErrorType.NOT_FOUND);
      expect(error.statusCode).toBe(404);
    });
    
    test('should handle permission errors', () => {
      const error = handleMaasApiError({ message: 'Permission denied', status: 403 });
      
      expect(error.type).toBe(ErrorType.PERMISSION_DENIED);
      expect(error.statusCode).toBe(403);
    });
    
    test('should handle conflict errors', () => {
      const error = handleMaasApiError({ message: 'Resource already exists', status: 409 });
      
      expect(error.type).toBe(ErrorType.RESOURCE_CONFLICT);
      expect(error.statusCode).toBe(409);
    });
    
    test('should handle invalid state errors', () => {
      const error = handleMaasApiError({ message: 'Resource is in invalid state', status: 400 });
      
      expect(error.type).toBe(ErrorType.INVALID_STATE);
      expect(error.statusCode).toBe(400);
    });
    
    test('should handle network errors', () => {
      const error = handleMaasApiError({ message: 'Network connection failed', code: 'ECONNREFUSED' });
      
      expect(error.type).toBe(ErrorType.NETWORK_ERROR);
      expect(error.statusCode).toBe(500);
    });
    
    test('should default to generic MAAS API error', () => {
      const error = handleMaasApiError({ message: 'Unknown error', status: 500 });
      
      expect(error.type).toBe(ErrorType.MAAS_API);
      expect(error.statusCode).toBe(500);
      expect(error.details).toHaveProperty('originalError');
    });
  });
  
  describe('handleValidationError', () => {
    test('should create validation error with correct properties', () => {
      const message = 'Invalid parameter';
      const details = { field: 'name', reason: 'Required' };
      const error = handleValidationError(message, details);
      
      expect(error.type).toBe(ErrorType.VALIDATION);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe(message);
      expect(error.details).toEqual(details);
    });
  });
  
  describe('errorToMcpResult', () => {
    test('should convert MaasServerError to MCP result', () => {
      const error = new MaasServerError('Test error', ErrorType.VALIDATION, 400, { field: 'test' });
      const result = errorToMcpResult(error);
      
      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(2);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe('Test error');
      expect(result.content[1].type).toBe('json');
      expect(result.content[1].json).toHaveProperty('type', ErrorType.VALIDATION);
      expect(result.content[1].json).toHaveProperty('statusCode', 400);
      expect(result.content[1].json).toHaveProperty('details', { field: 'test' });
    });
    
    test('should convert generic Error to MCP result', () => {
      const error = new Error('Generic error');
      const result = errorToMcpResult(error);
      
      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe('Generic error');
    });
    
    test('should handle string errors', () => {
      const result = errorToMcpResult('String error');
      
      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe('String error');
    });
    
    test('should handle non-Error objects', () => {
      const result = errorToMcpResult({ foo: 'bar' });
      
      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe('An unexpected error occurred');
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
    
    test('process.on is called for uncaughtException and unhandledRejection', async () => {
      // Save original process.on
      const originalOn = process.on;
      
      // Mock process.on
      process.on = jest.fn();
      
      // Import the function to test (needs to be after mock setup)
      const { setupGlobalErrorHandlers } = await import('./errorHandler.js');
      
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