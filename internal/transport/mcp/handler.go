package mcp

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lspecian/maas-mcp-server/internal/errors"
	"github.com/lspecian/maas-mcp-server/internal/logging"
	"github.com/lspecian/maas-mcp-server/internal/transport/mcp/events"
)

// Handler handles MCP protocol requests
type Handler struct {
	service Service
	logger  *logging.Logger
}

// NewHandler creates a new MCP handler
func NewHandler(service Service, logger *logging.Logger) *Handler {
	fmt.Println("MCP: Creating new MCP handler")
	return &Handler{
		service: service,
		logger:  logger,
	}
}

// RegisterRoutes registers the MCP routes with the given router
func (h *Handler) RegisterRoutes(router *gin.Engine, middleware *Middleware) {
	fmt.Println("MCP: Registering MCP routes")

	// Create a group for MCP routes with middleware
	mcpGroup := router.Group("/mcp")
	fmt.Println("MCP: Created route group /mcp")

	// Apply middleware
	fmt.Println("MCP: Applying middleware to route group")
	mcpGroup.Use(middleware.LoggingMiddleware())
	mcpGroup.Use(middleware.VersionNegotiationMiddleware())
	mcpGroup.Use(middleware.ContentTypeMiddleware())
	mcpGroup.Use(middleware.AuthMiddleware())
	mcpGroup.Use(middleware.RateLimitMiddleware())
	mcpGroup.Use(middleware.ErrorHandlerMiddleware())
	mcpGroup.Use(middleware.CORSMiddleware())
	fmt.Println("MCP: All middleware applied")

	// Register routes
	fmt.Println("MCP: Registering route handlers")
	mcpGroup.POST("", h.HandleToolCall)
	mcpGroup.GET("/stream", h.HandleStream)
	mcpGroup.POST("/resource", h.HandleResourceAccess)

	// Register health check and monitoring routes
	mcpGroup.GET("/healthz", h.HandleHealthCheck)
	mcpGroup.GET("/metrics", h.HandleMetrics)
	fmt.Println("MCP: All routes registered")
}

// HandleToolCall handles MCP tool calls
func (h *Handler) HandleToolCall(c *gin.Context) {
	fmt.Println("MCP Handler: HandleToolCall called")

	// Get request from context
	var request MCPRequest
	if mcpRequest, exists := c.Get("mcp_request"); exists {
		fmt.Println("MCP Handler: Found mcp_request in context")
		request = *(mcpRequest.(*MCPRequest))
	} else {
		fmt.Println("MCP Handler: No mcp_request in context, parsing from request body")
		// Parse request if not already parsed by middleware
		if err := c.ShouldBindJSON(&request); err != nil {
			c.JSON(http.StatusBadRequest, NewMCPErrorResponse(
				NewMCPError(
					ErrorCodeParseError,
					"Parse error: "+err.Error(),
					nil,
				),
				nil,
			))
			return
		}

		// Validate request
		if err := request.Validate(); err != nil {
			c.JSON(http.StatusBadRequest, NewMCPErrorResponse(
				NewMCPError(
					ErrorCodeInvalidRequest,
					"Invalid request: "+err.Error(),
					nil,
				),
				request.ID,
			))
			return
		}
	}

	// Check if it's a discovery request
	if request.Method == "discover" {
		h.handleDiscovery(c, &request)
		return
	}

	// Execute tool
	// Pass request.Params (json.RawMessage) directly to the service
	result, err := h.service.ExecuteTool(c.Request.Context(), request.Method, request.Params)
	if err != nil {
		// Use type assertion for the custom errors.AppError
		if appErr, ok := err.(*errors.AppError); ok {
			c.JSON(http.StatusOK, NewMCPErrorResponse(
				convertAppErrorToMCPError(appErr),
				request.ID,
			))
		} else {
			c.JSON(http.StatusOK, NewMCPErrorResponse(
				NewMCPError(
					ErrorCodeInternalError,
					"Internal error: "+err.Error(),
					nil,
				),
				request.ID,
			))
		}
		return
	}

	// Return result
	c.JSON(http.StatusOK, NewMCPResponse(result, request.ID))
}

// HandleStream handles SSE streaming for MCP
func (h *Handler) HandleStream(c *gin.Context) {
	// Set headers for SSE following best practices
	c.Writer.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
	c.Writer.Header().Set("Cache-Control", "no-cache, no-transform")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("Transfer-Encoding", "chunked")
	c.Writer.Header().Set("X-Accel-Buffering", "no")          // Prevent proxy buffering
	c.Writer.Header().Set("Access-Control-Allow-Origin", "*") // Allow CORS
	c.Writer.Header().Set("Pragma", "no-cache")               // For older browsers

	// Get operation ID from query
	operationID := c.Query("operation_id")
	if operationID == "" {
		c.JSON(http.StatusBadRequest, NewMCPErrorResponse(
			NewMCPError(
				ErrorCodeInvalidRequest,
				"Missing operation_id parameter",
				nil,
			),
			nil,
		))
		return
	}

	// Create a channel for events
	eventChan := make(chan events.Event)

	// Create a channel for errors
	errChan := make(chan error)

	// Create a channel for done signal
	doneChan := make(chan bool)

	// Create a context with cancel
	ctx := c.Request.Context()

	// Start a goroutine to send events
	go func() {
		// Simulate progress events
		// In a real implementation, this would be connected to the actual operation
		progress := 0.0
		for progress < 100.0 {
			select {
			case <-ctx.Done():
				// Context was canceled
				h.logger.Debug("Context canceled, stopping event generation")
				return
			case <-doneChan:
				// Done signal received
				h.logger.Debug("Done signal received, stopping event generation")
				return
			default:
				// Send progress event
				progress += 10.0
				if progress > 100.0 {
					progress = 100.0
				}

				// Create a progress event
				progressEvent := events.NewProgressEvent(
					operationID,
					events.StatusInProgress,
					progress,
					fmt.Sprintf("Operation %s is %d%% complete", operationID, int(progress)),
					nil,
				)

				eventChan <- progressEvent

				// This line is now handled above

				// Sleep for a bit
				time.Sleep(1 * time.Second)

				// If progress is 100%, send a completion event
				if progress >= 100.0 {
					// Create a completion event
					completionEvent := events.NewCompletionEvent(
						operationID,
						"Operation completed successfully",
						"Operation completed successfully",
						float64(time.Since(time.Now().Add(-10*time.Second)).Seconds()), // Simulated duration
					)

					eventChan <- completionEvent

					// Signal done
					doneChan <- true
				}
			}
		}
	}()

	// Flush headers immediately to establish the SSE connection
	if err := writeSSEFlush(c.Writer); err != nil {
		h.logger.WithError(err).Error("Failed to flush SSE headers")
		return
	}

	// Handle events
	for {
		select {
		case <-ctx.Done():
			// Client disconnected
			h.logger.Debug("Client disconnected, closing SSE stream")
			return
		case <-doneChan:
			// Operation completed
			h.logger.Debug("Operation completed, closing SSE stream")
			return
		case err := <-errChan:
			// Error occurred
			h.logger.WithError(err).Error("Error in SSE stream")

			// Create and send error event
			errorEvent := events.NewErrorEvent(
				operationID,
				err.Error(),
				500, // Generic error code
				nil,
				false,
			)

			if err := events.WriteSSE(c.Writer, errorEvent); err != nil {
				h.logger.WithError(err).Error("Failed to write error event")
			}

			// Close connection
			return
		case event := <-eventChan:
			// Write the event with error handling
			if err := events.WriteSSE(c.Writer, event); err != nil {
				h.logger.WithError(err).Error("Failed to write SSE event")
				return
			}
		}
	}
}

// writeSSEEvent is now deprecated in favor of events.WriteSSE
// It's kept for backward compatibility
func writeSSEEvent(w http.ResponseWriter, eventType string, data interface{}, id string) error {
	// Marshal event data
	eventData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("error marshaling event data: %w", err)
	}

	// Write event type
	if _, err := fmt.Fprintf(w, "event: %s\n", eventType); err != nil {
		return fmt.Errorf("error writing event type: %w", err)
	}

	// Write data
	if _, err := fmt.Fprintf(w, "data: %s\n", eventData); err != nil {
		return fmt.Errorf("error writing event data: %w", err)
	}

	// Add ID if present
	if id != "" {
		if _, err := fmt.Fprintf(w, "id: %s\n", id); err != nil {
			return fmt.Errorf("error writing event ID: %w", err)
		}
	}

	// End event with an extra newline
	if _, err := fmt.Fprint(w, "\n"); err != nil {
		return fmt.Errorf("error writing event terminator: %w", err)
	}

	// Flush the writer
	return writeSSEFlush(w)
}

// writeSSEFlush flushes the response writer for SSE
func writeSSEFlush(w http.ResponseWriter) error {
	flusher, ok := w.(http.Flusher)
	if !ok {
		return fmt.Errorf("response writer does not support flushing")
	}
	flusher.Flush()
	return nil
}

// HandleResourceAccess handles MCP resource access
func (h *Handler) HandleResourceAccess(c *gin.Context) {
	// Parse request
	var request MCPResourceRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, NewMCPErrorResponse(
			NewMCPError(
				ErrorCodeParseError,
				"Parse error: "+err.Error(),
				nil,
			),
			nil,
		))
		return
	}

	// Validate request
	if request.URI == "" {
		c.JSON(http.StatusBadRequest, NewMCPErrorResponse(
			NewMCPError(
				ErrorCodeInvalidRequest,
				"URI is required",
				nil,
			),
			nil,
		))
		return
	}

	// Get resource
	resource, err := h.service.GetResource(c.Request.Context(), request.URI)
	if err != nil {
		// Use type assertion for the custom errors.AppError
		if appErr, ok := err.(*errors.AppError); ok {
			c.JSON(http.StatusOK, NewMCPErrorResponse(
				convertAppErrorToMCPError(appErr),
				nil,
			))
		} else {
			c.JSON(http.StatusOK, NewMCPErrorResponse(
				NewMCPError(
					ErrorCodeInternalError,
					"Internal error: "+err.Error(),
					nil,
				),
				nil,
			))
		}
		return
	}

	// Return resource
	c.JSON(http.StatusOK, MCPResourceResponse{
		StatusCode: http.StatusOK,
		Body:       resource,
	})
}

// handleDiscovery handles MCP discovery requests
func (h *Handler) handleDiscovery(c *gin.Context, request *MCPRequest) {
	// Get server info
	serverInfo, err := h.service.GetServerInfo(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusOK, NewMCPErrorResponse(
			NewMCPError(
				ErrorCodeInternalError,
				"Internal error: "+err.Error(),
				nil,
			),
			request.ID,
		))
		return
	}

	// Set ID
	serverInfo.ID = request.ID.(string)

	// Return server info
	c.JSON(http.StatusOK, serverInfo)
}

// HandleHealthCheck handles requests for the server's health status
func (h *Handler) HandleHealthCheck(c *gin.Context) {
	// In a real implementation, this would check the status of dependencies (e.g., MAAS connection)
	// For now, return a simple success response
	c.JSON(http.StatusOK, gin.H{
		"status": "ok",
		"uptime": time.Since(time.Now().Add(-1 * time.Minute)).String(), // Simulated uptime
	})
}

// HandleMetrics handles requests for server metrics
func (h *Handler) HandleMetrics(c *gin.Context) {
	// In a real implementation, this would expose metrics in a format like Prometheus
	// For now, return a placeholder response
	c.JSON(http.StatusOK, gin.H{
		"message": "Metrics endpoint (placeholder)",
		// TODO: Add actual metrics data
	})
}
