"use strict";
/**
 * Enhanced tests for URI patterns and parameter extraction
 *
 * This file provides comprehensive tests for URI pattern matching and parameter extraction
 * used by resource handlers. It covers edge cases, error scenarios, and validation logic.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const uriPatterns_js_1 = require("../../mcp_resources/schemas/uriPatterns.js");
const maas_ts_1 = require("../../types/maas.ts");
const resourceUtils_js_1 = require("../../mcp_resources/utils/resourceUtils.js");
const zod_1 = require("zod");
// Mock the resourceUtils module to test extractAndValidateParams
jest.mock('../../utils/auditLogger.js', () => ({
    logResourceAccessFailure: jest.fn(),
}));
// Mock the logger module
jest.mock('../../utils/logger.ts', () => ({
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    generateRequestId: jest.fn(() => 'mock-request-id'),
}));
describe('URI Pattern Extraction and Validation', () => {
    // Define test schemas for validation
    const TestParamsSchema = zod_1.z.object({
        param_id: zod_1.z.string(),
    });
    const TestQueryParamsSchema = zod_1.z.object({
        filter: zod_1.z.string().optional(),
        limit: zod_1.z.string().optional(),
        offset: zod_1.z.string().optional(),
    });
    describe('Parameter Extraction Edge Cases', () => {
        it('should handle URI parameters with special characters', () => {
            const specialChars = [
                'test-with-dashes',
                'test_with_underscores',
                'test.with.dots',
                'test+with+plus',
                'test%20with%20spaces',
                'test@with@at',
                'test:with:colons',
                'test~with~tildes',
            ];
            specialChars.forEach(char => {
                const uri = `maas://machine/${char}/details`;
                const params = (0, uriPatterns_js_1.extractParamsFromUri)(uri, uriPatterns_js_1.MACHINE_DETAILS_URI_PATTERN);
                expect(params).toEqual({ system_id: char });
            });
        });
        it('should handle empty parameters', () => {
            const uri = 'maas://machine//details';
            const params = (0, uriPatterns_js_1.extractParamsFromUri)(uri, uriPatterns_js_1.MACHINE_DETAILS_URI_PATTERN);
            // The actual implementation returns an empty object for empty parameters
            // This is a valid behavior as it prevents creating resources with empty IDs
            expect(params).toEqual({});
        });
        it('should handle URIs with multiple parameters', () => {
            const multiParamPattern = 'maas://resource/{resource_type}/{resource_id}/action/{action_id}';
            const uri = 'maas://resource/machine/abc123/action/deploy';
            const params = (0, uriPatterns_js_1.extractParamsFromUri)(uri, multiParamPattern);
            expect(params).toEqual({
                resource_type: 'machine',
                resource_id: 'abc123',
                action_id: 'deploy',
            });
        });
        it('should handle URIs with query parameters', () => {
            const uri = 'maas://machines/list?hostname=test&status=Ready&limit=10';
            const params = (0, uriPatterns_js_1.extractParamsFromUri)(uri, uriPatterns_js_1.MACHINES_LIST_URI_PATTERN);
            // extractParamsFromUri doesn't extract query params by default
            expect(params).toEqual({});
            // But we can extract them from the URL object
            const url = new URL(uri);
            const queryParams = {};
            url.searchParams.forEach((value, key) => {
                queryParams[key] = value;
            });
            expect(queryParams).toEqual({
                hostname: 'test',
                status: 'Ready',
                limit: '10',
            });
        });
        it('should handle URIs with encoded characters', () => {
            const encodedId = encodeURIComponent('test with spaces & special chars');
            const uri = `maas://machine/${encodedId}/details`;
            const params = (0, uriPatterns_js_1.extractParamsFromUri)(uri, uriPatterns_js_1.MACHINE_DETAILS_URI_PATTERN);
            expect(params).toEqual({ system_id: encodedId });
        });
    });
    describe('Parameter Validation', () => {
        it('should validate parameters against schema', () => {
            const uri = 'maas://resource/valid-id/details';
            const pattern = 'maas://resource/{param_id}/details';
            const result = (0, resourceUtils_js_1.extractAndValidateParams)(uri, pattern, TestParamsSchema, 'TestResource');
            expect(result).toEqual({ param_id: 'valid-id' });
        });
        it('should throw error for missing required parameters', () => {
            const uri = 'maas://resource//details';
            const pattern = 'maas://resource/{param_id}/details';
            expect(() => {
                (0, resourceUtils_js_1.extractAndValidateParams)(uri, pattern, TestParamsSchema.extend({ param_id: zod_1.z.string().min(1) }), 'TestResource');
            }).toThrow(maas_ts_1.MaasApiError);
        });
        it('should throw error for invalid parameter format', () => {
            const uri = 'maas://resource/123/details';
            const pattern = 'maas://resource/{param_id}/details';
            expect(() => {
                (0, resourceUtils_js_1.extractAndValidateParams)(uri, pattern, TestParamsSchema.extend({ param_id: zod_1.z.string().regex(/^[a-z]+$/) }), 'TestResource');
            }).toThrow(maas_ts_1.MaasApiError);
        });
        it('should validate query parameters', () => {
            const uri = 'maas://resources/list?filter=active&limit=10';
            const pattern = 'maas://resources/list';
            // For this test, we'll create a URL with query parameters and manually extract them
            const url = new URL(uri);
            const queryParams = {
                filter: url.searchParams.get('filter') || '',
                limit: url.searchParams.get('limit') || '',
            };
            // Validate the query parameters against the schema
            const result = TestQueryParamsSchema.parse(queryParams);
            // Verify the result
            expect(result).toEqual({
                filter: 'active',
                limit: '10',
            });
        });
    });
    describe('URI Pattern Matching', () => {
        it('should match exact URI patterns', () => {
            const patterns = [
                { uri: 'maas://machines/list', pattern: uriPatterns_js_1.MACHINES_LIST_URI_PATTERN },
                { uri: 'maas://tags/list', pattern: uriPatterns_js_1.TAGS_LIST_URI_PATTERN },
                { uri: 'maas://subnets/list', pattern: uriPatterns_js_1.SUBNETS_LIST_URI_PATTERN },
                { uri: 'maas://zones/list', pattern: uriPatterns_js_1.ZONES_LIST_URI_PATTERN },
                { uri: 'maas://devices/list', pattern: uriPatterns_js_1.DEVICES_LIST_URI_PATTERN },
                { uri: 'maas://domains/list', pattern: uriPatterns_js_1.DOMAINS_LIST_URI_PATTERN },
            ];
            patterns.forEach(({ uri, pattern }) => {
                const params = (0, uriPatterns_js_1.extractParamsFromUri)(uri, pattern);
                expect(params).toEqual({});
            });
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
    });
    describe('Resource Handler Integration', () => {
        it('should extract parameters from all resource handler URI patterns', () => {
            const testCases = [
                { uri: 'maas://machine/abc123/details', pattern: uriPatterns_js_1.MACHINE_DETAILS_URI_PATTERN, expected: { system_id: 'abc123' } },
                { uri: 'maas://machines/list', pattern: uriPatterns_js_1.MACHINES_LIST_URI_PATTERN, expected: {} },
                { uri: 'maas://tag/test-tag/details', pattern: uriPatterns_js_1.TAG_DETAILS_URI_PATTERN, expected: { tag_name: 'test-tag' } },
                { uri: 'maas://tags/list', pattern: uriPatterns_js_1.TAGS_LIST_URI_PATTERN, expected: {} },
                { uri: 'maas://tag/test-tag/machines', pattern: uriPatterns_js_1.TAG_MACHINES_URI_PATTERN, expected: { tag_name: 'test-tag' } },
                { uri: 'maas://subnet/123/details', pattern: uriPatterns_js_1.SUBNET_DETAILS_URI_PATTERN, expected: { subnet_id: '123' } },
                { uri: 'maas://subnets/list', pattern: uriPatterns_js_1.SUBNETS_LIST_URI_PATTERN, expected: {} },
                { uri: 'maas://zone/default/details', pattern: uriPatterns_js_1.ZONE_DETAILS_URI_PATTERN, expected: { zone_id: 'default' } },
                { uri: 'maas://zones/list', pattern: uriPatterns_js_1.ZONES_LIST_URI_PATTERN, expected: {} },
                { uri: 'maas://device/dev123/details', pattern: uriPatterns_js_1.DEVICE_DETAILS_URI_PATTERN, expected: { system_id: 'dev123' } },
                { uri: 'maas://devices/list', pattern: uriPatterns_js_1.DEVICES_LIST_URI_PATTERN, expected: {} },
                { uri: 'maas://domain/example/details', pattern: uriPatterns_js_1.DOMAIN_DETAILS_URI_PATTERN, expected: { domain_id: 'example' } },
                { uri: 'maas://domains/list', pattern: uriPatterns_js_1.DOMAINS_LIST_URI_PATTERN, expected: {} },
            ];
            testCases.forEach(({ uri, pattern, expected }) => {
                const params = (0, uriPatterns_js_1.extractParamsFromUri)(uri, pattern);
                expect(params).toEqual(expected);
            });
        });
    });
    describe('Performance Considerations', () => {
        it('should handle large numbers of URI parameters efficiently', () => {
            const largePattern = 'maas://resource/{p1}/{p2}/{p3}/{p4}/{p5}/{p6}/{p7}/{p8}/{p9}/{p10}';
            const largeUri = 'maas://resource/v1/v2/v3/v4/v5/v6/v7/v8/v9/v10';
            const startTime = performance.now();
            const params = (0, uriPatterns_js_1.extractParamsFromUri)(largeUri, largePattern);
            const endTime = performance.now();
            expect(params).toEqual({
                p1: 'v1', p2: 'v2', p3: 'v3', p4: 'v4', p5: 'v5',
                p6: 'v6', p7: 'v7', p8: 'v8', p9: 'v9', p10: 'v10',
            });
            // Ensure extraction is reasonably fast (less than 10ms)
            expect(endTime - startTime).toBeLessThan(10);
        });
    });
});
