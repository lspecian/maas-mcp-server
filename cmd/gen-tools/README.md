# MAAS API Tool Generation

## Overview

This directory contains the necessary Go programs and utilities to parse the MAAS (Metal as a Service) API documentation and generate MCP (MAAS Control Plane) tool definitions. These generated tool definitions are then consumed by the MAAS MCP server to expose MAAS functionalities as dynamically registered tools.

## Input Source

The MAAS API specification is currently sourced from a raw text block embedded as a string variable named `maasApiDocumentationText` within the `cmd/gen-tools/main.go` file. This text was derived from the official MAAS API documentation webpage.

## Parsing Process

The primary component responsible for interpreting the MAAS API documentation text is:
-   **`parser/text_api_parser.go`**: This Go program parses the embedded `maasApiDocumentationText` string. It identifies API endpoints, their HTTP methods, paths, parameters (path, query, body), and descriptions.

The output of this parsing process is a JSON file:
-   **`parsed_maas_api_endpoints.json`**: Located in the `cmd/gen-tools/` directory. This file contains an array of structured MAAS endpoint definitions as understood by the parser. Each entry typically includes the method, path, description, operation ID, and extracted parameters.

## Generation Process

The parsed endpoint definitions are then used to generate the final MCP tool definitions:
-   **`generator/generator.go`**: This Go program takes `parsed_maas_api_endpoints.json` as input and converts each parsed MAAS endpoint into an MCP `Tool` definition compatible with the server's tool framework.

The output of this generation process is a crucial JSON file:
-   **`generated_maas_tools.json`**: Also located in the `cmd/gen-tools/` directory. This file contains a JSON object with a single key `"tools"`, which holds an array of `models.MCPTool` objects. This is the file directly consumed by the MAAS MCP server at startup to dynamically register all available MAAS tools.

## How to Update/Regenerate Tools

If the MAAS API specification changes, or if improvements are made to the parser/generator, the tool definitions should be regenerated:

1.  **Step 1: Update API Documentation (If necessary)**
    *   If the MAAS API itself has changed, the primary source of truth, the `maasApiDocumentationText` string constant in `cmd/gen-tools/main.go`, must be updated with the new API documentation text.

2.  **Step 2: Run the Generator**
    *   Navigate to the project root directory.
    *   Execute the command: `go run ./cmd/gen-tools/main.go`
    *   This command will first parse the embedded API documentation (or updated documentation if changed in Step 1) and then generate the new tool definitions.

3.  **Step 3: Review Outputs**
    *   The script will update/overwrite two files in the `cmd/gen-tools/` directory:
        *   `parsed_maas_api_endpoints.json`
        *   `generated_maas_tools.json` (This is the critical file for the server)
    *   It's advisable to review the diff of `generated_maas_tools.json` to ensure the changes are as expected.

4.  **Step 4: Restart Server**
    *   The MAAS MCP server will need to be rebuilt (if changes affect compiled code, though typically `generated_maas_tools.json` is loaded at runtime) and restarted to pick up the changes from the updated `generated_maas_tools.json`.

## Important Note

The current `text_api_parser.go` makes a best-effort attempt to parse the MAAS API documentation text. There are known limitations:
*   Parameter type inference is based on simple keyword matching in descriptions and might not always be accurate for complex types.
*   Complex nested parameters or highly nuanced parameter structures in the API documentation might not be fully represented in the generated schemas.
*   The parser primarily focuses on endpoint definitions, path parameters, and simple query/body parameters. Support for multi-line descriptions and complex request/response bodies is basic.
*   The "Power types" and "Pod types" sections are parsed into generic action endpoints; direct association with specific machine operations is not yet implemented.

Continuous improvements to the parser are planned to address these limitations. If specific tools are missing or have incorrect schemas, updating the parser logic and regenerating the tools would be the way forward.
