# MAAS MCP Server

A Model Context Protocol (MCP) server designed to expose the Canonical MAAS (Metal as a Service) API to AI models and MCP-compliant clients.

## Overview

This server implements the Model Context Protocol (MCP) specification v2024-11-05 to provide a standardized interface for AI models to interact with MAAS functionalities. It serves as a bridge between MCP clients and the MAAS API, handling authentication, data transformation, and request formatting. The architecture follows a modular design with dedicated components for tools, resources, schemas, and API client interactions.

## Features

- MCP v2024-11-05 compliant server
- OAuth 1.0a authentication with MAAS API
- Tools for common MAAS operations (listing machines, creating machines, updating resources, deleting resources, etc.)
- Resources for accessing MAAS data (machine details, subnet details, etc.)
- Comprehensive error handling and logging
- Audit logging for resource access and modifications
- AbortSignal support for request cancellation
- Dedicated schema organization with Zod validation
- Modular architecture with clear separation of concerns
- File upload operations (scripts, images)
- Resource caching with configurable strategies (time-based, LRU)
- Cache invalidation mechanisms for data freshness
- Configurable audit logging for security and compliance
- Progress notification system for long-running operations
- Operations registry for tracking and managing operations
- Tools with progress reporting for time-intensive tasks

## Prerequisites

- Node.js 18 or later
- A MAAS instance with API access
- MAAS API key (obtainable from the MAAS UI)

## Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/maas-mcp-server.git
   cd maas-mcp-server
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Create a .env file based on .env.example
   ```
   cp .env.example .env
   ```

4. Edit the .env file with your MAAS API URL and API key

## Building

```
npm run build
```

## Running

```
npm start
```

For development with auto-reloading:
```
npm run dev
```

## Configuration

The server can be configured through environment variables. Create a `.env` file in the project root with the following variables:

### Core Configuration

- `MAAS_API_URL`: URL of your MAAS API (e.g., https://your-maas-instance/MAAS)
- `MAAS_API_KEY`: Your MAAS API key in the format consumer_key:token:secret
- `MCP_PORT`: Port for the MCP server to listen on (default: 3000)
- `NODE_ENV`: Environment mode (development, production, test)
- `LOG_LEVEL`: Logging level (error, warn, info, debug)

### Cache Configuration

- `CACHE_ENABLED`: Enable/disable caching (default: true)
- `CACHE_STRATEGY`: Caching strategy to use ('time-based' or 'lru', default: 'time-based')
- `CACHE_MAX_SIZE`: Maximum number of items in the cache (default: 1000)
- `CACHE_MAX_AGE`: Default TTL in seconds (default: 300)
- `CACHE_RESOURCE_SPECIFIC_TTL`: JSON string with resource-specific TTL overrides (e.g., `{"Machine": 60, "Machines": 30, "Tags": 600}`)

### Audit Logging Configuration

- `AUDIT_LOG_ENABLED`: Enable/disable audit logging (default: true)
- `AUDIT_LOG_INCLUDE_RESOURCE_STATE`: Include full resource state in logs (default: false)
- `AUDIT_LOG_MASK_SENSITIVE_FIELDS`: Mask sensitive fields in resource state (default: true)
- `AUDIT_LOG_SENSITIVE_FIELDS`: Comma-separated list of sensitive field names to mask
- `AUDIT_LOG_TO_FILE`: Log to a separate file (default: false)
- `AUDIT_LOG_FILE_PATH`: Path to the audit log file

## MCP Tools

The server provides a comprehensive set of MCP tools for interacting with MAAS. For detailed documentation of all available tools, including parameters, examples, and error handling, see the [Tools Documentation](docs/tools.md).

The tools are organized into the following categories:

### Read Operations
- **maas_list_machines**: List machines from the MAAS API with optional filtering
- **maas_list_subnets**: List subnets from the MAAS API with optional filtering

### Create Operations
- **maas_create_machine**: Create a new machine in MAAS
- **maas_create_device**: Create a new device in MAAS
- **maas_create_network**: Create a new network in MAAS
- **maas_create_tag**: Create a new tag in MAAS

### Update Operations
- **maas_update_machine**: Update an existing machine in MAAS
- **maas_update_device**: Update an existing device in MAAS
- **maas_update_network**: Update an existing network in MAAS

### Delete Operations
- **maas_delete_machine**: Delete a machine from MAAS
- **maas_delete_device**: Delete a device from MAAS
- **maas_delete_network**: Delete a network from MAAS

### File Upload Operations
- **maas_upload_script**: Upload a script to MAAS
- **maas_upload_image**: Upload an image to MAAS

### Long-Running Operations with Progress
- **maas_deploy_machine_with_progress**: Deploy an operating system to a machine with progress notifications
- **maas_commission_machine_with_progress**: Commission a machine with progress notifications

For practical examples of using these tools, see the [Usage Examples](docs/examples.md).

## MCP Resources

The server provides the following MCP resources:

- **machineDetails**: Get detailed information about a specific machine
  - URI pattern: `maas://machine/{system_id}/details`
  - Parameters: system_id (required)

- **subnetDetails**: Get detailed information about a specific subnet
  - URI pattern: `maas://subnet/{subnet_id}/details`
  - Parameters: subnet_id (required)

## Progress Notification System

The server includes a robust progress notification system for long-running operations:

### Progress Notification Features

- **Real-time Updates**: Provides real-time progress updates for long-running operations
- **Rate Limiting**: Intelligent rate limiting to prevent notification flooding
- **Configurable Thresholds**: Customizable notification frequency and thresholds
- **Important Notifications**: Special handling for critical notifications (start, completion, errors)
- **AbortSignal Integration**: Notifications respect operation cancellation via AbortSignal
- **Structured Format**: Standardized notification format with progress percentage and descriptive messages

### Progress-Enabled Tools

Tools that support progress notifications include:
- `maas_deploy_machine_with_progress`: Provides real-time updates during machine deployment
- `maas_commission_machine_with_progress`: Tracks progress during machine commissioning

### Using Progress Notifications

When using progress-enabled tools, clients can:
1. Provide a `progressToken` in the tool parameters
2. Listen for notifications with method `notifications/progress`
3. Receive structured updates with progress percentage and status messages
4. Track operation completion or handle errors through the notification channel

## Operations Registry

The server includes an operations registry system for tracking and managing long-running operations:

### Operations Registry Features

- **Operation Tracking**: Centralized tracking of all operations with status, progress, and metadata
- **Status Management**: Standardized lifecycle states (pending, running, completed, failed, aborted)
- **Automatic Cleanup**: Configurable cleanup of completed and stale operations
- **Query Capabilities**: Filtering and searching operations by type, status, and time ranges
- **AbortController Integration**: Built-in support for operation cancellation
- **Resource Management**: Proper cleanup of resources when operations are aborted or time out

### Operation Handler Utilities

The server provides utilities for standardized operation handling:

- **Context Creation**: Automatic creation of operation context with necessary utilities
- **Progress Integration**: Seamless integration with the progress notification system
- **Error Handling**: Standardized error handling and reporting
- **Abort Handling**: Proper handling of operation cancellation
- **Timeout Management**: Automatic timeout for operations that take too long
- **Registry Integration**: Automatic registration and updates in the operations registry

## Caching System

The server implements a flexible caching system for MCP resources to improve performance and reduce load on the MAAS API:

### Caching Features

- **Multiple Caching Strategies**:
  - Time-based caching: Simple expiration-based caching
  - LRU (Least Recently Used) caching: Prioritizes recently accessed resources

- **Configurable Cache Settings**:
  - Global cache configuration via environment variables
  - Resource-specific TTL (Time To Live) settings
  - Cache size limits to prevent memory issues

- **Cache Control Headers**:
  - Responses include standard Cache-Control headers
  - Age headers for cached responses
  - Support for cache directives (max-age, must-revalidate, etc.)

- **Intelligent Invalidation**:
  - Pattern-based cache invalidation
  - Resource-specific invalidation
  - Automatic invalidation on write operations

### Cache Configuration

Cache behavior can be configured through environment variables:

- `CACHE_ENABLED`: Enable/disable caching (default: true)
- `CACHE_STRATEGY`: Caching strategy to use ('time-based' or 'lru', default: 'time-based')
- `CACHE_MAX_SIZE`: Maximum number of items in the cache (default: 1000)
- `CACHE_MAX_AGE`: Default TTL in seconds (default: 300)
- `CACHE_RESOURCE_SPECIFIC_TTL`: JSON string with resource-specific TTL overrides

Each resource handler can also be configured with specific caching options, including:
- Custom TTL values
- Query parameter inclusion in cache keys
- Custom cache control directives

## Audit Logging

The server includes a comprehensive audit logging system for tracking resource access and modifications:

### Audit Logging Features

- **Detailed Event Tracking**:
  - Resource access events (who accessed what and when)
  - Resource modification events (what changed, before and after states)
  - Cache operations (hits, misses, invalidations)
  - Success and failure events

- **Configurable Logging Options**:
  - Enable/disable audit logging
  - Include/exclude resource state in logs
  - Mask sensitive fields in resource state
  - Log to separate file

- **Security and Compliance**:
  - Track user IDs and IP addresses
  - Unique request IDs for correlation
  - Timestamps for all events
  - Detailed error information for troubleshooting

- **Integration with Error Handling**:
  - Automatic logging of errors
  - Context preservation across the request lifecycle
  - Standardized error format

### Audit Log Configuration

Audit logging behavior can be configured through environment variables:

- `AUDIT_LOG_ENABLED`: Enable/disable audit logging (default: true)
- `AUDIT_LOG_INCLUDE_RESOURCE_STATE`: Include full resource state in logs (default: false)
- `AUDIT_LOG_MASK_SENSITIVE_FIELDS`: Mask sensitive fields in resource state (default: true)
- `AUDIT_LOG_SENSITIVE_FIELDS`: Comma-separated list of sensitive field names to mask
- `AUDIT_LOG_TO_FILE`: Log to a separate file (default: false)
- `AUDIT_LOG_FILE_PATH`: Path to the audit log file

For more details, see the [Audit Logging Documentation](docs/audit_logging.md).

## Testing

### Unit Tests

Run the unit tests:

```bash
npm test
```

### Integration Tests

Run the integration tests:

```bash
npm run test:integration
```

### MCP Inspector Testing

The project includes support for manual testing using the MCP Inspector tool. This allows interactive testing of the server against the MCP specification.

To set up the MCP Inspector testing environment:

```bash
# Run the setup script
./docs/mcp_inspector_testing/setup_inspector.sh

# Start the server
npm run dev

# In a separate terminal, launch the MCP Inspector
npm run inspector
```

For detailed information about MCP Inspector testing, see the [MCP Inspector Testing Documentation](docs/mcp_inspector_testing/README.md).

## AbortSignal Support and Error Handling

All MCP tools and resources support the AbortSignal interface for request cancellation. This allows clients to cancel in-progress requests if they are no longer needed, improving resource utilization and responsiveness.

Example of how AbortSignal is used in the server:

1. The MCP client can provide an AbortSignal when making a request
2. The signal is passed through the tool/resource handler to the MAAS API client
3. If the client aborts the request, the signal is triggered and the request is cancelled

Error handling is implemented at multiple levels:

1. Tool and resource handlers catch errors and return appropriate error responses
2. The MAAS API client handles network errors and MAAS API-specific errors
3. Errors are logged with relevant context for debugging

## Project Structure

The server follows a modular architecture with clear separation of concerns:

### Core Directories

- **src/**: Main source code directory
  - **maas/**: MAAS API client implementation
  - **mcp_tools/**: MCP tool implementations
    - **schemas/**: Zod schemas for tool parameters
  - **mcp_resources/**: MCP resource implementations
    - **handlers/**: Resource handler implementations
    - **schemas/**: Zod schemas for resource data
  - **utils/**: Utility functions and helpers
    - **abortSignalUtils.ts**: Utilities for AbortSignal handling
    - **auditLogger.ts**: Audit logging implementation
    - **errorHandler.ts**: Error handling utilities
    - **logger.ts**: Logging utilities
    - **operationsRegistry.ts**: Operations registry implementation
    - **operationHandlerUtils.ts**: Operation handler utilities
    - **progressNotification.ts**: Progress notification implementation
  - **__tests__/**: Test files
    - **unit/**: Unit tests
    - **integration/**: Integration tests
    - **e2e/**: End-to-end tests
    - **fixtures/**: Test fixtures

- **docs/**: Documentation files
  - **examples/**: Usage examples
  - **mcp_inspector_testing/**: MCP Inspector testing documentation

### Key Files

- **src/config.ts**: Configuration management
- **src/index.ts**: Main entry point
- **src/maas/MaasApiClient.ts**: MAAS API client implementation
- **src/mcp_tools/index.ts**: Tool registration and exports
- **src/mcp_resources/index.ts**: Resource registration and exports

## Schema Organization

The server uses a dedicated schema organization with Zod for validation:

- **Tool Schemas**: Located in `src/mcp_tools/schemas/`
  - Each tool has its own schema file (e.g., `listMachinesSchema.ts`)
  - Schemas define and validate input parameters
  - Schemas include descriptions for each parameter to aid in documentation

- **Resource Schemas**: Located in `src/mcp_resources/schemas/`
  - Each resource has its own schema file (e.g., `machineDetailsSchema.ts`)
  - Schemas define the structure of resource data
  - Used for validation of API responses

All schemas are re-exported from index files for convenient importing.

## Adding New Tools and Resources

To add a new tool:

1. Create a schema file in `src/mcp_tools/schemas/`
2. Create a tool implementation file in `src/mcp_tools/`
3. Export the schema from `src/mcp_tools/schemas/index.ts`
4. Export the tool registration function from `src/mcp_tools/index.ts`
5. Add the registration function call in `registerAllTools()` in `src/mcp_tools/index.ts`

To add a new resource:

1. Create a schema file in `src/mcp_resources/schemas/` (if needed)
2. Create a resource implementation file in `src/mcp_resources/`
3. Export the schema from `src/mcp_resources/schemas/index.ts` (if applicable)
4. Export the resource registration function from `src/mcp_resources/index.ts`
5. Add the registration function call in `registerAllResources()` in `src/mcp_resources/index.ts`

## Documentation

- [Tools Documentation](docs/tools.md): Comprehensive documentation for all available tools.
- [Usage Examples](docs/examples.md): Practical examples of using the MAAS MCP Server.
- [Manual Testing](docs/manual_testing.md): Guide for manually testing the server.
- [MCP Inspector Testing](docs/mcp_inspector_testing/README.md): Guide for testing with the MCP Inspector tool.
- [Caching System](docs/caching.md): Detailed documentation of the caching system.
- [Audit Logging](docs/audit_logging.md): Documentation of the audit logging system.
- [Progress Notifications](docs/progress_notifications.md): Documentation of the progress notification system.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. See the [CONTRIBUTING.md](CONTRIBUTING.md) file for guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.