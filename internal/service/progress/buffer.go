package progress

import (
	"container/ring"
	"sync"

	"github.com/lspecian/maas-mcp-server/internal/transport/mcp/events"
)

// EventBuffer is a circular buffer that stores recent events for an operation.
// It provides thread-safe access to the events and supports retrieving events
// after a specific event ID.
type EventBuffer struct {
	// buffer is a circular buffer that stores events
	buffer *ring.Ring

	// capacity is the maximum number of events the buffer can store
	capacity int

	// mutex protects access to the buffer
	mutex sync.RWMutex

	// eventIDMap maps event IDs to their position in the buffer
	// This allows for efficient retrieval of events after a specific ID
	eventIDMap map[string]int
}

// NewEventBuffer creates a new EventBuffer with the specified capacity
func NewEventBuffer(capacity int) *EventBuffer {
	if capacity <= 0 {
		capacity = 100 // Default capacity
	}

	return &EventBuffer{
		buffer:     ring.New(capacity),
		capacity:   capacity,
		eventIDMap: make(map[string]int),
	}
}

// Add adds an event to the buffer
func (b *EventBuffer) Add(event events.Event) {
	b.mutex.Lock()
	defer b.mutex.Unlock()

	// Store the event in the buffer
	b.buffer.Value = event

	// If the event has an ID, store its position in the map
	if id := event.ID(); id != "" {
		// Calculate the current position in the buffer
		position := 0
		current := b.buffer
		for i := 0; i < b.capacity; i++ {
			if current == b.buffer {
				position = i
				break
			}
			current = current.Next()
		}
		b.eventIDMap[id] = position
	}

	// Move to the next position in the buffer
	b.buffer = b.buffer.Next()

	// Clean up old event IDs that are no longer in the buffer
	// This is a simple approach - we could optimize this further if needed
	if len(b.eventIDMap) > b.capacity*2 {
		newMap := make(map[string]int)
		for id, pos := range b.eventIDMap {
			// Check if the position is still valid
			current := b.buffer
			for i := 0; i < b.capacity; i++ {
				if i == pos && current.Value != nil {
					if event, ok := current.Value.(events.Event); ok && event.ID() == id {
						newMap[id] = pos
						break
					}
				}
				current = current.Next()
			}
		}
		b.eventIDMap = newMap
	}
}

// GetAll returns all events in the buffer
func (b *EventBuffer) GetAll() []events.Event {
	b.mutex.RLock()
	defer b.mutex.RUnlock()

	var result []events.Event
	b.buffer.Do(func(value interface{}) {
		if value != nil {
			if event, ok := value.(events.Event); ok {
				result = append(result, event)
			}
		}
	})

	return result
}

// GetAfterID returns all events in the buffer that occurred after the event with the specified ID
func (b *EventBuffer) GetAfterID(id string) []events.Event {
	b.mutex.RLock()
	defer b.mutex.RUnlock()

	// If the ID is empty or not found, return all events
	if id == "" {
		return b.GetAll()
	}

	position, exists := b.eventIDMap[id]
	if !exists {
		return b.GetAll()
	}

	var result []events.Event
	current := b.buffer

	// Find the position in the buffer
	for i := 0; i < b.capacity; i++ {
		if i == position {
			break
		}
		current = current.Next()
	}

	// Skip the event with the specified ID
	current = current.Next()

	// Collect all events after the specified ID
	for i := 0; i < b.capacity; i++ {
		if current.Value != nil {
			if event, ok := current.Value.(events.Event); ok {
				result = append(result, event)
			}
		}
		current = current.Next()
	}

	return result
}

// Clear removes all events from the buffer
func (b *EventBuffer) Clear() {
	b.mutex.Lock()
	defer b.mutex.Unlock()

	b.buffer = ring.New(b.capacity)
	b.eventIDMap = make(map[string]int)
}
