"use strict";
/**
 * Centralized URI patterns for MAAS MCP resources
 * This file defines all URI patterns used for MAAS resources in a consistent format.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOMAINS_LIST_URI_PATTERN = exports.DOMAIN_DETAILS_URI_PATTERN = exports.DEVICES_LIST_URI_PATTERN = exports.DEVICE_DETAILS_URI_PATTERN = exports.ZONES_LIST_URI_PATTERN = exports.ZONE_DETAILS_URI_PATTERN = exports.SUBNETS_LIST_URI_PATTERN = exports.SUBNET_DETAILS_URI_PATTERN = exports.TAG_MACHINES_URI_PATTERN = exports.TAGS_LIST_URI_PATTERN = exports.TAG_DETAILS_URI_PATTERN = exports.MACHINES_LIST_URI_PATTERN = exports.MACHINE_DETAILS_URI_PATTERN = void 0;
exports.extractParamsFromUri = extractParamsFromUri;
/** URI patterns for MAAS Machine resources. */
// Machine resource URI patterns
const MACHINE_DETAILS_URI_PATTERN = 'maas://machine/{system_id}/details';
exports.MACHINE_DETAILS_URI_PATTERN = MACHINE_DETAILS_URI_PATTERN;
const MACHINES_LIST_URI_PATTERN = 'maas://machines/list';
exports.MACHINES_LIST_URI_PATTERN = MACHINES_LIST_URI_PATTERN;
/** URI patterns for MAAS Tag resources. */
// Tag resource URI patterns
const TAG_DETAILS_URI_PATTERN = 'maas://tag/{tag_name}/details';
exports.TAG_DETAILS_URI_PATTERN = TAG_DETAILS_URI_PATTERN;
const TAGS_LIST_URI_PATTERN = 'maas://tags/list';
exports.TAGS_LIST_URI_PATTERN = TAGS_LIST_URI_PATTERN;
const TAG_MACHINES_URI_PATTERN = 'maas://tag/{tag_name}/machines';
exports.TAG_MACHINES_URI_PATTERN = TAG_MACHINES_URI_PATTERN;
/** URI patterns for MAAS Subnet resources. */
// Subnet resource URI patterns
const SUBNET_DETAILS_URI_PATTERN = 'maas://subnet/{subnet_id}/details';
exports.SUBNET_DETAILS_URI_PATTERN = SUBNET_DETAILS_URI_PATTERN;
const SUBNETS_LIST_URI_PATTERN = 'maas://subnets/list';
exports.SUBNETS_LIST_URI_PATTERN = SUBNETS_LIST_URI_PATTERN;
/** URI patterns for MAAS Zone resources. */
// Zone resource URI patterns
const ZONE_DETAILS_URI_PATTERN = 'maas://zone/{zone_id}/details';
exports.ZONE_DETAILS_URI_PATTERN = ZONE_DETAILS_URI_PATTERN;
const ZONES_LIST_URI_PATTERN = 'maas://zones/list';
exports.ZONES_LIST_URI_PATTERN = ZONES_LIST_URI_PATTERN;
/** URI patterns for MAAS Device resources. */
// Device resource URI patterns
const DEVICE_DETAILS_URI_PATTERN = 'maas://device/{system_id}/details';
exports.DEVICE_DETAILS_URI_PATTERN = DEVICE_DETAILS_URI_PATTERN;
const DEVICES_LIST_URI_PATTERN = 'maas://devices/list';
exports.DEVICES_LIST_URI_PATTERN = DEVICES_LIST_URI_PATTERN;
/** URI patterns for MAAS Domain resources. */
// Domain resource URI patterns
const DOMAIN_DETAILS_URI_PATTERN = 'maas://domain/{domain_id}/details';
exports.DOMAIN_DETAILS_URI_PATTERN = DOMAIN_DETAILS_URI_PATTERN;
const DOMAINS_LIST_URI_PATTERN = 'maas://domains/list';
exports.DOMAINS_LIST_URI_PATTERN = DOMAINS_LIST_URI_PATTERN;
/**
 * Helper function to extract parameters from a URI string based on a given pattern.
 * The pattern should use curly braces to denote parameter names (e.g., `maas://resource/{id}/details`).
 * These placeholders are converted into named capture groups in a regular expression.
 *
 * @param uri The URI to extract parameters from
 * @param pattern The pattern to match against
 * @returns An object containing the extracted parameters
 */
function extractParamsFromUri(uri, pattern) {
    const params = {};
    // Convert pattern to regex by replacing {param} with named capture groups
    const regexPattern = pattern.replace(/{([^}]+)}/g, '(?<$1>[^/]+)');
    const regex = new RegExp(`^${regexPattern}$`);
    // Match URI against regex
    const match = uri.match(regex);
    if (match && match.groups) {
        return match.groups;
    }
    return params;
}
