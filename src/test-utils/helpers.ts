/**
 * Helper functions for TypeScript tests
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Create a temporary file for testing
 * @param content - Content to write to the file
 * @returns Object with file path and cleanup function
 */
export function createTempFile(content: string): { path: string, cleanup: () => void } {
  const tempDir = os.tmpdir();
  const filePath = path.join(tempDir, `test-${Date.now()}.txt`);
  
  fs.writeFileSync(filePath, content);
  
  return {
    path: filePath,
    cleanup: () => {
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        console.error(`Failed to clean up temp file: ${error}`);
      }
    }
  };
}

/**
 * Create a temporary directory for testing
 * @returns Object with directory path and cleanup function
 */
export function createTempDir(): { path: string, cleanup: () => void } {
  const tempDir = os.tmpdir();
  const dirPath = path.join(tempDir, `test-${Date.now()}`);
  
  fs.mkdirSync(dirPath);
  
  return {
    path: dirPath,
    cleanup: () => {
      try {
        fs.rmdirSync(dirPath, { recursive: true });
      } catch (error) {
        console.error(`Failed to clean up temp directory: ${error}`);
      }
    }
  };
}

/**
 * Create a test file in a specified directory
 * @param dir - Directory to create the file in
 * @param name - Name of the file
 * @param content - Content to write to the file
 * @returns Path to the created file
 */
export function createTestFile(dir: string, name: string, content: string): string {
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, content);
  return filePath;
}

/**
 * Read a test file
 * @param filePath - Path to the file
 * @returns Content of the file
 */
export function readTestFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Wait for a condition to be true
 * @param condition - Function that returns a boolean or Promise<boolean>
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 * @param interval - Interval between checks in milliseconds (default: 100)
 * @returns Promise that resolves to true if the condition is met, false if timed out
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  return false;
}

/**
 * Retry a function until it succeeds or reaches the maximum number of attempts
 * @param fn - Function to retry
 * @param maxAttempts - Maximum number of attempts (default: 3)
 * @param delay - Delay between attempts in milliseconds (default: 1000)
 * @returns Promise that resolves with the function result or rejects with the last error
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Mock the current time for testing
 * @param mockDate - Date to use as the current time
 * @returns Function to restore the original Date
 */
export function mockTime(mockDate: Date): () => void {
  const originalDate = global.Date;
  
  class MockDate extends Date {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(mockDate);
      } else {
        // Handle each possible constructor signature
        if (args.length === 1) {
          super(args[0]);
        } else if (args.length === 2) {
          super(args[0], args[1]);
        } else if (args.length === 3) {
          super(args[0], args[1], args[2]);
        } else if (args.length === 4) {
          super(args[0], args[1], args[2], args[3]);
        } else if (args.length === 5) {
          super(args[0], args[1], args[2], args[3], args[4]);
        } else if (args.length === 6) {
          super(args[0], args[1], args[2], args[3], args[4], args[5]);
        } else {
          super(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
        }
      }
    }
    
    static now() {
      return mockDate.getTime();
    }
  }
  
  global.Date = MockDate as any;
  
  return () => {
    global.Date = originalDate;
  };
}

/**
 * Set environment variables for testing
 * @param vars - Object with environment variables to set
 * @returns Function to restore the original environment variables
 */
export function withEnvVars(vars: Record<string, string>): () => void {
  const originalEnv: Record<string, string | undefined> = {};
  
  // Save original values
  for (const key of Object.keys(vars)) {
    originalEnv[key] = process.env[key];
  }
  
  // Set new values
  for (const [key, value] of Object.entries(vars)) {
    process.env[key] = value;
  }
  
  // Return function to restore original values
  return () => {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };
}

/**
 * Create a mock HTTP response
 * @param status - HTTP status code
 * @param body - Response body
 * @param headers - Response headers
 * @returns Mock response object
 */
export function createMockResponse(
  status: number = 200,
  body: any = {},
  headers: Record<string, string> = {}
): { status: number, body: any, headers: Record<string, string> } {
  return {
    status,
    body,
    headers
  };
}

/**
 * Create a mock HTTP request
 * @param method - HTTP method
 * @param url - Request URL
 * @param body - Request body
 * @param headers - Request headers
 * @returns Mock request object
 */
export function createMockRequest(
  method: string = 'GET',
  url: string = '/',
  body: any = {},
  headers: Record<string, string> = {}
): { method: string, url: string, body: any, headers: Record<string, string> } {
  return {
    method,
    url,
    body,
    headers
  };
}

/**
 * Create a mock event emitter
 * @returns Mock event emitter object
 */
export function createMockEventEmitter(): {
  on: (event: string, listener: Function) => void,
  emit: (event: string, ...args: any[]) => void,
  removeListener: (event: string, listener: Function) => void,
  events: Record<string, Function[]>
} {
  const events: Record<string, Function[]> = {};
  
  return {
    on(event: string, listener: Function) {
      if (!events[event]) {
        events[event] = [];
      }
      events[event].push(listener);
    },
    
    emit(event: string, ...args: any[]) {
      if (events[event]) {
        for (const listener of events[event]) {
          listener(...args);
        }
      }
    },
    
    removeListener(event: string, listener: Function) {
      if (events[event]) {
        events[event] = events[event].filter(l => l !== listener);
      }
    },
    
    events
  };
}

/**
 * Create a mock WebSocket
 * @returns Mock WebSocket object
 */
export function createMockWebSocket(): {
  send: (data: string) => void,
  close: () => void,
  onmessage: ((event: { data: string }) => void) | null,
  onopen: (() => void) | null,
  onclose: (() => void) | null,
  onerror: ((error: any) => void) | null,
  readyState: number,
  CONNECTING: number,
  OPEN: number,
  CLOSING: number,
  CLOSED: number
} {
  return {
    send(data: string) {
      // Mock implementation
    },
    
    close() {
      this.readyState = this.CLOSED;
      if (this.onclose) {
        this.onclose();
      }
    },
    
    onmessage: null,
    onopen: null,
    onclose: null,
    onerror: null,
    
    readyState: 1, // OPEN
    
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3
  };
}