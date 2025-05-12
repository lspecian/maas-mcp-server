// src/mcp_tools/schemas/writeOps.ts
const { z } = require('zod');
const { metaSchema } = require('./common'); // Assuming common.ts is in the same directory or adjust path

// --- Generic Success Response ---
// This schema is used as a base for successful write operations (POST, PUT, DELETE).
// It includes MCP metadata and can optionally carry a success message and/or
// the ID of the affected resource.
const writeOperationSuccessResponseSchema = z.object({
  _meta: metaSchema,
  success: z.boolean().default(true).describe('Indicates the operation was successful'),
  message: z.string().optional().describe('Optional success message'),
  id: z.string().optional().describe('ID of the affected resource, if applicable')
});

// --- Generic Error Response ---
// This schema is used for error responses from write operations.
// It includes MCP metadata and carries error details.
const writeOperationErrorResponseSchema = z.object({
  _meta: metaSchema,
  success: z.boolean().default(false).describe('Indicates the operation failed'),
  error: z.object({
    message: z.string().describe('Error message'),
    code: z.string().optional().describe('Error code, if available'),
    details: z.any().optional().describe('Additional error details')
  })
});

// --- Base POST Request Schema ---
// This schema is used as a base for POST requests.
// It includes MCP metadata and can be extended with operation-specific fields.
const basePostRequestSchema = z.object({
  _meta: metaSchema
});

// --- POST Success Response Schema ---
// This schema is used for successful POST responses.
// It extends the generic success response with created resource details.
const postSuccessResponseSchema = writeOperationSuccessResponseSchema.extend({
  created: z.boolean().default(true).describe('Indicates a resource was created'),
  resource_id: z.string().optional().describe('ID of the created resource')
});

// --- Base PUT Request Schema ---
// This schema is used as a base for PUT requests.
// It includes MCP metadata and can be extended with operation-specific fields.
const basePutRequestSchema = z.object({
  _meta: metaSchema
});

// --- PUT Success Response Schema ---
// This schema is used for successful PUT responses.
// It extends the generic success response with updated resource details.
const putSuccessResponseSchema = writeOperationSuccessResponseSchema.extend({
  updated: z.boolean().default(true).describe('Indicates a resource was updated'),
  resource_id: z.string().optional().describe('ID of the updated resource')
});

// --- Base DELETE Request Schema ---
// This schema is used as a base for DELETE requests.
// It includes MCP metadata and can be extended with operation-specific fields.
const baseDeleteRequestSchema = z.object({
  _meta: metaSchema
});

// --- DELETE Success Response Schema ---
// This schema is used for successful DELETE responses.
// It extends the generic success response with deleted resource details.
const deleteSuccessResponseSchema = writeOperationSuccessResponseSchema.extend({
  deleted: z.boolean().default(true).describe('Indicates a resource was deleted'),
  resource_id: z.string().optional().describe('ID of the deleted resource')
});

module.exports = {
  writeOperationSuccessResponseSchema,
  writeOperationErrorResponseSchema,
  basePostRequestSchema,
  postSuccessResponseSchema,
  basePutRequestSchema,
  putSuccessResponseSchema,
  baseDeleteRequestSchema,
  deleteSuccessResponseSchema
};