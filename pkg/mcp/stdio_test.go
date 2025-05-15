package mcp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"strings"
	"testing"

	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
)

// setupTestServer creates a StdioServer with a real registry for testing
func setupTestServer(t *testing.T) (*StdioServer, *Registry, *bytes.Buffer) {
	registry := NewRegistry()
	outputBuffer := new(bytes.Buffer)
	logger := logrus.New()
	logger.SetOutput(io.Discard) // Suppress log output during tests

	server := &StdioServer{
		registry: registry,
		logger:   logger,
		reader:   nil, // Not needed for these tests
		writer:   outputBuffer,
	}

	return server, registry, outputBuffer
}

// registerTestTool registers a test tool with the given registry
func registerTestTool(t *testing.T, registry *Registry, name string, handler ToolFunc) {
	err := registry.RegisterTool(ToolInfo{
		Name:        name,
		Description: "Test tool",
		InputSchema: json.RawMessage(`{"type":"object","properties":{"name":{"type":"string"}}}`),
		Handler:     handler,
	})
	assert.NoError(t, err)
}

// TestProcessLine_ToolCall tests the processLine method with a valid tool call
func TestProcessLine_ToolCall(t *testing.T) {
	server, registry, outputBuffer := setupTestServer(t)

	// Register a test tool that returns a success response
	registerTestTool(t, registry, "test_tool", func(ctx context.Context, input json.RawMessage) (json.RawMessage, error) {
		return json.RawMessage(`{"result":"success"}`), nil
	})

	// Create a JSON-RPC request for the test tool
	request := JSONRPCRequest{
		JSONRPC: "2.0",
		Method:  "test_tool",
		Params:  json.RawMessage(`{"name":"test"}`),
		ID:      JSONRPCID("1"),
	}
	requestJSON, _ := json.Marshal(request)

	// Process the request
	err := server.processLine(context.Background(), string(requestJSON))

	// Verify that there was no error
	assert.NoError(t, err)

	// Verify that a response was written to the buffer
	response := outputBuffer.String()
	assert.NotEmpty(t, response)

	// Parse the response and verify it contains the expected result
	var responseObj map[string]interface{}
	err = json.Unmarshal([]byte(strings.TrimSpace(response)), &responseObj)
	assert.NoError(t, err)
	assert.Equal(t, "2.0", responseObj["jsonrpc"])
	assert.Equal(t, "1", responseObj["id"])
	assert.NotNil(t, responseObj["result"])
}

// TestProcessLine_ToolNotFound tests the processLine method with a non-existent tool
func TestProcessLine_ToolNotFound(t *testing.T) {
	server, _, outputBuffer := setupTestServer(t)

	// Create a JSON-RPC request for a non-existent tool
	request := JSONRPCRequest{
		JSONRPC: "2.0",
		Method:  "non_existent_tool",
		Params:  json.RawMessage(`{}`),
		ID:      JSONRPCID("1"),
	}
	requestJSON, _ := json.Marshal(request)

	// Process the request
	err := server.processLine(context.Background(), string(requestJSON))

	// Verify that there was an error
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "method not found")

	// Verify that an error response was written to the buffer
	response := outputBuffer.String()
	assert.NotEmpty(t, response)

	// Parse the response and verify it contains the expected error
	var responseObj map[string]interface{}
	err = json.Unmarshal([]byte(strings.TrimSpace(response)), &responseObj)
	assert.NoError(t, err)
	assert.Equal(t, "2.0", responseObj["jsonrpc"])
	assert.Equal(t, "1", responseObj["id"])
	assert.NotNil(t, responseObj["error"])
	errorObj := responseObj["error"].(map[string]interface{})
	assert.Equal(t, float64(-32601), errorObj["code"])
	assert.Equal(t, "Method not found", errorObj["message"])
}

// TestProcessLine_ToolExecutionError tests the processLine method with a tool that returns an error
func TestProcessLine_ToolExecutionError(t *testing.T) {
	server, registry, outputBuffer := setupTestServer(t)

	// Register a test tool that returns an error
	registerTestTool(t, registry, "error_tool", func(ctx context.Context, input json.RawMessage) (json.RawMessage, error) {
		return nil, fmt.Errorf("tool execution failed")
	})

	// Create a JSON-RPC request for the error tool
	request := JSONRPCRequest{
		JSONRPC: "2.0",
		Method:  "error_tool",
		Params:  json.RawMessage(`{}`),
		ID:      JSONRPCID("1"),
	}
	requestJSON, _ := json.Marshal(request)

	// Process the request
	err := server.processLine(context.Background(), string(requestJSON))

	// Verify that there was an error
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "tool execution failed")

	// Verify that an error response was written to the buffer
	response := outputBuffer.String()
	assert.NotEmpty(t, response)

	// Parse the response and verify it contains the expected error
	var responseObj map[string]interface{}
	err = json.Unmarshal([]byte(strings.TrimSpace(response)), &responseObj)
	assert.NoError(t, err)
	assert.Equal(t, "2.0", responseObj["jsonrpc"])
	assert.Equal(t, "1", responseObj["id"])
	assert.NotNil(t, responseObj["error"])
	errorObj := responseObj["error"].(map[string]interface{})
	assert.Equal(t, float64(-32000), errorObj["code"])
	assert.Equal(t, "Server error", errorObj["message"])
	assert.Equal(t, "tool execution failed", errorObj["data"])
}

// TestProcessLine_InvalidJSON tests the processLine method with invalid JSON
func TestProcessLine_InvalidJSON(t *testing.T) {
	server, _, outputBuffer := setupTestServer(t)

	// Process an invalid JSON request
	err := server.processLine(context.Background(), "invalid json")

	// Verify that there was an error
	assert.Error(t, err)

	// Verify that an error response was written to the buffer
	response := outputBuffer.String()
	assert.NotEmpty(t, response)

	// Parse the response and verify it contains the expected error
	var responseObj map[string]interface{}
	err = json.Unmarshal([]byte(strings.TrimSpace(response)), &responseObj)
	assert.NoError(t, err)
	assert.Equal(t, "2.0", responseObj["jsonrpc"])
	assert.Equal(t, "", responseObj["id"])
	assert.NotNil(t, responseObj["error"])
	errorObj := responseObj["error"].(map[string]interface{})
	assert.Equal(t, float64(-32700), errorObj["code"])
	assert.Equal(t, "Parse error", errorObj["message"])
}

// TestProcessLine_Discovery tests the processLine method with a discovery request
func TestProcessLine_Discovery(t *testing.T) {
	server, registry, outputBuffer := setupTestServer(t)

	// Register a test tool
	registerTestTool(t, registry, "test_tool", func(ctx context.Context, input json.RawMessage) (json.RawMessage, error) {
		return json.RawMessage(`{"result":"success"}`), nil
	})

	// Register a test resource
	err := registry.RegisterResource(ResourceInfo{
		Name:        "test_resource",
		Description: "Test resource",
		URIPattern:  "test://resource/{id}",
	})
	assert.NoError(t, err)

	// Create a JSON-RPC discovery request
	request := JSONRPCRequest{
		JSONRPC: "2.0",
		Method:  "discover",
		Params:  json.RawMessage(`{}`),
		ID:      JSONRPCID("1"),
	}
	requestJSON, _ := json.Marshal(request)

	// Process the request
	err = server.processLine(context.Background(), string(requestJSON))

	// Verify that there was no error
	assert.NoError(t, err)

	// Verify that a response was written to the buffer
	response := outputBuffer.String()
	assert.NotEmpty(t, response)

	// Parse the response and verify it contains the expected discovery information
	var responseObj map[string]interface{}
	err = json.Unmarshal([]byte(strings.TrimSpace(response)), &responseObj)
	assert.NoError(t, err)
	assert.Equal(t, "2.0", responseObj["jsonrpc"])
	assert.Equal(t, "1", responseObj["id"])
	assert.NotNil(t, responseObj["result"])
	result := responseObj["result"].(map[string]interface{})
	assert.NotNil(t, result["serverInfo"])
	assert.NotNil(t, result["capabilities"])
	capabilities := result["capabilities"].(map[string]interface{})
	assert.NotNil(t, capabilities["tools"])
	assert.NotNil(t, capabilities["resources"])
}

// TestProcessLine_SimplifiedRequest tests the processLine method with a simplified request format
func TestProcessLine_SimplifiedRequest(t *testing.T) {
	server, registry, outputBuffer := setupTestServer(t)

	// Register a test tool
	registerTestTool(t, registry, "test_tool", func(ctx context.Context, input json.RawMessage) (json.RawMessage, error) {
		return json.RawMessage(`{"result":"success"}`), nil
	})

	// Create a simplified JSON-RPC request (without jsonrpc field)
	simplifiedRequest := struct {
		Method string          `json:"method"`
		Params json.RawMessage `json:"params"`
		ID     string          `json:"id"`
	}{
		Method: "test_tool",
		Params: json.RawMessage(`{}`),
		ID:     "1",
	}
	requestJSON, _ := json.Marshal(simplifiedRequest)

	// Process the request
	err := server.processLine(context.Background(), string(requestJSON))

	// Verify that there was no error
	assert.NoError(t, err)

	// Verify that a response was written to the buffer
	response := outputBuffer.String()
	assert.NotEmpty(t, response)

	// Parse the response and verify it contains the expected result
	var responseObj map[string]interface{}
	err = json.Unmarshal([]byte(strings.TrimSpace(response)), &responseObj)
	assert.NoError(t, err)
	assert.Equal(t, "2.0", responseObj["jsonrpc"])
	assert.Equal(t, "1", responseObj["id"])
	assert.NotNil(t, responseObj["result"])
}

// TestParameterValidation tests that tool parameters are correctly passed to the tool handler
func TestParameterValidation(t *testing.T) {
	server, registry, outputBuffer := setupTestServer(t)

	// Register a test tool that validates its input parameters
	registerTestTool(t, registry, "validation_tool", func(ctx context.Context, input json.RawMessage) (json.RawMessage, error) {
		// Parse the input parameters
		var params struct {
			Name string `json:"name"`
		}
		if err := json.Unmarshal(input, &params); err != nil {
			return nil, fmt.Errorf("invalid parameters: %v", err)
		}

		// Validate the parameters
		if params.Name != "test" {
			return nil, fmt.Errorf("invalid name: %s", params.Name)
		}

		return json.RawMessage(`{"result":"validation passed"}`), nil
	})

	// Create a JSON-RPC request with valid parameters
	request := JSONRPCRequest{
		JSONRPC: "2.0",
		Method:  "validation_tool",
		Params:  json.RawMessage(`{"name":"test"}`),
		ID:      JSONRPCID("1"),
	}
	requestJSON, _ := json.Marshal(request)

	// Process the request
	err := server.processLine(context.Background(), string(requestJSON))

	// Verify that there was no error
	assert.NoError(t, err)

	// Verify that a success response was written to the buffer
	response := outputBuffer.String()
	assert.NotEmpty(t, response)

	// Parse the response and verify it contains the expected result
	var responseObj map[string]interface{}
	err = json.Unmarshal([]byte(strings.TrimSpace(response)), &responseObj)
	assert.NoError(t, err)
	assert.Equal(t, "2.0", responseObj["jsonrpc"])
	assert.Equal(t, "1", responseObj["id"])
	assert.NotNil(t, responseObj["result"])

	// Reset the buffer for the next test
	outputBuffer.Reset()

	// Create a JSON-RPC request with invalid parameters
	request = JSONRPCRequest{
		JSONRPC: "2.0",
		Method:  "validation_tool",
		Params:  json.RawMessage(`{"name":"invalid"}`),
		ID:      JSONRPCID("2"),
	}
	requestJSON, _ = json.Marshal(request)

	// Process the request
	err = server.processLine(context.Background(), string(requestJSON))

	// Verify that there was an error
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid name")

	// Verify that an error response was written to the buffer
	response = outputBuffer.String()
	assert.NotEmpty(t, response)

	// Parse the response and verify it contains the expected error
	err = json.Unmarshal([]byte(strings.TrimSpace(response)), &responseObj)
	assert.NoError(t, err)
	assert.Equal(t, "2.0", responseObj["jsonrpc"])
	assert.Equal(t, "2", responseObj["id"])
	assert.NotNil(t, responseObj["error"])
	errorObj := responseObj["error"].(map[string]interface{})
	assert.Equal(t, float64(-32000), errorObj["code"])
	assert.Equal(t, "Server error", errorObj["message"])
	assert.Contains(t, errorObj["data"], "invalid name")
}
