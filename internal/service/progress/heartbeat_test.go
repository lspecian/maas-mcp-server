package progress

import (
	"testing"
	"time"

	"github.com/lspecian/maas-mcp-server/internal/transport/mcp/events"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHeartbeatManager_RegisterConnection(t *testing.T) {
	// Create a logger
	logger := setupLogger(t)

	// Create a heartbeat manager with a short interval for testing
	interval := 100 * time.Millisecond
	manager := NewHeartbeatManager(interval, logger)

	// Start the heartbeat manager
	manager.Start()
	defer manager.Stop()

	// Create a channel to receive heartbeats
	eventChan := make(chan events.Event, 10)

	// Register the connection
	operationID := "test-op"
	manager.RegisterConnection(operationID, eventChan)

	// Wait for a heartbeat
	select {
	case event := <-eventChan:
		// Check that the event is a heartbeat
		assert.Equal(t, events.EventTypeHeartbeat, event.Type())

		// Check that the event has the correct operation ID
		heartbeatEvent, ok := event.(*events.HeartbeatEvent)
		require.True(t, ok)
		assert.Equal(t, operationID, heartbeatEvent.OperationID)

		// Check that the event has an ID
		assert.NotEmpty(t, heartbeatEvent.EventID)
	case <-time.After(2 * interval):
		t.Fatal("Timed out waiting for heartbeat")
	}
}

func TestHeartbeatManager_UnregisterConnection(t *testing.T) {
	// Create a logger
	logger := setupLogger(t)

	// Create a heartbeat manager with a short interval for testing
	interval := 100 * time.Millisecond
	manager := NewHeartbeatManager(interval, logger)

	// Start the heartbeat manager
	manager.Start()
	defer manager.Stop()

	// Create a channel to receive heartbeats
	eventChan := make(chan events.Event, 10)

	// Register the connection
	operationID := "test-op"
	manager.RegisterConnection(operationID, eventChan)

	// Wait for a heartbeat
	select {
	case <-eventChan:
		// Got a heartbeat
	case <-time.After(2 * interval):
		t.Fatal("Timed out waiting for first heartbeat")
	}

	// Unregister the connection
	manager.UnregisterConnection(operationID)

	// Clear the channel
	for len(eventChan) > 0 {
		<-eventChan
	}

	// Wait to see if we get another heartbeat
	select {
	case <-eventChan:
		t.Fatal("Received heartbeat after unregistering")
	case <-time.After(2 * interval):
		// No heartbeat, which is what we want
	}
}

func TestHeartbeatManager_Stop(t *testing.T) {
	// Create a logger
	logger := setupLogger(t)

	// Create a heartbeat manager with a short interval for testing
	interval := 100 * time.Millisecond
	manager := NewHeartbeatManager(interval, logger)

	// Start the heartbeat manager
	manager.Start()

	// Create a channel to receive heartbeats
	eventChan := make(chan events.Event, 10)

	// Register the connection
	operationID := "test-op"
	manager.RegisterConnection(operationID, eventChan)

	// Wait for a heartbeat
	select {
	case <-eventChan:
		// Got a heartbeat
	case <-time.After(2 * interval):
		t.Fatal("Timed out waiting for first heartbeat")
	}

	// Stop the heartbeat manager
	manager.Stop()

	// Clear the channel
	for len(eventChan) > 0 {
		<-eventChan
	}

	// Wait to see if we get another heartbeat
	select {
	case <-eventChan:
		t.Fatal("Received heartbeat after stopping")
	case <-time.After(2 * interval):
		// No heartbeat, which is what we want
	}
}

func TestHeartbeatManager_ChannelFull(t *testing.T) {
	// Create a logger
	logger := setupLogger(t)

	// Create a heartbeat manager with a short interval for testing
	interval := 100 * time.Millisecond
	manager := NewHeartbeatManager(interval, logger)

	// Start the heartbeat manager
	manager.Start()
	defer manager.Stop()

	// Create a channel with capacity 1 to test channel full behavior
	eventChan := make(chan events.Event, 1)

	// Fill the channel
	eventChan <- events.NewHeartbeatEvent("dummy", 0)

	// Register the connection
	operationID := "test-op"
	manager.RegisterConnection(operationID, eventChan)

	// Wait for a while to allow the heartbeat manager to try to send a heartbeat
	time.Sleep(2 * interval)

	// The channel should still have only one event (the dummy event)
	assert.Equal(t, 1, len(eventChan))

	// The event in the channel should be the dummy event
	event := <-eventChan
	heartbeatEvent, ok := event.(*events.HeartbeatEvent)
	require.True(t, ok)
	assert.Equal(t, "dummy", heartbeatEvent.OperationID)
}
