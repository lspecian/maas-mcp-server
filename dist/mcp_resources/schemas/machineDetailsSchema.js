"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetMachineParamsSchema = exports.MaasMachineSchema = exports.MACHINES_LIST_URI_PATTERN = exports.MACHINE_DETAILS_URI_PATTERN = void 0;
const zod_1 = require("zod");
const uriPatterns_ts_1 = require("./uriPatterns.ts");
Object.defineProperty(exports, "MACHINE_DETAILS_URI_PATTERN", { enumerable: true, get: function () { return uriPatterns_ts_1.MACHINE_DETAILS_URI_PATTERN; } });
Object.defineProperty(exports, "MACHINES_LIST_URI_PATTERN", { enumerable: true, get: function () { return uriPatterns_ts_1.MACHINES_LIST_URI_PATTERN; } });
/**
 * Schema for MAAS Machine object.
 * Defines the structure and validation rules for machine data returned by the MAAS API.
 */
exports.MaasMachineSchema = zod_1.z.object({
    system_id: zod_1.z.string().describe("The unique system identifier for the machine."),
    hostname: zod_1.z.string().describe("The hostname of the machine."),
    domain: zod_1.z.object({
        id: zod_1.z.number().describe("ID of the domain."),
        name: zod_1.z.string().describe("Name of the domain."),
    }).describe("The domain this machine belongs to."),
    architecture: zod_1.z.string().describe("The architecture of the machine (e.g., 'amd64/generic')."),
    status: zod_1.z.number().describe("Numeric status code of the machine."),
    status_name: zod_1.z.string().describe("Human-readable status of the machine (e.g., 'Deployed', 'Ready')."),
    owner: zod_1.z.string().nullable().describe("The user who owns the machine, if any."),
    owner_data: zod_1.z.record(zod_1.z.any()).nullable().describe("Arbitrary data associated with the owner."),
    ip_addresses: zod_1.z.array(zod_1.z.string()).nullable().describe("A list of IP addresses assigned to the machine."),
    cpu_count: zod_1.z.number().describe("The number of CPU cores on the machine."),
    memory: zod_1.z.number().describe("The total memory of the machine in MB."),
    zone: zod_1.z.object({
        id: zod_1.z.number().describe("ID of the zone."),
        name: zod_1.z.string().describe("Name of the zone."),
    }).describe("The availability zone the machine is in."),
    pool: zod_1.z.object({
        id: zod_1.z.number().describe("ID of the resource pool."),
        name: zod_1.z.string().describe("Name of the resource pool."),
    }).describe("The resource pool the machine belongs to."),
    tags: zod_1.z.array(zod_1.z.string()).describe("A list of tags associated with the machine."),
    // Add more fields as needed based on MAAS API documentation
}).passthrough().describe("MAAS Machine object with hardware and status information");
/**
 * Schema for validating input parameters to get machine details.
 * This schema defines the parameters required to fetch a specific machine.
 */
exports.GetMachineParamsSchema = zod_1.z.object({
    system_id: zod_1.z.string()
        .describe("The system ID of the machine to retrieve details for."),
}).describe("Parameters for retrieving a specific machine's details");
