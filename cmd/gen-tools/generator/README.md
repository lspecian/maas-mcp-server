# MCP Tool Definition Generator

This package provides functionality to generate MCP (Model Context Protocol) tool definitions from parsed API endpoints.

## Overview

The generator takes parsed API endpoints and converts them into MCP tool definitions that can be used by the MCP server. The tool definitions include:

- Tool name (generated from the endpoint path and method)
- Tool description (from the endpoint description or summary)
- Input schema (generated from the endpoint parameters)

## Usage

### Basic Usage

```go
// Parse endpoints
parser := parser.NewStaticEndpointParser("endpoints.json", true)
endpoints, err := parser.Parse()
if err != nil {
    log.Fatalf("Failed to parse endpoints: %v", err)
}

// Create generator
gen := generator.NewToolDefinitionGenerator(endpoints)

// Generate tool definitions
tools, err := gen.Generate()
if err != nil {
    log.Fatalf("Failed to generate tool definitions: %v", err)
}

// Save tool definitions to file
if err := generator.SaveToolDefinitions(tools, "tool_definitions.json"); err != nil {
    log.Fatalf("Failed to write tool definitions to file: %v", err)
}
```

### Command Line Usage

The generator can be used from the command line using the `gen-tools` command:

```bash
gen-tools --input=endpoints.json --tools-output=tool_definitions.json
```

## Features

- Generates standardized tool names from endpoint paths and methods
- Creates clear, concise descriptions for each tool
- Builds input schemas with proper types, descriptions, and required fields
- Handles path, query, and body parameters
- Supports parameter types, defaults, and enums
- Ensures generated tool definitions follow MCP protocol standards

## Error Handling

The generator includes robust error handling for:

- Empty endpoint lists
- Invalid parameter types
- Missing required fields
- Conversion errors

## Testing

The package includes comprehensive tests for all functionality:

- Tool name generation
- Description generation
- Input schema generation
- Parameter type conversion
- Edge cases and error handling