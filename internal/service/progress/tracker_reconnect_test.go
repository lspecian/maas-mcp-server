package progress

import (
	"context"
	"testing"
	"time"

	"github.com/lspecian/maas-mcp-server/internal/transport/mcp/events"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestProgressTracker_Reconnection(t *testing.T) {
	// Create a logger
	logger := setupLogger(t)

	// Create a tracker with a small buffer size and heartbeat interval for testing
	bufferSize := 10
	heartbeatInterval := 100 * time.Millisecond
	tracker := NewProgressTrackerWithConfig(logger, bufferSize, heartbeatInterval)

	// Start an operation
	operationID := "test-reconnect-op"
	reporter, _, err := tracker.StartOperation(operationID)
	require.NoError(t, err)

	// Subscribe to events
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	eventChan, err := tracker.SubscribeToEvents(ctx, operationID)
	require.NoError(t, err)

	// Receive the initial status event
	event := <-eventChan
	assert.Equal(t, events.EventTypeStatus, event.Type())
	statusEvent, ok := event.(*events.StatusEvent)
	require.True(t, ok)
	assert.Equal(t, operationID, statusEvent.OperationID)
	assert.Equal(t, events.StatusInitializing, statusEvent.CurrentStatus)

	// Store the event ID for later reconnection
	lastEventID := statusEvent.ID()
	assert.NotEmpty(t, lastEventID)

	// Update progress
	err = reporter.ReportProgress(25.0, "Progress 25%", nil)
	require.NoError(t, err)

	// Receive the status change event
	event = <-eventChan
	assert.Equal(t, events.EventTypeStatus, event.Type())
	statusEvent, ok = event.(*events.StatusEvent)
	require.True(t, ok)
	assert.Equal(t, operationID, statusEvent.OperationID)
	assert.Equal(t, events.StatusInProgress, statusEvent.CurrentStatus)

	// Receive the progress event
	event = <-eventChan
	assert.Equal(t, events.EventTypeProgress, event.Type())
	progressEvent, ok := event.(*events.ProgressEvent)
	require.True(t, ok)
	assert.Equal(t, operationID, progressEvent.OperationID)
	assert.Equal(t, 25.0, progressEvent.Progress)

	// Cancel the subscription
	cancel()
	time.Sleep(100 * time.Millisecond) // Give time for the goroutine to clean up

	// Update progress again
	err = reporter.ReportProgress(50.0, "Progress 50%", nil)
	require.NoError(t, err)

	// Log a message
	err = reporter.ReportLog(events.LogLevelInfo, "Processing step 2", "worker-1", nil)
	require.NoError(t, err)

	// Reconnect with the last event ID
	ctx2, cancel2 := context.WithCancel(context.Background())
	defer cancel2()
	reconnectChan, err := tracker.SubscribeToEventsWithLastEventID(ctx2, operationID, lastEventID)
	require.NoError(t, err)

	// We should receive all events that occurred after the last event ID
	// This should include the status change, progress 25%, progress 50%, and log events

	// Count the events we receive
	receivedEvents := 0
	foundProgress50 := false
	foundLog := false

	// Set a timeout for receiving events
	timeout := time.After(1 * time.Second)

	// Receive events until we find the ones we're looking for or timeout
eventLoop:
	for {
		select {
		case event, ok := <-reconnectChan:
			if !ok {
				break eventLoop
			}
			receivedEvents++

			// Check for the progress 50% event
			if event.Type() == events.EventTypeProgress {
				progressEvent, ok := event.(*events.ProgressEvent)
				if ok && progressEvent.Progress == 50.0 {
					foundProgress50 = true
				}
			}

			// Check for the log event
			if event.Type() == events.EventTypeLog {
				logEvent, ok := event.(*events.LogEvent)
				if ok && logEvent.Message == "Processing step 2" {
					foundLog = true
				}
			}

			// If we found both events, we can break out of the loop
			if foundProgress50 && foundLog {
				break eventLoop
			}
		case <-timeout:
			t.Fatal("Timed out waiting for reconnection events")
			break eventLoop
		}
	}

	// We should have received at least the progress 50% and log events
	assert.True(t, foundProgress50, "Did not receive progress 50% event on reconnection")
	assert.True(t, foundLog, "Did not receive log event on reconnection")
}

func TestProgressTracker_Heartbeat(t *testing.T) {
	// Create a logger
	logger := setupLogger(t)

	// Create a tracker with a small heartbeat interval for testing
	heartbeatInterval := 100 * time.Millisecond
	tracker := NewProgressTrackerWithConfig(logger, 10, heartbeatInterval)

	// Start an operation
	operationID := "test-heartbeat-op"
	_, _, err := tracker.StartOperation(operationID)
	require.NoError(t, err)

	// Subscribe to events
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	eventChan, err := tracker.SubscribeToEvents(ctx, operationID)
	require.NoError(t, err)

	// Receive the initial status event
	event := <-eventChan
	assert.Equal(t, events.EventTypeStatus, event.Type())

	// Wait for a heartbeat
	heartbeatReceived := false
	timeout := time.After(3 * heartbeatInterval)

	for !heartbeatReceived {
		select {
		case event := <-eventChan:
			if event.Type() == events.EventTypeHeartbeat {
				heartbeatEvent, ok := event.(*events.HeartbeatEvent)
				require.True(t, ok)
				assert.Equal(t, operationID, heartbeatEvent.OperationID)
				assert.NotEmpty(t, heartbeatEvent.ID())
				heartbeatReceived = true
			}
		case <-timeout:
			t.Fatal("Timed out waiting for heartbeat")
		}
	}

	assert.True(t, heartbeatReceived, "Did not receive heartbeat")
}

func TestProgressTracker_Shutdown(t *testing.T) {
	// Create a logger
	logger := setupLogger(t)

	// Create a tracker
	tracker := NewProgressTrackerWithConfig(logger, 10, 100*time.Millisecond)

	// Start an operation
	operationID := "test-shutdown-op"
	_, _, err := tracker.StartOperation(operationID)
	require.NoError(t, err)

	// Subscribe to events
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	eventChan, err := tracker.SubscribeToEvents(ctx, operationID)
	require.NoError(t, err)

	// Receive the initial status event
	event := <-eventChan
	assert.Equal(t, events.EventTypeStatus, event.Type())

	// Shutdown the tracker
	tracker.Shutdown()

	// Wait a bit to allow the shutdown to complete
	time.Sleep(200 * time.Millisecond)

	// Check that the operation was removed
	_, err = tracker.GetOperation(operationID)
	assert.Error(t, err)
}
