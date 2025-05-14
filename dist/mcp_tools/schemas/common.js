"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginationSchema = exports.distroSeriesSchema = exports.osSystemSchema = exports.vlanSchema = exports.subnetSchema = exports.tagNameSchema = exports.machineStatusSchema = exports.machineIdSchema = exports.metaSchema = void 0;
const zod_1 = require("zod");
// Schema for MCP _meta field with progressToken
const metaSchema = zod_1.z.object({
    progressToken: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional()
}).optional().describe("MCP metadata, including optional progressToken.");
exports.metaSchema = metaSchema;
// Common MAAS machine fields
const machineIdSchema = zod_1.z.string().describe("System ID of the machine.");
exports.machineIdSchema = machineIdSchema;
const machineStatusSchema = zod_1.z.enum([
    'NEW', 'COMMISSIONING', 'FAILED_COMMISSIONING',
    'READY', 'ALLOCATED', 'DEPLOYING', 'DEPLOYED',
    'RELEASING', 'FAILED_RELEASING', 'FAILED_DEPLOYMENT',
    'BROKEN', 'RESCUE_MODE'
]).describe("Status of the machine.");
exports.machineStatusSchema = machineStatusSchema;
// Common MAAS tag fields
const tagNameSchema = zod_1.z.string().min(1).describe("Name of the tag.");
exports.tagNameSchema = tagNameSchema;
// Common MAAS network fields
const subnetSchema = zod_1.z.string().describe("Subnet CIDR or ID.");
exports.subnetSchema = subnetSchema;
const vlanSchema = zod_1.z.number().int().positive().describe("VLAN ID.");
exports.vlanSchema = vlanSchema;
// Common MAAS OS fields
const osSystemSchema = zod_1.z.string().describe("Operating system (e.g., 'ubuntu').");
exports.osSystemSchema = osSystemSchema;
const distroSeriesSchema = zod_1.z.string().describe("Distribution series (e.g., 'jammy').");
exports.distroSeriesSchema = distroSeriesSchema;
// Pagination parameters
const paginationSchema = zod_1.z.object({
    offset: zod_1.z.number().int().nonnegative().optional().describe("Offset for pagination."),
    limit: zod_1.z.number().int().positive().optional().describe("Limit for pagination.")
}).optional();
exports.paginationSchema = paginationSchema;
