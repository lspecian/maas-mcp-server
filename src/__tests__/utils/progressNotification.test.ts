// @ts-nocheck
const {
  sendProgressNotification,
  createProgressSender,
  clearRateLimitHistory,
  DEFAULT_RATE_LIMIT_CONFIG
} = require('../../utils/progressNotification');
const { AbortedOperationError } = require('../../utils/abortSignalUtils');
const { createRequestLogger } = require('../../utils/logger');

// Mock the logger
jest.mock('../../utils/logger', () => ({
  createRequestLogger: jest.fn().mockReturnValue({
    debug: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
  })
}));

describe('progressNotification', () => {
  let mockSendNotification: jest.Mock;
  
  beforeEach(() => {
    mockSendNotification = jest.fn().mockResolvedValue(undefined);
    jest.clearAllMocks();
    // Clear rate limit history before each test
    clearRateLimitHistory();
  });
  
  describe('sendProgressNotification', () => {
    it('should send a notification with the correct parameters', async () => {
      const params: ProgressNotificationParams = {
        progressToken: 'test-token',
        progress: 50,
        total: 100,
        message: 'Test progress message'
      };
      
      await sendProgressNotification(params, mockSendNotification);
      
      expect(mockSendNotification).toHaveBeenCalledWith({
        method: 'notifications/progress',
        params: {
          progressToken: 'test-token',
          progress: 50,
          total: 100,
          message: 'Test progress message'
        }
      });
    });
    
    it('should do nothing if progressToken is not provided', async () => {
      const params: ProgressNotificationParams = {
        progressToken: undefined as any,
        progress: 50,
        total: 100,
        message: 'Test progress message'
      };
      
      await sendProgressNotification(params, mockSendNotification);
      
      expect(mockSendNotification).not.toHaveBeenCalled();
    });
    
    it('should do nothing if sendNotification is not provided', async () => {
      const params: ProgressNotificationParams = {
        progressToken: 'test-token',
        progress: 50,
        total: 100,
        message: 'Test progress message'
      };
      
      await sendProgressNotification(params, undefined);
      
      expect(mockSendNotification).not.toHaveBeenCalled();
    });
    
    it('should log a warning if sending notification fails', async () => {
      const params: ProgressNotificationParams = {
        progressToken: 'test-token',
        progress: 50,
        total: 100,
        message: 'Test progress message'
      };
      
      const error = new Error('Test error');
      const failingSendNotification = jest.fn().mockRejectedValue(error);
      const requestId = 'test-request-id';
      const toolName = 'test-tool';
      
      await sendProgressNotification(params, failingSendNotification, requestId, toolName);
      
      expect(failingSendNotification).toHaveBeenCalled();
      expect(createRequestLogger).toHaveBeenCalledWith(requestId, toolName, {});
      
      const logger = (createRequestLogger as jest.Mock).mock.results[0].value;
      expect(logger.warn).toHaveBeenCalledWith(
        { error: 'Test error', progressToken: 'test-token', progress: 50, total: 100 },
        'Failed to send progress notification'
      );
    });
  });
  
  describe('abort signal support', () => {
    it('should not send notification if signal is aborted', async () => {
      const controller = new AbortController();
      controller.abort();
      
      const params: ProgressNotificationParams = {
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
      const params: ProgressNotificationParams = {
        progressToken: 'test-token',
        progress: 50,
        total: 100,
        message: 'Test progress message',
        signal: controller.signal
      };
      
      // Abort after a small delay to simulate aborting during the notification process
      setTimeout(() => controller.abort(), 10);
      
      // Mock sendNotification to delay to ensure abort happens before it's called
      const delaySendNotification = jest.fn().mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 20));
      });
      
      await sendProgressNotification(params, delaySendNotification);
      
      expect(delaySendNotification).not.toHaveBeenCalled();
    });
  });
  
  describe('createProgressSender', () => {
    it('should create a function that sends progress notifications', async () => {
      const progressToken = 'test-token';
      const requestId = 'test-request-id';
      const toolName = 'test-tool';
      
      const sendProgress = createProgressSender(progressToken, mockSendNotification, requestId, toolName);
      
      await sendProgress(25, 'Progress at 25%');
      
      expect(mockSendNotification).toHaveBeenCalledWith({
        method: 'notifications/progress',
        params: {
          progressToken: 'test-token',
          progress: 25,
          total: 100,
          message: 'Progress at 25%'
        }
      });
    });
    
    it('should allow specifying a custom total', async () => {
      const progressToken = 'test-token';
      const requestId = 'test-request-id';
      const toolName = 'test-tool';
      
      const sendProgress = createProgressSender(progressToken, mockSendNotification, requestId, toolName);
      
      await sendProgress(5, 'Progress at 5', 20);
      
      expect(mockSendNotification).toHaveBeenCalledWith({
        method: 'notifications/progress',
        params: {
          progressToken: 'test-token',
          progress: 5,
          total: 20,
          message: 'Progress at 5'
        }
      });
    });
    
    it('should do nothing if progressToken is not provided', async () => {
      const progressToken = undefined;
      const requestId = 'test-request-id';
      const toolName = 'test-tool';
      
      const sendProgress = createProgressSender(progressToken, mockSendNotification, requestId, toolName);
      
      await sendProgress(25, 'Progress at 25%');
      
      expect(mockSendNotification).not.toHaveBeenCalled();
    });
    
    it('should support AbortSignal in the progress sender', async () => {
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
      
      // Abort the controller
      controller.abort();
      
      // Try to send a notification
      await sendProgress(25, 'Progress at 25%');
      
      // Should not send notification because signal is aborted
      expect(mockSendNotification).not.toHaveBeenCalled();
    });
    
    it('should allow overriding the AbortSignal in the progress sender', async () => {
      const progressToken = 'override-abort-token';
      const controller1 = new AbortController();
      const controller2 = new AbortController();
      
      const sendProgress = createProgressSender(
        progressToken,
        mockSendNotification,
        'test-request-id',
        'test-tool',
        DEFAULT_RATE_LIMIT_CONFIG,
        controller1.signal
      );
      
      // Abort the first controller
      controller1.abort();
      
      // Try to send a notification with the second controller's signal
      await sendProgress(25, 'Progress at 25%', 100, false, controller2.signal);
      
      // Should send notification because we're using the second signal which isn't aborted
      expect(mockSendNotification).toHaveBeenCalled();
      
      // Reset mock
      mockSendNotification.mockClear();
      
      // Now abort the second controller
      controller2.abort();
      
      // Try to send another notification with the second controller's signal
      await sendProgress(50, 'Progress at 50%', 100, false, controller2.signal);
      
      // Should not send notification because second signal is now aborted
      expect(mockSendNotification).not.toHaveBeenCalled();
    });
  });

  describe('rate limiting', () => {
    beforeEach(() => {
      // Mock Date.now to control time for rate limiting tests
      jest.spyOn(Date, 'now').mockImplementation(() => 1000);
    });

    afterEach(() => {
      // Restore Date.now
      jest.spyOn(Date, 'now').mockRestore();
    });

    it('should rate limit notifications for the same progress token', async () => {
      const params: ProgressNotificationParams = {
        progressToken: 'rate-limit-token',
        progress: 25,
        total: 100,
        message: 'First notification'
      };

      // First notification should be sent
      await sendProgressNotification(params, mockSendNotification);
      expect(mockSendNotification).toHaveBeenCalledTimes(1);

      // Advance time by 500ms (less than the default 1000ms rate limit)
      jest.spyOn(Date, 'now').mockImplementation(() => 1500);

      // Second notification should be rate limited
      await sendProgressNotification(
        { ...params, message: 'Second notification' },
        mockSendNotification
      );
      
      // mockSendNotification should still have been called only once
      expect(mockSendNotification).toHaveBeenCalledTimes(1);

      // Advance time beyond the rate limit
      jest.spyOn(Date, 'now').mockImplementation(() => 2100);

      // Third notification should be sent
      await sendProgressNotification(
        { ...params, message: 'Third notification' },
        mockSendNotification
      );
      
      expect(mockSendNotification).toHaveBeenCalledTimes(2);
    });

    it('should allow important notifications to bypass rate limiting', async () => {
      const params: ProgressNotificationParams = {
        progressToken: 'important-token',
        progress: 25,
        total: 100,
        message: 'First notification'
      };

      // First notification should be sent
      await sendProgressNotification(params, mockSendNotification);
      expect(mockSendNotification).toHaveBeenCalledTimes(1);

      // Advance time by 500ms (less than the default 1000ms rate limit)
      jest.spyOn(Date, 'now').mockImplementation(() => 1500);

      // Important notification should bypass rate limiting
      await sendProgressNotification(
        { ...params, message: 'Important notification', important: true },
        mockSendNotification
      );
      
      // Both notifications should have been sent
      expect(mockSendNotification).toHaveBeenCalledTimes(2);
    });

    it('should always send first notification (progress = 0)', async () => {
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

      // Advance time by 500ms (less than the default 1000ms rate limit)
      jest.spyOn(Date, 'now').mockImplementation(() => 1500);

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
      
      // Both notifications should have been sent
      expect(mockSendNotification).toHaveBeenCalledTimes(2);
    });

    it('should always send last notification (progress = total)', async () => {
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

      // Advance time by 500ms (less than the default 1000ms rate limit)
      jest.spyOn(Date, 'now').mockImplementation(() => 1500);

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
      
      // Both notifications should have been sent
      expect(mockSendNotification).toHaveBeenCalledTimes(2);
    });

    it('should respect custom rate limit configuration', async () => {
      // Reset mock call count
      mockSendNotification.mockClear();
      
      const params: ProgressNotificationParams = {
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

      // Set initial time
      const mockNow = jest.spyOn(Date, 'now').mockReturnValue(1000);
      
      // First notification should be sent
      await sendProgressNotification(params, mockSendNotification, undefined, undefined, customRateLimit);
      expect(mockSendNotification).toHaveBeenCalledTimes(1);

      // Advance time by 1500ms (more than default 1000ms but less than custom 2000ms)
      jest.spyOn(Date, 'now').mockImplementation(() => 2500);

      // Second notification should still be rate limited with custom config
      await sendProgressNotification(
        { ...params, message: 'Second notification' },
        mockSendNotification,
        undefined,
        undefined,
        customRateLimit
      );
      
      // mockSendNotification should still have been called only once
      expect(mockSendNotification).toHaveBeenCalledTimes(1);

      // Advance time beyond the custom rate limit
      jest.spyOn(Date, 'now').mockImplementation(() => 3100);

      // Third notification should be sent
      await sendProgressNotification(
        { ...params, message: 'Third notification' },
        mockSendNotification,
        undefined,
        undefined,
        customRateLimit
      );
      
      expect(mockSendNotification).toHaveBeenCalledTimes(2);
    });

    it('should support rate limiting in createProgressSender', async () => {
      const progressToken = 'sender-rate-limit-token';
      const sendProgress = createProgressSender(progressToken, mockSendNotification);
      
      // First notification should be sent
      await sendProgress(25, 'First notification');
      expect(mockSendNotification).toHaveBeenCalledTimes(1);

      // Advance time by 500ms (less than the default 1000ms rate limit)
      jest.spyOn(Date, 'now').mockImplementation(() => 1500);

      // Second notification should be rate limited
      await sendProgress(30, 'Second notification');
      expect(mockSendNotification).toHaveBeenCalledTimes(1);

      // Important notification should bypass rate limiting
      await sendProgress(35, 'Important notification', 100, true);
      expect(mockSendNotification).toHaveBeenCalledTimes(2);
    });
  });
});