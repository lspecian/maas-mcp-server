import { listMachinesSchema } from '../mcp_tools/schemas/listMachinesSchema.js';

describe('List Machines Schema', () => {
  test('should accept an empty object (all parameters optional)', () => {
    const result = listMachinesSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  test('should accept valid hostname patterns', () => {
    const result = listMachinesSchema.safeParse({
      hostname: 'web-server-*'
    });
    expect(result.success).toBe(true);
  });

  test('should accept valid MAC address formats', () => {
    const result = listMachinesSchema.safeParse({
      mac_address: '00:11:22:33:44:55'
    });
    expect(result.success).toBe(true);
  });

  test('should accept array of tag names', () => {
    const result = listMachinesSchema.safeParse({
      tag_names: ['web', 'production', 'ubuntu']
    });
    expect(result.success).toBe(true);
  });

  test('should accept multiple valid parameters', () => {
    const result = listMachinesSchema.safeParse({
      hostname: 'web-*',
      status: 'ready',
      zone: 'default',
      limit: 10
    });
    expect(result.success).toBe(true);
  });

  test('should accept _meta with string progressToken', () => {
    const result = listMachinesSchema.safeParse({
      hostname: 'web-*',
      _meta: {
        progressToken: 'token-123'
      }
    });
    expect(result.success).toBe(true);
  });

  test('should accept _meta with number progressToken', () => {
    const result = listMachinesSchema.safeParse({
      hostname: 'web-*',
      _meta: {
        progressToken: 12345
      }
    });
    expect(result.success).toBe(true);
  });

  test('should accept empty _meta object', () => {
    const result = listMachinesSchema.safeParse({
      hostname: 'web-*',
      _meta: {}
    });
    expect(result.success).toBe(true);
  });

  test('should reject invalid progressToken type in _meta', () => {
    const result = listMachinesSchema.safeParse({
      hostname: 'web-*',
      _meta: {
        progressToken: true // should be string or number
      }
    });
    expect(result.success).toBe(false);
  });

  test('should reject invalid types for hostname', () => {
    const result = listMachinesSchema.safeParse({
      hostname: 123 // should be string
    });
    expect(result.success).toBe(false);
  });

  test('should reject invalid types for tag_names', () => {
    const result = listMachinesSchema.safeParse({
      tag_names: 'web,production' // should be array of strings
    });
    expect(result.success).toBe(false);
  });

  test('should reject invalid types for limit', () => {
    const result = listMachinesSchema.safeParse({
      limit: -5 // should be positive number
    });
    expect(result.success).toBe(false);
  });

  test('should reject invalid types for offset', () => {
    const result = listMachinesSchema.safeParse({
      offset: -1 // should be non-negative number
    });
    expect(result.success).toBe(false);
  });
});