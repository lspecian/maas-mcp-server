"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Mock dotenv to prevent actual loading of .env file during tests
jest.mock('dotenv', () => ({
    config: jest.fn(),
}));
describe('Config Module', () => {
    // Save original environment variables
    const originalEnv = { ...process.env };
    // Reset environment variables before each test
    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });
    // Restore original environment after all tests
    afterAll(() => {
        process.env = originalEnv;
    });
    test('should load valid configuration', () => {
        // Set valid environment variables
        process.env.MAAS_API_URL = 'https://example.com/MAAS/api/2.0';
        process.env.MAAS_API_KEY = 'consumer_key:consumer_token:secret';
        process.env.PORT = '4000';
        process.env.NODE_ENV = 'production';
        // Import config after setting environment variables
        const config = require('../config');
        // Verify config has the expected properties and types
        expect(config).toEqual({
            MAAS_API_URL: 'https://example.com/MAAS/api/2.0',
            MAAS_API_KEY: 'consumer_key:consumer_token:secret',
            PORT: 4000, // Should be transformed to number
            NODE_ENV: 'production',
        });
    });
    test('should apply default values when environment variables are missing', () => {
        // Set only required environment variables
        process.env.MAAS_API_URL = 'https://example.com/MAAS/api/2.0';
        process.env.MAAS_API_KEY = 'consumer_key:consumer_token:secret';
        // PORT and NODE_ENV are not set
        // Import config after setting environment variables
        const config = require('../config');
        // Verify default values are applied
        expect(config).toEqual({
            MAAS_API_URL: 'https://example.com/MAAS/api/2.0',
            MAAS_API_KEY: 'consumer_key:consumer_token:secret',
            PORT: 3000, // Default value
            NODE_ENV: 'development', // Default value
        });
    });
    test('should throw error for invalid MAAS_API_URL', () => {
        // Set invalid MAAS_API_URL
        process.env.MAAS_API_URL = 'not-a-valid-url';
        process.env.MAAS_API_KEY = 'consumer_key:consumer_token:secret';
        // Expect error when importing config
        expect(() => require('../config')).toThrow();
    });
    test('should throw error for invalid MAAS_API_KEY format', () => {
        // Set invalid MAAS_API_KEY format
        process.env.MAAS_API_URL = 'https://example.com/MAAS/api/2.0';
        process.env.MAAS_API_KEY = 'invalid-format';
        // Expect error when importing config
        expect(() => require('../config')).toThrow();
    });
    test('should throw error for invalid PORT', () => {
        // Set invalid PORT
        process.env.MAAS_API_URL = 'https://example.com/MAAS/api/2.0';
        process.env.MAAS_API_KEY = 'consumer_key:consumer_token:secret';
        process.env.PORT = 'not-a-number';
        // Expect error when importing config
        expect(() => require('../config')).toThrow();
    });
    test('should throw error for invalid NODE_ENV', () => {
        // Set invalid NODE_ENV
        process.env.MAAS_API_URL = 'https://example.com/MAAS/api/2.0';
        process.env.MAAS_API_KEY = 'consumer_key:consumer_token:secret';
        process.env.NODE_ENV = 'invalid-env';
        // Expect error when importing config
        expect(() => require('../config')).toThrow();
    });
});
