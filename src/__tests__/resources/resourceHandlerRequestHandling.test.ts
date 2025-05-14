// Reference Jest types
// Note: In a real project, you would install @types/jest

// Import the resource handler functions
// Note: These would be imported from the actual implementation
// For now, we'll define them here for testing purposes

// Mock resource handler
class RequestHandler {
  private patterns: string[];
  private resources: Map<string, any>;

  constructor(patterns: string[]) {
    this.patterns = patterns;
    this.resources = new Map();

    // Initialize some mock resources
    this.resources.set('machine:abc123', {
      id: 'abc123',
      type: 'machine',
      hostname: 'test-machine',
      status: 'deployed',
      power_state: 'on',
      tags: ['web-server', 'production'],
      interfaces: [
        { id: 'eth0', name: 'eth0', mac_address: '00:11:22:33:44:55', ip_address: '192.168.1.100' },
        { id: 'eth1', name: 'eth1', mac_address: '00:11:22:33:44:56', ip_address: '192.168.1.101' },
      ],
      storage: [
        { id: 'sda', name: 'sda', size: 1000000000, type: 'ssd' },
        { id: 'sdb', name: 'sdb', size: 2000000000, type: 'hdd' },
      ],
    });

    this.resources.set('subnet:123', {
      id: '123',
      type: 'subnet',
      name: 'test-subnet',
      cidr: '192.168.1.0/24',
      gateway_ip: '192.168.1.1',
      dns_servers: ['8.8.8.8', '8.8.4.4'],
      ip_ranges: [
        { start: '192.168.1.100', end: '192.168.1.200', purpose: 'dynamic' },
      ],
    });

    this.resources.set('storage-pool:pool1', {
      id: 'pool1',
      type: 'storage-pool',
      name: 'test-pool',
      path: '/var/lib/maas/storage',
      total_size: 10000000000,
      used_size: 5000000000,
      devices: [
        { id: 'dev1', name: 'dev1', path: '/dev/sda' },
        { id: 'dev2', name: 'dev2', path: '/dev/sdb' },
      ],
    });

    this.resources.set('tag:web-server', {
      id: 'web-server',
      type: 'tag',
      name: 'web-server',
      description: 'Web server tag',
      machines: ['abc123'],
    });
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

  canHandle(uri: string): boolean {
    try {
      const parsedURI = this.parseURI(uri);
      const { scheme, resourceType } = parsedURI;

      for (const pattern of this.patterns) {
        const patternParts = pattern.split('://');
        if (patternParts.length !== 2) {
          continue;
        }

        const patternScheme = patternParts[0];
        const patternPath = patternParts[1];
        const patternResourceType = patternPath.split('/')[0];

        if (scheme === patternScheme && resourceType === patternResourceType) {
          return true;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  handleRequest(uri: string, params: Record<string, any> = {}): any {
    // Check if the handler can handle the URI
    if (!this.canHandle(uri)) {
      throw new Error(`Cannot handle URI: ${uri}`);
    }

    // Parse the URI
    const parsedURI = this.parseURI(uri);
    const { scheme, resourceType, resourceID, subResourceType, subResourceID, queryParams } = parsedURI;

    // Check if the resource exists
    const resourceKey = `${resourceType}:${resourceID}`;
    if (!this.resources.has(resourceKey)) {
      throw new Error(`Resource not found: ${resourceKey}`);
    }

    // Get the resource
    const resource = this.resources.get(resourceKey);

    // Handle sub-resources
    if (subResourceType) {
      if (!resource[subResourceType]) {
        throw new Error(`Sub-resource not found: ${subResourceType}`);
      }

      if (subResourceID) {
        // Find the specific sub-resource
        const subResource = resource[subResourceType].find((item: any) => item.id === subResourceID);
        if (!subResource) {
          throw new Error(`Sub-resource not found: ${subResourceType}/${subResourceID}`);
        }
        return subResource;
      }

      return resource[subResourceType];
    }

    // Apply filters if any
    if (Object.keys(queryParams).length > 0) {
      const filteredResource = { ...resource };
      for (const [key, value] of Object.entries(queryParams)) {
        if (key === 'fields') {
          // Handle field selection
          const fields = value.split(',');
          const selectedFields: Record<string, any> = { id: resource.id, type: resource.type };
          for (const field of fields) {
            if (resource[field] !== undefined) {
              selectedFields[field] = resource[field];
            }
          }
          return selectedFields;
        } else if (key === 'filter') {
          // Handle filtering
          const filterKey = queryParams.key || '';
          const filterValue = queryParams.value || '';
          if (filterKey && filterValue && resource[filterKey] !== undefined) {
            if (Array.isArray(resource[filterKey])) {
              filteredResource[filterKey] = resource[filterKey].filter((item: any) => {
                if (typeof item === 'object' && item !== null) {
                  return item.id === filterValue || item.name === filterValue;
                }
                return item === filterValue;
              });
            } else if (resource[filterKey] !== filterValue) {
              throw new Error(`Resource does not match filter: ${filterKey}=${filterValue}`);
            }
          }
        }
      }
      return filteredResource;
    }

    // Return the resource
    return resource;
  }

  // Method to update a resource
  updateResource(uri: string, updates: Record<string, any>): any {
    // Parse the URI
    const parsedURI = this.parseURI(uri);
    const { resourceType, resourceID, subResourceType, subResourceID } = parsedURI;

    // Check if the resource exists
    const resourceKey = `${resourceType}:${resourceID}`;
    if (!this.resources.has(resourceKey)) {
      throw new Error(`Resource not found: ${resourceKey}`);
    }

    // Get the resource
    const resource = this.resources.get(resourceKey);

    // Handle sub-resources
    if (subResourceType) {
      if (!resource[subResourceType]) {
        throw new Error(`Sub-resource not found: ${subResourceType}`);
      }

      if (subResourceID) {
        // Find the specific sub-resource
        const subResourceIndex = resource[subResourceType].findIndex((item: any) => item.id === subResourceID);
        if (subResourceIndex === -1) {
          throw new Error(`Sub-resource not found: ${subResourceType}/${subResourceID}`);
        }

        // Update the sub-resource
        resource[subResourceType][subResourceIndex] = {
          ...resource[subResourceType][subResourceIndex],
          ...updates,
        };

        // Save the updated resource
        this.resources.set(resourceKey, resource);

        return resource[subResourceType][subResourceIndex];
      }

      // Update all sub-resources
      resource[subResourceType] = resource[subResourceType].map((item: any) => ({
        ...item,
        ...updates,
      }));

      // Save the updated resource
      this.resources.set(resourceKey, resource);

      return resource[subResourceType];
    }

    // Update the resource
    const updatedResource = {
      ...resource,
      ...updates,
    };

    // Save the updated resource
    this.resources.set(resourceKey, updatedResource);

    return updatedResource;
  }

  // Method to create a resource
  createResource(uri: string, data: Record<string, any>): any {
    // Parse the URI
    const parsedURI = this.parseURI(uri);
    const { resourceType, resourceID, subResourceType } = parsedURI;

    // Check if the resource exists
    const resourceKey = `${resourceType}:${resourceID}`;
    if (!this.resources.has(resourceKey) && resourceID) {
      // Create a new resource
      const newResource = {
        id: resourceID,
        type: resourceType,
        ...data,
      };

      // Save the new resource
      this.resources.set(resourceKey, newResource);

      return newResource;
    } else if (this.resources.has(resourceKey) && subResourceType) {
      // Get the resource
      const resource = this.resources.get(resourceKey);

      // Check if the sub-resource type exists
      if (!resource[subResourceType]) {
        resource[subResourceType] = [];
      }

      // Create a new sub-resource
      const newSubResource = {
        id: data.id || `${subResourceType}-${resource[subResourceType].length + 1}`,
        ...data,
      };

      // Add the sub-resource
      resource[subResourceType].push(newSubResource);

      // Save the updated resource
      this.resources.set(resourceKey, resource);

      return newSubResource;
    }

    throw new Error(`Invalid URI for resource creation: ${uri}`);
  }

  // Method to delete a resource
  deleteResource(uri: string): boolean {
    // Parse the URI
    const parsedURI = this.parseURI(uri);
    const { resourceType, resourceID, subResourceType, subResourceID } = parsedURI;

    // Check if the resource exists
    const resourceKey = `${resourceType}:${resourceID}`;
    if (!this.resources.has(resourceKey)) {
      throw new Error(`Resource not found: ${resourceKey}`);
    }

    // Get the resource
    const resource = this.resources.get(resourceKey);

    // Handle sub-resources
    if (subResourceType && subResourceID) {
      if (!resource[subResourceType]) {
        throw new Error(`Sub-resource not found: ${subResourceType}`);
      }

      // Find the specific sub-resource
      const subResourceIndex = resource[subResourceType].findIndex((item: any) => item.id === subResourceID);
      if (subResourceIndex === -1) {
        throw new Error(`Sub-resource not found: ${subResourceType}/${subResourceID}`);
      }

      // Remove the sub-resource
      resource[subResourceType].splice(subResourceIndex, 1);

      // Save the updated resource
      this.resources.set(resourceKey, resource);

      return true;
    } else if (!subResourceType) {
      // Delete the resource
      return this.resources.delete(resourceKey);
    }

    throw new Error(`Invalid URI for resource deletion: ${uri}`);
  }
}

describe('Resource Handler Request Handling', () => {
  const handler = new RequestHandler([
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

  test('should correctly retrieve a machine resource', () => {
    const result = handler.handleRequest('maas://machine/abc123');
    expect(result).toBeDefined();
    expect(result.id).toBe('abc123');
    expect(result.type).toBe('machine');
    expect(result.hostname).toBe('test-machine');
    expect(result.status).toBe('deployed');
    expect(result.power_state).toBe('on');
    expect(result.tags).toContain('web-server');
    expect(result.tags).toContain('production');
    expect(result.interfaces).toHaveLength(2);
    expect(result.storage).toHaveLength(2);
  });

  test('should correctly retrieve a subnet resource', () => {
    const result = handler.handleRequest('maas://subnet/123');
    expect(result).toBeDefined();
    expect(result.id).toBe('123');
    expect(result.type).toBe('subnet');
    expect(result.name).toBe('test-subnet');
    expect(result.cidr).toBe('192.168.1.0/24');
    expect(result.gateway_ip).toBe('192.168.1.1');
    expect(result.dns_servers).toContain('8.8.8.8');
    expect(result.dns_servers).toContain('8.8.4.4');
    expect(result.ip_ranges).toHaveLength(1);
  });

  test('should correctly retrieve a storage pool resource', () => {
    const result = handler.handleRequest('maas://storage-pool/pool1');
    expect(result).toBeDefined();
    expect(result.id).toBe('pool1');
    expect(result.type).toBe('storage-pool');
    expect(result.name).toBe('test-pool');
    expect(result.path).toBe('/var/lib/maas/storage');
    expect(result.total_size).toBe(10000000000);
    expect(result.used_size).toBe(5000000000);
    expect(result.devices).toHaveLength(2);
  });

  test('should correctly retrieve a tag resource', () => {
    const result = handler.handleRequest('maas://tag/web-server');
    expect(result).toBeDefined();
    expect(result.id).toBe('web-server');
    expect(result.type).toBe('tag');
    expect(result.name).toBe('web-server');
    expect(result.description).toBe('Web server tag');
    expect(result.machines).toContain('abc123');
  });

  test('should correctly retrieve a sub-resource', () => {
    const result = handler.handleRequest('maas://machine/abc123/interfaces');
    expect(result).toBeDefined();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('eth0');
    expect(result[1].id).toBe('eth1');
  });

  test('should correctly retrieve a specific sub-resource', () => {
    const result = handler.handleRequest('maas://machine/abc123/interfaces/eth0');
    expect(result).toBeDefined();
    expect(result.id).toBe('eth0');
    expect(result.name).toBe('eth0');
    expect(result.mac_address).toBe('00:11:22:33:44:55');
    expect(result.ip_address).toBe('192.168.1.100');
  });

  test('should correctly filter resources by fields', () => {
    const result = handler.handleRequest('maas://machine/abc123?fields=hostname,status');
    expect(result).toBeDefined();
    expect(result.id).toBe('abc123');
    expect(result.type).toBe('machine');
    expect(result.hostname).toBe('test-machine');
    expect(result.status).toBe('deployed');
    expect(result.power_state).toBeUndefined();
    expect(result.tags).toBeUndefined();
    expect(result.interfaces).toBeUndefined();
    expect(result.storage).toBeUndefined();
  });

  test('should correctly update a resource', () => {
    const updates = {
      hostname: 'updated-machine',
      status: 'ready',
    };
    const result = handler.updateResource('maas://machine/abc123', updates);
    expect(result).toBeDefined();
    expect(result.id).toBe('abc123');
    expect(result.type).toBe('machine');
    expect(result.hostname).toBe('updated-machine');
    expect(result.status).toBe('ready');
    expect(result.power_state).toBe('on');
    expect(result.tags).toContain('web-server');
    expect(result.tags).toContain('production');
    expect(result.interfaces).toHaveLength(2);
    expect(result.storage).toHaveLength(2);

    // Verify the update persisted
    const updatedResource = handler.handleRequest('maas://machine/abc123');
    expect(updatedResource.hostname).toBe('updated-machine');
    expect(updatedResource.status).toBe('ready');
  });

  test('should correctly update a sub-resource', () => {
    const updates = {
      ip_address: '192.168.1.200',
    };
    const result = handler.updateResource('maas://machine/abc123/interfaces/eth0', updates);
    expect(result).toBeDefined();
    expect(result.id).toBe('eth0');
    expect(result.name).toBe('eth0');
    expect(result.mac_address).toBe('00:11:22:33:44:55');
    expect(result.ip_address).toBe('192.168.1.200');

    // Verify the update persisted
    const updatedResource = handler.handleRequest('maas://machine/abc123/interfaces/eth0');
    expect(updatedResource.ip_address).toBe('192.168.1.200');
  });

  test('should correctly create a new resource', () => {
    const data = {
      hostname: 'new-machine',
      status: 'new',
      power_state: 'off',
      tags: ['test'],
      interfaces: [],
      storage: [],
    };
    const result = handler.createResource('maas://machine/def456', data);
    expect(result).toBeDefined();
    expect(result.id).toBe('def456');
    expect(result.type).toBe('machine');
    expect(result.hostname).toBe('new-machine');
    expect(result.status).toBe('new');
    expect(result.power_state).toBe('off');
    expect(result.tags).toContain('test');
    expect(result.interfaces).toHaveLength(0);
    expect(result.storage).toHaveLength(0);

    // Verify the creation persisted
    const newResource = handler.handleRequest('maas://machine/def456');
    expect(newResource.hostname).toBe('new-machine');
    expect(newResource.status).toBe('new');
  });

  test('should correctly create a new sub-resource', () => {
    const data = {
      id: 'eth2',
      name: 'eth2',
      mac_address: '00:11:22:33:44:57',
      ip_address: '192.168.1.102',
    };
    const result = handler.createResource('maas://machine/abc123/interfaces', data);
    expect(result).toBeDefined();
    expect(result.id).toBe('eth2');
    expect(result.name).toBe('eth2');
    expect(result.mac_address).toBe('00:11:22:33:44:57');
    expect(result.ip_address).toBe('192.168.1.102');

    // Verify the creation persisted
    const interfaces = handler.handleRequest('maas://machine/abc123/interfaces');
    expect(interfaces).toHaveLength(3);
    expect(interfaces[2].id).toBe('eth2');
    expect(interfaces[2].ip_address).toBe('192.168.1.102');
  });

  test('should correctly delete a resource', () => {
    const result = handler.deleteResource('maas://machine/def456');
    expect(result).toBe(true);

    // Verify the deletion persisted
    expect(() => handler.handleRequest('maas://machine/def456')).toThrow('Resource not found');
  });

  test('should correctly delete a sub-resource', () => {
    const result = handler.deleteResource('maas://machine/abc123/interfaces/eth2');
    expect(result).toBe(true);

    // Verify the deletion persisted
    const interfaces = handler.handleRequest('maas://machine/abc123/interfaces');
    expect(interfaces).toHaveLength(2);
    expect(interfaces.find((i: any) => i.id === 'eth2')).toBeUndefined();
  });

  test('should throw error for non-existent resource', () => {
    expect(() => handler.handleRequest('maas://machine/non-existent')).toThrow('Resource not found');
  });

  test('should throw error for non-existent sub-resource', () => {
    expect(() => handler.handleRequest('maas://machine/abc123/non-existent')).toThrow('Sub-resource not found');
  });

  test('should throw error for non-existent sub-resource ID', () => {
    expect(() => handler.handleRequest('maas://machine/abc123/interfaces/non-existent')).toThrow('Sub-resource not found');
  });

  test('should throw error for unsupported URI', () => {
    expect(() => handler.handleRequest('invalid://resource/123')).toThrow('Cannot handle URI');
  });
});