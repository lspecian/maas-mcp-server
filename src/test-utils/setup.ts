/**
 * Global setup for TypeScript tests
 */

import { afterEach, beforeEach } from 'vitest';

// Global setup for all tests
beforeEach(() => {
  // Setup code that runs before each test
  console.log('Setting up test environment');
  
  // Reset any mocks or global state
  resetMocks();
  resetGlobalState();
});

afterEach(() => {
  // Cleanup code that runs after each test
  console.log('Cleaning up test environment');
  
  // Reset any mocks or global state
  resetMocks();
  resetGlobalState();
});

/**
 * Reset all mocks
 */
function resetMocks(): void {
  // Reset any mocks here
  // This is a placeholder function that should be updated
  // when actual mocks are implemented
}

/**
 * Reset global state
 */
function resetGlobalState(): void {
  // Reset any global state here
  // This is a placeholder function that should be updated
  // when actual global state is used
}

/**
 * Mock console methods to prevent output during tests
 */
export function mockConsole(): () => void {
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug
  };
  
  // Replace console methods with no-op functions
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
  console.info = jest.fn();
  console.debug = jest.fn();
  
  // Return function to restore original console methods
  return () => {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
    console.debug = originalConsole.debug;
  };
}

/**
 * Mock fetch API
 * @param mockResponse - Response to return from fetch
 */
export function mockFetch(mockResponse: any): () => void {
  const originalFetch = global.fetch;
  
  global.fetch = jest.fn().mockImplementation(() => {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockResponse),
      text: () => Promise.resolve(JSON.stringify(mockResponse)),
      status: 200,
      statusText: 'OK',
      headers: new Headers()
    });
  });
  
  // Return function to restore original fetch
  return () => {
    global.fetch = originalFetch;
  };
}

/**
 * Mock WebSocket API
 */
export function mockWebSocket(): () => void {
  const originalWebSocket = global.WebSocket;
  
  // Create a mock WebSocket class
  class MockWebSocket {
    url: string;
    protocol: string;
    onopen: ((event: any) => void) | null = null;
    onclose: ((event: any) => void) | null = null;
    onmessage: ((event: any) => void) | null = null;
    onerror: ((event: any) => void) | null = null;
    readyState: number = 0; // CONNECTING
    
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    
    constructor(url: string, protocol?: string | string[]) {
      this.url = url;
      this.protocol = Array.isArray(protocol) ? protocol.join(', ') : (protocol || '');
      
      // Simulate connection
      setTimeout(() => {
        this.readyState = MockWebSocket.OPEN;
        if (this.onopen) {
          this.onopen({ target: this });
        }
      }, 0);
    }
    
    send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
      // Mock implementation
    }
    
    close(code?: number, reason?: string): void {
      this.readyState = MockWebSocket.CLOSING;
      
      setTimeout(() => {
        this.readyState = MockWebSocket.CLOSED;
        if (this.onclose) {
          this.onclose({ 
            target: this,
            code: code || 1000,
            reason: reason || '',
            wasClean: true
          });
        }
      }, 0);
    }
  }
  
  // Replace global WebSocket with mock
  global.WebSocket = MockWebSocket as any;
  
  // Return function to restore original WebSocket
  return () => {
    global.WebSocket = originalWebSocket;
  };
}

/**
 * Mock timer functions (setTimeout, setInterval, etc.)
 */
export function mockTimers(): () => void {
  jest.useFakeTimers();
  
  // Return function to restore original timers
  return () => {
    jest.useRealTimers();
  };
}

/**
 * Set up a test environment with all mocks
 */
export function setupTestEnvironment(): () => void {
  const restoreConsole = mockConsole();
  const restoreFetch = mockFetch({});
  const restoreWebSocket = mockWebSocket();
  const restoreTimers = mockTimers();
  
  // Return function to restore all mocks
  return () => {
    restoreConsole();
    restoreFetch();
    restoreWebSocket();
    restoreTimers();
  };
}