// Reference Jest types
// Note: In a real project, you would install @types/jest

// Import the URI parser functions
// Note: These would be imported from the actual implementation
// For now, we'll define them here for testing purposes

// Mock resource handler
class URIResourceHandler {
  private patterns: string[];

  constructor(patterns: string[]) {
    this.patterns = patterns;
  }

  parseURI(uri: string) {
    // Split the URI into scheme and path
    const parts = uri.split('://');
    if (parts.length !== 2) {
      throw new Error(`Invalid URI format: ${uri}`);
    }

    const scheme = parts[0];
    let path = parts[1];
    let queryParams: Record<string, string> = {};

    // Parse query parameters if any
    const pathAndQuery = path.split('?');
    path = pathAndQuery[0];
    if (pathAndQuery.length > 1) {
      const query = pathAndQuery[1];
      const queryParts = query.split('&');
      for (const part of queryParts) {
        const keyValue = part.split('=');
        if (keyValue.length === 2) {
          queryParams[keyValue[0]] = keyValue[1];
        }
      }
    }

    // Split the path into segments
    const segments = path.split('/');
    if (segments.length === 0) {
      throw new Error(`Invalid URI path: ${path}`);
    }

    // Extract resource type and ID
    const resourceType = segments[0];
    let resourceID = '';
    let subResourceType = '';
    let subResourceID = '';

    if (segments.length > 1) {
      resourceID = segments[1];
    }

    // Extract sub-resource type and ID if present
    if (segments.length > 2) {
      subResourceType = segments[2];
    }

    if (segments.length > 3) {
      subResourceID = segments[3];
    }

    return {
      scheme,
      resourceType,
      resourceID,
      subResourceType,
      subResourceID,
      queryParams,
    };
  }

  matchPattern(uri: string, pattern: string) {
    // Parse the URI
    const parsedURI = this.parseURI(uri);

    // Extract parameters from the pattern
    const paramRegex = /\{([^{}:]+)(\?)?(?::([^{}]+))?\}/g;
    const parameters: Record<string, string> = {};
    let match;

    // Create a regular expression from the pattern
    let regexPattern = pattern;

    // Replace parameters with regex capture groups
    while ((match = paramRegex.exec(pattern)) !== null) {
      const paramName = match[1];
      const isOptional = match[2] === '?';
      const enumValues = match[3] ? match[3].split('|') : [];

      let replacement;
      if (enumValues.length > 0) {
        // For enumerated parameters, create a group with alternatives
        replacement = `(?<${paramName}>${enumValues.join('|')})`;
      } else if (isOptional) {
        // For optional parameters
        replacement = `(?<${paramName}>[^/]*)?`;
      } else {
        // For required parameters
        replacement = `(?<${paramName}>[^/]+)`;
      }

      // Escape curly braces for regex
      const paramPattern = `\\{${paramName}${isOptional ? '\\?' : ''}${
        enumValues.length > 0 ? `:${enumValues.join('\\|')}` : ''
      }\\}`;
      regexPattern = regexPattern.replace(new RegExp(paramPattern), replacement);
    }

    // Convert the pattern to a regex
    regexPattern = `^${regexPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`;
    regexPattern = regexPattern.replace(/\\\(\\\?P<([^>]+)>/g, '(?<$1>');
    regexPattern = regexPattern.replace(/\\\)/g, ')');
    regexPattern = regexPattern.replace(/\\\|/g, '|');

    // Create the regex
    const regex = new RegExp(regexPattern);

    // Match the URI against the pattern
    const regexMatch = regex.exec(uri);
    if (!regexMatch) {
      throw new Error(`URI does not match pattern: ${pattern}`);
    }

    // Extract parameter values
    if (regexMatch.groups) {
      for (const [name, value] of Object.entries(regexMatch.groups)) {
        parameters[name] = value || '';
      }
    }

    return {
      ...parsedURI,
      parameters,
      pattern,
    };
  }

  canHandle(uri: string): boolean {
    for (const pattern of this.patterns) {
      try {
        this.matchPattern(uri, pattern);
        return true;
      } catch (error) {
        // Continue to the next pattern
      }
    }
    return false;
  }

  getParameters(uri: string): Record<string, string> {
    for (const pattern of this.patterns) {
      try {
        const result = this.matchPattern(uri, pattern);
        return result.parameters;
      } catch (error) {
        // Continue to the next pattern
      }
    }
    throw new Error(`No matching pattern found for URI: ${uri}`);
  }
}

describe('Resource Handler URI Parsing', () => {
  const handler = new URIResourceHandler([
    'maas://machine/{system_id}',
    'maas://machine/{system_id}/power',
    'maas://machine/{system_id}/interfaces/{interface_id?}',
    'maas://machine/{system_id}/storage/{storage_id?}',
    'maas://machine/{system_id}/tags/{tag_name?}',
    'maas://subnet/{subnet_id}',
    'maas://subnet/{subnet_id}/ip-ranges',
    'maas://storage-pool/{pool_id}',
    'maas://storage-pool/{pool_id}/devices',
    'maas://tag/{tag_name}',
    'maas://tag/{tag_name}/machines',
  ]);

  test('should correctly parse machine URI', () => {
    const result = handler.parseURI('maas://machine/abc123');
    expect(result.scheme).toBe('maas');
    expect(result.resourceType).toBe('machine');
    expect(result.resourceID).toBe('abc123');
    expect(result.subResourceType).toBe('');
    expect(result.subResourceID).toBe('');
  });

  test('should correctly parse machine URI with sub-resource', () => {
    const result = handler.parseURI('maas://machine/abc123/power');
    expect(result.scheme).toBe('maas');
    expect(result.resourceType).toBe('machine');
    expect(result.resourceID).toBe('abc123');
    expect(result.subResourceType).toBe('power');
    expect(result.subResourceID).toBe('');
  });

  test('should correctly parse machine URI with sub-resource and ID', () => {
    const result = handler.parseURI('maas://machine/abc123/interfaces/eth0');
    expect(result.scheme).toBe('maas');
    expect(result.resourceType).toBe('machine');
    expect(result.resourceID).toBe('abc123');
    expect(result.subResourceType).toBe('interfaces');
    expect(result.subResourceID).toBe('eth0');
  });

  test('should correctly parse URI with query parameters', () => {
    const result = handler.parseURI('maas://machine/abc123?filter=status&value=deployed');
    expect(result.scheme).toBe('maas');
    expect(result.resourceType).toBe('machine');
    expect(result.resourceID).toBe('abc123');
    expect(result.queryParams.filter).toBe('status');
    expect(result.queryParams.value).toBe('deployed');
  });

  test('should correctly match URI against pattern', () => {
    const result = handler.matchPattern('maas://machine/abc123', 'maas://machine/{system_id}');
    expect(result.parameters.system_id).toBe('abc123');
  });

  test('should correctly match URI with sub-resource against pattern', () => {
    const result = handler.matchPattern('maas://machine/abc123/power', 'maas://machine/{system_id}/power');
    expect(result.parameters.system_id).toBe('abc123');
  });

  test('should correctly match URI with optional parameter (present)', () => {
    const result = handler.matchPattern(
      'maas://machine/abc123/interfaces/eth0',
      'maas://machine/{system_id}/interfaces/{interface_id?}'
    );
    expect(result.parameters.system_id).toBe('abc123');
    expect(result.parameters.interface_id).toBe('eth0');
  });

  test('should correctly match URI with optional parameter (not present)', () => {
    const result = handler.matchPattern(
      'maas://machine/abc123/interfaces',
      'maas://machine/{system_id}/interfaces/{interface_id?}'
    );
    expect(result.parameters.system_id).toBe('abc123');
    expect(result.parameters.interface_id).toBe('');
  });

  test('should correctly determine if handler can handle URI', () => {
    expect(handler.canHandle('maas://machine/abc123')).toBe(true);
    expect(handler.canHandle('maas://machine/abc123/power')).toBe(true);
    expect(handler.canHandle('maas://machine/abc123/interfaces/eth0')).toBe(true);
    expect(handler.canHandle('maas://subnet/123')).toBe(true);
    expect(handler.canHandle('maas://storage-pool/pool1')).toBe(true);
    expect(handler.canHandle('maas://tag/web-server')).toBe(true);
    expect(handler.canHandle('invalid://resource/123')).toBe(false);
  });

  test('should correctly extract parameters from URI', () => {
    const params = handler.getParameters('maas://machine/abc123');
    expect(params.system_id).toBe('abc123');

    const paramsWithSubResource = handler.getParameters('maas://machine/abc123/interfaces/eth0');
    expect(paramsWithSubResource.system_id).toBe('abc123');
    expect(paramsWithSubResource.interface_id).toBe('eth0');

    const paramsWithOptionalParam = handler.getParameters('maas://machine/abc123/interfaces');
    expect(paramsWithOptionalParam.system_id).toBe('abc123');
    expect(paramsWithOptionalParam.interface_id).toBe('');
  });

  test('should throw error when getting parameters for unsupported URI', () => {
    expect(() => handler.getParameters('invalid://resource/123')).toThrow(
      'No matching pattern found for URI: invalid://resource/123'
    );
  });
});