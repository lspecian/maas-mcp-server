/**
 * Cache Performance Benchmark Tests
 * 
 * This file contains benchmark tests for the caching system in the MAAS MCP server.
 * It measures and compares the performance of cached vs. non-cached requests under
 * various load scenarios and with different caching strategies.
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
    cacheEnabled: true,
    cacheStrategy: 'time-based',
    cacheMaxSize: 1000,
    cacheMaxAge: 300,
    cacheResourceSpecificTTL: {},
    auditLogEnabled: false,
    auditLogIncludeResourceState: false,
    auditLogMaskSensitiveFields: true,
    auditLogSensitiveFields: 'password,token,secret,key,credential',
    auditLogToFile: false,
  }
}));

import { CacheManager } from '../../mcp_resources/cache/cacheManager.js';
import config from '../../config.js';

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
  default: {
    logResourceAccess: jest.fn(),
    logResourceAccessFailure: jest.fn(),
    logResourceModification: jest.fn(),
    logResourceModificationFailure: jest.fn(),
    logCacheOperation: jest.fn(),
  },
}));

// Import after mocking
import logger from '../../utils/logger.js';
import auditLogger from '../../utils/auditLogger.js';

// Test configuration - adjust these values as needed for your environment
// Note: For faster test runs, you can reduce these values
// For more comprehensive benchmarks, increase these values
const CONCURRENCY_LEVELS = [1, 5, 10];  // Number of concurrent requests to test
const REQUEST_COUNTS = [10, 50];  // Number of requests to make in each test
const NETWORK_DELAYS = [10, 50, 100];  // Simulated network delays in ms
const CACHE_TTL_VALUES = [10, 60, 300];  // Cache TTL values to test in seconds

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
  cacheHitRatio?: number;
}

// Test result
interface TestResult {
  testName: string;
  configuration: {
    cacheEnabled: boolean;
    cacheStrategy: string;
    cacheTTL: number;
    concurrentRequests: number;
    totalRequests: number;
    networkDelay: number;
    requestPattern: string;
  };
  metrics: TestMetrics;
}

describe('Cache Performance Benchmarks', () => {
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
    console.log('\n\n===== CACHE PERFORMANCE BENCHMARK RESULTS =====\n');
    console.table(results.map(r => ({
      'Test': r.testName,
      'Cache': r.configuration.cacheEnabled ? 'Enabled' : 'Disabled',
      'Strategy': r.configuration.cacheStrategy,
      'TTL': r.configuration.cacheTTL,
      'Concurrent': r.configuration.concurrentRequests,
      'Total': r.configuration.totalRequests,
      'Delay (ms)': r.configuration.networkDelay,
      'Pattern': r.configuration.requestPattern,
      'Avg Time (ms)': r.metrics.averageResponseTime.toFixed(2),
      'Median (ms)': r.metrics.medianResponseTime.toFixed(2),
      'P95 (ms)': r.metrics.p95ResponseTime.toFixed(2),
      'Max (ms)': r.metrics.maxResponseTime.toFixed(2),
      'Req/s': r.metrics.requestsPerSecond.toFixed(2),
      'Success %': (r.metrics.successRate * 100).toFixed(2),
      'Cache Hit %': r.metrics.cacheHitRatio !== undefined ? (r.metrics.cacheHitRatio * 100).toFixed(2) : 'N/A'
    })));
    
    // Print performance improvement summary
    printPerformanceImprovementSummary(results);
    
    // Export results to JSON file for further analysis if needed
    if (process.env.EXPORT_RESULTS === 'true') {
      const resultsDir = path.join(__dirname, 'results');
      
      // Create results directory if it doesn't exist
      if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
      }
      
      // Generate timestamp for unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const resultsPath = path.join(resultsDir, `benchmark-results-${timestamp}.json`);
      
      // Write results to file
      fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
      console.log(`\nResults exported to: ${resultsPath}`);
    }
  });

  /**
   * Set up the server with the specified cache configuration
   */
  const setupServer = (cacheConfig: any) => {
    // Create a new mock MAAS client with the specified network delay
    mockMaasClient = createMockMaasApiClient({
      simulateNetworkDelay: cacheConfig.networkDelay,
    });
    
    // Override config values for testing
    config.cacheEnabled = cacheConfig.cacheEnabled;
    config.cacheStrategy = cacheConfig.cacheStrategy;
    config.cacheMaxSize = 1000;
    config.cacheMaxAge = cacheConfig.cacheTTL;
    
    // Reset the CacheManager singleton
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
        instructions: "Benchmark server for testing cache performance"
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
    cacheEnabled: boolean,
    cacheStrategy: string,
    cacheTTL: number,
    concurrentRequests: number,
    totalRequests: number,
    networkDelay: number,
    requestPattern: string
  ): Promise<TestResult> => {
    // Set up the server with the specified configuration
    setupServer({
      cacheEnabled,
      cacheStrategy,
      cacheTTL,
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
    let cacheHits = 0;
    
    // Process requests in batches based on concurrency
    for (let i = 0; i < requestPayloads.length; i += concurrentRequests) {
      const batch = requestPayloads.slice(i, i + concurrentRequests);
      const promises = batch.map(async (payload) => {
        const requestStartTime = Date.now();
        try {
          // Track cache hits by checking audit logs before the request
          const cacheLogCountBefore = jest.mocked(auditLogger.logCacheOperation).mock.calls.length;
          
          const response = await request(app)
            .post(`/mcp/${serverName}`)
            .set('Content-Type', 'application/json')
            .send(payload);
          
          const requestEndTime = Date.now();
          const responseTime = requestEndTime - requestStartTime;
          
          responseTimes.push(responseTime);
          
          if (response.status === 200) {
            successCount++;
            
            // More reliable cache hit detection by checking audit logs
            const cacheLogCountAfter = jest.mocked(auditLogger.logCacheOperation).mock.calls.length;
            const cacheLogEntries = jest.mocked(auditLogger.logCacheOperation).mock.calls.slice(cacheLogCountBefore);
            
            // Check if any cache hit operations were logged
            const hasCacheHit = cacheLogEntries.some(call => {
              // Check for 'hit' operation
              if (call[0] === 'hit') return true;
              
              // For simplicity, let's just check for 'hit' operations
              // This avoids type issues with the mock implementation
              return false;
            });
            
            // Fallback to checking response headers
            const hasCacheHeader = response.headers['age'] !== undefined;
            
            if (hasCacheHit || hasCacheHeader) {
              cacheHits++;
            }
            
            
            if (DEBUG_MODE) {
              console.log(`Request ${payload.id}: Response time ${responseTime}ms, Cache hit: ${hasCacheHit}`);
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
    const cacheHitRatio = cacheEnabled ? cacheHits / successCount || 0 : undefined;
    
    // Return test result
    const result: TestResult = {
      testName,
      configuration: {
        cacheEnabled,
        cacheStrategy,
        cacheTTL,
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
        cacheHitRatio,
      },
    };
    
    results.push(result);
    return result;
  };

  /**
   * Print a summary of performance improvements
   *
   * This function analyzes the benchmark results and calculates performance improvements
   * by comparing cached vs. non-cached scenarios with the same configuration.
   *
   * @param results Array of test results to analyze
   */
  const printPerformanceImprovementSummary = (results: TestResult[]) => {
    // Group results by test configuration (excluding cache settings)
    const groupedResults = new Map<string, TestResult[]>();
    
    results.forEach(result => {
      const key = `${result.configuration.concurrentRequests}-${result.configuration.totalRequests}-${result.configuration.networkDelay}-${result.configuration.requestPattern}`;
      if (!groupedResults.has(key)) {
        groupedResults.set(key, []);
      }
      groupedResults.get(key)!.push(result);
    });
    
    // Calculate performance improvements
    const improvements: any[] = [];
    
    groupedResults.forEach((testResults, key) => {
      // Find cached and non-cached results
      const nonCachedResult = testResults.find(r => !r.configuration.cacheEnabled);
      
      if (nonCachedResult) {
        // Compare each cached result with the non-cached result
        testResults
          .filter(r => r.configuration.cacheEnabled)
          .forEach(cachedResult => {
            const responseTimeImprovement = 1 - (cachedResult.metrics.averageResponseTime / nonCachedResult.metrics.averageResponseTime);
            const throughputImprovement = (cachedResult.metrics.requestsPerSecond / nonCachedResult.metrics.requestsPerSecond) - 1;
            
            improvements.push({
              'Test': cachedResult.testName,
              'Strategy': cachedResult.configuration.cacheStrategy,
              'TTL': cachedResult.configuration.cacheTTL,
              'Concurrent': cachedResult.configuration.concurrentRequests,
              'Pattern': cachedResult.configuration.requestPattern,
              'Response Time Improvement': `${(responseTimeImprovement * 100).toFixed(2)}%`,
              'Throughput Improvement': `${(throughputImprovement * 100).toFixed(2)}%`,
              'Cache Hit Ratio': `${(cachedResult.metrics.cacheHitRatio! * 100).toFixed(2)}%`,
            });
          });
      }
    });
    
    console.log('\n===== PERFORMANCE IMPROVEMENT SUMMARY =====\n');
    console.table(improvements);
  };

  // Response Time Tests
  describe('Response Time Tests', () => {
    it('should measure response time improvement with caching', async () => {
      // Test with different network delays to simulate different API response times
      for (const networkDelay of [50]) { // Using just one delay for faster tests
        // Run without cache
        await runBenchmark(
          `Response Time (${networkDelay}ms delay, no cache)`,
          false,
          'time-based',
          300,
          1,
          20, // Reduced for faster tests
          networkDelay,
          'same'
        );
        
        // Run with time-based cache
        await runBenchmark(
          `Response Time (${networkDelay}ms delay, time-based cache)`,
          true,
          'time-based',
          300,
          1,
          20, // Reduced for faster tests
          networkDelay,
          'same'
        );
        
        // Run with LRU cache
        await runBenchmark(
          `Response Time (${networkDelay}ms delay, LRU cache)`,
          true,
          'lru',
          300,
          1,
          20, // Reduced for faster tests
          networkDelay,
          'same'
        );
      }
    }, 30000); // Increase timeout for this test
  });

  // Throughput Tests
  describe('Throughput Tests', () => {
    it('should measure throughput improvement with caching', async () => {
      // Test with different concurrency levels
      for (const concurrentRequests of [1, 5]) { // Reduced for faster tests
        // Run without cache
        await runBenchmark(
          `Throughput (${concurrentRequests} concurrent, no cache)`,
          false,
          'time-based',
          300,
          concurrentRequests,
          20, // Reduced for faster tests
          50, // Fixed network delay
          'same'
        );
        
        // Run with time-based cache
        await runBenchmark(
          `Throughput (${concurrentRequests} concurrent, time-based cache)`,
          true,
          'time-based',
          300,
          concurrentRequests,
          20, // Reduced for faster tests
          50, // Fixed network delay
          'same'
        );
        
        // Run with LRU cache
        await runBenchmark(
          `Throughput (${concurrentRequests} concurrent, LRU cache)`,
          true,
          'lru',
          300,
          concurrentRequests,
          20, // Reduced for faster tests
          50, // Fixed network delay
          'same'
        );
      }
    }, 30000); // Increase timeout for this test
  });

  // Load Pattern Tests
  describe('Load Pattern Tests', () => {
    it('should measure performance with different request patterns', async () => {
      const patterns = ['same', 'random', 'mixed'];
      
      for (const pattern of patterns) {
        // Run without cache
        await runBenchmark(
          `Load Pattern (${pattern}, no cache)`,
          false,
          'time-based',
          300,
          5, // Fixed concurrency
          20, // Reduced for faster tests
          50, // Fixed network delay
          pattern
        );
        
        // Run with time-based cache
        await runBenchmark(
          `Load Pattern (${pattern}, time-based cache)`,
          true,
          'time-based',
          300,
          5, // Fixed concurrency
          20, // Reduced for faster tests
          50, // Fixed network delay
          pattern
        );
        
        // Run with LRU cache
        await runBenchmark(
          `Load Pattern (${pattern}, LRU cache)`,
          true,
          'lru',
          300,
          5, // Fixed concurrency
          20, // Reduced for faster tests
          50, // Fixed network delay
          pattern
        );
      }
    }, 30000); // Increase timeout for this test
  });

  // Cache Strategy Comparison
  describe('Cache Strategy Comparison', () => {
    it('should compare time-based and LRU strategies', async () => {
      const strategies = ['time-based', 'lru'];
      
      for (const strategy of strategies) {
        // Run with high cache hit ratio (same resource)
        await runBenchmark(
          `Strategy (${strategy}, high hit ratio)`,
          true,
          strategy,
          300,
          5, // Fixed concurrency
          20, // Reduced for faster tests
          50, // Fixed network delay
          'same'
        );
        
        // Run with low cache hit ratio (random resources)
        await runBenchmark(
          `Strategy (${strategy}, low hit ratio)`,
          true,
          strategy,
          300,
          5, // Fixed concurrency
          20, // Reduced for faster tests
          50, // Fixed network delay
          'random'
        );
        
        // Run with mixed cache hit ratio
        await runBenchmark(
          `Strategy (${strategy}, mixed hit ratio)`,
          true,
          strategy,
          300,
          5, // Fixed concurrency
          20, // Reduced for faster tests
          50, // Fixed network delay
          'mixed'
        );
      }
    }, 30000); // Increase timeout for this test
  });

  // TTL Tests
  describe('TTL Tests', () => {
    it('should measure performance with different TTL values', async () => {
      for (const ttl of [10, 300]) { // Reduced for faster tests
        // Run with time-based cache
        await runBenchmark(
          `TTL (${ttl}s, time-based)`,
          true,
          'time-based',
          ttl,
          5, // Fixed concurrency
          20, // Reduced for faster tests
          50, // Fixed network delay
          'mixed'
        );
        
        // Run with LRU cache
        await runBenchmark(
          `TTL (${ttl}s, LRU)`,
          true,
          'lru',
          ttl,
          5, // Fixed concurrency
          20, // Reduced for faster tests
          50, // Fixed network delay
          'mixed'
        );
      }
    }, 30000); // Increase timeout for this test
  });
});