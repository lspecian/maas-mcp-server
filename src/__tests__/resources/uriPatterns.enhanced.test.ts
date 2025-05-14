// Reference Jest types
/// <reference types="jest" />

// Import the URI parser functions
// Note: These would be imported from the actual implementation
// For now, we'll define them here for testing purposes
const parseURI = (uri: string) => {
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
};

const matchURI = (uri: string, pattern: string) => {
  // Parse the URI
  const parsedURI = parseURI(uri);

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
};

const validateURI = (uri: string, pattern: string) => {
  try {
    matchURI(uri, pattern);
    return true;
  } catch (error) {
    return false;
  }
};

describe('URI Pattern Tests', () => {
  test('parseURI should correctly parse machine URI', () => {
    const uri = 'maas://machine/abc123';
    const result = parseURI(uri);
    expect(result.scheme).toBe('maas');
    expect(result.resourceType).toBe('machine');
    expect(result.resourceID).toBe('abc123');
    expect(result.subResourceType).toBe('');
    expect(result.subResourceID).toBe('');
  });

  test('parseURI should correctly parse machine URI with sub-resource', () => {
    const uri = 'maas://machine/abc123/power';
    const result = parseURI(uri);
    expect(result.scheme).toBe('maas');
    expect(result.resourceType).toBe('machine');
    expect(result.resourceID).toBe('abc123');
    expect(result.subResourceType).toBe('power');
    expect(result.subResourceID).toBe('');
  });

  test('parseURI should correctly parse machine URI with sub-resource and ID', () => {
    const uri = 'maas://machine/abc123/interfaces/eth0';
    const result = parseURI(uri);
    expect(result.scheme).toBe('maas');
    expect(result.resourceType).toBe('machine');
    expect(result.resourceID).toBe('abc123');
    expect(result.subResourceType).toBe('interfaces');
    expect(result.subResourceID).toBe('eth0');
  });

  test('parseURI should correctly parse URI with query parameters', () => {
    const uri = 'maas://machine/abc123?filter=status&value=deployed';
    const result = parseURI(uri);
    expect(result.scheme).toBe('maas');
    expect(result.resourceType).toBe('machine');
    expect(result.resourceID).toBe('abc123');
    expect(result.queryParams.filter).toBe('status');
    expect(result.queryParams.value).toBe('deployed');
  });

  test('parseURI should throw error for invalid URI format', () => {
    const uri = 'invalid-uri';
    expect(() => parseURI(uri)).toThrow('Invalid URI format');
  });

  test('matchURI should correctly match URI against pattern', () => {
    const uri = 'maas://machine/abc123';
    const pattern = 'maas://machine/{system_id}';
    const result = matchURI(uri, pattern);
    expect(result.parameters.system_id).toBe('abc123');
  });

  test('matchURI should correctly match URI with sub-resource against pattern', () => {
    const uri = 'maas://machine/abc123/power';
    const pattern = 'maas://machine/{system_id}/power';
    const result = matchURI(uri, pattern);
    expect(result.parameters.system_id).toBe('abc123');
  });

  test('matchURI should correctly match URI with optional parameter (present)', () => {
    const uri = 'maas://machine/abc123/tags/web-server';
    const pattern = 'maas://machine/{system_id}/tags/{tag_name?}';
    const result = matchURI(uri, pattern);
    expect(result.parameters.system_id).toBe('abc123');
    expect(result.parameters.tag_name).toBe('web-server');
  });

  test('matchURI should correctly match URI with optional parameter (not present)', () => {
    const uri = 'maas://machine/abc123/tags';
    const pattern = 'maas://machine/{system_id}/tags/{tag_name?}';
    const result = matchURI(uri, pattern);
    expect(result.parameters.system_id).toBe('abc123');
    expect(result.parameters.tag_name).toBe('');
  });

  test('matchURI should correctly match URI with enumerated values (matching)', () => {
    const uri = 'maas://machine/abc123/power/on';
    const pattern = 'maas://machine/{system_id}/power/{action:on|off}';
    const result = matchURI(uri, pattern);
    expect(result.parameters.system_id).toBe('abc123');
    expect(result.parameters.action).toBe('on');
  });

  test('matchURI should throw error for URI with enumerated values (not matching)', () => {
    const uri = 'maas://machine/abc123/power/restart';
    const pattern = 'maas://machine/{system_id}/power/{action:on|off}';
    expect(() => matchURI(uri, pattern)).toThrow('URI does not match pattern');
  });

  test('validateURI should return true for valid URI', () => {
    const uri = 'maas://machine/abc123';
    const pattern = 'maas://machine/{system_id}';
    expect(validateURI(uri, pattern)).toBe(true);
  });

  test('validateURI should return false for invalid URI', () => {
    const uri = 'maas://subnet/123';
    const pattern = 'maas://machine/{system_id}';
    expect(validateURI(uri, pattern)).toBe(false);
  });
});