"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const common_js_1 = require("../../../mcp_tools/schemas/common.js");
describe('Common Zod Schemas', () => {
    describe('metaSchema', () => {
        it('should pass with valid string progressToken', () => {
            expect(() => common_js_1.metaSchema.parse({ progressToken: 'token123' })).not.toThrow();
        });
        it('should pass with valid number progressToken', () => {
            expect(() => common_js_1.metaSchema.parse({ progressToken: 123 })).not.toThrow();
        });
        it('should pass when progressToken is undefined', () => {
            expect(() => common_js_1.metaSchema.parse({})).not.toThrow();
        });
        it('should pass when meta is undefined', () => {
            expect(() => common_js_1.metaSchema.parse(undefined)).not.toThrow();
        });
        it('should fail with invalid progressToken type', () => {
            expect(() => common_js_1.metaSchema.parse({ progressToken: true })).toThrow(zod_1.z.ZodError);
        });
    });
    describe('machineIdSchema', () => {
        it('should pass with a valid string', () => {
            expect(() => common_js_1.machineIdSchema.parse('xyz123')).not.toThrow();
        });
        it('should fail with a non-string type', () => {
            expect(() => common_js_1.machineIdSchema.parse(123)).toThrow(zod_1.z.ZodError);
        });
        it('should fail with an empty string if constraints were added (e.g. .min(1)) - current allows empty', () => {
            // Current schema allows empty string. If it changes, this test should fail.
            expect(() => common_js_1.machineIdSchema.parse('')).not.toThrow();
        });
    });
    describe('machineStatusSchema', () => {
        const validStatuses = [
            'NEW', 'COMMISSIONING', 'FAILED_COMMISSIONING',
            'READY', 'ALLOCATED', 'DEPLOYING', 'DEPLOYED',
            'RELEASING', 'FAILED_RELEASING', 'FAILED_DEPLOYMENT',
            'BROKEN', 'RESCUE_MODE'
        ];
        validStatuses.forEach(status => {
            it(`should pass with valid status: ${status}`, () => {
                expect(() => common_js_1.machineStatusSchema.parse(status)).not.toThrow();
            });
        });
        it('should fail with an invalid status string', () => {
            expect(() => common_js_1.machineStatusSchema.parse('INVALID_STATUS')).toThrow(zod_1.z.ZodError);
        });
        it('should fail with a non-string type', () => {
            expect(() => common_js_1.machineStatusSchema.parse(123)).toThrow(zod_1.z.ZodError);
        });
    });
    describe('tagNameSchema', () => {
        it('should pass with a valid non-empty string', () => {
            expect(() => common_js_1.tagNameSchema.parse('my-tag')).not.toThrow();
        });
        it('should fail with an empty string', () => {
            expect(() => common_js_1.tagNameSchema.parse('')).toThrow(zod_1.z.ZodError);
        });
        it('should fail with a non-string type', () => {
            expect(() => common_js_1.tagNameSchema.parse(123)).toThrow(zod_1.z.ZodError);
        });
    });
    describe('subnetSchema', () => {
        it('should pass with a valid CIDR string', () => {
            expect(() => common_js_1.subnetSchema.parse('192.168.1.0/24')).not.toThrow();
        });
        it('should pass with a valid ID-like string', () => {
            expect(() => common_js_1.subnetSchema.parse('subnet-abc123')).not.toThrow();
        });
        it('should fail with a non-string type', () => {
            expect(() => common_js_1.subnetSchema.parse(12345)).toThrow(zod_1.z.ZodError);
        });
        // Note: The current schema is a generic string. More specific validation (e.g. regex for CIDR)
        // would require more specific tests for invalid string formats.
        it('should pass with an empty string as per current schema', () => {
            expect(() => common_js_1.subnetSchema.parse('')).not.toThrow();
        });
    });
    describe('vlanSchema', () => {
        it('should pass with a positive integer', () => {
            expect(() => common_js_1.vlanSchema.parse(100)).not.toThrow();
        });
        it('should fail with zero', () => {
            expect(() => common_js_1.vlanSchema.parse(0)).toThrow(zod_1.z.ZodError);
        });
        it('should fail with a negative integer', () => {
            expect(() => common_js_1.vlanSchema.parse(-10)).toThrow(zod_1.z.ZodError);
        });
        it('should fail with a non-integer number', () => {
            expect(() => common_js_1.vlanSchema.parse(10.5)).toThrow(zod_1.z.ZodError);
        });
        it('should fail with a non-number type', () => {
            expect(() => common_js_1.vlanSchema.parse('100')).toThrow(zod_1.z.ZodError);
        });
    });
    describe('osSystemSchema', () => {
        it('should pass with a valid string', () => {
            expect(() => common_js_1.osSystemSchema.parse('ubuntu')).not.toThrow();
        });
        it('should fail with a non-string type', () => {
            expect(() => common_js_1.osSystemSchema.parse(123)).toThrow(zod_1.z.ZodError);
        });
        it('should pass with an empty string as per current schema', () => {
            expect(() => common_js_1.osSystemSchema.parse('')).not.toThrow();
        });
    });
    describe('distroSeriesSchema', () => {
        it('should pass with a valid string', () => {
            expect(() => common_js_1.distroSeriesSchema.parse('jammy')).not.toThrow();
        });
        it('should fail with a non-string type', () => {
            expect(() => common_js_1.distroSeriesSchema.parse(true)).toThrow(zod_1.z.ZodError);
        });
        it('should pass with an empty string as per current schema', () => {
            expect(() => common_js_1.distroSeriesSchema.parse('')).not.toThrow();
        });
    });
    describe('paginationSchema', () => {
        it('should pass with valid offset and limit', () => {
            expect(() => common_js_1.paginationSchema.parse({ offset: 10, limit: 5 })).not.toThrow();
        });
        it('should pass with only offset', () => {
            expect(() => common_js_1.paginationSchema.parse({ offset: 10 })).not.toThrow();
        });
        it('should pass with only limit', () => {
            expect(() => common_js_1.paginationSchema.parse({ limit: 5 })).not.toThrow();
        });
        it('should pass with empty object', () => {
            expect(() => common_js_1.paginationSchema.parse({})).not.toThrow();
        });
        it('should pass when pagination is undefined', () => {
            expect(() => common_js_1.paginationSchema.parse(undefined)).not.toThrow();
        });
        it('should fail with negative offset', () => {
            expect(() => common_js_1.paginationSchema.parse({ offset: -1 })).toThrow(zod_1.z.ZodError);
        });
        it('should fail with non-integer offset', () => {
            expect(() => common_js_1.paginationSchema.parse({ offset: 1.5 })).toThrow(zod_1.z.ZodError);
        });
        it('should fail with invalid offset type', () => {
            expect(() => common_js_1.paginationSchema.parse({ offset: '10' })).toThrow(zod_1.z.ZodError);
        });
        it('should fail with zero limit', () => {
            expect(() => common_js_1.paginationSchema.parse({ limit: 0 })).toThrow(zod_1.z.ZodError);
        });
        it('should fail with negative limit', () => {
            expect(() => common_js_1.paginationSchema.parse({ limit: -5 })).toThrow(zod_1.z.ZodError);
        });
        it('should fail with non-integer limit', () => {
            expect(() => common_js_1.paginationSchema.parse({ limit: 5.5 })).toThrow(zod_1.z.ZodError);
        });
        it('should fail with invalid limit type', () => {
            expect(() => common_js_1.paginationSchema.parse({ limit: '5' })).toThrow(zod_1.z.ZodError);
        });
        it('should fail with extra fields if not stripped', () => {
            // Current schema is .object({...}).optional(), which allows extra fields by default.
            // If .strict() was added, this test would fail.
            expect(() => common_js_1.paginationSchema.parse({ offset: 10, limit: 5, extra: 'field' })).not.toThrow();
        });
    });
});
