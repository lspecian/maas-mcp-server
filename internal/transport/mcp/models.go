package mcp

import (
	"encoding/json"
	"fmt"

	"github.com/lspecian/maas-mcp-server/internal/transport/mcp/events"
)

// MCPRequest represents a JSON-RPC 2.0 request
type MCPRequest struct {
	Jsonrpc string          `json:"jsonrpc"`
	Method  string          `json:"method"`
	Params  json.RawMessage `json:"params"`
	ID      interface{}     `json:"id"`
}

// MCPResponse represents a JSON-RPC 2.0 response
type MCPResponse struct {
	Jsonrpc string      `json:"jsonrpc"`
	Result  interface{} `json:"result,omitempty"`
	Error   *MCPError   `json:"error,omitempty"`
	ID      interface{} `json:"id"`
}

// MCPError represents a JSON-RPC 2.0 error
type MCPError struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// MCPStreamEvent represents a server-sent event for streaming responses
// This is kept for backward compatibility, but new code should use the events package
type MCPStreamEvent struct {
	Event string      `json:"event"`
	Data  interface{} `json:"data"`
	ID    string      `json:"id,omitempty"`
}

// MCPProgressEvent represents a progress event for long-running operations
// This is kept for backward compatibility, but new code should use events.ProgressEvent
type MCPProgressEvent struct {
	OperationID string  `json:"operation_id"`
	Status      string  `json:"status"`
	Progress    float64 `json:"progress"`
	Message     string  `json:"message,omitempty"`
	Details     string  `json:"details,omitempty"`
}

// MCPVersionNegotiation represents a version negotiation request/response
type MCPVersionNegotiation struct {
	ClientVersion string `json:"client_version"`
	ServerVersion string `json:"server_version"`
}

// MCPResourceRequest represents a request to access a resource
type MCPResourceRequest struct {
	URI     string                 `json:"uri"`
	Method  string                 `json:"method"`
	Headers map[string]string      `json:"headers,omitempty"`
	Params  map[string]interface{} `json:"params,omitempty"`
}

// MCPResourceResponse represents a response from a resource access
type MCPResourceResponse struct {
	StatusCode int                    `json:"status_code"`
	Headers    map[string]string      `json:"headers,omitempty"`
	Body       interface{}            `json:"body,omitempty"`
	Metadata   map[string]interface{} `json:"metadata,omitempty"`
}

// Error codes as defined in the JSON-RPC 2.0 specification
const (
	ErrorCodeParseError     = -32700
	ErrorCodeInvalidRequest = -32600
	ErrorCodeMethodNotFound = -32601
	ErrorCodeInvalidParams  = -32602
	ErrorCodeInternalError  = -32603
	// -32000 to -32099 are reserved for implementation-defined server errors
	ErrorCodeAuthenticationFailed = -32000
	ErrorCodeRateLimitExceeded    = -32001
	ErrorCodeVersionNotSupported  = -32002
	ErrorCodeResourceNotFound     = -32003
	ErrorCodeOperationFailed      = -32004
)

// NewMCPError creates a new MCPError with the given code and message
func NewMCPError(code int, message string, data interface{}) *MCPError {
	return &MCPError{
		Code:    code,
		Message: message,
		Data:    data,
	}
}

// NewMCPResponse creates a new MCPResponse with the given result and ID
func NewMCPResponse(result interface{}, id interface{}) *MCPResponse {
	return &MCPResponse{
		Jsonrpc: "2.0",
		Result:  result,
		ID:      id,
	}
}

// NewMCPErrorResponse creates a new MCPResponse with the given error and ID
func NewMCPErrorResponse(err *MCPError, id interface{}) *MCPResponse {
	return &MCPResponse{
		Jsonrpc: "2.0",
		Error:   err,
		ID:      id,
	}
}

// NewMCPStreamEvent creates a new MCPStreamEvent with the given event type and data
// This is kept for backward compatibility, but new code should use the events package
func NewMCPStreamEvent(event string, data interface{}, id string) *MCPStreamEvent {
	return &MCPStreamEvent{
		Event: event,
		Data:  data,
		ID:    id,
	}
}

// NewMCPProgressEvent creates a new MCPProgressEvent with the given operation ID, status, and progress
// This is kept for backward compatibility, but new code should use events.NewProgressEvent
func NewMCPProgressEvent(operationID string, status string, progress float64, message string, details string) *MCPProgressEvent {
	return &MCPProgressEvent{
		OperationID: operationID,
		Status:      status,
		Progress:    progress,
		Message:     message,
		Details:     details,
	}
}

// ConvertToProgressEvent converts an MCPProgressEvent to an events.ProgressEvent
func ConvertToProgressEvent(e *MCPProgressEvent) *events.ProgressEvent {
	var statusType events.StatusType
	switch e.Status {
	case "pending":
		statusType = events.StatusPending
	case "in_progress":
		statusType = events.StatusInProgress
	case "complete":
		statusType = events.StatusComplete
	case "failed":
		statusType = events.StatusFailed
	case "cancelled":
		statusType = events.StatusCancelled
	case "initializing":
		statusType = events.StatusInitializing
	case "paused":
		statusType = events.StatusPaused
	default:
		statusType = events.StatusType(e.Status)
	}

	return events.NewProgressEvent(
		e.OperationID,
		statusType,
		e.Progress,
		e.Message,
		e.Details,
	)
}

// StorageConstraintItemParams represents a single constraint item for MCP tools
type StorageConstraintItemParams struct {
	Type       string `json:"type"` // Corresponds to models.StorageConstraintType string representation
	Value      string `json:"value"`
	Operator   string `json:"operator,omitempty"`
	TargetType string `json:"target_type,omitempty"`
}

// SetMachineStorageConstraintsParams defines parameters for the set_machine_storage_constraints MCP tool
type SetMachineStorageConstraintsParams struct {
	MachineID   string                        `json:"machine_id"`
	Constraints []StorageConstraintItemParams `json:"constraints"`
}

// GetMachineStorageConstraintsParams defines parameters for the get_machine_storage_constraints MCP tool
type GetMachineStorageConstraintsParams struct {
	MachineID string `json:"machine_id"`
}

// GetMachineStorageConstraintsResult defines the result for the get_machine_storage_constraints MCP tool
type GetMachineStorageConstraintsResult struct {
	MachineID   string                        `json:"machine_id"`
	Constraints []StorageConstraintItemParams `json:"constraints"`
}

// ValidateMachineStorageConstraintsParams defines parameters for the validate_machine_storage_constraints MCP tool
type ValidateMachineStorageConstraintsParams struct {
	MachineID   string                        `json:"machine_id"`
	Constraints []StorageConstraintItemParams `json:"constraints"`
}

// ValidateMachineStorageConstraintsResult defines the result for the validate_machine_storage_constraints MCP tool
type ValidateMachineStorageConstraintsResult struct {
	MachineID  string   `json:"machine_id"`
	Valid      bool     `json:"valid"`
	Violations []string `json:"violations,omitempty"`
}

// ApplyMachineStorageConstraintsParams defines parameters for the apply_machine_storage_constraints MCP tool
type ApplyMachineStorageConstraintsParams struct {
	MachineID   string                        `json:"machine_id"`
	Constraints []StorageConstraintItemParams `json:"constraints"`
}

// DeleteMachineStorageConstraintsParams defines parameters for the delete_machine_storage_constraints MCP tool
type DeleteMachineStorageConstraintsParams struct {
	MachineID string `json:"machine_id"`
}

// GenericMCPResult defines a generic success result for MCP tools that only need to confirm status
type GenericMCPResult struct {
	Status    string `json:"status"` // e.g., "success"
	MachineID string `json:"machine_id,omitempty"`
	Message   string `json:"message,omitempty"`
}

// Validate validates the MCPRequest
func (r *MCPRequest) Validate() error {
	if r.Jsonrpc != "2.0" {
		return fmt.Errorf("invalid jsonrpc version: %s", r.Jsonrpc)
	}
	if r.Method == "" {
		return fmt.Errorf("method is required")
	}
	return nil
}

// ParseParams parses the params field into the given struct
func (r *MCPRequest) ParseParams(v interface{}) error {
	if r.Params == nil {
		return nil
	}
	return json.Unmarshal(r.Params, v)
}
