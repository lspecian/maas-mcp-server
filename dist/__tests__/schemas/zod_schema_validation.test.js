"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const machineDetailsSchema_js_1 = require("../../mcp_resources/schemas/machineDetailsSchema.js");
const machineResponses_js_1 = require("../fixtures/machineResponses.js");
describe('Zod Schema Validation Tests', () => {
    describe('Basic Schema Validation', () => {
        test('should validate a complete machine object', () => {
            const result = machineDetailsSchema_js_1.MaasMachineSchema.safeParse(machineResponses_js_1.readyMachine);
            expect(result.success).toBe(true);
        });
        test('should validate a minimal machine object with required fields only', () => {
            const result = machineDetailsSchema_js_1.MaasMachineSchema.safeParse(machineResponses_js_1.minimalMachine);
            expect(result.success).toBe(true);
        });
        test('should validate a machine with null owner', () => {
            const result = machineDetailsSchema_js_1.MaasMachineSchema.safeParse(machineResponses_js_1.deployedMachine);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.owner).toBe('user1');
                expect(result.data.owner_data).toBe(null);
            }
        });
        test('should fail validation for an invalid machine missing required fields', () => {
            const result = machineDetailsSchema_js_1.MaasMachineSchema.safeParse(machineResponses_js_1.invalidMachine);
            expect(result.success).toBe(false);
            if (!result.success) {
                // Check that the error contains messages about missing required fields
                const errorMessages = result.error.errors.map(err => err.message).join(', ');
                expect(errorMessages).toContain('Required');
            }
        });
        test('should validate GetMachineParamsSchema with valid system_id', () => {
            const result = machineDetailsSchema_js_1.GetMachineParamsSchema.safeParse({ system_id: 'abc123' });
            expect(result.success).toBe(true);
        });
        test('should fail validation for GetMachineParamsSchema with missing system_id', () => {
            const result = machineDetailsSchema_js_1.GetMachineParamsSchema.safeParse({});
            expect(result.success).toBe(false);
        });
    });
    describe('Passthrough Functionality', () => {
        test('should accept and preserve additional properties with passthrough', () => {
            const result = machineDetailsSchema_js_1.MaasMachineSchema.safeParse(machineResponses_js_1.extendedMachine);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.extra_property).toBe('This is not in the schema');
                expect(result.data.another_extra).toBe(123);
                expect(result.data.nested_extra).toEqual({ something: 'value' });
            }
        });
        test('should handle deeply nested additional properties', () => {
            const machineWithNestedExtras = {
                ...machineResponses_js_1.readyMachine,
                deep_nested: {
                    level1: {
                        level2: {
                            level3: 'deeply nested value'
                        }
                    }
                }
            };
            const result = machineDetailsSchema_js_1.MaasMachineSchema.safeParse(machineWithNestedExtras);
            expect(result.success).toBe(true);
            if (result.success) {
                // Use type assertion for passthrough properties
                expect(result.data.deep_nested.level1.level2.level3).toBe('deeply nested value');
            }
        });
        test('should handle large number of additional properties', () => {
            const machineWithManyProps = { ...machineResponses_js_1.readyMachine };
            // Add 50 additional properties
            for (let i = 0; i < 50; i++) {
                machineWithManyProps[`extra_prop_${i}`] = `value_${i}`;
            }
            const result = machineDetailsSchema_js_1.MaasMachineSchema.safeParse(machineWithManyProps);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.extra_prop_0).toBe('value_0');
                expect(result.data.extra_prop_49).toBe('value_49');
            }
        });
        test('should handle unusual property names', () => {
            const machineWithUnusualProps = {
                ...machineResponses_js_1.readyMachine,
                '$special@prop': 'special value',
                '123numeric': 456,
                'property with spaces': 'spaced value',
                'emoji😀property': 'emoji value'
            };
            const result = machineDetailsSchema_js_1.MaasMachineSchema.safeParse(machineWithUnusualProps);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data['$special@prop']).toBe('special value');
                expect(result.data['123numeric']).toBe(456);
                expect(result.data['property with spaces']).toBe('spaced value');
                expect(result.data['emoji😀property']).toBe('emoji value');
            }
        });
        test('should still validate required fields even with passthrough', () => {
            const machineWithExtrasMissingRequired = {
                ...machineResponses_js_1.invalidMachine,
                extra_field: 'extra value'
            };
            const result = machineDetailsSchema_js_1.MaasMachineSchema.safeParse(machineWithExtrasMissingRequired);
            expect(result.success).toBe(false);
        });
    });
    describe('owner_data Type Implementation', () => {
        test('should validate with simple key-value owner_data', () => {
            const machine = {
                ...machineResponses_js_1.readyMachine,
                owner_data: { name: 'John Doe', department: 'Engineering', employee_id: 12345 }
            };
            const result = machineDetailsSchema_js_1.MaasMachineSchema.safeParse(machine);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.owner_data).toEqual({
                    name: 'John Doe',
                    department: 'Engineering',
                    employee_id: 12345
                });
            }
        });
        test('should validate with nested objects in owner_data', () => {
            const machine = {
                ...machineResponses_js_1.readyMachine,
                owner_data: {
                    contact: {
                        email: 'john.doe@example.com',
                        phone: '555-1234',
                        address: {
                            street: '123 Main St',
                            city: 'Anytown',
                            zip: '12345'
                        }
                    },
                    projects: ['Alpha', 'Beta', 'Gamma']
                }
            };
            const result = machineDetailsSchema_js_1.MaasMachineSchema.safeParse(machine);
            expect(result.success).toBe(true);
            if (result.success) {
                // Add null check for owner_data
                expect(result.data.owner_data).not.toBeNull();
                if (result.data.owner_data) {
                    expect(result.data.owner_data.contact.email).toBe('john.doe@example.com');
                    expect(result.data.owner_data.contact.address.city).toBe('Anytown');
                    expect(result.data.owner_data.projects).toEqual(['Alpha', 'Beta', 'Gamma']);
                }
            }
        });
        test('should validate with arrays in owner_data', () => {
            const machine = {
                ...machineResponses_js_1.readyMachine,
                owner_data: {
                    tags: ['production', 'web-server', 'high-priority'],
                    metrics: [
                        { name: 'cpu_usage', value: 75, unit: 'percent' },
                        { name: 'memory_usage', value: 4096, unit: 'MB' }
                    ]
                }
            };
            const result = machineDetailsSchema_js_1.MaasMachineSchema.safeParse(machine);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.owner_data).not.toBeNull();
                if (result.data.owner_data) {
                    expect(result.data.owner_data.tags).toEqual(['production', 'web-server', 'high-priority']);
                    expect(result.data.owner_data.metrics[0].name).toBe('cpu_usage');
                    expect(result.data.owner_data.metrics[1].value).toBe(4096);
                }
            }
        });
        test('should validate with mixed types in owner_data', () => {
            const machine = {
                ...machineResponses_js_1.readyMachine,
                owner_data: {
                    name: 'John Doe',
                    active: true,
                    last_login: new Date('2025-01-01').toISOString(),
                    login_count: 42,
                    preferences: null,
                    settings: undefined
                }
            };
            const result = machineDetailsSchema_js_1.MaasMachineSchema.safeParse(machine);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.owner_data).not.toBeNull();
                if (result.data.owner_data) {
                    expect(result.data.owner_data.name).toBe('John Doe');
                    expect(result.data.owner_data.active).toBe(true);
                    expect(typeof result.data.owner_data.last_login).toBe('string');
                    expect(result.data.owner_data.login_count).toBe(42);
                    expect(result.data.owner_data.preferences).toBe(null);
                    expect(result.data.owner_data.settings).toBe(undefined);
                }
            }
        });
        test('should validate with null owner_data', () => {
            const machine = {
                ...machineResponses_js_1.readyMachine,
                owner_data: null
            };
            const result = machineDetailsSchema_js_1.MaasMachineSchema.safeParse(machine);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.owner_data).toBe(null);
            }
        });
        test('should validate with empty object owner_data', () => {
            const machine = {
                ...machineResponses_js_1.readyMachine,
                owner_data: {}
            };
            const result = machineDetailsSchema_js_1.MaasMachineSchema.safeParse(machine);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.owner_data).toEqual({});
            }
        });
        test('should validate with large owner_data object', () => {
            const largeOwnerData = {};
            // Create a large object with 100 properties
            for (let i = 0; i < 100; i++) {
                largeOwnerData[`property_${i}`] = `value_${i}`;
            }
            const machine = {
                ...machineResponses_js_1.readyMachine,
                owner_data: largeOwnerData
            };
            const result = machineDetailsSchema_js_1.MaasMachineSchema.safeParse(machine);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.owner_data).not.toBeNull();
                if (result.data.owner_data) {
                    expect(Object.keys(result.data.owner_data).length).toBe(100);
                    expect(result.data.owner_data.property_0).toBe('value_0');
                    expect(result.data.owner_data.property_99).toBe('value_99');
                }
            }
        });
    });
    describe('Error Handling', () => {
        test('should provide detailed error messages for invalid types', () => {
            const invalidTypeMachine = {
                ...machineResponses_js_1.readyMachine,
                system_id: 123, // Should be string
                cpu_count: '4', // Should be number
                tags: 'tag1,tag2' // Should be array
            };
            const result = machineDetailsSchema_js_1.MaasMachineSchema.safeParse(invalidTypeMachine);
            expect(result.success).toBe(false);
            if (!result.success) {
                const errorMessages = result.error.errors.map(err => err.message).join(', ');
                expect(errorMessages).toContain('Expected string');
                expect(errorMessages).toContain('Expected number');
                expect(errorMessages).toContain('Expected array');
            }
        });
        test('should provide path information in error objects', () => {
            const invalidNestedMachine = {
                ...machineResponses_js_1.readyMachine,
                domain: {
                    id: 'one', // Should be number
                    name: 123 // Should be string
                }
            };
            const result = machineDetailsSchema_js_1.MaasMachineSchema.safeParse(invalidNestedMachine);
            expect(result.success).toBe(false);
            if (!result.success) {
                const errors = result.error.errors;
                // Check that errors contain path information
                const domainIdError = errors.find(err => err.path.includes('domain') && err.path.includes('id'));
                const domainNameError = errors.find(err => err.path.includes('domain') && err.path.includes('name'));
                expect(domainIdError).toBeDefined();
                expect(domainNameError).toBeDefined();
            }
        });
        test('should handle multiple validation errors', () => {
            const multipleErrorsMachine = {
                ...machineResponses_js_1.readyMachine,
                system_id: 123, // Invalid type
                hostname: '', // Empty string
                status: -1, // Negative number
                cpu_count: 0, // Zero value
                memory: 'lots', // Invalid type
                tags: null // Should be array
            };
            const result = machineDetailsSchema_js_1.MaasMachineSchema.safeParse(multipleErrorsMachine);
            expect(result.success).toBe(false);
            if (!result.success) {
                // Check that we have multiple errors
                expect(result.error.errors.length).toBeGreaterThan(1);
            }
        });
    });
    describe('Integration with API Patterns', () => {
        test('should validate a machine object from API response', () => {
            // Simulate an API response with a machine object
            const apiResponse = {
                system_id: 'api123',
                hostname: 'api-machine',
                domain: { id: 1, name: 'maas' },
                architecture: 'amd64/generic',
                status: 4,
                status_name: 'Ready',
                owner: 'admin',
                owner_data: { api_key: 'secret123', permissions: ['read', 'write'] },
                ip_addresses: ['192.168.1.100'],
                cpu_count: 4,
                memory: 8192,
                zone: { id: 1, name: 'default' },
                pool: { id: 1, name: 'default' },
                tags: ['api', 'test'],
                // Additional properties not in schema
                _links: {
                    self: { href: '/api/machines/api123' },
                    edit: { href: '/api/machines/api123/edit' }
                },
                resource_uri: '/MAAS/api/2.0/machines/api123/'
            };
            const result = machineDetailsSchema_js_1.MaasMachineSchema.safeParse(apiResponse);
            expect(result.success).toBe(true);
            if (result.success) {
                // Check that schema-defined properties are preserved
                expect(result.data.system_id).toBe('api123');
                expect(result.data.hostname).toBe('api-machine');
                // Check that additional properties are preserved with passthrough
                // Use type assertion for passthrough properties
                expect(result.data._links.self.href).toBe('/api/machines/api123');
                expect(result.data.resource_uri).toBe('/MAAS/api/2.0/machines/api123/');
            }
        });
        test('should transform data during validation if transform functions are defined', () => {
            // Create a schema with a transform function
            const SchemaWithTransform = machineDetailsSchema_js_1.MaasMachineSchema.transform(data => ({
                ...data,
                hostname: data.hostname.toUpperCase(),
                transformed: true
            }));
            const result = SchemaWithTransform.safeParse(machineResponses_js_1.readyMachine);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.hostname).toBe('TEST-MACHINE-1'); // Uppercase
                expect(result.data.transformed).toBe(true); // Added field
            }
        });
        test('should validate query parameters for machine details', () => {
            const validParams = { system_id: 'abc123' };
            const result = machineDetailsSchema_js_1.GetMachineParamsSchema.safeParse(validParams);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.system_id).toBe('abc123');
            }
        });
    });
    describe('Advanced Schema Features', () => {
        test('should create a custom schema with refined owner_data validation', () => {
            // Create a custom schema with more specific owner_data validation
            const CustomMachineSchema = machineDetailsSchema_js_1.MaasMachineSchema.extend({
                owner_data: zod_1.z.record(zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.boolean()])).nullable()
            });
            // Valid data according to the refined schema
            const validMachine = {
                ...machineResponses_js_1.readyMachine,
                owner_data: {
                    name: 'John',
                    age: 30,
                    active: true
                }
            };
            const validResult = CustomMachineSchema.safeParse(validMachine);
            expect(validResult.success).toBe(true);
            // Invalid data according to the refined schema
            const invalidMachine = {
                ...machineResponses_js_1.readyMachine,
                owner_data: {
                    name: 'John',
                    complex: { nested: 'object' } // Object not allowed in refined schema
                }
            };
            const invalidResult = CustomMachineSchema.safeParse(invalidMachine);
            expect(invalidResult.success).toBe(false);
        });
        test('should demonstrate combining passthrough with strict validation for specific fields', () => {
            // Create a schema that's strict for a nested object but passthrough for the root
            const MixedStrictnessSchema = zod_1.z.object({
                system_id: zod_1.z.string(),
                metadata: zod_1.z.object({
                    created_by: zod_1.z.string(),
                    created_at: zod_1.z.string()
                }).strict(), // Strict for this nested object
                // Other fields omitted for brevity
            }).passthrough();
            // Valid data
            const validData = {
                system_id: 'xyz789',
                metadata: {
                    created_by: 'admin',
                    created_at: '2025-01-01'
                },
                extra_root_field: 'allowed by passthrough'
            };
            const validResult = MixedStrictnessSchema.safeParse(validData);
            expect(validResult.success).toBe(true);
            // Invalid data - extra field in strict nested object
            const invalidData = {
                system_id: 'xyz789',
                metadata: {
                    created_by: 'admin',
                    created_at: '2025-01-01',
                    extra_field: 'not allowed in strict object'
                },
                extra_root_field: 'allowed by passthrough'
            };
            const invalidResult = MixedStrictnessSchema.safeParse(invalidData);
            expect(invalidResult.success).toBe(false);
        });
    });
});
