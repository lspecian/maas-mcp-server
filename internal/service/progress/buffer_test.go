package progress

import (
	"testing"

	"github.com/lspecian/maas-mcp-server/internal/transport/mcp/events"
	"github.com/stretchr/testify/assert"
)

func TestEventBuffer_Add(t *testing.T) {
	// Create a buffer with capacity 5
	buffer := NewEventBuffer(5)

	// Create some test events
	event1 := events.NewProgressEvent("op1", events.StatusInProgress, 25.0, "Progress 25%", nil)
	event1.BaseEvent.EventID = "event1"

	event2 := events.NewProgressEvent("op1", events.StatusInProgress, 50.0, "Progress 50%", nil)
	event2.BaseEvent.EventID = "event2"

	event3 := events.NewProgressEvent("op1", events.StatusInProgress, 75.0, "Progress 75%", nil)
	event3.BaseEvent.EventID = "event3"

	// Add events to the buffer
	buffer.Add(event1)
	buffer.Add(event2)
	buffer.Add(event3)

	// Check that all events are in the buffer
	events := buffer.GetAll()
	assert.Len(t, events, 3)

	// Check that the events are in the correct order
	assert.Equal(t, "event1", events[0].ID())
	assert.Equal(t, "event2", events[1].ID())
	assert.Equal(t, "event3", events[2].ID())
}

func TestEventBuffer_GetAfterID(t *testing.T) {
	// Create a buffer with capacity 5
	buffer := NewEventBuffer(5)

	// Create some test events
	event1 := events.NewProgressEvent("op1", events.StatusInProgress, 25.0, "Progress 25%", nil)
	event1.BaseEvent.EventID = "event1"

	event2 := events.NewProgressEvent("op1", events.StatusInProgress, 50.0, "Progress 50%", nil)
	event2.BaseEvent.EventID = "event2"

	event3 := events.NewProgressEvent("op1", events.StatusInProgress, 75.0, "Progress 75%", nil)
	event3.BaseEvent.EventID = "event3"

	// Add events to the buffer
	buffer.Add(event1)
	buffer.Add(event2)
	buffer.Add(event3)

	// Get events after event1
	eventsAfterEvent1 := buffer.GetAfterID("event1")
	assert.Len(t, eventsAfterEvent1, 2)
	assert.Equal(t, "event2", eventsAfterEvent1[0].ID())
	assert.Equal(t, "event3", eventsAfterEvent1[1].ID())

	// Get events after event2
	eventsAfterEvent2 := buffer.GetAfterID("event2")
	assert.Len(t, eventsAfterEvent2, 1)
	assert.Equal(t, "event3", eventsAfterEvent2[0].ID())

	// Get events after non-existent ID (should return all events)
	eventsAfterNonExistent := buffer.GetAfterID("non-existent")
	assert.Len(t, eventsAfterNonExistent, 3)
}

func TestEventBuffer_CircularBehavior(t *testing.T) {
	// Create a buffer with capacity 3
	buffer := NewEventBuffer(3)

	// Create some test events
	event1 := events.NewProgressEvent("op1", events.StatusInProgress, 25.0, "Progress 25%", nil)
	event1.BaseEvent.EventID = "event1"

	event2 := events.NewProgressEvent("op1", events.StatusInProgress, 50.0, "Progress 50%", nil)
	event2.BaseEvent.EventID = "event2"

	event3 := events.NewProgressEvent("op1", events.StatusInProgress, 75.0, "Progress 75%", nil)
	event3.BaseEvent.EventID = "event3"

	event4 := events.NewProgressEvent("op1", events.StatusInProgress, 90.0, "Progress 90%", nil)
	event4.BaseEvent.EventID = "event4"

	// Add events to the buffer
	buffer.Add(event1)
	buffer.Add(event2)
	buffer.Add(event3)

	// Check that all events are in the buffer
	events := buffer.GetAll()
	assert.Len(t, events, 3)

	// Add another event, which should replace the oldest event (event1)
	buffer.Add(event4)

	// Check that the buffer still has 3 events, but event1 is gone
	events = buffer.GetAll()
	assert.Len(t, events, 3)

	// Check that the events are in the correct order
	foundEvent1 := false
	for _, event := range events {
		if event.ID() == "event1" {
			foundEvent1 = true
			break
		}
	}
	assert.False(t, foundEvent1, "event1 should have been removed from the buffer")

	// Check that the other events are still there
	foundEvent2 := false
	foundEvent3 := false
	foundEvent4 := false
	for _, event := range events {
		if event.ID() == "event2" {
			foundEvent2 = true
		} else if event.ID() == "event3" {
			foundEvent3 = true
		} else if event.ID() == "event4" {
			foundEvent4 = true
		}
	}
	assert.True(t, foundEvent2, "event2 should still be in the buffer")
	assert.True(t, foundEvent3, "event3 should still be in the buffer")
	assert.True(t, foundEvent4, "event4 should be in the buffer")
}

func TestEventBuffer_Clear(t *testing.T) {
	// Create a buffer with capacity 5
	buffer := NewEventBuffer(5)

	// Create some test events
	event1 := events.NewProgressEvent("op1", events.StatusInProgress, 25.0, "Progress 25%", nil)
	event1.BaseEvent.EventID = "event1"

	event2 := events.NewProgressEvent("op1", events.StatusInProgress, 50.0, "Progress 50%", nil)
	event2.BaseEvent.EventID = "event2"

	// Add events to the buffer
	buffer.Add(event1)
	buffer.Add(event2)

	// Check that the events are in the buffer
	events := buffer.GetAll()
	assert.Len(t, events, 2)

	// Clear the buffer
	buffer.Clear()

	// Check that the buffer is empty
	events = buffer.GetAll()
	assert.Len(t, events, 0)
}
