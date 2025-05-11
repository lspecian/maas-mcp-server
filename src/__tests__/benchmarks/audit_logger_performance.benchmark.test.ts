/**
 * Audit Logger Performance Benchmark Tests
 * 
 * This file contains benchmark tests for the audit logging system in the MAAS MCP server.
 * It measures and compares the performance impact of audit logging under various load scenarios
 * and with different configurations.
 */
import express, { Express } from 'express';
import request from 'supertest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { MaasApiClient } from '../../maas/MaasApiClient.js';
import { createMockMaasApiClient } from '../mocks/mockMaasApiClient.js';
import { MACHINES_LIST_URI_PATTERN, MACHINE_DETAILS_URI_PATTERN } from '../../mcp_resources/schemas/uriPatterns.js';
import fs from 'fs';
import path from 'path';

// Mock config module
jest.mock('../../config.js', () => ({
  __esModule: true,
  default: {
    maasApiUrl: 'http://mock-maas-api.example.com/MAAS',
    maasApiKey: 'mock-consumer-key:mock-token:mock-token-secret',
    mcpPort: 3000,
    nodeEnv: 'test',
    logLevel: 'info',
    cacheEnabled: false, // Disable caching for audit log tests
    cacheStrategy: 'time-based',
    cacheMaxSize: 1000,
    cacheMaxAge: 300,
    cacheResourceSpecificTTL: {},
    auditLogEnabled: true, // Default to enabled, will be overridden in tests
    auditLogIncludeResourceState: false, // Default to disabled, will be overridden in tests
    auditLogMaskSensitiveFields: true, // Default to enabled, will be overridden in tests
    auditLogSensitiveFields: 'password,token,secret,key,credential',
    auditLogToFile: false, // Default to disabled, will be overridden in tests
  }
}));

// Import after mocking
import config from '../../config.js';
import { CacheManager } from '../../mcp_resources/cache/cacheManager.js';

// Create a spy for the audit logger
const auditLoggerSpy = {
  logResourceAccess: jest.fn(),
  logResourceAccessFailure: jest.fn(),
  logResourceModification: jest.fn(),
  logResourceModificationFailure: jest.fn(),
  logCacheOperation: jest.fn(),
  setAuditLogOptions: jest.fn(),
  getAuditLogOptions: jest.fn(),
};

// Mock logger and auditLogger
jest.mock('../../utils/logger.js', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    child: jest.fn().mockReturnThis(),
  },
  generateRequestId: jest.fn().mockReturnValue('mock-request-id'),
}));

jest.mock('../../utils/auditLogger.js', () => ({
  __esModule: true,
  default: auditLoggerSpy,
  setAuditLogOptions: jest.fn(),
  getAuditLogOptions: jest.fn(),
  AuditEventType: {
    RESOURCE_ACCESS: 'resource_access',
    RESOURCE_MODIFICATION: 'resource_modification',
    RESOURCE_CREATION: 'resource_creation',
    RESOURCE_DELETION: 'resource_deletion',
    CACHE_OPERATION: 'cache_operation',
    AUTHENTICATION: 'authentication',
    AUTHORIZATION: 'authorization'
  },
  AuditLogLevel: {
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error'
  }
}));

// Import after mocking
import logger from '../../utils/logger.js';
import auditLogger, { setAuditLogOptions } from '../../utils/auditLogger.js';

// Test configuration - adjust these values as needed for your environment
// Note: For faster test runs, you can reduce these values
// For more comprehensive benchmarks, increase these values
const CONCURRENCY_LEVELS = [1, 5, 10];  // Number of concurrent requests to test
const REQUEST_COUNTS = [10, 50];  // Number of requests to make in each test
const NETWORK_DELAYS = [10, 50, 100];  // Simulated network delays in ms

// Debug mode - set to true for more detailed logging during test runs
const DEBUG_MODE = false;

// Mock data
const mockMachineIds = Array.from({ length: 20 }, (_, i) => `machine-${i}`);

// Test metrics
interface TestMetrics {
  totalTime: number;
  averageResponseTime: number;
  medianResponseTime: number;
  p95ResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  successRate: number;
}

// Test result
interface TestResult {
  testName: string;
  configuration: {
    auditLogEnabled: boolean;
    includeResourceState: boolean;
    maskSensitiveFields: boolean;
    logToFile: boolean;
    concurrentRequests: number;
    totalRequests: number;
    networkDelay: number;
    requestPattern: string;
  };
  metrics: TestMetrics;
}

describe('Audit Logger Performance Benchmarks', () => {
  let app: Express;
  let mcpServer: McpServer;
  let mockMaasClient: MaasApiClient;
  let cacheManager: CacheManager;
  const serverName = 'maas-mcp-server-benchmark';
  const results: TestResult[] = [];

  // Save original environment variables and config
  const originalEnv = { ...process.env };
  const originalConfig = { ...config };

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Create a new Express app for each test
    app = express();
    app.use(express.json());
  });
  
  afterEach(() => {
    // Clean up
    if (cacheManager) {
      cacheManager.clear();
    }
  });
  
  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
    
    // Print benchmark results
    console.log('\n\n===== AUDIT LOGGER PERFORMANCE BENCHMARK RESULTS =====\n');
    console.table(results.map(r => ({
      'Test': r.testName,
      'Audit Log': r.configuration.auditLogEnabled ? 'Enabled' : 'Disabled',
      'Include State': r.configuration.includeResourceState ? 'Yes' : 'No',
      'Mask Fields': r.configuration.maskSensitiveFields ? 'Yes' : 'No',
      'Log to File': r.configuration.logToFile ? 'Yes' : 'No',
      'Concurrent': r.configuration.concurrentRequests,
      'Total': r.configuration.totalRequests,
      'Delay (ms)': r.configuration.networkDelay,
      'Pattern': r.configuration.requestPattern,
      'Avg Time (ms)': r.metrics.averageResponseTime.toFixed(2),
      'Median (ms)': r.metrics.medianResponseTime.toFixed(2),
      'P95 (ms)': r.metrics.p95ResponseTime.toFixed(2),
      'Max (ms)': r.metrics.maxResponseTime.toFixed(2),
      'Req/s': r.metrics.requestsPerSecond.toFixed(2),
      'Success %': (r.metrics.successRate * 100).toFixed(2)
    })));
    
    // Print performance impact summary
    printPerformanceImpactSummary(results);
    
    // Export results to JSON file for further analysis if needed
    if (process.env.EXPORT_RESULTS === 'true') {
      const resultsDir = path.join(__dirname, 'results');
      
      // Create results directory if it doesn't exist
      if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
      }
      
      // Generate timestamp for unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const resultsPath = path.join(resultsDir, `audit-logger-benchmark-results-${timestamp}.json`);
      
      // Write results to file
      fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
      console.log(`\nResults exported to: ${resultsPath}`);
    }
  });

  /**
   * Set up the server with the specified audit log configuration
   */
  const setupServer = (auditLogConfig: any) => {
    // Create a new mock MAAS client with the specified network delay
    mockMaasClient = createMockMaasApiClient({
      simulateNetworkDelay: auditLogConfig.networkDelay,
    });
    
    // Override config values for testing
    config.auditLogEnabled = auditLogConfig.auditLogEnabled;
    config.auditLogIncludeResourceState = auditLogConfig.includeResourceState;
    config.auditLogMaskSensitiveFields = auditLogConfig.maskSensitiveFields;
    config.auditLogToFile = auditLogConfig.logToFile;
    
    // Reset the CacheManager singleton (to ensure it's not affecting our tests)
    (CacheManager as any).instance = null;
    cacheManager = CacheManager.getInstance();
    
    // Create a new MCP server
    const serverOptions = {
      name: serverName,
      version: "1.0.0",
      protocolVersion: "0.1.0",
      serverInfo: {
        name: "MAAS MCP Server Benchmark",
        version: "0.1.0",
        instructions: "Benchmark server for testing audit logger performance"
      },
      capabilities: {
        resources: {
          listChanged: false,
        },
        tools: {
          listChanged: false,
        },
      },
    };
    
    mcpServer = new McpServer(serverOptions);
    
    // Register resources
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined
    });
    
    // Set up Express route
    app.post(`/mcp/${serverName}`, async (req, res) => {
      try {
        await transport.handleRequest(req, res, req.body);
      } catch (error) {
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: 'Internal server error',
            },
            id: req.body?.id || null
          });
        }
      }
    });
  };

  /**
   * Run a single benchmark test
   */
  const runBenchmark = async (
    testName: string,
    auditLogEnabled: boolean,
    includeResourceState: boolean,
    maskSensitiveFields: boolean,
    logToFile: boolean,
    concurrentRequests: number,
    totalRequests: number,
    networkDelay: number,
    requestPattern: string
  ): Promise<TestResult> => {
    // Set up the server with the specified configuration
    setupServer({
      auditLogEnabled,
      includeResourceState,
      maskSensitiveFields,
      logToFile,
      networkDelay,
    });
    
    // Generate request payloads based on the pattern
    const requestPayloads: any[] = [];
    if (requestPattern === 'same') {
      // All requests for the same resource
      requestPayloads.push(...Array(totalRequests).fill({
        jsonrpc: '2.0',
        method: 'getResource',
        params: {
          uri: MACHINES_LIST_URI_PATTERN
        },
        id: 1
      }));
    } else if (requestPattern === 'random') {
      // Random requests across different resources
      for (let i = 0; i < totalRequests; i++) {
        const randomIndex = Math.floor(Math.random() * mockMachineIds.length);
        const machineId = mockMachineIds[randomIndex];
        const uri = MACHINE_DETAILS_URI_PATTERN.replace('{system_id}', machineId);
        requestPayloads.push({
          jsonrpc: '2.0',
          method: 'getResource',
          params: {
            uri
          },
          id: i + 1
        });
      }
    } else if (requestPattern === 'mixed') {
      // 80% to popular resources, 20% to less popular
      const popularResources = mockMachineIds.slice(0, 5);
      const lessPopularResources = mockMachineIds.slice(5);
      
      for (let i = 0; i < totalRequests; i++) {
        if (Math.random() < 0.8) {
          // 80% chance of popular resource
          const randomIndex = Math.floor(Math.random() * popularResources.length);
          const machineId = popularResources[randomIndex];
          const uri = MACHINE_DETAILS_URI_PATTERN.replace('{system_id}', machineId);
          requestPayloads.push({
            jsonrpc: '2.0',
            method: 'getResource',
            params: {
              uri
            },
            id: i + 1
          });
        } else {
          // 20% chance of less popular resource
          const randomIndex = Math.floor(Math.random() * lessPopularResources.length);
          const machineId = lessPopularResources[randomIndex];
          const uri = MACHINE_DETAILS_URI_PATTERN.replace('{system_id}', machineId);
          requestPayloads.push({
            jsonrpc: '2.0',
            method: 'getResource',
            params: {
              uri
            },
            id: i + 1
          });
        }
      }
    }
    
    // Run the benchmark
    const responseTimes: number[] = [];
    const startTime = Date.now();
    let successCount = 0;
    
    // Reset audit logger spy counts
    auditLoggerSpy.logResourceAccess.mockClear();
    auditLoggerSpy.logResourceAccessFailure.mockClear();
    auditLoggerSpy.logResourceModification.mockClear();
    auditLoggerSpy.logResourceModificationFailure.mockClear();
    
    // Process requests in batches based on concurrency
    for (let i = 0; i < requestPayloads.length; i += concurrentRequests) {
      const batch = requestPayloads.slice(i, i + concurrentRequests);
      const promises = batch.map(async (payload) => {
        const requestStartTime = Date.now();
        try {
          const response = await request(app)
            .post(`/mcp/${serverName}`)
            .set('Content-Type', 'application/json')
            .send(payload);
          
          const requestEndTime = Date.now();
          const responseTime = requestEndTime - requestStartTime;
          
          responseTimes.push(responseTime);
          
          if (response.status === 200) {
            successCount++;
            
            if (DEBUG_MODE) {
              console.log(`Request ${payload.id}: Response time ${responseTime}ms`);
            }
          }
        } catch (error) {
          // Log error but continue with other requests
          if (DEBUG_MODE) {
            console.error(`Error in benchmark request ${payload.id}:`, error);
          } else {
            console.error(`Error in benchmark request: ${error}`);
          }
        }
      });
      
      await Promise.all(promises);
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // Calculate metrics
    const sortedResponseTimes = [...responseTimes].sort((a, b) => a - b);
    const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length || 0;
    const medianResponseTime = sortedResponseTimes[Math.floor(sortedResponseTimes.length / 2)] || 0;
    const p95Index = Math.floor(sortedResponseTimes.length * 0.95);
    const p95ResponseTime = sortedResponseTimes[p95Index] || 0;
    const maxResponseTime = Math.max(...responseTimes, 0);
    const requestsPerSecond = (successCount / totalTime) * 1000 || 0;
    const successRate = successCount / totalRequests || 0;
    
    // Return test result
    const result: TestResult = {
      testName,
      configuration: {
        auditLogEnabled,
        includeResourceState,
        maskSensitiveFields,
        logToFile,
        concurrentRequests,
        totalRequests,
        networkDelay,
        requestPattern,
      },
      metrics: {
        totalTime,
        averageResponseTime,
        medianResponseTime,
        p95ResponseTime,
        maxResponseTime,
        requestsPerSecond,
        successRate,
      },
    };
    
    results.push(result);
    return result;
  };

  /**
   * Print a summary of performance impact
   *
   * This function analyzes the benchmark results and calculates performance impact
   * by comparing audit logging enabled vs. disabled scenarios with the same configuration.
   *
   * @param results Array of test results to analyze
   */
  const printPerformanceImpactSummary = (results: TestResult[]) => {
    // Group results by test configuration (excluding audit log settings)
    const groupedResults = new Map<string, TestResult[]>();
    
    results.forEach(result => {
      const key = `${result.configuration.concurrentRequests}-${result.configuration.totalRequests}-${result.configuration.networkDelay}-${result.configuration.requestPattern}`;
      if (!groupedResults.has(key)) {
        groupedResults.set(key, []);
      }
      groupedResults.get(key)!.push(result);
    });
    
    // Calculate performance impact
    const impacts: any[] = [];
    
    groupedResults.forEach((testResults, key) => {
      // Find audit log disabled and enabled results
      const disabledResult = testResults.find(r => !r.configuration.auditLogEnabled);
      
      if (disabledResult) {
        // Compare each enabled result with the disabled result
        testResults
          .filter(r => r.configuration.auditLogEnabled)
          .forEach(enabledResult => {
            const responseTimeImpact = (enabledResult.metrics.averageResponseTime / disabledResult.metrics.averageResponseTime) - 1;
            const throughputImpact = 1 - (enabledResult.metrics.requestsPerSecond / disabledResult.metrics.requestsPerSecond);
            
            impacts.push({
              'Test': enabledResult.testName,
              'Include State': enabledResult.configuration.includeResourceState ? 'Yes' : 'No',
              'Mask Fields': enabledResult.configuration.maskSensitiveFields ? 'Yes' : 'No',
              'Log to File': enabledResult.configuration.logToFile ? 'Yes' : 'No',
              'Concurrent': enabledResult.configuration.concurrentRequests,
              'Pattern': enabledResult.configuration.requestPattern,
              'Response Time Impact': `${(responseTimeImpact * 100).toFixed(2)}%`,
              'Throughput Impact': `${(throughputImpact * 100).toFixed(2)}%`,
            });
          });
      }
    });
    
    console.log('\n===== AUDIT LOGGER PERFORMANCE IMPACT SUMMARY =====\n');
    console.table(impacts);
  };

  // Basic Performance Tests
  describe('Basic Performance Tests', () => {
    it('should measure basic performance impact of audit logging', async () => {
      // Test with different network delays to simulate different API response times
      for (const networkDelay of [50]) { // Using just one delay for faster tests
        // Run without audit logging
        await runBenchmark(
          `Basic (${networkDelay}ms delay, audit log disabled)`,
          false, // auditLogEnabled
          false, // includeResourceState
          true,  // maskSensitiveFields
          false, // logToFile
          1,     // concurrentRequests
          20,    // totalRequests (reduced for faster tests)
          networkDelay,
          'same' // requestPattern
        );
        
        // Run with basic audit logging
        await runBenchmark(
          `Basic (${networkDelay}ms delay, audit log enabled)`,
          true,  // auditLogEnabled
          false, // includeResourceState
          true,  // maskSensitiveFields
          false, // logToFile
          1,     // concurrentRequests
          20,    // totalRequests (reduced for faster tests)
          networkDelay,
          'same' // requestPattern
        );
      }
    }, 30000); // Increase timeout for this test
  });

  // Resource State Impact Tests
  describe('Resource State Impact Tests', () => {
    it('should measure performance impact of including resource state in audit logs', async () => {
      // Test with different network delays to simulate different API response times
      for (const networkDelay of [50]) { // Using just one delay for faster tests
        // Run with audit logging without resource state
        await runBenchmark(
          `Resource State (${networkDelay}ms delay, without state)`,
          true,  // auditLogEnabled
          false, // includeResourceState
          true,  // maskSensitiveFields
          false, // logToFile
          1,     // concurrentRequests
          20,    // totalRequests (reduced for faster tests)
          networkDelay,
          'same' // requestPattern
        );
        
        // Run with audit logging with resource state
        await runBenchmark(
          `Resource State (${networkDelay}ms delay, with state)`,
          true,  // auditLogEnabled
          true,  // includeResourceState
          true,  // maskSensitiveFields
          false, // logToFile
          1,     // concurrentRequests
          20,    // totalRequests (reduced for faster tests)
          networkDelay,
          'same' // requestPattern
        );
      }
    }, 30000); // Increase timeout for this test
  });

  // Sensitive Field Masking Tests
  describe('Sensitive Field Masking Tests', () => {
    it('should measure performance impact of masking sensitive fields in audit logs', async () => {
      // Test with different network delays to simulate different API response times
      for (const networkDelay of [50]) { // Using just one delay for faster tests
        // Run with audit logging with resource state, without masking
        await runBenchmark(
          `Masking (${networkDelay}ms delay, without masking)`,
          true,  // auditLogEnabled
          true,  // includeResourceState
          false, // maskSensitiveFields
          false, // logToFile
          1,     // concurrentRequests
          20,    // totalRequests (reduced for faster tests)
          networkDelay,
          'same' // requestPattern
        );
        
        // Run with audit logging with resource state, with masking
        await runBenchmark(
          `Masking (${networkDelay}ms delay, with masking)`,
          true,  // auditLogEnabled
          true,  // includeResourceState
          true,  // maskSensitiveFields
          false, // logToFile
          1,     // concurrentRequests
          20,    // totalRequests (reduced for faster tests)
          networkDelay,
          'same' // requestPattern
        );
      }
    }, 30000); // Increase timeout for this test
  });

  // Concurrency Tests
  describe('Concurrency Tests', () => {
    it('should measure performance impact of audit logging under different concurrency levels', async () => {
      // Test with different concurrency levels
      for (const concurrentRequests of [1, 5]) { // Reduced for faster tests
        // Run without audit logging
        await runBenchmark(
          `Concurrency (${concurrentRequests} concurrent, audit log disabled)`,
          false, // auditLogEnabled
          false, // includeResourceState
          true,  // maskSensitiveFields
          false, // logToFile
          concurrentRequests,
          20,    // totalRequests (reduced for faster tests)
          50,    // Fixed network delay
          'same' // requestPattern
        );
        
        // Run with basic audit logging
        await runBenchmark(
          `Concurrency (${concurrentRequests} concurrent, audit log enabled)`,
          true,  // auditLogEnabled
          false, // includeResourceState
          true,  // maskSensitiveFields
          false, // logToFile
          concurrentRequests,
          20,    // totalRequests (reduced for faster tests)
          50,    // Fixed network delay
          'same' // requestPattern
        );
        
        // Run with full audit logging (resource state + masking)
        await runBenchmark(
          `Concurrency (${concurrentRequests} concurrent, full audit log)`,
          true,  // auditLogEnabled
          true,  // includeResourceState
          true,  // maskSensitiveFields
          false, // logToFile
          concurrentRequests,
          20,    // totalRequests (reduced for faster tests)
          50,    // Fixed network delay
          'same' // requestPattern
        );
      }
    }, 30000); // Increase timeout for this test
  });

  // Request Pattern Tests
  describe('Request Pattern Tests', () => {
    it('should measure performance impact of audit logging with different request patterns', async () => {
      const patterns = ['same', 'random', 'mixed'];
      
      for (const pattern of patterns) {
        // Run without audit logging
        await runBenchmark(
          `Pattern (${pattern}, audit log disabled)`,
          false, // auditLogEnabled
          false, // includeResourceState
          true,  // maskSensitiveFields
          false, // logToFile
          5,     // Fixed concurrency
          20,    // totalRequests (reduced for faster tests)
          50,    // Fixed network delay
          pattern
        );
        
        // Run with basic audit logging
        await runBenchmark(
          `Pattern (${pattern}, audit log enabled)`,
          true,  // auditLogEnabled
          false, // includeResourceState
          true,  // maskSensitiveFields
          false, // logToFile
          5,     // Fixed concurrency
          20,    // totalRequests (reduced for faster tests)
          50,    // Fixed network delay
          pattern
        );
        
        // Run with full audit logging (resource state + masking)
        await runBenchmark(
          `Pattern (${pattern}, full audit log)`,
          true,  // auditLogEnabled
          true,  // includeResourceState
          true,  // maskSensitiveFields
          false, // logToFile
          5,     // Fixed concurrency
          20,    // totalRequests (reduced for faster tests)
          50,    // Fixed network delay
          pattern
        );
      }
    }, 30000); // Increase timeout for this test
  });

  // Full Configuration Tests
  describe('Full Configuration Tests', () => {
    it('should measure performance impact of different audit log configurations', async () => {
      const configurations = [
        { name: 'Minimal', includeState: false, maskFields: false },
        { name: 'With State', includeState: true, maskFields: false },
        { name: 'With Masking', includeState: false, maskFields: true },
        { name: 'Full', includeState: true, maskFields: true }
      ];
      
      // Run without audit logging (baseline)
      await runBenchmark(
        `Configuration (baseline, audit log disabled)`,
        false, // auditLogEnabled
        false, // includeResourceState
        false, // maskSensitiveFields
        false, // logToFile
        5,     // Fixed concurrency
        20,    // totalRequests (reduced for faster tests)
        50,    // Fixed network delay
        'mixed' // requestPattern
      );
      
      for (const config of configurations) {
        // Run with the specified configuration
        await runBenchmark(
          `Configuration (${config.name})`,
          true,  // auditLogEnabled
          config.includeState,
          config.maskFields,
          false, // logToFile
          5,     // Fixed concurrency
          20,    // totalRequests (reduced for faster tests)
          50,    // Fixed network delay
          'mixed' // requestPattern
        );
      }
    }, 30000); // Increase timeout for this test
  });
});