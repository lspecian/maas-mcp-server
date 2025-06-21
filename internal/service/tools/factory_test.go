package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"

	"github.com/lspecian/maas-mcp-server/internal/logging"
	"github.com/lspecian/maas-mcp-server/internal/models"
	"github.com/sirupsen/logrus"
	"github.com/sirupsen/logrus/hooks/test"
)

// mockToolService is a mock implementation of the ToolService interface.
type mockToolService struct {
	RegisterToolFunc func(name string, description string, inputSchema interface{}, handler ToolHandler) error
	RegisteredTools  []struct {
		Name        string
		Description string
		InputSchema interface{}
		Handler     ToolHandler
	}
}

func (m *mockToolService) RegisterTool(name string, description string, inputSchema interface{}, handler ToolHandler) error {
	if m.RegisterToolFunc != nil {
		return m.RegisterToolFunc(name, description, inputSchema, handler)
	}
	m.RegisteredTools = append(m.RegisteredTools, struct {
		Name        string
		Description string
		InputSchema interface{}
		Handler     ToolHandler
	}{name, description, inputSchema, handler})
	return nil
}

func (m *mockToolService) GetTool(name string) (RegisteredTool, bool) {
	// Not needed for these tests
	return RegisteredTool{}, false
}

func (m *mockToolService) ExecuteTool(ctx context.Context, name string, params json.RawMessage) (interface{}, error) {
	// Not needed for these tests
	return nil, nil
}

func (m *mockToolService) ListTools() []RegisteredTool {
	// Not needed for these tests
	return nil
}

// Test helper to override os.ReadFile
// var readFileFunc func(filename string) ([]byte, error) = os.ReadFile // Renamed to match production code var

// Original os.ReadFile to restore after tests
var originalOsReadFile = osReadFile // Store the original from the 'tools' package

func TestFactory_RegisterTools_Success(t *testing.T) {
	// Sample JSON content
	sampleToolsJSON := `
{
  "tools": [
    {
      "name": "maas_test_tool_one",
      "description": "This is test tool one.",
      "input_schema": {
        "type": "object",
        "properties": {
          "param1": { "type": "string", "description": "Parameter one" }
        },
        "required": ["param1"]
      }
    },
    {
      "name": "maas_test_tool_two",
      "description": "This is test tool two.",
      "input_schema": {
        "type": "object",
        "properties": {
          "param_bool": { "type": "boolean" }
        }
      }
    }
  ]
}
`
	// Mock os.ReadFile from the tools package
	original := osReadFile
	osReadFile = func(filename string) ([]byte, error) {
		if strings.HasSuffix(filename, "generated_maas_tools.json") {
			return []byte(sampleToolsJSON), nil
		}
		return nil, fmt.Errorf("unexpected file read attempt: %s", filename)
	}
	defer func() { osReadFile = original }() // Restore original

	// Setup
	logger, _ := test.NewNullLogger() // Use a test logger
	// MCPService can be nil for this specific test if createGenericToolHandler doesn't use it,
	// but createGenericToolHandler *does* use mcpService.CallAPI. So, we need a mock mcpService.
	// However, the factory's mcpService field is only used by createGenericToolHandler,
	// and createGenericToolHandler is called by registerTools.
	// For this test, we are focused on whether registerTools calls toolService.RegisterTool correctly.
	// The handler created by createGenericToolHandler will be tested separately or implicitly.
	// Let's provide a nil mcpService for now to simplify, and if it panics, we'll mock it.
	// Update: createGenericToolHandler *does* use f.mcpService.CallAPI. So, we need a mock.
	// For simplicity of this test, we'll assume the handler itself isn't executed, just registered.
	factory := NewFactory(nil, logging.NewFromLogrus(logger)) // mcpService is nil
	mockTS := &mockToolService{}

	// Execute
	factory.registerTools(mockTS)

	// Assertions
	if len(mockTS.RegisteredTools) != 2 {
		t.Fatalf("Expected 2 tools to be registered, got %d", len(mockTS.RegisteredTools))
	}

	// Tool 1
	tool1 := mockTS.RegisteredTools[0]
	if tool1.Name != "maas_test_tool_one" {
		t.Errorf("Tool 1: Expected name 'maas_test_tool_one', got '%s'", tool1.Name)
	}
	if tool1.Description != "This is test tool one." {
		t.Errorf("Tool 1: Expected description 'This is test tool one.', got '%s'", tool1.Description)
	}
	if tool1.Handler == nil {
		t.Errorf("Tool 1: Expected handler to be non-nil")
	}
	// Compare input schema (basic check, could be more thorough with deep equality)
	expectedSchema1 := map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"param1": map[string]interface{}{"type": "string", "description": "Parameter one"},
		},
		"required": []interface{}{"param1"}, // JSON unmarshal of []string might become []interface{}
	}
	// Need to marshal and unmarshal to map[string]interface{} for proper comparison if schema is complex
	// For this test, let's convert the expected schema to the type of the actual schema for comparison
	var actualSchema1 map[string]interface{}
	b, _ := json.Marshal(tool1.InputSchema)
	json.Unmarshal(b, &actualSchema1)

	// To compare schema, it's better to compare the marshalled JSON string or use reflect.DeepEqual
	// after ensuring types are consistent (e.g. []string vs []interface{} for "required")
	// For "required", JSON unmarshalling into map[string]interface{} often results in []interface{}.
	// Let's adjust expected for this.
	if req, ok := expectedSchema1["required"].([]interface{}); ok {
		if actualReq, ok2 := actualSchema1["required"].([]interface{}); ok2 {
			if !reflect.DeepEqual(req, actualReq) {
				t.Errorf("Tool 1: Schema 'required' mismatch. Expected %v, Got %v", req, actualReq)
			}
		} else {
			t.Errorf("Tool 1: Actual schema 'required' is not []interface{}")
		}
	}
	// Check properties specifically
	if props, ok := expectedSchema1["properties"].(map[string]interface{}); ok {
		if actualProps, ok2 := actualSchema1["properties"].(map[string]interface{}); ok2 {
			if !reflect.DeepEqual(props, actualProps) {
				t.Errorf("Tool 1: Schema 'properties' mismatch. Expected %v, Got %v", props, actualProps)
			}
		} else {
			t.Errorf("Tool 1: Actual schema 'properties' is not map[string]interface{}")
		}
	}


	// Tool 2
	tool2 := mockTS.RegisteredTools[1]
	if tool2.Name != "maas_test_tool_two" {
		t.Errorf("Tool 2: Expected name 'maas_test_tool_two', got '%s'", tool2.Name)
	}
	if tool2.Handler == nil {
		t.Errorf("Tool 2: Expected handler to be non-nil")
	}
}


func TestFactory_RegisterTools_FileNotFound(t *testing.T) {
	// Mock os.ReadFile to return a file not found error
	original := osReadFile
	osReadFile = func(filename string) ([]byte, error) {
		return nil, os.ErrNotExist // Simulate file not found
	}
	defer func() { osReadFile = original }()

	logger, _ := test.NewNullLogger() // hook is not directly used here, but Fatalf needs a logger
	factory := NewFactory(nil, logging.NewFromLogrus(logger))
	mockTS := &mockToolService{}

	// The current implementation calls log.Fatalf, which exits.
	// We can't directly test the Fatalf call's exit, but we can check if it logs the error.
	// This requires a more complex setup or refactoring registerTools to return an error.
	// For now, we'll just call it and expect it to log heavily and attempt to exit (which test framework might catch).
	// A better approach would be to pass a "fatalf" function to the factory for testing.

	// We expect a log message containing "Failed to read tool definitions file"
	// and then the test will likely be terminated by Fatalf.
	// This test is more about observing behavior than strict pass/fail on return values.
	
	// Wrap the call in a recover block if we want to check the log, though Fatalf is hard to recover from.
	// For this test, we'll just check that the log hook captured the expected fatal message.
	// Note: logrus's Fatalf calls os.Exit(1), so the test function itself won't continue past this.
	// This kind of test is usually for ensuring the program *would* exit.
	
	// To test Fatalf properly, you usually need to run the function in a separate process
	// or use a mock for the logger's exit function.
	// Given the constraints, we'll check the log message via the hook.
	
	// The call to registerTools will call logrus.Fatalf.
	// The test will end here. The hook can be checked if the test framework allows post-mortem.
	// For now, this test demonstrates the intent.
	// A simple way to "test" Fatalf is to expect the test to fail/panic if called.
	// However, a more controlled test would check the log hook.

	// Setup to capture log output
	logOutput := new(strings.Builder)
	logger.SetOutput(logOutput)
	logger.ExitFunc = func(int) { panic("logrus.Fatalf called") } // Make Fatalf panic instead of exit

	defer func() {
		logger.ExitFunc = nil // Restore default exit behavior
		if r := recover(); r != nil {
			if !strings.Contains(logOutput.String(), "Failed to read tool definitions file") {
				t.Errorf("Expected log message about failing to read file, got: %s", logOutput.String())
			}
			if !strings.Contains(logOutput.String(), filepath.Clean("cmd/gen-tools/generated_maas_tools.json")) { // Check path in log
				t.Errorf("Expected log message to contain correct file path, got: %s", logOutput.String())
			}
		} else {
			t.Errorf("Expected Fatalf to be called, but it was not (or did not panic as configured)")
		}
	}()

	factory.registerTools(mockTS) // This should trigger Fatalf, which we've made panic
}


func TestFactory_RegisterTools_InvalidJSON(t *testing.T) {
	invalidJSON := `{"tools": [これは無効なJSONです]}`
	original := osReadFile
	osReadFile = func(filename string) ([]byte, error) {
		return []byte(invalidJSON), nil
	}
	defer func() { osReadFile = original }()

	logger, _ := test.NewNullLogger()
	logOutput := new(strings.Builder)
	logger.SetOutput(logOutput)
	logger.ExitFunc = func(int) { panic("logrus.Fatalf called for invalid JSON") }

	factory := NewFactory(nil, logging.NewFromLogrus(logger))
	mockTS := &mockToolService{}

	defer func() {
		logger.ExitFunc = nil
		if r := recover(); r != nil {
			if !strings.Contains(logOutput.String(), "Failed to unmarshal tool definitions") {
				t.Errorf("Expected log message about failing to unmarshal, got: %s", logOutput.String())
			}
		} else {
			t.Errorf("Expected Fatalf due to invalid JSON, but it was not called")
		}
	}()

	factory.registerTools(mockTS)
}

func TestFactory_RegisterTools_RegisterToolError(t *testing.T) {
	sampleToolsJSON := `{"tools": [{"name": "error_tool", "description": "desc", "input_schema": {}}]}`
	original := osReadFile
	osReadFile = func(filename string) ([]byte, error) {
		return []byte(sampleToolsJSON), nil
	}
	defer func() { osReadFile = original }()

	logger, hook := test.NewNullLogger() // Capture logs with hook
	factory := NewFactory(nil, logging.NewFromLogrus(logger))
	mockTS := &mockToolService{
		RegisterToolFunc: func(name string, description string, inputSchema interface{}, handler ToolHandler) error {
			if name == "error_tool" {
				return fmt.Errorf("mock registration error")
			}
			return nil
		},
	}

	factory.registerTools(mockTS)

	// Check logs for the error message
	foundErrorLog := false
	for _, entry := range hook.Entries {
		if entry.Level == logrus.ErrorLevel && strings.Contains(entry.Message, "Failed to register tool 'error_tool'") {
			foundErrorLog = true
			break
		}
	}
	if !foundErrorLog {
		t.Errorf("Expected an error log for 'Failed to register tool error_tool', but none found. Logs: %v", hook.Entries)
	}
}

// Note: The original os.ReadFile is not globally replaced here.
// The readFileFunc variable is used by the factory instance if we refactor factory to use it.
// For a simple test without refactoring factory, we need to ensure that the factory's os.ReadFile call
// can be intercepted. This often means making os.ReadFile a variable within the package being tested,
// or passing it as a dependency.
// The current approach of a global `readFileFunc` variable in the _test.go file works if the
// production code `factory.go` is modified to call `readFileFunc` instead of `os.ReadFile` directly.
// This change has not been made to factory.go yet.
//
// For the current structure of factory.go, testing file errors (not found, invalid JSON)
// relies on actual file operations or more complex mocking (e.g. syscall layer).
// The tests above for FileNotFoud and InvalidJSON are written with the *assumption* that
// readFileFunc can effectively mock os.ReadFile for the factory.
// The current test setup for readFileFunc will NOT work unless factory.go is changed to use this test variable.
// I will proceed with this setup, and if tests fail because os.ReadFile is not mocked,
// I will need to adjust factory.go in a subsequent step (though ideally, production code
// isn't changed just for tests, but rather designed for testability).
//
// The subtask implies testing the behavior, so I will assume I can make readFileFunc effective.
// I will modify factory.go to use a package-level variable for os.ReadFile.

```
