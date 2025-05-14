package mcp

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lspecian/maas-mcp-server/internal/logging"
	"github.com/lspecian/maas-mcp-server/internal/models"
	"github.com/lspecian/maas-mcp-server/internal/transport/mcp/events"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockService is a mock implementation of the Service interface
type MockService struct {
	mock.Mock
}

// ExecuteTool mocks the ExecuteTool method
func (m *MockService) ExecuteTool(ctx context.Context, toolName string, params json.RawMessage) (interface{}, error) {
	args := m.Called(ctx, toolName, params)
	return args.Get(0), args.Error(1)
}

// GetResource mocks the GetResource method
func (m *MockService) GetResource(ctx context.Context, uri string) (interface{}, error) {
	args := m.Called(ctx, uri)
	return args.Get(0), args.Error(1)
}

// GetServerInfo mocks the GetServerInfo method
func (m *MockService) GetServerInfo(ctx context.Context) (*models.MCPDiscoveryResponse, error) {
	args := m.Called(ctx)
	return args.Get(0).(*models.MCPDiscoveryResponse), args.Error(1)
}

// NegotiateVersion mocks the NegotiateVersion method
func (m *MockService) NegotiateVersion(ctx context.Context, clientVersion string) (string, error) {
	args := m.Called(ctx, clientVersion)
	return args.String(0), args.Error(1)
}

func TestHandleDiscovery(t *testing.T) {
	// Set up Gin in test mode
	gin.SetMode(gin.TestMode)

	// Create a mock service
	mockService := new(MockService)

	// Create a discovery response
	discoveryResponse := &models.MCPDiscoveryResponse{
		Jsonrpc: "2.0",
		Result: struct {
			ServerInfo struct {
				Name    string `json:"name"`
				Version string `json:"version"`
			} `json:"serverInfo"`
			Capabilities struct {
				Tools     []models.MCPTool     `json:"tools,omitempty"`
				Resources []models.MCPResource `json:"resources,omitempty"`
			} `json:"capabilities"`
		}{
			ServerInfo: struct {
				Name    string `json:"name"`
				Version string `json:"version"`
			}{
				Name:    "test-server",
				Version: "1.0.0",
			},
			Capabilities: struct {
				Tools     []models.MCPTool     `json:"tools,omitempty"`
				Resources []models.MCPResource `json:"resources,omitempty"`
			}{
				Tools: []models.MCPTool{
					{
						Name:        "test_tool",
						Description: "A test tool",
						InputSchema: map[string]interface{}{},
					},
				},
				Resources: []models.MCPResource{
					{
						Name:        "test_resource",
						Description: "A test resource",
						URIPattern:  "test://resource/{id}",
					},
				},
			},
		},
	}

	// Set up expectations
	mockService.On("GetServerInfo", mock.Anything).Return(discoveryResponse, nil)

	// Create a logger
	logger, _ := logging.NewEnhancedLogger(logging.LoggerConfig{
		Level:  "info",
		Format: logging.LogFormatJSON,
	})

	// Create a handler
	handler := NewHandler(mockService, logger)

	// Create a router
	router := gin.New()
	router.POST("/mcp", handler.HandleToolCall)

	// Create a request
	requestBody := map[string]interface{}{
		"jsonrpc": "2.0",
		"method":  "discover",
		"params":  map[string]interface{}{},
		"id":      "test-id",
	}
	requestJSON, _ := json.Marshal(requestBody)
	req, _ := http.NewRequest("POST", "/mcp", bytes.NewBuffer(requestJSON))
	req.Header.Set("Content-Type", "application/json")

	// Create a response recorder
	w := httptest.NewRecorder()

	// Serve the request
	router.ServeHTTP(w, req)

	// Check the response
	assert.Equal(t, http.StatusOK, w.Code)

	// Parse the response
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)

	// Check the response fields
	assert.Equal(t, "2.0", response["jsonrpc"])
	assert.Equal(t, "test-id", response["id"])
	assert.NotNil(t, response["result"])

	// Verify expectations
	mockService.AssertExpectations(t)
}

func TestHandleToolCall(t *testing.T) {
	// Set up Gin in test mode
	gin.SetMode(gin.TestMode)

	// Create a mock service
	mockService := new(MockService)

	// Set up expectations
	mockService.On("ExecuteTool", mock.Anything, "test_tool", mock.Anything).Return(map[string]interface{}{
		"result": "success",
	}, nil)

	// Create a logger
	logger, _ := logging.NewEnhancedLogger(logging.LoggerConfig{
		Level:  "info",
		Format: logging.LogFormatJSON,
	})

	// Create a handler
	handler := NewHandler(mockService, logger)

	// Create a router
	router := gin.New()
	router.POST("/mcp", handler.HandleToolCall)

	// Create a request
	requestBody := map[string]interface{}{
		"jsonrpc": "2.0",
		"method":  "test_tool",
		"params":  map[string]interface{}{"param1": "value1"},
		"id":      "test-id",
	}
	requestJSON, _ := json.Marshal(requestBody)
	req, _ := http.NewRequest("POST", "/mcp", bytes.NewBuffer(requestJSON))
	req.Header.Set("Content-Type", "application/json")

	// Create a response recorder
	w := httptest.NewRecorder()

	// Serve the request
	router.ServeHTTP(w, req)

	// Check the response
	assert.Equal(t, http.StatusOK, w.Code)

	// Parse the response
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)

	// Check the response fields
	assert.Equal(t, "2.0", response["jsonrpc"])
	assert.Equal(t, "test-id", response["id"])
	assert.NotNil(t, response["result"])

	// Verify expectations
	mockService.AssertExpectations(t)
}

func TestHandleResourceAccess(t *testing.T) {
	// Set up Gin in test mode
	gin.SetMode(gin.TestMode)

	// Create a mock service
	mockService := new(MockService)

	// Set up expectations
	mockService.On("GetResource", mock.Anything, "test://resource/123").Return(map[string]interface{}{
		"id":   123,
		"name": "Test Resource",
	}, nil)

	// Create a logger
	logger, _ := logging.NewEnhancedLogger(logging.LoggerConfig{
		Level:  "info",
		Format: logging.LogFormatJSON,
	})

	// Create a handler
	handler := NewHandler(mockService, logger)

	// Create a router
	router := gin.New()
	router.POST("/mcp/resource", handler.HandleResourceAccess)

	// Create a request
	requestBody := map[string]interface{}{
		"uri":    "test://resource/123",
		"method": "GET",
	}
	requestJSON, _ := json.Marshal(requestBody)
	req, _ := http.NewRequest("POST", "/mcp/resource", bytes.NewBuffer(requestJSON))
	req.Header.Set("Content-Type", "application/json")

	// Create a response recorder
	w := httptest.NewRecorder()

	// Serve the request
	router.ServeHTTP(w, req)

	// Check the response
	assert.Equal(t, http.StatusOK, w.Code)

	// Parse the response
	var response MCPResourceResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)

	// Check the response fields
	assert.Equal(t, http.StatusOK, response.StatusCode)
	assert.NotNil(t, response.Body)

	// Verify expectations
	mockService.AssertExpectations(t)
}

func TestHandleStream(t *testing.T) {
	// Set up Gin in test mode
	gin.SetMode(gin.TestMode)

	// Create a mock service
	mockService := new(MockService)

	// Create a logger
	logger, _ := logging.NewEnhancedLogger(logging.LoggerConfig{
		Level:  "info",
		Format: logging.LogFormatJSON,
	})

	// Create a handler
	handler := NewHandler(mockService, logger)

	// Create a router
	router := gin.New()
	router.GET("/mcp/stream", handler.HandleStream)

	// Create a context with cancel for the request
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Create a request with operation_id and the cancellable context
	req, _ := http.NewRequestWithContext(ctx, "GET", "/mcp/stream?operation_id=test-op-123", nil)

	// Create a response recorder that captures the response
	w := httptest.NewRecorder()

	// Create a channel to signal when the test should stop
	done := make(chan bool)

	// Start a goroutine to serve the request
	go func() {
		router.ServeHTTP(w, req)
		done <- true
	}()

	// Wait for a short time to allow some events to be sent
	time.Sleep(3 * time.Second)

	// Cancel the request context to stop the stream
	cancel()

	// Wait for the handler to finish
	<-done

	// Check the response status code
	assert.Equal(t, http.StatusOK, w.Code)

	// Check the response headers
	headers := w.Header()
	assert.Equal(t, "text/event-stream; charset=utf-8", headers.Get("Content-Type"))
	assert.Equal(t, "no-cache, no-transform", headers.Get("Cache-Control"))
	assert.Equal(t, "keep-alive", headers.Get("Connection"))
	assert.Equal(t, "no", headers.Get("X-Accel-Buffering"))
	assert.Equal(t, "*", headers.Get("Access-Control-Allow-Origin"))

	// Check the response body for SSE format
	responseBody := w.Body.String()
	assert.Contains(t, responseBody, "event: progress")
	assert.Contains(t, responseBody, "data: {")
	assert.Contains(t, responseBody, "\"operation_id\":\"test-op-123\"")
}

func TestHandleStreamMissingOperationID(t *testing.T) {
	// Set up Gin in test mode
	gin.SetMode(gin.TestMode)

	// Create a mock service
	mockService := new(MockService)

	// Create a logger
	logger, _ := logging.NewEnhancedLogger(logging.LoggerConfig{
		Level:  "info",
		Format: logging.LogFormatJSON,
	})

	// Create a handler
	handler := NewHandler(mockService, logger)

	// Create a router
	router := gin.New()
	router.GET("/mcp/stream", handler.HandleStream)

	// Create a request without operation_id
	req, _ := http.NewRequest("GET", "/mcp/stream", nil)

	// Create a response recorder
	w := httptest.NewRecorder()

	// Serve the request
	router.ServeHTTP(w, req)

	// Check the response status code
	assert.Equal(t, http.StatusBadRequest, w.Code)

	// Parse the response
	var response MCPResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)

	// Check the error
	assert.NotNil(t, response.Error)
	assert.Equal(t, ErrorCodeInvalidRequest, response.Error.Code)
	assert.Contains(t, response.Error.Message, "Missing operation_id parameter")
}

func TestWriteSSEEvent(t *testing.T) {
	testCases := []struct {
		name     string
		event    events.Event
		expected string
	}{
		{
			name: "Progress event",
			event: func() events.Event {
				event := events.NewProgressEvent("op-123", events.StatusInProgress, 50.0, "Half way there", nil)
				event.Timestamp = time.Date(2025, 5, 14, 12, 0, 0, 0, time.UTC)
				return event
			}(),
			expected: "event: progress\ndata: {\"operation_id\":\"op-123\",\"timestamp\":\"2025-05-14T12:00:00Z\",\"status\":\"in_progress\",\"progress\":50,\"message\":\"Half way there\"}\n\n",
		},
		{
			name: "Completion event",
			event: func() events.Event {
				event := events.NewCompletionEvent("op-123", "success", "Operation completed", 10.5)
				event.Timestamp = time.Date(2025, 5, 14, 12, 0, 0, 0, time.UTC)
				return event
			}(),
			expected: "event: completion\ndata: {\"operation_id\":\"op-123\",\"timestamp\":\"2025-05-14T12:00:00Z\",\"status\":\"complete\",\"result\":\"success\",\"message\":\"Operation completed\",\"duration\":10.5}\n\n",
		},
		{
			name: "Error event",
			event: func() events.Event {
				event := events.NewErrorEvent("op-123", "Something went wrong", 500, nil, false)
				event.Timestamp = time.Date(2025, 5, 14, 12, 0, 0, 0, time.UTC)
				return event
			}(),
			expected: "event: error\ndata: {\"code\":500,\"error\":\"Something went wrong\",\"operation_id\":\"op-123\",\"status\":\"failed\",\"timestamp\":\"2025-05-14T12:00:00Z\"}\n\n",
		},
		{
			name: "Event with ID",
			event: func() events.Event {
				event := events.NewProgressEvent("op-123", events.StatusInProgress, 50.0, "Half way there", nil)
				event.Timestamp = time.Date(2025, 5, 14, 12, 0, 0, 0, time.UTC)
				event.EventID = "evt-456"
				return event
			}(),
			expected: "event: progress\ndata: {\"operation_id\":\"op-123\",\"timestamp\":\"2025-05-14T12:00:00Z\",\"event_id\":\"evt-456\",\"status\":\"in_progress\",\"progress\":50,\"message\":\"Half way there\"}\nid: evt-456\n\n",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Create a buffer to capture the output
			w := httptest.NewRecorder()

			// Write the event
			err := events.WriteSSE(w, tc.event)

			// Check for errors
			assert.NoError(t, err)

			// Check the output
			assert.Equal(t, tc.expected, w.Body.String())
		})
	}

	// Also test the legacy writeSSEEvent function for backward compatibility
	t.Run("Legacy writeSSEEvent", func(t *testing.T) {
		// Create a buffer to capture the output
		w := httptest.NewRecorder()

		// Write the event
		err := writeSSEEvent(w, "test", map[string]interface{}{"key": "value"}, "123")

		// Check for errors
		assert.NoError(t, err)

		// Check the output
		assert.Equal(t, "event: test\ndata: {\"key\":\"value\"}\nid: 123\n\n", w.Body.String())
	})
}

func TestWriteSSEFlush(t *testing.T) {
	// Create a test recorder that implements http.Flusher
	w := httptest.NewRecorder()

	// Test the flush function
	err := writeSSEFlush(w)
	assert.NoError(t, err)

	// Create a mock that doesn't implement http.Flusher
	type mockNonFlusher struct {
		http.ResponseWriter
	}
	nonFlusher := &mockNonFlusher{}

	// Test with a non-flusher writer
	err = writeSSEFlush(nonFlusher)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "does not support flushing")
}
