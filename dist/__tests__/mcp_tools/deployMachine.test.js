"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const MaasApiClient_ts_1 = require("../../maas/MaasApiClient.ts");
const deployMachine_ts_1 = require("../../mcp_tools/deployMachine.ts");
const logger_ts_1 = require("../../utils/logger.ts");
// Mock MaasApiClient
jest.mock("../../maas/MaasApiClient.ts");
jest.mock("../../utils/logger.ts", () => ({
    createRequestLogger: jest.fn().mockReturnValue({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    }),
}));
const MockMaasApiClient = MaasApiClient_ts_1.MaasApiClient;
describe("Machine Deployment MCP Tool (maas_deploy_machine)", () => {
    let server;
    let mockMaasClient;
    let mockSendNotification;
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        server = new mcp_js_1.McpServer({
            name: "test-server",
            version: "0.1.0",
            description: "Test MCP Server",
            tools: [],
            resources: [],
        });
        mockMaasClient = new MockMaasApiClient();
        mockSendNotification = jest.fn();
        (0, deployMachine_ts_1.registerDeployMachineTool)(server, mockMaasClient);
    });
    afterEach(() => {
        jest.useRealTimers();
    });
    const getDefaultParams = (overrides = {}) => {
        const baseMeta = {
            toolId: "maas_deploy_machine",
            progressToken: "test-progress-token",
            requestId: "test-request-id",
            sessionId: "test-session-id",
            userId: "test-user-id",
        };
        const baseParams = {
            system_id: "test-machine-id",
            _meta: baseMeta,
        };
        // Simple merge, for _meta, if overrides._meta exists, it replaces baseParams._meta entirely
        // For a deep merge of _meta, more complex logic would be needed if only partial _meta overrides are common.
        if (overrides._meta) {
            return { ...baseParams, ...overrides, _meta: { ...baseParams._meta, ...overrides._meta } };
        }
        return { ...baseParams, ...overrides };
    };
    const executeTool = async (params, signal) => {
        const toolDefinition = server.tools.get("maas_deploy_machine");
        if (!toolDefinition)
            throw new Error("Tool maas_deploy_machine not found");
        return toolDefinition.handler(params, { signal, sendNotification: mockSendNotification });
    };
    test("should construct correct payload and call maasClient.post for basic deployment", async () => {
        mockMaasClient.post.mockResolvedValueOnce({}); // Initial deploy call
        mockMaasClient.get.mockResolvedValueOnce({ status_name: "DEPLOYED" }); // Status poll
        const params = getDefaultParams();
        await executeTool(params);
        expect(mockMaasClient.post).toHaveBeenCalledWith(`/machines/${params.system_id}`, { op: "deploy" }, undefined // signal
        );
        expect(logger_ts_1.createRequestLogger).toHaveBeenCalledWith(expect.any(String), 'maas_deploy_machine', params);
    });
    test("should construct correct payload with all optional parameters", async () => {
        mockMaasClient.post.mockResolvedValueOnce({});
        mockMaasClient.get.mockResolvedValueOnce({ status_name: "DEPLOYED" });
        const params = getDefaultParams({
            osystem: "ubuntu",
            distro_series: "focal",
            user_data: "cloud-init-data",
            enable_hw_sync: true,
        });
        await executeTool(params);
        expect(mockMaasClient.post).toHaveBeenCalledWith(`/machines/${params.system_id}`, {
            op: "deploy",
            osystem: "ubuntu",
            distro_series: "focal",
            user_data: "cloud-init-data",
            enable_hw_sync: "true",
        }, undefined);
    });
    test("should handle successful deployment scenario with progress notifications", async () => {
        mockMaasClient.post.mockResolvedValueOnce({});
        mockMaasClient.get
            .mockResolvedValueOnce({ status_name: "DEPLOYING" })
            .mockResolvedValueOnce({ status_name: "DEPLOYING" })
            .mockResolvedValueOnce({ status_name: "DEPLOYED" });
        const params = getDefaultParams();
        const promise = executeTool(params);
        // Initial progress
        expect(mockSendNotification).toHaveBeenCalledWith({
            method: "notifications/progress",
            params: { progressToken: params._meta.progressToken, progress: 0, total: 100, message: `Initiating deployment for machine ${params.system_id}...` }
        });
        // After post
        await jest.advanceTimersByTimeAsync(0); // Allow microtasks to run for the first sendProgress after post
        expect(mockSendNotification).toHaveBeenCalledWith({
            method: "notifications/progress",
            params: { progressToken: params._meta.progressToken, progress: 10, total: 100, message: "Deployment command sent to MAAS. Monitoring status..." }
        });
        // First poll: DEPLOYING
        await jest.advanceTimersByTimeAsync(5000);
        expect(mockMaasClient.get).toHaveBeenCalledTimes(1);
        expect(mockSendNotification).toHaveBeenCalledWith({
            method: "notifications/progress",
            params: { progressToken: params._meta.progressToken, progress: 15, total: 100, message: `Deploying operating system to machine ${params.system_id}...` }
        });
        // Second poll: DEPLOYING
        await jest.advanceTimersByTimeAsync(5000);
        expect(mockMaasClient.get).toHaveBeenCalledTimes(2);
        expect(mockSendNotification).toHaveBeenCalledWith({
            method: "notifications/progress",
            params: { progressToken: params._meta.progressToken, progress: 20, total: 100, message: `Deploying operating system to machine ${params.system_id}...` }
        });
        // Third poll: DEPLOYED
        await jest.advanceTimersByTimeAsync(5000);
        expect(mockMaasClient.get).toHaveBeenCalledTimes(3);
        expect(mockSendNotification).toHaveBeenCalledWith({
            method: "notifications/progress",
            params: { progressToken: params._meta.progressToken, progress: 100, total: 100, message: "Deployment successfully completed." }
        });
        const result = await promise;
        expect(result).toEqual({
            content: [{
                    type: "json",
                    data: {
                        system_id: params.system_id,
                        status: "DEPLOYED",
                        completed: true,
                    }
                }]
        });
        expect(mockSendNotification).toHaveBeenCalledTimes(5); // 0%, 10%, 15%, 20%, 100%
    });
    test("should handle deployment failure scenario with progress notifications", async () => {
        mockMaasClient.post.mockResolvedValueOnce({});
        mockMaasClient.get
            .mockResolvedValueOnce({ status_name: "DEPLOYING" })
            .mockResolvedValueOnce({ status_name: "FAILED_DEPLOYMENT" });
        const params = getDefaultParams();
        const promise = executeTool(params);
        await jest.advanceTimersByTimeAsync(0); // Initial, post-send
        await jest.advanceTimersByTimeAsync(5000); // First poll (DEPLOYING)
        // Second poll (FAILED_DEPLOYMENT)
        await jest.advanceTimersByTimeAsync(5000);
        expect(mockMaasClient.get).toHaveBeenCalledTimes(2);
        expect(mockSendNotification).toHaveBeenCalledWith({
            method: "notifications/progress",
            params: { progressToken: params._meta.progressToken, progress: 100, total: 100, message: "Deployment failed with status: FAILED_DEPLOYMENT" }
        });
        const result = await promise;
        expect(result).toEqual({
            content: [{ type: "text", text: `Error deploying machine ${params.system_id}: Deployment failed with status: FAILED_DEPLOYMENT` }],
            isError: true
        });
        // Also check the final error progress (which might be the same as the one above if error is thrown immediately)
        expect(mockSendNotification).toHaveBeenLastCalledWith({
            method: "notifications/progress",
            params: { progressToken: params._meta.progressToken, progress: 100, total: 100, message: "Error during deployment: Deployment failed with status: FAILED_DEPLOYMENT" }
        });
        expect(mockSendNotification).toHaveBeenCalledTimes(5); // 0, 10, 15 (deploying), 100 (failed), 100 (error)
    });
    test("should handle deployment timeout scenario with progress notifications", async () => {
        mockMaasClient.post.mockResolvedValueOnce({});
        // Simulate status never changing from DEPLOYING
        mockMaasClient.get.mockResolvedValue({ status_name: "DEPLOYING" });
        const params = getDefaultParams();
        const promise = executeTool(params);
        // Let it poll maxPolls times (60)
        for (let i = 0; i < 60; i++) {
            await jest.advanceTimersByTimeAsync(5000);
        }
        expect(mockMaasClient.get).toHaveBeenCalledTimes(60);
        // The last progress before timeout message
        const expectedProgressBeforeTimeout = 10 + (5 * 60); // 10 initial + 5 for each of 60 polls
        const cappedProgress = Math.min(expectedProgressBeforeTimeout, 70); // Capped at 70 for DEPLOYING
        expect(mockSendNotification).toHaveBeenCalledWith({
            method: "notifications/progress",
            params: { progressToken: params._meta.progressToken, progress: cappedProgress, message: `Deploying operating system to machine ${params.system_id}...` }
        });
        // Timeout message
        await jest.advanceTimersByTimeAsync(0); // allow final promise to resolve
        expect(mockSendNotification).toHaveBeenCalledWith({
            method: "notifications/progress",
            params: { progressToken: params._meta.progressToken, progress: cappedProgress, total: 100, message: "Deployment monitoring timed out. Last status: DEPLOYING" }
        });
        const result = await promise;
        expect(result).toEqual({
            content: [{
                    type: "json",
                    data: {
                        system_id: params.system_id,
                        status: "DEPLOYING", // Last known status
                        completed: false,
                    }
                }]
        });
    });
    test("should handle client cancellation (AbortSignal) during polling", async () => {
        mockMaasClient.post.mockResolvedValueOnce({});
        mockMaasClient.get.mockResolvedValue({ status_name: "DEPLOYING" });
        const params = getDefaultParams();
        const controller = new AbortController();
        const promise = executeTool(params, controller.signal);
        await jest.advanceTimersByTimeAsync(0); // Initial, post-send
        await jest.advanceTimersByTimeAsync(5000); // First poll
        expect(mockSendNotification).toHaveBeenCalledWith({
            method: "notifications/progress",
            params: { progressToken: params._meta.progressToken, progress: 15, total: 100, message: `Deploying operating system to machine ${params.system_id}...` }
        });
        controller.abort(); // Abort after the first poll
        await jest.advanceTimersByTimeAsync(5000); // Attempt next poll cycle
        try {
            await promise;
        }
        catch (e) {
            // Error is expected to be caught by the tool's try/catch and returned as error content
        }
        const result = await promise;
        expect(mockSendNotification).toHaveBeenCalledWith({
            method: "notifications/progress",
            params: { progressToken: params._meta.progressToken, progress: 15, total: 100, message: "Deployment monitoring cancelled by client." }
        });
        expect(result).toEqual({
            content: [{ type: "text", text: `Error deploying machine ${params.system_id}: Deployment monitoring cancelled by client.` }],
            isError: true
        });
    });
    test("should handle error if initial maasClient.post call fails", async () => {
        const postError = new Error("MAAS API POST Error");
        mockMaasClient.post.mockRejectedValueOnce(postError);
        const params = getDefaultParams();
        const result = await executeTool(params);
        expect(mockSendNotification).toHaveBeenCalledWith({
            method: "notifications/progress",
            params: { progressToken: params._meta.progressToken, progress: 0, total: 100, message: `Initiating deployment for machine ${params.system_id}...` }
        });
        expect(mockSendNotification).toHaveBeenCalledWith({
            method: "notifications/progress",
            params: { progressToken: params._meta.progressToken, progress: 0, total: 100, message: `Error during deployment: ${postError.message}` }
        });
        expect(result).toEqual({
            content: [{ type: "text", text: `Error deploying machine ${params.system_id}: ${postError.message}` }],
            isError: true
        });
        expect(mockMaasClient.get).not.toHaveBeenCalled();
    });
    test("should handle error if maasClient.get for status polling fails", async () => {
        const getError = new Error("MAAS API GET Error");
        mockMaasClient.post.mockResolvedValueOnce({});
        mockMaasClient.get.mockRejectedValueOnce(getError);
        const params = getDefaultParams();
        const result = await executeTool(params);
        await jest.advanceTimersByTimeAsync(5000); // Allow first poll attempt
        expect(mockSendNotification).toHaveBeenCalledWith({
            method: "notifications/progress",
            params: { progressToken: params._meta.progressToken, progress: 10, total: 100, message: `Error during deployment: ${getError.message}` }
        });
        expect(result).toEqual({
            content: [{ type: "text", text: `Error deploying machine ${params.system_id}: ${getError.message}` }],
            isError: true
        });
    });
    test("should not send progress notification if sendNotification is undefined", async () => {
        mockMaasClient.post.mockResolvedValueOnce({});
        mockMaasClient.get.mockResolvedValueOnce({ status_name: "DEPLOYED" });
        const params = getDefaultParams();
        const toolDefinition = server.tools.get("maas_deploy_machine");
        if (!toolDefinition)
            throw new Error("Tool maas_deploy_machine not found");
        await toolDefinition.handler(params, { signal: undefined, sendNotification: undefined }); // Pass undefined sendNotification
        expect(mockSendNotification).not.toHaveBeenCalled();
    });
    test("should not send progress notification if progressToken is undefined", async () => {
        mockMaasClient.post.mockResolvedValueOnce({});
        mockMaasClient.get.mockResolvedValueOnce({ status_name: "DEPLOYED" });
        const params = getDefaultParams();
        if (params._meta) { // Type guard
            params._meta.progressToken = undefined; // Set to undefined
        }
        await executeTool(params);
        expect(mockSendNotification).not.toHaveBeenCalled();
    });
    test("should handle enable_hw_sync: false correctly", async () => {
        mockMaasClient.post.mockResolvedValueOnce({});
        mockMaasClient.get.mockResolvedValueOnce({ status_name: "DEPLOYED" });
        const params = getDefaultParams({
            enable_hw_sync: false,
        });
        await executeTool(params);
        expect(mockMaasClient.post).toHaveBeenCalledWith(`/machines/${params.system_id}`, {
            op: "deploy",
            enable_hw_sync: "false", // Ensure it's a string "false"
        }, undefined);
    });
});
