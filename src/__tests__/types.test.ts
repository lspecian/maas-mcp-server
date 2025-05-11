import {
  MaasMachineSchema,
  GetMachineParamsSchema,
  MaasMachine,
  GetMachineParams
} from '../mcp_resources/schemas/machineDetailsSchema.js';

import {
  MaasTagSchema,
  MaasTag
} from '../mcp_tools/schemas/tagSchema.js';

import {
  listMachinesSchema as ListMachinesParamsSchema,
  ListMachinesParams
} from '../mcp_tools/schemas/listMachinesSchema.js';

import {
  createTagSchema as CreateTagParamsSchema,
  CreateTagParams
} from '../mcp_tools/schemas/createTagSchema.js';

describe('MAAS API Type Definitions', () => {
  describe('MaasMachineSchema', () => {
    test('should validate a valid machine object', () => {
      const validMachine = {
        system_id: 'abc123',
        hostname: 'test-machine',
        domain: {
          id: 1,
          name: 'maas'
        },
        architecture: 'amd64/generic',
        status: 4,
        status_name: 'Ready',
        owner: 'admin',
        owner_data: { 'key': 'value' },
        ip_addresses: ['192.168.1.100'],
        cpu_count: 4,
        memory: 8192,
        zone: {
          id: 1,
          name: 'default'
        },
        pool: {
          id: 1,
          name: 'default'
        },
        tags: ['tag1', 'tag2']
      };

      const result = MaasMachineSchema.safeParse(validMachine);
      expect(result.success).toBe(true);
    });

    test('should reject an invalid machine object', () => {
      const invalidMachine = {
        // Missing required fields
        hostname: 'test-machine',
        status: 'not-a-number', // Should be a number
        tags: 'not-an-array' // Should be an array
      };

      const result = MaasMachineSchema.safeParse(invalidMachine);
      expect(result.success).toBe(false);
    });

    test('should handle nullable fields correctly', () => {
      const machineWithNulls = {
        system_id: 'abc123',
        hostname: 'test-machine',
        domain: {
          id: 1,
          name: 'maas'
        },
        architecture: 'amd64/generic',
        status: 4,
        status_name: 'Ready',
        owner: null, // Nullable field
        owner_data: null, // Nullable field
        ip_addresses: null, // Nullable field
        cpu_count: 4,
        memory: 8192,
        zone: {
          id: 1,
          name: 'default'
        },
        pool: {
          id: 1,
          name: 'default'
        },
        tags: []
      };

      const result = MaasMachineSchema.safeParse(machineWithNulls);
      expect(result.success).toBe(true);
    });
  });

  describe('MaasTagSchema', () => {
    test('should validate a valid tag object', () => {
      const validTag = {
        id: 1,
        name: 'test-tag',
        definition: 'nodes with property=value',
        comment: 'Test tag for testing',
        kernel_opts: 'console=tty0'
      };

      const result = MaasTagSchema.safeParse(validTag);
      expect(result.success).toBe(true);
    });

    test('should validate a tag with nullable fields', () => {
      const tagWithNulls = {
        id: 1,
        name: 'test-tag',
        definition: null,
        comment: null,
        kernel_opts: null
      };

      const result = MaasTagSchema.safeParse(tagWithNulls);
      expect(result.success).toBe(true);
    });

    test('should validate a tag with _meta containing string progressToken', () => {
      const tagWithMeta = {
        id: 1,
        name: 'test-tag',
        definition: 'nodes with property=value',
        comment: 'Test tag for testing',
        kernel_opts: 'console=tty0',
        _meta: {
          progressToken: 'token-123'
        }
      };

      const result = MaasTagSchema.safeParse(tagWithMeta);
      expect(result.success).toBe(true);
    });

    test('should validate a tag with _meta containing number progressToken', () => {
      const tagWithMeta = {
        id: 1,
        name: 'test-tag',
        definition: 'nodes with property=value',
        comment: 'Test tag for testing',
        kernel_opts: 'console=tty0',
        _meta: {
          progressToken: 12345
        }
      };

      const result = MaasTagSchema.safeParse(tagWithMeta);
      expect(result.success).toBe(true);
    });

    test('should validate a tag with empty _meta object', () => {
      const tagWithEmptyMeta = {
        id: 1,
        name: 'test-tag',
        definition: 'nodes with property=value',
        comment: 'Test tag for testing',
        kernel_opts: 'console=tty0',
        _meta: {}
      };

      const result = MaasTagSchema.safeParse(tagWithEmptyMeta);
      expect(result.success).toBe(true);
    });

    test('should reject a tag with invalid progressToken type in _meta', () => {
      const tagWithInvalidMeta = {
        id: 1,
        name: 'test-tag',
        definition: 'nodes with property=value',
        comment: 'Test tag for testing',
        kernel_opts: 'console=tty0',
        _meta: {
          progressToken: true // should be string or number
        }
      };

      const result = MaasTagSchema.safeParse(tagWithInvalidMeta);
      expect(result.success).toBe(false);
    });

    test('should reject an invalid tag object', () => {
      const invalidTag = {
        // Missing id
        name: 'test-tag',
        definition: 123 // Should be string or null
      };

      const result = MaasTagSchema.safeParse(invalidTag);
      expect(result.success).toBe(false);
    });
  });

  describe('Tool Parameter Schemas', () => {
    test('should validate valid ListMachinesParams', () => {
      const validParams: ListMachinesParams = {
        hostname: 'test-machine',
        status: 'ready',
        tag_names: ['tag1', 'tag2'], // Reverted to array
        mac_addresses: ['00:1A:2B:3C:4D:5E'] // Added example for mac_addresses as array
      };

      const result = ListMachinesParamsSchema.safeParse(validParams);
      expect(result.success).toBe(true);
    });

    test('should validate ListMachinesParams with _meta field', () => {
      const paramsWithMeta: ListMachinesParams = {
        hostname: 'test-machine',
        _meta: {
          progressToken: 'operation-123'
        }
      };

      const result = ListMachinesParamsSchema.safeParse(paramsWithMeta);
      expect(result.success).toBe(true);
    });

    test('should validate ListMachinesParams with number progressToken', () => {
      const paramsWithMeta: ListMachinesParams = {
        hostname: 'test-machine',
        _meta: {
          progressToken: 12345
        }
      };

      const result = ListMachinesParamsSchema.safeParse(paramsWithMeta);
      expect(result.success).toBe(true);
    });

    test('should validate ListMachinesParams with optional fields omitted', () => {
      const minimalParams: ListMachinesParams = {};

      const result = ListMachinesParamsSchema.safeParse(minimalParams);
      expect(result.success).toBe(true);
    });

    test('should validate valid GetMachineParams', () => {
      const validParams: GetMachineParams = {
        system_id: 'abc123'
      };

      const result = GetMachineParamsSchema.safeParse(validParams);
      expect(result.success).toBe(true);
    });

    test('should reject invalid GetMachineParams', () => {
      const invalidParams = {
        // Missing system_id
      };

      const result = GetMachineParamsSchema.safeParse(invalidParams);
      expect(result.success).toBe(false);
    });

    test('should validate valid CreateTagParams', () => {
      const validParams: CreateTagParams = {
        name: 'test-tag',
        comment: 'Test tag for testing',
        definition: 'property=value',
        kernel_opts: 'console=tty0'
      };

      const result = CreateTagParamsSchema.safeParse(validParams);
      expect(result.success).toBe(true);
    });

    test('should validate CreateTagParams with only required fields', () => {
      const minimalParams: CreateTagParams = {
        name: 'test-tag'
      };

      const result = CreateTagParamsSchema.safeParse(minimalParams);
      expect(result.success).toBe(true);
    });

    test('should reject invalid CreateTagParams', () => {
      const invalidParams = {
        // Missing name
        comment: 'Test tag for testing'
      };

      const result = CreateTagParamsSchema.safeParse(invalidParams);
      expect(result.success).toBe(false);
    });
  });

  // Type inference tests
  describe('Type Inference', () => {
    test('should correctly infer MaasMachine type', () => {
      // This is a compile-time test, not a runtime test
      // TypeScript will error if the type inference is incorrect
      const machine: MaasMachine = {
        system_id: 'abc123',
        hostname: 'test-machine',
        domain: {
          id: 1,
          name: 'maas'
        },
        architecture: 'amd64/generic',
        status: 4,
        status_name: 'Ready',
        owner: 'admin',
        owner_data: { 'key': 'value' },
        ip_addresses: ['192.168.1.100'],
        cpu_count: 4,
        memory: 8192,
        zone: {
          id: 1,
          name: 'default'
        },
        pool: {
          id: 1,
          name: 'default'
        },
        tags: ['tag1', 'tag2']
      };

      // Just a simple assertion to make Jest happy
      expect(machine.system_id).toBe('abc123');
    });

    test('should correctly infer MaasTag type', () => {
      const tag: MaasTag = {
        id: 1,
        name: 'test-tag',
        definition: 'nodes with property=value',
        comment: 'Test tag for testing',
        kernel_opts: 'console=tty0'
      };

      expect(tag.name).toBe('test-tag');
    });
  });
});