import { Writable } from 'stream';
import type { Logger } from 'pino';

// Mock the config module
// The default mock will be for a 'test' environment
// Specific tests will override this using jest.doMock
jest.mock('../config.js', () => ({
  __esModule: true,
  default: {
    logLevel: 'info',
    nodeEnv: 'test', // Default for tests, can be overridden per test
  },
}));

// Mock pino for tests that don't need actual log output,
// or for verifying configuration.
const mockPinoLogMethods = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  fatal: jest.fn(),
  trace: jest.fn(),
};

const mockPinoInstance = {
  ...mockPinoLogMethods,
  child: jest.fn().mockImplementation((bindings) => ({
    ...mockPinoLogMethods, // Each child gets its own fresh mock methods
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    fatal: jest.fn(),
    trace: jest.fn(),
    bindings: () => bindings, // Utility to check what the child was bound with
  })),
  bindings: () => ({}), // Mock for base logger if needed
};

const mockPino = jest.fn(() => mockPinoInstance);
jest.mock('pino', () => mockPino); // Default pino mock

// Dynamically import logger parts inside tests where mocks might change
// For example: const { generateRequestId, createRequestLogger, default: logger } = await import('../utils/logger');

describe('Logging Service', () => {
  beforeEach(() => {
    // Clear all mock states before each test
    jest.clearAllMocks();

    // Reset the main pino mock to return a clean instance structure
    // This is important because mockPinoInstance is mutated by some tests indirectly
    mockPino.mockImplementation(() => ({
      ...mockPinoLogMethods, // Reset parent log methods
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      fatal: jest.fn(),
      trace: jest.fn(),
      child: jest.fn().mockImplementation((bindings) => ({
        ...mockPinoLogMethods, // Reset child log methods
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        fatal: jest.fn(),
        trace: jest.fn(),
        bindings: () => bindings,
      })),
      bindings: () => ({}),
    }));
  });

  describe('generateRequestId', () => {
    it('should generate unique request IDs', async () => {
      const { generateRequestId } = await import('../utils/logger.ts');
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      // Add a small delay to ensure Date.now() might change if tests run too fast
      await new Promise(resolve => setTimeout(resolve, 5));
      const id3 = generateRequestId();

      expect(id1).not.toBe(id2);
      expect(id1).not.toBe(id3);
      expect(id2).not.toBe(id3);
    });

    it('should generate IDs in an expected alphanumeric format', async () => {
      const { generateRequestId } = await import('../utils/logger.ts');
      const id = generateRequestId();
      // Format is roughly: timestampInBase36 + randomStringInBase36
      expect(id).toMatch(/^[a-z0-9]+$/);
      expect(id.length).toBeGreaterThan(10); // Heuristic check
    });
  });

  describe('createRequestLogger', () => {
    // These tests rely on the default mock of 'pino'
    it('should create a child logger with the provided requestId, method, and params', async () => {
      const { createRequestLogger } = await import('../utils/logger.ts');
      const requestId = 'test-req-id-001';
      const method = 'GET /api/items';
      const params = { userId: 123, filter: 'active' };

      const requestLogger = createRequestLogger(requestId, method, params);

      // Check that the main logger's child() method was called with correct bindings
      expect(mockPinoInstance.child).toHaveBeenCalledTimes(1);
      expect(mockPinoInstance.child).toHaveBeenCalledWith({
        requestId,
        method,
        params: JSON.stringify(params),
      });

      // Check the bindings of the returned logger instance
      expect(requestLogger.bindings()).toEqual({
        requestId,
        method,
        params: JSON.stringify(params),
      });
    });

    it('should truncate params to 200 characters if they are too long', async () => {
      const { createRequestLogger } = await import('../utils/logger.ts');
      const requestId = 'test-req-id-002';
      const longString = 'x'.repeat(250);
      const params = { data: longString, key: 'value' }; // JSON.stringify will make it longer
      const stringifiedParams = JSON.stringify(params);
      const expectedTruncatedParams = stringifiedParams.substring(0, 200);

      const requestLogger = createRequestLogger(requestId, 'POST /api/data', params);

      expect(mockPinoInstance.child).toHaveBeenCalledWith({
        requestId,
        method: 'POST /api/data',
        params: expectedTruncatedParams,
      });
      expect(requestLogger.bindings().params.length).toBe(200);
      expect(requestLogger.bindings().params).toBe(expectedTruncatedParams);
    });

    it('should handle undefined method and params correctly', async () => {
      const { createRequestLogger } = await import('../utils/logger.ts');
      const requestId = 'test-req-id-003';

      const requestLogger = createRequestLogger(requestId, undefined, undefined);

      expect(mockPinoInstance.child).toHaveBeenCalledWith({
        requestId,
        method: undefined,
        params: undefined,
      });
      expect(requestLogger.bindings()).toEqual({
        requestId,
        method: undefined,
        params: undefined,
      });
    });

     it('should handle params that stringify to less than 200 chars without truncation', async () => {
      const { createRequestLogger } = await import('../utils/logger.ts');
      const requestId = 'test-req-id-004';
      const params = { short: "data", value: 123 };
      const stringifiedParams = JSON.stringify(params);

      const requestLogger = createRequestLogger(requestId, 'PUT /api/resource', params);

      expect(mockPinoInstance.child).toHaveBeenCalledWith({
        requestId,
        method: 'PUT /api/resource',
        params: stringifiedParams,
      });
      expect(requestLogger.bindings().params).toBe(stringifiedParams);
      expect(requestLogger.bindings().params.length).toBeLessThan(200);
    });
  });

  describe('Logger Configuration and Output by Environment', () => {
    // This beforeEach is crucial for tests that change mocks and re-import modules
    beforeEach(() => {
      jest.resetModules();
    });

    // After this block, ensure modules are reset so other describe blocks are not affected
    afterAll(() => {
        jest.resetModules();
    });

    it('should configure pino with pino-pretty transport in development environment', async () => {
      // Override config for this test
      jest.doMock('../config.js', () => ({
        __esModule: true,
        default: {
          logLevel: 'debug',
          nodeEnv: 'development',
        },
      }));

      // Use a fresh pino mock for this specific import
      const pinoDevMock = jest.fn(() => mockPinoInstance);
      jest.doMock('pino', () => pinoDevMock);

      await import('../utils/logger.ts'); // Re-imports logger.ts, triggering pino()

      expect(pinoDevMock).toHaveBeenCalledTimes(1);
      expect(pinoDevMock).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'debug',
          transport: { target: 'pino-pretty' },
          base: undefined,
        })
      );
    });

    it('should configure pino without specific transport (for JSON output) in production environment', async () => {
      jest.doMock('../config.js', () => ({
        __esModule: true,
        default: {
          logLevel: 'warn',
          nodeEnv: 'production',
        },
      }));

      const pinoProdMock = jest.fn(() => mockPinoInstance);
      jest.doMock('pino', () => pinoProdMock);

      await import('../utils/logger.ts');

      expect(pinoProdMock).toHaveBeenCalledTimes(1);
      expect(pinoProdMock).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'warn',
          transport: undefined, // Key for production: no explicit transport
          base: undefined,
        })
      );
    });

    describe('Actual Log Output Verification (Production)', () => {
      let capturedLogs: any[];
      let testLogStream: Writable;

      beforeEach(() => {
        capturedLogs = [];
        testLogStream = new Writable({
          write(chunk, encoding, callback) {
            try {
              capturedLogs.push(JSON.parse(chunk.toString()));
            } catch (e) {
              capturedLogs.push(chunk.toString()); // Fallback for non-JSON
            }
            callback();
          },
        });
        jest.resetModules(); // Reset modules before each actual output test
      });

      it('should output structured JSON logs in production environment', async () => {
        jest.doMock('../config.js', () => ({
          __esModule: true,
          default: {
            logLevel: 'info',
            nodeEnv: 'production',
          },
        }));

        // Mock pino to use the actual pino with our test stream for production-like config
        jest.doMock('pino', () => {
          const realPino = jest.requireActual('pino');
          return jest.fn((options: any) => {
            if (options && options.transport === undefined) { // Production scenario
              return realPino(options, testLogStream);
            }
            // For other scenarios (like dev with transport), or if options is undefined
            return realPino(options); // or a simple mock if not testing its output
          });
        });

        const { default: prodLogger, createRequestLogger: createProdRequestLogger } = await import('../utils/logger.ts');

        // Test 1: Main logger output
        prodLogger.info({ customField: 'value1' }, 'Production log message 1');
        expect(capturedLogs.length).toBe(1);
        const logEntry1 = capturedLogs[0];
        expect(logEntry1).toMatchObject({
          level: 30, // Pino level for 'info'
          time: expect.any(Number),
          customField: 'value1',
          msg: 'Production log message 1',
        });
        expect(logEntry1.pid).toBeUndefined();
        expect(logEntry1.hostname).toBeUndefined();

        // Test 2: Child logger output
        capturedLogs = []; // Reset for the next log
        const childLogger = createProdRequestLogger('req-abc-789', 'POST /submit', { payloadSize: 1024 });
        childLogger.warn({ errorCode: 'E500' }, 'Child logger warning message');

        expect(capturedLogs.length).toBe(1);
        const logEntry2 = capturedLogs[0];
        expect(logEntry2).toMatchObject({
          level: 40, // Pino level for 'warn'
          time: expect.any(Number),
          requestId: 'req-abc-789',
          method: 'POST /submit',
          params: JSON.stringify({ payloadSize: 1024 }),
          errorCode: 'E500',
          msg: 'Child logger warning message',
        });
        expect(logEntry2.pid).toBeUndefined();
        expect(logEntry2.hostname).toBeUndefined();
      });
    });
  });
});