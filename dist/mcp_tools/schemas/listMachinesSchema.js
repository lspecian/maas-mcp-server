"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMachinesSchema = void 0;
const zod_1 = require("zod");
const common_js_1 = require("./common.js");
/**
 * Schema for validating input parameters to the list machines tool.
 * This schema defines the parameters that can be used to filter the list of machines.
 */
exports.listMachinesSchema = zod_1.z.object({
    hostname: zod_1.z.string().optional()
        .describe("Filter machines by hostname (supports globbing)."),
    mac_addresses: zod_1.z.array(zod_1.z.string()).optional()
        .describe("Filter machines by a list of MAC addresses."),
    tag_names: zod_1.z.array(zod_1.z.string()).optional()
        .describe("Filter machines by a list of tag names."),
    status: zod_1.z.string().optional()
        .describe("Filter machines by their status (e.g., 'ready', 'deployed', 'commissioning')."),
    zone: zod_1.z.string().optional()
        .describe("Filter machines by zone name."),
    pool: zod_1.z.string().optional()
        .describe("Filter machines by resource pool name."),
    owner: zod_1.z.string().optional()
        .describe("Filter machines by owner username."),
    architecture: zod_1.z.string().optional()
        .describe("Filter machines by architecture (e.g., 'amd64/generic')."),
    limit: zod_1.z.number().positive().optional()
        .describe("Limit the number of machines returned."),
    offset: zod_1.z.number().nonnegative().optional()
        .describe("Skip the first N machines in the result set."),
    _meta: common_js_1.metaSchema,
}).describe("Lists machines registered in MAAS, with optional filters.");
