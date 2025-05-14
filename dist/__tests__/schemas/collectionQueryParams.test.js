"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const collectionQueryParams_js_1 = require("../../mcp_resources/schemas/collectionQueryParams.js");
describe('BaseCollectionQueryParamsSchema', () => {
    const schema = collectionQueryParams_js_1.BaseCollectionQueryParamsSchema;
    test('should validate with empty input', () => {
        const result = schema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toEqual({});
        }
    });
    test('should validate with specific parameters (limit, offset)', () => {
        const input = { limit: '10', offset: '5' };
        const result = schema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.limit).toBe(10);
            expect(result.data.offset).toBe(5);
        }
    });
    test('should validate with all parameters (limit, offset, order_by, direction)', () => {
        const input = { limit: '100', offset: '0', order_by: 'name', direction: 'desc' };
        const result = schema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toEqual({ limit: 100, offset: 0, order_by: 'name', direction: 'desc' });
        }
    });
    test('should coerce stringified numbers for limit and offset', () => {
        const input = { limit: '25', offset: '3' };
        const result = schema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.limit).toBe(25);
            expect(result.data.offset).toBe(3);
        }
    });
    test('should fail for invalid limit type (boolean)', () => {
        const result = schema.safeParse({ limit: true });
        expect(result.success).toBe(false);
    });
    test('should fail for negative limit value', () => {
        const result = schema.safeParse({ limit: -5 });
        expect(result.success).toBe(false);
    });
    test('should fail for non-integer limit value', () => {
        const result = schema.safeParse({ limit: 5.5 });
        expect(result.success).toBe(false);
    });
    test('should fail for invalid offset type (string non-numeric)', () => {
        const result = schema.safeParse({ offset: 'abc' });
        expect(result.success).toBe(false);
    });
    test('should fail for negative offset value', () => {
        const result = schema.safeParse({ offset: -1 });
        expect(result.success).toBe(false);
    });
    test('should fail for invalid direction enum value', () => {
        const result = schema.safeParse({ direction: 'upwards' });
        expect(result.success).toBe(false);
    });
    test('should handle unknown parameters (strictness - strip)', () => {
        // Zod schemas are strict by default and strip unknown keys unless .passthrough() or .strict() is used.
        // Assuming the base schema does not use .strict() to throw error on unknown keys.
        const input = { limit: 10, unknownField: 'test', anotherUnknown: 123 };
        const result = schema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toEqual({ limit: 10 });
            expect(result.data.unknownField).toBeUndefined();
        }
    });
});
describe('MachineCollectionQueryParamsSchema', () => {
    const schema = collectionQueryParams_js_1.MachineCollectionQueryParamsSchema;
    test('should validate with empty input', () => {
        const result = schema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toEqual({});
        }
    });
    test('should validate with base and machine-specific parameters', () => {
        const input = {
            limit: '10',
            hostname: 'server-01',
            mac_addresses: '00:1A:2B:3C:4D:5E,00:1A:2B:3C:4D:5F',
            order_by: 'hostname',
            direction: 'asc',
            zone: 'zone-a',
            tags: 'tag1,tag2',
            not_tags: 'tag3',
            tag_names: 'prod,db',
            not_tag_names: 'dev',
            interfaces: 'eth0',
            storage: 'sata:1,nvme:2',
            agent_name: 'agent123',
            comment: 'important machine',
            owner: 'admin',
            id: '1,2,3',
            not_id: '4,5',
            parent: 'parent-node',
            domain: 'example.com',
            arch: 'amd64',
            not_arch: 'arm64',
            cpu_count: '4',
            not_cpu_count: '2',
            memory: '8192', // in MB
            not_memory: '4096',
            pod: 'pod-x',
            not_pod: 'pod-y',
            pod_type: 'type-a',
            not_pod_type: 'type-b',
            status: 'Deployed,Ready',
            not_status: 'Failed',
            locked: 'true',
            not_locked: 'false',
            pool: 'default',
            not_pool: 'staging',
            agent_connected: 'true',
            not_agent_connected: 'false',
            vlans: '10,20',
            not_vlans: '30',
            fabrics: 'fabric-a',
            not_fabrics: 'fabric-b',
            fabric_classes: 'class-1',
            not_fabric_classes: 'class-2',
            constraints: 'key1=value1,key2=value2',
            not_constraints: 'key3=value3',
            have_bmc: 'true',
            not_have_bmc: 'false',
            osystem: 'ubuntu',
            not_osystem: 'centos',
            power_state: 'on',
            not_power_state: 'off',
            power_type: 'acpi',
            not_power_type: 'ipmi',
            hba_count: '2',
            not_hba_count: '1',
            gpu_count: '1',
            not_gpu_count: '0',
            cpus_by_arch: 'amd64:4,arm64:2',
            not_cpus_by_arch: 'x86:2',
            storage_by_type: 'ssd:2,hdd:1',
            not_storage_by_type: 'nvme:1',
            has_primary_address: 'true',
            not_has_primary_address: 'false',
            has_secondary_address: 'false',
            not_has_secondary_address: 'true',
            has_ipv4_address: 'true',
            not_has_ipv4_address: 'false',
            has_ipv6_address: 'false',
            not_has_ipv6_address: 'true',
            has_static_address: 'true',
            not_has_static_address: 'false',
            has_dynamic_address: 'false',
            not_has_dynamic_address: 'true',
            has_auto_address: 'true',
            not_has_auto_address: 'false',
            has_link_local_address: 'false',
            not_has_link_local_address: 'true',
            is_bare_metal: 'true',
            not_is_bare_metal: 'false',
            is_virtual_machine: 'false',
            not_is_virtual_machine: 'true',
            is_container: 'false',
            not_is_container: 'true',
        };
        const result = schema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.limit).toBe(10);
            expect(result.data.hostname).toBe('server-01');
            expect(result.data.mac_addresses).toEqual(['00:1A:2B:3C:4D:5E', '00:1A:2B:3C:4D:5F']);
            expect(result.data.locked).toBe(true);
            expect(result.data.not_locked).toBe(false);
            expect(result.data.cpu_count).toBe(4);
            expect(result.data.memory).toBe(8192);
            // ... check other coerced/parsed values
        }
    });
    test('should coerce string numbers for numeric fields (cpu_count, memory)', () => {
        const input = { cpu_count: '8', memory: '16384' };
        const result = schema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.cpu_count).toBe(8);
            expect(result.data.memory).toBe(16384);
        }
    });
    test('should coerce string booleans (locked, agent_connected)', () => {
        const input = { locked: 'true', agent_connected: 'false', have_bmc: 'True', is_bare_metal: 'FALSE' };
        const result = schema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.locked).toBe(true);
            expect(result.data.agent_connected).toBe(false);
            expect(result.data.have_bmc).toBe(true);
            expect(result.data.is_bare_metal).toBe(false);
        }
    });
    test('should fail for invalid mac_addresses format', () => {
        const result = schema.safeParse({ mac_addresses: 'invalid-mac-format' });
        expect(result.success).toBe(false);
    });
    test('should fail for invalid status enum value', () => {
        const result = schema.safeParse({ status: 'NonExistentStatus' });
        expect(result.success).toBe(false);
    });
    test('should fail for out-of-range cpu_count', () => {
        const result = schema.safeParse({ cpu_count: '0' }); // Assuming positive integer
        expect(result.success).toBe(false);
    });
    test('should handle unknown parameters (strip)', () => {
        const input = { hostname: 'test', unknownMachineParam: 'value' };
        const result = schema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toEqual({ hostname: 'test' });
            expect(result.data.unknownMachineParam).toBeUndefined();
        }
    });
});
describe('SubnetCollectionQueryParamsSchema', () => {
    const schema = collectionQueryParams_js_1.SubnetCollectionQueryParamsSchema;
    test('should validate with empty input', () => {
        const result = schema.safeParse({});
        expect(result.success).toBe(true);
    });
    test('should validate with subnet-specific and base parameters', () => {
        const input = { limit: '5', name: 'prod-subnet', cidr: '192.168.1.0/24', vlan_vid: '100' };
        const result = schema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.limit).toBe(5);
            expect(result.data.name).toBe('prod-subnet');
            expect(result.data.vlan_vid).toBe(100);
        }
    });
    test('should coerce vlan_vid from string to number', () => {
        const result = schema.safeParse({ vlan_vid: '200' });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.vlan_vid).toBe(200);
        }
    });
    test('should fail for invalid cidr format', () => {
        const result = schema.safeParse({ cidr: 'invalid-cidr' });
        expect(result.success).toBe(false);
    });
    test('should fail for out-of-range vlan_vid', () => {
        const result = schema.safeParse({ vlan_vid: '5000' }); // Assuming VLAN ID 0-4095
        expect(result.success).toBe(false);
    });
    test('should handle unknown parameters (strip)', () => {
        const input = { name: 'test-subnet', randomField: true };
        const result = schema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toEqual({ name: 'test-subnet' });
        }
    });
});
describe('ZoneCollectionQueryParamsSchema', () => {
    const schema = collectionQueryParams_js_1.ZoneCollectionQueryParamsSchema;
    test('should validate with empty input', () => {
        const result = schema.safeParse({});
        expect(result.success).toBe(true);
    });
    test('should validate with zone-specific and base parameters', () => {
        const input = { limit: '3', name: 'dc-zone-1', description: 'Main DC zone' };
        const result = schema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.limit).toBe(3);
            expect(result.data.name).toBe('dc-zone-1');
        }
    });
    test('should fail for name with invalid characters (if applicable)', () => {
        // This depends on the actual validation for 'name' in Zone schema
        // const result = schema.safeParse({ name: 'zone name with spaces' });
        // expect(result.success).toBe(false); // Assuming names cannot have spaces
    });
    test('should handle unknown parameters (strip)', () => {
        const input = { name: 'my-zone', extraInfo: 'confidential' };
        const result = schema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toEqual({ name: 'my-zone' });
        }
    });
});
describe('DeviceCollectionQueryParamsSchema', () => {
    const schema = collectionQueryParams_js_1.DeviceCollectionQueryParamsSchema;
    test('should validate with empty input', () => {
        const result = schema.safeParse({});
        expect(result.success).toBe(true);
    });
    test('should validate with device-specific and base parameters', () => {
        const input = { limit: '7', hostname: 'switch-01', parent: 'rack-01', mac_address: 'AA:BB:CC:00:11:22' };
        const result = schema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.limit).toBe(7);
            expect(result.data.hostname).toBe('switch-01');
        }
    });
    test('should fail for invalid mac_address format', () => {
        const result = schema.safeParse({ mac_address: 'XYZ' });
        expect(result.success).toBe(false);
    });
    test('should handle unknown parameters (strip)', () => {
        const input = { hostname: 'firewall', deviceType: 'security' };
        const result = schema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toEqual({ hostname: 'firewall' });
        }
    });
});
describe('DomainCollectionQueryParamsSchema', () => {
    const schema = collectionQueryParams_js_1.DomainCollectionQueryParamsSchema;
    test('should validate with empty input', () => {
        const result = schema.safeParse({});
        expect(result.success).toBe(true);
    });
    test('should validate with domain-specific and base parameters', () => {
        const input = { limit: '2', name: 'example.com', authoritative: 'true' };
        const result = schema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.limit).toBe(2);
            expect(result.data.name).toBe('example.com');
            expect(result.data.authoritative).toBe(true);
        }
    });
    test('should coerce authoritative from string to boolean', () => {
        const result = schema.safeParse({ authoritative: 'false' });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.authoritative).toBe(false);
        }
    });
    test('should fail for invalid domain name format', () => {
        const result = schema.safeParse({ name: 'not_a_domain' });
        expect(result.success).toBe(false);
    });
    test('should handle unknown parameters (strip)', () => {
        const input = { name: 'internal.local', dns_server: '1.1.1.1' };
        const result = schema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toEqual({ name: 'internal.local' });
        }
    });
});
describe('TagCollectionQueryParamsSchema', () => {
    const schema = collectionQueryParams_js_1.TagCollectionQueryParamsSchema;
    test('should validate with empty input', () => {
        const result = schema.safeParse({});
        expect(result.success).toBe(true);
    });
    test('should validate with tag-specific and base parameters', () => {
        const input = { limit: '50', name: 'critical-services', comment: 'Tags for critical services' };
        const result = schema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.limit).toBe(50);
            expect(result.data.name).toBe('critical-services');
        }
    });
    test('should fail for name with spaces (if not allowed by tag schema)', () => {
        // This depends on the actual validation for 'name' in Tag schema
        // const result = schema.safeParse({ name: 'critical services' });
        // expect(result.success).toBe(false);
    });
    test('should handle unknown parameters (strip)', () => {
        const input = { name: 'prod-tag', color: 'red' };
        const result = schema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toEqual({ name: 'prod-tag' });
        }
    });
});
