package progress

import (
	"context"
	"testing"
	"time"

	"github.com/lspecian/maas-mcp-server/internal/transport/mcp/events"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCancellationManager_RegisterOperation(t *testing.T) {
	// Create a logger
	logger := setupLogger(t)

	// Create a cancellation manager
	manager := NewCancellationManager(logger, 100*time.Millisecond)

	// Register an operation
	operationID := "test-operation-1"
	ctx, cancel := manager.RegisterOperation(operationID)
	defer cancel()

	// Check that the context is not nil
	require.NotNil(t, ctx)

	// Check that the operation is registered
	opCtx, exists := manager.GetOperationContext(operationID)
	assert.True(t, exists)
	assert.Equal(t, ctx, opCtx)

	// Check that the operation is not cancelled
	assert.False(t, manager.IsOperationCancelled(operationID))
}

func TestCancellationManager_ClientConnectedDisconnected(t *testing.T) {
	// Create a logger
	logger := setupLogger(t)

	// Create a cancellation manager with a short disconnect timeout
	disconnectTimeout := 100 * time.Millisecond
	manager := NewCancellationManager(logger, disconnectTimeout)

	// Register an operation
	operationID := "test-operation-2"
	ctx, cancel := manager.RegisterOperation(operationID)
	defer cancel()

	// Notify that a client has connected
	manager.ClientConnected(operationID)

	// Check that the operation is not cancelled
	assert.False(t, manager.IsOperationCancelled(operationID))

	// Notify that the client has disconnected
	manager.ClientDisconnected(operationID)

	// Wait for the disconnect timeout to expire
	time.Sleep(disconnectTimeout * 2)

	// Check that the operation is cancelled
	assert.True(t, manager.IsOperationCancelled(operationID))

	// Check that the context is cancelled
	select {
	case <-ctx.Done():
		// Context is cancelled, as expected
	default:
		t.Fatal("Context should be cancelled")
	}
}

func TestCancellationManager_MultipleClients(t *testing.T) {
	// Create a logger
	logger := setupLogger(t)

	// Create a cancellation manager with a short disconnect timeout
	disconnectTimeout := 100 * time.Millisecond
	manager := NewCancellationManager(logger, disconnectTimeout)

	// Register an operation
	operationID := "test-operation-3"
	ctx, cancel := manager.RegisterOperation(operationID)
	defer cancel()

	// Notify that two clients have connected
	manager.ClientConnected(operationID)
	manager.ClientConnected(operationID)

	// Notify that one client has disconnected
	manager.ClientDisconnected(operationID)

	// Wait for the disconnect timeout to expire
	time.Sleep(disconnectTimeout * 2)

	// Check that the operation is not cancelled (one client still connected)
	assert.False(t, manager.IsOperationCancelled(operationID))

	// Notify that the second client has disconnected
	manager.ClientDisconnected(operationID)

	// Wait for the disconnect timeout to expire
	time.Sleep(disconnectTimeout * 2)

	// Check that the operation is cancelled
	assert.True(t, manager.IsOperationCancelled(operationID))

	// Check that the context is cancelled
	select {
	case <-ctx.Done():
		// Context is cancelled, as expected
	default:
		t.Fatal("Context should be cancelled")
	}
}

func TestCancellationManager_ExplicitCancel(t *testing.T) {
	// Create a logger
	logger := setupLogger(t)

	// Create a cancellation manager
	manager := NewCancellationManager(logger, 100*time.Millisecond)

	// Register an operation
	operationID := "test-operation-4"
	ctx, cancel := manager.RegisterOperation(operationID)
	defer cancel()

	// Notify that a client has connected
	manager.ClientConnected(operationID)

	// Explicitly cancel the operation
	manager.CancelOperation(operationID)

	// Check that the operation is cancelled
	assert.True(t, manager.IsOperationCancelled(operationID))

	// Check that the context is cancelled
	select {
	case <-ctx.Done():
		// Context is cancelled, as expected
	default:
		t.Fatal("Context should be cancelled")
	}
}

func TestCancellationManager_Cleanup(t *testing.T) {
	// Create a logger
	logger := setupLogger(t)

	// Create a cancellation manager
	manager := NewCancellationManager(logger, 100*time.Millisecond)

	// Register an operation
	operationID := "test-operation-5"
	ctx, _ := manager.RegisterOperation(operationID)

	// Clean up the operation
	manager.CleanupOperation(operationID)

	// Check that the operation is no longer registered
	_, exists := manager.GetOperationContext(operationID)
	assert.False(t, exists)

	// Check that the context is cancelled
	select {
	case <-ctx.Done():
		// Context is cancelled, as expected
	default:
		t.Fatal("Context should be cancelled")
	}
}

func TestCancellationManager_Shutdown(t *testing.T) {
	// Create a logger
	logger := setupLogger(t)

	// Create a cancellation manager
	manager := NewCancellationManager(logger, 100*time.Millisecond)

	// Register multiple operations
	op1ID := "test-operation-6"
	op2ID := "test-operation-7"
	ctx1, _ := manager.RegisterOperation(op1ID)
	ctx2, _ := manager.RegisterOperation(op2ID)

	// Shutdown the manager
	manager.Shutdown()

	// Check that all contexts are cancelled
	select {
	case <-ctx1.Done():
		// Context is cancelled, as expected
	default:
		t.Fatal("Context 1 should be cancelled")
	}

	select {
	case <-ctx2.Done():
		// Context is cancelled, as expected
	default:
		t.Fatal("Context 2 should be cancelled")
	}

	// Check that the operations are no longer registered
	_, exists1 := manager.GetOperationContext(op1ID)
	_, exists2 := manager.GetOperationContext(op2ID)
	assert.False(t, exists1)
	assert.False(t, exists2)
}

func TestProgressTracker_CancellationIntegration(t *testing.T) {
	// Create a logger
	logger := setupLogger(t)

	// Create a tracker with a short disconnect timeout
	disconnectTimeout := 100 * time.Millisecond
	tracker := NewProgressTrackerWithFullConfig(logger, 10, 1*time.Second, disconnectTimeout)

	// Start an operation
	operationID := "test-cancel-op"
	reporter, opCtx, err := tracker.StartOperation(operationID)
	require.NoError(t, err)
	require.NotNil(t, opCtx)

	// Check that the operation context is not cancelled
	select {
	case <-opCtx.Done():
		t.Fatal("Operation context should not be cancelled yet")
	default:
		// Not cancelled, as expected
	}

	// Subscribe to events
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	eventChan, err := tracker.SubscribeToEvents(ctx, operationID)
	require.NoError(t, err)

	// Receive the initial status event
	_ = <-eventChan

	// Update progress
	err = reporter.ReportProgress(50.0, "Half way there", nil)
	require.NoError(t, err)

	// Receive the status change and progress events
	<-eventChan // Status change
	<-eventChan // Progress

	// Cancel the subscription (simulating client disconnection)
	cancel()

	// Wait for the disconnect timeout to expire
	time.Sleep(disconnectTimeout * 2)

	// Check if the operation was cancelled
	isCancelled, err := tracker.IsOperationCancelled(operationID)
	require.NoError(t, err)
	assert.True(t, isCancelled)

	// Check that the operation context is cancelled
	select {
	case <-opCtx.Done():
		// Context is cancelled, as expected
	default:
		t.Fatal("Operation context should be cancelled")
	}

	// Try to update progress after cancellation
	err = reporter.ReportProgress(75.0, "Too late", nil)
	assert.Error(t, err)
}

func TestProgressTracker_ExplicitCancellation(t *testing.T) {
	// Create a logger
	logger := setupLogger(t)

	// Create a tracker
	tracker := NewProgressTracker(logger)

	// Start an operation
	operationID := "test-explicit-cancel-op"
	reporter, opCtx, err := tracker.StartOperation(operationID)
	require.NoError(t, err)
	require.NotNil(t, opCtx)

	// Subscribe to events
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	eventChan, err := tracker.SubscribeToEvents(ctx, operationID)
	require.NoError(t, err)

	// Receive the initial status event
	<-eventChan

	// Update progress
	err = reporter.ReportProgress(50.0, "Half way there", nil)
	require.NoError(t, err)

	// Receive the status change and progress events
	<-eventChan // Status change
	<-eventChan // Progress

	// Explicitly cancel the operation
	err = tracker.CancelOperation(operationID)
	require.NoError(t, err)

	// Receive the cancellation event
	event := <-eventChan
	assert.Equal(t, events.EventTypeStatus, event.Type())
	statusEvent, ok := event.(*events.StatusEvent)
	require.True(t, ok)
	assert.Equal(t, events.StatusCancelled, statusEvent.CurrentStatus)

	// Check if the operation was cancelled
	isCancelled, err := tracker.IsOperationCancelled(operationID)
	require.NoError(t, err)
	assert.True(t, isCancelled)

	// Check that the operation context is cancelled
	select {
	case <-opCtx.Done():
		// Context is cancelled, as expected
	default:
		t.Fatal("Operation context should be cancelled")
	}

	// Try to update progress after cancellation
	err = reporter.ReportProgress(75.0, "Too late", nil)
	assert.Error(t, err)
}
