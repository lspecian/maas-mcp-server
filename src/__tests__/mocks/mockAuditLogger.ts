/**
 * Mock factory for AuditLogger
 * Provides configurable mock implementations of the AuditLogger for testing
 */
import { AuditEventType, AuditLogLevel, AuditLogOptions } from '../../utils/auditLogger.js';

/**
 * Configuration options for the mock audit logger
 */
export interface MockAuditLoggerOptions {
  // Whether to simulate errors during logging
  simulateErrors?: boolean;
  // Whether to track call counts
  trackCalls?: boolean;
  // Custom implementation for specific methods
  customImplementations?: {
    logResourceAccess?: (...args: any[]) => void;
    logResourceAccessFailure?: (...args: any[]) => void;
    logResourceModification?: (...args: any[]) => void;
    logResourceModificationFailure?: (...args: any[]) => void;
    logCacheOperation?: (...args: any[]) => void;
  };
}

/**
 * Call tracking for audit logger methods
 */
export interface AuditLoggerCallCounts {
  logResourceAccess: number;
  logResourceAccessFailure: number;
  logResourceModification: number;
  logResourceModificationFailure: number;
  logCacheOperation: number;
  setAuditLogOptions: number;
  getAuditLogOptions: number;
}

/**
 * Creates a mock AuditLogger with configurable behavior
 * 
 * @param options Configuration options for the mock audit logger
 * @returns A mocked AuditLogger instance
 */
export function createMockAuditLogger(options: MockAuditLoggerOptions = {}): jest.Mocked<typeof import('../../utils/auditLogger.js').default> {
  const {
    simulateErrors = false,
    trackCalls = true,
    customImplementations = {}
  } = options;

  // Call counts for tracking
  const callCounts: AuditLoggerCallCounts = {
    logResourceAccess: 0,
    logResourceAccessFailure: 0,
    logResourceModification: 0,
    logResourceModificationFailure: 0,
    logCacheOperation: 0,
    setAuditLogOptions: 0,
    getAuditLogOptions: 0
  };

  // Default audit log options
  const defaultAuditLogOptions: AuditLogOptions = {
    includeResourceState: false,
    maskSensitiveFields: true,
    sensitiveFields: ['password', 'token', 'secret', 'key', 'credential'],
    logToFile: false
  };

  // Current audit log options
  let auditLogOptions: AuditLogOptions = { ...defaultAuditLogOptions };

  // Create the mock instance
  const mockAuditLogger = {
    logResourceAccess: jest.fn(),
    logResourceAccessFailure: jest.fn(),
    logResourceModification: jest.fn(),
    logResourceModificationFailure: jest.fn(),
    logCacheOperation: jest.fn(),
    setAuditLogOptions: jest.fn(),
    getAuditLogOptions: jest.fn()
  } as jest.Mocked<typeof import('../../utils/auditLogger.js').default>;

  // Implement mock methods
  mockAuditLogger.logResourceAccess.mockImplementation((
    resourceType: string,
    resourceId: string | undefined,
    action: string,
    requestId: string,
    userId?: string,
    ipAddress?: string,
    details?: Record<string, any>,
    resourceState?: any
  ) => {
    if (trackCalls) callCounts.logResourceAccess++;
    
    if (simulateErrors) {
      throw new Error(`Mock error in logResourceAccess for ${resourceType}`);
    }
    
    if (customImplementations.logResourceAccess) {
      return customImplementations.logResourceAccess(
        resourceType, resourceId, action, requestId, userId, ipAddress, details, resourceState
      );
    }
  });

  mockAuditLogger.logResourceAccessFailure.mockImplementation((
    resourceType: string,
    resourceId: string | undefined,
    action: string,
    requestId: string,
    error: any,
    userId?: string,
    ipAddress?: string,
    details?: Record<string, any>
  ) => {
    if (trackCalls) callCounts.logResourceAccessFailure++;
    
    if (simulateErrors) {
      throw new Error(`Mock error in logResourceAccessFailure for ${resourceType}`);
    }
    
    if (customImplementations.logResourceAccessFailure) {
      return customImplementations.logResourceAccessFailure(
        resourceType, resourceId, action, requestId, error, userId, ipAddress, details
      );
    }
  });

  mockAuditLogger.logResourceModification.mockImplementation((
    resourceType: string,
    resourceId: string,
    action: string,
    requestId: string,
    beforeState?: any,
    afterState?: any,
    userId?: string,
    ipAddress?: string,
    details?: Record<string, any>
  ) => {
    if (trackCalls) callCounts.logResourceModification++;
    
    if (simulateErrors) {
      throw new Error(`Mock error in logResourceModification for ${resourceType}`);
    }
    
    if (customImplementations.logResourceModification) {
      return customImplementations.logResourceModification(
        resourceType, resourceId, action, requestId, beforeState, afterState, userId, ipAddress, details
      );
    }
  });

  mockAuditLogger.logResourceModificationFailure.mockImplementation((
    resourceType: string,
    resourceId: string,
    action: string,
    requestId: string,
    error: any,
    beforeState?: any,
    userId?: string,
    ipAddress?: string,
    details?: Record<string, any>
  ) => {
    if (trackCalls) callCounts.logResourceModificationFailure++;
    
    if (simulateErrors) {
      throw new Error(`Mock error in logResourceModificationFailure for ${resourceType}`);
    }
    
    if (customImplementations.logResourceModificationFailure) {
      return customImplementations.logResourceModificationFailure(
        resourceType, resourceId, action, requestId, error, beforeState, userId, ipAddress, details
      );
    }
  });

  mockAuditLogger.logCacheOperation.mockImplementation((
    resourceType: string,
    action: string,
    requestId: string,
    resourceId?: string,
    details?: Record<string, any>
  ) => {
    if (trackCalls) callCounts.logCacheOperation++;
    
    if (simulateErrors) {
      throw new Error(`Mock error in logCacheOperation for ${resourceType}`);
    }
    
    if (customImplementations.logCacheOperation) {
      return customImplementations.logCacheOperation(
        resourceType, action, requestId, resourceId, details
      );
    }
  });

  mockAuditLogger.setAuditLogOptions.mockImplementation((options: Partial<AuditLogOptions>) => {
    if (trackCalls) callCounts.setAuditLogOptions++;
    
    if (simulateErrors) {
      throw new Error('Mock error in setAuditLogOptions');
    }
    
    auditLogOptions = {
      ...auditLogOptions,
      ...options
    };
  });

  mockAuditLogger.getAuditLogOptions.mockImplementation(() => {
    if (trackCalls) callCounts.getAuditLogOptions++;
    
    if (simulateErrors) {
      throw new Error('Mock error in getAuditLogOptions');
    }
    
    return { ...auditLogOptions };
  });

  // Add call counts to the mock for inspection
  (mockAuditLogger as any).callCounts = callCounts;
  
  // Add reset method to clear call counts
  (mockAuditLogger as any).resetCallCounts = () => {
    Object.keys(callCounts).forEach(key => {
      callCounts[key as keyof AuditLoggerCallCounts] = 0;
    });
  };

  return mockAuditLogger;
}

/**
 * Predefined mock audit logger configurations
 */
export const mockAuditLoggerConfigs = {
  // Default configuration
  default: () => createMockAuditLogger(),
  
  // Configuration with errors
  withErrors: () => createMockAuditLogger({ simulateErrors: true }),
  
  // Configuration without call tracking
  withoutTracking: () => createMockAuditLogger({ trackCalls: false }),
  
  // Configuration with custom implementations
  withCustomImplementations: (customImplementations: MockAuditLoggerOptions['customImplementations']) => 
    createMockAuditLogger({ customImplementations })
};

/**
 * Setup a mock AuditLogger for testing
 * This is a convenience function that creates a mock and sets it up as the default export
 * 
 * @param options Configuration options for the mock audit logger
 * @returns The mocked AuditLogger instance
 */
export function setupMockAuditLogger(options: MockAuditLoggerOptions = {}): jest.Mocked<typeof import('../../utils/auditLogger.js').default> {
  const mockInstance = createMockAuditLogger(options);
  jest.mock('../../utils/auditLogger.js', () => mockInstance);
  return mockInstance;
}

/**
 * Get call counts from a mock audit logger
 * 
 * @param mockLogger The mock audit logger instance
 * @returns The call counts for each method
 */
export function getAuditLoggerCallCounts(mockLogger: jest.Mocked<typeof import('../../utils/auditLogger.js').default>): AuditLoggerCallCounts {
  return (mockLogger as any).callCounts;
}