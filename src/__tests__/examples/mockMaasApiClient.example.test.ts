/**
 * @file Example test demonstrating the use of mockMaasApiClient
 * 
 * This file provides practical examples of how to use the mockMaasApiClient
 * utility in different testing scenarios. It demonstrates various configurations
 * and common patterns for testing components that interact with the MAAS API.
 */

import { jest } from '@jest/globals';
import { createMockMaasApiClient, mockClientConfigs, mockMachines } from '../mocks/index.js';
import { MaasApiError } from '../../types/index.js';

// Mock the MaasApiClient module
jest.mock('../../maas/MaasApiClient.js');

describe('Mock MAAS API Client Usage Examples', () => {
  
  describe('Basic Usage', () => {
    it('demonstrates creating a basic mock client', async () => {
      // Create a mock client with default configuration
      const mockClient = createMockMaasApiClient();
      
      // Use the mock client to make a request
      const result = await mockClient.get('/MAAS/api/2.0/machines/', {});
      
      // Verify the result contains the expected mock data
      expect(result).toEqual(mockMachines);
      expect(mockClient.get).toHaveBeenCalledTimes(1);
      expect(mockClient.get).toHaveBeenCalledWith('/MAAS/api/2.0/machines/', {});
    });
    
    it('demonstrates using predefined configurations', async () => {
      // Create a mock client that returns empty results
      const emptyClient = mockClientConfigs.empty();
      
      // Use the mock client to make a request
      const result = await emptyClient.get('/MAAS/api/2.0/machines/', {});
      
      // Verify the result is an empty array
      expect(result).toEqual([]);
      expect(emptyClient.get).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('Error Handling', () => {
    it('demonstrates handling 404 errors', async () => {
      // Create a mock client that returns 404 errors
      const notFoundClient = mockClientConfigs.notFound();
      
      // Use the mock client and expect it to throw an error
      await expect(
        notFoundClient.get('/MAAS/api/2.0/machines/nonexistent', {})
      ).rejects.toThrow('Resource not found');
      
      expect(notFoundClient.get).toHaveBeenCalledTimes(1);
    });
    
    it('demonstrates handling server errors', async () => {
      // Create a mock client that returns 500 errors
      const errorClient = mockClientConfigs.serverError();
      
      // Use the mock client and expect it to throw an error
      await expect(
        errorClient.post('/MAAS/api/2.0/machines/', { action: 'deploy' })
      ).rejects.toThrow('Internal server error');
      
      expect(errorClient.post).toHaveBeenCalledTimes(1);
    });
    
    it('demonstrates handling timeouts', async () => {
      // Create a mock client that simulates timeouts
      const timeoutClient = mockClientConfigs.timeout();
      
      // Use the mock client and expect it to throw a timeout error
      await expect(
        timeoutClient.get('/MAAS/api/2.0/machines/', {})
      ).rejects.toThrow('Request timed out');
      
      expect(timeoutClient.get).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('Advanced Usage', () => {
    it('demonstrates custom configuration', async () => {
      // Create a mock client with custom configuration
      const customClient = createMockMaasApiClient({
        successResponse: { custom: 'response' },
        simulateNetworkDelay: 100
      });
      
      // Use the mock client to make a request
      const result = await customClient.get('/MAAS/api/2.0/custom', {});
      
      // Verify the result contains the custom response
      expect(result).toEqual({ custom: 'response' });
      expect(customClient.get).toHaveBeenCalledTimes(1);
    });
    
    it('demonstrates handling abort signals', async () => {
      // Create a mock client
      const mockClient = createMockMaasApiClient();
      
      // Create an AbortController and signal
      const controller = new AbortController();
      const signal = controller.signal;
      
      // Abort the request immediately
      controller.abort();
      
      // Use the mock client with the aborted signal
      await expect(
        mockClient.get('/MAAS/api/2.0/machines/', {}, signal)
      ).rejects.toThrow('Request aborted');
      
      expect(mockClient.get).toHaveBeenCalledTimes(1);
      expect(mockClient.get).toHaveBeenCalledWith('/MAAS/api/2.0/machines/', {}, signal);
    });
  });
});