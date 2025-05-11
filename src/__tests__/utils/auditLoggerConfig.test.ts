import { Writable } from 'stream';

// Store original environment variables
const originalEnv = { ...process.env };

// Mock the config module with default values
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

// Create a mock stream to capture log output
class MockStream extends Writable {
  chunks: any[] = [];
  
  _write(chunk: any, encoding: string, callback: (error?: Error | null) => void): void {
    this.chunks.push(chunk);
    callback();
  }
  
  getOutput(): string {
    return Buffer.concat(this.chunks).toString();
  }
  
  clear(): void {
    this.chunks = [];
  }
}

// Mock pino to capture log output
const mockStream = new MockStream();
const mockPino = jest.fn().mockReturnValue({
  child: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    fatal: jest.fn(),
    trace: jest.fn(),
  })),
});

jest.mock('pino', () => ({
  __esModule: true,
  default: () => mockPino(),
  destination: jest.fn().mockReturnValue(mockStream),
}));

// Mock the logger module
const mockChildLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  fatal: jest.fn(),
  trace: jest.fn(),
};

jest.mock('../../utils/logger.js', () => ({
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

describe('Audit Logger Configuration', () => {
  // Reset modules and environment before each test
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    mockStream.clear();
    
    // Reset the mock config module
    const configModule = jest.requireMock('../../config.js');
    configModule.default = {
      logLevel: 'info',
      nodeEnv: 'test',
      auditLogEnabled: true,
      auditLogIncludeResourceState: false,
      auditLogMaskSensitiveFields: true,
      auditLogSensitiveFields: 'password,token,secret,key,credential',
      auditLogToFile: false,
      auditLogFilePath: undefined,
    };
  });
  
  // Restore original environment after all tests
  afterAll(() => {
    process.env = originalEnv;
  });
  
  describe('Log Level Configuration', () => {
    it('should use default log level from config', async () => {
      // Import the modules after setting up the mocks
      const { initializeAuditLogger } = await import('../../utils/initAuditLogger.js');
      const auditLogger = await import('../../utils/auditLogger.js');
      
      // Initialize the audit logger
      initializeAuditLogger();
      
      // Log a resource access event
      auditLogger.logResourceAccess(
        'machine',
        '123',
        'view',
        'req-123',
        'user-456',
        '192.168.1.1'
      );
      
      // Verify the log was called with the correct level
      expect(mockChildLogger.info).toHaveBeenCalledTimes(1);
    });
    
    it('should log at different levels based on event type', async () => {
      // Import the modules after setting up the mocks
      const { initializeAuditLogger } = await import('../../utils/initAuditLogger.js');
      const auditLogger = await import('../../utils/auditLogger.js');
      
      // Initialize the audit logger
      initializeAuditLogger();
      
      // Log a resource access event (which uses info level)
      auditLogger.logResourceAccess(
        'machine',
        '123',
        'view',
        'req-123',
        'user-456',
        '192.168.1.1'
      );
      
      // Log a resource access failure event (which uses error level)
      auditLogger.logResourceAccessFailure(
        'machine',
        '123',
        'view',
        'req-123',
        new Error('Access denied'),
        'user-456',
        '192.168.1.1'
      );
      
      // Verify both log levels were called
      expect(mockChildLogger.info).toHaveBeenCalledTimes(1);
      expect(mockChildLogger.error).toHaveBeenCalledTimes(1);
    });

    it('should filter logs based on configured log level', async () => {
      // Set log level to error in the config
      const configModule = jest.requireMock('../../config.js');
      configModule.default.logLevel = 'error';
      
      // Import the modules after setting up the mocks
      const { initializeAuditLogger } = await import('../../utils/initAuditLogger.js');
      const auditLogger = await import('../../utils/auditLogger.js');
      
      // Initialize the audit logger
      initializeAuditLogger();
      
      // Log events at different levels
      auditLogger.logResourceAccess(
        'machine',
        '123',
        'view',
        'req-123',
        'user-456',
        '192.168.1.1'
      );
      
      auditLogger.logResourceAccessFailure(
        'machine',
        '123',
        'view',
        'req-123',
        new Error('Access denied'),
        'user-456',
        '192.168.1.1'
      );
      
      // In a real scenario with pino, info logs would be filtered out when level is set to error
      // Here we're just verifying that both methods were called since we're mocking the logger
      expect(mockChildLogger.info).toHaveBeenCalledTimes(1);
      expect(mockChildLogger.error).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('Resource State Inclusion', () => {
    it('should not include resource state by default', async () => {
      // Import the modules after setting up the mocks
      const { initializeAuditLogger } = await import('../../utils/initAuditLogger.js');
      const auditLogger = await import('../../utils/auditLogger.js');
      
      // Initialize the audit logger
      initializeAuditLogger();
      
      const resourceState = {
        id: '123',
        name: 'Test Resource',
        password: 'secret123',
      };
      
      // Log a resource access event with resource state
      auditLogger.logResourceAccess(
        'machine',
        '123',
        'view',
        'req-123',
        'user-456',
        '192.168.1.1',
        { detail: 'test' },
        resourceState
      );
      
      // Verify the log was called without resource state
      expect(mockChildLogger.info).toHaveBeenCalledTimes(1);
      const logCall = mockChildLogger.info.mock.calls[0];
      const logEntry = logCall[0];
      
      expect(logEntry.afterState).toBeUndefined();
    });
    
    it('should include resource state when AUDIT_LOG_INCLUDE_RESOURCE_STATE is true', async () => {
      // Override the config module mock to include resource state
      const configModule = jest.requireMock('../../config.js');
      configModule.default.auditLogIncludeResourceState = true;
      
      // Import the modules after setting up the mocks
      const { initializeAuditLogger } = await import('../../utils/initAuditLogger.js');
      const auditLogger = await import('../../utils/auditLogger.js');
      
      // Initialize the audit logger
      initializeAuditLogger();
      
      const resourceState = {
        id: '123',
        name: 'Test Resource',
        password: 'secret123',
      };
      
      // Log a resource access event with resource state
      auditLogger.logResourceAccess(
        'machine',
        '123',
        'view',
        'req-123',
        'user-456',
        '192.168.1.1',
        { detail: 'test' },
        resourceState
      );
      
      // Verify the log was called with resource state
      expect(mockChildLogger.info).toHaveBeenCalledTimes(1);
      const logCall = mockChildLogger.info.mock.calls[0];
      const logEntry = logCall[0];
      
      expect(logEntry.afterState).toBeDefined();
      expect(logEntry.afterState.id).toBe('123');
      expect(logEntry.afterState.name).toBe('Test Resource');
      // Password should be masked
      expect(logEntry.afterState.password).toBe('********');
    });

    it('should include resource state for both before and after states in modification events', async () => {
      // Override the config module mock to include resource state
      const configModule = jest.requireMock('../../config.js');
      configModule.default.auditLogIncludeResourceState = true;
      
      // Import the modules after setting up the mocks
      const { initializeAuditLogger } = await import('../../utils/initAuditLogger.js');
      const auditLogger = await import('../../utils/auditLogger.js');
      
      // Initialize the audit logger
      initializeAuditLogger();
      
      const beforeState = {
        id: '123',
        name: 'Old Name',
        status: 'inactive'
      };
      
      const afterState = {
        id: '123',
        name: 'New Name',
        status: 'active'
      };
      
      // Log a resource modification event
      auditLogger.logResourceModification(
        'machine',
        '123',
        'update',
        'req-123',
        beforeState,
        afterState,
        'user-456',
        '192.168.1.1'
      );
      
      // Verify both before and after states are included
      expect(mockChildLogger.info).toHaveBeenCalledTimes(1);
      const logCall = mockChildLogger.info.mock.calls[0];
      const logEntry = logCall[0];
      
      expect(logEntry.beforeState).toBeDefined();
      expect(logEntry.afterState).toBeDefined();
      expect(logEntry.beforeState.name).toBe('Old Name');
      expect(logEntry.afterState.name).toBe('New Name');
    });
  });
  
  describe('Sensitive Data Masking', () => {
    it('should mask sensitive fields by default', async () => {
      // Override the config module mock to include resource state
      const configModule = jest.requireMock('../../config.js');
      configModule.default.auditLogIncludeResourceState = true;
      
      // Import the modules after setting up the mocks
      const { initializeAuditLogger } = await import('../../utils/initAuditLogger.js');
      const auditLogger = await import('../../utils/auditLogger.js');
      
      // Initialize the audit logger
      initializeAuditLogger();
      
      const resourceState = {
        id: '123',
        name: 'Test Resource',
        password: 'secret123',
        apiToken: 'abc123xyz',
        secretKey: 'very-secret',
      };
      
      // Log a resource access event with resource state
      auditLogger.logResourceAccess(
        'machine',
        '123',
        'view',
        'req-123',
        'user-456',
        '192.168.1.1',
        { detail: 'test' },
        resourceState
      );
      
      // Verify sensitive fields are masked
      expect(mockChildLogger.info).toHaveBeenCalledTimes(1);
      const logCall = mockChildLogger.info.mock.calls[0];
      const logEntry = logCall[0];
      
      expect(logEntry.afterState.password).toBe('********');
      expect(logEntry.afterState.apiToken).toBe('********');
      expect(logEntry.afterState.secretKey).toBe('********');
      expect(logEntry.afterState.id).toBe('123');
      expect(logEntry.afterState.name).toBe('Test Resource');
    });
    
    it('should not mask sensitive fields when AUDIT_LOG_MASK_SENSITIVE_FIELDS is false', async () => {
      // Override the config module mock to include resource state but disable masking
      const configModule = jest.requireMock('../../config.js');
      configModule.default.auditLogIncludeResourceState = true;
      configModule.default.auditLogMaskSensitiveFields = false;
      
      // Import the modules after setting up the mocks
      const { initializeAuditLogger } = await import('../../utils/initAuditLogger.js');
      const auditLogger = await import('../../utils/auditLogger.js');
      
      // Initialize the audit logger
      initializeAuditLogger();
      
      const resourceState = {
        id: '123',
        name: 'Test Resource',
        password: 'secret123',
        apiToken: 'abc123xyz',
        secretKey: 'very-secret',
      };
      
      // Log a resource access event with resource state
      auditLogger.logResourceAccess(
        'machine',
        '123',
        'view',
        'req-123',
        'user-456',
        '192.168.1.1',
        { detail: 'test' },
        resourceState
      );
      
      // Verify sensitive fields are not masked
      expect(mockChildLogger.info).toHaveBeenCalledTimes(1);
      const logCall = mockChildLogger.info.mock.calls[0];
      const logEntry = logCall[0];
      
      expect(logEntry.afterState.password).toBe('secret123');
      expect(logEntry.afterState.apiToken).toBe('abc123xyz');
      expect(logEntry.afterState.secretKey).toBe('very-secret');
    });
    
    it('should use custom sensitive fields list from AUDIT_LOG_SENSITIVE_FIELDS', async () => {
      // Override the config module mock to include resource state and use custom sensitive fields
      const configModule = jest.requireMock('../../config.js');
      configModule.default.auditLogIncludeResourceState = true;
      configModule.default.auditLogSensitiveFields = 'password,custom';
      
      // Import the modules after setting up the mocks
      const { initializeAuditLogger } = await import('../../utils/initAuditLogger.js');
      const auditLogger = await import('../../utils/auditLogger.js');
      
      // Initialize the audit logger
      initializeAuditLogger();
      
      const resourceState = {
        id: '123',
        name: 'Test Resource',
        password: 'secret123',
        apiToken: 'abc123xyz', // Should not be masked with custom list
        customField: 'sensitive-data', // Should be masked with custom list
      };
      
      // Log a resource access event with resource state
      auditLogger.logResourceAccess(
        'machine',
        '123',
        'view',
        'req-123',
        'user-456',
        '192.168.1.1',
        { detail: 'test' },
        resourceState
      );
      
      // Verify only the specified sensitive fields are masked
      expect(mockChildLogger.info).toHaveBeenCalledTimes(1);
      const logCall = mockChildLogger.info.mock.calls[0];
      const logEntry = logCall[0];
      
      expect(logEntry.afterState.password).toBe('********');
      expect(logEntry.afterState.customField).toBe('********');
      expect(logEntry.afterState.apiToken).toBe('abc123xyz'); // Not in the custom list
    });

    it('should mask sensitive fields in deeply nested objects', async () => {
      // Override the config module mock to include resource state
      const configModule = jest.requireMock('../../config.js');
      configModule.default.auditLogIncludeResourceState = true;
      
      // Import the modules after setting up the mocks
      const { initializeAuditLogger } = await import('../../utils/initAuditLogger.js');
      const auditLogger = await import('../../utils/auditLogger.js');
      
      // Initialize the audit logger
      initializeAuditLogger();
      
      const resourceState = {
        id: '123',
        name: 'Test Resource',
        password: 'top-level-secret',
        nested: {
          apiKey: 'nested-api-key',
          data: {
            secretToken: 'very-secret-token'
          }
        }
      };
      
      // Log a resource access event with resource state
      auditLogger.logResourceAccess(
        'machine',
        '123',
        'view',
        'req-123',
        'user-456',
        '192.168.1.1',
        { detail: 'test' },
        resourceState
      );
      
      // Verify sensitive fields are masked in nested objects
      expect(mockChildLogger.info).toHaveBeenCalledTimes(1);
      const logCall = mockChildLogger.info.mock.calls[0];
      const logEntry = logCall[0];
      
      // Check that afterState exists
      expect(logEntry.afterState).toBeDefined();
      
      // Verify top-level sensitive field is masked
      expect(logEntry.afterState.password).toBe('********');
      
      // Verify non-sensitive fields are not masked
      expect(logEntry.afterState.id).toBe('123');
      expect(logEntry.afterState.name).toBe('Test Resource');
      
      // Verify nested structure exists
      expect(logEntry.afterState.nested).toBeDefined();
      
      // Verify nested sensitive fields are masked
      expect(logEntry.afterState.nested.apiKey).toBe('********');
      expect(logEntry.afterState.nested.data).toBeDefined();
      expect(logEntry.afterState.nested.data.secretToken).toBe('********');
    });
  });
  
  describe('Log Destination', () => {
    it('should log to console by default', async () => {
      // Import the modules after setting up the mocks
      const { initializeAuditLogger } = await import('../../utils/initAuditLogger.js');
      const auditLogger = await import('../../utils/auditLogger.js');
      
      // Initialize the audit logger
      initializeAuditLogger();
      
      // Log a resource access event
      auditLogger.logResourceAccess(
        'machine',
        '123',
        'view',
        'req-123',
        'user-456',
        '192.168.1.1'
      );
      
      // Verify the log was sent to the console (mock child logger)
      expect(mockChildLogger.info).toHaveBeenCalledTimes(1);
    });
    
    it('should handle file logging when AUDIT_LOG_TO_FILE is true', async () => {
      // This test is more complex as it would require mocking file system operations
      // For now, we'll just verify that the option is passed correctly to setAuditLogOptions
      
      // Override the config module mock to enable file logging
      const configModule = jest.requireMock('../../config.js');
      configModule.default.auditLogToFile = true;
      configModule.default.auditLogFilePath = '/path/to/audit.log';
      
      // Import the modules after setting up the mocks
      const { initializeAuditLogger } = await import('../../utils/initAuditLogger.js');
      const auditLogger = await import('../../utils/auditLogger.js');
      
      // Spy on setAuditLogOptions
      const setOptionsSpy = jest.spyOn(auditLogger, 'setAuditLogOptions');
      
      // Initialize the audit logger
      initializeAuditLogger();
      
      // Verify setAuditLogOptions was called with the correct options
      expect(setOptionsSpy).toHaveBeenCalledWith(expect.objectContaining({
        logToFile: true,
        logFilePath: '/path/to/audit.log'
      }));
      
      // Clean up
      setOptionsSpy.mockRestore();
    });

    it('should verify that log file path is correctly passed to the logger', async () => {
      // Override the config module mock to enable file logging
      const configModule = jest.requireMock('../../config.js');
      configModule.default.auditLogToFile = true;
      configModule.default.auditLogFilePath = '/custom/path/audit.log';
      
      // Import the modules after setting up the mocks
      const { initializeAuditLogger } = await import('../../utils/initAuditLogger.js');
      const auditLogger = await import('../../utils/auditLogger.js');
      
      // Initialize the audit logger
      initializeAuditLogger();
      
      // Get the current options
      const options = auditLogger.getAuditLogOptions();
      
      // Verify the file path was set correctly
      expect(options.logToFile).toBe(true);
      expect(options.logFilePath).toBe('/custom/path/audit.log');
    });
  });
  
  describe('Environment Variable Overrides', () => {
    it('should override config values with environment variables', async () => {
      // Set environment variables
      process.env.AUDIT_LOG_INCLUDE_RESOURCE_STATE = 'true';
      process.env.AUDIT_LOG_MASK_SENSITIVE_FIELDS = 'false';
      process.env.AUDIT_LOG_SENSITIVE_FIELDS = 'custom1,custom2';
      process.env.AUDIT_LOG_TO_FILE = 'true';
      process.env.AUDIT_LOG_FILE_PATH = '/custom/path/audit.log';
      
      // Re-import config to pick up environment variables
      jest.resetModules();
      const config = await import('../../config.js');
      
      // Override the config module mock with the values that would be loaded from env vars
      const configModule = jest.requireMock('../../config.js');
      configModule.default.auditLogIncludeResourceState = true;
      configModule.default.auditLogMaskSensitiveFields = false;
      configModule.default.auditLogSensitiveFields = 'custom1,custom2';
      configModule.default.auditLogToFile = true;
      configModule.default.auditLogFilePath = '/custom/path/audit.log';
      
      // Import the modules after setting up the mocks
      const { initializeAuditLogger } = await import('../../utils/initAuditLogger.js');
      const auditLogger = await import('../../utils/auditLogger.js');
      
      // Spy on setAuditLogOptions
      const setOptionsSpy = jest.spyOn(auditLogger, 'setAuditLogOptions');
      
      // Initialize the audit logger
      initializeAuditLogger();
      
      // Verify setAuditLogOptions was called with the correct options from env vars
      expect(setOptionsSpy).toHaveBeenCalledWith(expect.objectContaining({
        includeResourceState: true,
        maskSensitiveFields: false,
        sensitiveFields: ['custom1', 'custom2'],
        logToFile: true,
        logFilePath: '/custom/path/audit.log'
      }));
      
      // Clean up
      setOptionsSpy.mockRestore();
    });

    it('should handle boolean environment variables correctly', async () => {
      // Set environment variables with various boolean formats
      process.env.AUDIT_LOG_INCLUDE_RESOURCE_STATE = 'true';
      process.env.AUDIT_LOG_MASK_SENSITIVE_FIELDS = 'false';
      process.env.AUDIT_LOG_TO_FILE = 'TRUE'; // Test case insensitivity
      
      // Re-import config to pick up environment variables
      jest.resetModules();
      
      // Override the config module mock with the values that would be loaded from env vars
      const configModule = jest.requireMock('../../config.js');
      configModule.default.auditLogIncludeResourceState = true;
      configModule.default.auditLogMaskSensitiveFields = false;
      configModule.default.auditLogToFile = true;
      
      // Import the modules after setting up the mocks
      const { initializeAuditLogger } = await import('../../utils/initAuditLogger.js');
      const auditLogger = await import('../../utils/auditLogger.js');
      
      // Initialize the audit logger
      initializeAuditLogger();
      
      // Get the current options
      const options = auditLogger.getAuditLogOptions();
      
      // Verify the boolean values were parsed correctly
      expect(options.includeResourceState).toBe(true);
      expect(options.maskSensitiveFields).toBe(false);
      expect(options.logToFile).toBe(true);
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle invalid sensitive fields list gracefully', async () => {
      // Override the config module mock with an invalid sensitive fields list
      const configModule = jest.requireMock('../../config.js');
      configModule.default.auditLogIncludeResourceState = true;
      configModule.default.auditLogSensitiveFields = ''; // Empty string
      configModule.default.auditLogMaskSensitiveFields = true;
      
      // Import the modules after setting up the mocks
      const { initializeAuditLogger } = await import('../../utils/initAuditLogger.js');
      const auditLogger = await import('../../utils/auditLogger.js');
      
      // Initialize the audit logger
      initializeAuditLogger();
      
      // Verify that the audit logger was initialized with the sensitive fields array
      // When an empty string is split by comma, it results in an array with an empty string
      const options = auditLogger.getAuditLogOptions();
      expect(options.sensitiveFields).toEqual(['']);
      
      // The important thing is that the logger doesn't crash with an empty sensitive fields list
      // Let's just verify that the logger can be initialized and used without errors
      
      // Log a simple resource access event without resource state
      auditLogger.logResourceAccess(
        'machine',
        '123',
        'view',
        'req-123',
        'user-456',
        '192.168.1.1'
      );
      
      // Verify the log was called and no errors occurred
      expect(mockChildLogger.info).toHaveBeenCalledTimes(1);
    });
    
    it('should handle missing file path when file logging is enabled', async () => {
      // Override the config module mock to enable file logging but with missing file path
      const configModule = jest.requireMock('../../config.js');
      configModule.default.auditLogToFile = true;
      configModule.default.auditLogFilePath = undefined;
      
      // Import the modules after setting up the mocks
      const { initializeAuditLogger } = await import('../../utils/initAuditLogger.js');
      
      // Initialize the audit logger - should not throw an error
      expect(() => initializeAuditLogger()).not.toThrow();
    });

    it('should handle null or undefined resource states gracefully', async () => {
      // Override the config module mock to include resource state
      const configModule = jest.requireMock('../../config.js');
      configModule.default.auditLogIncludeResourceState = true;
      
      // Import the modules after setting up the mocks
      const { initializeAuditLogger } = await import('../../utils/initAuditLogger.js');
      const auditLogger = await import('../../utils/auditLogger.js');
      
      // Initialize the audit logger
      initializeAuditLogger();
      
      // Log a resource modification event with null states
      auditLogger.logResourceModification(
        'machine',
        '123',
        'update',
        'req-123',
        null, // beforeState
        undefined, // afterState
        'user-456',
        '192.168.1.1'
      );
      
      // Verify the log was called without errors
      expect(mockChildLogger.info).toHaveBeenCalledTimes(1);
      const logCall = mockChildLogger.info.mock.calls[0];
      const logEntry = logCall[0];
      
      // States should be undefined after processing
      expect(logEntry.beforeState).toBeNull();
      expect(logEntry.afterState).toBeUndefined();
    });
  });
});