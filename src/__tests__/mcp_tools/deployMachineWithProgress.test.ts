import { registerDeployMachineWithProgressTool } from '../../mcp_tools/deployMachineWithProgress.js';
import { MaasApiClient } from '../../maas/MaasApiClient.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  performComprehensiveCleanup,
  safeAbortController
} from '../utils/testCleanupUtils.js';
import {
  setupFakeTimers,
  restoreRealTimers,
  advanceTimersByTime,
  waitForTicks,
  createSequentialMock,
  createControlledMock,
  createSyncPoint
} from '../utils/deterministicTestUtils.js';

// Mock dependencies
jest.mock('../../maas/MaasApiClient.js');
jest.mock('@modelcontextprotocol/sdk/server/mcp.js');
jest.mock('../../utils/logger.ts', () => ({
  createRequestLogger: jest.fn().mockReturnValue({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  })
}));
jest.mock('../../utils/progressNotification.js', () => {
  const original = jest.requireActual('../../utils/progressNotification.js');
  return {
    ...original,
    // Override rate limiting for deterministic tests
    DEFAULT_RATE_LIMIT_CONFIG: {
      minInterval: 0, // No rate limiting in tests
      alwaysSendFirst: true,
      alwaysSendLast: true
    }
  };
});

describe('deployMachineWithProgress', () => {
  let mockServer: jest.Mocked<McpServer>;
  let mockMaasClient: jest.Mocked<MaasApiClient>;
  let mockSendNotification: jest.Mock;
  let mockToolCallback: jest.Mock;
  let abortController: AbortController;

  beforeEach(() => {
    // Setup fake timers for deterministic testing
    setupFakeTimers();
    
    // Perform comprehensive cleanup before each test
    performComprehensiveCleanup();
    
    // Setup mock server
    mockServer = {
      tool: jest.fn(),
    } as unknown as jest.Mocked<McpServer>;
    
    // Setup mock MAAS client
    mockMaasClient = {
      post: jest.fn(),
      get: jest.fn()
    } as unknown as jest.Mocked<MaasApiClient>;
    
    // Setup mock send notification with immediate resolution for deterministic behavior
    mockSendNotification = jest.fn().mockImplementation(() => Promise.resolve());
    
    // Create a fresh abort controller for each test
    abortController = new AbortController();
    
    // Register the tool
    registerDeployMachineWithProgressTool(mockServer, mockMaasClient);
    
    // Capture the tool callback
    mockToolCallback = mockServer.tool.mock.calls[0][2] as unknown as jest.Mock;
  });

  it('should register the tool with the MCP server', () => {
    expect(mockServer.tool).toHaveBeenCalledWith(
      'maas_deploy_machine_with_progress',
      expect.any(Object),
      expect.any(Function)
    );
  });

  it('should handle successful deployment', async () => {
    // Create a local abort controller for this test
    const localAbortController = new AbortController();
    
    try {
      // Mock successful deployment with deterministic response
      const deployResponse = { system_id: 'test-machine', hostname: 'test-host', status_name: 'DEPLOYING' };
      mockMaasClient.post.mockResolvedValue(deployResponse);
      
      // Setup sequential responses for status checks with deterministic behavior
      const statusResponses = [
        { status_name: 'DEPLOYING' },
        { status_name: 'DEPLOYING' },
        { status_name: 'DEPLOYED' }
      ];
      
      // Use our deterministic sequential mock with proper typing
      mockMaasClient.get.mockImplementation((endpoint, params, signal) => {
        const response = statusResponses[mockMaasClient.get.mock.calls.length - 1] || statusResponses[statusResponses.length - 1];
        return Promise.resolve(response);
      });

      // Create sync points to ensure notifications are sent in the correct order
      const notificationSyncPoints: Array<{wait: () => Promise<unknown>, trigger: () => void}> = [];
      for (let i = 0; i < 5; i++) { // Expect at least 5 notifications
        notificationSyncPoints.push(createSyncPoint());
      }
      
      let notificationCount = 0;
      mockSendNotification.mockImplementation(() => {
        const syncPoint = notificationSyncPoints[notificationCount];
        if (syncPoint) {
          syncPoint.trigger();
          notificationCount++;
        }
        return Promise.resolve();
      });

      const params = {
        system_id: 'test-machine',
        osystem: 'ubuntu',
        distro_series: 'jammy',
        _meta: { progressToken: 'test-token' }
      };

      // Start the deployment process
      const resultPromise = mockToolCallback(params, {
        signal: localAbortController.signal,
        sendNotification: mockSendNotification
      });
      
      // Wait for the first notification (deployment started)
      await notificationSyncPoints[0].wait();
      
      // Advance timers to trigger status polling
      advanceTimersByTime(5000);
      await waitForTicks(2);
      
      // Wait for the second notification (after first status check)
      await notificationSyncPoints[1].wait();
      
      // Advance timers again for next status check
      advanceTimersByTime(5000);
      await waitForTicks(2);
      
      // Wait for the third notification (after second status check)
      await notificationSyncPoints[2].wait();
      
      // Advance timers for final status check
      advanceTimersByTime(5000);
      await waitForTicks(2);
      
      // Get the final result
      const result = await resultPromise;

      // Verify MAAS API calls
      expect(mockMaasClient.post).toHaveBeenCalledWith(
        '/machines/test-machine',
        expect.objectContaining({
          op: 'deploy',
          osystem: 'ubuntu',
          distro_series: 'jammy'
        }),
        expect.any(AbortSignal)
      );
      
      expect(mockMaasClient.get).toHaveBeenCalledWith(
        '/machines/test-machine',
        undefined,
        expect.any(AbortSignal)
      );
      
      // Verify notifications were sent
      expect(mockSendNotification).toHaveBeenCalled();
      expect(mockSendNotification.mock.calls.length).toBeGreaterThanOrEqual(3);
      
      // Verify result structure
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('resource');
      expect(result.content[0].resource.uri).toContain('test-machine');
    } catch (error) {
      fail(`Test should not have thrown an error: ${error}`);
    } finally {
      // Clean up resources specific to this test
      safeAbortController(localAbortController);
    }
  });

  it('should handle deployment failure', async () => {
    // Create a local abort controller for this test
    const localAbortController = new AbortController();
    
    try {
      // Mock failed deployment with deterministic response
      const deployResponse = { system_id: 'test-machine', hostname: 'test-host', status_name: 'DEPLOYING' };
      mockMaasClient.post.mockResolvedValue(deployResponse);
      
      // Setup sequential responses for status checks with deterministic behavior
      const statusResponses = [
        { status_name: 'DEPLOYING' },
        { status_name: 'FAILED_DEPLOYMENT' }
      ];
      
      // Use our deterministic sequential mock with proper typing
      mockMaasClient.get.mockImplementation((endpoint, params, signal) => {
        const response = statusResponses[mockMaasClient.get.mock.calls.length - 1] || statusResponses[statusResponses.length - 1];
        return Promise.resolve(response);
      });

      // Create sync points to ensure notifications are sent in the correct order
      const notificationSyncPoints: Array<{wait: () => Promise<unknown>, trigger: () => void}> = [];
      for (let i = 0; i < 4; i++) { // Expect at least 4 notifications
        notificationSyncPoints.push(createSyncPoint());
      }
      
      let notificationCount = 0;
      mockSendNotification.mockImplementation(() => {
        const syncPoint = notificationSyncPoints[notificationCount];
        if (syncPoint) {
          syncPoint.trigger();
          notificationCount++;
        }
        return Promise.resolve();
      });

      const params = {
        system_id: 'test-machine',
        _meta: { progressToken: 'test-token' }
      };

      // Start the deployment process
      const resultPromise = mockToolCallback(params, {
        signal: localAbortController.signal,
        sendNotification: mockSendNotification
      });
      
      // Wait for the first notification (deployment started)
      await notificationSyncPoints[0].wait();
      
      // Advance timers to trigger status polling
      advanceTimersByTime(5000);
      await waitForTicks(2);
      
      // Wait for the second notification (after first status check)
      await notificationSyncPoints[1].wait();
      
      // Advance timers again for next status check
      advanceTimersByTime(5000);
      await waitForTicks(2);
      
      // Get the final result
      const result = await resultPromise;

      // Verify error response
      expect(result).toMatchObject({
        isError: true,
        content: expect.arrayContaining([
          expect.objectContaining({
            type: 'text',
            text: expect.stringContaining('Deployment failed')
          })
        ])
      });
      
      // Verify API calls
      expect(mockMaasClient.post).toHaveBeenCalled();
      expect(mockMaasClient.get).toHaveBeenCalled();
      expect(mockSendNotification).toHaveBeenCalled();
      expect(mockSendNotification.mock.calls.length).toBeGreaterThanOrEqual(2);
    } catch (error) {
      fail(`Test should not have thrown an error: ${error}`);
    } finally {
      // Clean up resources specific to this test
      safeAbortController(localAbortController);
    }
  });

  it('should handle aborted deployment', async () => {
    // Create a local abort controller for this test
    const localAbortController = new AbortController();
    
    try {
      // Create a sync point for the notification
      const notificationSyncPoint = createSyncPoint();
      
      mockSendNotification.mockImplementation(() => {
        notificationSyncPoint.trigger();
        return Promise.resolve();
      });
      
      // Abort the controller before calling the tool
      localAbortController.abort('User cancelled');

      const params = {
        system_id: 'test-machine',
        _meta: { progressToken: 'test-token' }
      };

      const resultPromise = mockToolCallback(params, {
        signal: localAbortController.signal,
        sendNotification: mockSendNotification
      });
      
      // Wait for the notification to be sent
      await notificationSyncPoint.wait();
      
      // Get the result
      const result = await resultPromise;

      // Verify error response
      expect(result).toMatchObject({
        isError: true,
        content: expect.arrayContaining([
          expect.objectContaining({
            type: 'text',
            text: expect.stringContaining('aborted')
          })
        ])
      });
      
      // Verify notification was sent
      expect(mockSendNotification).toHaveBeenCalled();
      
      // Verify that MAAS API was not called due to early abort
      expect(mockMaasClient.post).not.toHaveBeenCalled();
    } catch (error) {
      fail(`Test should not have thrown an error: ${error}`);
    } finally {
      // No need to abort the controller as it's already aborted
    }
  });
  
  it('should abort an in-progress deployment when signal is aborted', async () => {
    // Create a local abort controller for this test
    const localAbortController = new AbortController();
    
    try {
      // Mock successful initial deployment with deterministic response
      const deployResponse = { system_id: 'test-machine', hostname: 'test-host', status_name: 'DEPLOYING' };
      mockMaasClient.post.mockResolvedValue(deployResponse);
      
      // Setup the first status check to return DEPLOYING
      mockMaasClient.get.mockResolvedValueOnce({ status_name: 'DEPLOYING' });
      
      // Create sync points for notifications
      const initialNotificationSyncPoint = createSyncPoint();
      const abortNotificationSyncPoint = createSyncPoint();
      
      let notificationCount = 0;
      mockSendNotification.mockImplementation(() => {
        if (notificationCount === 0) {
          notificationCount++;
          initialNotificationSyncPoint.trigger();
        } else {
          abortNotificationSyncPoint.trigger();
        }
        return Promise.resolve();
      });
      
      const params = {
        system_id: 'test-machine',
        _meta: { progressToken: 'test-token' }
      };
      
      // Start the deployment
      const resultPromise = mockToolCallback(params, {
        signal: localAbortController.signal,
        sendNotification: mockSendNotification
      });
      
      // Wait for the initial notification to confirm deployment has started
      await initialNotificationSyncPoint.wait();
      
      // Advance timers to ensure post request completes
      advanceTimersByTime(100);
      await waitForTicks(2);
      
      // Abort the deployment
      localAbortController.abort('User cancelled during deployment');
      
      // Wait for the abort notification
      await abortNotificationSyncPoint.wait();
      
      // Verify the result
      const result = await resultPromise;
      
      expect(result).toMatchObject({
        isError: true,
        content: expect.arrayContaining([
          expect.objectContaining({
            type: 'text',
            text: expect.stringContaining('aborted')
          })
        ])
      });
      
      // Verify that the initial API call was made
      expect(mockMaasClient.post).toHaveBeenCalled();
      
      // Verify notification was sent
      expect(mockSendNotification).toHaveBeenCalled();
      expect(mockSendNotification.mock.calls.length).toBeGreaterThanOrEqual(2);
    } catch (error) {
      fail(`Test should not have thrown an error: ${error}`);
    } finally {
      // No need to abort the controller as it's already aborted
    }
  });
  
  afterEach(() => {
    // Ensure comprehensive cleanup after each test, even if it fails
    try {
      // Clean up any remaining abort controllers
      safeAbortController(abortController);
    } finally {
      // Restore real timers
      restoreRealTimers();
      
      // Final cleanup to ensure all resources are released
      performComprehensiveCleanup();
    }
  });
});