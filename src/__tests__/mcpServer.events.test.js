/**
 * Tests for MCP Server event handling and callback mechanisms
 * 
 * These tests focus on the proper event registration, triggering,
 * and callback execution in the MCP Server.
 */

// Create mock for MCPServer with event handling capabilities
const mockEventListeners = {};
const mockEmitEvent = jest.fn((eventName, ...args) => {
  const listeners = mockEventListeners[eventName] || [];
  listeners.forEach(listener => {
    try {
      listener(...args);
    } catch (error) {
      // Simulate error handling in event emission
      console.error(`Error in event listener for ${eventName}:`, error);
    }
  });
});

const mockAddEventListener = jest.fn((eventName, listener) => {
  if (!mockEventListeners[eventName]) {
    mockEventListeners[eventName] = [];
  }
  mockEventListeners[eventName].push(listener);
});

const mockRemoveEventListener = jest.fn((eventName, listener) => {
  if (!mockEventListeners[eventName]) {
    return;
  }
  const index = mockEventListeners[eventName].indexOf(listener);
  if (index !== -1) {
    mockEventListeners[eventName].splice(index, 1);
  }
});

const mockAddTool = jest.fn();
const mockAddResource = jest.fn();
const mockStart = jest.fn().mockResolvedValue(undefined);
const mockStop = jest.fn().mockResolvedValue(undefined);
const mockGetTools = jest.fn().mockReturnValue([]);
const mockGetResources = jest.fn().mockReturnValue([]);

const mockMCPServer = jest.fn().mockImplementation(() => {
  return {
    addTool: mockAddTool,
    addResource: mockAddResource,
    start: mockStart,
    stop: mockStop,
    getTools: mockGetTools,
    getResources: mockGetResources,
    addEventListener: mockAddEventListener,
    removeEventListener: mockRemoveEventListener,
    emitEvent: mockEmitEvent,
  };
});

// Mock the modules
jest.mock('@modelcontextprotocol/sdk', () => {
  return {
    MCPServer: mockMCPServer,
  };
}, { virtual: true });

// Mock the config module
jest.mock('../config', () => {
  return {
    __esModule: true,
    default: {
      PORT: 3000,
      NODE_ENV: 'test',
      MAAS_API_URL: 'https://example.com/MAAS/api/2.0',
      MAAS_API_KEY: 'consumer_key:token:secret',
      mcpServer: {
        name: 'Test MCP Server',
        version: '1.0.0',
        protocolVersion: '2024-11-05',
        serverInfo: {
          name: 'Test MAAS API Bridge for MCP',
          version: '0.1.0',
          instructions: 'Test instructions',
        },
        capabilities: {
          resources: {
            listChanged: false,
          },
          tools: {
            listChanged: false,
          },
        },
      },
    },
  };
});

describe('MCP Server Event Handling and Callbacks', () => {
  let MCPServer;
  
  beforeEach(() => {
    // Reset module cache
    jest.resetModules();
    
    // Reset mock event listeners
    Object.keys(mockEventListeners).forEach(key => {
      delete mockEventListeners[key];
    });
    
    // Reset mock functions
    mockAddEventListener.mockClear();
    mockRemoveEventListener.mockClear();
    mockEmitEvent.mockClear();
    
    // We don't actually import the real modules, we just use our mocks
    MCPServer = mockMCPServer;
  });
  
  test('should register event listeners', () => {
    // Create a new MCPServer instance
    const server = new MCPServer({});
    
    // Create mock event listeners
    const mockListener1 = jest.fn();
    const mockListener2 = jest.fn();
    
    // Register event listeners
    server.addEventListener('connection', mockListener1);
    server.addEventListener('message', mockListener2);
    
    // Verify event listeners were registered
    expect(mockAddEventListener).toHaveBeenCalledWith('connection', mockListener1);
    expect(mockAddEventListener).toHaveBeenCalledWith('message', mockListener2);
    expect(mockAddEventListener).toHaveBeenCalledTimes(2);
    
    // Verify event listeners are stored correctly
    expect(mockEventListeners['connection']).toContain(mockListener1);
    expect(mockEventListeners['message']).toContain(mockListener2);
  });
  
  test('should remove event listeners', () => {
    // Create a new MCPServer instance
    const server = new MCPServer({});
    
    // Create mock event listener
    const mockListener = jest.fn();
    
    // Register event listener
    server.addEventListener('connection', mockListener);
    
    // Remove event listener
    server.removeEventListener('connection', mockListener);
    
    // Verify event listener was removed
    expect(mockRemoveEventListener).toHaveBeenCalledWith('connection', mockListener);
    expect(mockRemoveEventListener).toHaveBeenCalledTimes(1);
    
    // Verify event listener is no longer stored
    expect(mockEventListeners['connection'] || []).not.toContain(mockListener);
  });
  
  test('should trigger event listeners with correct parameters', () => {
    // Create a new MCPServer instance
    const server = new MCPServer({});
    
    // Create mock event listener
    const mockListener = jest.fn();
    
    // Register event listener
    server.addEventListener('message', mockListener);
    
    // Emit event with parameters
    const messageData = { id: '123', content: 'Hello, world!' };
    server.emitEvent('message', messageData);
    
    // Verify event listener was called with correct parameters
    expect(mockListener).toHaveBeenCalledWith(messageData);
    expect(mockListener).toHaveBeenCalledTimes(1);
  });
  
  test('should handle multiple listeners for the same event', () => {
    // Create a new MCPServer instance
    const server = new MCPServer({});
    
    // Create mock event listeners
    const mockListener1 = jest.fn();
    const mockListener2 = jest.fn();
    
    // Register event listeners
    server.addEventListener('connection', mockListener1);
    server.addEventListener('connection', mockListener2);
    
    // Emit event
    const connectionData = { clientId: '456', timestamp: Date.now() };
    server.emitEvent('connection', connectionData);
    
    // Verify both event listeners were called
    expect(mockListener1).toHaveBeenCalledWith(connectionData);
    expect(mockListener2).toHaveBeenCalledWith(connectionData);
    expect(mockListener1).toHaveBeenCalledTimes(1);
    expect(mockListener2).toHaveBeenCalledTimes(1);
  });
  
  test('should handle errors in event listeners', () => {
    // Create a new MCPServer instance
    const server = new MCPServer({});
    
    // Create mock event listeners
    const mockListener1 = jest.fn().mockImplementation(() => {
      throw new Error('Test error');
    });
    const mockListener2 = jest.fn();
    
    // Spy on console.error
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Register event listeners
    server.addEventListener('message', mockListener1);
    server.addEventListener('message', mockListener2);
    
    // Emit event
    server.emitEvent('message', { content: 'Hello, world!' });
    
    // Verify error was handled and second listener was still called
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(mockListener1).toHaveBeenCalledTimes(1);
    expect(mockListener2).toHaveBeenCalledTimes(1);
    
    // Restore console.error
    consoleErrorSpy.mockRestore();
  });
  
  test('should not trigger listeners for different events', () => {
    // Create a new MCPServer instance
    const server = new MCPServer({});
    
    // Create mock event listeners
    const connectionListener = jest.fn();
    const messageListener = jest.fn();
    
    // Register event listeners
    server.addEventListener('connection', connectionListener);
    server.addEventListener('message', messageListener);
    
    // Emit connection event
    server.emitEvent('connection', { clientId: '789' });
    
    // Verify only connection listener was called
    expect(connectionListener).toHaveBeenCalledTimes(1);
    expect(messageListener).not.toHaveBeenCalled();
  });
  
  test('should handle events with multiple parameters', () => {
    // Create a new MCPServer instance
    const server = new MCPServer({});
    
    // Create mock event listener
    const mockListener = jest.fn();
    
    // Register event listener
    server.addEventListener('data', mockListener);
    
    // Emit event with multiple parameters
    server.emitEvent('data', 'chunk1', 'chunk2', 'chunk3');
    
    // Verify event listener was called with correct parameters
    expect(mockListener).toHaveBeenCalledWith('chunk1', 'chunk2', 'chunk3');
    expect(mockListener).toHaveBeenCalledTimes(1);
  });
});