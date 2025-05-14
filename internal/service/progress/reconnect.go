package progress

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/lspecian/maas-mcp-server/internal/transport/mcp/events"
)

// generateEventID generates a unique event ID for an event
// The format is: {operationID}:{eventType}:{timestamp}:{sequence}
func generateEventID(operationID string, eventType string, sequence int64) string {
	timestamp := time.Now().UnixNano()
	return fmt.Sprintf("%s:%s:%d:%d", operationID, eventType, timestamp, sequence)
}

// parseEventID parses an event ID into its components
// Returns operationID, eventType, timestamp, sequence, and an error if parsing fails
func parseEventID(eventID string) (string, string, int64, int64, error) {
	parts := strings.Split(eventID, ":")
	if len(parts) != 4 {
		return "", "", 0, 0, fmt.Errorf("invalid event ID format: %s", eventID)
	}

	operationID := parts[0]
	eventType := parts[1]

	timestamp, err := strconv.ParseInt(parts[2], 10, 64)
	if err != nil {
		return "", "", 0, 0, fmt.Errorf("invalid timestamp in event ID: %s", eventID)
	}

	sequence, err := strconv.ParseInt(parts[3], 10, 64)
	if err != nil {
		return "", "", 0, 0, fmt.Errorf("invalid sequence in event ID: %s", eventID)
	}

	return operationID, eventType, timestamp, sequence, nil
}

// ReconnectionManager handles reconnection support for SSE clients
type ReconnectionManager struct {
	// buffers is a map of operation IDs to event buffers
	buffers map[string]*EventBuffer

	// bufferSize is the maximum number of events to store in each buffer
	bufferSize int
}

// NewReconnectionManager creates a new ReconnectionManager with the specified buffer size
func NewReconnectionManager(bufferSize int) *ReconnectionManager {
	if bufferSize <= 0 {
		bufferSize = 100 // Default buffer size
	}

	return &ReconnectionManager{
		buffers:    make(map[string]*EventBuffer),
		bufferSize: bufferSize,
	}
}

// GetBuffer returns the event buffer for the specified operation ID
// If the buffer doesn't exist, it creates a new one
func (r *ReconnectionManager) GetBuffer(operationID string) *EventBuffer {
	buffer, exists := r.buffers[operationID]
	if !exists {
		buffer = NewEventBuffer(r.bufferSize)
		r.buffers[operationID] = buffer
	}

	return buffer
}

// AddEvent adds an event to the buffer for the specified operation ID
// It also sets a unique event ID on the event if it doesn't already have one
func (r *ReconnectionManager) AddEvent(event events.Event) {
	// Extract the operation ID based on the event type
	var operationID string

	// We need to handle each event type separately since we can't directly access BaseEvent
	switch e := event.(type) {
	case *events.ProgressEvent:
		operationID = e.OperationID
		// Set a unique event ID if the event doesn't already have one
		if e.EventID == "" {
			e.EventID = generateEventID(operationID, string(e.Type()), time.Now().UnixNano())
		}
	case *events.CompletionEvent:
		operationID = e.OperationID
		if e.EventID == "" {
			e.EventID = generateEventID(operationID, string(e.Type()), time.Now().UnixNano())
		}
	case *events.ErrorEvent:
		operationID = e.OperationID
		if e.EventID == "" {
			e.EventID = generateEventID(operationID, string(e.Type()), time.Now().UnixNano())
		}
	case *events.HeartbeatEvent:
		operationID = e.OperationID
		if e.EventID == "" {
			e.EventID = generateEventID(operationID, string(e.Type()), time.Now().UnixNano())
		}
	case *events.LogEvent:
		operationID = e.OperationID
		if e.EventID == "" {
			e.EventID = generateEventID(operationID, string(e.Type()), time.Now().UnixNano())
		}
	case *events.StatusEvent:
		operationID = e.OperationID
		if e.EventID == "" {
			e.EventID = generateEventID(operationID, string(e.Type()), time.Now().UnixNano())
		}
	default:
		// Unknown event type, skip it
		return
	}

	// Get the buffer for this operation
	buffer := r.GetBuffer(operationID)

	// Add the event to the buffer
	buffer.Add(event)
}

// GetEventsAfterID returns all events for the specified operation ID that occurred after the event with the specified ID
func (r *ReconnectionManager) GetEventsAfterID(operationID string, lastEventID string) []events.Event {
	buffer, exists := r.buffers[operationID]
	if !exists {
		return nil
	}

	return buffer.GetAfterID(lastEventID)
}

// CleanupOperation removes the buffer for the specified operation ID
func (r *ReconnectionManager) CleanupOperation(operationID string) {
	delete(r.buffers, operationID)
}
