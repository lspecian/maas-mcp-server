"use strict";
/**
 * Unit tests for the ExampleModule
 *
 * This file demonstrates the standardized test structure and naming conventions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
// 1. Imports
const ExampleModule_1 = require("../../example/ExampleModule");
const errors_1 = require("../../utils/errors");
// 2. Mocks (if needed)
jest.mock('../../utils/logger', () => ({
    Logger: jest.fn().mockImplementation(() => ({
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    }))
}));
// 3. Test fixtures and setup
const sampleData = {
    id: 'test-id',
    name: 'Test Name',
    properties: {
        key1: 'value1',
        key2: 'value2'
    }
};
/**
 * Helper function to create an instance of ExampleClass with default options
 */
function createExampleInstance(customOptions = {}) {
    const defaultOptions = {
        timeout: 1000,
        retries: 3,
        logger: new (jest.requireMock('../../utils/logger').Logger)()
    };
    return new ExampleModule_1.ExampleClass({
        ...defaultOptions,
        ...customOptions
    });
}
// 4. Test suite
describe('ExampleModule', () => {
    // 5. Setup and teardown
    let exampleInstance;
    beforeAll(() => {
        // Setup that runs once before all tests
        // Example: Initialize shared resources
    });
    beforeEach(() => {
        // Setup that runs before each test
        exampleInstance = createExampleInstance();
        jest.clearAllMocks();
    });
    afterEach(() => {
        // Cleanup that runs after each test
        // Example: Reset state, clear mocks
    });
    afterAll(() => {
        // Cleanup that runs once after all tests
        // Example: Release shared resources
    });
    // 6. Test cases
    describe('constructor', () => {
        test('should initialize with default options when no options are provided', () => {
            // Arrange
            const defaultInstance = new ExampleModule_1.ExampleClass();
            // Assert
            expect(defaultInstance.getTimeout()).toBe(5000); // Default timeout
            expect(defaultInstance.getRetries()).toBe(3); // Default retries
            expect(defaultInstance.getLogger()).toBeDefined();
        });
        test('should initialize with custom options when options are provided', () => {
            // Arrange
            const customOptions = {
                timeout: 2000,
                retries: 5
            };
            // Act
            const customInstance = createExampleInstance(customOptions);
            // Assert
            expect(customInstance.getTimeout()).toBe(customOptions.timeout);
            expect(customInstance.getRetries()).toBe(customOptions.retries);
        });
        test('should throw an error when invalid options are provided', () => {
            // Arrange
            const invalidOptions = {
                timeout: -1000 // Invalid: negative timeout
            };
            // Act & Assert
            expect(() => createExampleInstance(invalidOptions)).toThrow(errors_1.SomeError);
            expect(() => createExampleInstance(invalidOptions)).toThrow('Timeout must be a positive number');
        });
    });
    describe('processData', () => {
        test('should successfully process valid data', async () => {
            // Arrange
            const spy = jest.spyOn(exampleInstance, 'validateData').mockReturnValue(true);
            // Act
            const result = await exampleInstance.processData(sampleData);
            // Assert
            expect(result).toEqual({
                id: sampleData.id,
                processed: true,
                timestamp: expect.any(Number)
            });
            expect(spy).toHaveBeenCalledWith(sampleData);
            expect(exampleInstance.getLogger().info).toHaveBeenCalled();
        });
        test('should throw an error when processing invalid data', async () => {
            // Arrange
            const invalidData = { ...sampleData, id: null };
            jest.spyOn(exampleInstance, 'validateData').mockReturnValue(false);
            // Act & Assert
            await expect(exampleInstance.processData(invalidData)).rejects.toThrow(errors_1.SomeError);
            expect(exampleInstance.getLogger().error).toHaveBeenCalled();
        });
        describe('with network errors', () => {
            test('should retry when a temporary error occurs', async () => {
                // Arrange
                const tempError = new Error('Temporary network error');
                tempError.name = 'NetworkError';
                jest.spyOn(exampleInstance, 'validateData').mockReturnValue(true);
                jest.spyOn(exampleInstance, 'sendRequest')
                    .mockRejectedValueOnce(tempError)
                    .mockRejectedValueOnce(tempError)
                    .mockResolvedValueOnce({ success: true });
                // Act
                const result = await exampleInstance.processData(sampleData);
                // Assert
                expect(result).toEqual({
                    id: sampleData.id,
                    processed: true,
                    timestamp: expect.any(Number)
                });
                expect(exampleInstance.sendRequest).toHaveBeenCalledTimes(3);
                expect(exampleInstance.getLogger().warn).toHaveBeenCalledTimes(2);
            });
            test('should fail after maximum retries', async () => {
                // Arrange
                const tempError = new Error('Temporary network error');
                tempError.name = 'NetworkError';
                jest.spyOn(exampleInstance, 'validateData').mockReturnValue(true);
                jest.spyOn(exampleInstance, 'sendRequest').mockRejectedValue(tempError);
                // Act & Assert
                await expect(exampleInstance.processData(sampleData)).rejects.toThrow('Maximum retries exceeded');
                expect(exampleInstance.sendRequest).toHaveBeenCalledTimes(exampleInstance.getRetries());
                expect(exampleInstance.getLogger().error).toHaveBeenCalled();
            });
        });
    });
    describe('validateData', () => {
        test('should return true when data is valid', () => {
            // Act
            const result = exampleInstance.validateData(sampleData);
            // Assert
            expect(result).toBe(true);
        });
        test('should return false when data is missing required fields', () => {
            // Arrange
            const invalidData = { name: 'Missing ID' };
            // Act
            const result = exampleInstance.validateData(invalidData);
            // Assert
            expect(result).toBe(false);
        });
        test('should return false when data has invalid field types', () => {
            // Arrange
            const invalidData = {
                ...sampleData,
                properties: 'Not an object' // Should be an object
            };
            // Act
            const result = exampleInstance.validateData(invalidData);
            // Assert
            expect(result).toBe(false);
        });
    });
});
