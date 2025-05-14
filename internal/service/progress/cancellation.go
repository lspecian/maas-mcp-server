package progress

import (
	"context"
	"sync"
	"time"

	"github.com/lspecian/maas-mcp-server/internal/logging"
)

// CancellationManager handles the cancellation of long-running operations
// when clients disconnect from the SSE stream.
type CancellationManager struct {
	// operationContexts is a map of operation IDs to cancellation contexts
	operationContexts map[string]*OperationCancellationContext

	// mutex protects access to the operationContexts map
	mutex sync.RWMutex

	// logger is used for logging
	logger *logging.Logger

	// disconnectTimeout is the duration to wait after a client disconnects
	// before cancelling the operation (to handle temporary disconnections)
	disconnectTimeout time.Duration
}

// OperationCancellationContext represents the cancellation context for an operation
type OperationCancellationContext struct {
	// operationID is the ID of the operation
	operationID string

	// ctx is the cancellation context for the operation
	ctx context.Context

	// cancel is the cancel function for the context
	cancel context.CancelFunc

	// clientConnections tracks the number of active client connections for this operation
	clientConnections int

	// mutex protects access to the clientConnections counter
	mutex sync.RWMutex

	// disconnectTimer is a timer that triggers cancellation after a timeout
	// if all clients have disconnected
	disconnectTimer *time.Timer

	// disconnectTimeout is the duration to wait after all clients disconnect
	// before cancelling the operation
	disconnectTimeout time.Duration

	// isCancelled indicates whether the operation has been cancelled
	isCancelled bool
}

// NewCancellationManager creates a new CancellationManager
func NewCancellationManager(logger *logging.Logger, disconnectTimeout time.Duration) *CancellationManager {
	if disconnectTimeout <= 0 {
		disconnectTimeout = 30 * time.Second // Default timeout
	}

	return &CancellationManager{
		operationContexts: make(map[string]*OperationCancellationContext),
		logger:            logger,
		disconnectTimeout: disconnectTimeout,
	}
}

// RegisterOperation registers an operation with the cancellation manager
// and returns a cancellation context that will be cancelled if all clients disconnect
func (m *CancellationManager) RegisterOperation(operationID string) (context.Context, context.CancelFunc) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	// Check if the operation is already registered
	if opCtx, exists := m.operationContexts[operationID]; exists {
		return opCtx.ctx, opCtx.cancel
	}

	// Create a new cancellation context
	ctx, cancel := context.WithCancel(context.Background())

	// Create a new operation cancellation context
	opCtx := &OperationCancellationContext{
		operationID:       operationID,
		ctx:               ctx,
		cancel:            cancel,
		clientConnections: 0,
		disconnectTimeout: m.disconnectTimeout,
		isCancelled:       false,
	}

	// Store the operation context
	m.operationContexts[operationID] = opCtx

	m.logger.Debug("Registered operation with cancellation manager", "operation_id", operationID)

	return ctx, cancel
}

// ClientConnected notifies the cancellation manager that a client has connected to an operation
func (m *CancellationManager) ClientConnected(operationID string) {
	m.mutex.RLock()
	opCtx, exists := m.operationContexts[operationID]
	m.mutex.RUnlock()

	if !exists {
		m.logger.Warn("Client connected to unregistered operation", "operation_id", operationID)
		return
	}

	opCtx.mutex.Lock()
	defer opCtx.mutex.Unlock()

	// Increment the client connection counter
	opCtx.clientConnections++

	// If there was a disconnect timer running, stop it
	if opCtx.disconnectTimer != nil {
		opCtx.disconnectTimer.Stop()
		opCtx.disconnectTimer = nil
	}

	m.logger.Debug("Client connected to operation",
		"operation_id", operationID,
		"client_connections", opCtx.clientConnections)
}

// ClientDisconnected notifies the cancellation manager that a client has disconnected from an operation
func (m *CancellationManager) ClientDisconnected(operationID string) {
	m.mutex.RLock()
	opCtx, exists := m.operationContexts[operationID]
	m.mutex.RUnlock()

	if !exists {
		m.logger.Warn("Client disconnected from unregistered operation", "operation_id", operationID)
		return
	}

	opCtx.mutex.Lock()
	defer opCtx.mutex.Unlock()

	// If the operation is already cancelled, do nothing
	if opCtx.isCancelled {
		return
	}

	// Decrement the client connection counter
	opCtx.clientConnections--

	m.logger.Debug("Client disconnected from operation",
		"operation_id", operationID,
		"client_connections", opCtx.clientConnections)

	// If there are still clients connected, do nothing
	if opCtx.clientConnections > 0 {
		return
	}

	// If there are no clients connected, start a timer to cancel the operation
	// after the disconnect timeout (to handle temporary disconnections)
	opCtx.disconnectTimer = time.AfterFunc(opCtx.disconnectTimeout, func() {
		m.cancelOperation(operationID)
	})

	m.logger.Debug("Started disconnect timer for operation",
		"operation_id", operationID,
		"timeout", opCtx.disconnectTimeout)
}

// cancelOperation cancels an operation
func (m *CancellationManager) cancelOperation(operationID string) {
	m.mutex.RLock()
	opCtx, exists := m.operationContexts[operationID]
	m.mutex.RUnlock()

	if !exists {
		m.logger.Warn("Attempted to cancel unregistered operation", "operation_id", operationID)
		return
	}

	opCtx.mutex.Lock()
	defer opCtx.mutex.Unlock()

	// If the operation is already cancelled, do nothing
	if opCtx.isCancelled {
		return
	}

	// If there are clients connected, do nothing
	if opCtx.clientConnections > 0 {
		return
	}

	// Mark the operation as cancelled
	opCtx.isCancelled = true

	// Cancel the context
	opCtx.cancel()

	m.logger.Info("Cancelled operation due to client disconnection", "operation_id", operationID)
}

// CancelOperation explicitly cancels an operation
func (m *CancellationManager) CancelOperation(operationID string) {
	m.mutex.RLock()
	opCtx, exists := m.operationContexts[operationID]
	m.mutex.RUnlock()

	if !exists {
		m.logger.Warn("Attempted to cancel unregistered operation", "operation_id", operationID)
		return
	}

	opCtx.mutex.Lock()
	defer opCtx.mutex.Unlock()

	// If the operation is already cancelled, do nothing
	if opCtx.isCancelled {
		return
	}

	// Mark the operation as cancelled
	opCtx.isCancelled = true

	// Cancel the context
	opCtx.cancel()

	m.logger.Info("Explicitly cancelled operation", "operation_id", operationID)
}

// CleanupOperation removes an operation from the cancellation manager
func (m *CancellationManager) CleanupOperation(operationID string) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	opCtx, exists := m.operationContexts[operationID]
	if !exists {
		return
	}

	// Cancel the context if it hasn't been cancelled already
	opCtx.mutex.Lock()
	if !opCtx.isCancelled {
		opCtx.cancel()
	}
	opCtx.mutex.Unlock()

	// Remove the operation from the map
	delete(m.operationContexts, operationID)

	m.logger.Debug("Cleaned up operation from cancellation manager", "operation_id", operationID)
}

// GetOperationContext returns the cancellation context for an operation
func (m *CancellationManager) GetOperationContext(operationID string) (context.Context, bool) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	opCtx, exists := m.operationContexts[operationID]
	if !exists {
		return nil, false
	}

	return opCtx.ctx, true
}

// IsOperationCancelled checks if an operation has been cancelled
func (m *CancellationManager) IsOperationCancelled(operationID string) bool {
	m.mutex.RLock()
	opCtx, exists := m.operationContexts[operationID]
	m.mutex.RUnlock()

	if !exists {
		return false
	}

	opCtx.mutex.RLock()
	defer opCtx.mutex.RUnlock()

	return opCtx.isCancelled
}

// Shutdown cancels all operations and cleans up resources
func (m *CancellationManager) Shutdown() {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	for operationID, opCtx := range m.operationContexts {
		opCtx.mutex.Lock()
		if !opCtx.isCancelled {
			opCtx.cancel()
			opCtx.isCancelled = true
		}
		opCtx.mutex.Unlock()

		m.logger.Debug("Cancelled operation during shutdown", "operation_id", operationID)
	}

	// Clear the map
	m.operationContexts = make(map[string]*OperationCancellationContext)

	m.logger.Info("Shutdown cancellation manager")
}
