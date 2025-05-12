/**
 * Deterministic tests for the progress notification module
 * These tests use fake timers and synchronization points to ensure deterministic behavior
 */
import { jest } from '@jest/globals';
import {
  setupFakeTimers,
  restoreRealTimers,
  advanceTimersByTime,
  waitForTicks,
  createSyncPoint
} from './deterministicTestUtils';

// Import the module under test
// @ts-expect-error - CommonJS module imported as ESM
import progressNotification from '../../utils/progressNotification.js';

const {
  sendProgressNotification,
  createProgressSender,
  clearRateLimitHistory,
  DEFAULT_RATE_LIMIT_CONFIG
} = progressNotification;

describe('progressNotification (deterministic tests)', () => {
  let mockSendNotification: jest.Mock;
  
  beforeEach(() => {
    // Setup fake timers for deterministic testing
    setupFakeTimers();
    
    // Create a mock send notification function
    mockSendNotification = jest.fn().mockImplementation(() => Promise.resolve());
    
    // Clear rate limit history before each test
    clearRateLimitHistory();
    
    // Clear all mocks
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    // Restore real timers after each test
    restoreRealTimers();
  });
  
  describe('rate limiting', () => {
    it('should rate limit notifications based on time interval', async () => {
      // Set initial time
      jest.setSystemTime(new Date(2025, 0, 1, 12, 0, 0));
      
      const params = {
        progressToken: 'rate-limit-token',
        progress: 25,
        total: 100,
        message: 'First notification'
      };
      
      // First notification should be sent
      await sendProgressNotification(params, mockSendNotification);
      expect(mockSendNotification).toHaveBeenCalledTimes(1);
      
      // Reset mock to clearly see the next call
      mockSendNotification.mockClear();
      
      // Advance time by 500ms (less than the default 1000ms rate limit)
      jest.setSystemTime(new Date(2025, 0, 1, 12, 0, 0, 500));
      
      // Second notification should be rate limited
      await sendProgressNotification(
        { ...params, message: 'Second notification' },
        mockSendNotification
      );
      
      // mockSendNotification should not have been called
      expect(mockSendNotification).not.toHaveBeenCalled();
      
      // Advance time beyond the rate limit
      jest.setSystemTime(new Date(2025, 0, 1, 12, 0, 1, 100));
      
      // Third notification should be sent
      await sendProgressNotification(
        { ...params, message: 'Third notification' },
        mockSendNotification
      );
      
      expect(mockSendNotification).toHaveBeenCalledTimes(1);
    });
    
    it('should always send first notification (progress = 0) regardless of rate limit', async () => {
      // Set initial time
      jest.setSystemTime(new Date(2025, 0, 1, 12, 0, 0));
      
      const token = 'first-notification-token';
      
      // Send a notification
      await sendProgressNotification(
        {
          progressToken: token,
          progress: 25,
          total: 100,
          message: 'First at 25%'
        },
        mockSendNotification
      );
      expect(mockSendNotification).toHaveBeenCalledTimes(1);
      
      // Reset mock to clearly see the next call
      mockSendNotification.mockClear();
      
      // Advance time by 500ms (less than the default 1000ms rate limit)
      jest.setSystemTime(new Date(2025, 0, 1, 12, 0, 0, 500));
      
      // Send a notification with progress = 0, should bypass rate limiting
      await sendProgressNotification(
        {
          progressToken: token,
          progress: 0,
          total: 100,
          message: 'Starting operation'
        },
        mockSendNotification
      );
      
      // Should have been sent despite rate limiting
      expect(mockSendNotification).toHaveBeenCalledTimes(1);
    });
    
    it('should always send last notification (progress = total) regardless of rate limit', async () => {
      // Set initial time
      jest.setSystemTime(new Date(2025, 0, 1, 12, 0, 0));
      
      const token = 'last-notification-token';
      
      // Send a notification
      await sendProgressNotification(
        {
          progressToken: token,
          progress: 75,
          total: 100,
          message: 'Progress at 75%'
        },
        mockSendNotification
      );
      expect(mockSendNotification).toHaveBeenCalledTimes(1);
      
      // Reset mock to clearly see the next call
      mockSendNotification.mockClear();
      
      // Advance time by 500ms (less than the default 1000ms rate limit)
      jest.setSystemTime(new Date(2025, 0, 1, 12, 0, 0, 500));
      
      // Send a notification with progress = total, should bypass rate limiting
      await sendProgressNotification(
        {
          progressToken: token,
          progress: 100,
          total: 100,
          message: 'Operation complete'
        },
        mockSendNotification
      );
      
      // Should have been sent despite rate limiting
      expect(mockSendNotification).toHaveBeenCalledTimes(1);
    });
    
    it('should respect custom rate limit configuration', async () => {
      // Set initial time
      jest.setSystemTime(new Date(2025, 0, 1, 12, 0, 0));
      
      const params = {
        progressToken: 'custom-rate-limit-token',
        progress: 25,
        total: 100,
        message: 'First notification'
      };
      
      const customRateLimit = {
        minInterval: 2000, // 2 seconds instead of default 1 second
        alwaysSendFirst: true,
        alwaysSendLast: true
      };
      
      // First notification should be sent
      await sendProgressNotification(params, mockSendNotification, undefined, undefined, customRateLimit);
      expect(mockSendNotification).toHaveBeenCalledTimes(1);
      
      // Reset mock to clearly see the next call
      mockSendNotification.mockClear();
      
      // Advance time by 1500ms (more than default 1000ms but less than custom 2000ms)
      jest.setSystemTime(new Date(2025, 0, 1, 12, 0, 1, 500));
      
      // Second notification should still be rate limited with custom config
      await sendProgressNotification(
        { ...params, message: 'Second notification' },
        mockSendNotification,
        undefined,
        undefined,
        customRateLimit
      );
      
      // mockSendNotification should not have been called
      expect(mockSendNotification).not.toHaveBeenCalled();
      
      // Advance time beyond the custom rate limit
      jest.setSystemTime(new Date(2025, 0, 1, 12, 0, 2, 100));
      
      // Third notification should be sent
      await sendProgressNotification(
        { ...params, message: 'Third notification' },
        mockSendNotification,
        undefined,
        undefined,
        customRateLimit
      );
      
      expect(mockSendNotification).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('abort signal support', () => {
    it('should not send notification if signal is aborted', async () => {
      const controller = new AbortController();
      controller.abort();
      
      const params = {
        progressToken: 'test-token',
        progress: 50,
        total: 100,
        message: 'Test progress message',
        signal: controller.signal
      };
      
      await sendProgressNotification(params, mockSendNotification);
      
      expect(mockSendNotification).not.toHaveBeenCalled();
    });
    
    it('should check if aborted before sending notification', async () => {
      const controller = new AbortController();
      
      const params = {
        progressToken: 'test-token',
        progress: 50,
        total: 100,
        message: 'Test progress message',
        signal: controller.signal
      };
      
      // Create a sync point to coordinate the test
      const syncPoint = createSyncPoint();
      
      // Setup a delayed abort
      setTimeout(() => {
        controller.abort();
        syncPoint.trigger();
      }, 100);
      
      // Advance timers to trigger the abort
      advanceTimersByTime(100);
      
      // Wait for the abort to be processed
      await syncPoint.wait();
      await waitForTicks(1);
      
      // Now try to send the notification
      await sendProgressNotification(params, mockSendNotification);
      
      // The notification should not be sent because the signal is aborted
      expect(mockSendNotification).not.toHaveBeenCalled();
    });
  });
  
  describe('createProgressSender', () => {
    it('should create a function that sends progress notifications with deterministic behavior', async () => {
      const progressToken = 'test-token';
      const requestId = 'test-request-id';
      const toolName = 'test-tool';
      
      // Create a progress sender with no rate limiting for deterministic testing
      const noRateLimitConfig = {
        minInterval: 0,
        alwaysSendFirst: true,
        alwaysSendLast: true
      };
      
      const sendProgress = createProgressSender(
        progressToken,
        mockSendNotification,
        requestId,
        toolName,
        noRateLimitConfig
      );
      
      // Send multiple notifications in sequence
      await sendProgress(0, 'Starting operation');
      await sendProgress(25, 'Operation at 25%');
      await sendProgress(50, 'Operation at 50%');
      await sendProgress(75, 'Operation at 75%');
      await sendProgress(100, 'Operation complete');
      
      // All notifications should have been sent
      expect(mockSendNotification).toHaveBeenCalledTimes(5);
      
      // Verify the parameters of each call
      expect(mockSendNotification).toHaveBeenNthCalledWith(1, {
        method: 'notifications/progress',
        params: {
          progressToken: 'test-token',
          progress: 0,
          total: 100,
          message: 'Starting operation'
        }
      });
      
      expect(mockSendNotification).toHaveBeenNthCalledWith(5, {
        method: 'notifications/progress',
        params: {
          progressToken: 'test-token',
          progress: 100,
          total: 100,
          message: 'Operation complete'
        }
      });
    });
    
    it('should support AbortSignal in the progress sender with deterministic behavior', async () => {
      const progressToken = 'abort-token';
      const controller = new AbortController();
      
      const sendProgress = createProgressSender(
        progressToken,
        mockSendNotification,
        'test-request-id',
        'test-tool',
        DEFAULT_RATE_LIMIT_CONFIG,
        controller.signal
      );
      
      // Send a notification before aborting
      await sendProgress(25, 'Progress at 25%');
      expect(mockSendNotification).toHaveBeenCalledTimes(1);
      
      // Reset the mock
      mockSendNotification.mockClear();
      
      // Abort the controller
      controller.abort();
      
      // Create a sync point to ensure the abort is processed
      const syncPoint = createSyncPoint();
      setTimeout(() => syncPoint.trigger(), 10);
      advanceTimersByTime(10);
      await syncPoint.wait();
      
      // Try to send another notification
      await sendProgress(50, 'Progress at 50%');
      
      // Should not send notification because signal is aborted
      expect(mockSendNotification).not.toHaveBeenCalled();
    });
  });
});