import { z } from 'zod';

// Schema for MCP _meta field with progressToken
export const metaSchema = z.object({
  progressToken: z.union([z.string(), z.number()]).optional()
}).optional().describe("MCP metadata, including optional progressToken.");

// Common MAAS machine fields
export const machineIdSchema = z.string().describe("System ID of the machine.");

export const machineStatusSchema = z.enum([
  'NEW', 'COMMISSIONING', 'FAILED_COMMISSIONING',
  'READY', 'ALLOCATED', 'DEPLOYING', 'DEPLOYED',
  'RELEASING', 'FAILED_RELEASING', 'FAILED_DEPLOYMENT',
  'BROKEN', 'RESCUE_MODE'
]).describe("Status of the machine.");

// Common MAAS tag fields
export const tagNameSchema = z.string().min(1).describe("Name of the tag.");

// Common MAAS network fields
export const subnetSchema = z.string().describe("Subnet CIDR or ID.");
export const vlanSchema = z.number().int().positive().describe("VLAN ID.");

// Common MAAS OS fields
export const osSystemSchema = z.string().describe("Operating system (e.g., 'ubuntu').");
export const distroSeriesSchema = z.string().describe("Distribution series (e.g., 'jammy').");

// Pagination parameters
export const paginationSchema = z.object({
  offset: z.number().int().nonnegative().optional().describe("Offset for pagination."),
  limit: z.number().int().positive().optional().describe("Limit for pagination.")
}).optional();