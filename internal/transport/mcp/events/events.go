package events

import (
	"encoding/json"
	"fmt"
	"io"
	"time"
)

// EventType represents the type of SSE event
type EventType string

// Define event types
const (
	EventTypeProgress   EventType = "progress"
	EventTypeCompletion EventType = "completion"
	EventTypeError      EventType = "error"
	EventTypeHeartbeat  EventType = "heartbeat"
	EventTypeLog        EventType = "log"
	EventTypeStatus     EventType = "status"
)

// StatusType represents the status of an operation
type StatusType string

// Define status types
const (
	StatusPending      StatusType = "pending"
	StatusInProgress   StatusType = "in_progress"
	StatusComplete     StatusType = "complete"
	StatusFailed       StatusType = "failed"
	StatusCancelled    StatusType = "cancelled"
	StatusInitializing StatusType = "initializing"
	StatusPaused       StatusType = "paused"
)

// LogLevel represents the level of a log message
type LogLevel string

// Define log levels
const (
	LogLevelDebug   LogLevel = "debug"
	LogLevelInfo    LogLevel = "info"
	LogLevelWarning LogLevel = "warning"
	LogLevelError   LogLevel = "error"
)

// Event is the interface that all event types must implement
type Event interface {
	// Type returns the event type
	Type() EventType

	// ToSSE converts the event to SSE format
	ToSSE() (string, []byte, error)

	// ID returns the event ID (optional)
	ID() string
}

// BaseEvent contains common fields for all events
type BaseEvent struct {
	// OperationID is the ID of the operation this event is related to
	OperationID string `json:"operation_id"`

	// Timestamp is the time the event was created
	Timestamp time.Time `json:"timestamp"`

	// EventID is an optional ID for the event
	EventID string `json:"event_id,omitempty"`
}

// ID returns the event ID
func (e *BaseEvent) ID() string {
	return e.EventID
}

// ProgressEvent represents a progress update for a long-running operation
type ProgressEvent struct {
	BaseEvent

	// Status is the current status of the operation
	Status StatusType `json:"status"`

	// Progress is the percentage of completion (0-100)
	Progress float64 `json:"progress"`

	// Message is a human-readable message about the progress
	Message string `json:"message,omitempty"`

	// Details contains additional details about the progress
	Details interface{} `json:"details,omitempty"`

	// EstimatedTimeRemaining is the estimated time remaining in seconds
	EstimatedTimeRemaining *float64 `json:"estimated_time_remaining,omitempty"`
}

// Type returns the event type
func (e *ProgressEvent) Type() EventType {
	return EventTypeProgress
}

// ToSSE converts the event to SSE format
func (e *ProgressEvent) ToSSE() (string, []byte, error) {
	data, err := json.Marshal(e)
	if err != nil {
		return "", nil, fmt.Errorf("error marshaling progress event: %w", err)
	}
	return string(EventTypeProgress), data, nil
}

// CompletionEvent represents the successful completion of an operation
type CompletionEvent struct {
	BaseEvent

	// Status is always "complete" for completion events
	Status StatusType `json:"status"`

	// Result contains the result of the operation
	Result interface{} `json:"result,omitempty"`

	// Message is a human-readable message about the completion
	Message string `json:"message,omitempty"`

	// Duration is the total duration of the operation in seconds
	Duration float64 `json:"duration,omitempty"`
}

// Type returns the event type
func (e *CompletionEvent) Type() EventType {
	return EventTypeCompletion
}

// ToSSE converts the event to SSE format
func (e *CompletionEvent) ToSSE() (string, []byte, error) {
	data, err := json.Marshal(e)
	if err != nil {
		return "", nil, fmt.Errorf("error marshaling completion event: %w", err)
	}
	return string(EventTypeCompletion), data, nil
}

// ErrorEvent represents an error that occurred during an operation
type ErrorEvent struct {
	BaseEvent

	// Status is always "failed" for error events
	Status StatusType `json:"status"`

	// Error is the error message
	Error string `json:"error"`

	// Code is an optional error code
	Code int `json:"code,omitempty"`

	// Details contains additional details about the error
	Details interface{} `json:"details,omitempty"`

	// Recoverable indicates whether the error is recoverable
	Recoverable bool `json:"recoverable,omitempty"`
}

// Type returns the event type
func (e *ErrorEvent) Type() EventType {
	return EventTypeError
}

// ToSSE converts the event to SSE format
func (e *ErrorEvent) ToSSE() (string, []byte, error) {
	// Create a custom map to control which fields are included
	eventMap := map[string]interface{}{
		"operation_id": e.OperationID,
		"timestamp":    e.Timestamp,
		"status":       e.Status,
		"error":        e.Error,
		"code":         e.Code,
	}

	// Only include event_id if it's not empty
	if e.EventID != "" {
		eventMap["event_id"] = e.EventID
	}

	// Only include details if it's not nil
	if e.Details != nil {
		eventMap["details"] = e.Details
	}

	// Only include recoverable if it's true (since false is the default)
	if e.Recoverable {
		eventMap["recoverable"] = e.Recoverable
	}

	// Marshal the map
	data, err := json.Marshal(eventMap)
	if err != nil {
		return "", nil, fmt.Errorf("error marshaling error event: %w", err)
	}
	return string(EventTypeError), data, nil
}

// HeartbeatEvent represents a heartbeat to keep the connection alive
type HeartbeatEvent struct {
	BaseEvent

	// Sequence is an optional sequence number for the heartbeat
	Sequence int64 `json:"sequence,omitempty"`
}

// Type returns the event type
func (e *HeartbeatEvent) Type() EventType {
	return EventTypeHeartbeat
}

// ToSSE converts the event to SSE format
func (e *HeartbeatEvent) ToSSE() (string, []byte, error) {
	data, err := json.Marshal(e)
	if err != nil {
		return "", nil, fmt.Errorf("error marshaling heartbeat event: %w", err)
	}
	return string(EventTypeHeartbeat), data, nil
}

// LogEvent represents a log message from an operation
type LogEvent struct {
	BaseEvent

	// Level is the log level
	Level LogLevel `json:"level"`

	// Message is the log message
	Message string `json:"message"`

	// Source is the source of the log message
	Source string `json:"source,omitempty"`

	// Details contains additional details about the log
	Details interface{} `json:"details,omitempty"`
}

// Type returns the event type
func (e *LogEvent) Type() EventType {
	return EventTypeLog
}

// ToSSE converts the event to SSE format
func (e *LogEvent) ToSSE() (string, []byte, error) {
	data, err := json.Marshal(e)
	if err != nil {
		return "", nil, fmt.Errorf("error marshaling log event: %w", err)
	}
	return string(EventTypeLog), data, nil
}

// StatusEvent represents a status change for an operation
type StatusEvent struct {
	BaseEvent

	// PreviousStatus is the previous status of the operation
	PreviousStatus StatusType `json:"previous_status,omitempty"`

	// CurrentStatus is the current status of the operation
	CurrentStatus StatusType `json:"current_status"`

	// Message is a human-readable message about the status change
	Message string `json:"message,omitempty"`

	// Details contains additional details about the status change
	Details interface{} `json:"details,omitempty"`
}

// Type returns the event type
func (e *StatusEvent) Type() EventType {
	return EventTypeStatus
}

// ToSSE converts the event to SSE format
func (e *StatusEvent) ToSSE() (string, []byte, error) {
	data, err := json.Marshal(e)
	if err != nil {
		return "", nil, fmt.Errorf("error marshaling status event: %w", err)
	}
	return string(EventTypeStatus), data, nil
}

// NewProgressEvent creates a new progress event
func NewProgressEvent(operationID string, status StatusType, progress float64, message string, details interface{}) *ProgressEvent {
	return &ProgressEvent{
		BaseEvent: BaseEvent{
			OperationID: operationID,
			Timestamp:   time.Now(),
		},
		Status:   status,
		Progress: progress,
		Message:  message,
		Details:  details,
	}
}

// NewCompletionEvent creates a new completion event
func NewCompletionEvent(operationID string, result interface{}, message string, duration float64) *CompletionEvent {
	return &CompletionEvent{
		BaseEvent: BaseEvent{
			OperationID: operationID,
			Timestamp:   time.Now(),
		},
		Status:   StatusComplete,
		Result:   result,
		Message:  message,
		Duration: duration,
	}
}

// NewErrorEvent creates a new error event
func NewErrorEvent(operationID string, errorMsg string, code int, details interface{}, recoverable bool) *ErrorEvent {
	return &ErrorEvent{
		BaseEvent: BaseEvent{
			OperationID: operationID,
			Timestamp:   time.Now(),
		},
		Status:      StatusFailed,
		Error:       errorMsg,
		Code:        code,
		Details:     details,
		Recoverable: recoverable,
	}
}

// NewHeartbeatEvent creates a new heartbeat event
func NewHeartbeatEvent(operationID string, sequence int64) *HeartbeatEvent {
	return &HeartbeatEvent{
		BaseEvent: BaseEvent{
			OperationID: operationID,
			Timestamp:   time.Now(),
		},
		Sequence: sequence,
	}
}

// NewLogEvent creates a new log event
func NewLogEvent(operationID string, level LogLevel, message string, source string, details interface{}) *LogEvent {
	return &LogEvent{
		BaseEvent: BaseEvent{
			OperationID: operationID,
			Timestamp:   time.Now(),
		},
		Level:   level,
		Message: message,
		Source:  source,
		Details: details,
	}
}

// NewStatusEvent creates a new status event
func NewStatusEvent(operationID string, previousStatus, currentStatus StatusType, message string, details interface{}) *StatusEvent {
	return &StatusEvent{
		BaseEvent: BaseEvent{
			OperationID: operationID,
			Timestamp:   time.Now(),
		},
		PreviousStatus: previousStatus,
		CurrentStatus:  currentStatus,
		Message:        message,
		Details:        details,
	}
}

// WriteSSE writes an event to an http.ResponseWriter in SSE format
func WriteSSE(w io.Writer, event Event) error {
	// Get the event type and data
	eventType, data, err := event.ToSSE()
	if err != nil {
		return err
	}

	// Write the event type
	if _, err := fmt.Fprintf(w, "event: %s\n", eventType); err != nil {
		return fmt.Errorf("error writing event type: %w", err)
	}

	// Write the data
	if _, err := fmt.Fprintf(w, "data: %s\n", data); err != nil {
		return fmt.Errorf("error writing event data: %w", err)
	}

	// Add ID if present
	if id := event.ID(); id != "" {
		if _, err := fmt.Fprintf(w, "id: %s\n", id); err != nil {
			return fmt.Errorf("error writing event ID: %w", err)
		}
	}

	// End event with an extra newline
	if _, err := fmt.Fprint(w, "\n"); err != nil {
		return fmt.Errorf("error writing event terminator: %w", err)
	}

	return nil
}
