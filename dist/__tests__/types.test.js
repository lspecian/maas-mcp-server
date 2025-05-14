"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const machineDetailsSchema_js_1 = require("../mcp_resources/schemas/machineDetailsSchema.js");
const tagSchema_js_1 = require("../mcp_tools/schemas/tagSchema.js");
const listMachinesSchema_js_1 = require("../mcp_tools/schemas/listMachinesSchema.js");
const createTagSchema_js_1 = require("../mcp_tools/schemas/createTagSchema.js");
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
            const result = machineDetailsSchema_js_1.MaasMachineSchema.safeParse(validMachine);
            expect(result.success).toBe(true);
        });
        test('should reject an invalid machine object', () => {
            const invalidMachine = {
                // Missing required fields
                hostname: 'test-machine',
                status: 'not-a-number', // Should be a number
                tags: 'not-an-array' // Should be an array
            };
            const result = machineDetailsSchema_js_1.MaasMachineSchema.safeParse(invalidMachine);
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
            const result = machineDetailsSchema_js_1.MaasMachineSchema.safeParse(machineWithNulls);
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
            const result = tagSchema_js_1.MaasTagSchema.safeParse(validTag);
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
            const result = tagSchema_js_1.MaasTagSchema.safeParse(tagWithNulls);
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
            const result = tagSchema_js_1.MaasTagSchema.safeParse(tagWithMeta);
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
            const result = tagSchema_js_1.MaasTagSchema.safeParse(tagWithMeta);
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
            const result = tagSchema_js_1.MaasTagSchema.safeParse(tagWithEmptyMeta);
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
            const result = tagSchema_js_1.MaasTagSchema.safeParse(tagWithInvalidMeta);
            expect(result.success).toBe(false);
        });
        test('should reject an invalid tag object', () => {
            const invalidTag = {
                // Missing id
                name: 'test-tag',
                definition: 123 // Should be string or null
            };
            const result = tagSchema_js_1.MaasTagSchema.safeParse(invalidTag);
            expect(result.success).toBe(false);
        });
    });
    describe('Tool Parameter Schemas', () => {
        test('should validate valid ListMachinesParams', () => {
            const validParams = {
                hostname: 'test-machine',
                status: 'ready',
                tag_names: ['tag1', 'tag2'], // Reverted to array
                mac_addresses: ['00:1A:2B:3C:4D:5E'] // Added example for mac_addresses as array
            };
            const result = listMachinesSchema_js_1.listMachinesSchema.safeParse(validParams);
            expect(result.success).toBe(true);
        });
        test('should validate ListMachinesParams with _meta field', () => {
            const paramsWithMeta = {
                hostname: 'test-machine',
                _meta: {
                    progressToken: 'operation-123'
                }
            };
            const result = listMachinesSchema_js_1.listMachinesSchema.safeParse(paramsWithMeta);
            expect(result.success).toBe(true);
        });
        test('should validate ListMachinesParams with number progressToken', () => {
            const paramsWithMeta = {
                hostname: 'test-machine',
                _meta: {
                    progressToken: 12345
                }
            };
            const result = listMachinesSchema_js_1.listMachinesSchema.safeParse(paramsWithMeta);
            expect(result.success).toBe(true);
        });
        test('should validate ListMachinesParams with optional fields omitted', () => {
            const minimalParams = {};
            const result = listMachinesSchema_js_1.listMachinesSchema.safeParse(minimalParams);
            expect(result.success).toBe(true);
        });
        test('should validate valid GetMachineParams', () => {
            const validParams = {
                system_id: 'abc123'
            };
            const result = machineDetailsSchema_js_1.GetMachineParamsSchema.safeParse(validParams);
            expect(result.success).toBe(true);
        });
        test('should reject invalid GetMachineParams', () => {
            const invalidParams = {
            // Missing system_id
            };
            const result = machineDetailsSchema_js_1.GetMachineParamsSchema.safeParse(invalidParams);
            expect(result.success).toBe(false);
        });
        test('should validate valid CreateTagParams', () => {
            const validParams = {
                name: 'test-tag',
                comment: 'Test tag for testing',
                definition: 'property=value',
                kernel_opts: 'console=tty0'
            };
            const result = createTagSchema_js_1.createTagSchema.safeParse(validParams);
            expect(result.success).toBe(true);
        });
        test('should validate CreateTagParams with only required fields', () => {
            const minimalParams = {
                name: 'test-tag'
            };
            const result = createTagSchema_js_1.createTagSchema.safeParse(minimalParams);
            expect(result.success).toBe(true);
        });
        test('should reject invalid CreateTagParams', () => {
            const invalidParams = {
                // Missing name
                comment: 'Test tag for testing'
            };
            const result = createTagSchema_js_1.createTagSchema.safeParse(invalidParams);
            expect(result.success).toBe(false);
        });
    });
    // Type inference tests
    describe('Type Inference', () => {
        test('should correctly infer MaasMachine type', () => {
            // This is a compile-time test, not a runtime test
            // TypeScript will error if the type inference is incorrect
            const machine = {
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
            const tag = {
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
