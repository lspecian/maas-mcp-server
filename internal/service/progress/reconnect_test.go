package progress

import (
	"testing"

	"github.com/lspecian/maas-mcp-server/internal/transport/mcp/events"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGenerateEventID(t *testing.T) {
	// Generate an event ID
	operationID := "test-op"
	eventType := "progress"
	sequence := int64(123)

	eventID := generateEventID(operationID, eventType, sequence)

	// Check that the event ID is not empty
	assert.NotEmpty(t, eventID)

	// Check that the event ID contains the operation ID and event type
	assert.Contains(t, eventID, operationID)
	assert.Contains(t, eventID, eventType)
	assert.Contains(t, eventID, "123")
}

func TestParseEventID(t *testing.T) {
	// Generate an event ID
	operationID := "test-op"
	eventType := "progress"
	sequence := int64(123)

	eventID := generateEventID(operationID, eventType, sequence)

	// Parse the event ID
	parsedOperationID, parsedEventType, parsedTimestamp, parsedSequence, err := parseEventID(eventID)

	// Check that there was no error
	require.NoError(t, err)

	// Check that the parsed values match the original values
	assert.Equal(t, operationID, parsedOperationID)
	assert.Equal(t, eventType, parsedEventType)
	assert.NotZero(t, parsedTimestamp)
	assert.Equal(t, sequence, parsedSequence)

	// Test parsing an invalid event ID
	_, _, _, _, err = parseEventID("invalid-event-id")
	assert.Error(t, err)
}

func TestReconnectionManager_AddEvent(t *testing.T) {
	// Create a reconnection manager
	manager := NewReconnectionManager(5)

	// Create a test event
	event := events.NewProgressEvent("op1", events.StatusInProgress, 50.0, "Progress 50%", nil)

	// Add the event to the manager
	manager.AddEvent(event)

	// Check that the event was added to the buffer
	buffer := manager.GetBuffer("op1")
	events := buffer.GetAll()
	assert.Len(t, events, 1)

	// Check that the event has an ID
	assert.NotEmpty(t, events[0].ID())
}

func TestReconnectionManager_GetEventsAfterID(t *testing.T) {
	// Create a reconnection manager
	manager := NewReconnectionManager(5)

	// Create some test events
	event1 := events.NewProgressEvent("op1", events.StatusInProgress, 25.0, "Progress 25%", nil)
	event1.BaseEvent.EventID = "event1"

	event2 := events.NewProgressEvent("op1", events.StatusInProgress, 50.0, "Progress 50%", nil)
	event2.BaseEvent.EventID = "event2"

	event3 := events.NewProgressEvent("op1", events.StatusInProgress, 75.0, "Progress 75%", nil)
	event3.BaseEvent.EventID = "event3"

	// Add the events to the manager
	manager.AddEvent(event1)
	manager.AddEvent(event2)
	manager.AddEvent(event3)

	// Get events after event1
	eventsAfterEvent1 := manager.GetEventsAfterID("op1", "event1")
	assert.Len(t, eventsAfterEvent1, 2)
	assert.Equal(t, "event2", eventsAfterEvent1[0].ID())
	assert.Equal(t, "event3", eventsAfterEvent1[1].ID())

	// Get events after event2
	eventsAfterEvent2 := manager.GetEventsAfterID("op1", "event2")
	assert.Len(t, eventsAfterEvent2, 1)
	assert.Equal(t, "event3", eventsAfterEvent2[0].ID())

	// Get events after non-existent ID (should return all events)
	eventsAfterNonExistent := manager.GetEventsAfterID("op1", "non-existent")
	assert.Len(t, eventsAfterNonExistent, 3)

	// Get events for non-existent operation (should return nil)
	eventsForNonExistentOp := manager.GetEventsAfterID("non-existent-op", "event1")
	assert.Nil(t, eventsForNonExistentOp)
}

func TestReconnectionManager_CleanupOperation(t *testing.T) {
	// Create a reconnection manager
	manager := NewReconnectionManager(5)

	// Create a test event
	event := events.NewProgressEvent("op1", events.StatusInProgress, 50.0, "Progress 50%", nil)

	// Add the event to the manager
	manager.AddEvent(event)

	// Check that the buffer exists
	buffer := manager.GetBuffer("op1")
	assert.NotNil(t, buffer)

	// Cleanup the operation
	manager.CleanupOperation("op1")

	// Check that the buffer was removed
	_, exists := manager.buffers["op1"]
	assert.False(t, exists)
}
