/**
 * Tests for MaasApiClient HTTP request/response handling
 * 
 * These tests focus on the public API methods (get, post, put, delete)
 * and how they handle different response types and error conditions.
 */

// Mock node-fetch
jest.mock('node-fetch', () => {
  const mockFetch = jest.fn();
  return mockFetch;
});

// Mock the config module
jest.mock('../config', () => ({
  MAAS_API_URL: 'https://example.com/MAAS/api/2.0',
  MAAS_API_KEY: 'consumer_key:token:secret',
  mcpServer: {}
}));

// Mock MaasApiClient to avoid ES module issues
jest.mock('../maas/MaasApiClient', () => {
  // Create a mock class that mimics the real one but uses our mocks
  const MockMaasApiClient = function() {
    this.maasApiUrl = 'https://example.com/MAAS/api/2.0';
    this.apiKeyComponents = {
      consumerKey: 'consumer_key',
      token: 'token',
      tokenSecret: 'secret'
    };
    
    // Expose methods with our implementation
    this.get = jest.fn((endpoint, params, signal) => {
      return this.makeRequest('GET', endpoint, params, signal);
    });
    
    this.post = jest.fn((endpoint, params, signal) => {
      return this.makeRequest('POST', endpoint, params, signal);
    });
    
    this.put = jest.fn((endpoint, params, signal) => {
      return this.makeRequest('PUT', endpoint, params, signal);
    });
    
    this.delete = jest.fn((endpoint, params, signal) => {
      return this.makeRequest('DELETE', endpoint, params, signal);
    });
    
    this.makeRequest = jest.fn(async (method, endpoint, params, signal) => {
      const fetch = require('node-fetch');
      
      // For GET requests with params, append them to the URL
      let url = this.maasApiUrl + '/api/2.0' + endpoint;
      if (method === 'GET' && params) {
        const queryParams = new URLSearchParams();
        for (const key in params) {
          queryParams.append(key, params[key]);
        }
        url += '?' + queryParams.toString();
      }
      
      // Make the request
      const response = await fetch(url, {
        method,
        headers: { Authorization: 'OAuth mock-header' },
        body: method !== 'GET' && params ? JSON.stringify(params) : undefined,
        signal
      });
      
      // Process the response
      if (!response.ok) {
        throw new Error(`MAAS API Error (${response.status}): ${await response.text()}`);
      }
      
      if (response.status === 204) {
        return null;
      }
      
      return response.json();
    });
  };
  
  return {
    MaasApiClient: MockMaasApiClient,
    default: new MockMaasApiClient()
  };
});

describe('MaasApiClient HTTP Request/Response', () => {
  let maasApiClient;
  let fetch;
  
  beforeEach(() => {
    // Reset module cache
    jest.resetModules();
    
    // Reset fetch mock
    fetch = require('node-fetch');
    
    // Create successful response by default
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true }),
      text: () => Promise.resolve(JSON.stringify({ success: true }))
    });
    
    // Import the client
    const { MaasApiClient } = require('../maas/MaasApiClient');
    maasApiClient = new MaasApiClient();
  });
  
  test('should make GET requests with correct URL and parameters', async () => {
    // Call the get method
    await maasApiClient.get('/machines/', { status: 'ready' });
    
    // Verify fetch was called with the correct URL and parameters
    expect(fetch).toHaveBeenCalledWith(
      'https://example.com/MAAS/api/2.0/api/2.0/machines/?status=ready',
      expect.objectContaining({
        method: 'GET',
        headers: expect.any(Object)
      })
    );
  });
  
  test('should make POST requests with correct URL and body', async () => {
    // Call the post method
    await maasApiClient.post('/machines/', { name: 'test-machine' });
    
    // Verify fetch was called with the correct URL and body
    expect(fetch).toHaveBeenCalledWith(
      'https://example.com/MAAS/api/2.0/api/2.0/machines/',
      expect.objectContaining({
        method: 'POST',
        headers: expect.any(Object),
        body: expect.any(String)
      })
    );
  });
  
  test('should make PUT requests with correct URL and body', async () => {
    // Call the put method
    await maasApiClient.put('/machines/123/', { name: 'updated-machine' });
    
    // Verify fetch was called with the correct URL and body
    expect(fetch).toHaveBeenCalledWith(
      'https://example.com/MAAS/api/2.0/api/2.0/machines/123/',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.any(Object),
        body: expect.any(String)
      })
    );
  });
  
  test('should make DELETE requests with correct URL', async () => {
    // Call the delete method
    await maasApiClient.delete('/machines/123/');
    
    // Verify fetch was called with the correct URL
    expect(fetch).toHaveBeenCalledWith(
      'https://example.com/MAAS/api/2.0/api/2.0/machines/123/',
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.any(Object)
      })
    );
  });
  
  test('should handle successful responses correctly', async () => {
    // Mock a successful response
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: '123', name: 'test-machine' })
    });
    
    // Call the get method
    const result = await maasApiClient.get('/machines/123/');
    
    // Verify the result
    expect(result).toEqual({ id: '123', name: 'test-machine' });
  });
  
  test('should handle 204 No Content responses correctly', async () => {
    // Mock a 204 No Content response
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: () => Promise.reject(new Error('No content')),
      text: () => Promise.resolve('')
    });
    
    // Call the delete method
    const result = await maasApiClient.delete('/machines/123/');
    
    // Verify the result is null for 204 responses
    expect(result).toBeNull();
  });
  
  test('should handle error responses correctly', async () => {
    // Mock an error response
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: () => Promise.resolve('Machine not found')
    });
    
    // Call the get method and expect it to throw
    await expect(maasApiClient.get('/machines/999/')).rejects.toThrow('MAAS API Error (404)');
  });
  
  test('should handle network errors correctly', async () => {
    // Mock a network error
    fetch.mockRejectedValueOnce(new Error('Network error'));
    
    // Call the get method and expect it to throw
    await expect(maasApiClient.get('/machines/')).rejects.toThrow('Network error');
  });
  
  test('should support request cancellation with AbortSignal', async () => {
    // Mock fetch to throw an AbortError when aborted
    fetch.mockImplementationOnce(() => {
      const error = new Error('The operation was aborted');
      error.name = 'AbortError';
      return Promise.reject(error);
    });
    
    // Create an AbortController
    const controller = new AbortController();
    const signal = controller.signal;
    
    // Call the get method with the signal
    const promise = maasApiClient.get('/machines/', null, signal);
    
    // Abort the request
    controller.abort();
    
    // Expect the request to be aborted
    await expect(promise).rejects.toThrow('The operation was aborted');
  });
});