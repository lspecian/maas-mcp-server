package progress

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/lspecian/maas-mcp-server/internal/logging"
	"github.com/lspecian/maas-mcp-server/internal/transport/mcp/events"
)

const (
	// DefaultBufferSize is the default number of events to store in the buffer
	DefaultBufferSize = 100

	// DefaultHeartbeatInterval is the default interval between heartbeats
	DefaultHeartbeatInterval = 30 * time.Second
)

// ProgressTracker is a service that tracks the progress of long-running operations.
// It maintains a registry of active operations and their progress, and provides
// methods for starting, updating, and completing operations.
type ProgressTracker struct {
	// operations is a map of operation IDs to operation contexts
	operations map[string]*operationContext

	// eventChannels is a map of operation IDs to event channels
	eventChannels map[string]chan events.Event

	// mutex is used to protect access to the operations and eventChannels maps
	mutex sync.RWMutex

	// logger is used for logging
	logger *logging.Logger

	// reconnectionManager handles reconnection support
	reconnectionManager *ReconnectionManager

	// heartbeatManager handles heartbeats for active connections
	heartbeatManager *HeartbeatManager

	// cancellationManager handles operation cancellation when clients disconnect
	cancellationManager *CancellationManager

	// bufferSize is the maximum number of events to store in each buffer
	bufferSize int

	// heartbeatInterval is the interval between heartbeats
	heartbeatInterval time.Duration

	// disconnectTimeout is the duration to wait after a client disconnects
	// before cancelling the operation
	disconnectTimeout time.Duration
}

// operationContext represents the context of an operation
type operationContext struct {
	// operationID is the ID of the operation
	operationID string

	// startTime is the time the operation started
	startTime time.Time

	// lastUpdateTime is the time of the last update
	lastUpdateTime time.Time

	// status is the current status of the operation
	status events.StatusType

	// progress is the current progress of the operation (0-100)
	progress float64

	// result is the result of the operation (if completed)
	result interface{}

	// error is the error that occurred (if failed)
	error string

	// errorCode is the error code (if failed)
	errorCode int

	// events is a list of all events for this operation
	events []events.Event

	// mutex is used to protect access to the operation context
	mutex sync.RWMutex
}

// NewProgressTracker creates a new ProgressTracker
func NewProgressTracker(logger *logging.Logger) *ProgressTracker {
	return NewProgressTrackerWithConfig(logger, DefaultBufferSize, DefaultHeartbeatInterval)
}

// NewProgressTrackerWithConfig creates a new ProgressTracker with custom configuration
func NewProgressTrackerWithConfig(logger *logging.Logger, bufferSize int, heartbeatInterval time.Duration) *ProgressTracker {
	return NewProgressTrackerWithFullConfig(logger, bufferSize, heartbeatInterval, 30*time.Second)
}

// NewProgressTrackerWithFullConfig creates a new ProgressTracker with full custom configuration
func NewProgressTrackerWithFullConfig(logger *logging.Logger, bufferSize int, heartbeatInterval time.Duration, disconnectTimeout time.Duration) *ProgressTracker {
	// Create the reconnection manager
	reconnectionManager := NewReconnectionManager(bufferSize)

	// Create the heartbeat manager
	heartbeatManager := NewHeartbeatManager(heartbeatInterval, logger)

	// Create the cancellation manager
	cancellationManager := NewCancellationManager(logger, disconnectTimeout)

	// Start the heartbeat manager
	heartbeatManager.Start()

	return &ProgressTracker{
		operations:          make(map[string]*operationContext),
		eventChannels:       make(map[string]chan events.Event),
		logger:              logger,
		reconnectionManager: reconnectionManager,
		heartbeatManager:    heartbeatManager,
		cancellationManager: cancellationManager,
		bufferSize:          bufferSize,
		heartbeatInterval:   heartbeatInterval,
		disconnectTimeout:   disconnectTimeout,
	}
}

// StartOperation starts tracking a new operation
func (t *ProgressTracker) StartOperation(operationID string) (ProgressReporter, context.Context, error) {
	t.mutex.Lock()
	defer t.mutex.Unlock()

	// Check if operation already exists
	if _, exists := t.operations[operationID]; exists {
		return nil, nil, fmt.Errorf("operation with ID %s already exists", operationID)
	}

	// Register the operation with the cancellation manager
	ctx, _ := t.cancellationManager.RegisterOperation(operationID)

	// Create a new operation context
	opCtx := &operationContext{
		operationID:    operationID,
		startTime:      time.Now(),
		lastUpdateTime: time.Now(),
		status:         events.StatusInitializing,
		progress:       0.0,
		events:         make([]events.Event, 0),
	}

	// Create a new event channel
	eventChan := make(chan events.Event, 100) // Buffer size of 100 events

	// Store the operation context and event channel
	t.operations[operationID] = opCtx
	t.eventChannels[operationID] = eventChan

	// Create a status event for the operation start
	statusEvent := events.NewStatusEvent(
		operationID,
		"", // No previous status for a new operation
		events.StatusInitializing,
		fmt.Sprintf("Operation %s started", operationID),
		nil,
	)

	// Store the event
	opCtx.events = append(opCtx.events, statusEvent)

	// Add the event to the reconnection buffer
	t.reconnectionManager.AddEvent(statusEvent)

	// Send the event to the channel
	select {
	case eventChan <- statusEvent:
		// Event sent successfully
	default:
		// Channel is full, log a warning
		t.logger.Warn("Event channel is full, dropping status event")
	}

	// Return a new reporter for this operation and the cancellation context
	return &trackerReporter{
		tracker:     t,
		operationID: operationID,
		startTime:   opCtx.startTime,
	}, ctx, nil
}

// GetOperation returns the operation context for the given operation ID
func (t *ProgressTracker) GetOperation(operationID string) (*operationContext, error) {
	t.mutex.RLock()
	defer t.mutex.RUnlock()

	opCtx, exists := t.operations[operationID]
	if !exists {
		return nil, fmt.Errorf("operation with ID %s not found", operationID)
	}

	return opCtx, nil
}

// GetOperationEvents returns all events for the given operation ID
func (t *ProgressTracker) GetOperationEvents(operationID string) ([]events.Event, error) {
	opCtx, err := t.GetOperation(operationID)
	if err != nil {
		return nil, err
	}

	opCtx.mutex.RLock()
	defer opCtx.mutex.RUnlock()

	// Return a copy of the events slice to avoid race conditions
	eventsCopy := make([]events.Event, len(opCtx.events))
	copy(eventsCopy, opCtx.events)

	return eventsCopy, nil
}

// SubscribeToEvents returns a channel that will receive events for the given operation ID
func (t *ProgressTracker) SubscribeToEvents(ctx context.Context, operationID string) (<-chan events.Event, error) {
	return t.SubscribeToEventsWithLastEventID(ctx, operationID, "")
}

// GetOperationContext returns the cancellation context for an operation
func (t *ProgressTracker) GetOperationContext(operationID string) (context.Context, error) {
	ctx, exists := t.cancellationManager.GetOperationContext(operationID)
	if !exists {
		return nil, fmt.Errorf("operation with ID %s not found", operationID)
	}
	return ctx, nil
}

// IsOperationCancelled checks if an operation has been cancelled
func (t *ProgressTracker) IsOperationCancelled(operationID string) (bool, error) {
	_, err := t.GetOperation(operationID)
	if err != nil {
		return false, err
	}

	return t.cancellationManager.IsOperationCancelled(operationID), nil
}

// CancelOperation explicitly cancels an operation
func (t *ProgressTracker) CancelOperation(operationID string) error {
	_, err := t.GetOperation(operationID)
	if err != nil {
		return err
	}

	t.cancellationManager.CancelOperation(operationID)

	// Create a cancellation event
	statusEvent := events.NewStatusEvent(
		operationID,
		events.StatusInProgress,
		events.StatusCancelled,
		fmt.Sprintf("Operation %s cancelled", operationID),
		nil,
	)

	// Get the operation context
	opCtx, _ := t.GetOperation(operationID)

	opCtx.mutex.Lock()
	// Update operation context
	opCtx.status = events.StatusCancelled
	opCtx.lastUpdateTime = time.Now()

	// Store the event
	opCtx.events = append(opCtx.events, statusEvent)
	opCtx.mutex.Unlock()

	// Add the event to the reconnection buffer
	t.reconnectionManager.AddEvent(statusEvent)

	// Send the event to the channel
	t.mutex.RLock()
	eventChan, exists := t.eventChannels[operationID]
	t.mutex.RUnlock()

	if exists {
		select {
		case eventChan <- statusEvent:
			// Event sent successfully
		default:
			// Channel is full, log a warning
			t.logger.Warn("Event channel is full, dropping cancellation event")
		}
	}

	return nil
}

// SubscribeToEventsWithLastEventID returns a channel that will receive events for the given operation ID,
// starting from the event after the one with the specified ID
func (t *ProgressTracker) SubscribeToEventsWithLastEventID(ctx context.Context, operationID string, lastEventID string) (<-chan events.Event, error) {
	// Create a merged context that will be cancelled if either the provided context
	// or the operation's cancellation context is cancelled
	opCtx, exists := t.cancellationManager.GetOperationContext(operationID)
	if exists {
		var cancel context.CancelFunc
		ctx, cancel = context.WithCancel(ctx)

		// Monitor the operation context for cancellation
		go func() {
			select {
			case <-opCtx.Done():
				cancel()
			case <-ctx.Done():
				// Context was already cancelled
			}
		}()
	}
	t.mutex.RLock()
	defer t.mutex.RUnlock()

	// Check if operation exists
	if _, exists := t.operations[operationID]; !exists {
		return nil, fmt.Errorf("operation with ID %s not found", operationID)
	}

	// Create a new channel for the subscriber
	subscriberChan := make(chan events.Event, t.bufferSize)

	// Get the event channel for this operation
	eventChan, exists := t.eventChannels[operationID]
	if !exists {
		return nil, fmt.Errorf("event channel for operation %s not found", operationID)
	}

	// Register the connection with the heartbeat manager
	t.heartbeatManager.RegisterConnection(operationID, subscriberChan)

	// Notify the cancellation manager that a client has connected
	t.cancellationManager.ClientConnected(operationID)

	// If lastEventID is provided, send all events that occurred after it
	if lastEventID != "" {
		missedEvents := t.reconnectionManager.GetEventsAfterID(operationID, lastEventID)
		t.logger.Debug("Sending missed events on reconnection", "operation_id", operationID, "last_event_id", lastEventID, "event_count", len(missedEvents))

		// Send the missed events in a separate goroutine to avoid blocking
		go func() {
			for _, event := range missedEvents {
				select {
				case subscriberChan <- event:
					// Event sent successfully
				default:
					// Subscriber's channel is full, log a warning
					t.logger.Warn("Subscriber's channel is full, dropping missed event")
				}
			}
		}()
	}

	// Start a goroutine to forward events from the operation's channel to the subscriber's channel
	go func() {
		defer func() {
			// Unregister the connection from the heartbeat manager when done
			t.heartbeatManager.UnregisterConnection(operationID)

			// Notify the cancellation manager that a client has disconnected
			t.cancellationManager.ClientDisconnected(operationID)

			close(subscriberChan)
		}()

		for {
			select {
			case <-ctx.Done():
				// Context was canceled, stop forwarding events
				return
			case event, ok := <-eventChan:
				if !ok {
					// Channel was closed, stop forwarding events
					return
				}

				// Add the event to the reconnection buffer
				t.reconnectionManager.AddEvent(event)

				// Forward the event to the subscriber
				select {
				case subscriberChan <- event:
					// Event forwarded successfully
				default:
					// Subscriber's channel is full, log a warning
					t.logger.Warn("Subscriber's channel is full, dropping event")
				}
			}
		}
	}()

	return subscriberChan, nil
}

// CompleteOperation marks an operation as completed
func (t *ProgressTracker) CompleteOperation(operationID string, result interface{}, message string) error {
	opCtx, err := t.GetOperation(operationID)
	if err != nil {
		return err
	}

	opCtx.mutex.Lock()
	defer opCtx.mutex.Unlock()

	// Check if operation is already completed or failed
	if opCtx.status == events.StatusComplete || opCtx.status == events.StatusFailed {
		return fmt.Errorf("operation with ID %s is already in terminal state: %s", operationID, opCtx.status)
	}

	// Update operation context
	previousStatus := opCtx.status
	opCtx.status = events.StatusComplete
	opCtx.progress = 100.0
	opCtx.result = result
	opCtx.lastUpdateTime = time.Now()

	// Calculate duration
	duration := opCtx.lastUpdateTime.Sub(opCtx.startTime).Seconds()

	// Create a status event
	statusEvent := events.NewStatusEvent(
		operationID,
		previousStatus,
		events.StatusComplete,
		message,
		nil,
	)

	// Create a completion event
	completionEvent := events.NewCompletionEvent(
		operationID,
		result,
		message,
		duration,
	)

	// Store the events
	opCtx.events = append(opCtx.events, statusEvent, completionEvent)

	// Add the events to the reconnection buffer
	t.reconnectionManager.AddEvent(statusEvent)
	t.reconnectionManager.AddEvent(completionEvent)

	// Send the events to the channel
	t.mutex.RLock()
	eventChan, exists := t.eventChannels[operationID]
	t.mutex.RUnlock()

	if exists {
		select {
		case eventChan <- statusEvent:
			// Event sent successfully
		default:
			// Channel is full, log a warning
			t.logger.Warn("Event channel is full, dropping status event")
		}

		select {
		case eventChan <- completionEvent:
			// Event sent successfully
		default:
			// Channel is full, log a warning
			t.logger.Warn("Event channel is full, dropping completion event")
		}
	}

	return nil
}

// FailOperation marks an operation as failed
func (t *ProgressTracker) FailOperation(operationID string, err string, code int, details interface{}, recoverable bool) error {
	opCtx, opErr := t.GetOperation(operationID)
	if opErr != nil {
		return opErr
	}

	opCtx.mutex.Lock()
	defer opCtx.mutex.Unlock()

	// Check if operation is already completed or failed
	if opCtx.status == events.StatusComplete || opCtx.status == events.StatusFailed {
		return fmt.Errorf("operation with ID %s is already in terminal state: %s", operationID, opCtx.status)
	}

	// Update operation context
	previousStatus := opCtx.status
	opCtx.status = events.StatusFailed
	opCtx.error = err
	opCtx.errorCode = code
	opCtx.lastUpdateTime = time.Now()

	// Create a status event
	statusEvent := events.NewStatusEvent(
		operationID,
		previousStatus,
		events.StatusFailed,
		err,
		details,
	)

	// Create an error event
	errorEvent := events.NewErrorEvent(
		operationID,
		err,
		code,
		details,
		recoverable,
	)

	// Store the events
	opCtx.events = append(opCtx.events, statusEvent, errorEvent)

	// Add the events to the reconnection buffer
	t.reconnectionManager.AddEvent(statusEvent)
	t.reconnectionManager.AddEvent(errorEvent)

	// Send the events to the channel
	t.mutex.RLock()
	eventChan, exists := t.eventChannels[operationID]
	t.mutex.RUnlock()

	if exists {
		select {
		case eventChan <- statusEvent:
			// Event sent successfully
		default:
			// Channel is full, log a warning
			t.logger.Warn("Event channel is full, dropping status event")
		}

		select {
		case eventChan <- errorEvent:
			// Event sent successfully
		default:
			// Channel is full, log a warning
			t.logger.Warn("Event channel is full, dropping error event")
		}
	}

	return nil
}

// UpdateProgress updates the progress of an operation
func (t *ProgressTracker) UpdateProgress(operationID string, progress float64, message string, details interface{}) error {
	opCtx, err := t.GetOperation(operationID)
	if err != nil {
		return err
	}

	opCtx.mutex.Lock()
	defer opCtx.mutex.Unlock()

	// Check if operation is already completed or failed
	if opCtx.status == events.StatusComplete || opCtx.status == events.StatusFailed {
		return fmt.Errorf("operation with ID %s is already in terminal state: %s", operationID, opCtx.status)
	}

	// Update operation context
	previousStatus := opCtx.status
	if previousStatus != events.StatusInProgress {
		// If the operation is not already in progress, update the status
		opCtx.status = events.StatusInProgress
	}
	opCtx.progress = progress
	opCtx.lastUpdateTime = time.Now()

	// Create a progress event
	progressEvent := events.NewProgressEvent(
		operationID,
		events.StatusInProgress,
		progress,
		message,
		details,
	)

	// Store the event
	opCtx.events = append(opCtx.events, progressEvent)

	// Add the event to the reconnection buffer
	t.reconnectionManager.AddEvent(progressEvent)

	// If the status changed, create a status event
	var statusEvent events.Event
	if previousStatus != events.StatusInProgress {
		statusEvent = events.NewStatusEvent(
			operationID,
			previousStatus,
			events.StatusInProgress,
			message,
			details,
		)
		// Store the status event
		opCtx.events = append(opCtx.events, statusEvent)

		// Add the status event to the reconnection buffer
		t.reconnectionManager.AddEvent(statusEvent)
	}

	// Send the events to the channel
	t.mutex.RLock()
	eventChan, exists := t.eventChannels[operationID]
	t.mutex.RUnlock()

	if exists {
		// Send the progress event
		select {
		case eventChan <- progressEvent:
			// Event sent successfully
		default:
			// Channel is full, log a warning
			t.logger.Warn("Event channel is full, dropping progress event")
		}

		// Send the status event if it exists
		if statusEvent != nil {
			select {
			case eventChan <- statusEvent:
				// Event sent successfully
			default:
				// Channel is full, log a warning
				t.logger.Warn("Event channel is full, dropping status event")
			}
		}
	}

	return nil
}

// LogOperation logs a message for an operation
func (t *ProgressTracker) LogOperation(operationID string, level events.LogLevel, message string, source string, details interface{}) error {
	opCtx, err := t.GetOperation(operationID)
	if err != nil {
		return err
	}

	opCtx.mutex.Lock()
	defer opCtx.mutex.Unlock()

	// Create a log event
	logEvent := events.NewLogEvent(
		operationID,
		level,
		message,
		source,
		details,
	)

	// Store the event
	opCtx.events = append(opCtx.events, logEvent)

	// Add the event to the reconnection buffer
	t.reconnectionManager.AddEvent(logEvent)

	// Send the event to the channel
	t.mutex.RLock()
	eventChan, exists := t.eventChannels[operationID]
	t.mutex.RUnlock()

	if exists {
		select {
		case eventChan <- logEvent:
			// Event sent successfully
		default:
			// Channel is full, log a warning
			t.logger.Warn("Event channel is full, dropping log event")
		}
	}

	return nil
}

// UpdateStatus updates the status of an operation
func (t *ProgressTracker) UpdateStatus(operationID string, status events.StatusType, message string, details interface{}) error {
	opCtx, err := t.GetOperation(operationID)
	if err != nil {
		return err
	}

	opCtx.mutex.Lock()
	defer opCtx.mutex.Unlock()

	// Check if operation is already completed or failed
	if opCtx.status == events.StatusComplete || opCtx.status == events.StatusFailed {
		return fmt.Errorf("operation with ID %s is already in terminal state: %s", operationID, opCtx.status)
	}

	// Check if the status is actually changing
	if opCtx.status == status {
		return nil
	}

	// Update operation context
	previousStatus := opCtx.status
	opCtx.status = status
	opCtx.lastUpdateTime = time.Now()

	// Create a status event
	statusEvent := events.NewStatusEvent(
		operationID,
		previousStatus,
		status,
		message,
		details,
	)

	// Store the event
	opCtx.events = append(opCtx.events, statusEvent)

	// Add the event to the reconnection buffer
	t.reconnectionManager.AddEvent(statusEvent)

	// Send the event to the channel
	t.mutex.RLock()
	eventChan, exists := t.eventChannels[operationID]
	t.mutex.RUnlock()

	if exists {
		select {
		case eventChan <- statusEvent:
			// Event sent successfully
		default:
			// Channel is full, log a warning
			t.logger.Warn("Event channel is full, dropping status event")
		}
	}

	return nil
}

// CleanupOperation removes an operation from the tracker
func (t *ProgressTracker) CleanupOperation(operationID string) error {
	t.mutex.Lock()
	defer t.mutex.Unlock()

	// Check if operation exists
	if _, exists := t.operations[operationID]; !exists {
		return fmt.Errorf("operation with ID %s not found", operationID)
	}

	// Close the event channel
	if eventChan, exists := t.eventChannels[operationID]; exists {
		close(eventChan)
	}

	// Remove the operation and event channel
	delete(t.operations, operationID)
	delete(t.eventChannels, operationID)

	// Clean up the reconnection buffer for this operation
	t.reconnectionManager.CleanupOperation(operationID)

	// Unregister the operation from the heartbeat manager
	t.heartbeatManager.UnregisterConnection(operationID)

	// Clean up the operation from the cancellation manager
	t.cancellationManager.CleanupOperation(operationID)

	return nil
}

// Shutdown gracefully shuts down the progress tracker
func (t *ProgressTracker) Shutdown() {
	t.logger.Info("Shutting down progress tracker")

	// Stop the heartbeat manager
	t.heartbeatManager.Stop()

	// Shutdown the cancellation manager
	t.cancellationManager.Shutdown()

	// Clean up all operations
	t.mutex.Lock()
	defer t.mutex.Unlock()

	for operationID, eventChan := range t.eventChannels {
		close(eventChan)
		delete(t.operations, operationID)
		delete(t.eventChannels, operationID)
		t.reconnectionManager.CleanupOperation(operationID)
	}
}

// trackerReporter is an implementation of the ProgressReporter interface
// that reports progress to a ProgressTracker
type trackerReporter struct {
	tracker     *ProgressTracker
	operationID string
	startTime   time.Time
}

// ReportProgress reports the current progress of an operation
func (r *trackerReporter) ReportProgress(progress float64, message string, details interface{}) error {
	return r.tracker.UpdateProgress(r.operationID, progress, message, details)
}

// ReportCompletion reports the successful completion of an operation
func (r *trackerReporter) ReportCompletion(result interface{}, message string) error {
	return r.tracker.CompleteOperation(r.operationID, result, message)
}

// ReportError reports an error that occurred during an operation
func (r *trackerReporter) ReportError(err string, code int, details interface{}, recoverable bool) error {
	return r.tracker.FailOperation(r.operationID, err, code, details, recoverable)
}

// ReportLog reports a log message from an operation
func (r *trackerReporter) ReportLog(level events.LogLevel, message string, source string, details interface{}) error {
	return r.tracker.LogOperation(r.operationID, level, message, source, details)
}

// ReportStatus reports a status change for an operation
func (r *trackerReporter) ReportStatus(previousStatus, currentStatus events.StatusType, message string, details interface{}) error {
	return r.tracker.UpdateStatus(r.operationID, currentStatus, message, details)
}

// OperationID returns the ID of the operation this reporter is associated with
func (r *trackerReporter) OperationID() string {
	return r.operationID
}

// StartTime returns the time the operation started
func (r *trackerReporter) StartTime() time.Time {
	return r.startTime
}
