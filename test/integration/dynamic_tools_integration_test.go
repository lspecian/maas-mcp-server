package integration

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"reflect"
	"testing"
	"time"

	"github.com/lspecian/maas-mcp-server/internal/config"
	"github.com/lspecian/maas-mcp-server/internal/logging"
	"github.com/lspecian/maas-mcp-server/internal/maas" // For NewClientWrapper, used by MachineService
	"github.com/lspecian/maas-mcp-server/internal/maasclient"
	"github.com/lspecian/maas-mcp-server/internal/models"
	"github.com/lspecian/maas-mcp-server/internal/service"
	"github.com/lspecian/maas-mcp-server/internal/service/tools" // For ToolService and Factory
	"github.com/sirupsen/logrus"
	logrustest "github.com/sirupsen/logrus/hooks/test"
)

// Helper function to set up services for integration tests
func setupTestServices(t *testing.T) (tools.ToolService, *logrus.Logger) {
	t.Helper()

	// 1. Logger
	logger, _ := logrustest.NewNullLogger()
	// For actual log output during testing, use:
	// logger := logrus.New()
	// logger.SetLevel(logrus.DebugLevel)
	// enhancedLogger := logging.NewFromLogrus(logger)
	enhancedLogger := logging.NewFromLogrus(logger) // Use this wrapper if services expect it

	// 2. AppConfig
	// Create a minimal AppConfig. Ensure MAAS API URL and Key are set, even if dummy,
	// as NewMaasClient might require them.
	cfg := &models.AppConfig{
		MAASInstances: []models.MAASInstance{
			{
				Name:   "default",
				APIURL: "http://dummy-maas:5240/MAAS",
				APIKey: "dummyconsumer:dummytoken:dummysecret", // Format: consumer_key:token_key:token_secret
			},
		},
		Logging: models.LoggingConfig{Level: "debug", Format: "text"},
		Server:  models.ServerConfig{Port: "8080", Timeout: 30},
	}
	// Save the dummy config to a temporary file for LoadConfig to pick up if needed,
	// or ensure NewMaasClient can be called directly with cfg.
	// For this test, NewMaasClient is called directly with `cfg`.

	// 3. MaasClient (the one with CallAPI)
	maasClientInstance, err := maasclient.NewMaasClient(cfg, logger)
	if err != nil {
		t.Fatalf("Failed to create MaasClient: %v", err)
	}

	// 4. Other Services (MachineService, NetworkService, etc.)
	// MachineService requires a maas.ClientWrapper.
	// For simplicity, we'll create a dummy one as these services are not the focus.
	// The actual CallAPI flow uses maasClientInstance.
	dummyMaasInstance := cfg.GetDefaultMAASInstance()
	maasClientWrapper, err := maas.NewClientWrapper(dummyMaasInstance.APIURL, dummyMaasInstance.APIKey, "2.0", logger)
	if err != nil {
		t.Fatalf("Failed to create MAAS client wrapper for MachineService: %v", err)
	}
	machineService := service.NewMachineService(maasClientWrapper, logger)
	// NetworkService, TagService, StorageService can be nil if NewMCPService handles nils,
	// which it currently does based on cmd/server/main.go.
	var networkService *service.NetworkService   // = nil
	var tagService *service.TagService         // = nil
	var storageService *service.StorageService // = nil

	// 5. MCPService
	mcpService := service.NewMCPService(
		machineService,
		networkService,
		tagService,
		storageService,
		enhancedLogger, // MCPService expects *logging.Logger which wraps logrus
		maasClientInstance,
	)

	// 6. ToolRegistry and other tool components
	validator := tools.NewToolValidator()
	requestMapper := tools.NewRequestMapper()
	responseFormatter := tools.NewResponseFormatter()
	errorTranslator := tools.NewErrorTranslator()
	registry := tools.NewToolRegistry(validator)

	// 7. ToolService
	toolService := tools.NewToolService(
		registry,
		validator,
		requestMapper,
		responseFormatter,
		errorTranslator,
		enhancedLogger, // ToolService also expects *logging.Logger
	)

	// 8. Tool Factory and Tool Registration
	// Adjust path to generated_maas_tools.json.
	// This test will be in test/integration/, so path is ../../cmd/gen-tools/generated_maas_tools.json
	// To make it robust, resolve path from a known base or use an env var.
	// For now, assume test is run from project root or path is correctly relative.
	// Let's try to make path relative from this file.
	absPath, _ := filepath.Abs("../../cmd/gen-tools/generated_maas_tools.json")
	if _, err := os.Stat(absPath); os.IsNotExist(err) {
		// Fallback if running from a different CWD, e.g. project root
		absPath, _ = filepath.Abs("cmd/gen-tools/generated_maas_tools.json")
	}
	
	// Temporarily override tools.OsReadFile for this test run
	originalOsReadFile := tools.OsReadFile
	tools.OsReadFile = func(filename string) ([]byte, error) {
		// Ensure we're reading the intended file for this override
		// The factory.go constructs the path, so we check if it's the one we expect to mock.
		// A simple check is if the filename (which might be absolute or relative based on factory logic)
		// ends with the target file name.
		if filepath.Base(filename) == "generated_maas_tools.json" {
			// Use the absPath we resolved earlier to read the actual file for the test content
			return os.ReadFile(absPath) 
		}
		// Fallback to the original os.ReadFile for any other file reads (e.g., if config files were read this way)
		return originalOsReadFile(filename)
	}
	defer func() { tools.OsReadFile = originalOsReadFile }() // Restore after test

	factory := tools.NewFactory(mcpService, enhancedLogger)
	factory.RegisterTools(toolService) // This will now use the overridden tools.OsReadFile

	return toolService, logger
}

func TestDynamicToolExecutionFlow(t *testing.T) {
	toolService, _ := setupTestServices(t) // logger from setup can be used if needed

	tests := []struct {
		name                string
		toolName            string
		params              json.RawMessage
		expectedHTTPMethod  string
		expectedAPIPath     string // Approximate, based on tool name parsing
		expectedParamsEcho  string
	}{
		{
			name:               "GET maas_get_api_2.0_version",
			toolName:           "maas_get_api_2.0_version", // Assumes this tool exists
			params:             json.RawMessage(`{}`),
			expectedHTTPMethod: "GET",
			expectedAPIPath:    "/api/2.0/version",
			expectedParamsEcho: `{}`,
		},
		{
			name:               "POST maas_post_api_2.0_account_op-create_authorisation_token",
			toolName:           "maas_post_api_2.0_account_op-create_authorisation_token", // Assumes this tool exists
			params:             json.RawMessage(`{"token_name": "test_token"}`), // Example param
			expectedHTTPMethod: "POST",
			expectedAPIPath:    "/api/2.0/account/op-create_authorisation_token",
			expectedParamsEcho: `{"token_name": "test_token"}`,
		},
		{
			name:               "GET maas_get_api_2.0_machines_system_id (with path param in name)",
			// This tool name structure is from the generator: maas_get_api_2.0_machines_system_id
			// The derived path will be /api/2.0/machines/system/id
			// The actual MAAS path is /api/2.0/machines/{system_id}
			// The placeholder CallAPI in MaasClient will receive the derived path.
			toolName:           "maas_get_api_2.0_machines_system_id", 
			params:             json.RawMessage(`{"system_id": "xyz123"}`),
			expectedHTTPMethod: "GET",
			expectedAPIPath:    "/api/2.0/machines/system/id", // This is what the generic handler derives
			expectedParamsEcho: `{"system_id": "xyz123"}`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Check if tool exists first (optional, but good for test reliability)
			registeredTool, exists := toolService.GetTool(tt.toolName)
			if !exists {
				// If the tool isn't found, it might be because generated_maas_tools.json is not found or is empty.
				// The setupTestServices should ideally fail earlier if the file isn't loaded.
				// We can check the number of loaded tools after setupTestServices.
				t.Fatalf("Tool '%s' not found in ToolService. Ensure generated_maas_tools.json is loaded correctly.", tt.toolName)
			}
			t.Logf("Found tool: %s, Description: %s", registeredTool.Name, registeredTool.Description)


			result, err := toolService.ExecuteTool(context.Background(), tt.toolName, tt.params)

			if err != nil {
				// The CallAPI placeholder currently returns (responseData, nil).
				// If it were to return an error, this assertion would change.
				t.Fatalf("ExecuteTool for '%s' failed: %v", tt.toolName, err)
			}
			if result == nil {
				t.Fatalf("ExecuteTool for '%s' returned nil result", tt.toolName)
			}

			resultMap, ok := result.(map[string]interface{})
			if !ok {
				t.Fatalf("ExecuteTool for '%s' result is not a map[string]interface{}, got %T", tt.toolName, result)
			}

			// Assertions based on MaasClient.CallAPI placeholder response
			expectedStatusMsg := "Request successfully routed to MaasClient.CallAPI (Placeholder)"
			if resultMap["status_message"] != expectedStatusMsg {
				t.Errorf("Tool '%s': Expected status_message '%s', got '%v'", tt.toolName, expectedStatusMsg, resultMap["status_message"])
			}

			expectedAction := fmt.Sprintf("%s %s", tt.expectedHTTPMethod, tt.expectedAPIPath)
			if resultMap["target_maas_action"] != expectedAction {
				t.Errorf("Tool '%s': Expected target_maas_action '%s', got '%v'", tt.toolName, expectedAction, resultMap["target_maas_action"])
			}
			
			// Compare raw JSON strings for parameters_received for simplicity
			var paramsEchoMap map[string]interface{}
			var expectedParamsMap map[string]interface{}

			if err := json.Unmarshal([]byte(resultMap["parameters_received"].(string)), &paramsEchoMap); err != nil {
				t.Fatalf("Could not unmarshal actual parameters_received: %v", err)
			}
			if err := json.Unmarshal([]byte(tt.expectedParamsEcho), &expectedParamsMap); err != nil {
				t.Fatalf("Could not unmarshal expectedParamsEcho: %v", err)
			}

			if !reflect.DeepEqual(paramsEchoMap, expectedParamsMap) {
				t.Errorf("Tool '%s': Expected parameters_received '%s', got '%v'", tt.toolName, tt.expectedParamsEcho, resultMap["parameters_received"])
			}
		})
	}
}

// Helper to allow tests to modify the osReadFile function used by the tools package.
// This should be in the tools package or the test needs to import "unsafe" to modify it,
// which is not ideal.
// For now, assuming tools package exposes a way to set this for tests if not in same package.
// If factory_test.go is in the same package 'tools', it can directly modify tools.osReadFile.
// Since this integration test is in a different package, this approach is more complex.
// The previous change in factory.go made `osReadFile` a public variable in the `tools` package.
// So, we can try to set `tools.osReadFile` directly from this test package.
// This requires `osReadFile` to be exported (e.g. `OsReadFile`).

// Let's assume `tools.SetOsReadFile(fn)` is a helper I'd add to tools package if needed.
// For now, the test will try to make the file available at the expected relative path.
// The setupTestServices has been updated to use a temporary override of a public `tools.OsReadFile` var.

```
