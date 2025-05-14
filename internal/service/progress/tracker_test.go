package progress

import (
	"context"
	"testing"
	"time"

	"github.com/lspecian/maas-mcp-server/internal/logging"
	"github.com/lspecian/maas-mcp-server/internal/transport/mcp/events"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupLogger(t *testing.T) *logging.Logger {
	config := logging.DefaultLoggerConfig()
	config.Level = "debug"
	logger, err := logging.NewEnhancedLogger(config)
	require.NoError(t, err)
	return logger
}

func TestProgressTracker_StartOperation(t *testing.T) {
	// Create a logger
	logger := setupLogger(t)

	// Create a tracker
	tracker := NewProgressTracker(logger)

	// Start an operation
	operationID := "test-operation-1"
	reporter, _, err := tracker.StartOperation(operationID)
	require.NoError(t, err)
	require.NotNil(t, reporter)

	// Check that the reporter has the correct operation ID
	assert.Equal(t, operationID, reporter.OperationID())

	// Check that the operation was created
	opCtx, err := tracker.GetOperation(operationID)
	require.NoError(t, err)
	require.NotNil(t, opCtx)

	// Check the operation properties
	assert.Equal(t, operationID, opCtx.operationID)
	assert.Equal(t, events.StatusInitializing, opCtx.status)
	assert.Equal(t, 0.0, opCtx.progress)
	assert.Len(t, opCtx.events, 1)
	assert.Equal(t, events.EventTypeStatus, opCtx.events[0].Type())

	// Try to start an operation with the same ID
	_, _, err = tracker.StartOperation(operationID)
	assert.Error(t, err)
}

func TestProgressTracker_UpdateProgress(t *testing.T) {
	// Create a logger
	logger := setupLogger(t)

	// Create a tracker
	tracker := NewProgressTracker(logger)

	// Start an operation
	operationID := "test-operation-2"
	reporter, _, err := tracker.StartOperation(operationID)
	require.NoError(t, err)

	// Update progress
	err = reporter.ReportProgress(50.0, "Half way there", nil)
	require.NoError(t, err)

	// Check that the operation was updated
	opCtx, err := tracker.GetOperation(operationID)
	require.NoError(t, err)
	assert.Equal(t, events.StatusInProgress, opCtx.status)
	assert.Equal(t, 50.0, opCtx.progress)
	assert.Len(t, opCtx.events, 3) // Initial status event + status change event + progress event

	// Update progress again
	err = reporter.ReportProgress(75.0, "Almost there", nil)
	require.NoError(t, err)

	// Check that the operation was updated
	opCtx, err = tracker.GetOperation(operationID)
	require.NoError(t, err)
	assert.Equal(t, events.StatusInProgress, opCtx.status)
	assert.Equal(t, 75.0, opCtx.progress)
	assert.Len(t, opCtx.events, 4) // Previous events + new progress event
}

func TestProgressTracker_CompleteOperation(t *testing.T) {
	// Create a logger
	logger := setupLogger(t)

	// Create a tracker
	tracker := NewProgressTracker(logger)

	// Start an operation
	operationID := "test-operation-3"
	reporter, _, err := tracker.StartOperation(operationID)
	require.NoError(t, err)

	// Update progress
	err = reporter.ReportProgress(50.0, "Half way there", nil)
	require.NoError(t, err)

	// Complete the operation
	result := map[string]string{"status": "success"}
	err = reporter.ReportCompletion(result, "Operation completed successfully")
	require.NoError(t, err)

	// Check that the operation was completed
	opCtx, err := tracker.GetOperation(operationID)
	require.NoError(t, err)
	assert.Equal(t, events.StatusComplete, opCtx.status)
	assert.Equal(t, 100.0, opCtx.progress)
	assert.Equal(t, result, opCtx.result)
	assert.Len(t, opCtx.events, 5) // Initial status + status change + progress + status change + completion

	// Try to update progress after completion
	err = reporter.ReportProgress(75.0, "Too late", nil)
	assert.Error(t, err)

	// Try to complete the operation again
	err = reporter.ReportCompletion(result, "Already completed")
	assert.Error(t, err)
}

func TestProgressTracker_FailOperation(t *testing.T) {
	// Create a logger
	logger := setupLogger(t)

	// Create a tracker
	tracker := NewProgressTracker(logger)

	// Start an operation
	operationID := "test-operation-4"
	reporter, _, err := tracker.StartOperation(operationID)
	require.NoError(t, err)

	// Update progress
	err = reporter.ReportProgress(50.0, "Half way there", nil)
	require.NoError(t, err)

	// Fail the operation
	err = reporter.ReportError("Something went wrong", 500, nil, false)
	require.NoError(t, err)

	// Check that the operation was failed
	opCtx, err := tracker.GetOperation(operationID)
	require.NoError(t, err)
	assert.Equal(t, events.StatusFailed, opCtx.status)
	assert.Equal(t, "Something went wrong", opCtx.error)
	assert.Equal(t, 500, opCtx.errorCode)
	assert.Len(t, opCtx.events, 5) // Initial status + status change + progress + status change + error

	// Try to update progress after failure
	err = reporter.ReportProgress(75.0, "Too late", nil)
	assert.Error(t, err)

	// Try to complete the operation after failure
	err = reporter.ReportCompletion(nil, "Cannot complete")
	assert.Error(t, err)
}

func TestProgressTracker_LogOperation(t *testing.T) {
	// Create a logger
	logger := setupLogger(t)

	// Create a tracker
	tracker := NewProgressTracker(logger)

	// Start an operation
	operationID := "test-operation-5"
	reporter, _, err := tracker.StartOperation(operationID)
	require.NoError(t, err)

	// Log a message
	err = reporter.ReportLog(events.LogLevelInfo, "Processing step 1", "worker-1", nil)
	require.NoError(t, err)

	// Check that the log was recorded
	opCtx, err := tracker.GetOperation(operationID)
	require.NoError(t, err)
	assert.Len(t, opCtx.events, 2) // Initial status + log
	assert.Equal(t, events.EventTypeLog, opCtx.events[1].Type())

	// Log another message
	err = reporter.ReportLog(events.LogLevelWarning, "Slow processing detected", "worker-1", nil)
	require.NoError(t, err)

	// Check that the log was recorded
	opCtx, err = tracker.GetOperation(operationID)
	require.NoError(t, err)
	assert.Len(t, opCtx.events, 3) // Initial status + first log + second log
}

func TestProgressTracker_UpdateStatus(t *testing.T) {
	// Create a logger
	logger := setupLogger(t)

	// Create a tracker
	tracker := NewProgressTracker(logger)

	// Start an operation
	operationID := "test-operation-6"
	reporter, _, err := tracker.StartOperation(operationID)
	require.NoError(t, err)

	// Update status
	err = reporter.ReportStatus(events.StatusInitializing, events.StatusPaused, "Operation paused", nil)
	require.NoError(t, err)

	// Check that the status was updated
	opCtx, err := tracker.GetOperation(operationID)
	require.NoError(t, err)
	assert.Equal(t, events.StatusPaused, opCtx.status)
	assert.Len(t, opCtx.events, 2) // Initial status + status change

	// Update status again
	err = reporter.ReportStatus(events.StatusPaused, events.StatusInProgress, "Operation resumed", nil)
	require.NoError(t, err)

	// Check that the status was updated
	opCtx, err = tracker.GetOperation(operationID)
	require.NoError(t, err)
	assert.Equal(t, events.StatusInProgress, opCtx.status)
	assert.Len(t, opCtx.events, 3) // Initial status + first status change + second status change
}

func TestProgressTracker_GetOperationEvents(t *testing.T) {
	// Create a logger
	logger := setupLogger(t)

	// Create a tracker
	tracker := NewProgressTracker(logger)

	// Start an operation
	operationID := "test-operation-7"
	reporter, _, err := tracker.StartOperation(operationID)
	require.NoError(t, err)

	// Update progress
	err = reporter.ReportProgress(50.0, "Half way there", nil)
	require.NoError(t, err)

	// Log a message
	err = reporter.ReportLog(events.LogLevelInfo, "Processing step 1", "worker-1", nil)
	require.NoError(t, err)

	// Get operation events
	evts, err := tracker.GetOperationEvents(operationID)
	require.NoError(t, err)
	assert.Len(t, evts, 4) // Initial status + status change + progress + log

	// Check event types
	assert.Equal(t, string(events.EventTypeStatus), string(evts[0].Type()))
	assert.Equal(t, string(events.EventTypeStatus), string(evts[1].Type()))
	assert.Equal(t, string(events.EventTypeProgress), string(evts[2].Type()))
	assert.Equal(t, string(events.EventTypeLog), string(evts[3].Type()))
}

func TestProgressTracker_SubscribeToEvents(t *testing.T) {
	// Create a logger
	logger := setupLogger(t)

	// Create a tracker
	tracker := NewProgressTracker(logger)

	// Start an operation
	operationID := "test-operation-8"
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

	// Update progress
	err = reporter.ReportProgress(50.0, "Half way there", nil)
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
	assert.Equal(t, 50.0, progressEvent.Progress)

	// Log a message
	err = reporter.ReportLog(events.LogLevelInfo, "Processing step 1", "worker-1", nil)
	require.NoError(t, err)

	// Receive the log event
	event = <-eventChan
	assert.Equal(t, events.EventTypeLog, event.Type())
	logEvent, ok := event.(*events.LogEvent)
	require.True(t, ok)
	assert.Equal(t, operationID, logEvent.OperationID)
	assert.Equal(t, "Processing step 1", logEvent.Message)

	// Complete the operation
	err = reporter.ReportCompletion(nil, "Operation completed successfully")
	require.NoError(t, err)

	// Receive the status change event
	event = <-eventChan
	assert.Equal(t, events.EventTypeStatus, event.Type())
	statusEvent, ok = event.(*events.StatusEvent)
	require.True(t, ok)
	assert.Equal(t, operationID, statusEvent.OperationID)
	assert.Equal(t, events.StatusComplete, statusEvent.CurrentStatus)

	// Receive the completion event
	event = <-eventChan
	assert.Equal(t, events.EventTypeCompletion, event.Type())
	completionEvent, ok := event.(*events.CompletionEvent)
	require.True(t, ok)
	assert.Equal(t, operationID, completionEvent.OperationID)
}

func TestProgressTracker_CleanupOperation(t *testing.T) {
	// Create a logger
	logger := setupLogger(t)

	// Create a tracker
	tracker := NewProgressTracker(logger)

	// Start an operation
	operationID := "test-operation-9"
	_, _, err := tracker.StartOperation(operationID)
	require.NoError(t, err)

	// Cleanup the operation
	err = tracker.CleanupOperation(operationID)
	require.NoError(t, err)

	// Check that the operation was removed
	_, err = tracker.GetOperation(operationID)
	assert.Error(t, err)

	// Try to cleanup a non-existent operation
	err = tracker.CleanupOperation("non-existent")
	assert.Error(t, err)
}

func TestProgressTracker_ConcurrentOperations(t *testing.T) {
	// Create a logger
	logger := setupLogger(t)

	// Create a tracker
	tracker := NewProgressTracker(logger)

	// Start multiple operations
	op1ID := "test-operation-10"
	op2ID := "test-operation-11"
	op3ID := "test-operation-12"

	reporter1, _, err := tracker.StartOperation(op1ID)
	require.NoError(t, err)

	reporter2, _, err := tracker.StartOperation(op2ID)
	require.NoError(t, err)

	reporter3, _, err := tracker.StartOperation(op3ID)
	require.NoError(t, err)

	// Update progress for each operation
	err = reporter1.ReportProgress(25.0, "Operation 1 progress", nil)
	require.NoError(t, err)

	err = reporter2.ReportProgress(50.0, "Operation 2 progress", nil)
	require.NoError(t, err)

	err = reporter3.ReportProgress(75.0, "Operation 3 progress", nil)
	require.NoError(t, err)

	// Check that each operation has the correct progress
	opCtx1, err := tracker.GetOperation(op1ID)
	require.NoError(t, err)
	assert.Equal(t, 25.0, opCtx1.progress)

	opCtx2, err := tracker.GetOperation(op2ID)
	require.NoError(t, err)
	assert.Equal(t, 50.0, opCtx2.progress)

	opCtx3, err := tracker.GetOperation(op3ID)
	require.NoError(t, err)
	assert.Equal(t, 75.0, opCtx3.progress)

	// Complete one operation
	err = reporter2.ReportCompletion(nil, "Operation 2 completed")
	require.NoError(t, err)

	// Fail another operation
	err = reporter3.ReportError("Operation 3 failed", 500, nil, false)
	require.NoError(t, err)

	// Check the status of each operation
	opCtx1, err = tracker.GetOperation(op1ID)
	require.NoError(t, err)
	assert.Equal(t, events.StatusInProgress, opCtx1.status)

	opCtx2, err = tracker.GetOperation(op2ID)
	require.NoError(t, err)
	assert.Equal(t, events.StatusComplete, opCtx2.status)

	opCtx3, err = tracker.GetOperation(op3ID)
	require.NoError(t, err)
	assert.Equal(t, events.StatusFailed, opCtx3.status)
}

func TestProgressReporter_StartTime(t *testing.T) {
	// Create a logger
	logger := setupLogger(t)

	// Create a tracker
	tracker := NewProgressTracker(logger)

	// Start an operation
	operationID := "test-operation-13"
	reporter, _, err := tracker.StartOperation(operationID)
	require.NoError(t, err)

	// Check that the start time is set
	startTime := reporter.StartTime()
	assert.False(t, startTime.IsZero())
	assert.True(t, startTime.Before(time.Now()) || startTime.Equal(time.Now()))
}
