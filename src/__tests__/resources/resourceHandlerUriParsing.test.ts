/**
 * Tests for Resource Handler URI Parsing
 * 
 * This file provides comprehensive tests for URI parsing in resource handlers,
 * covering various edge cases and validation scenarios.
 */

import {
  MACHINE_DETAILS_URI_PATTERN,
  MACHINES_LIST_URI_PATTERN,
  TAG_DETAILS_URI_PATTERN,
  TAGS_LIST_URI_PATTERN,
  TAG_MACHINES_URI_PATTERN,
  SUBNET_DETAILS_URI_PATTERN,
  SUBNETS_LIST_URI_PATTERN,
  ZONE_DETAILS_URI_PATTERN,
  ZONES_LIST_URI_PATTERN,
  DEVICE_DETAILS_URI_PATTERN,
  DEVICES_LIST_URI_PATTERN,
  DOMAIN_DETAILS_URI_PATTERN,
  DOMAINS_LIST_URI_PATTERN,
  extractParamsFromUri,
} from '../../mcp_resources/schemas/uriPatterns.js';
import { extractAndValidateParams } from '../../mcp_resources/utils/resourceUtils.js';
import { MaasApiError } from '../../types/maas.ts';
import { z } from 'zod';

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
  const MachineParamsSchema = z.object({
    system_id: z.string(),
  });

  const TagParamsSchema = z.object({
    tag_name: z.string(),
  });

  const SubnetParamsSchema = z.object({
    subnet_id: z.string(),
  });

  const ZoneParamsSchema = z.object({
    zone_id: z.string(),
  });

  const DeviceParamsSchema = z.object({
    system_id: z.string(),
  });

  const DomainParamsSchema = z.object({
    domain_id: z.string(),
  });

  describe('Machine Resource URI Parsing', () => {
    it('should extract system_id from machine details URI', () => {
      const uri = 'maas://machine/abc123/details';
      const params = extractParamsFromUri(uri, MACHINE_DETAILS_URI_PATTERN);
      expect(params).toEqual({ system_id: 'abc123' });
    });

    it('should validate machine details URI parameters', () => {
      const uri = 'maas://machine/abc123/details';
      const params = extractAndValidateParams(
        uri,
        MACHINE_DETAILS_URI_PATTERN,
        MachineParamsSchema,
        'Machine'
      );
      expect(params).toEqual({ system_id: 'abc123' });
    });

    it('should throw error for invalid machine details URI', () => {
      const uri = 'maas://machine//details'; // Missing system_id
      expect(() => {
        extractAndValidateParams(
          uri,
          MACHINE_DETAILS_URI_PATTERN,
          MachineParamsSchema,
          'Machine'
        );
      }).toThrow(MaasApiError);
    });

    it('should handle machines list URI with query parameters', () => {
      const uri = 'maas://machines/list?hostname=test&status=Ready';
      const params = extractParamsFromUri(uri, MACHINES_LIST_URI_PATTERN);
      expect(params).toEqual({});
      
      // Query parameters should be extracted separately
      const url = new URL(uri);
      const queryParams: Record<string, string> = {};
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
      const params = extractParamsFromUri(uri, TAG_DETAILS_URI_PATTERN);
      expect(params).toEqual({ tag_name: 'my-tag' });
    });

    it('should validate tag details URI parameters', () => {
      const uri = 'maas://tag/my-tag/details';
      const params = extractAndValidateParams(
        uri,
        TAG_DETAILS_URI_PATTERN,
        TagParamsSchema,
        'Tag'
      );
      expect(params).toEqual({ tag_name: 'my-tag' });
    });

    it('should throw error for invalid tag details URI', () => {
      const uri = 'maas://tag//details'; // Missing tag_name
      expect(() => {
        extractAndValidateParams(
          uri,
          TAG_DETAILS_URI_PATTERN,
          TagParamsSchema,
          'Tag'
        );
      }).toThrow(MaasApiError);
    });

    it('should extract tag_name from tag machines URI', () => {
      const uri = 'maas://tag/my-tag/machines';
      const params = extractParamsFromUri(uri, TAG_MACHINES_URI_PATTERN);
      expect(params).toEqual({ tag_name: 'my-tag' });
    });

    it('should handle tags list URI with query parameters', () => {
      const uri = 'maas://tags/list?name=test&limit=10';
      const params = extractParamsFromUri(uri, TAGS_LIST_URI_PATTERN);
      expect(params).toEqual({});
      
      // Query parameters should be extracted separately
      const url = new URL(uri);
      const queryParams: Record<string, string> = {};
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
      const params = extractParamsFromUri(uri, SUBNET_DETAILS_URI_PATTERN);
      expect(params).toEqual({ subnet_id: '123' });
    });

    it('should validate subnet details URI parameters', () => {
      const uri = 'maas://subnet/123/details';
      const params = extractAndValidateParams(
        uri,
        SUBNET_DETAILS_URI_PATTERN,
        SubnetParamsSchema,
        'Subnet'
      );
      expect(params).toEqual({ subnet_id: '123' });
    });

    it('should throw error for invalid subnet details URI', () => {
      const uri = 'maas://subnet//details'; // Missing subnet_id
      expect(() => {
        extractAndValidateParams(
          uri,
          SUBNET_DETAILS_URI_PATTERN,
          SubnetParamsSchema,
          'Subnet'
        );
      }).toThrow(MaasApiError);
    });

    it('should handle subnets list URI with query parameters', () => {
      const uri = 'maas://subnets/list?cidr=10.0.0.0/24&vlan=1';
      const params = extractParamsFromUri(uri, SUBNETS_LIST_URI_PATTERN);
      expect(params).toEqual({});
      
      // Query parameters should be extracted separately
      const url = new URL(uri);
      const queryParams: Record<string, string> = {};
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
      const params = extractParamsFromUri(uri, ZONE_DETAILS_URI_PATTERN);
      expect(params).toEqual({ zone_id: 'default' });
    });

    it('should validate zone details URI parameters', () => {
      const uri = 'maas://zone/default/details';
      const params = extractAndValidateParams(
        uri,
        ZONE_DETAILS_URI_PATTERN,
        ZoneParamsSchema,
        'Zone'
      );
      expect(params).toEqual({ zone_id: 'default' });
    });

    it('should throw error for invalid zone details URI', () => {
      const uri = 'maas://zone//details'; // Missing zone_id
      expect(() => {
        extractAndValidateParams(
          uri,
          ZONE_DETAILS_URI_PATTERN,
          ZoneParamsSchema,
          'Zone'
        );
      }).toThrow(MaasApiError);
    });

    it('should handle zones list URI with query parameters', () => {
      const uri = 'maas://zones/list?name=default&limit=10';
      const params = extractParamsFromUri(uri, ZONES_LIST_URI_PATTERN);
      expect(params).toEqual({});
      
      // Query parameters should be extracted separately
      const url = new URL(uri);
      const queryParams: Record<string, string> = {};
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
      const params = extractParamsFromUri(uri, DEVICE_DETAILS_URI_PATTERN);
      expect(params).toEqual({ system_id: 'dev123' });
    });

    it('should validate device details URI parameters', () => {
      const uri = 'maas://device/dev123/details';
      const params = extractAndValidateParams(
        uri,
        DEVICE_DETAILS_URI_PATTERN,
        DeviceParamsSchema,
        'Device'
      );
      expect(params).toEqual({ system_id: 'dev123' });
    });

    it('should throw error for invalid device details URI', () => {
      const uri = 'maas://device//details'; // Missing system_id
      expect(() => {
        extractAndValidateParams(
          uri,
          DEVICE_DETAILS_URI_PATTERN,
          DeviceParamsSchema,
          'Device'
        );
      }).toThrow(MaasApiError);
    });

    it('should handle devices list URI with query parameters', () => {
      const uri = 'maas://devices/list?hostname=test&mac_address=00:11:22:33:44:55';
      const params = extractParamsFromUri(uri, DEVICES_LIST_URI_PATTERN);
      expect(params).toEqual({});
      
      // Query parameters should be extracted separately
      const url = new URL(uri);
      const queryParams: Record<string, string> = {};
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
      const params = extractParamsFromUri(uri, DOMAIN_DETAILS_URI_PATTERN);
      expect(params).toEqual({ domain_id: 'example' });
    });

    it('should validate domain details URI parameters', () => {
      const uri = 'maas://domain/example/details';
      const params = extractAndValidateParams(
        uri,
        DOMAIN_DETAILS_URI_PATTERN,
        DomainParamsSchema,
        'Domain'
      );
      expect(params).toEqual({ domain_id: 'example' });
    });

    it('should throw error for invalid domain details URI', () => {
      const uri = 'maas://domain//details'; // Missing domain_id
      expect(() => {
        extractAndValidateParams(
          uri,
          DOMAIN_DETAILS_URI_PATTERN,
          DomainParamsSchema,
          'Domain'
        );
      }).toThrow(MaasApiError);
    });

    it('should handle domains list URI with query parameters', () => {
      const uri = 'maas://domains/list?name=example&limit=10';
      const params = extractParamsFromUri(uri, DOMAINS_LIST_URI_PATTERN);
      expect(params).toEqual({});
      
      // Query parameters should be extracted separately
      const url = new URL(uri);
      const queryParams: Record<string, string> = {};
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
        const params = extractParamsFromUri(uri, MACHINE_DETAILS_URI_PATTERN);
        expect(params).toEqual({ system_id: char });
      });
    });

    it('should handle empty parameters gracefully', () => {
      const uri = 'maas://machine//details';
      const params = extractParamsFromUri(uri, MACHINE_DETAILS_URI_PATTERN);
      expect(params).toEqual({});
    });

    it('should not match URIs with extra path segments', () => {
      const uri = 'maas://machine/abc123/details/extra';
      const params = extractParamsFromUri(uri, MACHINE_DETAILS_URI_PATTERN);
      expect(params).toEqual({});
    });

    it('should not match URIs with missing path segments', () => {
      const uri = 'maas://machine/abc123';
      const params = extractParamsFromUri(uri, MACHINE_DETAILS_URI_PATTERN);
      expect(params).toEqual({});
    });

    it('should not match URIs with different schemes', () => {
      const uri = 'http://machine/abc123/details';
      const params = extractParamsFromUri(uri, MACHINE_DETAILS_URI_PATTERN);
      expect(params).toEqual({});
    });

    it('should handle URIs with encoded characters', () => {
      const encodedId = encodeURIComponent('test with spaces & special chars');
      const uri = `maas://machine/${encodedId}/details`;
      const params = extractParamsFromUri(uri, MACHINE_DETAILS_URI_PATTERN);
      expect(params).toEqual({ system_id: encodedId });
    });
  });
});