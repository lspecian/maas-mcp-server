/**
 * This file re-exports schemas and types from their new dedicated locations.
 * It maintains backward compatibility for existing imports.
 *
 * IMPORTANT: New code should import directly from the dedicated schema files.
 * This file is provided only for backward compatibility.
 */

// Re-export from mcp_resources/schemas
export {
  MaasMachineSchema,
  GetMachineParamsSchema,
} from '../mcp_resources/schemas/machineDetailsSchema.js';
export type {
  MaasMachine,
  GetMachineParams
} from '../mcp_resources/schemas/machineDetailsSchema.js';

// Re-export from mcp_tools/schemas
export {
  MaasTagSchema,
} from '../mcp_tools/schemas/tagSchema.js';
export type {
  MaasTag
} from '../mcp_tools/schemas/tagSchema.js';

// Re-export with renamed exports for backward compatibility
import { listMachinesSchema } from '../mcp_tools/schemas/listMachinesSchema.js';
import { createTagSchema } from '../mcp_tools/schemas/createTagSchema.js';
import type { ListMachinesParams as ListMachinesParamsType } from '../mcp_tools/schemas/listMachinesSchema.js';
import type { CreateTagParams as CreateTagParamsType } from '../mcp_tools/schemas/createTagSchema.js';

// Maintain backward compatibility with old schema names
export const ListMachinesParamsSchema = listMachinesSchema;
export const CreateTagParamsSchema = createTagSchema;

// Re-export types with original names
export type ListMachinesParams = ListMachinesParamsType;
export type CreateTagParams = CreateTagParamsType;

// Re-export from src/types/maas.ts
export {
  MaasApiError,
} from './maas.js';
export type {
  MaasApiClientConfig,
  MaasApiRequestParams,
  MaasApiRequestBody,
  MaasApiResponse,
  MaasApiOptionalResponse,
} from './maas.js';