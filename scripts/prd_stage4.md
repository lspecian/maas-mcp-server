# PRD - Stage 4: Advanced MCP Tool Implementation (Write Operations & Multipart)

## Original PRD Reference:
Based on "Report: Building an MCP Server for Canonical MAAS API in TypeScript (MCP v2024-11-05)" ([`scripts/prd.txt`](scripts/prd.txt))

## Stage Focus:
Implementing MCP Tools that involve write operations (POST, PUT, DELETE to MAAS API) and require `multipart/form-data` request bodies. This includes ensuring the MAAS-specific `op=` parameter is correctly handled by the `MaasApiClient` and tool handlers.

## Relevant Sections from Original PRD ([`scripts/prd.txt`](scripts/prd.txt)):

### 5. Implementing MCP Tools for MAAS API Operations (Continued)

#### 5.5. Handling multipart/form-data for POST/PUT Tools
Many MAAS API operations, particularly those creating or updating resources, require POST or PUT requests with `multipart/form-data` bodies.7 The MCP tool implementation must ensure these requests are correctly formatted. A specific characteristic of the MAAS API is the use of an `op=` parameter within the form data to specify the action.7

**Example: Tool to create a MAAS tag (MAAS API: `POST /MAAS/api/2.0/tags/` with `op=new`)**

**Schema Definition:**
```typescript
// src/mcp_tools/schemas/createTagSchema.ts
import { z } from 'zod';

export const createTagSchema = z.object({
    name: z.string().min(1).describe("Name of the tag to create."),
    comment: z.string().optional().describe("Optional comment for the tag."),
    kernel_opts: z.string().optional().describe("Optional kernel options for nodes with this tag."),
    // MAAS API also supports 'definition' for smart tags, not included for simplicity
}).describe("Creates a new tag in MAAS.");
```

**Tool Handler Implementation:**
```typescript
// src/mcp_tools/createTag.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MaasApiClient } from "../maas/MaasApiClient"; // Corrected path
import { createTagSchema } from "./schemas/createTagSchema"; // Corrected path
import { z } from "zod";

export function registerCreateTagTool(server: McpServer, maasClient: MaasApiClient) {
    server.tool(
        "maas_create_tag",
        createTagSchema,
        async (params: z.infer<typeof createTagSchema>, { signal }) => {
            try {
                const maasApiParams: Record<string, any> = {
                    op: 'new', // Crucial 'op' parameter for MAAS [7]
                    name: params.name,
                };
                if (params.comment) maasApiParams.comment = params.comment;
                if (params.kernel_opts) maasApiParams.kernel_opts = params.kernel_opts;

                // The maasClient.post method (from Stage 2 PRD) is responsible
                // for constructing the multipart/form-data request.
                const result = await maasClient.post('/tags', maasApiParams, signal);

                return {
                    content: [{ type: "json", data: result }] // MAAS usually returns the created object
                };
            } catch (error: any) {
                console.error("Error in maas_create_tag tool:", error);
                return {
                    content: [{ type: "text", text: `Error creating tag: ${error.message}` }],
                    isError: true
                };
            }
        }
    );
}
```
The `MaasApiClient`'s `post` method (defined in Stage 2 PRD) must correctly assemble the `multipart/form-data` payload, including the `op=new` parameter as one of the form parts.

**Table: MAAS API Endpoint to MCP Tool Mapping (Examples for Write Operations)**
This table provides a clear mapping for selected MAAS API functionalities to their MCP Tool counterparts.
| MAAS API Endpoint     | HTTP Method | MAAS `op`    | Brief Description             | MCP Tool Name             | Key MCP Input Schema Fields (from Zod)        |
|-----------------------|-------------|--------------|-------------------------------|---------------------------|-----------------------------------------------|
| `/machines`           | POST        | `allocate`   | Allocate machine(s)           | `maas_allocate_machine`   | `name?`, `tags?`, `zone?`, `system_ids?`      |
| `/machines/{system_id}` | POST        | `deploy`     | Deploy machine (initial version) | `maas_deploy_machine`     | `system_id`, `osystem?`, `distro_series?`     |
| `/tags/{tag_name}`    | POST        | `update_nodes` | Assign/unassign tag for nodes | `maas_update_tag_nodes`   | `tag_name`, `add?: string[]`, `remove?: string[]` |
| `/tags/{tag_name}`    | PUT         | N/A          | Update tag definition         | `maas_update_tag_definition`| `tag_name`, `comment?`, `kernel_opts?`        |
| `/tags/{tag_name}`    | DELETE      | N/A          | Delete a tag                  | `maas_delete_tag`         | `tag_name`                                    |
| *(More tools for other POST/PUT/DELETE operations as identified)* |             |              |                               |                           |                                               |

**Note on `MaasApiClient` for `multipart/form-data`:**
The `MaasApiClient` implementation from Stage 2 PRD ([`scripts/prd_stage2.md`](scripts/prd_stage2.md)) already includes logic to handle `FormData` for `POST` and `PUT` requests. This stage will involve creating tools that utilize this capability.

```typescript
// Relevant snippet from MaasApiClient in prd_stage2.md
// ...
        if (method === 'POST' || method === 'PUT') {
            if (params) {
                const formData = new FormData(); // Native or from 'formdata-node'
                for (const key in params) {
                    // MAAS expects text parameters for multipart [7]
                    formData.append(key, String(params[key]));
                }
                requestBody = formData;
                // Let node-fetch set the Content-Type header for FormData, including the boundary.
            }
        }
// ...
```

## Tool Registration:
New tool registration functions (e.g., `registerAllocateMachineTool`, `registerDeployMachineTool`, `registerUpdateTagNodesTool`) will be added to [`src/mcp_tools/`](src/mcp_tools/) and exported via [`src/mcp_tools/index.ts`](src/mcp_tools/index.ts:1) for registration in [`src/index.ts`](src/index.ts:1).

## Sanity Checks for Stage 4:
*   Test tools that create, update, or delete MAAS entities (e.g., `maas_create_tag`, `maas_allocate_machine`).
*   Verify correct construction and sending of `multipart/form-data` by `MaasApiClient`.
*   Confirm the MAAS `op=` parameter is correctly included and processed for relevant operations.
*   Check responses from MAAS for successful operations (e.g., HTTP 200, 201, 204) and that the returned data (if any) is correctly processed.
*   Test with invalid inputs to ensure Zod schemas and tool handlers manage errors appropriately.

## Auditing Points for Stage 4:
*   Code review of Zod schemas for all new write-operation tools.
*   Code review of tool handlers for these write operations, focusing on:
    *   Correct `maasApiParams` construction, including the `op` field where necessary.
    *   Proper use of `maasClient.post()`, `maasClient.put()`, or `maasClient.delete()`.
    *   Transformation of MAAS API responses into `ToolResult`.
    *   Comprehensive error handling for MAAS API errors (e.g., 4xx, 5xx status codes).
*   Re-verify `MaasApiClient`'s `makeRequest` method, specifically the `multipart/form-data` handling logic, to ensure robustness for various MAAS operations.
*   Ensure `AbortSignal` is consistently passed and handled in new tool handlers.