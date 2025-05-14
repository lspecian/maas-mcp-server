"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetZoneParamsSchema = exports.MaasZoneSchema = exports.ZONES_LIST_URI_PATTERN = exports.ZONE_DETAILS_URI_PATTERN = void 0;
const zod_1 = require("zod");
const uriPatterns_ts_1 = require("./uriPatterns.ts");
Object.defineProperty(exports, "ZONE_DETAILS_URI_PATTERN", { enumerable: true, get: function () { return uriPatterns_ts_1.ZONE_DETAILS_URI_PATTERN; } });
Object.defineProperty(exports, "ZONES_LIST_URI_PATTERN", { enumerable: true, get: function () { return uriPatterns_ts_1.ZONES_LIST_URI_PATTERN; } });
/**
 * Schema for MAAS Zone object.
 * Defines the structure and validation rules for zone data returned by the MAAS API.
 */
exports.MaasZoneSchema = zod_1.z.object({
    id: zod_1.z.number().describe("The unique identifier for the zone"),
    name: zod_1.z.string().describe("The name of the zone"),
    description: zod_1.z.string().describe("A description of the zone"),
    resource_uri: zod_1.z.string().describe("The URI for the zone resource"),
    // Add more fields as needed based on MAAS API documentation
}).passthrough().describe("MAAS Zone object with identification and descriptive information");
/**
 * Schema for validating input parameters to get zone details.
 * This schema defines the parameters required to fetch a specific zone.
 */
exports.GetZoneParamsSchema = zod_1.z.object({
    zone_id: zod_1.z.string()
        .describe("The ID of the zone to retrieve details for"),
}).describe("Parameters for retrieving a specific zone's details");
