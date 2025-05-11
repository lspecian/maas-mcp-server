/**
 * Centralized URI patterns for MAAS MCP resources
 * This file defines all URI patterns used for MAAS resources in a consistent format.
 */

/** URI patterns for MAAS Machine resources. */
// Machine resource URI patterns
export const MACHINE_DETAILS_URI_PATTERN = 'maas://machine/{system_id}/details';
export const MACHINES_LIST_URI_PATTERN = 'maas://machines/list';

/** URI patterns for MAAS Tag resources. */
// Tag resource URI patterns
export const TAG_DETAILS_URI_PATTERN = 'maas://tag/{tag_name}/details';
export const TAGS_LIST_URI_PATTERN = 'maas://tags/list';
export const TAG_MACHINES_URI_PATTERN = 'maas://tag/{tag_name}/machines';

/** URI patterns for MAAS Subnet resources. */
// Subnet resource URI patterns
export const SUBNET_DETAILS_URI_PATTERN = 'maas://subnet/{subnet_id}/details';
export const SUBNETS_LIST_URI_PATTERN = 'maas://subnets/list';

/** URI patterns for MAAS Zone resources. */
// Zone resource URI patterns
export const ZONE_DETAILS_URI_PATTERN = 'maas://zone/{zone_id}/details';
export const ZONES_LIST_URI_PATTERN = 'maas://zones/list';

/** URI patterns for MAAS Device resources. */
// Device resource URI patterns
export const DEVICE_DETAILS_URI_PATTERN = 'maas://device/{system_id}/details';
export const DEVICES_LIST_URI_PATTERN = 'maas://devices/list';

/** URI patterns for MAAS Domain resources. */
// Domain resource URI patterns
export const DOMAIN_DETAILS_URI_PATTERN = 'maas://domain/{domain_id}/details';
export const DOMAINS_LIST_URI_PATTERN = 'maas://domains/list';

/**
 * Helper function to extract parameters from a URI string based on a given pattern.
 * The pattern should use curly braces to denote parameter names (e.g., `maas://resource/{id}/details`).
 * These placeholders are converted into named capture groups in a regular expression.
 *
 * @param uri The URI to extract parameters from
 * @param pattern The pattern to match against
 * @returns An object containing the extracted parameters
 */
export function extractParamsFromUri(uri: string, pattern: string): Record<string, string> {
  const params: Record<string, string> = {};
  
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