import { registerCommissionMachineWithProgressTool } from '../../mcp_tools/commissionMachineWithProgress.js';
import { MaasApiClient } from '../../maas/MaasApiClient.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Mock dependencies
jest.mock('../../maas/MaasApiClient.js');
jest.mock('@modelcontextprotocol/sdk/server/mcp.js');
jest.mock('../../utils/logger.js', () => ({
  createRequestLogger: jest.fn().mockReturnValue({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  })
}));

describe('commissionMachineWithProgress', () => {
  let mockServer: jest.Mocked<McpServer>;
  let mockMaasClient: jest.Mocked<MaasApiClient>;
  let mockSendNotification: jest.Mock;
  let mockToolCallback: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock server
    mockServer = {
      tool: jest.fn(),
    } as unknown as jest.Mocked<McpServer>;
    
    // Setup mock MAAS client
    mockMaasClient = {
      post: jest.fn(),
      get: jest.fn()
    } as unknown as jest.Mocked<MaasApiClient>;
    
    // Setup mock send notification
    mockSendNotification = jest.fn();
    
    // Register the tool
    registerCommissionMachineWithProgressTool(mockServer, mockMaasClient);
    
    // Capture the tool callback
    mockToolCallback = mockServer.tool.mock.calls[0][2] as unknown as jest.Mock;
  });

  it('should register the tool with the MCP server', () => {
    expect(mockServer.tool).toHaveBeenCalledWith(
      'maas_commission_machine_with_progress',
      expect.any(Object),
      expect.any(Function)
    );
  });

  it('should handle successful commissioning', async () => {
    // Mock successful commissioning
    mockMaasClient.post.mockResolvedValue({ status: 'success' });
    mockMaasClient.get
      .mockResolvedValueOnce({ status_name: 'COMMISSIONING' })
      .mockResolvedValueOnce({ status_name: 'TESTING' })
      .mockResolvedValueOnce({ status_name: 'READY' });

    const params = {
      system_id: 'test-machine',
      enable_ssh: true,
      commissioning_scripts: ['commissioning-script-1', 'commissioning-script-2'],
      _meta: { progressToken: 'test-token' }
    };

    const result = await mockToolCallback(params, {
      signal: new AbortController().signal as AbortSignal,
      sendNotification: mockSendNotification
    });

    expect(mockMaasClient.post).toHaveBeenCalledWith(
      '/machines/test-machine',
      expect.objectContaining({
        op: 'commission',
        enable_ssh: 'true',
        commissioning_scripts: 'commissioning-script-1,commissioning-script-2'
      }),
      expect.any(AbortSignal)
    );
    
    expect(mockMaasClient.get).toHaveBeenCalledWith(
      '/machines/test-machine',
      undefined,
      expect.any(AbortSignal)
    );
    
    expect(mockSendNotification).toHaveBeenCalled();
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe('resource');
    expect(result.content[0].resource.uri).toContain('test-machine');
  });

  it('should handle commissioning failure', async () => {
    // Mock failed commissioning
    mockMaasClient.post.mockResolvedValue({ status: 'success' });
    mockMaasClient.get
      .mockResolvedValueOnce({ status_name: 'COMMISSIONING' })
      .mockResolvedValueOnce({ status_name: 'FAILED_COMMISSIONING' });

    const params = {
      system_id: 'test-machine',
      _meta: { progressToken: 'test-token' }
    };

    await expect(mockToolCallback(params, {
      signal: new AbortController().signal as AbortSignal,
      sendNotification: mockSendNotification
    })).resolves.toMatchObject({
      isError: true,
      content: expect.arrayContaining([
        expect.objectContaining({
          type: 'text',
          text: expect.stringContaining('Commissioning failed')
        })
      ])
    });
    
    expect(mockMaasClient.post).toHaveBeenCalled();
    expect(mockMaasClient.get).toHaveBeenCalled();
    expect(mockSendNotification).toHaveBeenCalled();
  });

  it('should handle aborted commissioning', async () => {
    // Create an aborted signal
    const controller = new AbortController() as AbortController;
    controller.abort('User cancelled');

    const params = {
      system_id: 'test-machine',
      _meta: { progressToken: 'test-token' }
    };

    await expect(mockToolCallback(params, {
      signal: controller.signal,
      sendNotification: mockSendNotification
    })).resolves.toMatchObject({
      isError: true,
      content: expect.arrayContaining([
        expect.objectContaining({
          type: 'text',
          text: expect.stringContaining('aborted')
        })
      ])
    });
    
    expect(mockSendNotification).toHaveBeenCalled();
  });
});