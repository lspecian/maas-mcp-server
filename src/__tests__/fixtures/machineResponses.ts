/**
 * Mock data fixtures for MAAS API responses related to machines
 * These fixtures can be used in tests to simulate various API responses
 */

/**
 * Interface for MAAS machine objects
 */
interface MaasMachine {
  system_id: string;
  hostname: string;
  domain: { id: number; name: string };
  architecture: string;
  status: number;
  status_name: string;
  owner: string | null;
  owner_data: Record<string, any> | null;
  ip_addresses: string[] | null;
  cpu_count: number;
  memory: number;
  zone: { id: number; name: string };
  pool: { id: number; name: string };
  tags: string[];
  [key: string]: any; // Allow additional properties for extended machine objects
}

/**
 * A collection of machine objects with different statuses and configurations
 */
export const machines: MaasMachine[] = [
  // Ready machine with standard configuration
  {
    system_id: 'abc123',
    hostname: 'test-machine-1',
    domain: { id: 1, name: 'maas' },
    architecture: 'amd64/generic',
    status: 4,
    status_name: 'Ready',
    owner: 'admin',
    owner_data: { key: 'value' },
    ip_addresses: ['192.168.1.100'],
    cpu_count: 4,
    memory: 8192,
    zone: { id: 1, name: 'default' },
    pool: { id: 1, name: 'default' },
    tags: ['tag1', 'tag2']
  },
  
  // Deployed machine with different owner
  {
    system_id: 'def456',
    hostname: 'test-machine-2',
    domain: { id: 1, name: 'maas' },
    architecture: 'amd64/generic',
    status: 6,
    status_name: 'Deployed',
    owner: 'user1',
    owner_data: null,
    ip_addresses: ['192.168.1.101'],
    cpu_count: 8,
    memory: 16384,
    zone: { id: 1, name: 'default' },
    pool: { id: 2, name: 'production' },
    tags: ['tag3']
  },
  
  // Commissioning machine with no owner
  {
    system_id: 'ghi789',
    hostname: 'test-machine-3',
    domain: { id: 1, name: 'maas' },
    architecture: 'arm64/generic',
    status: 2,
    status_name: 'Commissioning',
    owner: null,
    owner_data: null,
    ip_addresses: [],
    cpu_count: 2,
    memory: 4096,
    zone: { id: 2, name: 'testing' },
    pool: { id: 3, name: 'development' },
    tags: []
  },
  
  // Failed machine with error status
  {
    system_id: 'jkl012',
    hostname: 'test-machine-4',
    domain: { id: 1, name: 'maas' },
    architecture: 'amd64/generic',
    status: 20,
    status_name: 'Failed testing',
    owner: 'admin',
    owner_data: { error: 'Hardware test failed' },
    ip_addresses: ['192.168.1.103'],
    cpu_count: 16,
    memory: 32768,
    zone: { id: 1, name: 'default' },
    pool: { id: 1, name: 'default' },
    tags: ['tag4', 'high-memory']
  }
];

/**
 * Individual machine objects for specific test cases
 */
export const readyMachine: MaasMachine = machines[0];
export const deployedMachine: MaasMachine = machines[1];
export const commissioningMachine: MaasMachine = machines[2];
export const failedMachine: MaasMachine = machines[3];

/**
 * Machine with minimal properties (for testing schema validation)
 */
export const minimalMachine: MaasMachine = {
  system_id: 'min123',
  hostname: 'minimal-machine',
  domain: { id: 1, name: 'maas' },
  architecture: 'amd64/generic',
  status: 4,
  status_name: 'Ready',
  owner: null,
  owner_data: null,
  ip_addresses: null,
  cpu_count: 1,
  memory: 1024,
  zone: { id: 1, name: 'default' },
  pool: { id: 1, name: 'default' },
  tags: []
};

/**
 * Machine with extra properties (for testing schema validation)
 */
export const extendedMachine: MaasMachine = {
  ...readyMachine,
  extra_property: 'This is not in the schema',
  another_extra: 123,
  nested_extra: {
    something: 'value'
  }
};

/**
 * Invalid machine missing required properties
 */
export const invalidMachine: Partial<MaasMachine> = {
  system_id: 'invalid456',
  hostname: 'invalid-machine'
  // Missing required properties
};

/**
 * Empty result for when no machines match filters
 */
export const emptyMachinesResult = [];

/**
 * Error responses for different scenarios
 */
export const errorResponses = {
  notFound: {
    error: 'Not Found',
    detail: 'Machine not found'
  },
  unauthorized: {
    error: 'Unauthorized',
    detail: 'API key not valid'
  },
  serverError: {
    error: 'Internal Server Error',
    detail: 'An unexpected error occurred'
  },
  badRequest: {
    error: 'Bad Request',
    detail: 'Invalid parameter: status'
  }
};

/**
 * Machine list with pagination metadata
 */
export const paginatedMachines: {
  count: number;
  next: string | null;
  previous: string | null;
  results: MaasMachine[];
} = {
  count: 100,
  next: 'https://maas.example.com/api/2.0/machines/?offset=20&limit=10',
  previous: 'https://maas.example.com/api/2.0/machines/?offset=0&limit=10',
  results: machines.slice(0, 2) // First two machines
};

/**
 * Helper function to create a filtered list of machines based on parameters
 */
export function filterMachines(params: {
  hostname?: string;
  status?: string;
  owner?: string;
  tag_names?: string;
  zone?: string;
  pool?: string;
  architecture?: string;
  limit?: number;
  offset?: number;
}): MaasMachine[] {
  let result = [...machines];
  
  if (params.hostname) {
    result = result.filter(m => m.hostname.includes(params.hostname!));
  }
  
  if (params.status) {
    result = result.filter(m => m.status_name.toLowerCase() === params.status!.toLowerCase());
  }
  
  if (params.owner) {
    result = result.filter(m => m.owner === params.owner);
  }
  
  if (params.tag_names) {
    const tags = params.tag_names.split(',');
    result = result.filter(m => tags.some(tag => m.tags.indexOf(tag) !== -1));
  }
  
  if (params.zone) {
    result = result.filter(m => m.zone.name === params.zone);
  }
  
  if (params.pool) {
    result = result.filter(m => m.pool.name === params.pool);
  }
  
  if (params.architecture) {
    result = result.filter(m => m.architecture === params.architecture);
  }
  
  // Apply pagination if specified
  if (params.offset !== undefined || params.limit !== undefined) {
    const offset = params.offset || 0;
    const limit = params.limit || result.length;
    result = result.slice(offset, offset + limit);
  }
  
  return result;
}