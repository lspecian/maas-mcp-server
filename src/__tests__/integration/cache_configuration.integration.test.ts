import request from 'supertest';
import express, { Express } from 'express';
import { McpServer, McpServerOptions } from '../../../mcp_server/McpServer';
import { MaasApiClient } from '../../../maas/MaasApiClient';
import { MockMaasApiClient } from '../../mocks/mockMaasApiClient';
import { machineCollectionUri } from '../../../mcp_resources/schemas/uriPatterns';
import { CacheManager } from '../../../mcp_resources/cache/cacheManager';
import { Logger } from '../../../utils/logger';
import { AuditLogger } from '../../../utils/auditLogger';

describe('Cache Configuration Integration Tests', () => {
  let app: Express;
  let mcpServer: McpServer;
  let mockMaasClient: MockMaasApiClient;
  let cacheManager: CacheManager;
  const serverName = 'maas-mcp-server-cache-test';
  
  // Sample data for testing
  const sampleMachines = [
    { system_id: 'm1', hostname: 'host1', status: 6 },
    { system_id: 'm2', hostname: 'host2', status: 4 }
  ];

  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    child: jest.fn().mockReturnThis(),
  } as unknown as Logger;

  const mockAuditLogger = {
    log: jest.fn(),
  } as unknown as AuditLogger;

  // Save original environment variables
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Create a new Express app for each test
    app = express();
    app.use(express.json());
    
    // Create a new mock MAAS client
    mockMaasClient = new MockMaasApiClient({
      oauthHost: 'mock-oauth-host',
      apiKey: 'mock-api-key',
      maasUrl: 'http://mock-maas-url',
      logger: mockLogger,
    });
    
    // Mock the getMachines method
    (mockMaasClient.getMachines as jest.Mock).mockResolvedValue(sampleMachines);
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
  });

  const setupServer = (cacheConfig: any) => {
    // Create a new CacheManager with the specified configuration
    cacheManager = CacheManager.getInstance();
    
    // Create a new MCP server
    const serverOptions: McpServerOptions = {
      name: serverName,
      maasApiClient: mockMaasClient as unknown as MaasApiClient,
      cacheManager: cacheManager,
      logger: mockLogger,
      auditLogger: mockAuditLogger,
      transports: [],
    };
    
    mcpServer = new McpServer(serverOptions);
    app.use(`/mcp/${serverName}`, mcpServer.router);
  };

  describe('Cache Strategy Selection', () => {
    it('should use time-based strategy by default', async () => {
      // Setup server with default configuration
      setupServer({
        cacheEnabled: true,
        cacheStrategy: 'time-based',
        cacheMaxSize: 1000,
        cacheMaxAge: 300,
      });
      
      // Make a request to trigger caching
      await request(app)
        .get(`/mcp/${serverName}/resources/${encodeURIComponent(machineCollectionUri)}`)
        .expect(200);
      
      // Verify the strategy was initialized correctly
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Initialized time-based cache strategy',
        expect.any(Object)
      );
    });

    it('should use LRU strategy when configured', async () => {
      // Set environment variable
      process.env.CACHE_STRATEGY = 'lru';
      
      // Setup server with LRU configuration
      setupServer({
        cacheEnabled: true,
        cacheStrategy: 'lru',
        cacheMaxSize: 1000,
        cacheMaxAge: 300,
      });
      
      // Make a request to trigger caching
      await request(app)
        .get(`/mcp/${serverName}/resources/${encodeURIComponent(machineCollectionUri)}`)
        .expect(200);
      
      // Verify the strategy was initialized correctly
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Initialized LRU cache strategy',
        expect.any(Object)
      );
    });
  });

  describe('Cache Behavior', () => {
    it('should cache responses and not call MAAS API for subsequent requests', async () => {
      // Setup server with caching enabled
      setupServer({
        cacheEnabled: true,
        cacheStrategy: 'time-based',
        cacheMaxSize: 1000,
        cacheMaxAge: 300,
      });
      
      // First request should call MAAS API
      await request(app)
        .get(`/mcp/${serverName}/resources/${encodeURIComponent(machineCollectionUri)}`)
        .expect(200);
      
      expect(mockMaasClient.getMachines).toHaveBeenCalledTimes(1);
      
      // Second request should use cache
      await request(app)
        .get(`/mcp/${serverName}/resources/${encodeURIComponent(machineCollectionUri)}`)
        .expect(200);
      
      // MAAS API should not be called again
      expect(mockMaasClient.getMachines).toHaveBeenCalledTimes(1);
    });

    it('should not cache responses when caching is disabled', async () => {
      // Setup server with caching disabled
      setupServer({
        cacheEnabled: false,
        cacheStrategy: 'time-based',
        cacheMaxSize: 1000,
        cacheMaxAge: 300,
      });
      
      // First request should call MAAS API
      await request(app)
        .get(`/mcp/${serverName}/resources/${encodeURIComponent(machineCollectionUri)}`)
        .expect(200);
      
      expect(mockMaasClient.getMachines).toHaveBeenCalledTimes(1);
      
      // Second request should call MAAS API again
      await request(app)
        .get(`/mcp/${serverName}/resources/${encodeURIComponent(machineCollectionUri)}`)
        .expect(200);
      
      // MAAS API should be called again
      expect(mockMaasClient.getMachines).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cache TTL', () => {
    it('should respect the configured TTL', async () => {
      // Setup server with a short TTL for testing
      setupServer({
        cacheEnabled: true,
        cacheStrategy: 'time-based',
        cacheMaxSize: 1000,
        cacheMaxAge: 1, // 1 second TTL
      });
      
      // First request should call MAAS API
      await request(app)
        .get(`/mcp/${serverName}/resources/${encodeURIComponent(machineCollectionUri)}`)
        .expect(200);
      
      expect(mockMaasClient.getMachines).toHaveBeenCalledTimes(1);
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 seconds
      
      // Second request should call MAAS API again
      await request(app)
        .get(`/mcp/${serverName}/resources/${encodeURIComponent(machineCollectionUri)}`)
        .expect(200);
      
      // MAAS API should be called again
      expect(mockMaasClient.getMachines).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cache Headers', () => {
    it('should include Cache-Control header with max-age', async () => {
      // Setup server with caching enabled
      setupServer({
        cacheEnabled: true,
        cacheStrategy: 'time-based',
        cacheMaxSize: 1000,
        cacheMaxAge: 300, // 5 minutes
      });
      
      // Make a request
      const response = await request(app)
        .get(`/mcp/${serverName}/resources/${encodeURIComponent(machineCollectionUri)}`)
        .expect(200);
      
      // Verify Cache-Control header
      expect(response.headers['cache-control']).toBeDefined();
      expect(response.headers['cache-control']).toContain('max-age=300');
    });

    it('should include Age header on cache hit', async () => {
      // Setup server with caching enabled
      setupServer({
        cacheEnabled: true,
        cacheStrategy: 'time-based',
        cacheMaxSize: 1000,
        cacheMaxAge: 300, // 5 minutes
      });
      
      // First request to populate cache
      await request(app)
        .get(`/mcp/${serverName}/resources/${encodeURIComponent(machineCollectionUri)}`)
        .expect(200);
      
      // Wait a bit to get a non-zero Age
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Second request should use cache and include Age header
      const response = await request(app)
        .get(`/mcp/${serverName}/resources/${encodeURIComponent(machineCollectionUri)}`)
        .expect(200);
      
      // Verify Age header
      expect(response.headers['age']).toBeDefined();
      expect(parseInt(response.headers['age'])).toBeGreaterThan(0);
    });

    it('should not include cache headers when caching is disabled', async () => {
      // Setup server with caching disabled
      setupServer({
        cacheEnabled: false,
        cacheStrategy: 'time-based',
        cacheMaxSize: 1000,
        cacheMaxAge: 300,
      });
      
      // Make a request
      const response = await request(app)
        .get(`/mcp/${serverName}/resources/${encodeURIComponent(machineCollectionUri)}`)
        .expect(200);
      
      // Verify no Cache-Control header
      expect(response.headers['cache-control']).toBeUndefined();
    });
  });

  describe('Resource-Specific TTL', () => {
    it('should respect resource-specific TTL', async () => {
      // Setup server with resource-specific TTL
      setupServer({
        cacheEnabled: true,
        cacheStrategy: 'time-based',
        cacheMaxSize: 1000,
        cacheMaxAge: 300, // 5 minutes default
        cacheResourceSpecificTTL: {
          'Machine': 1, // 1 second for Machine resources
        },
      });
      
      // First request should call MAAS API
      await request(app)
        .get(`/mcp/${serverName}/resources/${encodeURIComponent(machineCollectionUri)}`)
        .expect(200);
      
      expect(mockMaasClient.getMachines).toHaveBeenCalledTimes(1);
      
      // Wait for resource-specific TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 seconds
      
      // Second request should call MAAS API again
      await request(app)
        .get(`/mcp/${serverName}/resources/${encodeURIComponent(machineCollectionUri)}`)
        .expect(200);
      
      // MAAS API should be called again
      expect(mockMaasClient.getMachines).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cache Size Limit', () => {
    it('should respect the configured max size', async () => {
      // Setup server with a small max size
      setupServer({
        cacheEnabled: true,
        cacheStrategy: 'lru', // LRU for predictable eviction
        cacheMaxSize: 1, // Only 1 item in cache
        cacheMaxAge: 300,
      });
      
      // First request for machines collection
      await request(app)
        .get(`/mcp/${serverName}/resources/${encodeURIComponent(machineCollectionUri)}`)
        .expect(200);
      
      expect(mockMaasClient.getMachines).toHaveBeenCalledTimes(1);
      
      // Request for a different resource to evict the machines collection
      const differentUri = 'maas://tags';
      (mockMaasClient.getTags as jest.Mock).mockResolvedValue([{ name: 'tag1' }]);
      
      await request(app)
        .get(`/mcp/${serverName}/resources/${encodeURIComponent(differentUri)}`)
        .expect(200);
      
      // Request for machines again should call MAAS API again
      await request(app)
        .get(`/mcp/${serverName}/resources/${encodeURIComponent(machineCollectionUri)}`)
        .expect(200);
      
      // MAAS API should be called again for machines
      expect(mockMaasClient.getMachines).toHaveBeenCalledTimes(2);
    });
  });
});