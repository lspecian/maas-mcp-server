"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commissionMachineWithProgress_js_1 = require("../../mcp_tools/commissionMachineWithProgress.js");
const testCleanupUtils_js_1 = require("../utils/testCleanupUtils.js");
const deterministicTestUtils_js_1 = require("../utils/deterministicTestUtils.js");
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
describe('commissionMachineWithProgress', () => {
    let mockServer;
    let mockMaasClient;
    let mockSendNotification;
    let mockToolCallback;
    let abortController;
    beforeEach(() => {
        // Setup fake timers for deterministic testing
        (0, deterministicTestUtils_js_1.setupFakeTimers)();
        // Perform comprehensive cleanup before each test
        (0, testCleanupUtils_js_1.performComprehensiveCleanup)();
        // Setup mock server
        mockServer = {
            tool: jest.fn(),
        };
        // Setup mock MAAS client
        mockMaasClient = {
            post: jest.fn(),
            get: jest.fn()
        };
        // Setup mock send notification with immediate resolution for deterministic behavior
        mockSendNotification = jest.fn().mockImplementation(() => Promise.resolve());
        // Create a fresh abort controller for each test
        abortController = new AbortController();
        // Register the tool
        (0, commissionMachineWithProgress_js_1.registerCommissionMachineWithProgressTool)(mockServer, mockMaasClient);
        // Capture the tool callback
        mockToolCallback = mockServer.tool.mock.calls[0][2];
    });
    it('should register the tool with the MCP server', () => {
        expect(mockServer.tool).toHaveBeenCalledWith('maas_commission_machine_with_progress', expect.any(Object), expect.any(Function));
    });
    it('should handle successful commissioning', async () => {
        // Create a local abort controller for this test
        const localAbortController = new AbortController();
        try {
            // Mock successful commissioning with deterministic response
            const commissionResponse = { system_id: 'test-machine', hostname: 'test-host', status_name: 'COMMISSIONING' };
            mockMaasClient.post.mockResolvedValue(commissionResponse);
            // Setup sequential responses for status checks with deterministic behavior
            const statusResponses = [
                { status_name: 'COMMISSIONING' },
                { status_name: 'TESTING' },
                { status_name: 'READY' }
            ];
            // Use deterministic sequential mock with proper typing
            mockMaasClient.get.mockImplementation((endpoint, params, signal) => {
                const response = statusResponses[mockMaasClient.get.mock.calls.length - 1] || statusResponses[statusResponses.length - 1];
                return Promise.resolve(response);
            });
            // Create sync points to ensure notifications are sent in the correct order
            const notificationSyncPoints = [];
            for (let i = 0; i < 5; i++) { // Expect at least 5 notifications
                notificationSyncPoints.push((0, deterministicTestUtils_js_1.createSyncPoint)());
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
                enable_ssh: true,
                commissioning_scripts: ['commissioning-script-1', 'commissioning-script-2'],
                _meta: { progressToken: 'test-token' }
            };
            // Start the commissioning process
            const resultPromise = mockToolCallback(params, {
                signal: localAbortController.signal,
                sendNotification: mockSendNotification
            });
            // Wait for the first notification (commissioning started)
            await notificationSyncPoints[0].wait();
            // Advance timers to trigger status polling
            (0, deterministicTestUtils_js_1.advanceTimersByTime)(5000);
            await (0, deterministicTestUtils_js_1.waitForTicks)(2);
            // Wait for the second notification (after first status check)
            await notificationSyncPoints[1].wait();
            // Advance timers again for next status check
            (0, deterministicTestUtils_js_1.advanceTimersByTime)(5000);
            await (0, deterministicTestUtils_js_1.waitForTicks)(2);
            // Wait for the third notification (after second status check)
            await notificationSyncPoints[2].wait();
            // Advance timers for final status check
            (0, deterministicTestUtils_js_1.advanceTimersByTime)(5000);
            await (0, deterministicTestUtils_js_1.waitForTicks)(2);
            // Get the final result
            const result = await resultPromise;
            // Verify MAAS API calls
            expect(mockMaasClient.post).toHaveBeenCalledWith('/machines/test-machine', expect.objectContaining({
                op: 'commission',
                enable_ssh: 'true',
                commissioning_scripts: 'commissioning-script-1,commissioning-script-2'
            }), expect.any(AbortSignal));
            expect(mockMaasClient.get).toHaveBeenCalledWith('/machines/test-machine', undefined, expect.any(AbortSignal));
            // Verify notifications were sent
            expect(mockSendNotification).toHaveBeenCalled();
            expect(mockSendNotification.mock.calls.length).toBeGreaterThanOrEqual(3);
            // Verify result structure
            expect(result).toBeDefined();
            expect(result.content).toBeDefined();
            expect(result.content[0].type).toBe('resource');
            expect(result.content[0].resource.uri).toContain('test-machine');
        }
        catch (error) {
            fail(`Test should not have thrown an error: ${error}`);
        }
        finally {
            // Clean up resources specific to this test
            (0, testCleanupUtils_js_1.safeAbortController)(localAbortController);
        }
    });
    it('should handle commissioning failure', async () => {
        // Create a local abort controller for this test
        const localAbortController = new AbortController();
        try {
            // Mock failed commissioning with deterministic response
            const commissionResponse = { system_id: 'test-machine', hostname: 'test-host', status_name: 'COMMISSIONING' };
            mockMaasClient.post.mockResolvedValue(commissionResponse);
            // Setup sequential responses for status checks with deterministic behavior
            const statusResponses = [
                { status_name: 'COMMISSIONING' },
                { status_name: 'FAILED_COMMISSIONING' }
            ];
            // Use deterministic sequential mock with proper typing
            mockMaasClient.get.mockImplementation((endpoint, params, signal) => {
                const response = statusResponses[mockMaasClient.get.mock.calls.length - 1] || statusResponses[statusResponses.length - 1];
                return Promise.resolve(response);
            });
            // Create sync points to ensure notifications are sent in the correct order
            const notificationSyncPoints = [];
            for (let i = 0; i < 4; i++) { // Expect at least 4 notifications
                notificationSyncPoints.push((0, deterministicTestUtils_js_1.createSyncPoint)());
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
            // Start the commissioning process
            const resultPromise = mockToolCallback(params, {
                signal: localAbortController.signal,
                sendNotification: mockSendNotification
            });
            // Wait for the first notification (commissioning started)
            await notificationSyncPoints[0].wait();
            // Advance timers to trigger status polling
            (0, deterministicTestUtils_js_1.advanceTimersByTime)(5000);
            await (0, deterministicTestUtils_js_1.waitForTicks)(2);
            // Wait for the second notification (after first status check)
            await notificationSyncPoints[1].wait();
            // Advance timers again for next status check
            (0, deterministicTestUtils_js_1.advanceTimersByTime)(5000);
            await (0, deterministicTestUtils_js_1.waitForTicks)(2);
            // Get the final result
            const result = await resultPromise;
            // Verify error response
            expect(result).toMatchObject({
                isError: true,
                content: expect.arrayContaining([
                    expect.objectContaining({
                        type: 'text',
                        text: expect.stringContaining('Commissioning failed')
                    })
                ])
            });
            // Verify API calls
            expect(mockMaasClient.post).toHaveBeenCalled();
            expect(mockMaasClient.get).toHaveBeenCalled();
            expect(mockSendNotification).toHaveBeenCalled();
            expect(mockSendNotification.mock.calls.length).toBeGreaterThanOrEqual(2);
        }
        catch (error) {
            fail(`Test should not have thrown an error: ${error}`);
        }
        finally {
            // Clean up resources specific to this test
            (0, testCleanupUtils_js_1.safeAbortController)(localAbortController);
        }
    });
    it('should handle aborted commissioning', async () => {
        // Create a local abort controller for this test
        const localAbortController = new AbortController();
        try {
            // Create a sync point for the notification
            const notificationSyncPoint = (0, deterministicTestUtils_js_1.createSyncPoint)();
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
        }
        catch (error) {
            fail(`Test should not have thrown an error: ${error}`);
        }
        finally {
            // No need to abort the controller as it's already aborted
        }
    });
    it('should abort an in-progress commissioning when signal is aborted', async () => {
        // Create a local abort controller for this test
        const localAbortController = new AbortController();
        try {
            // Mock successful initial commissioning with deterministic response
            const commissionResponse = { system_id: 'test-machine', hostname: 'test-host', status_name: 'COMMISSIONING' };
            mockMaasClient.post.mockResolvedValue(commissionResponse);
            // Setup the first status check to return COMMISSIONING
            mockMaasClient.get.mockResolvedValueOnce({ status_name: 'COMMISSIONING' });
            // Create sync points for notifications
            const initialNotificationSyncPoint = (0, deterministicTestUtils_js_1.createSyncPoint)();
            const abortNotificationSyncPoint = (0, deterministicTestUtils_js_1.createSyncPoint)();
            let notificationCount = 0;
            mockSendNotification.mockImplementation(() => {
                if (notificationCount === 0) {
                    notificationCount++;
                    initialNotificationSyncPoint.trigger();
                }
                else {
                    abortNotificationSyncPoint.trigger();
                }
                return Promise.resolve();
            });
            const params = {
                system_id: 'test-machine',
                _meta: { progressToken: 'test-token' }
            };
            // Start the commissioning
            const resultPromise = mockToolCallback(params, {
                signal: localAbortController.signal,
                sendNotification: mockSendNotification
            });
            // Wait for the initial notification to confirm commissioning has started
            await initialNotificationSyncPoint.wait();
            // Advance timers to ensure post request completes
            (0, deterministicTestUtils_js_1.advanceTimersByTime)(100);
            await (0, deterministicTestUtils_js_1.waitForTicks)(2);
            // Abort the commissioning
            localAbortController.abort('User cancelled during commissioning');
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
        }
        catch (error) {
            fail(`Test should not have thrown an error: ${error}`);
        }
        finally {
            // No need to abort the controller as it's already aborted
        }
    });
    afterEach(() => {
        // Ensure comprehensive cleanup after each test, even if it fails
        try {
            // Clean up any remaining abort controllers
            (0, testCleanupUtils_js_1.safeAbortController)(abortController);
        }
        finally {
            // Restore real timers
            (0, deterministicTestUtils_js_1.restoreRealTimers)();
            // Final cleanup to ensure all resources are released
            (0, testCleanupUtils_js_1.performComprehensiveCleanup)();
        }
    });
});
