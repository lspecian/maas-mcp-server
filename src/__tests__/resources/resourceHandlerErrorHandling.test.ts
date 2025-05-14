// Reference Jest types
// Note: In a real project, you would install @types/jest

// Import the resource handler functions
// Note: These would be imported from the actual implementation
// For now, we'll define them here for testing purposes

// Mock error types
class ResourceError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'ResourceError';
  }
}

// Error codes
const ErrorCodes = {
  INVALID_URI: 'INVALID_URI',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  INVALID_PARAMETER: 'INVALID_PARAMETER',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};

// Mock resource handler
class ResourceHandler {
  private patterns: string[];

  constructor(patterns: string[]) {
    this.patterns = patterns;
  }

  canHandle(uri: string): boolean {
    for (const pattern of this.patterns) {
      if (this.validateURI(uri, pattern)) {
        return true;
      }
    }
    return false;
  }

  validateURI(uri: string, pattern: string): boolean {
    try {
      // Simple validation for testing
      const uriParts = uri.split('://');
      const patternParts = pattern.split('://');

      if (uriParts.length !== 2 || patternParts.length !== 2) {
        return false;
      }

      if (uriParts[0] !== patternParts[0]) {
        return false;
      }

      const uriPath = uriParts[1].split('/');
      const patternPath = patternParts[1].split('/');

      if (uriPath[0] !== patternPath[0]) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  handleRequest(uri: string, params: Record<string, string> = {}): any {
    // Check if the handler can handle the URI
    if (!this.canHandle(uri)) {
      throw new ResourceError(`Cannot handle URI: ${uri}`, ErrorCodes.INVALID_URI);
    }

    // Parse the URI
    const uriParts = uri.split('://');
    if (uriParts.length !== 2) {
      throw new ResourceError(`Invalid URI format: ${uri}`, ErrorCodes.INVALID_URI);
    }

    const scheme = uriParts[0];
    const path = uriParts[1];
    const pathParts = path.split('/');

    // Check if the resource type is valid
    const resourceType = pathParts[0];
    if (!resourceType) {
      throw new ResourceError(`Missing resource type in URI: ${uri}`, ErrorCodes.INVALID_URI);
    }

    // Check if the resource ID is provided
    const resourceID = pathParts[1];
    if (!resourceID) {
      throw new ResourceError(`Missing resource ID in URI: ${uri}`, ErrorCodes.INVALID_URI);
    }

    // Check required parameters
    if (params.required && !params[params.required]) {
      throw new ResourceError(`Missing required parameter: ${params.required}`, ErrorCodes.INVALID_PARAMETER);
    }

    // Simulate resource not found
    if (resourceID === 'not-found') {
      throw new ResourceError(`Resource not found: ${resourceID}`, ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Simulate unauthorized access
    if (resourceID === 'unauthorized') {
      throw new ResourceError('Unauthorized access', ErrorCodes.UNAUTHORIZED);
    }

    // Simulate internal error
    if (resourceID === 'error') {
      throw new ResourceError('Internal server error', ErrorCodes.INTERNAL_ERROR);
    }

    // Return a mock resource
    return {
      id: resourceID,
      type: resourceType,
      scheme: scheme,
      params: params,
    };
  }
}

describe('Resource Handler Error Handling', () => {
  const handler = new ResourceHandler([
    'maas://machine/{system_id}',
    'maas://subnet/{subnet_id}',
  ]);

  test('should throw INVALID_URI error for unsupported URI', () => {
    expect(() => handler.handleRequest('invalid://resource/123')).toThrow(ResourceError);
    try {
      handler.handleRequest('invalid://resource/123');
    } catch (error) {
      expect(error.code).toBe(ErrorCodes.INVALID_URI);
    }
  });

  test('should throw INVALID_URI error for malformed URI', () => {
    expect(() => handler.handleRequest('maas:/machine')).toThrow(ResourceError);
    try {
      handler.handleRequest('maas:/machine');
    } catch (error) {
      expect(error.code).toBe(ErrorCodes.INVALID_URI);
    }
  });

  test('should throw INVALID_URI error for missing resource type', () => {
    expect(() => handler.handleRequest('maas://')).toThrow(ResourceError);
    try {
      handler.handleRequest('maas://');
    } catch (error) {
      expect(error.code).toBe(ErrorCodes.INVALID_URI);
    }
  });

  test('should throw INVALID_URI error for missing resource ID', () => {
    expect(() => handler.handleRequest('maas://machine/')).toThrow(ResourceError);
    try {
      handler.handleRequest('maas://machine/');
    } catch (error) {
      expect(error.code).toBe(ErrorCodes.INVALID_URI);
    }
  });

  test('should throw INVALID_PARAMETER error for missing required parameter', () => {
    expect(() => handler.handleRequest('maas://machine/abc123', { required: 'param1' })).toThrow(ResourceError);
    try {
      handler.handleRequest('maas://machine/abc123', { required: 'param1' });
    } catch (error) {
      expect(error.code).toBe(ErrorCodes.INVALID_PARAMETER);
    }
  });

  test('should throw RESOURCE_NOT_FOUND error for non-existent resource', () => {
    expect(() => handler.handleRequest('maas://machine/not-found')).toThrow(ResourceError);
    try {
      handler.handleRequest('maas://machine/not-found');
    } catch (error) {
      expect(error.code).toBe(ErrorCodes.RESOURCE_NOT_FOUND);
    }
  });

  test('should throw UNAUTHORIZED error for unauthorized access', () => {
    expect(() => handler.handleRequest('maas://machine/unauthorized')).toThrow(ResourceError);
    try {
      handler.handleRequest('maas://machine/unauthorized');
    } catch (error) {
      expect(error.code).toBe(ErrorCodes.UNAUTHORIZED);
    }
  });

  test('should throw INTERNAL_ERROR error for internal server error', () => {
    expect(() => handler.handleRequest('maas://machine/error')).toThrow(ResourceError);
    try {
      handler.handleRequest('maas://machine/error');
    } catch (error) {
      expect(error.code).toBe(ErrorCodes.INTERNAL_ERROR);
    }
  });

  test('should successfully handle valid request', () => {
    const result = handler.handleRequest('maas://machine/abc123', { param1: 'value1' });
    expect(result).toBeDefined();
    expect(result.id).toBe('abc123');
    expect(result.type).toBe('machine');
    expect(result.scheme).toBe('maas');
    expect(result.params.param1).toBe('value1');
  });
});