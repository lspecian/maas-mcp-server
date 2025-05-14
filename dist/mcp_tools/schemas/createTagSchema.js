"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTagSchema = void 0;
const zod_1 = require("zod");
const common_js_1 = require("./common.js");
/**
 * Schema for validating input parameters to the create tag tool.
 * This schema defines the parameters that can be used to create a new tag in MAAS.
 */
exports.createTagSchema = zod_1.z.object({
    name: zod_1.z.string()
        .describe("The name of the tag to create."),
    comment: zod_1.z.string().optional()
        .describe("Optional comment to describe the purpose of the tag."),
    definition: zod_1.z.string().optional()
        .describe("Optional tag definition expression to automatically tag matching nodes."),
    kernel_opts: zod_1.z.string().optional()
        .describe("Optional kernel options to be used when booting a machine with this tag."),
    _meta: common_js_1.metaSchema,
}).describe("Creates a new tag in MAAS with optional comment and definition.");
