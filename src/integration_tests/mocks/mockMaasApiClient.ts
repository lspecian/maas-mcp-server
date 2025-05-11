/**
 * Mock MAAS API Client for Integration Tests
 * 
 * This module provides a configurable mock implementation of the MaasApiClient
 * specifically designed for integration tests. It extends the unit test mock
 * with additional functionality for simulating realistic API behavior.
 */

import { createMockMaasApiClient as createBaseMockClient } from '../../__tests__/mocks/mockMaasApiClient.js';
import { MaasApiClient } from '../../maas/MaasApiClient.js';
import { MaasApiError } from '../../types/maas.js';

// Import fixtures
import { machines, readyMachine, deployedMachine } from '../../__tests__/fixtures/machineResponses.js';

/**
 * Extended mock data for integration tests
 */
export const mockData = {
  // Machine data
  machines,
  readyMachine,
  deployedMachine,
  
  // Network data
  subnets: [
    {
      id: 1,
      name: 'subnet-1',
      cidr: '192.168.1.0/24',
      vlan: { id: 1, name: 'vlan-1', fabric: 'fabric-1' },
      space: 'default',
      gateway_ip: '192.168.1.1',
      dns_servers: ['8.8.8.8', '8.8.4.4'],
      managed: true
    },
    {
      id: 2,
      name: 'subnet-2',
      cidr: '10.0.0.0/24',
      vlan: { id: 2, name: 'vlan-2', fabric: 'fabric-1' },
      space: 'default',
      gateway_ip: '10.0.0.1',
      dns_servers: ['8.8.8.8', '8.8.4.4'],
      managed: true
    }
  ],
  
  // Zone data
  zones: [
    { id: 1, name: 'default', description: 'Default zone' },
    { id: 2, name: 'zone-1', description: 'Zone 1' },
    { id: 3, name: 'zone-2', description: 'Zone 2' }
  ],
  
  // Tag data
  tags: [
    { id: 1, name: 'tag1', definition: '', comment: 'Test tag 1', kernel_opts: '' },
    { id: 2, name: 'tag2', definition: '', comment: 'Test tag 2', kernel_opts: '' },
    { id: 3, name: 'tag3', definition: '', comment: 'Test tag 3', kernel_opts: '' }
  ],
  
  // Domain data
  domains: [
    { id: 1, name: 'maas', resource_record_count: 10, ttl: 3600, authoritative: true },
    { id: 2, name: 'example.com', resource_record_count: 5, ttl: 3600, authoritative: true }
  ],
  
  // Device data
  devices: [
    { id: 1, system_id: 'device1', hostname: 'device-1', domain: { id: 1, name: 'maas' } },
    { id: 2, system_id: 'device2', hostname: 'device-2', domain: { id: 1, name: 'maas' } }
  ]
};

/**
 * Configuration options for the integration test mock MAAS API client
 */
export interface IntegrationMockMaasApiClientOptions {
  /**
   * Whether to simulate network delays
   */
  simulateNetworkDelay?: boolean;
  
  /**
   * Milliseconds to delay responses
   */
  networkDelayMs?: number;
  
  /**
   * Whether to simulate random errors
   */
  simulateRandomErrors?: boolean;
  
  /**
   * Probability of a random error (0-1)
   */
  errorProbability?: number;
  
  /**
   * Custom response handlers for specific endpoints
   */
  customHandlers?: Record<string, (params: any, signal?: AbortSignal) => Promise<any>>;
}

/**
 * Create a mock MAAS API client for integration tests
 * 
 * @param options Configuration options
 * @returns Mock MAAS API client
 */
export function createMockMaasApiClient(
  options: IntegrationMockMaasApiClientOptions = {}
): MaasApiClient {
  const {
    simulateNetworkDelay = false,
    networkDelayMs = 100,
    simulateRandomErrors = false,
    errorProbability = 0.1,
    customHandlers = {}
  } = options;
  
  // Create the base mock client
  const mockClient = createBaseMockClient() as any;
  
  // Add delay function
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  // Add random error function
  const maybeThrowError = () => {
    if (simulateRandomErrors && Math.random() < errorProbability) {
      throw new MaasApiError('Simulated random error', 500);
    }
  };
  
  // Override the get method
  const originalGet = mockClient.get;
  mockClient.get = async (endpoint: string, params?: any, signal?: AbortSignal) => {
    // Check for abort signal
    if (signal?.aborted) {
      throw new Error('Request aborted');
    }
    
    // Check for custom handler
    if (customHandlers[endpoint]) {
      return customHandlers[endpoint](params, signal);
    }
    
    // Add network delay if configured
    if (simulateNetworkDelay) {
      await delay(networkDelayMs);
    }
    
    // Maybe throw a random error
    maybeThrowError();
    
    // Handle specific endpoints
    if (endpoint === '/machines/') {
      return mockData.machines;
    } else if (endpoint.startsWith('/machines/') && endpoint.length > 10) {
      const machineId = endpoint.split('/')[2];
      const machine = mockData.machines.find(m => m.system_id === machineId);
      if (!machine) {
        throw new MaasApiError('Machine not found', 404);
      }
      return machine;
    } else if (endpoint === '/subnets/') {
      return mockData.subnets;
    } else if (endpoint === '/zones/') {
      return mockData.zones;
    } else if (endpoint === '/tags/') {
      return mockData.tags;
    } else if (endpoint === '/domains/') {
      return mockData.domains;
    } else if (endpoint === '/devices/') {
      return mockData.devices;
    }
    
    // Fall back to original implementation
    return originalGet(endpoint, params, signal);
  };
  
  // Override the post method
  const originalPost = mockClient.post;
  mockClient.post = async (endpoint: string, params?: any, signal?: AbortSignal) => {
    // Check for abort signal
    if (signal?.aborted) {
      throw new Error('Request aborted');
    }
    
    // Check for custom handler
    if (customHandlers[endpoint]) {
      return customHandlers[endpoint](params, signal);
    }
    
    // Add network delay if configured
    if (simulateNetworkDelay) {
      await delay(networkDelayMs);
    }
    
    // Maybe throw a random error
    maybeThrowError();
    
    // Handle specific endpoints
    if (endpoint.startsWith('/machines/') && params?.op === 'deploy') {
      return { system_id: endpoint.split('/')[2], status: 'Deploying' };
    } else if (endpoint.startsWith('/machines/') && params?.op === 'commission') {
      return { system_id: endpoint.split('/')[2], status: 'Commissioning' };
    } else if (endpoint === '/tags/') {
      return { id: mockData.tags.length + 1, name: params.name, comment: params.comment || '' };
    }
    
    // Fall back to original implementation
    return originalPost(endpoint, params, signal);
  };
  
  // Override the put method
  const originalPut = mockClient.put;
  mockClient.put = async (endpoint: string, params?: any, signal?: AbortSignal) => {
    // Check for abort signal
    if (signal?.aborted) {
      throw new Error('Request aborted');
    }
    
    // Check for custom handler
    if (customHandlers[endpoint]) {
      return customHandlers[endpoint](params, signal);
    }
    
    // Add network delay if configured
    if (simulateNetworkDelay) {
      await delay(networkDelayMs);
    }
    
    // Maybe throw a random error
    maybeThrowError();
    
    // Handle specific endpoints
    if (endpoint.startsWith('/machines/')) {
      const machineId = endpoint.split('/')[2];
      const machine = mockData.machines.find(m => m.system_id === machineId);
      if (!machine) {
        throw new MaasApiError('Machine not found', 404);
      }
      return { ...machine, ...params };
    }
    
    // Fall back to original implementation
    return originalPut(endpoint, params, signal);
  };
  
  // Override the delete method
  const originalDelete = mockClient.delete;
  mockClient.delete = async (endpoint: string, params?: any, signal?: AbortSignal) => {
    // Check for abort signal
    if (signal?.aborted) {
      throw new Error('Request aborted');
    }
    
    // Check for custom handler
    if (customHandlers[endpoint]) {
      return customHandlers[endpoint](params, signal);
    }
    
    // Add network delay if configured
    if (simulateNetworkDelay) {
      await delay(networkDelayMs);
    }
    
    // Maybe throw a random error
    maybeThrowError();
    
    // Handle specific endpoints
    if (endpoint.startsWith('/machines/')) {
      return { status: 'success' };
    }
    
    // Fall back to original implementation
    return originalDelete(endpoint, params, signal);
  };
  
  return mockClient;
}

/**
 * Predefined mock client configurations for common testing scenarios
 */
export const mockClientConfigs = {
  /**
   * Default configuration with realistic behavior
   */
  default: () => createMockMaasApiClient({
    simulateNetworkDelay: true,
    networkDelayMs: 100
  }),
  
  /**
   * Configuration that simulates slow network
   */
  slow: () => createMockMaasApiClient({
    simulateNetworkDelay: true,
    networkDelayMs: 1000
  }),
  
  /**
   * Configuration that simulates random errors
   */
  flaky: () => createMockMaasApiClient({
    simulateNetworkDelay: true,
    simulateRandomErrors: true,
    errorProbability: 0.3
  }),
  
  /**
   * Configuration for testing error handling
   */
  alwaysError: () => {
    const mockClient = createBaseMockClient({
      errorResponse: new MaasApiError('Simulated error', 500)
    });
    return mockClient;
  }
};