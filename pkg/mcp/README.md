# MAAS MCP Server - Clean Architecture Implementation

This package provides a clean architecture implementation of the MAAS MCP server. It follows the principles of clean architecture to ensure separation of concerns, testability, and maintainability.

## Architecture Overview

The architecture is organized into the following layers:

1. **Repository Layer**: Responsible for data access and external API integration
2. **Service Layer**: Contains business logic and orchestration
3. **Transport Layer**: Handles HTTP requests and responses
4. **MCP Layer**: Implements the Model Context Protocol

### Dependency Flow

Dependencies flow inward, with the inner layers having no knowledge of the outer layers:

```
[MCP Layer] → [Transport Layer] → [Service Layer] → [Repository Layer]
```

## Components

### Repository Layer

- `internal/repository/repository.go`: Base repository interfaces
- `internal/repository/machine/repository.go`: Machine repository interface
- `internal/repository/machine/maas_repository.go`: MAAS implementation of the machine repository
- `internal/repository/machine/mock_repository.go`: Mock implementation for testing

### Service Layer

- `internal/service/machine/service.go`: Machine service implementation
- `internal/service/machine/service_test.go`: Tests for the machine service

### Transport Layer

- `internal/transport/machine/service.go`: Service interface for the transport layer
- `internal/transport/machine/handler.go`: HTTP handler for machine operations
- `internal/transport/machine/handler_test.go`: Tests for the machine handler

### MCP Layer

- `pkg/mcp/registry.go`: Registry for MCP tools and resources
- `pkg/mcp/server.go`: MCP server implementation
- `pkg/mcp/tools/machine_tools.go`: MCP tools for machine management
- `pkg/mcp/cmd/main.go`: Example of how to use the MCP server

## MCP Tools

The following MCP tools are implemented:

- `maas_list_machines`: List machines with optional filtering
- `maas_get_machine_details`: Get details for a specific machine
- `maas_power_on_machine`: Power on a machine
- `maas_power_off_machine`: Power off a machine

## MCP Resources

The following MCP resources are implemented:

- `maas_machine`: MAAS machine resource with URI pattern `maas://machine/{id}`

## Usage

To use the MCP server:

1. Create a repository instance
2. Create a service instance using the repository
3. Create MCP tools using the service
4. Register the tools with the MCP registry
5. Create an MCP server using the registry
6. Start the server

Example:

```go
// Initialize repository
machineRepo := machine.NewMaasRepository(maasClientWrapper, logger)

// Initialize service
machineService := machineservice.NewService(machineRepo, logger)

// Initialize MCP tools
machineTools := tools.NewMachineTools(machineService)

// Create MCP registry
registry := mcp.NewRegistry()

// Register MCP tools
registry.RegisterTool(mcp.ToolInfo{
    Name:        "maas_list_machines",
    Description: "List machines with optional filtering",
    InputSchema: listMachinesSchema,
    Handler:     machineTools.ListMachines,
})

// Create MCP server
server := mcp.NewServer(registry, logger)

// Start server
server.Run(":8081")
```

## Testing

Each layer has its own tests:

- Repository layer: Mock implementations for testing
- Service layer: Unit tests using mock repositories
- Transport layer: Unit tests using mock services
- MCP layer: Integration tests using the full stack

## Error Handling

Errors are handled at each layer:

- Repository layer: Returns domain-specific errors
- Service layer: Maps repository errors to service errors with HTTP status codes
- Transport layer: Maps service errors to HTTP responses
- MCP layer: Maps service errors to JSON-RPC errors

## Extensibility

The architecture is designed to be extensible:

- New repositories can be added by implementing the repository interfaces
- New services can be added by implementing the service interfaces
- New handlers can be added by implementing the handler interfaces
- New MCP tools can be added by implementing the tool interfaces

## License

MIT