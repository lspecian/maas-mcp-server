/**
 * Mock implementations for testing TypeScript components
 */

/**
 * MockMCPClient - Mock implementation of the MCP client
 * Used for testing MCP tool and resource interactions
 */
export class MockMCPClient {
  private toolHandlers: Map<string, Function> = new Map();
  private resourceHandlers: Map<string, Function> = new Map();
  private defaultToolHandler: Function | null = null;
  private defaultResourceHandler: Function | null = null;
  
  /**
   * Mock method for handling MCP tool requests
   * @param toolName - Name of the tool to use
   * @param params - Parameters to pass to the tool
   * @returns Promise resolving to the tool's response
   */
  public async useTool(toolName: string, params: any): Promise<any> {
    const handler = this.toolHandlers.get(toolName);
    if (handler) {
      return handler(params);
    }
    
    if (this.defaultToolHandler) {
      return this.defaultToolHandler(toolName, params);
    }
    
    throw new Error(`No mock handler for tool: ${toolName}`);
  }
  
  /**
   * Mock method for handling MCP resource requests
   * @param uri - URI of the resource to access
   * @returns Promise resolving to the resource's data
   */
  public async accessResource(uri: string): Promise<any> {
    const handler = this.resourceHandlers.get(uri);
    if (handler) {
      return handler(uri);
    }
    
    // Try to match with a pattern
    for (const [pattern, handler] of this.resourceHandlers.entries()) {
      if (pattern.includes('*') && this.matchPattern(uri, pattern)) {
        return handler(uri);
      }
    }
    
    if (this.defaultResourceHandler) {
      return this.defaultResourceHandler(uri);
    }
    
    throw new Error(`No mock handler for resource: ${uri}`);
  }
  
  /**
   * Register a mock handler for a tool
   * @param toolName - Name of the tool to mock
   * @param handler - Handler function that returns the mock response
   */
  public mockTool(toolName: string, handler: Function): void {
    this.toolHandlers.set(toolName, handler);
  }
  
  /**
   * Register a mock handler for a resource
   * @param uri - URI of the resource to mock
   * @param handler - Handler function that returns the mock response
   */
  public mockResource(uri: string, handler: Function): void {
    this.resourceHandlers.set(uri, handler);
  }
  
  /**
   * Set a default handler for any tool that doesn't have a specific mock
   * @param handler - Handler function that takes toolName and params and returns a response
   */
  public setDefaultToolHandler(handler: Function): void {
    this.defaultToolHandler = handler;
  }
  
  /**
   * Set a default handler for any resource that doesn't have a specific mock
   * @param handler - Handler function that takes a URI and returns a response
   */
  public setDefaultResourceHandler(handler: Function): void {
    this.defaultResourceHandler = handler;
  }
  
  /**
   * Reset all mock handlers
   */
  public reset(): void {
    this.toolHandlers.clear();
    this.resourceHandlers.clear();
    this.defaultToolHandler = null;
    this.defaultResourceHandler = null;
  }
  
  /**
   * Check if a URI matches a pattern with wildcards
   * @param uri - The URI to check
   * @param pattern - The pattern to match against (can include * wildcards)
   * @returns True if the URI matches the pattern
   */
  private matchPattern(uri: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\//g, '\\/')
      .replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(uri);
  }
}

/**
 * MockProgressTracker - Mock implementation of a progress tracker
 * Used for testing progress reporting
 */
export class MockProgressTracker {
  private events: Array<{type: string, id: string, progress?: number, message?: string}> = [];
  
  /**
   * Start tracking progress for an operation
   * @param id - Unique identifier for the operation
   */
  public start(id: string): void {
    this.events.push({type: 'start', id});
  }
  
  /**
   * Update progress for an operation
   * @param id - Unique identifier for the operation
   * @param progress - Progress value (0-100)
   * @param message - Optional progress message
   */
  public update(id: string, progress: number, message?: string): void {
    this.events.push({type: 'update', id, progress, message});
  }
  
  /**
   * Complete an operation
   * @param id - Unique identifier for the operation
   * @param message - Optional completion message
   */
  public complete(id: string, message?: string): void {
    this.events.push({type: 'complete', id, message});
  }
  
  /**
   * Fail an operation
   * @param id - Unique identifier for the operation
   * @param message - Error message
   */
  public fail(id: string, message: string): void {
    this.events.push({type: 'fail', id, message});
  }
  
  /**
   * Get all recorded events
   * @returns Array of recorded events
   */
  public getEvents(): Array<{type: string, id: string, progress?: number, message?: string}> {
    return [...this.events];
  }
  
  /**
   * Get events for a specific operation
   * @param id - Unique identifier for the operation
   * @returns Array of events for the specified operation
   */
  public getEventsForId(id: string): Array<{type: string, id: string, progress?: number, message?: string}> {
    return this.events.filter(event => event.id === id);
  }
  
  /**
   * Clear all recorded events
   */
  public clear(): void {
    this.events = [];
  }
}

/**
 * MockLogger - Mock implementation of a logger
 * Used for testing logging functionality
 */
export class MockLogger {
  private logs: Array<{level: string, message: string, meta?: any}> = [];
  
  /**
   * Log a debug message
   * @param message - Message to log
   * @param meta - Optional metadata
   */
  public debug(message: string, meta?: any): void {
    this.logs.push({level: 'debug', message, meta});
  }
  
  /**
   * Log an info message
   * @param message - Message to log
   * @param meta - Optional metadata
   */
  public info(message: string, meta?: any): void {
    this.logs.push({level: 'info', message, meta});
  }
  
  /**
   * Log a warning message
   * @param message - Message to log
   * @param meta - Optional metadata
   */
  public warn(message: string, meta?: any): void {
    this.logs.push({level: 'warn', message, meta});
  }
  
  /**
   * Log an error message
   * @param message - Message to log
   * @param meta - Optional metadata
   */
  public error(message: string, meta?: any): void {
    this.logs.push({level: 'error', message, meta});
  }
  
  /**
   * Get all recorded logs
   * @returns Array of recorded logs
   */
  public getLogs(): Array<{level: string, message: string, meta?: any}> {
    return [...this.logs];
  }
  
  /**
   * Get logs of a specific level
   * @param level - Log level to filter by
   * @returns Array of logs with the specified level
   */
  public getLogsByLevel(level: string): Array<{level: string, message: string, meta?: any}> {
    return this.logs.filter(log => log.level === level);
  }
  
  /**
   * Clear all recorded logs
   */
  public clear(): void {
    this.logs = [];
  }
}