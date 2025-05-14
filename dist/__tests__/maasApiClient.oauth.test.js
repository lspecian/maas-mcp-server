"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Mock node-fetch
jest.mock('node-fetch', () => {
    return jest.fn((url, options) => {
        return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ success: true }),
            text: () => Promise.resolve(JSON.stringify({ success: true }))
        });
    });
});
// Mock crypto.randomBytes
jest.mock('crypto', () => {
    return {
        randomBytes: jest.fn(() => ({
            toString: jest.fn(() => 'test-nonce-value')
        }))
    };
});
// Mock Date.now() to return a fixed timestamp for testing
const originalDateNow = Date.now;
Date.now = jest.fn(() => 1609459200000); // 2021-01-01T00:00:00.000Z
// Mock the config module
jest.mock('../config.js', () => ({
    MAAS_API_URL: 'https://example.com/MAAS/api/2.0',
    MAAS_API_KEY: 'consumer_key:token:secret',
    mcpServer: {}
}));
describe('MaasApiClient OAuth Authentication', () => {
    let maasApiClient;
    let fetch;
    let mockHeaders;
    beforeEach(() => {
        // Reset module cache
        jest.resetModules();
        // Reset fetch mock
        fetch = require('node-fetch');
        fetch.mockClear();
        // Create mock headers
        mockHeaders = {
            set: jest.fn()
        };
        // Mock Headers constructor
        const Headers = require('node-fetch').Headers;
        Headers.prototype.constructor = jest.fn().mockImplementation(() => mockHeaders);
        Headers.prototype.set = mockHeaders.set;
        // Import the client
        const MaasApiClientModule = require('../maas/MaasApiClient');
        maasApiClient = new MaasApiClientModule.MaasApiClient();
    });
    afterEach(() => {
        // Restore original Date.now
        Date.now = originalDateNow;
    });
    test('should construct OAuth header with correct parameters', async () => {
        // Make a request to trigger OAuth header generation
        await maasApiClient.get('/test/');
        // Verify the Authorization header was set
        expect(mockHeaders.set).toHaveBeenCalledWith('Authorization', expect.stringContaining('OAuth '));
        // Get the Authorization header value
        const authHeader = mockHeaders.set.mock.calls.find(call => call[0] === 'Authorization')[1];
        // Verify all required OAuth parameters are present
        expect(authHeader).toContain('oauth_consumer_key="consumer_key"');
        expect(authHeader).toContain('oauth_token="token"');
        expect(authHeader).toContain('oauth_signature_method="PLAINTEXT"');
        expect(authHeader).toContain('oauth_timestamp="1609459200"'); // 2021-01-01T00:00:00Z in seconds
        expect(authHeader).toContain('oauth_nonce="test-nonce-value"');
        expect(authHeader).toContain('oauth_version="1.0"');
        expect(authHeader).toContain('oauth_signature="%26secret"'); // &secret URL-encoded
    });
    test('should properly encode OAuth parameter values', async () => {
        // Override the mock config to use special characters in the API key
        jest.resetModules();
        jest.mock('../config.js', () => ({
            MAAS_API_URL: 'https://example.com/MAAS/api/2.0',
            MAAS_API_KEY: 'consumer+key:token@value:secret&value',
            mcpServer: {}
        }));
        // Reset fetch mock
        fetch = require('node-fetch');
        fetch.mockClear();
        // Create mock headers
        mockHeaders = {
            set: jest.fn()
        };
        // Mock Headers constructor
        const Headers = require('node-fetch').Headers;
        Headers.prototype.constructor = jest.fn().mockImplementation(() => mockHeaders);
        Headers.prototype.set = mockHeaders.set;
        // Import the client with the new config
        const MaasApiClientModule = require('../maas/MaasApiClient');
        maasApiClient = new MaasApiClientModule.MaasApiClient();
        // Make a request to trigger OAuth header generation
        await maasApiClient.get('/test/');
        // Get the Authorization header value
        const authHeader = mockHeaders.set.mock.calls.find(call => call[0] === 'Authorization')[1];
        // Verify special characters are properly encoded
        expect(authHeader).toContain('oauth_consumer_key="consumer%2Bkey"');
        expect(authHeader).toContain('oauth_token="token%40value"');
        expect(authHeader).toContain('oauth_signature="%26secret%26value"');
    });
    test('should throw error for invalid API key format', () => {
        // Override the mock config with an invalid API key
        jest.resetModules();
        jest.mock('../config.js', () => ({
            MAAS_API_URL: 'https://example.com/MAAS/api/2.0',
            MAAS_API_KEY: 'invalid-format',
            mcpServer: {}
        }));
        // Importing the client should throw an error
        expect(() => {
            const MaasApiClientModule = require('../maas/MaasApiClient');
            new MaasApiClientModule.MaasApiClient();
        }).toThrow('Invalid MAAS API key format');
    });
    test('should generate a unique nonce for each request', async () => {
        // Reset the randomBytes mock to track calls
        const crypto = require('crypto');
        crypto.randomBytes.mockClear();
        // Make multiple requests
        await maasApiClient.get('/test/1');
        await maasApiClient.get('/test/2');
        // Verify randomBytes was called for each request
        expect(crypto.randomBytes).toHaveBeenCalledTimes(2);
    });
    test('should generate a new timestamp for each request', async () => {
        // Reset the Date.now mock to track calls
        Date.now = jest.fn(() => 1609459200000); // Initial timestamp
        // Make first request
        await maasApiClient.get('/test/1');
        // Verify the first timestamp
        const firstAuthHeader = mockHeaders.set.mock.calls.find(call => call[0] === 'Authorization')[1];
        expect(firstAuthHeader).toContain('oauth_timestamp="1609459200"');
        // Update the timestamp for the second request
        Date.now = jest.fn(() => 1609459300000); // 100 seconds later
        mockHeaders.set.mockClear();
        // Make second request
        await maasApiClient.get('/test/2');
        // Verify the second timestamp is different
        const secondAuthHeader = mockHeaders.set.mock.calls.find(call => call[0] === 'Authorization')[1];
        expect(secondAuthHeader).toContain('oauth_timestamp="1609459300"');
    });
});
