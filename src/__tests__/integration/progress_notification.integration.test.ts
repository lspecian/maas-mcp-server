import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MaasApiClient } from "../../maas/MaasApiClient.js";
import { 
  sendProgressNotification, 
  createProgressSender, 
  clearRateLimitHistory 
} from "../../utils/progressNotification.js";
import { 
  registerOperation, 
  updateOperation, 
  getOperation, 
  abortOperation, 
  OperationStatus 
} from "../../utils/operationsRegistry.js";
import { 
  createOperationContext, 
  withOperationHandler 
} from "../../utils/operationHandlerUtils.js";
import { createDerivedSignal } from "../../utils/abortSignalUtils.js";

// Mock MCP server
const mockMcpServer = {
  tool: jest.fn(),
} as unknown as McpServer;

// Mock MAAS API client
const mockMaasClient = {
  get: jest.fn(),
  post: jest.fn(),
} as unknown as MaasApiClient;

// Mock sendNotification function
const mockSendNotification = jest.fn().mockResolvedValue(undefined);

describe('Progress Notification Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearRateLimitHistory();
  });

  describe('End-to-end notification flow', () => {
    it('should handle the complete notification flow for a successful operation', async () => {
      // 1. Register an operation
      const progressToken = 'test-integration-token';
      const operationType = 'test-operation';
      
      const operation = registerOperation(progressToken, operationType, {
        initialStatus: OperationStatus.PENDING,
        initialProgress: 0,
        total: 100,
        message: 'Operation starting'
      });
      
      expect(operation).toBeDefined();
      expect(operation.status).toBe(OperationStatus.PENDING);
      
      // 2. Create a progress sender
      const sendProgress = createProgressSender(
        progressToken,
        mockSendNotification,
        'test-request-id',
        operationType
      );
      
      // 3. Update operation status to running
      updateOperation(progressToken, {
        status: OperationStatus.RUNNING,
        message: 'Operation running'
      });
      
      const updatedOp = getOperation(progressToken);
      expect(updatedOp?.status).toBe(OperationStatus.RUNNING);
      
      // 4. Send initial progress notification
      await sendProgress(0, 'Starting operation');
      expect(mockSendNotification).toHaveBeenCalledWith({
        method: 'notifications/progress',
        params: {
          progressToken,
          progress: 0,
          total: 100,
          message: 'Starting operation'
        }
      });
      
      // 5. Send progress updates
      await sendProgress(25, 'Operation 25% complete');
      await sendProgress(50, 'Operation 50% complete');
      await sendProgress(75, 'Operation 75% complete');
      
      // 6. Update operation status to completed
      updateOperation(progressToken, {
        status: OperationStatus.COMPLETED,
        progress: 100,
        message: 'Operation completed successfully',
        result: { success: true }
      });
      
      const completedOp = getOperation(progressToken);
      expect(completedOp?.status).toBe(OperationStatus.COMPLETED);
      expect(completedOp?.progress).toBe(100);
      expect(completedOp?.result).toEqual({ success: true });
      
      // 7. Send final progress notification
      await sendProgress(100, 'Operation completed successfully', 100, true);
      
      // Verify all notifications were sent
      expect(mockSendNotification).toHaveBeenCalledTimes(5);
    });

    it('should handle the notification flow for an aborted operation', async () => {
      // 1. Create abort controller
      const controller = new AbortController();
      
      // 2. Register an operation with abort signal
      const progressToken = 'abort-integration-token';
      const operationType = 'abort-operation';
      
      const operation = registerOperation(progressToken, operationType, {
        initialStatus: OperationStatus.PENDING,
        initialProgress: 0,
        total: 100,
        message: 'Operation starting',
        signal: controller.signal
      });
      
      expect(operation).toBeDefined();
      expect(operation.status).toBe(OperationStatus.PENDING);
      
      // 3. Create a progress sender with abort signal
      const sendProgress = createProgressSender(
        progressToken,
        mockSendNotification,
        'test-request-id',
        operationType,
        undefined,
        controller.signal
      );
      
      // 4. Update operation status to running
      updateOperation(progressToken, {
        status: OperationStatus.RUNNING,
        message: 'Operation running'
      });
      
      // 5. Send initial progress notification
      await sendProgress(0, 'Starting operation');
      expect(mockSendNotification).toHaveBeenCalledWith({
        method: 'notifications/progress',
        params: {
          progressToken,
          progress: 0,
          total: 100,
          message: 'Starting operation'
        }
      });
      
      // 6. Send a progress update
      await sendProgress(25, 'Operation 25% complete');
      
      // 7. Abort the operation
      controller.abort('Operation manually aborted');
      
      // 8. Verify operation was marked as aborted
      const abortedOp = getOperation(progressToken);
      expect(abortedOp?.status).toBe(OperationStatus.ABORTED);
      
      // 9. Try to send another notification (should be skipped due to abort)
      await sendProgress(50, 'This should be skipped');
      
      // Verify only the first two notifications were sent
      expect(mockSendNotification).toHaveBeenCalledTimes(2);
    });
  });

  describe('Operation handler integration', () => {
    it('should integrate with operation handler for a successful operation', async () => {
      // 1. Define a test operation handler
      const testHandler = async (params: any, context: any) => {
        const { sendProgress, signal } = context;
        
        // Send progress updates
        await sendProgress(0, 'Starting test operation');
        await sendProgress(50, 'Test operation in progress');
        await sendProgress(100, 'Test operation completed');
        
        return { success: true, data: 'test-result' };
      };
      
      // 2. Wrap the handler with operation handler
      const wrappedHandler = withOperationHandler(
        'test-wrapped-operation',
        testHandler,
        {
          timeout: 30000,
          initialMessage: 'Preparing test operation'
        }
      );
      
      // 3. Call the wrapped handler
      const progressToken = 'wrapped-operation-token';
      const result = await wrappedHandler(
        { _meta: { progressToken } },
        { signal: undefined, sendNotification: mockSendNotification }
      );
      
      // 4. Verify the result
      expect(result).toEqual({ success: true, data: 'test-result' });
      
      // 5. Verify operation status
      const op = getOperation(progressToken);
      expect(op?.status).toBe(OperationStatus.COMPLETED);
      expect(op?.result).toEqual({ success: true, data: 'test-result' });
      
      // 6. Verify notifications were sent
      // Initial notification + 3 from handler + final notification
      expect(mockSendNotification).toHaveBeenCalledTimes(5);
    });

    it('should handle errors in operation handler', async () => {
      // 1. Define a test operation handler that throws an error
      const testErrorHandler = async (params: any, context: any) => {
        const { sendProgress } = context;
        
        await sendProgress(0, 'Starting error test');
        await sendProgress(25, 'About to fail');
        
        throw new Error('Test operation failed');
      };
      
      // 2. Wrap the handler with operation handler
      const wrappedHandler = withOperationHandler(
        'test-error-operation',
        testErrorHandler
      );
      
      // 3. Call the wrapped handler and expect it to throw
      const progressToken = 'error-operation-token';
      
      await expect(
        wrappedHandler(
          { _meta: { progressToken } },
          { signal: undefined, sendNotification: mockSendNotification }
        )
      ).rejects.toThrow('Test operation failed');
      
      // 4. Verify operation status
      const op = getOperation(progressToken);
      expect(op?.status).toBe(OperationStatus.FAILED);
      expect(op?.error).toBe('Test operation failed');
      
      // 5. Verify notifications were sent
      // Initial notification + 2 from handler + error notification
      expect(mockSendNotification).toHaveBeenCalledTimes(4);
    });
  });

  describe('Operation context integration', () => {
    it('should create and use operation context correctly', () => {
      // 1. Create operation context
      const progressToken = 'context-test-token';
      const operationName = 'context-test-operation';
      
      const context = createOperationContext(
        progressToken,
        operationName,
        mockSendNotification
      );
      
      // 2. Verify context properties
      expect(context).toBeDefined();
      expect(context?.progressToken).toBe(progressToken);
      expect(context?.operationName).toBe(operationName);
      expect(context?.sendProgress).toBeDefined();
      expect(context?.signal).toBeDefined();
      expect(context?.logger).toBeDefined();
      expect(context?.operationDetails).toBeDefined();
      
      // 3. Verify operation was registered
      const op = getOperation(progressToken);
      expect(op).toBeDefined();
      expect(op?.operationType).toBe(operationName);
      
      // 4. Use the context to send a progress notification
      context?.sendProgress(50, 'Context test in progress');
      
      expect(mockSendNotification).toHaveBeenCalledWith({
        method: 'notifications/progress',
        params: {
          progressToken,
          progress: 50,
          total: 100,
          message: 'Context test in progress'
        }
      });
    });
  });

  describe('Edge cases and error scenarios', () => {
    it('should handle missing progressToken gracefully', async () => {
      // 1. Try to send notification without progressToken
      await sendProgressNotification(
        {
          progressToken: undefined as any,
          progress: 50,
          total: 100,
          message: 'This should be skipped'
        },
        mockSendNotification
      );
      
      // Notification should not be sent
      expect(mockSendNotification).not.toHaveBeenCalled();
      
      // 2. Try to create progress sender without progressToken
      const sendProgress = createProgressSender(
        undefined,
        mockSendNotification
      );
      
      await sendProgress(50, 'This should also be skipped');
      
      // Notification should not be sent
      expect(mockSendNotification).not.toHaveBeenCalled();
    });

    it('should handle sendNotification failures gracefully', async () => {
      // 1. Create a failing sendNotification function
      const failingSendNotification = jest.fn().mockRejectedValue(new Error('Failed to send'));
      
      // 2. Try to send notification with failing function
      await sendProgressNotification(
        {
          progressToken: 'failing-token',
          progress: 50,
          total: 100,
          message: 'This should fail but not throw'
        },
        failingSendNotification,
        'test-request-id',
        'test-tool'
      );
      
      // Function should have been called
      expect(failingSendNotification).toHaveBeenCalled();
      
      // 3. Create progress sender with failing function
      const sendProgress = createProgressSender(
        'failing-sender-token',
        failingSendNotification,
        'test-request-id',
        'test-tool'
      );
      
      // 4. Send notification (should not throw)
      await expect(
        sendProgress(50, 'This should also fail but not throw')
      ).resolves.not.toThrow();
    });

    it('should handle rate limiting correctly', async () => {
      // Mock Date.now to control time
      jest.spyOn(Date, 'now')
        .mockImplementationOnce(() => 1000)  // First call
        .mockImplementationOnce(() => 1000)  // Store time
        .mockImplementationOnce(() => 1500)  // Second call (500ms later)
        .mockImplementationOnce(() => 2100); // Third call (1100ms later)
      
      const progressToken = 'rate-limit-token';
      
      // 1. Send first notification
      await sendProgressNotification(
        {
          progressToken,
          progress: 25,
          total: 100,
          message: 'First notification'
        },
        mockSendNotification
      );
      
      expect(mockSendNotification).toHaveBeenCalledTimes(1);
      
      // 2. Send second notification (should be rate limited)
      await sendProgressNotification(
        {
          progressToken,
          progress: 50,
          total: 100,
          message: 'Second notification (should be rate limited)'
        },
        mockSendNotification
      );
      
      // Should still be called only once
      expect(mockSendNotification).toHaveBeenCalledTimes(1);
      
      // 3. Send third notification (after rate limit period)
      await sendProgressNotification(
        {
          progressToken,
          progress: 75,
          total: 100,
          message: 'Third notification'
        },
        mockSendNotification
      );
      
      // Should now be called twice
      expect(mockSendNotification).toHaveBeenCalledTimes(2);
      
      // Restore Date.now
      jest.spyOn(Date, 'now').mockRestore();
    });
  });
});