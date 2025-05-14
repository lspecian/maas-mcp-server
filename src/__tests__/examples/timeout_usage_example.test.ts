/**
 * Timeout Usage Example
 * 
 * This file demonstrates how to use the timeout configuration system
 * in different test scenarios.
 */

import { 
  applyQuickTimeout,
  applyMediumTimeout, 
  applyLongTimeout, 
  applyIntegrationTimeout,
  quickTest,
  mediumTest,
  longTest,
  integrationTest
} from '../utils/timeoutHelpers.js';
import { TEST_TIMEOUTS } from '../utils/testTimeouts.js';

/**
 * Example 1: Setting a timeout for an entire test suite
 */
describe('Example 1: Suite-level timeout', () => {
  // Apply a medium timeout (1000ms) to all tests in this suite
  applyMediumTimeout();
  
  it('should use the medium timeout from the suite', async () => {
    // This test will use the medium timeout (1000ms)
    await new Promise(resolve => setTimeout(resolve, 500));
    expect(true).toBe(true);
  });
  
  it('should also use the medium timeout', async () => {
    // This test will also use the medium timeout (1000ms)
    await new Promise(resolve => setTimeout(resolve, 500));
    expect(true).toBe(true);
  });
});

/**
 * Example 2: Using different timeout helper functions
 */
describe('Example 2: Using timeout helper functions', () => {
  // No suite-level timeout, so tests will use the default timeout
  
  // Test with a quick timeout (500ms)
  quickTest('should complete within the quick timeout', async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(true).toBe(true);
  });
  
  // Test with a medium timeout (1000ms)
  mediumTest('should complete within the medium timeout', async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    expect(true).toBe(true);
  });
  
  // Test with a long timeout (5000ms)
  longTest('should complete within the long timeout', async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(true).toBe(true);
  });
  
  // Test with an integration timeout (15000ms)
  integrationTest('should complete within the integration timeout', async () => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    expect(true).toBe(true);
  });
});

/**
 * Example 3: Using custom timeouts
 */
describe('Example 3: Custom timeouts', () => {
  // Apply a custom timeout to all tests in this suite
  applyMediumTimeout(2000); // 2000ms custom timeout
  
  it('should use the custom suite timeout', async () => {
    // This test will use the custom timeout (2000ms)
    await new Promise(resolve => setTimeout(resolve, 1500));
    expect(true).toBe(true);
  });
  
  // Test with a custom timeout
  longTest('should use a custom test-specific timeout', async () => {
    // This test will use a custom timeout (7500ms)
    await new Promise(resolve => setTimeout(resolve, 6000));
    expect(true).toBe(true);
  }, 7500); // 7.5 seconds
});

/**
 * Example 4: Using Jest's native timeout syntax
 */
describe('Example 4: Native Jest timeout syntax', () => {
  // Set timeout for all tests in this suite using Jest's native syntax
  jest.setTimeout(TEST_TIMEOUTS.MEDIUM);
  
  it('should use the suite timeout', async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    expect(true).toBe(true);
  });
  
  // Set timeout for a specific test using Jest's native syntax
  it('should use a test-specific timeout', async () => {
    jest.setTimeout(TEST_TIMEOUTS.LONG);
    await new Promise(resolve => setTimeout(resolve, 3000));
    expect(true).toBe(true);
  });
  
  // Alternative syntax for setting test-specific timeout
  it('should use the timeout specified in the third parameter', async () => {
    await new Promise(resolve => setTimeout(resolve, 3000));
    expect(true).toBe(true);
  }, TEST_TIMEOUTS.LONG);
});

/**
 * Example 5: Different test categories
 */
describe('Example 5: Different test categories', () => {
  describe('Cache operations', () => {
    // Cache operations should use quick timeouts
    applyQuickTimeout();
    
    it('should get and set cache entries quickly', async () => {
      // Simulate a quick cache operation
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(true).toBe(true);
    });
  });
  
  describe('API calls', () => {
    // API calls should use medium timeouts
    applyMediumTimeout();
    
    it('should make API calls within a reasonable time', async () => {
      // Simulate an API call
      await new Promise(resolve => setTimeout(resolve, 500));
      expect(true).toBe(true);
    });
  });
  
  describe('File uploads', () => {
    // File uploads should use long timeouts
    applyLongTimeout();
    
    it('should handle file uploads that take longer', async () => {
      // Simulate a file upload
      await new Promise(resolve => setTimeout(resolve, 2000));
      expect(true).toBe(true);
    });
  });
  
  describe('Integration tests', () => {
    // Integration tests should use integration timeouts
    applyIntegrationTimeout();
    
    it('should handle complex integration scenarios', async () => {
      // Simulate an integration test
      await new Promise(resolve => setTimeout(resolve, 5000));
      expect(true).toBe(true);
    });
  });
});

/**
 * Example 6: Documenting special cases
 */
describe('Example 6: Documenting special cases', () => {
  // This test has a non-standard timeout with a comment explaining why
  longTest('should handle a particularly complex operation', async () => {
    // This test simulates a large file upload and needs a longer timeout
    await new Promise(resolve => setTimeout(resolve, 4000));
    expect(true).toBe(true);
  }, 10000); // 10 seconds for large file simulation
});