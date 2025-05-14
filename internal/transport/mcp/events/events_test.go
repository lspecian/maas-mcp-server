package events

import (
	"bytes"
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

// mockWriter is a simple implementation of a writer for testing
type mockWriter struct {
	bytes.Buffer
}

func TestProgressEvent(t *testing.T) {
	// Create a progress event
	event := NewProgressEvent("op-123", StatusInProgress, 50.0, "Half way there", map[string]string{"step": "processing"})

	// Set a fixed timestamp for testing
	event.Timestamp = time.Date(2025, 5, 14, 12, 0, 0, 0, time.UTC)

	// Test the Type method
	assert.Equal(t, EventTypeProgress, event.Type())

	// Test the ID method
	assert.Empty(t, event.ID())

	// Set an event ID and test again
	event.EventID = "evt-456"
	assert.Equal(t, "evt-456", event.ID())

	// Test the ToSSE method
	eventType, data, err := event.ToSSE()
	assert.NoError(t, err)
	assert.Equal(t, string(EventTypeProgress), eventType)

	// Verify the JSON data
	var jsonData map[string]interface{}
	err = json.Unmarshal(data, &jsonData)
	assert.NoError(t, err)
	assert.Equal(t, "op-123", jsonData["operation_id"])
	assert.Equal(t, "in_progress", jsonData["status"])
	assert.Equal(t, 50.0, jsonData["progress"])
	assert.Equal(t, "Half way there", jsonData["message"])
	assert.Equal(t, "processing", jsonData["details"].(map[string]interface{})["step"])
	assert.Equal(t, "2025-05-14T12:00:00Z", jsonData["timestamp"])
	assert.Equal(t, "evt-456", jsonData["event_id"])
}

func TestCompletionEvent(t *testing.T) {
	// Create a completion event
	event := NewCompletionEvent("op-123", map[string]string{"result": "success"}, "Operation completed", 10.5)

	// Set a fixed timestamp for testing
	event.Timestamp = time.Date(2025, 5, 14, 12, 0, 0, 0, time.UTC)

	// Test the Type method
	assert.Equal(t, EventTypeCompletion, event.Type())

	// Test the ToSSE method
	eventType, data, err := event.ToSSE()
	assert.NoError(t, err)
	assert.Equal(t, string(EventTypeCompletion), eventType)

	// Verify the JSON data
	var jsonData map[string]interface{}
	err = json.Unmarshal(data, &jsonData)
	assert.NoError(t, err)
	assert.Equal(t, "op-123", jsonData["operation_id"])
	assert.Equal(t, "complete", jsonData["status"])
	assert.Equal(t, "Operation completed", jsonData["message"])
	assert.Equal(t, 10.5, jsonData["duration"])
	assert.Equal(t, "success", jsonData["result"].(map[string]interface{})["result"])
}

func TestErrorEvent(t *testing.T) {
	// Create an error event
	event := NewErrorEvent("op-123", "Something went wrong", 500, nil, false)

	// Set a fixed timestamp for testing
	event.Timestamp = time.Date(2025, 5, 14, 12, 0, 0, 0, time.UTC)

	// Test the Type method
	assert.Equal(t, EventTypeError, event.Type())

	// Test the ToSSE method
	eventType, data, err := event.ToSSE()
	assert.NoError(t, err)
	assert.Equal(t, string(EventTypeError), eventType)

	// Verify the JSON data
	var jsonData map[string]interface{}
	err = json.Unmarshal(data, &jsonData)
	assert.NoError(t, err)
	assert.Equal(t, "op-123", jsonData["operation_id"])
	assert.Equal(t, "failed", jsonData["status"])
	assert.Equal(t, "Something went wrong", jsonData["error"])
	assert.Equal(t, float64(500), jsonData["code"])

	// Check if recoverable field exists
	if recoverable, ok := jsonData["recoverable"]; ok {
		assert.Equal(t, false, recoverable)
	}
}

func TestHeartbeatEvent(t *testing.T) {
	// Create a heartbeat event
	event := NewHeartbeatEvent("op-123", 42)

	// Set a fixed timestamp for testing
	event.Timestamp = time.Date(2025, 5, 14, 12, 0, 0, 0, time.UTC)

	// Test the Type method
	assert.Equal(t, EventTypeHeartbeat, event.Type())

	// Test the ToSSE method
	eventType, data, err := event.ToSSE()
	assert.NoError(t, err)
	assert.Equal(t, string(EventTypeHeartbeat), eventType)

	// Verify the JSON data
	var jsonData map[string]interface{}
	err = json.Unmarshal(data, &jsonData)
	assert.NoError(t, err)
	assert.Equal(t, "op-123", jsonData["operation_id"])
	assert.Equal(t, float64(42), jsonData["sequence"])
}

func TestLogEvent(t *testing.T) {
	// Create a log event
	event := NewLogEvent("op-123", LogLevelInfo, "Processing step 3", "worker-1", nil)

	// Set a fixed timestamp for testing
	event.Timestamp = time.Date(2025, 5, 14, 12, 0, 0, 0, time.UTC)

	// Test the Type method
	assert.Equal(t, EventTypeLog, event.Type())

	// Test the ToSSE method
	eventType, data, err := event.ToSSE()
	assert.NoError(t, err)
	assert.Equal(t, string(EventTypeLog), eventType)

	// Verify the JSON data
	var jsonData map[string]interface{}
	err = json.Unmarshal(data, &jsonData)
	assert.NoError(t, err)
	assert.Equal(t, "op-123", jsonData["operation_id"])
	assert.Equal(t, "info", jsonData["level"])
	assert.Equal(t, "Processing step 3", jsonData["message"])
	assert.Equal(t, "worker-1", jsonData["source"])
}

func TestStatusEvent(t *testing.T) {
	// Create a status event
	event := NewStatusEvent("op-123", StatusPending, StatusInProgress, "Operation started", nil)

	// Set a fixed timestamp for testing
	event.Timestamp = time.Date(2025, 5, 14, 12, 0, 0, 0, time.UTC)

	// Test the Type method
	assert.Equal(t, EventTypeStatus, event.Type())

	// Test the ToSSE method
	eventType, data, err := event.ToSSE()
	assert.NoError(t, err)
	assert.Equal(t, string(EventTypeStatus), eventType)

	// Verify the JSON data
	var jsonData map[string]interface{}
	err = json.Unmarshal(data, &jsonData)
	assert.NoError(t, err)
	assert.Equal(t, "op-123", jsonData["operation_id"])
	assert.Equal(t, "pending", jsonData["previous_status"])
	assert.Equal(t, "in_progress", jsonData["current_status"])
	assert.Equal(t, "Operation started", jsonData["message"])
}

func TestWriteSSE(t *testing.T) {
	testCases := []struct {
		name     string
		event    Event
		expected string
	}{
		{
			name: "Progress event",
			event: func() Event {
				event := NewProgressEvent("op-123", StatusInProgress, 50.0, "Half way there", nil)
				event.Timestamp = time.Date(2025, 5, 14, 12, 0, 0, 0, time.UTC)
				return event
			}(),
			expected: "event: progress\ndata: {\"operation_id\":\"op-123\",\"timestamp\":\"2025-05-14T12:00:00Z\",\"status\":\"in_progress\",\"progress\":50,\"message\":\"Half way there\"}\n\n",
		},
		{
			name: "Completion event",
			event: func() Event {
				event := NewCompletionEvent("op-123", "success", "Operation completed", 10.5)
				event.Timestamp = time.Date(2025, 5, 14, 12, 0, 0, 0, time.UTC)
				return event
			}(),
			expected: "event: completion\ndata: {\"operation_id\":\"op-123\",\"timestamp\":\"2025-05-14T12:00:00Z\",\"status\":\"complete\",\"result\":\"success\",\"message\":\"Operation completed\",\"duration\":10.5}\n\n",
		},
		{
			name: "Error event",
			event: func() Event {
				event := NewErrorEvent("op-123", "Something went wrong", 500, nil, false)
				event.Timestamp = time.Date(2025, 5, 14, 12, 0, 0, 0, time.UTC)
				return event
			}(),
			expected: "event: error\ndata: {\"code\":500,\"error\":\"Something went wrong\",\"operation_id\":\"op-123\",\"status\":\"failed\",\"timestamp\":\"2025-05-14T12:00:00Z\"}\n\n",
		},
		{
			name: "Event with ID",
			event: func() Event {
				event := NewProgressEvent("op-123", StatusInProgress, 50.0, "Half way there", nil)
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
			var buf bytes.Buffer

			// Write the event
			err := WriteSSE(&buf, tc.event)
			assert.NoError(t, err)

			// Check the output
			assert.Equal(t, tc.expected, buf.String())
		})
	}
}

func TestEventTypeConstants(t *testing.T) {
	// Test event type constants
	assert.Equal(t, EventType("progress"), EventTypeProgress)
	assert.Equal(t, EventType("completion"), EventTypeCompletion)
	assert.Equal(t, EventType("error"), EventTypeError)
	assert.Equal(t, EventType("heartbeat"), EventTypeHeartbeat)
	assert.Equal(t, EventType("log"), EventTypeLog)
	assert.Equal(t, EventType("status"), EventTypeStatus)
}

func TestStatusTypeConstants(t *testing.T) {
	// Test status type constants
	assert.Equal(t, StatusType("pending"), StatusPending)
	assert.Equal(t, StatusType("in_progress"), StatusInProgress)
	assert.Equal(t, StatusType("complete"), StatusComplete)
	assert.Equal(t, StatusType("failed"), StatusFailed)
	assert.Equal(t, StatusType("cancelled"), StatusCancelled)
	assert.Equal(t, StatusType("initializing"), StatusInitializing)
	assert.Equal(t, StatusType("paused"), StatusPaused)
}

func TestLogLevelConstants(t *testing.T) {
	// Test log level constants
	assert.Equal(t, LogLevel("debug"), LogLevelDebug)
	assert.Equal(t, LogLevel("info"), LogLevelInfo)
	assert.Equal(t, LogLevel("warning"), LogLevelWarning)
	assert.Equal(t, LogLevel("error"), LogLevelError)
}

func TestEstimatedTimeRemaining(t *testing.T) {
	// Test estimated time remaining
	etr := 30.5
	event := NewProgressEvent("op-123", StatusInProgress, 50.0, "Half way there", nil)
	event.EstimatedTimeRemaining = &etr

	// Test the ToSSE method
	_, data, err := event.ToSSE()
	assert.NoError(t, err)

	// Verify the JSON data
	var jsonData map[string]interface{}
	err = json.Unmarshal(data, &jsonData)
	assert.NoError(t, err)
	assert.Equal(t, 30.5, jsonData["estimated_time_remaining"])
}
