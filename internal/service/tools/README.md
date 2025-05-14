# MCP Tool Call Handling Service

This package provides a service layer for handling MCP tool calls with proper request processing and response formatting.

## Overview

The tools package is designed to handle MCP tool calls in a structured and extensible way. It provides:

1. A registry for tool registration and lookup
2. Validation for tool inputs
3. Request/response mapping and formatting
4. Error handling and translation
5. Context propagation

## Components

### ToolService

The `ToolService` is the main entry point for executing tool calls. It provides methods for:

- Executing tools by name with parameters
- Getting a list of available tools
- Registering new tools

### ToolRegistry

The `ToolRegistry` is responsible for registering and looking up tools. It provides methods for:

- Registering tools with their schemas and handlers
- Looking up tools by name
- Getting a list of all registered tools

### ToolValidator

The `ToolValidator` is responsible for validating tool inputs against their schemas. It uses the `validator` package to perform validation.

### RequestMapper

The `RequestMapper` is responsible for mapping raw JSON parameters to structured request objects.

### ResponseFormatter

The `ResponseFormatter` is responsible for formatting tool responses.

### ErrorTranslator

The `ErrorTranslator` is responsible for translating errors to a standard format.

## Usage

### Creating a Tool Service

```go
// Create dependencies
validator := tools.NewToolValidator()
requestMapper := tools.NewRequestMapper()
responseFormatter := tools.NewResponseFormatter()
errorTranslator := tools.NewErrorTranslator()
registry := tools.NewToolRegistry(validator)
logger := logging.NewLogger("tools")

// Create service
toolService := tools.NewToolService(
    registry,
    validator,
    requestMapper,
    responseFormatter,
    errorTranslator,
    logger,
)
```

### Registering a Tool

```go
// Define the tool schema
type MyToolRequest struct {
    Param1 string `json:"param1" validate:"required"`
    Param2 int    `json:"param2" validate:"min=1,max=100"`
}

// Define the tool handler
handler := func(ctx context.Context, params json.RawMessage) (interface{}, error) {
    var request MyToolRequest
    if err := json.Unmarshal(params, &request); err != nil {
        return nil, err
    }
    
    // Process the request
    result := fmt.Sprintf("Processed %s with value %d", request.Param1, request.Param2)
    
    return map[string]string{"result": result}, nil
}

// Register the tool
toolService.RegisterTool(
    "my_tool",
    "My custom tool",
    MyToolRequest{},
    handler,
)
```

### Executing a Tool

```go
// Create the parameters
params := json.RawMessage(`{"param1": "test", "param2": 42}`)

// Execute the tool
result, err := toolService.ExecuteTool(ctx, "my_tool", params)
if err != nil {
    // Handle error
    return err
}

// Use the result
fmt.Println(result)
```

### Using the Factory

The `Factory` provides a convenient way to create a tool service with all dependencies and register all tools:

```go
// Create the factory
factory := tools.NewFactory(mcpService, logger)

// Create the tool service
toolService := factory.CreateToolService()
```

### Integration with MCP Service

The `MCPToolServiceAdapter` adapts the `ToolService` to the MCP `Service` interface:

```go
// Create the tool service
toolService := tools.CreateToolServiceFromMCPService(mcpService, logger)

// Create the adapter
mcpService := tools.NewMCPToolServiceAdapter(toolService, logger)

// Use the MCP service
result, err := mcpService.ExecuteTool(ctx, "my_tool", params)
```

## Error Handling

The tools package provides comprehensive error handling:

- Validation errors are returned when tool inputs don't match their schemas
- Not found errors are returned when a tool is not registered
- Internal errors are returned when a tool handler fails

All errors are translated to a standard format using the `ErrorTranslator`.

## Context Propagation

The tools package propagates context through all operations, allowing for:

- Request tracing
- Cancellation
- Timeouts
- Custom context values