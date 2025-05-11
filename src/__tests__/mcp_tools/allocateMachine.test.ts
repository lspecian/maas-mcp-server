import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MaasApiClient } from '../../maas/MaasApiClient.js';
import { registerAllocateMachineTool } from '../../mcp_tools/allocateMachine.js';
// z is not directly used in tests but is part of the tool's dependencies, so keeping it for context.
// import { z } from 'zod';

// --- Mocks ---
const mockMaasPost = jest.fn();
jest.mock('../../maas/MaasApiClient.js', () => {
  // Mock the class constructor
  const MockMaasApiClient = jest.fn().mockImplementation((_config?: any) => {
    return {
      post: mockMaasPost,
    };
  });
  return { MaasApiClient: MockMaasApiClient };
});

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
jest.mock('../../utils/logger.js', () => ({
  createRequestLogger: jest.fn(() => mockLogger),
}));

// --- Test Setup ---
let toolHandler: (params: any, context: { signal?: AbortSignal, sendNotification?: jest.Mock<any, any> }) => Promise<any>;
const mockSendNotification = jest.fn();

// Initialize maasClientInstance with the mocked implementation
const maasClientInstance = new (MaasApiClient as any)({ // Cast to any to bypass constructor type check for mock
  baseURL: 'http://mock-maas',
  consumerKey: 'key',
  consumerSecret: 'secret',
  tokenKey: 'token',
  tokenSecret: 'tokenSecret',
});

beforeAll(() => {
  const server = {
    tool: jest.fn((name, schema, handler) => {
      // Assuming 'maas_allocate_machine' is the correct tool name
      if (name === 'maas_allocate_machine') {
        toolHandler = handler;
      }
    }),
  } as unknown as McpServer;
  registerAllocateMachineTool(server, maasClientInstance);
});

beforeEach(() => {
  mockMaasPost.mockReset();
  mockSendNotification.mockReset();
  mockLogger.info.mockReset();
  mockLogger.warn.mockReset();
  mockLogger.error.mockReset();
});

// --- Tests ---
describe('allocateMachine MCP Tool', () => {
  describe('Parameter Transformation', () => {
    it('should transform min_cpu_count, min_memory, min_storage correctly', async () => {
      mockMaasPost.mockResolvedValue({ system_id: 'test-sys-id' });
      const params = {
        min_cpu_count: 4,
        min_memory: 8192, // MB
        min_storage: 100,  // GB
        _meta: { progressToken: 'token' },
      };
      await toolHandler(params, { sendNotification: mockSendNotification });
      expect(mockMaasPost).toHaveBeenCalledWith(
        '/machines',
        expect.objectContaining({
          op: 'allocate',
          cpu_count: '4',
          mem: '8192',
          storage: '100',
        }),
        undefined // signal
      );
    });

    it('should transform tags and not_tags to comma-separated strings', async () => {
      mockMaasPost.mockResolvedValue({ system_id: 'test-sys-id' });
      const params = {
        tags: ['tagA', 'tagB'],
        not_tags: ['tagC', 'tagD'],
        _meta: { progressToken: 'token' },
      };
      await toolHandler(params, { sendNotification: mockSendNotification });
      expect(mockMaasPost).toHaveBeenCalledWith(
        '/machines',
        expect.objectContaining({
          op: 'allocate',
          tags: 'tagA,tagB',
          not_tags: 'tagC,tagD',
        }),
        undefined
      );
    });

    it('should pass name, system_id, zone, pool directly', async () => {
      mockMaasPost.mockResolvedValue({ system_id: 'test-sys-id' });
      const params = {
        name: 'my-machine',
        system_id: 'specific-id',
        zone: 'zone-1',
        pool: 'pool-A',
        _meta: { progressToken: 'token' },
      };
      await toolHandler(params, { sendNotification: mockSendNotification });
      expect(mockMaasPost).toHaveBeenCalledWith(
        '/machines',
        expect.objectContaining({
          op: 'allocate',
          name: 'my-machine',
          system_id: 'specific-id',
          zone: 'zone-1',
          pool: 'pool-A',
        }),
        undefined
      );
    });

    it('should not include undefined parameters or empty arrays in MAAS request', async () => {
        mockMaasPost.mockResolvedValue({ system_id: 'test-sys-id' });
        const params = {
            tags: [], // Empty array
            _meta: { progressToken: 'token' },
        };
        await toolHandler(params, { sendNotification: mockSendNotification });
        const calledWithParams = mockMaasPost.mock.calls[0][1];
        expect(calledWithParams).toEqual({ op: 'allocate' });
        expect(calledWithParams.tags).toBeUndefined();
    });
  });

  describe('Successful Allocation Scenarios', () => {
    it('should allocate a machine with no specific constraints (general pool)', async () => {
      const mockResponse = { system_id: 'new-machine-123', hostname: 'allocated-host' };
      mockMaasPost.mockResolvedValue(mockResponse);
      const params = { _meta: { progressToken: 'token' } };

      const result = await toolHandler(params, { sendNotification: mockSendNotification });

      expect(mockMaasPost).toHaveBeenCalledWith('/machines', { op: 'allocate' }, undefined);
      expect(result).toEqual({
        content: [{
          type: 'resource',
          resource: {
            uri: `maas://machine/${mockResponse.system_id}/allocation_details.json`,
            text: JSON.stringify(mockResponse),
            mimeType: 'application/json'
          }
        }],
      });
      expect(mockLogger.info).toHaveBeenCalledWith({ systemId: 'new-machine-123' }, 'Successfully allocated machine');
    });

    it('should allocate a specific machine by system_id', async () => {
      const mockResponse = { system_id: 'specific-machine-id', hostname: 'specific-host' };
      mockMaasPost.mockResolvedValue(mockResponse);
      const params = { system_id: 'specific-machine-id', _meta: { progressToken: 'token' } };

      const result = await toolHandler(params, { sendNotification: mockSendNotification });

      expect(mockMaasPost).toHaveBeenCalledWith('/machines', { op: 'allocate', system_id: 'specific-machine-id' }, undefined);
      expect(result).toEqual({
        content: [{
          type: 'resource',
          resource: {
            uri: `maas://machine/${mockResponse.system_id}/allocation_details.json`,
            text: JSON.stringify(mockResponse),
            mimeType: 'application/json'
          }
        }],
      });
    });

    it('should allocate with a combination of constraints', async () => {
        const mockResponse = { system_id: 'combo-machine', hostname: 'combo-host' };
        mockMaasPost.mockResolvedValue(mockResponse);
        const params = {
            name: 'combo-machine-name',
            min_cpu_count: 2,
            min_memory: 4096,
            tags: ['fast', 'reliable'],
            zone: 'edge-zone',
            _meta: { progressToken: 'token' },
        };

        await toolHandler(params, { sendNotification: mockSendNotification });

        expect(mockMaasPost).toHaveBeenCalledWith(
            '/machines',
            {
                op: 'allocate',
                name: 'combo-machine-name',
                cpu_count: '2',
                mem: '4096',
                tags: 'fast,reliable',
                zone: 'edge-zone',
            },
            undefined
        );
    });
  });

  describe('Error Handling', () => {
    it('should return an error response if MAAS API call fails', async () => {
      const apiError = new Error('MAAS API Allocation Failed');
      mockMaasPost.mockRejectedValue(apiError);
      const params = { name: 'error-test-machine', _meta: { progressToken: 'token' } };

      const result = await toolHandler(params, { sendNotification: mockSendNotification });

      expect(result).toEqual({
        content: [{ type: 'text', text: `Error allocating machine: ${apiError.message}` }],
        isError: true,
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ error: apiError.message, stack: expect.stringContaining('Error: MAAS API Allocation Failed') }),
        'Error allocating machine'
      );
    });

    it('should handle MAAS API returning null result gracefully', async () => {
        mockMaasPost.mockResolvedValue(null);
        const params = { name: 'null-test-machine', _meta: { progressToken: 'token' } };

        const result = await toolHandler(params, { sendNotification: mockSendNotification });

        expect(result).toEqual({
            content: [{
              type: 'resource',
              resource: {
                uri: 'maas://machine/unknown/allocation_details.json',
                text: 'null',
                mimeType: 'application/json'
              }
            }],
        });
        expect(mockLogger.info).toHaveBeenCalledWith({ systemId: undefined }, 'Successfully allocated machine');
    });
  });

  describe('Progress Notifications', () => {
    const progressToken = 'test-progress-token';

    it('should send correct progress notifications on successful allocation', async () => {
      mockMaasPost.mockResolvedValue({ system_id: 'progress-machine' });
      const params = { name: 'progress-test', _meta: { progressToken } };

      await toolHandler(params, { sendNotification: mockSendNotification });

      expect(mockSendNotification).toHaveBeenCalledTimes(3);
      expect(mockSendNotification).toHaveBeenNthCalledWith(1, {
        method: 'notifications/progress',
        params: { progressToken, progress: 0, total: 100, message: 'Starting machine allocation...' },
      });
      expect(mockSendNotification).toHaveBeenNthCalledWith(2, {
        method: 'notifications/progress',
        params: { progressToken, progress: 50, total: 100, message: 'Sending allocation request to MAAS...' },
      });
      expect(mockSendNotification).toHaveBeenNthCalledWith(3, {
        method: 'notifications/progress',
        params: { progressToken, progress: 100, total: 100, message: 'Machine allocated successfully.' },
      });
    });

    it('should send correct progress notifications on failed allocation', async () => {
      const apiError = new Error('Allocation Failed During Progress Test');
      mockMaasPost.mockRejectedValue(apiError);
      const params = { name: 'progress-fail-test', _meta: { progressToken } };

      await toolHandler(params, { sendNotification: mockSendNotification });

      expect(mockSendNotification).toHaveBeenCalledTimes(3);
      expect(mockSendNotification).toHaveBeenNthCalledWith(1, {
        method: 'notifications/progress',
        params: { progressToken, progress: 0, total: 100, message: 'Starting machine allocation...' },
      });
      expect(mockSendNotification).toHaveBeenNthCalledWith(2, {
        method: 'notifications/progress',
        params: { progressToken, progress: 50, total: 100, message: 'Sending allocation request to MAAS...' },
      });
      expect(mockSendNotification).toHaveBeenNthCalledWith(3, {
        method: 'notifications/progress',
        params: { progressToken, progress: 100, total: 100, message: `Error: ${apiError.message}` },
      });
    });

    it('should not send notifications if progressToken is missing', async () => {
      mockMaasPost.mockResolvedValue({ system_id: 'no-token-machine' });
      const params = { name: 'no-token-test', _meta: {} }; // No progressToken

      await toolHandler(params, { sendNotification: mockSendNotification });
      expect(mockSendNotification).not.toHaveBeenCalled();
    });
    
    it('should not send notifications if sendNotification is not provided in context', async () => {
        mockMaasPost.mockResolvedValue({ system_id: 'no-sendNotification-machine' });
        const params = { name: 'no-sendNotification-test', _meta: { progressToken } };

        await toolHandler(params, { /* sendNotification is undefined */ });
        // Check the global mockSendNotification, which shouldn't be called if the context.sendNotification is undefined
        expect(mockSendNotification).not.toHaveBeenCalled();
    });

    it('should log a warning if sending notification fails', async () => {
        mockMaasPost.mockResolvedValue({ system_id: 'notify-fail-machine' });
        // Make the passed mockSendNotification fail, not the global one directly for this test
        const failingSendNotification = jest.fn()
            .mockRejectedValueOnce(new Error('Notification send failed')) // First call fails
            .mockResolvedValue(undefined); // Subsequent calls succeed

        const params = { name: 'notify-fail-test', _meta: { progressToken } };
        await toolHandler(params, { sendNotification: failingSendNotification });

        expect(mockLogger.warn).toHaveBeenCalledWith(
            { error: 'Notification send failed' },
            'Failed to send progress notification'
        );
        expect(failingSendNotification).toHaveBeenCalledTimes(3); // All 3 attempts should be made
    });
  });
});