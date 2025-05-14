"use strict";
/**
 * Tests for Resource Handler URI Parsing
 *
 * This file provides comprehensive tests for URI parsing in resource handlers,
 * covering various edge cases and validation scenarios.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const uriPatterns_js_1 = require("../../mcp_resources/schemas/uriPatterns.js");
const resourceUtils_js_1 = require("../../mcp_resources/utils/resourceUtils.js");
const maas_ts_1 = require("../../types/maas.ts");
const zod_1 = require("zod");
// Mock the logger module
jest.mock('../../utils/logger.ts', () => ({
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    generateRequestId: jest.fn(() => 'mock-request-id'),
}));
// Mock the audit logger module
jest.mock('../../utils/auditLogger.js', () => ({
    logResourceAccessFailure: jest.fn(),
}));
describe('Resource Handler URI Parsing', () => {
    // Define test schemas for validation
    const MachineParamsSchema = zod_1.z.object({
        system_id: zod_1.z.string(),
    });
    const TagParamsSchema = zod_1.z.object({
        tag_name: zod_1.z.string(),
    });
    const SubnetParamsSchema = zod_1.z.object({
        subnet_id: zod_1.z.string(),
    });
    const ZoneParamsSchema = zod_1.z.object({
        zone_id: zod_1.z.string(),
    });
    const DeviceParamsSchema = zod_1.z.object({
        system_id: zod_1.z.string(),
    });
    const DomainParamsSchema = zod_1.z.object({
        domain_id: zod_1.z.string(),
    });
    describe('Machine Resource URI Parsing', () => {
        it('should extract system_id from machine details URI', () => {
            const uri = 'maas://machine/abc123/details';
            const params = (0, uriPatterns_js_1.extractParamsFromUri)(uri, uriPatterns_js_1.MACHINE_DETAILS_URI_PATTERN);
            expect(params).toEqual({ system_id: 'abc123' });
        });
        it('should validate machine details URI parameters', () => {
            const uri = 'maas://machine/abc123/details';
            const params = (0, resourceUtils_js_1.extractAndValidateParams)(uri, uriPatterns_js_1.MACHINE_DETAILS_URI_PATTERN, MachineParamsSchema, 'Machine');
            expect(params).toEqual({ system_id: 'abc123' });
        });
        it('should throw error for invalid machine details URI', () => {
            const uri = 'maas://machine//details'; // Missing system_id
            expect(() => {
                (0, resourceUtils_js_1.extractAndValidateParams)(uri, uriPatterns_js_1.MACHINE_DETAILS_URI_PATTERN, MachineParamsSchema, 'Machine');
            }).toThrow(maas_ts_1.MaasApiError);
        });
        it('should handle machines list URI with query parameters', () => {
            const uri = 'maas://machines/list?hostname=test&status=Ready';
            const params = (0, uriPatterns_js_1.extractParamsFromUri)(uri, uriPatterns_js_1.MACHINES_LIST_URI_PATTERN);
            expect(params).toEqual({});
            // Query parameters should be extracted separately
            const url = new URL(uri);
            const queryParams = {};
            url.searchParams.forEach((value, key) => {
                queryParams[key] = value;
            });
            expect(queryParams).toEqual({
                hostname: 'test',
                status: 'Ready',
            });
        });
    });
    describe('Tag Resource URI Parsing', () => {
        it('should extract tag_name from tag details URI', () => {
            const uri = 'maas://tag/my-tag/details';
            const params = (0, uriPatterns_js_1.extractParamsFromUri)(uri, uriPatterns_js_1.TAG_DETAILS_URI_PATTERN);
            expect(params).toEqual({ tag_name: 'my-tag' });
        });
        it('should validate tag details URI parameters', () => {
            const uri = 'maas://tag/my-tag/details';
            const params = (0, resourceUtils_js_1.extractAndValidateParams)(uri, uriPatterns_js_1.TAG_DETAILS_URI_PATTERN, TagParamsSchema, 'Tag');
            expect(params).toEqual({ tag_name: 'my-tag' });
        });
        it('should throw error for invalid tag details URI', () => {
            const uri = 'maas://tag//details'; // Missing tag_name
            expect(() => {
                (0, resourceUtils_js_1.extractAndValidateParams)(uri, uriPatterns_js_1.TAG_DETAILS_URI_PATTERN, TagParamsSchema, 'Tag');
            }).toThrow(maas_ts_1.MaasApiError);
        });
        it('should extract tag_name from tag machines URI', () => {
            const uri = 'maas://tag/my-tag/machines';
            const params = (0, uriPatterns_js_1.extractParamsFromUri)(uri, uriPatterns_js_1.TAG_MACHINES_URI_PATTERN);
            expect(params).toEqual({ tag_name: 'my-tag' });
        });
        it('should handle tags list URI with query parameters', () => {
            const uri = 'maas://tags/list?name=test&limit=10';
            const params = (0, uriPatterns_js_1.extractParamsFromUri)(uri, uriPatterns_js_1.TAGS_LIST_URI_PATTERN);
            expect(params).toEqual({});
            // Query parameters should be extracted separately
            const url = new URL(uri);
            const queryParams = {};
            url.searchParams.forEach((value, key) => {
                queryParams[key] = value;
            });
            expect(queryParams).toEqual({
                name: 'test',
                limit: '10',
            });
        });
    });
    describe('Subnet Resource URI Parsing', () => {
        it('should extract subnet_id from subnet details URI', () => {
            const uri = 'maas://subnet/123/details';
            const params = (0, uriPatterns_js_1.extractParamsFromUri)(uri, uriPatterns_js_1.SUBNET_DETAILS_URI_PATTERN);
            expect(params).toEqual({ subnet_id: '123' });
        });
        it('should validate subnet details URI parameters', () => {
            const uri = 'maas://subnet/123/details';
            const params = (0, resourceUtils_js_1.extractAndValidateParams)(uri, uriPatterns_js_1.SUBNET_DETAILS_URI_PATTERN, SubnetParamsSchema, 'Subnet');
            expect(params).toEqual({ subnet_id: '123' });
        });
        it('should throw error for invalid subnet details URI', () => {
            const uri = 'maas://subnet//details'; // Missing subnet_id
            expect(() => {
                (0, resourceUtils_js_1.extractAndValidateParams)(uri, uriPatterns_js_1.SUBNET_DETAILS_URI_PATTERN, SubnetParamsSchema, 'Subnet');
            }).toThrow(maas_ts_1.MaasApiError);
        });
        it('should handle subnets list URI with query parameters', () => {
            const uri = 'maas://subnets/list?cidr=10.0.0.0/24&vlan=1';
            const params = (0, uriPatterns_js_1.extractParamsFromUri)(uri, uriPatterns_js_1.SUBNETS_LIST_URI_PATTERN);
            expect(params).toEqual({});
            // Query parameters should be extracted separately
            const url = new URL(uri);
            const queryParams = {};
            url.searchParams.forEach((value, key) => {
                queryParams[key] = value;
            });
            expect(queryParams).toEqual({
                cidr: '10.0.0.0/24',
                vlan: '1',
            });
        });
    });
    describe('Zone Resource URI Parsing', () => {
        it('should extract zone_id from zone details URI', () => {
            const uri = 'maas://zone/default/details';
            const params = (0, uriPatterns_js_1.extractParamsFromUri)(uri, uriPatterns_js_1.ZONE_DETAILS_URI_PATTERN);
            expect(params).toEqual({ zone_id: 'default' });
        });
        it('should validate zone details URI parameters', () => {
            const uri = 'maas://zone/default/details';
            const params = (0, resourceUtils_js_1.extractAndValidateParams)(uri, uriPatterns_js_1.ZONE_DETAILS_URI_PATTERN, ZoneParamsSchema, 'Zone');
            expect(params).toEqual({ zone_id: 'default' });
        });
        it('should throw error for invalid zone details URI', () => {
            const uri = 'maas://zone//details'; // Missing zone_id
            expect(() => {
                (0, resourceUtils_js_1.extractAndValidateParams)(uri, uriPatterns_js_1.ZONE_DETAILS_URI_PATTERN, ZoneParamsSchema, 'Zone');
            }).toThrow(maas_ts_1.MaasApiError);
        });
        it('should handle zones list URI with query parameters', () => {
            const uri = 'maas://zones/list?name=default&limit=10';
            const params = (0, uriPatterns_js_1.extractParamsFromUri)(uri, uriPatterns_js_1.ZONES_LIST_URI_PATTERN);
            expect(params).toEqual({});
            // Query parameters should be extracted separately
            const url = new URL(uri);
            const queryParams = {};
            url.searchParams.forEach((value, key) => {
                queryParams[key] = value;
            });
            expect(queryParams).toEqual({
                name: 'default',
                limit: '10',
            });
        });
    });
    describe('Device Resource URI Parsing', () => {
        it('should extract system_id from device details URI', () => {
            const uri = 'maas://device/dev123/details';
            const params = (0, uriPatterns_js_1.extractParamsFromUri)(uri, uriPatterns_js_1.DEVICE_DETAILS_URI_PATTERN);
            expect(params).toEqual({ system_id: 'dev123' });
        });
        it('should validate device details URI parameters', () => {
            const uri = 'maas://device/dev123/details';
            const params = (0, resourceUtils_js_1.extractAndValidateParams)(uri, uriPatterns_js_1.DEVICE_DETAILS_URI_PATTERN, DeviceParamsSchema, 'Device');
            expect(params).toEqual({ system_id: 'dev123' });
        });
        it('should throw error for invalid device details URI', () => {
            const uri = 'maas://device//details'; // Missing system_id
            expect(() => {
                (0, resourceUtils_js_1.extractAndValidateParams)(uri, uriPatterns_js_1.DEVICE_DETAILS_URI_PATTERN, DeviceParamsSchema, 'Device');
            }).toThrow(maas_ts_1.MaasApiError);
        });
        it('should handle devices list URI with query parameters', () => {
            const uri = 'maas://devices/list?hostname=test&mac_address=00:11:22:33:44:55';
            const params = (0, uriPatterns_js_1.extractParamsFromUri)(uri, uriPatterns_js_1.DEVICES_LIST_URI_PATTERN);
            expect(params).toEqual({});
            // Query parameters should be extracted separately
            const url = new URL(uri);
            const queryParams = {};
            url.searchParams.forEach((value, key) => {
                queryParams[key] = value;
            });
            expect(queryParams).toEqual({
                hostname: 'test',
                mac_address: '00:11:22:33:44:55',
            });
        });
    });
    describe('Domain Resource URI Parsing', () => {
        it('should extract domain_id from domain details URI', () => {
            const uri = 'maas://domain/example/details';
            const params = (0, uriPatterns_js_1.extractParamsFromUri)(uri, uriPatterns_js_1.DOMAIN_DETAILS_URI_PATTERN);
            expect(params).toEqual({ domain_id: 'example' });
        });
        it('should validate domain details URI parameters', () => {
            const uri = 'maas://domain/example/details';
            const params = (0, resourceUtils_js_1.extractAndValidateParams)(uri, uriPatterns_js_1.DOMAIN_DETAILS_URI_PATTERN, DomainParamsSchema, 'Domain');
            expect(params).toEqual({ domain_id: 'example' });
        });
        it('should throw error for invalid domain details URI', () => {
            const uri = 'maas://domain//details'; // Missing domain_id
            expect(() => {
                (0, resourceUtils_js_1.extractAndValidateParams)(uri, uriPatterns_js_1.DOMAIN_DETAILS_URI_PATTERN, DomainParamsSchema, 'Domain');
            }).toThrow(maas_ts_1.MaasApiError);
        });
        it('should handle domains list URI with query parameters', () => {
            const uri = 'maas://domains/list?name=example&limit=10';
            const params = (0, uriPatterns_js_1.extractParamsFromUri)(uri, uriPatterns_js_1.DOMAINS_LIST_URI_PATTERN);
            expect(params).toEqual({});
            // Query parameters should be extracted separately
            const url = new URL(uri);
            const queryParams = {};
            url.searchParams.forEach((value, key) => {
                queryParams[key] = value;
            });
            expect(queryParams).toEqual({
                name: 'example',
                limit: '10',
            });
        });
    });
    describe('Edge Cases and Error Handling', () => {
        it('should handle URI parameters with special characters', () => {
            const specialChars = [
                'test-with-dashes',
                'test_with_underscores',
                'test.with.dots',
                'test+with+plus',
                'test%20with%20spaces',
            ];
            specialChars.forEach(char => {
                const uri = `maas://machine/${char}/details`;
                const params = (0, uriPatterns_js_1.extractParamsFromUri)(uri, uriPatterns_js_1.MACHINE_DETAILS_URI_PATTERN);
                expect(params).toEqual({ system_id: char });
            });
        });
        it('should handle empty parameters gracefully', () => {
            const uri = 'maas://machine//details';
            const params = (0, uriPatterns_js_1.extractParamsFromUri)(uri, uriPatterns_js_1.MACHINE_DETAILS_URI_PATTERN);
            expect(params).toEqual({});
        });
        it('should not match URIs with extra path segments', () => {
            const uri = 'maas://machine/abc123/details/extra';
            const params = (0, uriPatterns_js_1.extractParamsFromUri)(uri, uriPatterns_js_1.MACHINE_DETAILS_URI_PATTERN);
            expect(params).toEqual({});
        });
        it('should not match URIs with missing path segments', () => {
            const uri = 'maas://machine/abc123';
            const params = (0, uriPatterns_js_1.extractParamsFromUri)(uri, uriPatterns_js_1.MACHINE_DETAILS_URI_PATTERN);
            expect(params).toEqual({});
        });
        it('should not match URIs with different schemes', () => {
            const uri = 'http://machine/abc123/details';
            const params = (0, uriPatterns_js_1.extractParamsFromUri)(uri, uriPatterns_js_1.MACHINE_DETAILS_URI_PATTERN);
            expect(params).toEqual({});
        });
        it('should handle URIs with encoded characters', () => {
            const encodedId = encodeURIComponent('test with spaces & special chars');
            const uri = `maas://machine/${encodedId}/details`;
            const params = (0, uriPatterns_js_1.extractParamsFromUri)(uri, uriPatterns_js_1.MACHINE_DETAILS_URI_PATTERN);
            expect(params).toEqual({ system_id: encodedId });
        });
    });
});
