# PRD - Stage 6: Comprehensive Error Handling, Logging, Testing & Security

## Original PRD Reference:
Based on "Report: Building an MCP Server for Canonical MAAS API in TypeScript (MCP v2024-11-05)" ([`scripts/prd.txt`](scripts/prd.txt))

## Stage Focus:
Hardening the server with robust error handling across all layers (MCP protocol, MAAS API, tool/resource logic), implementing comprehensive structured logging for diagnostics and monitoring, developing thorough unit and integration tests for reliability, and addressing key security best practices.

## Relevant Sections from Original PRD ([`scripts/prd.txt`](scripts/prd.txt)):

### 8. Error Handling, Logging, and Best Practices

#### 8.1. MCP Error Handling
*   **Tool Errors:** Tool handlers should return `ToolResult` with `isError: true` and descriptive `content` (e.g., `[{ type: "text", text: "Error details..." }]`).
*   **Protocol Errors:** Generally handled by the MCP SDK's transport layer (JSON-RPC errors).
*   **Resource Errors:** Resource handlers should `throw new Error(...)`. The SDK converts this to a JSON-RPC error.

#### 8.2. MAAS API Error Handling
The `MaasApiClient` (from Stage 2 PRD - [`scripts/prd_stage2.md`](scripts/prd_stage2.md)) should:
*   Check HTTP status codes (4xx, 5xx).
*   Parse JSON error bodies from MAAS if available.
*   Throw custom, informative errors to be caught by tool/resource handlers.
    *Example refinement in `MaasApiClient.makeRequest`*:
    ```typescript
    // Inside MaasApiClient.makeRequest, after fetch:
    if (!response.ok) {
        const errorBody = await response.text(); // Try to get text first
        let errorMessage = `MAAS API Error (${response.status})`;
        try {
            const jsonError = JSON.parse(errorBody);
            // MAAS often returns errors as simple strings or sometimes structured JSON
            // This part might need adjustment based on actual MAAS error formats
            if (typeof jsonError === 'string') {
                errorMessage += `: ${jsonError}`;
            } else if (jsonError.error_description) { // Example structure
                errorMessage += `: ${jsonError.error_description}`;
            } else {
                 errorMessage += `: ${errorBody.substring(0, 200)}`;
            }
        } catch (e) {
            errorMessage += `: ${errorBody.substring(0, 200)}`; // Fallback if not JSON
        }
        console.error(`MAAS API Error on ${method} ${targetUrl}: ${errorMessage}`);
        // Consider creating a custom error class, e.g., MaasApiError
        throw new Error(errorMessage);
    }
    ```

#### 8.3. Structured Logging
*   Employ a structured logging library (e.g., Pino, Winston).
    *Example with Pino*:
    ```typescript
    // src/logger.ts
    import pino from 'pino';
    export const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

    // Usage in other files:
    // import { logger } from './logger';
    // logger.info({ requestId, toolName, params }, "Executing tool");
    // logger.error({ requestId, error: error.message, stack: error.stack }, "Tool execution failed");
    ```
*   Log key events:
    *   Incoming MCP requests (method, parameters, client ID if available, unique request ID).
    *   Outgoing MAAS API requests (endpoint, parameters, request ID).
    *   MAAS API responses (status, key data snippets, request ID).
    *   MCP responses/notifications (request ID).
    *   All errors with stack traces and request ID.
*   Use correlation IDs (request IDs) to trace operations. This ID can be generated upon receiving an MCP request and passed through all subsequent calls and logs.

#### 8.4. Security Considerations
*   **MAAS API Key Management:**
    *   Use environment variables (`MAAS_API_URL`, `MAAS_API_KEY`).
    *   In [`src/config.ts`](src/config.ts:1) (or similar):
        ```typescript
        // src/config.ts
        import dotenv from 'dotenv';
        dotenv.config(); // Load .env file

        export const MAAS_API_URL = process.env.MAAS_API_URL;
        export const MAAS_API_KEY = process.env.MAAS_API_KEY;

        if (!MAAS_API_URL || !MAAS_API_KEY) {
            // logger.fatal("MAAS_API_URL or MAAS_API_KEY not configured. Exiting."); // Use logger
            // process.exit(1); // Or handle more gracefully
            throw new Error("MAAS_API_URL or MAAS_API_KEY not configured.");
        }
        ```
    *   Never hardcode keys.
*   **Input Sanitization and Validation:** Zod schemas (from previous stages) are the primary defense. Ensure no unvalidated input constructs API calls.
*   **HTTPS Enforcement:**
    *   MCP server (if public) must use HTTPS (e.g., via a reverse proxy like Nginx or Caddy).
    *   `MaasApiClient` must use HTTPS for MAAS API calls (ensure `MAAS_API_URL` starts with `https://`).
*   **MCP Server Authorization (Future Consideration):** The PRD notes this as a future hardening step. For this stage, focus on MAAS API security.

### 9. Testing and Validation

#### 9.1. Unit Testing
*   **Tool Handlers:** Mock `MaasApiClient` to test success/error paths, parameter validation, `ToolResult` format.
*   **Resource Handlers:** Mock `MaasApiClient`, test URI parsing, `ResourceResult` format.
*   **`MaasApiClient`:** Mock `node-fetch`. Test OAuth header construction, request/response/error parsing.
    *Testing frameworks like Jest or Vitest are recommended.*
    *Example (Jest/Vitest style for a tool handler)*:
    ```typescript
    // src/mcp_tools/listMachines.test.ts
    /*
    import { registerListMachinesTool } from './listMachines';
    import { MaasApiClient } from '../maas/MaasApiClient';
    import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
    import { listMachinesSchema } from './schemas/listMachinesSchema';

    jest.mock('../maas/MaasApiClient'); // Mock the MaasApiClient

    describe('maas_list_machines tool', () => {
        let server: McpServer;
        let mockMaasClient: jest.Mocked<MaasApiClient>;

        beforeEach(() => {
            server = new McpServer({ name: 'TestServer', version: '1.0', protocolVersion: '2024-11-05' });
            mockMaasClient = new MaasApiClient('', '') as jest.Mocked<MaasApiClient>; // Instantiation details don't matter for mock
            registerListMachinesTool(server, mockMaasClient);
        });

        it('should list machines successfully', async () => {
            const mockMachines = [{ id: '123', hostname: 'test-host' }];
            mockMaasClient.get.mockResolvedValue(mockMachines);

            const toolFn = server.getToolFunction('maas_list_machines');
            const result = await toolFn!({}, { signal: undefined }); // Basic call

            expect(mockMaasClient.get).toHaveBeenCalledWith('/machines', {}, undefined);
            expect(result.isError).toBeFalsy();
            expect(result.content).toEqual([{ type: 'json', data: mockMachines }]);
        });

        it('should handle errors from MaasApiClient', async () => {
            mockMaasClient.get.mockRejectedValue(new Error('MAAS API Down'));
            const toolFn = server.getToolFunction('maas_list_machines');
            const result = await toolFn!({}, { signal: undefined });

            expect(result.isError).toBe(true);
            expect(result.content).toEqual([{ type: 'text', text: 'Error listing machines: MAAS API Down' }]);
        });
    });
    */
    ```

#### 9.2. Integration Testing
*   Test end-to-end flow: MCP client -> MCP Server -> (Mocked or Test) MAAS API -> MCP Server -> MCP Client.
*   Verify `multipart/form-data` handling with a test MAAS endpoint or mock.
*   Test progress notifications.
*   Validate error propagation.

#### 9.3. Using MCP Inspector
Use `@modelcontextprotocol/inspector` for manual, interactive testing against a running MCP server instance (local or test environment).

#### 9.4. Validation Against MCP Specification
Ensure all messages conform to MCP 2024-11-05 schema.

## Sanity Checks for Stage 6:
*   Induce various error conditions (MAAS API errors, MCP protocol errors, invalid tool inputs) and verify the server responds correctly with appropriate error messages/codes and logs them.
*   Review log outputs (e.g., console or log files if configured) for clarity, structure, completeness, and the presence of correlation IDs.
*   Execute all unit tests (e.g., via `npm test`) and ensure they pass with good coverage.
*   Run integration tests and confirm they pass.
*   Verify MAAS API key is handled securely (loaded from environment variables, not hardcoded).
*   Confirm all communication with MAAS is enforced to be over HTTPS (via `MAAS_API_URL` configuration).
*   Manually test key tool/resource interactions using MCP Inspector.

## Auditing Points for Stage 6:
*   Code review of error handling logic in `MaasApiClient`, all tool handlers, and resource handlers. Ensure consistent error reporting back to the MCP client.
*   Review the structured logging implementation:
    *   Choice of logging library (e.g., Pino) and its configuration.
    *   Log levels used (`info`, `error`, `warn`, `debug`).
    *   Content and structure of log messages (inclusion of request IDs, relevant parameters, error details).
    *   Placement of log statements (at entry/exit of key functions, on errors).
*   Assess test coverage for unit tests. Aim for high coverage of critical logic (authentication, API interaction, tool/resource processing).
*   Review integration test scenarios for completeness, covering happy paths and common error conditions.
*   Review security measures:
    *   Secure loading and usage of `MAAS_API_KEY` and `MAAS_API_URL` from `src/config.ts`.
    *   Input validation (Zod schemas) effectiveness.
    *   HTTPS enforcement for MAAS communication.
*   Review how `AbortSignal` is handled in error scenarios or during long operations.