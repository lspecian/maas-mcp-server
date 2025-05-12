import { Writable } from 'stream';

// Mock the config module
jest.mock('../../config.js', () => ({
  __esModule: true,
  default: {
    logLevel: 'info',
    nodeEnv: 'test',
    auditLogEnabled: true,
    auditLogIncludeResourceState: false,
    auditLogMaskSensitiveFields: true,
    auditLogSensitiveFields: 'password,token,secret,key,credential',
    auditLogToFile: false,
    auditLogFilePath: undefined,
  },
}));

// Mock pino for tests that don't need actual log output
const mockLogMethods = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  fatal: jest.fn(),
  trace: jest.fn(),
};

const mockChildLogger = {
  ...mockLogMethods,
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  fatal: jest.fn(),
  trace: jest.fn(),
};

// Mock the logger module
jest.mock('../../utils/logger.ts', () => ({
  __esModule: true,
  default: {
    child: jest.fn().mockReturnValue(mockChildLogger),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    fatal: jest.fn(),
    trace: jest.fn(),
  },
  generateRequestId: jest.fn().mockReturnValue('mock-request-id'),
}));

// Import enums directly to avoid circular dependencies
import { AuditEventType, AuditLogLevel } from '../../utils/auditLogger.js';

describe('Audit Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('Configuration', () => {
    it('should initialize with default options', async () => {
      const { getAuditLogOptions } = await import('../../utils/auditLogger.js');
      
      const options = getAuditLogOptions();
      
      expect(options).toEqual({
        includeResourceState: false,
        maskSensitiveFields: true,
        sensitiveFields: ['password', 'token', 'secret', 'key', 'credential'],
        logToFile: false,
      });
    });

    it('should update options when setAuditLogOptions is called', async () => {
      const { setAuditLogOptions, getAuditLogOptions } = await import('../../utils/auditLogger.js');
      
      setAuditLogOptions({
        includeResourceState: true,
        sensitiveFields: ['password', 'api_key'],
      });
      
      const options = getAuditLogOptions();
      
      expect(options).toEqual({
        includeResourceState: true,
        maskSensitiveFields: true,
        sensitiveFields: ['password', 'api_key'],
        logToFile: false,
      });
    });
  });

  describe('Sensitive Data Handling', () => {
    it('should mask sensitive fields in objects', async () => {
      const { setAuditLogOptions, logResourceAccess } = await import('../../utils/auditLogger.js');
      
      // Enable resource state inclusion and set up sensitive fields
      setAuditLogOptions({
        includeResourceState: true,
        maskSensitiveFields: true,
        sensitiveFields: ['password', 'token', 'secret'],
      });
      
      const resourceState = {
        id: '123',
        name: 'Test Resource',
        password: 'secret123',
        apiToken: 'abc123xyz',
        nested: {
          secretKey: 'nested-secret',
          normalField: 'normal-value',
        },
      };
      
      logResourceAccess(
        'machine',
        '123',
        'view',
        'req-123',
        'user-456',
        '192.168.1.1',
        { detail: 'test' },
        resourceState
      );
      
      // Check that the log was called with masked data
      expect(mockChildLogger.info).toHaveBeenCalledTimes(1);
      const logCall = mockChildLogger.info.mock.calls[0];
      
      // The first parameter should be the log entry
      const logEntry = logCall[0];
      
      // Verify sensitive data is masked
      expect(logEntry.afterState.password).toBe('********');
      expect(logEntry.afterState.apiToken).toBe('********'); // Should match 'token' in sensitiveFields
      expect(logEntry.afterState.nested.secretKey).toBe('********'); // Should match 'secret' in sensitiveFields
      expect(logEntry.afterState.nested.normalField).toBe('normal-value'); // Should not be masked
      expect(logEntry.afterState.id).toBe('123'); // Should not be masked
      expect(logEntry.afterState.name).toBe('Test Resource'); // Should not be masked
    });

    it('should mask sensitive fields in deeply nested objects and arrays', async () => {
      const { setAuditLogOptions, logResourceModification } = await import('../../utils/auditLogger.js');
      
      // Enable resource state inclusion and set up sensitive fields
      setAuditLogOptions({
        includeResourceState: true,
        maskSensitiveFields: true,
        sensitiveFields: ['password', 'token', 'secret', 'key'],
        logToFile: false
      });
      
      // Simplified test data structure that focuses on what we're testing
      const beforeState = {
        id: '123',
        apiKey: 'super-secret-key',
        credentials: [
          { username: 'user1', password: 'pass1' },
          { username: 'user2', password: 'pass2' }
        ],
        nestedObject: {
          secretKey: 'nested-secret',
          normalField: 'not-sensitive',
          deepNested: {
            tokenValue: 'hidden-token',
            publicValue: 'public-data'
          }
        }
      };
      
      const afterState = {
        id: '123',
        apiKey: 'new-super-secret-key',
        credentials: [
          { username: 'user1-updated', password: 'newpass1' },
          { username: 'user2', password: 'pass2' }
        ],
        nestedObject: {
          secretKey: 'new-nested-secret',
          normalField: 'updated-not-sensitive',
          deepNested: {
            tokenValue: 'new-hidden-token',
            publicValue: 'updated-public-data'
          }
        }
      };
      
      logResourceModification(
        'user',
        '123',
        'update-complex-data',
        'req-123',
        beforeState,
        afterState
      );
      
      // Check that the log was called with masked data
      expect(mockChildLogger.info).toHaveBeenCalledTimes(1);
      const logCall = mockChildLogger.info.mock.calls[0];
      const logEntry = logCall[0];
      
      // Verify top-level sensitive data is masked
      expect(logEntry.beforeState.apiKey).toBe('********');
      expect(logEntry.afterState.apiKey).toBe('********');
      
      // Verify array of objects with sensitive data is masked
      expect(logEntry.beforeState.credentials[0].password).toBe('********');
      expect(logEntry.beforeState.credentials[1].password).toBe('********');
      expect(logEntry.afterState.credentials[0].password).toBe('********');
      expect(logEntry.afterState.credentials[1].password).toBe('********');
      
      // Verify deeply nested sensitive data is masked
      expect(logEntry.beforeState.nestedObject.secretKey).toBe('********');
      expect(logEntry.beforeState.nestedObject.deepNested.tokenValue).toBe('********');
      expect(logEntry.afterState.nestedObject.secretKey).toBe('********');
      expect(logEntry.afterState.nestedObject.deepNested.tokenValue).toBe('********');
      
      // Verify non-sensitive data is not masked
      expect(logEntry.beforeState.id).toBe('123');
      expect(logEntry.beforeState.nestedObject.normalField).toBe('not-sensitive');
      expect(logEntry.beforeState.credentials[0].username).toBe('user1');
      expect(logEntry.afterState.nestedObject.normalField).toBe('updated-not-sensitive');
      expect(logEntry.afterState.credentials[0].username).toBe('user1-updated');
    });

    it('should not include resource state when includeResourceState is false', async () => {
      const { setAuditLogOptions, logResourceAccess } = await import('../../utils/auditLogger.js');
      
      // Disable resource state inclusion
      setAuditLogOptions({
        includeResourceState: false,
      });
      
      const resourceState = {
        id: '123',
        name: 'Test Resource',
        password: 'secret123',
      };
      
      logResourceAccess(
        'machine',
        '123',
        'view',
        'req-123',
        'user-456',
        '192.168.1.1',
        { detail: 'test' },
        resourceState
      );
      
      // Check that the log was called without resource state
      expect(mockChildLogger.info).toHaveBeenCalledTimes(1);
      const logCall = mockChildLogger.info.mock.calls[0];
      const logEntry = logCall[0];
      
      // Verify resource state is not included
      expect(logEntry.afterState).toBeUndefined();
    });

    it('should handle arrays in sensitive data masking', async () => {
      const { setAuditLogOptions, logResourceModification } = await import('../../utils/auditLogger.js');
      
      // Enable resource state inclusion - make sure this is set before the test
      setAuditLogOptions({
        includeResourceState: true,
        maskSensitiveFields: true,
        sensitiveFields: ['password', 'token', 'secret'],
      });
      
      const beforeState = {
        credentials: [
          { username: 'user1', password: 'pass1' },
          { username: 'user2', password: 'pass2' },
        ],
      };
      
      const afterState = {
        credentials: [
          { username: 'user1', password: 'newpass1' },
          { username: 'user2', password: 'newpass2' },
        ],
      };
      
      logResourceModification(
        'user',
        '456',
        'update-credentials',
        'req-456',
        beforeState,
        afterState
      );
      
      // Check that the log was called with masked arrays
      expect(mockChildLogger.info).toHaveBeenCalledTimes(1);
      const logCall = mockChildLogger.info.mock.calls[0];
      const logEntry = logCall[0];
      
      // Verify sensitive data in arrays is masked
      expect(logEntry.beforeState.credentials[0].password).toBe('********');
      expect(logEntry.beforeState.credentials[1].password).toBe('********');
      expect(logEntry.afterState.credentials[0].password).toBe('********');
      expect(logEntry.afterState.credentials[1].password).toBe('********');
      
      // Verify non-sensitive data is not masked
      expect(logEntry.beforeState.credentials[0].username).toBe('user1');
      expect(logEntry.beforeState.credentials[1].username).toBe('user2');
      expect(logEntry.afterState.credentials[0].username).toBe('user1');
      expect(logEntry.afterState.credentials[1].username).toBe('user2');
    });
  });

  describe('Event Types', () => {
    it('should log resource access events correctly', async () => {
      const { logResourceAccess } = await import('../../utils/auditLogger.js');
      
      logResourceAccess(
        'machine',
        '123',
        'view',
        'req-123',
        'user-456',
        '192.168.1.1',
        { detail: 'test' }
      );
      
      expect(mockChildLogger.info).toHaveBeenCalledTimes(1);
      const logCall = mockChildLogger.info.mock.calls[0];
      const [logEntry, logMessage] = logCall;
      
      // Verify log entry structure
      expect(logEntry).toMatchObject({
        eventType: AuditEventType.RESOURCE_ACCESS,
        resourceType: 'machine',
        resourceId: '123',
        action: 'view',
        status: 'success',
        userId: 'user-456',
        ipAddress: '192.168.1.1',
        requestId: 'req-123',
        timestamp: expect.any(String),
        details: { detail: 'test' },
      });
      
      // Verify log message format
      expect(logMessage).toBe('resource_access: view machine (123) - success');
    });

    it('should log resource access failure events correctly', async () => {
      const { logResourceAccessFailure } = await import('../../utils/auditLogger.js');
      
      const error = new Error('Access denied');
      
      logResourceAccessFailure(
        'machine',
        '123',
        'view',
        'req-123',
        error,
        'user-456',
        '192.168.1.1',
        { detail: 'test' }
      );
      
      expect(mockChildLogger.error).toHaveBeenCalledTimes(1);
      const logCall = mockChildLogger.error.mock.calls[0];
      const [logEntry, logMessage] = logCall;
      
      // Verify log entry structure
      expect(logEntry).toMatchObject({
        eventType: AuditEventType.RESOURCE_ACCESS,
        resourceType: 'machine',
        resourceId: '123',
        action: 'view',
        status: 'failure',
        userId: 'user-456',
        ipAddress: '192.168.1.1',
        requestId: 'req-123',
        timestamp: expect.any(String),
        details: { detail: 'test' },
        errorDetails: {
          message: 'Access denied',
          stack: expect.any(String),
        },
      });
      
      // Verify log message format
      expect(logMessage).toBe('resource_access: view machine (123) - failure');
    });

    it('should log resource modification events correctly', async () => {
      const { setAuditLogOptions, logResourceModification } = await import('../../utils/auditLogger.js');
      
      // Enable resource state inclusion
      setAuditLogOptions({
        includeResourceState: true,
        maskSensitiveFields: true,
      });
      
      const beforeState = { status: 'inactive' };
      const afterState = { status: 'active' };
      
      logResourceModification(
        'machine',
        '123',
        'update-status',
        'req-123',
        beforeState,
        afterState,
        'user-456',
        '192.168.1.1',
        { detail: 'test' }
      );
      
      expect(mockChildLogger.info).toHaveBeenCalledTimes(1);
      const logCall = mockChildLogger.info.mock.calls[0];
      const [logEntry, logMessage] = logCall;
      
      // Verify log entry structure
      expect(logEntry).toMatchObject({
        eventType: AuditEventType.RESOURCE_MODIFICATION,
        resourceType: 'machine',
        resourceId: '123',
        action: 'update-status',
        status: 'success',
        userId: 'user-456',
        ipAddress: '192.168.1.1',
        requestId: 'req-123',
        timestamp: expect.any(String),
        details: { detail: 'test' },
        beforeState: { status: 'inactive' },
        afterState: { status: 'active' },
      });
      
      // Verify log message format
      expect(logMessage).toBe('resource_modification: update-status machine (123) - success');
    });

    it('should log resource modification failure events correctly', async () => {
      const { setAuditLogOptions, logResourceModificationFailure } = await import('../../utils/auditLogger.js');
      
      // Enable resource state inclusion
      setAuditLogOptions({
        includeResourceState: true,
        maskSensitiveFields: true,
      });
      
      const error = new Error('Update failed');
      const beforeState = { status: 'inactive' };
      
      logResourceModificationFailure(
        'machine',
        '123',
        'update-status',
        'req-123',
        error,
        beforeState,
        'user-456',
        '192.168.1.1',
        { detail: 'test' }
      );
      
      expect(mockChildLogger.error).toHaveBeenCalledTimes(1);
      const logCall = mockChildLogger.error.mock.calls[0];
      const [logEntry, logMessage] = logCall;
      
      // Verify log entry structure
      expect(logEntry).toMatchObject({
        eventType: AuditEventType.RESOURCE_MODIFICATION,
        resourceType: 'machine',
        resourceId: '123',
        action: 'update-status',
        status: 'failure',
        userId: 'user-456',
        ipAddress: '192.168.1.1',
        requestId: 'req-123',
        timestamp: expect.any(String),
        details: { detail: 'test' },
        beforeState: { status: 'inactive' },
        errorDetails: {
          message: 'Update failed',
          stack: expect.any(String),
        },
      });
      
      // Verify log message format
      expect(logMessage).toBe('resource_modification: update-status machine (123) - failure');
    });

    it('should log cache operation events correctly', async () => {
      const { logCacheOperation } = await import('../../utils/auditLogger.js');
      
      logCacheOperation(
        'machine',
        'hit',
        'req-123',
        '123',
        { cacheKey: 'machine:123' }
      );
      
      expect(mockChildLogger.info).toHaveBeenCalledTimes(1);
      const logCall = mockChildLogger.info.mock.calls[0];
      const [logEntry, logMessage] = logCall;
      
      // Verify log entry structure
      expect(logEntry).toMatchObject({
        eventType: AuditEventType.CACHE_OPERATION,
        resourceType: 'machine',
        resourceId: '123',
        action: 'hit',
        status: 'success',
        requestId: 'req-123',
        timestamp: expect.any(String),
        details: { cacheKey: 'machine:123' },
      });
      
      // Verify log message format
      expect(logMessage).toBe('cache_operation: hit machine (123) - success');
    });
  });

  describe('Resource Creation and Deletion Events', () => {
    it('should log resource creation events correctly', async () => {
      // Since there's no direct exported function for resource creation,
      // we'll use logResourceModification with the RESOURCE_CREATION event type
      const { logResourceModification, AuditEventType, setAuditLogOptions } = await import('../../utils/auditLogger.js');
      
      // Enable resource state inclusion
      setAuditLogOptions({
        includeResourceState: true,
        maskSensitiveFields: true,
        logToFile: false
      });
      
      // Create a mock implementation for resource creation
      const resourceType = 'machine';
      const resourceId = 'new-123';
      const action = 'create';
      const requestId = 'req-create-123';
      const userId = 'admin-user';
      const ipAddress = '10.0.0.1';
      const details = { source: 'api', template: 'standard' };
      const afterState = { id: 'new-123', name: 'New Machine', status: 'pending' };
      
      // Use logResourceModification to test creation event
      logResourceModification(
        resourceType,
        resourceId,
        action,
        requestId,
        undefined, // No before state for creation
        afterState,
        userId,
        ipAddress,
        details
      );
      
      expect(mockChildLogger.info).toHaveBeenCalledTimes(1);
      const logCall = mockChildLogger.info.mock.calls[0];
      const [logEntry, logMessage] = logCall;
      
      // Verify log entry structure
      expect(logEntry.resourceType).toBe(resourceType);
      expect(logEntry.resourceId).toBe(resourceId);
      expect(logEntry.action).toBe(action);
      expect(logEntry.status).toBe('success');
      expect(logEntry.userId).toBe(userId);
      expect(logEntry.ipAddress).toBe(ipAddress);
      expect(logEntry.requestId).toBe(requestId);
      expect(logEntry.details).toEqual(details);
      expect(logEntry.afterState).toEqual(afterState);
      
      // Verify log message format
      expect(logMessage).toBe('resource_modification: create machine (new-123) - success');
    });

    it('should log resource deletion events correctly', async () => {
      // Since there's no direct exported function for resource deletion,
      // we'll use logResourceModification with the RESOURCE_DELETION event type
      const { logResourceModification, AuditEventType, setAuditLogOptions } = await import('../../utils/auditLogger.js');
      
      // Enable resource state inclusion
      setAuditLogOptions({
        includeResourceState: true,
        maskSensitiveFields: true,
        logToFile: false
      });
      
      // Create a mock implementation for resource deletion
      const resourceType = 'machine';
      const resourceId = 'delete-123';
      const action = 'delete';
      const requestId = 'req-delete-123';
      const userId = 'admin-user';
      const ipAddress = '10.0.0.1';
      const details = { reason: 'obsolete' };
      const beforeState = { id: 'delete-123', name: 'Old Machine', status: 'active' };
      
      // Use logResourceModification to test deletion event
      logResourceModification(
        resourceType,
        resourceId,
        action,
        requestId,
        beforeState,
        undefined, // No after state for deletion
        userId,
        ipAddress,
        details
      );
      
      expect(mockChildLogger.info).toHaveBeenCalledTimes(1);
      const logCall = mockChildLogger.info.mock.calls[0];
      const [logEntry, logMessage] = logCall;
      
      // Verify log entry structure
      expect(logEntry.resourceType).toBe(resourceType);
      expect(logEntry.resourceId).toBe(resourceId);
      expect(logEntry.action).toBe(action);
      expect(logEntry.status).toBe('success');
      expect(logEntry.userId).toBe(userId);
      expect(logEntry.ipAddress).toBe(ipAddress);
      expect(logEntry.requestId).toBe(requestId);
      expect(logEntry.details).toEqual(details);
      expect(logEntry.beforeState).toEqual(beforeState);
      
      // Verify log message format
      expect(logMessage).toBe('resource_modification: delete machine (delete-123) - success');
    });
  });

  describe('Error Handling', () => {
    it('should handle non-Error objects in error details', async () => {
      const { logResourceAccessFailure } = await import('../../utils/auditLogger.js');
      
      // Use a plain object as the error
      const error = { code: 'FORBIDDEN', reason: 'Insufficient permissions' };
      
      logResourceAccessFailure(
        'machine',
        '123',
        'view',
        'req-123',
        error
      );
      
      expect(mockChildLogger.error).toHaveBeenCalledTimes(1);
      const logCall = mockChildLogger.error.mock.calls[0];
      const logEntry = logCall[0];
      
      // Verify error details are passed through as-is for non-Error objects
      expect(logEntry.errorDetails).toEqual(error);
    });

    it('should handle null or undefined errors gracefully', async () => {
      const { logResourceAccessFailure } = await import('../../utils/auditLogger.js');
      
      // Test with undefined error
      logResourceAccessFailure(
        'machine',
        '123',
        'view',
        'req-123',
        undefined
      );
      
      expect(mockChildLogger.error).toHaveBeenCalledTimes(1);
      let logCall = mockChildLogger.error.mock.calls[0];
      let logEntry = logCall[0];
      
      // Verify undefined error is passed through
      expect(logEntry.errorDetails).toBeUndefined();
      
      jest.clearAllMocks();
      
      // Test with null error
      logResourceAccessFailure(
        'machine',
        '123',
        'view',
        'req-123',
        null
      );
      
      expect(mockChildLogger.error).toHaveBeenCalledTimes(1);
      logCall = mockChildLogger.error.mock.calls[0];
      logEntry = logCall[0];
      
      // Verify null error is passed through
      expect(logEntry.errorDetails).toBeNull();
    });

    it('should handle undefined resource ID', async () => {
      const { logResourceAccess } = await import('../../utils/auditLogger.js');
      
      logResourceAccess(
        'machines', // Collection resource type
        undefined,  // No specific resource ID
        'list',
        'req-123'
      );
      
      expect(mockChildLogger.info).toHaveBeenCalledTimes(1);
      const logCall = mockChildLogger.info.mock.calls[0];
      const [logEntry, logMessage] = logCall;
      
      // Verify log entry structure with undefined resourceId
      expect(logEntry.resourceId).toBeUndefined();
      
      // Verify log message format without resource ID
      expect(logMessage).toBe('resource_access: list machines - success');
    });
  });

  describe('Log Format', () => {
    it('should include ISO timestamp format', async () => {
      const { logResourceAccess } = await import('../../utils/auditLogger.js');
      
      logResourceAccess(
        'machine',
        '123',
        'view',
        'req-123'
      );
      
      expect(mockChildLogger.info).toHaveBeenCalledTimes(1);
      const logCall = mockChildLogger.info.mock.calls[0];
      const logEntry = logCall[0];
      
      // Verify timestamp is in ISO format
      expect(logEntry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      
      // Verify it's a valid date
      expect(() => new Date(logEntry.timestamp)).not.toThrow();
    });

    it('should handle optional parameters correctly', async () => {
      const { logResourceAccess } = await import('../../utils/auditLogger.js');
      
      // Call with minimal required parameters
      logResourceAccess(
        'machine',
        '123',
        'view',
        'req-123'
        // No userId, ipAddress, details, or resourceState
      );
      
      expect(mockChildLogger.info).toHaveBeenCalledTimes(1);
      const logCall = mockChildLogger.info.mock.calls[0];
      const logEntry = logCall[0];
      
      // Verify optional fields are undefined
      expect(logEntry.userId).toBeUndefined();
      expect(logEntry.ipAddress).toBeUndefined();
      expect(logEntry.details).toBeUndefined();
      expect(logEntry.afterState).toBeUndefined();
      
      // Required fields should be present
      expect(logEntry.eventType).toBe(AuditEventType.RESOURCE_ACCESS);
      expect(logEntry.resourceType).toBe('machine');
      expect(logEntry.resourceId).toBe('123');
      expect(logEntry.action).toBe('view');
      expect(logEntry.status).toBe('success');
      expect(logEntry.requestId).toBe('req-123');
      expect(logEntry.timestamp).toBeDefined();
    });
  });

  describe('Integration with Logger', () => {
    it('should create a child logger with audit marker', async () => {
      // Get the mocked logger
      const loggerModule = jest.requireMock('../../utils/logger.ts');
      
      // Import the module to trigger the child logger creation
      await import('../../utils/auditLogger.js');
      
      // Verify the child logger was created with the correct properties
      expect(loggerModule.default.child).toHaveBeenCalledWith({
        module: 'AuditLog',
        audit: true
      });
    });
  });

  describe('Default Export', () => {
    it('should export all required functions', async () => {
      const auditLogger = await import('../../utils/auditLogger.js');
      const defaultExport = auditLogger.default;
      
      // Verify all functions are exported in the default export
      expect(defaultExport.logResourceAccess).toBe(auditLogger.logResourceAccess);
      expect(defaultExport.logResourceAccessFailure).toBe(auditLogger.logResourceAccessFailure);
      expect(defaultExport.logResourceModification).toBe(auditLogger.logResourceModification);
      expect(defaultExport.logResourceModificationFailure).toBe(auditLogger.logResourceModificationFailure);
      expect(defaultExport.logCacheOperation).toBe(auditLogger.logCacheOperation);
      expect(defaultExport.setAuditLogOptions).toBe(auditLogger.setAuditLogOptions);
      expect(defaultExport.getAuditLogOptions).toBe(auditLogger.getAuditLogOptions);
    });
  });
});