import { z } from 'zod';
import {
  metaSchema,
  machineIdSchema,
  machineStatusSchema,
  tagNameSchema,
  subnetSchema,
  vlanSchema,
  osSystemSchema,
  distroSeriesSchema,
  paginationSchema
} from '../../../mcp_tools/schemas/common.js';

describe('Common Zod Schemas', () => {
  describe('metaSchema', () => {
    it('should pass with valid string progressToken', () => {
      expect(() => metaSchema.parse({ progressToken: 'token123' })).not.toThrow();
    });

    it('should pass with valid number progressToken', () => {
      expect(() => metaSchema.parse({ progressToken: 123 })).not.toThrow();
    });

    it('should pass when progressToken is undefined', () => {
      expect(() => metaSchema.parse({})).not.toThrow();
    });

    it('should pass when meta is undefined', () => {
      expect(() => metaSchema.parse(undefined)).not.toThrow();
    });

    it('should fail with invalid progressToken type', () => {
      expect(() => metaSchema.parse({ progressToken: true })).toThrow(z.ZodError);
    });
  });

  describe('machineIdSchema', () => {
    it('should pass with a valid string', () => {
      expect(() => machineIdSchema.parse('xyz123')).not.toThrow();
    });

    it('should fail with a non-string type', () => {
      expect(() => machineIdSchema.parse(123)).toThrow(z.ZodError);
    });

    it('should fail with an empty string if constraints were added (e.g. .min(1)) - current allows empty', () => {
      // Current schema allows empty string. If it changes, this test should fail.
      expect(() => machineIdSchema.parse('')).not.toThrow();
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
        expect(() => machineStatusSchema.parse(status)).not.toThrow();
      });
    });

    it('should fail with an invalid status string', () => {
      expect(() => machineStatusSchema.parse('INVALID_STATUS')).toThrow(z.ZodError);
    });

    it('should fail with a non-string type', () => {
      expect(() => machineStatusSchema.parse(123)).toThrow(z.ZodError);
    });
  });

  describe('tagNameSchema', () => {
    it('should pass with a valid non-empty string', () => {
      expect(() => tagNameSchema.parse('my-tag')).not.toThrow();
    });

    it('should fail with an empty string', () => {
      expect(() => tagNameSchema.parse('')).toThrow(z.ZodError);
    });

    it('should fail with a non-string type', () => {
      expect(() => tagNameSchema.parse(123)).toThrow(z.ZodError);
    });
  });

  describe('subnetSchema', () => {
    it('should pass with a valid CIDR string', () => {
      expect(() => subnetSchema.parse('192.168.1.0/24')).not.toThrow();
    });

    it('should pass with a valid ID-like string', () => {
      expect(() => subnetSchema.parse('subnet-abc123')).not.toThrow();
    });

    it('should fail with a non-string type', () => {
      expect(() => subnetSchema.parse(12345)).toThrow(z.ZodError);
    });
    // Note: The current schema is a generic string. More specific validation (e.g. regex for CIDR)
    // would require more specific tests for invalid string formats.
    it('should pass with an empty string as per current schema', () => {
        expect(() => subnetSchema.parse('')).not.toThrow();
    });
  });

  describe('vlanSchema', () => {
    it('should pass with a positive integer', () => {
      expect(() => vlanSchema.parse(100)).not.toThrow();
    });

    it('should fail with zero', () => {
      expect(() => vlanSchema.parse(0)).toThrow(z.ZodError);
    });

    it('should fail with a negative integer', () => {
      expect(() => vlanSchema.parse(-10)).toThrow(z.ZodError);
    });

    it('should fail with a non-integer number', () => {
      expect(() => vlanSchema.parse(10.5)).toThrow(z.ZodError);
    });

    it('should fail with a non-number type', () => {
      expect(() => vlanSchema.parse('100')).toThrow(z.ZodError);
    });
  });

  describe('osSystemSchema', () => {
    it('should pass with a valid string', () => {
      expect(() => osSystemSchema.parse('ubuntu')).not.toThrow();
    });

    it('should fail with a non-string type', () => {
      expect(() => osSystemSchema.parse(123)).toThrow(z.ZodError);
    });
     it('should pass with an empty string as per current schema', () => {
        expect(() => osSystemSchema.parse('')).not.toThrow();
    });
  });

  describe('distroSeriesSchema', () => {
    it('should pass with a valid string', () => {
      expect(() => distroSeriesSchema.parse('jammy')).not.toThrow();
    });

    it('should fail with a non-string type', () => {
      expect(() => distroSeriesSchema.parse(true)).toThrow(z.ZodError);
    });
    it('should pass with an empty string as per current schema', () => {
        expect(() => distroSeriesSchema.parse('')).not.toThrow();
    });
  });

  describe('paginationSchema', () => {
    it('should pass with valid offset and limit', () => {
      expect(() => paginationSchema.parse({ offset: 10, limit: 5 })).not.toThrow();
    });

    it('should pass with only offset', () => {
      expect(() => paginationSchema.parse({ offset: 10 })).not.toThrow();
    });

    it('should pass with only limit', () => {
      expect(() => paginationSchema.parse({ limit: 5 })).not.toThrow();
    });

    it('should pass with empty object', () => {
      expect(() => paginationSchema.parse({})).not.toThrow();
    });

    it('should pass when pagination is undefined', () => {
      expect(() => paginationSchema.parse(undefined)).not.toThrow();
    });

    it('should fail with negative offset', () => {
      expect(() => paginationSchema.parse({ offset: -1 })).toThrow(z.ZodError);
    });

    it('should fail with non-integer offset', () => {
      expect(() => paginationSchema.parse({ offset: 1.5 })).toThrow(z.ZodError);
    });

    it('should fail with invalid offset type', () => {
      expect(() => paginationSchema.parse({ offset: '10' })).toThrow(z.ZodError);
    });

    it('should fail with zero limit', () => {
      expect(() => paginationSchema.parse({ limit: 0 })).toThrow(z.ZodError);
    });

    it('should fail with negative limit', () => {
      expect(() => paginationSchema.parse({ limit: -5 })).toThrow(z.ZodError);
    });

    it('should fail with non-integer limit', () => {
      expect(() => paginationSchema.parse({ limit: 5.5 })).toThrow(z.ZodError);
    });

    it('should fail with invalid limit type', () => {
      expect(() => paginationSchema.parse({ limit: '5' })).toThrow(z.ZodError);
    });

    it('should fail with extra fields if not stripped', () => {
        // Current schema is .object({...}).optional(), which allows extra fields by default.
        // If .strict() was added, this test would fail.
        expect(() => paginationSchema.parse({ offset: 10, limit: 5, extra: 'field' })).not.toThrow();
    });
  });
});