package generator

import (
	"testing"

	"github.com/lspecian/maas-mcp-server/cmd/gen-tools/parser"
)

func TestGenerateToolFromEndpoint(t *testing.T) {
	// Create a test endpoint
	endpoint := parser.Endpoint{
		Path:        "/machines/{system_id}",
		Method:      parser.GET,
		Summary:     "Get machine details",
		Description: "Get detailed information about a specific machine",
		Parameters: []parser.Parameter{
			{
				Name:        "system_id",
				Description: "The system ID of the machine",
				Type:        parser.StringType,
				Location:    parser.PathParam,
				Required:    true,
			},
			{
				Name:        "with_networks",
				Description: "Include network information",
				Type:        parser.BooleanType,
				Location:    parser.QueryParam,
				Required:    false,
				Default:     false,
			},
		},
	}

	// Create a generator with the test endpoint
	generator := NewToolDefinitionGenerator([]parser.Endpoint{endpoint})

	// Generate a tool from the endpoint
	tool, err := generator.generateToolFromEndpoint(endpoint)
	if err != nil {
		t.Fatalf("Failed to generate tool from endpoint: %v", err)
	}

	// Check the tool name
	expectedName := "maas_get_machines_system_id"
	if tool.Name != expectedName {
		t.Errorf("Expected tool name to be %s, got %s", expectedName, tool.Name)
	}

	// Check the tool description
	expectedDescription := "Get detailed information about a specific machine"
	if tool.Description != expectedDescription {
		t.Errorf("Expected tool description to be %s, got %s", expectedDescription, tool.Description)
	}

	// Check the input schema
	schema, ok := tool.InputSchema.(map[string]interface{})
	if !ok {
		t.Fatalf("Expected input schema to be a map, got %T", tool.InputSchema)
	}

	// Check schema type
	if schema["type"] != "object" {
		t.Errorf("Expected schema type to be object, got %v", schema["type"])
	}

	// Check properties
	properties, ok := schema["properties"].(map[string]interface{})
	if !ok {
		t.Fatalf("Expected properties to be a map, got %T", schema["properties"])
	}

	// Check system_id property
	systemIDProp, ok := properties["system_id"].(map[string]interface{})
	if !ok {
		t.Fatalf("Expected system_id property to be a map, got %T", properties["system_id"])
	}
	if systemIDProp["type"] != "string" {
		t.Errorf("Expected system_id type to be string, got %v", systemIDProp["type"])
	}

	// Check required fields
	required, ok := schema["required"].([]string)
	if !ok {
		t.Fatalf("Expected required to be a string slice, got %T", schema["required"])
	}
	if len(required) != 1 || required[0] != "system_id" {
		t.Errorf("Expected required fields to be [system_id], got %v", required)
	}
}

func TestGenerate(t *testing.T) {
	// Create test endpoints
	endpoints := []parser.Endpoint{
		{
			Path:        "/machines",
			Method:      parser.GET,
			Summary:     "List machines",
			Description: "List all machines",
			Parameters: []parser.Parameter{
				{
					Name:        "hostname",
					Description: "Filter by hostname",
					Type:        parser.StringType,
					Location:    parser.QueryParam,
					Required:    false,
				},
			},
		},
		{
			Path:        "/machines/{system_id}",
			Method:      parser.GET,
			Summary:     "Get machine details",
			Description: "Get detailed information about a specific machine",
			Parameters: []parser.Parameter{
				{
					Name:        "system_id",
					Description: "The system ID of the machine",
					Type:        parser.StringType,
					Location:    parser.PathParam,
					Required:    true,
				},
			},
		},
	}

	// Create a generator with the test endpoints
	generator := NewToolDefinitionGenerator(endpoints)

	// Generate tools
	tools, err := generator.Generate()
	if err != nil {
		t.Fatalf("Failed to generate tools: %v", err)
	}

	// Check the number of tools
	if len(tools) != len(endpoints) {
		t.Errorf("Expected %d tools, got %d", len(endpoints), len(tools))
	}

	// Check the first tool
	if tools[0].Name != "maas_get_machines" {
		t.Errorf("Expected first tool name to be maas_get_machines, got %s", tools[0].Name)
	}

	// Check the second tool
	if tools[1].Name != "maas_get_machines_system_id" {
		t.Errorf("Expected second tool name to be maas_get_machines_system_id, got %s", tools[1].Name)
	}
}

func TestConvertParameterType(t *testing.T) {
	generator := NewToolDefinitionGenerator(nil)

	testCases := []struct {
		paramType parser.ParameterType
		expected  string
	}{
		{parser.StringType, "string"},
		{parser.IntegerType, "integer"},
		{parser.NumberType, "number"},
		{parser.BooleanType, "boolean"},
		{parser.ArrayType, "array"},
		{parser.ObjectType, "object"},
		{parser.ParameterType("unknown"), "string"}, // Default to string
	}

	for _, tc := range testCases {
		result := generator.convertParameterType(tc.paramType)
		if result != tc.expected {
			t.Errorf("Expected %s for %s, got %s", tc.expected, tc.paramType, result)
		}
	}
}

func TestGenerateInputSchema(t *testing.T) {
	// Create a test endpoint with various parameter types
	endpoint := parser.Endpoint{
		Path:   "/test",
		Method: parser.POST,
		Parameters: []parser.Parameter{
			{
				Name:        "string_param",
				Description: "A string parameter",
				Type:        parser.StringType,
				Location:    parser.BodyParam,
				Required:    true,
			},
			{
				Name:        "int_param",
				Description: "An integer parameter",
				Type:        parser.IntegerType,
				Location:    parser.BodyParam,
				Required:    false,
				Default:     42,
			},
			{
				Name:        "bool_param",
				Description: "A boolean parameter",
				Type:        parser.BooleanType,
				Location:    parser.QueryParam,
				Required:    false,
				Default:     false,
			},
			{
				Name:        "enum_param",
				Description: "An enum parameter",
				Type:        parser.StringType,
				Location:    parser.QueryParam,
				Required:    true,
				Enum:        []interface{}{"value1", "value2", "value3"},
			},
			{
				Name:        "header_param",
				Description: "A header parameter that should be ignored",
				Type:        parser.StringType,
				Location:    parser.HeaderParam,
				Required:    false,
			},
		},
	}

	// Create a generator
	generator := NewToolDefinitionGenerator([]parser.Endpoint{endpoint})

	// Generate input schema
	schema, err := generator.generateInputSchema(endpoint)
	if err != nil {
		t.Fatalf("Failed to generate input schema: %v", err)
	}

	// Check schema type
	if schema["type"] != "object" {
		t.Errorf("Expected schema type to be object, got %v", schema["type"])
	}

	// Check properties
	properties, ok := schema["properties"].(map[string]interface{})
	if !ok {
		t.Fatalf("Expected properties to be a map, got %T", schema["properties"])
	}

	// Check that header parameter is not included
	if _, exists := properties["header_param"]; exists {
		t.Errorf("Header parameter should not be included in the schema")
	}

	// Check required fields
	required, ok := schema["required"].([]string)
	if !ok {
		t.Fatalf("Expected required to be a string slice, got %T", schema["required"])
	}

	// Check that string_param and enum_param are required
	if len(required) != 2 || !contains(required, "string_param") || !contains(required, "enum_param") {
		t.Errorf("Expected required fields to include string_param and enum_param, got %v", required)
	}

	// Check enum values
	enumParam, ok := properties["enum_param"].(map[string]interface{})
	if !ok {
		t.Fatalf("Expected enum_param to be a map, got %T", properties["enum_param"])
	}

	enumValues, ok := enumParam["enum"].([]interface{})
	if !ok {
		t.Fatalf("Expected enum values to be a slice, got %T", enumParam["enum"])
	}

	if len(enumValues) != 3 {
		t.Errorf("Expected 3 enum values, got %d", len(enumValues))
	}
}

// Helper function to check if a slice contains a string
func contains(slice []string, str string) bool {
	for _, s := range slice {
		if s == str {
			return true
		}
	}
	return false
}
