package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/lspecian/maas-mcp-server/cmd/gen-tools/generator"
	"github.com/lspecian/maas-mcp-server/cmd/gen-tools/parser"
)

func main() {
	// Define command-line flags
	inputFile := flag.String("input", "static_endpoints.json", "Path to the input file containing API endpoints")
	outputFile := flag.String("output", "", "Path to the output file for parsed endpoints (optional)")
	toolsOutputFile := flag.String("tools-output", "", "Path to the output file for generated MCP tool definitions (optional)")
	filterTags := flag.String("tags", "", "Comma-separated list of tags to filter by (optional)")
	filterMethods := flag.String("methods", "", "Comma-separated list of HTTP methods to filter by (optional)")
	filterPathPrefix := flag.String("path-prefix", "", "Path prefix to filter by (optional)")
	verbose := flag.Bool("verbose", false, "Enable verbose logging")

	// Parse command-line flags
	flag.Parse()

	// Validate input file
	if _, err := os.Stat(*inputFile); os.IsNotExist(err) {
		log.Fatalf("Input file does not exist: %s", *inputFile)
	}

	// Create parser
	p := parser.NewStaticEndpointParser(*inputFile, true)

	// Parse endpoints
	endpoints, err := p.Parse()
	if err != nil {
		log.Fatalf("Failed to parse endpoints: %v", err)
	}

	// Apply filters
	if *filterTags != "" {
		tags := strings.Split(*filterTags, ",")
		filter := parser.NewTagEndpointFilter(tags)
		endpoints = filter.Filter(endpoints)
	}

	if *filterMethods != "" {
		methods := strings.Split(*filterMethods, ",")
		httpMethods := make([]parser.HTTPMethod, 0, len(methods))
		for _, method := range methods {
			httpMethods = append(httpMethods, parser.HTTPMethod(strings.ToUpper(method)))
		}
		filter := parser.NewMethodEndpointFilter(httpMethods)
		endpoints = filter.Filter(endpoints)
	}

	if *filterPathPrefix != "" {
		filter := parser.NewPathEndpointFilter(*filterPathPrefix)
		endpoints = filter.Filter(endpoints)
	}

	// Print results
	if *verbose {
		fmt.Printf("Parsed %d endpoints:\n", len(endpoints))
		for i, endpoint := range endpoints {
			fmt.Printf("%d. %s %s\n", i+1, endpoint.Method, endpoint.Path)
			fmt.Printf("   Tool Name: %s\n", endpoint.GenerateToolName())
			fmt.Printf("   Description: %s\n", endpoint.GenerateDescription())
			fmt.Printf("   Parameters: %d\n", len(endpoint.Parameters))
			fmt.Printf("   Responses: %d\n", len(endpoint.Responses))
			fmt.Println()
		}
	} else {
		fmt.Printf("Parsed %d endpoints\n", len(endpoints))
	}

	// Write to output file if specified
	if *outputFile != "" {
		// Create directory if it doesn't exist
		dir := filepath.Dir(*outputFile)
		if _, err := os.Stat(dir); os.IsNotExist(err) {
			if err := os.MkdirAll(dir, 0755); err != nil {
				log.Fatalf("Failed to create directory: %v", err)
			}
		}

		// Write to file
		if err := parser.SaveEndpointsToFile(endpoints, *outputFile); err != nil {
			log.Fatalf("Failed to write to output file: %v", err)
		}

		fmt.Printf("Wrote endpoints to %s\n", *outputFile)
	}

	// Generate MCP tool definitions if requested
	if *toolsOutputFile != "" {
		// Create generator
		gen := generator.NewToolDefinitionGenerator(endpoints)

		// Generate tool definitions
		tools, err := gen.Generate()
		if err != nil {
			log.Fatalf("Failed to generate tool definitions: %v", err)
		}

		// Create directory if it doesn't exist
		dir := filepath.Dir(*toolsOutputFile)
		if _, err := os.Stat(dir); os.IsNotExist(err) {
			if err := os.MkdirAll(dir, 0755); err != nil {
				log.Fatalf("Failed to create directory: %v", err)
			}
		}

		// Write tool definitions to file
		if err := generator.SaveToolDefinitions(tools, *toolsOutputFile); err != nil {
			log.Fatalf("Failed to write tool definitions to file: %v", err)
		}

		fmt.Printf("Generated %d MCP tool definitions and wrote to %s\n", len(tools), *toolsOutputFile)
	}
}
