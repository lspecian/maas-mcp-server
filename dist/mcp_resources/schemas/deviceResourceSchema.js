"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetDeviceParamsSchema = exports.MaasDeviceSchema = exports.DEVICES_LIST_URI_PATTERN = exports.DEVICE_DETAILS_URI_PATTERN = void 0;
const zod_1 = require("zod");
const uriPatterns_ts_1 = require("./uriPatterns.ts");
Object.defineProperty(exports, "DEVICE_DETAILS_URI_PATTERN", { enumerable: true, get: function () { return uriPatterns_ts_1.DEVICE_DETAILS_URI_PATTERN; } });
Object.defineProperty(exports, "DEVICES_LIST_URI_PATTERN", { enumerable: true, get: function () { return uriPatterns_ts_1.DEVICES_LIST_URI_PATTERN; } });
/**
 * Schema for MAAS Device object.
 * Defines the structure and validation rules for device data returned by the MAAS API.
 */
exports.MaasDeviceSchema = zod_1.z.object({
    system_id: zod_1.z.string().describe("The unique system identifier for the device"),
    hostname: zod_1.z.string().describe("The hostname of the device"),
    domain: zod_1.z.object({
        id: zod_1.z.number(),
        name: zod_1.z.string(),
    }).describe("The domain this device belongs to"),
    fqdn: zod_1.z.string().describe("The fully qualified domain name for the device"),
    owner: zod_1.z.string().nullable().describe("The owner of the device"),
    owner_data: zod_1.z.record(zod_1.z.any()).nullable().describe("Owner-specific data for the device"),
    ip_addresses: zod_1.z.array(zod_1.z.string()).nullable().describe("IP addresses associated with the device"),
    interface_set: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.number(),
        name: zod_1.z.string(),
        mac_address: zod_1.z.string(),
        // Add more interface fields as needed
    })).optional().describe("Network interfaces attached to the device"),
    zone: zod_1.z.object({
        id: zod_1.z.number(),
        name: zod_1.z.string(),
    }).describe("The zone this device is in"),
    tags: zod_1.z.array(zod_1.z.string()).describe("Tags associated with this device"),
    // Add more fields as needed based on MAAS API documentation
}).passthrough().describe("MAAS Device object with network and identification information");
/**
 * Schema for validating input parameters to get device details.
 * This schema defines the parameters required to fetch a specific device.
 */
exports.GetDeviceParamsSchema = zod_1.z.object({
    system_id: zod_1.z.string()
        .describe("The system ID of the device to retrieve details for"),
}).describe("Parameters for retrieving a specific device's details");
