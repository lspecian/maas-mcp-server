"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uriPatterns_js_1 = require("../../mcp_resources/schemas/uriPatterns.js");
describe('URI Pattern Constants', () => {
    test('MACHINE_DETAILS_URI_PATTERN should be correct', () => {
        expect(uriPatterns_js_1.MACHINE_DETAILS_URI_PATTERN).toBe('maas://machine/{system_id}/details');
    });
    test('MACHINES_LIST_URI_PATTERN should be correct', () => {
        expect(uriPatterns_js_1.MACHINES_LIST_URI_PATTERN).toBe('maas://machines/list');
    });
    test('TAG_DETAILS_URI_PATTERN should be correct', () => {
        expect(uriPatterns_js_1.TAG_DETAILS_URI_PATTERN).toBe('maas://tag/{tag_name}/details');
    });
    test('TAGS_LIST_URI_PATTERN should be correct', () => {
        expect(uriPatterns_js_1.TAGS_LIST_URI_PATTERN).toBe('maas://tags/list');
    });
    test('TAG_MACHINES_URI_PATTERN should be correct', () => {
        expect(uriPatterns_js_1.TAG_MACHINES_URI_PATTERN).toBe('maas://tag/{tag_name}/machines');
    });
    test('SUBNET_DETAILS_URI_PATTERN should be correct', () => {
        expect(uriPatterns_js_1.SUBNET_DETAILS_URI_PATTERN).toBe('maas://subnet/{subnet_id}/details');
    });
    test('SUBNETS_LIST_URI_PATTERN should be correct', () => {
        expect(uriPatterns_js_1.SUBNETS_LIST_URI_PATTERN).toBe('maas://subnets/list');
    });
    test('ZONE_DETAILS_URI_PATTERN should be correct', () => {
        expect(uriPatterns_js_1.ZONE_DETAILS_URI_PATTERN).toBe('maas://zone/{zone_id}/details');
    });
    test('ZONES_LIST_URI_PATTERN should be correct', () => {
        expect(uriPatterns_js_1.ZONES_LIST_URI_PATTERN).toBe('maas://zones/list');
    });
    test('DEVICE_DETAILS_URI_PATTERN should be correct', () => {
        expect(uriPatterns_js_1.DEVICE_DETAILS_URI_PATTERN).toBe('maas://device/{system_id}/details');
    });
    test('DEVICES_LIST_URI_PATTERN should be correct', () => {
        expect(uriPatterns_js_1.DEVICES_LIST_URI_PATTERN).toBe('maas://devices/list');
    });
    test('DOMAIN_DETAILS_URI_PATTERN should be correct', () => {
        expect(uriPatterns_js_1.DOMAIN_DETAILS_URI_PATTERN).toBe('maas://domain/{domain_id}/details');
    });
    test('DOMAINS_LIST_URI_PATTERN should be correct', () => {
        expect(uriPatterns_js_1.DOMAINS_LIST_URI_PATTERN).toBe('maas://domains/list');
    });
});
describe('extractParamsFromUri', () => {
    it('should extract parameters from machine details URI', () => {
        const uri = 'maas://machine/abc123xyz/details';
        const params = (0, uriPatterns_js_1.extractParamsFromUri)(uri, uriPatterns_js_1.MACHINE_DETAILS_URI_PATTERN);
        expect(params).toEqual({ system_id: 'abc123xyz' });
    });
    it('should return empty object for machine list URI (no params)', () => {
        const uri = 'maas://machines/list';
        const params = (0, uriPatterns_js_1.extractParamsFromUri)(uri, uriPatterns_js_1.MACHINES_LIST_URI_PATTERN);
        expect(params).toEqual({});
    });
    it('should extract parameters from tag details URI', () => {
        const uri = 'maas://tag/my-tag-name/details';
        const params = (0, uriPatterns_js_1.extractParamsFromUri)(uri, uriPatterns_js_1.TAG_DETAILS_URI_PATTERN);
        expect(params).toEqual({ tag_name: 'my-tag-name' });
    });
    it('should extract parameters from tag machines URI', () => {
        const uri = 'maas://tag/another-tag/machines';
        const params = (0, uriPatterns_js_1.extractParamsFromUri)(uri, uriPatterns_js_1.TAG_MACHINES_URI_PATTERN);
        expect(params).toEqual({ tag_name: 'another-tag' });
    });
    it('should extract parameters from subnet details URI', () => {
        const uri = 'maas://subnet/12345/details';
        const params = (0, uriPatterns_js_1.extractParamsFromUri)(uri, uriPatterns_js_1.SUBNET_DETAILS_URI_PATTERN);
        expect(params).toEqual({ subnet_id: '12345' });
    });
    it('should extract parameters from zone details URI', () => {
        const uri = 'maas://zone/zone-alpha/details';
        const params = (0, uriPatterns_js_1.extractParamsFromUri)(uri, uriPatterns_js_1.ZONE_DETAILS_URI_PATTERN);
        expect(params).toEqual({ zone_id: 'zone-alpha' });
    });
    it('should extract parameters from device details URI', () => {
        const uri = 'maas://device/dev-system-id/details';
        const params = (0, uriPatterns_js_1.extractParamsFromUri)(uri, uriPatterns_js_1.DEVICE_DETAILS_URI_PATTERN);
        expect(params).toEqual({ system_id: 'dev-system-id' });
    });
    it('should extract parameters from domain details URI', () => {
        const uri = 'maas://domain/dom-id-567/details';
        const params = (0, uriPatterns_js_1.extractParamsFromUri)(uri, uriPatterns_js_1.DOMAIN_DETAILS_URI_PATTERN);
        expect(params).toEqual({ domain_id: 'dom-id-567' });
    });
    it('should return empty object if URI does not match pattern', () => {
        const uri = 'maas://machine/details'; // Missing system_id
        const params = (0, uriPatterns_js_1.extractParamsFromUri)(uri, uriPatterns_js_1.MACHINE_DETAILS_URI_PATTERN);
        expect(params).toEqual({});
    });
    it('should return empty object if URI has extra segments', () => {
        const uri = 'maas://machine/abc123xyz/details/extra';
        const params = (0, uriPatterns_js_1.extractParamsFromUri)(uri, uriPatterns_js_1.MACHINE_DETAILS_URI_PATTERN);
        expect(params).toEqual({});
    });
    it('should handle patterns with multiple parameters', () => {
        const MULTI_PARAM_PATTERN = 'maas://resource/{id}/subresource/{sub_id}';
        const uri = 'maas://resource/123/subresource/456';
        const params = (0, uriPatterns_js_1.extractParamsFromUri)(uri, MULTI_PARAM_PATTERN);
        expect(params).toEqual({ id: '123', sub_id: '456' });
    });
    it('should be case-sensitive for parameter names in pattern but not values', () => {
        // Pattern uses {system_id}, URI uses System_Id for value
        const uri = 'maas://machine/System_Id_Value/details';
        const params = (0, uriPatterns_js_1.extractParamsFromUri)(uri, uriPatterns_js_1.MACHINE_DETAILS_URI_PATTERN);
        // The key in the result must match the key in the pattern {system_id}
        expect(params).toEqual({ system_id: 'System_Id_Value' });
    });
    it('should return empty for list URIs that have no params in pattern', () => {
        const listUris = [
            { uri: 'maas://machines/list', pattern: uriPatterns_js_1.MACHINES_LIST_URI_PATTERN },
            { uri: 'maas://tags/list', pattern: uriPatterns_js_1.TAGS_LIST_URI_PATTERN },
            { uri: 'maas://subnets/list', pattern: uriPatterns_js_1.SUBNETS_LIST_URI_PATTERN },
            { uri: 'maas://zones/list', pattern: uriPatterns_js_1.ZONES_LIST_URI_PATTERN },
            { uri: 'maas://devices/list', pattern: uriPatterns_js_1.DEVICES_LIST_URI_PATTERN },
            { uri: 'maas://domains/list', pattern: uriPatterns_js_1.DOMAINS_LIST_URI_PATTERN },
        ];
        listUris.forEach(item => {
            const params = (0, uriPatterns_js_1.extractParamsFromUri)(item.uri, item.pattern);
            expect(params).toEqual({});
        });
    });
});
