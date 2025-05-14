"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
describe('Configuration Module', () => {
    const originalEnv = process.env;
    beforeEach(() => {
        jest.resetModules(); // Reset modules to re-evaluate config.ts with new env vars
        process.env = { ...originalEnv }; // Restore original process.env
    });
    afterAll(() => {
        process.env = originalEnv; // Restore original process.env after all tests
    });
    describe('Valid Configuration', () => {
        it('should load valid configuration from environment variables', async () => {
            process.env.MAAS_API_URL = 'http://valid.maas.api';
            process.env.MAAS_API_KEY = 'consumer:token:secret';
            process.env.MCP_PORT = '8080';
            process.env.NODE_ENV = 'test';
            process.env.LOG_LEVEL = 'debug';
            const config = (await import('../config.js')).default;
            expect(config.maasApiUrl).toBe('http://valid.maas.api');
            expect(config.maasApiKey).toBe('consumer:token:secret');
            expect(config.mcpPort).toBe(8080);
            expect(config.nodeEnv).toBe('test');
            expect(config.logLevel).toBe('debug');
        });
        it('should load valid configuration with only required variables (defaults applied)', async () => {
            process.env.MAAS_API_URL = 'https://another.valid.maas.api/v1';
            process.env.MAAS_API_KEY = 'key1:key2:key3';
            // MCP_PORT, NODE_ENV, LOG_LEVEL will use defaults
            const config = (await import('../config.js')).default;
            expect(config.maasApiUrl).toBe('https://another.valid.maas.api/v1');
            expect(config.maasApiKey).toBe('key1:key2:key3');
            expect(config.mcpPort).toBe(3000); // Default
            expect(config.nodeEnv).toBe('development'); // Default
            expect(config.logLevel).toBe('info'); // Default
        });
    });
    describe('Default Values', () => {
        it('should use default MCP_PORT if not provided', async () => {
            process.env.MAAS_API_URL = 'http://maas.example.com';
            process.env.MAAS_API_KEY = 'c:t:s';
            delete process.env.MCP_PORT;
            const config = (await import('../config.js')).default;
            expect(config.mcpPort).toBe(3000);
        });
        it('should use default NODE_ENV if not provided', async () => {
            process.env.MAAS_API_URL = 'http://maas.example.com';
            process.env.MAAS_API_KEY = 'c:t:s';
            delete process.env.NODE_ENV;
            const config = (await import('../config.js')).default;
            expect(config.nodeEnv).toBe('development');
        });
        it('should use default LOG_LEVEL if not provided', async () => {
            process.env.MAAS_API_URL = 'http://maas.example.com';
            process.env.MAAS_API_KEY = 'c:t:s';
            delete process.env.LOG_LEVEL;
            const config = (await import('../config.js')).default;
            expect(config.logLevel).toBe('info');
        });
    });
    describe('Invalid Configuration - Missing Required Variables', () => {
        it('should throw ZodError if MAAS_API_URL is missing', async () => {
            delete process.env.MAAS_API_URL;
            process.env.MAAS_API_KEY = 'c:t:s';
            await expect(async () => (await import('../config.js')).default).rejects.toThrow(zod_1.ZodError);
            try {
                (await import('../config.js')).default;
            }
            catch (e) {
                expect(e.errors[0].path).toEqual(['maasApiUrl']);
                expect(e.errors[0].message).toContain('MAAS_API_URL must be a valid URL'); // Zod's default for string() + url() when undefined
            }
        });
        it('should throw ZodError if MAAS_API_KEY is missing', async () => {
            process.env.MAAS_API_URL = 'http://maas.example.com';
            delete process.env.MAAS_API_KEY;
            await expect(async () => (await import('../config.js')).default).rejects.toThrow(zod_1.ZodError);
            try {
                (await import('../config.js')).default;
            }
            catch (e) {
                expect(e.errors[0].path).toEqual(['maasApiKey']);
                expect(e.errors[0].message).toContain('MAAS_API_KEY must be in format consumer_key:token:secret'); // Zod's default for string() when undefined
            }
        });
    });
    describe('Invalid Configuration - Invalid Format/Values', () => {
        it('should throw ZodError for invalid MAAS_API_URL format', async () => {
            process.env.MAAS_API_URL = 'not-a-url';
            process.env.MAAS_API_KEY = 'c:t:s';
            await expect(async () => (await import('../config.js')).default).rejects.toThrow(zod_1.ZodError);
            try {
                (await import('../config.js')).default;
            }
            catch (e) {
                expect(e.errors[0].path).toEqual(['maasApiUrl']);
                expect(e.errors[0].message).toBe('MAAS_API_URL must be a valid URL');
            }
        });
        it('should throw ZodError for invalid MAAS_API_KEY format (too few parts)', async () => {
            process.env.MAAS_API_URL = 'http://maas.example.com';
            process.env.MAAS_API_KEY = 'consumer:token';
            await expect(async () => (await import('../config.js')).default).rejects.toThrow(zod_1.ZodError);
            try {
                (await import('../config.js')).default;
            }
            catch (e) {
                expect(e.errors[0].path).toEqual(['maasApiKey']);
                expect(e.errors[0].message).toBe('MAAS_API_KEY must be in format consumer_key:token:secret');
            }
        });
        it('should throw ZodError for invalid MAAS_API_KEY format (empty parts)', async () => {
            process.env.MAAS_API_URL = 'http://maas.example.com';
            process.env.MAAS_API_KEY = '::'; // Empty parts, but still 3 parts. Regex should catch this.
            await expect(async () => (await import('../config.js')).default).rejects.toThrow(zod_1.ZodError);
            try {
                (await import('../config.js')).default;
            }
            catch (e) {
                expect(e.errors[0].path).toEqual(['maasApiKey']);
                expect(e.errors[0].message).toBe('MAAS_API_KEY must be in format consumer_key:token:secret');
            }
        });
        it('should throw ZodError for invalid MCP_PORT (not a number)', async () => {
            process.env.MAAS_API_URL = 'http://maas.example.com';
            process.env.MAAS_API_KEY = 'c:t:s';
            process.env.MCP_PORT = 'not-a-port';
            await expect(async () => (await import('../config.js')).default).rejects.toThrow(zod_1.ZodError);
            try {
                (await import('../config.js')).default;
            }
            catch (e) {
                expect(e.errors[0].path).toEqual(['mcpPort']);
                expect(e.errors[0].message).toBe('Expected number, received nan');
            }
        });
        it('should throw ZodError for invalid MCP_PORT (negative)', async () => {
            process.env.MAAS_API_URL = 'http://maas.example.com';
            process.env.MAAS_API_KEY = 'c:t:s';
            process.env.MCP_PORT = '-100';
            await expect(async () => (await import('../config.js')).default).rejects.toThrow(zod_1.ZodError);
            try {
                (await import('../config.js')).default;
            }
            catch (e) {
                expect(e.errors[0].path).toEqual(['mcpPort']);
                expect(e.errors[0].message).toBe('Number must be greater than 0');
            }
        });
        it('should throw ZodError for invalid MCP_PORT (zero)', async () => {
            process.env.MAAS_API_URL = 'http://maas.example.com';
            process.env.MAAS_API_KEY = 'c:t:s';
            process.env.MCP_PORT = '0';
            await expect(async () => (await import('../config.js')).default).rejects.toThrow(zod_1.ZodError);
            try {
                (await import('../config.js')).default;
            }
            catch (e) {
                expect(e.errors[0].path).toEqual(['mcpPort']);
                expect(e.errors[0].message).toBe('Number must be greater than 0');
            }
        });
        it('should throw ZodError for invalid MCP_PORT (float)', async () => {
            process.env.MAAS_API_URL = 'http://maas.example.com';
            process.env.MAAS_API_KEY = 'c:t:s';
            process.env.MCP_PORT = '3000.5';
            await expect(async () => (await import('../config.js')).default).rejects.toThrow(zod_1.ZodError);
            try {
                (await import('../config.js')).default;
            }
            catch (e) {
                expect(e.errors[0].path).toEqual(['mcpPort']);
                expect(e.errors[0].message).toBe('Expected an integer');
            }
        });
        it('should throw ZodError for invalid NODE_ENV', async () => {
            process.env.MAAS_API_URL = 'http://maas.example.com';
            process.env.MAAS_API_KEY = 'c:t:s';
            process.env.NODE_ENV = 'invalid_env';
            await expect(async () => (await import('../config.js')).default).rejects.toThrow(zod_1.ZodError);
            try {
                (await import('../config.js')).default;
            }
            catch (e) {
                expect(e.errors[0].path).toEqual(['nodeEnv']);
                expect(e.errors[0].message).toContain("Invalid enum value. Expected 'development' | 'production' | 'test', received 'invalid_env'");
            }
        });
        it('should throw ZodError for invalid LOG_LEVEL', async () => {
            process.env.MAAS_API_URL = 'http://maas.example.com';
            process.env.MAAS_API_KEY = 'c:t:s';
            process.env.LOG_LEVEL = 'invalid_level';
            await expect(async () => (await import('../config.js')).default).rejects.toThrow(zod_1.ZodError);
            try {
                (await import('../config.js')).default;
            }
            catch (e) {
                expect(e.errors[0].path).toEqual(['logLevel']);
                expect(e.errors[0].message).toContain("Invalid enum value. Expected 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal', received 'invalid_level'");
            }
        });
    });
});
