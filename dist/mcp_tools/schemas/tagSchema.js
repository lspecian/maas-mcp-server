"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaasTagSchema = void 0;
const zod_1 = require("zod");
const common_js_1 = require("./common.js");
/**
 * Schema for MAAS Tag object.
 * Defines the structure and validation rules for tag data returned by the MAAS API.
 */
exports.MaasTagSchema = zod_1.z.object({
    id: zod_1.z.number(),
    name: zod_1.z.string(),
    definition: zod_1.z.string().nullable(),
    comment: zod_1.z.string().nullable(),
    kernel_opts: zod_1.z.string().nullable(),
    _meta: common_js_1.metaSchema,
}).describe("MAAS Tag object with identification and configuration information");
