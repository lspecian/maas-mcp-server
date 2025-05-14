package progress

import (
	"context"
	"sync"
	"time"

	"github.com/lspecian/maas-mcp-server/internal/logging"
	"github.com/lspecian/maas-mcp-server/internal/transport/mcp/events"
)

// HeartbeatManager manages heartbeats for active SSE connections
type HeartbeatManager struct {
	// interval is the time between heartbeats
	interval time.Duration

	// connections is a map of operation IDs to heartbeat channels
	connections map[string]chan events.Event

	// mutex protects access to the connections map
	mutex sync.RWMutex

	// logger is used for logging
	logger *logging.Logger

	// sequence is used to generate sequence numbers for heartbeat events
	sequence int64

	// wg is used to wait for all goroutines to finish
	wg sync.WaitGroup

	// ctx is the context for the heartbeat manager
	ctx context.Context

	// cancel is the cancel function for the context
	cancel context.CancelFunc
}

// NewHeartbeatManager creates a new HeartbeatManager with the specified interval
func NewHeartbeatManager(interval time.Duration, logger *logging.Logger) *HeartbeatManager {
	if interval <= 0 {
		interval = 30 * time.Second // Default interval
	}

	ctx, cancel := context.WithCancel(context.Background())

	return &HeartbeatManager{
		interval:    interval,
		connections: make(map[string]chan events.Event),
		logger:      logger,
		ctx:         ctx,
		cancel:      cancel,
	}
}

// Start starts the heartbeat manager
func (h *HeartbeatManager) Start() {
	h.logger.Info("Starting heartbeat manager")
}

// Stop stops the heartbeat manager
func (h *HeartbeatManager) Stop() {
	h.logger.Info("Stopping heartbeat manager")
	h.cancel()
	h.wg.Wait()
}

// RegisterConnection registers a connection for heartbeats
func (h *HeartbeatManager) RegisterConnection(operationID string, eventChan chan events.Event) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	// Check if the connection is already registered
	if _, exists := h.connections[operationID]; exists {
		h.logger.Warn("Connection already registered for heartbeats", "operation_id", operationID)
		return
	}

	h.connections[operationID] = eventChan
	h.logger.Debug("Registered connection for heartbeats", "operation_id", operationID)

	// Start a goroutine to send heartbeats to this connection
	h.wg.Add(1)
	go h.sendHeartbeats(operationID, eventChan)
}

// UnregisterConnection unregisters a connection from heartbeats
func (h *HeartbeatManager) UnregisterConnection(operationID string) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	// Check if the connection is registered
	if _, exists := h.connections[operationID]; !exists {
		h.logger.Warn("Connection not registered for heartbeats", "operation_id", operationID)
		return
	}

	// Remove the connection from the map
	delete(h.connections, operationID)
	h.logger.Debug("Unregistered connection from heartbeats", "operation_id", operationID)
}

// sendHeartbeats sends heartbeats to a connection at regular intervals
func (h *HeartbeatManager) sendHeartbeats(operationID string, eventChan chan events.Event) {
	defer h.wg.Done()

	ticker := time.NewTicker(h.interval)
	defer ticker.Stop()

	for {
		select {
		case <-h.ctx.Done():
			// The heartbeat manager is stopping
			h.logger.Debug("Stopping heartbeats for connection", "operation_id", operationID)
			return
		case <-ticker.C:
			// Time to send a heartbeat
			h.mutex.Lock()
			sequence := h.sequence
			h.sequence++
			h.mutex.Unlock()

			// Create a heartbeat event
			heartbeatEvent := events.NewHeartbeatEvent(operationID, sequence)

			// Set a unique event ID for the heartbeat
			heartbeatEvent.BaseEvent.EventID = generateEventID(operationID, "heartbeat", sequence)

			// Send the heartbeat
			select {
			case eventChan <- heartbeatEvent:
				h.logger.Debug("Sent heartbeat", "operation_id", operationID, "sequence", sequence)
			default:
				h.logger.Warn("Failed to send heartbeat, channel full", "operation_id", operationID)
			}
		}
	}
}
