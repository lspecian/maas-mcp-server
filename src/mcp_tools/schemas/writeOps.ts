// src/mcp_tools/schemas/writeOps.ts
import { z } from 'zod';
import { metaSchema } from './common.js'; // Assuming common.ts is in the same directory or adjust path

// --- Generic Success Response ---
// This schema is used as a base for successful write operations (POST, PUT, DELETE).
// It includes MCP metadata and can optionally carry a success message and/or
// the ID of the affected resource.
export const writeOperationSuccessResponseSchema = z.object({
  _meta: metaSchema,
  message: z.string().optional().describe("Optional success message confirming the operation."),
  id: z.string().optional().describe("Optional ID of the resource that was created, updated, or deleted."),
}).describe("Standard success response for write operations (POST, PUT, DELETE).");

// --- POST Operation Schemas ---
// For creating new resources.

/**
 * Generic base schema for POST request data.
 * It requires a 'payload' which should be defined by a more specific Zod schema
 * representing the data structure of the resource to be created.
 * @template T - A Zod schema defining the structure of the payload.
 * @param payloadSchema - The Zod schema for the resource creation data.
 */
export const basePostRequestSchema = <T extends z.ZodTypeAny>(payloadSchema: T) =>
  z.object({
    _meta: metaSchema,
    payload: payloadSchema.describe("Data payload for creating the new resource."),
  }).describe("Base schema for POST request data, requiring a payload defined by a specific resource schema.");

/**
 * Standard response schema for a successful POST operation.
 * It extends the generic success response and makes the 'id' field mandatory,
 * as a POST operation typically results in a new resource with a unique ID.
 */
export const postSuccessResponseSchema = writeOperationSuccessResponseSchema.extend({
  id: z.string().describe("ID of the newly created resource."),
}).describe("Standard response for a successful POST operation, including the new resource ID.");

// --- PUT Operation Schemas ---
// For updating existing resources.

/**
 * Generic base schema for PUT request data.
 * It requires the 'id' of the resource to be updated and a 'payload'
 * containing the fields to be updated. The payload structure should be
 * defined by a specific Zod schema, often allowing partial updates.
 * @template T - A Zod schema defining the structure of the update payload.
 * @param payloadSchema - The Zod schema for the resource update data (can be partial).
 */
export const basePutRequestSchema = <T extends z.ZodTypeAny>(payloadSchema: T) =>
  z.object({
    _meta: metaSchema,
    id: z.string().describe("ID of the resource to update."),
    payload: payloadSchema.describe("Data payload containing fields to update for the resource. Can be partial."),
  }).describe("Base schema for PUT request data, requiring a resource ID and an update payload.");

/**
 * Standard response schema for a successful PUT operation.
 * Uses the generic write operation success response.
 */
export const putSuccessResponseSchema = writeOperationSuccessResponseSchema
  .describe("Standard response for a successful PUT operation.");

// --- DELETE Operation Schemas ---
// For deleting existing resources.

/**
 * Standard schema for DELETE request data.
 * It requires only the 'id' of the resource to be deleted.
 */
export const deleteRequestSchema = z.object({
  _meta: metaSchema,
  id: z.string().describe("ID of the resource to delete."),
}).describe("Standard schema for DELETE request data, requiring a resource ID.");

/**
 * Standard response schema for a successful DELETE operation.
 * Uses the generic write operation success response.
 */
export const deleteSuccessResponseSchema = writeOperationSuccessResponseSchema
  .describe("Standard response for a successful DELETE operation.");

// --- Example Usage (Illustrative - would be in specific tool schemas) ---
/*
// Example: Schema for creating a 'widget'
const widgetCreationPayloadSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  parts: z.array(z.string()),
});
export const createWidgetRequestSchema = basePostRequestSchema(widgetCreationPayloadSchema);
// type CreateWidgetRequest = z.infer<typeof createWidgetRequestSchema>;

// Example: Schema for updating a 'widget' (allowing partial updates)
const widgetUpdatePayloadSchema = widgetCreationPayloadSchema.partial();
export const updateWidgetRequestSchema = basePutRequestSchema(widgetUpdatePayloadSchema);
// type UpdateWidgetRequest = z.infer<typeof updateWidgetRequestSchema>;

// Example: Response schema if a POST/PUT operation returns the full resource
export const resourceResponseSchema = <T extends z.ZodTypeAny>(resourceDataSchema: T) =>
  z.object({
    _meta: metaSchema,
    data: resourceDataSchema.describe("The created or updated resource data."),
  });

const widgetSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    parts: z.array(z.string()),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});
export const postWidgetResponseSchema = resourceResponseSchema(widgetSchema);
export const putWidgetResponseSchema = resourceResponseSchema(widgetSchema);
*/