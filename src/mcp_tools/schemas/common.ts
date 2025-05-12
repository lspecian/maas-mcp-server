import { z } from 'zod';

// Schema for MCP _meta field with progressToken
const metaSchema = z.object({
  progressToken: z.union([z.string(), z.number()]).optional()
}).optional().describe("MCP metadata, including optional progressToken.");

// Common MAAS machine fields
const machineIdSchema = z.string().describe("System ID of the machine.");

const machineStatusSchema = z.enum([
  'NEW', 'COMMISSIONING', 'FAILED_COMMISSIONING',
  'READY', 'ALLOCATED', 'DEPLOYING', 'DEPLOYED',
  'RELEASING', 'FAILED_RELEASING', 'FAILED_DEPLOYMENT',
  'BROKEN', 'RESCUE_MODE'
]).describe("Status of the machine.");

// Common MAAS tag fields
const tagNameSchema = z.string().min(1).describe("Name of the tag.");

// Common MAAS network fields
const subnetSchema = z.string().describe("Subnet CIDR or ID.");
const vlanSchema = z.number().int().positive().describe("VLAN ID.");

// Common MAAS OS fields
const osSystemSchema = z.string().describe("Operating system (e.g., 'ubuntu').");
const distroSeriesSchema = z.string().describe("Distribution series (e.g., 'jammy').");

// Pagination parameters
const paginationSchema = z.object({
  offset: z.number().int().nonnegative().optional().describe("Offset for pagination."),
  limit: z.number().int().positive().optional().describe("Limit for pagination.")
}).optional();

export {
  metaSchema,
  machineIdSchema,
  machineStatusSchema,
  tagNameSchema,
  subnetSchema,
  vlanSchema,
  osSystemSchema,
  distroSeriesSchema,
  paginationSchema
};