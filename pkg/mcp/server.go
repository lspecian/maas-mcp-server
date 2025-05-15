package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lspecian/maas-mcp-server/internal/version"
	"github.com/sirupsen/logrus"
)

// Server is an MCP server implementation
type Server struct {
	registry *Registry
	logger   *logrus.Logger
	router   *gin.Engine
}

// NewServer creates a new MCP server
func NewServer(registry *Registry, logger *logrus.Logger) *Server {
	router := gin.Default()

	server := &Server{
		registry: registry,
		logger:   logger,
		router:   router,
	}

	// Register routes
	server.registerRoutes()

	return server
}

// registerRoutes registers the MCP server routes
func (s *Server) registerRoutes() {
	// MCP discovery endpoint
	s.router.GET("/mcp", s.handleDiscovery)

	// MCP JSON-RPC endpoint
	s.router.POST("/mcp", s.handleJSONRPC)

	// MCP SSE endpoint
	s.router.GET("/mcp/sse", s.handleSSE)
}

// Run starts the MCP server
func (s *Server) Run(addr string) error {
	return s.router.Run(addr)
}

// ServeHTTP implements the http.Handler interface
func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.router.ServeHTTP(w, r)
}

// handleDiscovery handles the MCP discovery endpoint
func (s *Server) handleDiscovery(c *gin.Context) {
	// Get all tools and resources
	tools := s.registry.ListTools()
	resources := s.registry.ListResources()

	// Build response
	response := gin.H{
		"jsonrpc": "2.0",
		"result": gin.H{
			"serverInfo": gin.H{
				"name":    "MAAS MCP Server",
				"version": version.GetVersion(),
			},
			"capabilities": gin.H{
				"tools":     tools,
				"resources": resources,
			},
		},
		"id": "discovery",
	}

	c.JSON(http.StatusOK, response)
}

// JSONRPCID represents a JSON-RPC ID that can be either a string or a number
type JSONRPCID string

// String returns the string representation of the ID
func (id JSONRPCID) String() string {
	return string(id)
}

// MarshalJSON implements the json.Marshaler interface
func (id JSONRPCID) MarshalJSON() ([]byte, error) {
	return json.Marshal(id.String())
}

// UnmarshalJSON implements the json.Unmarshaler interface
func (id *JSONRPCID) UnmarshalJSON(data []byte) error {
	// Try to unmarshal as string
	var s string
	if err := json.Unmarshal(data, &s); err == nil {
		*id = JSONRPCID(s)
		return nil
	}

	// Try to unmarshal as number
	var n json.Number
	if err := json.Unmarshal(data, &n); err == nil {
		*id = JSONRPCID(n.String())
		return nil
	}

	// Return error if neither works
	return fmt.Errorf("ID must be a string or a number")
}

// JSONRPCRequest represents a JSON-RPC request
type JSONRPCRequest struct {
	JSONRPC string          `json:"jsonrpc"`
	Method  string          `json:"method"`
	Params  json.RawMessage `json:"params"`
	ID      JSONRPCID       `json:"id"`
}

// JSONRPCResponse represents a JSON-RPC response
type JSONRPCResponse struct {
	JSONRPC string          `json:"jsonrpc"`
	Result  json.RawMessage `json:"result,omitempty"`
	Error   *JSONRPCError   `json:"error,omitempty"`
	ID      JSONRPCID       `json:"id"`
}

// JSONRPCError represents a JSON-RPC error
type JSONRPCError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    any    `json:"data,omitempty"`
}

// handleJSONRPC handles the MCP JSON-RPC endpoint
func (s *Server) handleJSONRPC(c *gin.Context) {
	// Parse request
	var request JSONRPCRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, JSONRPCResponse{
			JSONRPC: "2.0",
			Error: &JSONRPCError{
				Code:    -32700,
				Message: "Parse error",
				Data:    err.Error(),
			},
			ID: JSONRPCID(""),
		})
		return
	}

	// Validate request
	if request.JSONRPC != "2.0" {
		c.JSON(http.StatusBadRequest, JSONRPCResponse{
			JSONRPC: "2.0",
			Error: &JSONRPCError{
				Code:    -32600,
				Message: "Invalid Request",
				Data:    "jsonrpc must be 2.0",
			},
			ID: request.ID,
		})
		return
	}

	// Get tool
	tool, ok := s.registry.GetTool(request.Method)
	if !ok {
		c.JSON(http.StatusBadRequest, JSONRPCResponse{
			JSONRPC: "2.0",
			Error: &JSONRPCError{
				Code:    -32601,
				Message: "Method not found",
				Data:    fmt.Sprintf("method %s not found", request.Method),
			},
			ID: request.ID,
		})
		return
	}

	// Execute tool
	result, err := tool.Handler(c.Request.Context(), request.Params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, JSONRPCResponse{
			JSONRPC: "2.0",
			Error: &JSONRPCError{
				Code:    -32000,
				Message: "Server error",
				Data:    err.Error(),
			},
			ID: request.ID,
		})
		return
	}

	// Return result
	c.JSON(http.StatusOK, JSONRPCResponse{
		JSONRPC: "2.0",
		Result:  result,
		ID:      request.ID,
	})
}

// SSEEvent represents a server-sent event
type SSEEvent struct {
	Event string
	Data  string
	ID    string
}

// handleSSE handles the MCP SSE endpoint
func (s *Server) handleSSE(c *gin.Context) {
	// Set headers for SSE
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("Transfer-Encoding", "chunked")

	// Create a channel for events
	events := make(chan SSEEvent)

	// Create a context that is canceled when the client disconnects
	ctx, cancel := context.WithCancel(c.Request.Context())
	defer cancel()

	// Start a goroutine to send events
	go func() {
		// Send a ping event every 30 seconds to keep the connection alive
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				// Client disconnected
				return
			case event := <-events:
				// Send event
				fmt.Fprintf(c.Writer, "event: %s\n", event.Event)
				fmt.Fprintf(c.Writer, "data: %s\n", event.Data)
				if event.ID != "" {
					fmt.Fprintf(c.Writer, "id: %s\n", event.ID)
				}
				fmt.Fprintf(c.Writer, "\n")
				c.Writer.Flush()
			case <-ticker.C:
				// Send ping
				fmt.Fprintf(c.Writer, "event: ping\n")
				fmt.Fprintf(c.Writer, "data: %d\n", time.Now().Unix())
				fmt.Fprintf(c.Writer, "\n")
				c.Writer.Flush()
			}
		}
	}()

	// Wait for client to disconnect
	<-ctx.Done()
}

// SendEvent sends an event to all connected SSE clients
func (s *Server) SendEvent(event SSEEvent) {
	// TODO: Implement event broadcasting to all connected clients
}
