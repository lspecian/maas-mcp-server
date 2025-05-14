/**
 * Example test file demonstrating how to use the test helpers
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { MockMCPClient } from '../test-utils/mocks';
import { expectValidMachine } from '../test-utils/assertions';
import { createMachineFixture } from '../test-utils/fixtures';
import { waitForCondition } from '../test-utils/helpers';

describe('MCP Client Example Tests', () => {
  // Create a mock client for testing
  let mockClient: MockMCPClient;
  
  // Set up before each test
  beforeEach(() => {
    mockClient = new MockMCPClient();
  });
  
  // Clean up after each test
  afterEach(() => {
    mockClient.reset();
  });
  
  test('should retrieve machine details', async () => {
    // Set up the mock to return test data
    const testMachine = createMachineFixture('abc123', 'test-machine');
    mockClient.mockTool('getMachineDetails', () => testMachine);
    
    // Call the client
    const result = await mockClient.useTool('getMachineDetails', { systemId: 'abc123' });
    
    // Assert the results
    expectValidMachine(result);
    expect(result.id).toBe('abc123');
    expect(result.hostname).toBe('test-machine');
  });
  
  test('should handle errors', async () => {
    // Set up the mock to throw an error
    mockClient.mockTool('getMachineDetails', () => {
      throw new Error('Machine not found');
    });
    
    // Call the client and expect it to throw
    await expect(
      mockClient.useTool('getMachineDetails', { systemId: 'nonexistent' })
    ).rejects.toThrow('Machine not found');
  });
  
  test('should access resources', async () => {
    // Set up the mock to return test data
    const testMachine = createMachineFixture('abc123', 'test-machine');
    mockClient.mockResource('maas://machine/abc123', () => testMachine);
    
    // Call the client
    const result = await mockClient.accessResource('maas://machine/abc123');
    
    // Assert the results
    expectValidMachine(result);
    expect(result.id).toBe('abc123');
    expect(result.hostname).toBe('test-machine');
  });
  
  test('should handle resource errors', async () => {
    // Set up the mock to throw an error
    mockClient.mockResource('maas://machine/nonexistent', () => {
      throw new Error('Resource not found');
    });
    
    // Call the client and expect it to throw
    await expect(
      mockClient.accessResource('maas://machine/nonexistent')
    ).rejects.toThrow('Resource not found');
  });
  
  test('should use pattern matching for resources', async () => {
    // Set up the mock to return test data for a pattern
    mockClient.mockResource('maas://machine/*', (uri) => {
      const id = uri.split('/').pop();
      return createMachineFixture(id || 'unknown', `test-machine-${id}`);
    });
    
    // Call the client
    const result = await mockClient.accessResource('maas://machine/def456');
    
    // Assert the results
    expectValidMachine(result);
    expect(result.id).toBe('def456');
    expect(result.hostname).toBe('test-machine-def456');
  });
  
  test('should use waitForCondition helper', async () => {
    // Set up a condition that will be true after a delay
    let flag = false;
    setTimeout(() => {
      flag = true;
    }, 100);
    
    // Wait for the condition to be true
    const result = await waitForCondition(() => flag, 1000, 10);
    
    // Assert the result
    expect(result).toBe(true);
  });
});