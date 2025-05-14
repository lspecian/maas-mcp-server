"use strict";
/**
 * This file re-exports schemas and types from their new dedicated locations.
 * It maintains backward compatibility for existing imports.
 *
 * IMPORTANT: New code should import directly from the dedicated schema files.
 * This file is provided only for backward compatibility.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaasApiError = exports.CreateTagParamsSchema = exports.ListMachinesParamsSchema = exports.MaasTagSchema = exports.GetMachineParamsSchema = exports.MaasMachineSchema = void 0;
// Re-export from mcp_resources/schemas
var machineDetailsSchema_js_1 = require("../mcp_resources/schemas/machineDetailsSchema.js");
Object.defineProperty(exports, "MaasMachineSchema", { enumerable: true, get: function () { return machineDetailsSchema_js_1.MaasMachineSchema; } });
Object.defineProperty(exports, "GetMachineParamsSchema", { enumerable: true, get: function () { return machineDetailsSchema_js_1.GetMachineParamsSchema; } });
// Re-export from mcp_tools/schemas
var tagSchema_js_1 = require("../mcp_tools/schemas/tagSchema.js");
Object.defineProperty(exports, "MaasTagSchema", { enumerable: true, get: function () { return tagSchema_js_1.MaasTagSchema; } });
// Re-export with renamed exports for backward compatibility
const listMachinesSchema_js_1 = require("../mcp_tools/schemas/listMachinesSchema.js");
const createTagSchema_js_1 = require("../mcp_tools/schemas/createTagSchema.js");
// Maintain backward compatibility with old schema names
exports.ListMachinesParamsSchema = listMachinesSchema_js_1.listMachinesSchema;
exports.CreateTagParamsSchema = createTagSchema_js_1.createTagSchema;
// Re-export from src/types/maas.ts
var maas_js_1 = require("./maas.js");
Object.defineProperty(exports, "MaasApiError", { enumerable: true, get: function () { return maas_js_1.MaasApiError; } });
