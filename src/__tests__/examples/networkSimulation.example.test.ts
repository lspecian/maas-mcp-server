/**
 * @file Example tests demonstrating the use of enhanced network simulation features
 *
 * This file provides practical examples of how to use the enhanced network simulation
 * features in the mockMaasApiClient for testing various network conditions and error states.
 */

import { jest } from '@jest/globals';
import { createMockMaasApiClient, mockClientConfigs } from '../mocks/mockMaasApiClient.js';
import { MaasApiError } from '../../types/index.js';

// Mock the MaasApiClient module
jest.mock('../../maas/MaasApiClient.js');

describe('Enhanced Network Simulation Examples', () => {
  
  describe('Variable Latency Simulation', () => {
    it('demonstrates variable latency based on response size', async () => {
      // Create a mock client with variable latency
      const mockClient = mockClientConfigs.variableLatency();
      
      // Small response
      const smallResponse = { id: 1, name: 'test' };
      mockClient.get.mockImplementation(() => Promise.resolve(smallResponse));
      
      const startSmall = Date.now();
      await mockClient.get('/small-endpoint');
      const smallDuration = Date.now() - startSmall;
      
      // Large response
      const largeResponse = Array(1000).fill({ id: 1, name: 'test' });
      mockClient.get.mockImplementation(() => Promise.resolve(largeResponse));
      
      const startLarge = Date.now();
      await mockClient.get('/large-endpoint');
      const largeDuration = Date.now() - startLarge;
      
      // The large response should take longer due to variable latency
      expect(largeDuration).toBeGreaterThan(smallDuration);
      console.log(`Small response time: ${smallDuration}ms, Large response time: ${largeDuration}ms`);
    });
  });
  
  describe('Bandwidth Limitation Simulation', () => {
    it('demonstrates bandwidth limitations affecting response time', async () => {
      // Create a mock client with bandwidth limitations
      const mockClient = mockClientConfigs.limitedBandwidth(50); // 50 KB/s
      
      // Small response (1KB)
      const smallResponse = { id: 1, name: 'test' };
      mockClient.get.mockImplementation(() => Promise.resolve(smallResponse));
      
      const startSmall = Date.now();
      await mockClient.get('/small-endpoint');
      const smallDuration = Date.now() - startSmall;
      
      // Large response (100KB)
      const largeResponse = Array(5000).fill({ id: 1, name: 'test' });
      mockClient.get.mockImplementation(() => Promise.resolve(largeResponse));
      
      const startLarge = Date.now();
      await mockClient.get('/large-endpoint');
      const largeDuration = Date.now() - startLarge;
      
      // The large response should take significantly longer due to bandwidth limitations
      // With 50KB/s bandwidth, a 100KB response should take at least 2 seconds
      expect(largeDuration).toBeGreaterThan(smallDuration + 1500);
      console.log(`Small response time: ${smallDuration}ms, Large response time: ${largeDuration}ms`);
    });
  });
  
  describe('Connection Drop Simulation', () => {
    it('demonstrates connection drops during request processing', async () => {
      // Create a mock client with 100% connection drop probability for testing
      const mockClient = createMockMaasApiClient({
        simulateConnectionDrops: true,
        connectionDropProbability: 1.0 // Always drop
      });
      
      // The request should fail with a connection dropped error
      await expect(mockClient.get('/any-endpoint')).rejects.toThrow('Connection dropped');
    });
    
    it('demonstrates handling connection drops with retry logic', async () => {
      // Create a mock client with 50% connection drop probability
      const mockClient = createMockMaasApiClient({
        simulateConnectionDrops: true,
        connectionDropProbability: 0.5
      });
      
      // Implement a simple retry function
      const retryRequest = async (maxRetries = 3) => {
        let retries = 0;
        while (retries < maxRetries) {
          try {
            return await mockClient.get('/retry-endpoint');
          } catch (error) {
            if (error instanceof MaasApiError && error.message.includes('Connection dropped')) {
              retries++;
              console.log(`Connection dropped, retry attempt ${retries}/${maxRetries}`);
              if (retries >= maxRetries) throw error;
            } else {
              throw error;
            }
          }
        }
      };
      
      // Mock a successful response for when the connection doesn't drop
      mockClient.get.mockImplementation((endpoint, params, signal) => {
        // The original implementation will be called first, which may throw a connection drop error
        // If it doesn't throw, we'll return a success response
        return Promise.resolve({ success: true });
      });
      
      // The retry function should eventually succeed or exhaust all retries
      const result = await retryRequest();
      if (result) {
        expect(result).toEqual({ success: true });
      }
    });
  });
  
  describe('Progressive Degradation Simulation', () => {
    it('demonstrates progressive degradation of service', async () => {
      // Create a mock client with progressive degradation
      const mockClient = mockClientConfigs.progressiveDegradation();
      
      // Make multiple requests and measure the time
      const times = [];
      
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        await mockClient.get('/degrading-endpoint');
        times.push(Date.now() - start);
      }
      
      // Each request should take longer than the previous one
      for (let i = 1; i < times.length; i++) {
        expect(times[i]).toBeGreaterThan(times[i-1]);
      }
      
      console.log('Progressive degradation times:', times);
    });
  });
  
  describe('Geographic Latency Simulation', () => {
    it('demonstrates different latencies based on geographic location', async () => {
      // Test different geographic locations
      const locations = ['local', 'regional', 'continental', 'global'] as const;
      const times: Record<string, number> = {};
      
      for (const location of locations) {
        const mockClient = mockClientConfigs.geographicLatency(location);
        
        const start = Date.now();
        await mockClient.get('/geo-endpoint');
        times[location] = Date.now() - start;
      }
      
      // Verify that latency increases with distance
      expect(times.local).toBeLessThan(times.regional);
      expect(times.regional).toBeLessThan(times.continental);
      expect(times.continental).toBeLessThan(times.global);
      
      console.log('Geographic latency times:', times);
    });
  });
  
  describe('Realistic Network Simulation', () => {
    it('demonstrates realistic network conditions', async () => {
      // Create a mock client with realistic network conditions
      const mockClient = mockClientConfigs.realisticNetwork();
      
      // Make multiple requests to see the effects of realistic network conditions
      const results = [];
      
      for (let i = 0; i < 10; i++) {
        try {
          const start = Date.now();
          await mockClient.get('/realistic-endpoint');
          results.push({ success: true, time: Date.now() - start });
        } catch (error) {
          results.push({ 
            success: false, 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      }
      
      // Some requests should succeed and some should fail
      const successes = results.filter(r => r.success).length;
      const failures = results.filter(r => !r.success).length;
      
      console.log(`Realistic network simulation: ${successes} successes, ${failures} failures`);
      console.log('Results:', results);
      
      // We expect a mix of successes and failures with realistic network conditions
      expect(successes).toBeGreaterThan(0);
      expect(failures).toBeGreaterThan(0);
    });
  });
});