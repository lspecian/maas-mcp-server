/**
 * Common query parameter schemas for collection resources
 * Defines schemas for filtering, pagination, and sorting parameters
 */
import { z } from "zod";

/**
 * Base Zod schema for common query parameters applicable to most collection (list) endpoints.
 * This schema includes:
 * - **Pagination parameters**: `limit`, `offset`, `page`, `per_page` to control the number and position of results.
 * - **Sorting parameters**: `sort` (by field name) and `order` (`asc` or `desc`) to control the order of results.
 * All parameters are optional. The `.strict()` method ensures no unknown parameters are allowed.
 */
export const BaseCollectionQueryParamsSchema = z.object({
  // Pagination parameters: Used to control the subset of results returned.
  limit: z.coerce.number().int().positive().optional().describe("Number of items to return per page."),
  offset: z.coerce.number().int().nonnegative().optional().describe("Offset from the beginning of the collection."),
  page: z.coerce.number().int().positive().optional().describe("Page number to retrieve (1-indexed)."),
  per_page: z.coerce.number().int().positive().optional().describe("Number of items per page (alternative to limit)."),
  
  // Sorting parameters: Used to control the order of the returned items.
  sort: z.string().optional().describe("Field name to sort by."),
  order: z.enum(["asc", "desc"]).optional().describe("Sort order: 'asc' for ascending, 'desc' for descending."),
}).strict();

/**
 * TypeScript type representing the base collection query parameters, inferred from
 * `BaseCollectionQueryParamsSchema`.
 */
export type BaseCollectionQueryParams = z.infer<typeof BaseCollectionQueryParamsSchema>;

/**
 * Zod schema for query parameters specific to listing MAAS machines.
 * Extends `BaseCollectionQueryParamsSchema` to include machine-specific filtering options
 * such as `hostname`, `status`, `zone`, etc.
 */
export const MachineCollectionQueryParamsSchema = BaseCollectionQueryParamsSchema.extend({
  // Machine-specific filters:
  hostname: z.string().optional().describe("Filter machines by hostname (exact match or pattern)."),
  status: z.string().optional().describe("Comma-separated list of machine statuses to filter by."),
  zone: z.string().optional().describe("Filter machines by zone name or ID."),
  pool: z.string().optional().describe("Filter machines by resource pool name or ID."),
  tags: z.string().optional().describe("Comma-separated list of tags to filter by."),
  owner: z.string().optional().describe("Filter machines by owner."),
  architecture: z.string().optional().describe("Filter machines by architecture (e.g., amd64, arm64)."),
  mac_addresses: z.string().optional().transform(val => val ? val.split(',') : undefined).describe("Comma-separated list of MAC addresses."),
  not_tags: z.string().optional().describe("Comma-separated list of tags to exclude."),
  tag_names: z.string().optional().transform(val => val ? val.split(',') : undefined).describe("Comma-separated list of tag names to filter by."),
  not_tag_names: z.string().optional().transform(val => val ? val.split(',') : undefined).describe("Comma-separated list of tag names to exclude."),
  interfaces: z.string().optional().describe("Filter by network interfaces (e.g., by MAC, VLAN tag, or name like 'eth0')."),
  storage: z.string().optional().describe("Filter by storage configuration (e.g., 'sata:1,nvme:2')."),
  agent_name: z.string().optional().describe("Filter by MAAS agent name."),
  comment: z.string().optional().describe("Filter by comment."),
  id: z.string().optional().describe("Comma-separated list of machine IDs to filter by."),
  not_id: z.string().optional().describe("Comma-separated list of machine IDs to exclude."),
  parent: z.string().optional().describe("Filter by parent node or controller."),
  domain: z.string().optional().describe("Filter by domain name."),
  arch: z.string().optional().describe("Filter by architecture (alias for architecture)."),
  not_arch: z.string().optional().describe("Exclude machines of a specific architecture."),
  cpu_count: z.coerce.number().int().positive().optional().describe("Filter by exact CPU count."),
  not_cpu_count: z.coerce.number().int().positive().optional().describe("Exclude machines with a specific CPU count."),
  memory: z.coerce.number().int().positive().optional().describe("Filter by exact memory in MB."),
  not_memory: z.coerce.number().int().positive().optional().describe("Exclude machines with a specific amount of memory in MB."),
  pod: z.string().optional().describe("Filter by pod name or ID."),
  not_pod: z.string().optional().describe("Exclude machines in a specific pod."),
  pod_type: z.string().optional().describe("Filter by pod type."),
  not_pod_type: z.string().optional().describe("Exclude machines of a specific pod type."),
  not_status: z.string().optional().describe("Exclude machines with specific statuses (comma-separated)."),
  locked: z.coerce.boolean().optional().describe("Filter by lock status."),
  not_locked: z.coerce.boolean().optional().describe("Filter by not being locked."),
  not_pool: z.string().optional().describe("Exclude machines in a specific resource pool."),
  agent_connected: z.coerce.boolean().optional().describe("Filter by agent connection status."),
  not_agent_connected: z.coerce.boolean().optional().describe("Filter by agent not being connected."),
  vlans: z.string().optional().describe("Comma-separated list of VLAN IDs or names to filter by."),
  not_vlans: z.string().optional().describe("Comma-separated list of VLAN IDs or names to exclude."),
  fabrics: z.string().optional().describe("Filter by fabric name or ID."),
  not_fabrics: z.string().optional().describe("Exclude machines in a specific fabric."),
  fabric_classes: z.string().optional().describe("Filter by fabric class."),
  not_fabric_classes: z.string().optional().describe("Exclude machines of a specific fabric class."),
  constraints: z.string().optional().describe("Comma-separated list of key=value constraints."),
  not_constraints: z.string().optional().describe("Comma-separated list of key=value constraints to exclude."),
  have_bmc: z.coerce.boolean().optional().describe("Filter machines that have a BMC."),
  not_have_bmc: z.coerce.boolean().optional().describe("Filter machines that do not have a BMC."),
  osystem: z.string().optional().describe("Filter by operating system."),
  not_osystem: z.string().optional().describe("Exclude machines with a specific operating system."),
  power_state: z.string().optional().describe("Filter by power state (e.g., 'on', 'off')."),
  not_power_state: z.string().optional().describe("Exclude machines with a specific power state."),
  power_type: z.string().optional().describe("Filter by power type (e.g., 'acpi', 'ipmi')."),
  not_power_type: z.string().optional().describe("Exclude machines with a specific power type."),
  hba_count: z.coerce.number().int().nonnegative().optional().describe("Filter by Host Bus Adapter (HBA) count."),
  not_hba_count: z.coerce.number().int().nonnegative().optional().describe("Exclude machines with a specific HBA count."),
  gpu_count: z.coerce.number().int().nonnegative().optional().describe("Filter by GPU count."),
  not_gpu_count: z.coerce.number().int().nonnegative().optional().describe("Exclude machines with a specific GPU count."),
  cpus_by_arch: z.string().optional().describe("Filter by CPU counts for specific architectures, e.g., 'amd64:4,arm64:2'."),
  not_cpus_by_arch: z.string().optional().describe("Exclude machines with specific CPU counts by architecture."),
  storage_by_type: z.string().optional().describe("Filter by storage counts for specific types, e.g., 'ssd:2,hdd:1'."),
  not_storage_by_type: z.string().optional().describe("Exclude machines with specific storage counts by type."),
  has_primary_address: z.coerce.boolean().optional().describe("Filter machines that have a primary IP address."),
  not_has_primary_address: z.coerce.boolean().optional().describe("Filter machines that do not have a primary IP address."),
  has_secondary_address: z.coerce.boolean().optional().describe("Filter machines that have secondary IP addresses."),
  not_has_secondary_address: z.coerce.boolean().optional().describe("Filter machines that do not have secondary IP addresses."),
  has_ipv4_address: z.coerce.boolean().optional().describe("Filter machines that have an IPv4 address."),
  not_has_ipv4_address: z.coerce.boolean().optional().describe("Filter machines that do not have an IPv4 address."),
  has_ipv6_address: z.coerce.boolean().optional().describe("Filter machines that have an IPv6 address."),
  not_has_ipv6_address: z.coerce.boolean().optional().describe("Filter machines that do not have an IPv6 address."),
  has_static_address: z.coerce.boolean().optional().describe("Filter machines that have a static IP address."),
  not_has_static_address: z.coerce.boolean().optional().describe("Filter machines that do not have a static IP address."),
  has_dynamic_address: z.coerce.boolean().optional().describe("Filter machines that have a dynamic IP address."),
  not_has_dynamic_address: z.coerce.boolean().optional().describe("Filter machines that do not have a dynamic IP address."),
  has_auto_address: z.coerce.boolean().optional().describe("Filter machines that have an auto-assigned IP address."),
  not_has_auto_address: z.coerce.boolean().optional().describe("Filter machines that do not have an auto-assigned IP address."),
  has_link_local_address: z.coerce.boolean().optional().describe("Filter machines that have a link-local IP address."),
  not_has_link_local_address: z.coerce.boolean().optional().describe("Filter machines that do not have a link-local IP address."),
  is_bare_metal: z.coerce.boolean().optional().describe("Filter for bare metal machines."),
  not_is_bare_metal: z.coerce.boolean().optional().describe("Exclude bare metal machines."),
  is_virtual_machine: z.coerce.boolean().optional().describe("Filter for virtual machines."),
  not_is_virtual_machine: z.coerce.boolean().optional().describe("Exclude virtual machines."),
  is_container: z.coerce.boolean().optional().describe("Filter for containers."),
  not_is_container: z.coerce.boolean().optional().describe("Exclude containers."),
});

/**
 * TypeScript type representing query parameters for machine collections, inferred from
 * `MachineCollectionQueryParamsSchema`.
 */
export type MachineCollectionQueryParams = z.infer<typeof MachineCollectionQueryParamsSchema>;

/**
 * Zod schema for query parameters specific to listing MAAS subnets.
 * Extends `BaseCollectionQueryParamsSchema` to include subnet-specific filtering options
 * such as `cidr`, `name`, `vlan`, etc.
 */
export const SubnetCollectionQueryParamsSchema = BaseCollectionQueryParamsSchema.extend({
  // Subnet-specific filters:
  cidr: z.string().optional().describe("Filter subnets by CIDR notation (e.g., '192.168.1.0/24')."),
  name: z.string().optional(),
  vlan: z.string().optional(),
  space: z.string().optional().describe("Filter subnets by associated space name or ID."),
  vlan_vid: z.coerce.number().int().min(0).max(4095).optional().describe("Filter by VLAN ID (0-4095)."),
});

/**
 * TypeScript type representing query parameters for subnet collections, inferred from
 * `SubnetCollectionQueryParamsSchema`.
 */
export type SubnetCollectionQueryParams = z.infer<typeof SubnetCollectionQueryParamsSchema>;

/**
 * Zod schema for query parameters specific to listing MAAS zones.
 * Extends `BaseCollectionQueryParamsSchema` to include zone-specific filtering options
 * such as `name`.
 */
export const ZoneCollectionQueryParamsSchema = BaseCollectionQueryParamsSchema.extend({
  // Zone-specific filters:
  name: z.string().optional().describe("Filter zones by name."),
});

/**
 * TypeScript type representing query parameters for zone collections, inferred from
 * `ZoneCollectionQueryParamsSchema`.
 */
export type ZoneCollectionQueryParams = z.infer<typeof ZoneCollectionQueryParamsSchema>;

/**
 * Zod schema for query parameters specific to listing MAAS devices.
 * Extends `BaseCollectionQueryParamsSchema` to include device-specific filtering options
 * such as `hostname`, `mac_address`, etc.
 */
export const DeviceCollectionQueryParamsSchema = BaseCollectionQueryParamsSchema.extend({
  // Device-specific filters:
  hostname: z.string().optional().describe("Filter devices by hostname."),
  mac_address: z.string().optional(),
  zone: z.string().optional(),
  owner: z.string().optional(),
});

/**
 * TypeScript type representing query parameters for device collections, inferred from
 * `DeviceCollectionQueryParamsSchema`.
 */
export type DeviceCollectionQueryParams = z.infer<typeof DeviceCollectionQueryParamsSchema>;

/**
 * Zod schema for query parameters specific to listing MAAS domains.
 * Extends `BaseCollectionQueryParamsSchema` to include domain-specific filtering options
 * such as `name` and `authoritative` status.
 */
export const DomainCollectionQueryParamsSchema = BaseCollectionQueryParamsSchema.extend({
  // Domain-specific filters:
  name: z.string().optional().describe("Filter domains by name."),
  authoritative: z.enum(["true", "false"]).optional().describe("Filter domains by authoritative status (true or false)."),
});

/**
 * TypeScript type representing query parameters for domain collections, inferred from
 * `DomainCollectionQueryParamsSchema`.
 */
export type DomainCollectionQueryParams = z.infer<typeof DomainCollectionQueryParamsSchema>;

/**
 * Zod schema for query parameters specific to listing MAAS tags.
 * Extends `BaseCollectionQueryParamsSchema` to include tag-specific filtering options
 * such as `name`, `definition`, etc.
 */
export const TagCollectionQueryParamsSchema = BaseCollectionQueryParamsSchema.extend({
  // Tag-specific filters:
  name: z.string().optional().describe("Filter tags by name."),
  definition: z.string().optional(),
  kernel_opts: z.string().optional(),
});

/**
 * TypeScript type representing query parameters for tag collections, inferred from
 * `TagCollectionQueryParamsSchema`.
 */
export type TagCollectionQueryParams = z.infer<typeof TagCollectionQueryParamsSchema>;