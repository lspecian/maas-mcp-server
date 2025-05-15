package mcp

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/lspecian/maas-mcp-server/internal/version"
	"github.com/sirupsen/logrus"
)

// getCwd returns the current working directory
func getCwd() string {
	cwd, err := os.Getwd()
	if err != nil {
		return "unknown"
	}
	return cwd
}

// StdioServer is an MCP server implementation that communicates via stdin/stdout
type StdioServer struct {
	registry *Registry
	logger   *logrus.Logger
	reader   *bufio.Reader
	writer   io.Writer
}

// NewStdioServer creates a new stdio MCP server
func NewStdioServer(registry *Registry, logger *logrus.Logger) *StdioServer {
	return &StdioServer{
		registry: registry,
		logger:   logger,
		reader:   bufio.NewReader(os.Stdin),
		writer:   os.Stdout,
	}
}

// Run starts the stdio MCP server
func (s *StdioServer) Run() error {
	s.logger.Info("Starting stdio MCP server")

	// Log environment variables for debugging
	s.logger.WithField("env", os.Environ()).Debug("Environment variables")
	s.logger.WithField("pid", os.Getpid()).Info("Server process ID")
	s.logger.WithField("cwd", getCwd()).Info("Current working directory")

	// Set up signal handling for graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	// Create a context that can be canceled
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Start a goroutine to handle signals
	go func() {
		sig := <-sigChan
		s.logger.WithField("signal", sig.String()).Info("Received signal, shutting down")
		cancel()
	}()

	// Write messages to stdout to indicate that the server is ready
	// Try different formats of the ready message to support various clients including VSCode

	// Log detailed information about the environment
	s.logger.WithField("pid", os.Getpid()).Info("Server process ID")
	s.logger.WithField("cwd", getCwd()).Info("Current working directory")
	s.logger.Info("Preparing to send ready messages in multiple formats")

	// Format 1: Plain text (used by test-stdio-client.go and test-roo-mcp.js)
	readyMsg := "MCP server ready"
	s.logger.WithField("message", readyMsg).Info("Sending plain ready message")
	fmt.Fprintln(s.writer, readyMsg)

	// Format 2: JSON-RPC 2.0 format
	jsonReadyMsg := fmt.Sprintf("{\"jsonrpc\":\"2.0\",\"method\":\"ready\",\"params\":{},\"id\":\"0\"}")
	s.logger.WithField("message", jsonReadyMsg).Info("Sending JSON-RPC 2.0 ready message")
	fmt.Fprintln(s.writer, jsonReadyMsg)

	// Format 3: Alternative JSON-RPC format (no version specified)
	jsonReadyMsgAlt := fmt.Sprintf("{\"method\":\"ready\",\"params\":{},\"id\":\"0\"}")
	s.logger.WithField("message", jsonReadyMsgAlt).Info("Sending alternative JSON-RPC ready message")
	fmt.Fprintln(s.writer, jsonReadyMsgAlt)

	// Format 4: VSCode-specific format with additional fields
	vscodeReadyMsg := fmt.Sprintf("{\"jsonrpc\":\"2.0\",\"method\":\"ready\",\"params\":{\"name\":\"MAAS MCP Server\",\"version\":\"%s\"},\"id\":\"0\"}", version.GetVersion())
	s.logger.WithField("message", vscodeReadyMsg).Info("Sending VSCode-specific ready message")
	fmt.Fprintln(s.writer, vscodeReadyMsg)

	s.logger.Info("MCP server ready, waiting for input")

	// Create a channel for input lines
	lineChan := make(chan string)
	errChan := make(chan error)

	// Start a goroutine to read from stdin
	go func() {
		for {
			// Check if context is canceled
			select {
			case <-ctx.Done():
				return
			default:
				// Continue reading
			}

			// Read a line from stdin
			line, err := s.reader.ReadString('\n')
			if err != nil {
				if err == io.EOF {
					s.logger.Info("Stdin closed, but continuing to run")
					// Don't exit, just wait for a signal
					time.Sleep(100 * time.Millisecond)
					continue
				}
				s.logger.WithError(err).Error("Failed to read from stdin")
				errChan <- fmt.Errorf("failed to read from stdin: %w", err)
				return
			}

			// Trim whitespace
			line = strings.TrimSpace(line)
			if line == "" {
				continue
			}

			// Send the line to the channel
			lineChan <- line
		}
	}()

	// Process JSON-RPC messages from stdin
	for {
		select {
		case <-ctx.Done():
			s.logger.Info("Context canceled, exiting")
			return nil
		case err := <-errChan:
			s.logger.WithError(err).Error("Error reading from stdin")
			return err
		case line := <-lineChan:
			// Log the received line
			s.logger.WithField("input", line).Info("Received input from stdin")

			// Process the line
			if err := s.processLine(ctx, line); err != nil {
				s.logger.WithError(err).Error("Error processing line")
			}
		}
	}
}

// processLine processes a line of input
func (s *StdioServer) processLine(ctx context.Context, line string) error {
	s.logger.WithField("raw_input", line).Debug("Processing raw input line")

	// Parse JSON-RPC request with detailed logging
	s.logger.WithField("line", line).Debug("Attempting to parse JSON-RPC request")

	var request JSONRPCRequest
	if err := json.Unmarshal([]byte(line), &request); err != nil {
		s.logger.WithError(err).Error("Failed to parse JSON-RPC request")
		s.logger.WithField("line_length", len(line)).Debug("Input line length")
		s.logger.WithField("line_bytes", []byte(line)).Debug("Input line bytes")

		// Try to parse as a simplified request format (without jsonrpc field)
		type SimpleRequest struct {
			Method string          `json:"method"`
			Params json.RawMessage `json:"params"`
			ID     JSONRPCID       `json:"id"`
		}

		var simpleRequest SimpleRequest
		if simpleErr := json.Unmarshal([]byte(line), &simpleRequest); simpleErr == nil {
			s.logger.Info("Successfully parsed as simplified request format")
			request.Method = simpleRequest.Method
			request.Params = simpleRequest.Params
			request.ID = simpleRequest.ID
			request.JSONRPC = "2.0" // Assume 2.0 for compatibility
		} else {
			s.writeError(JSONRPCID(""), -32700, "Parse error", err.Error())
			return err
		}
	}

	// Log the parsed request
	s.logger.WithFields(logrus.Fields{
		"jsonrpc": request.JSONRPC,
		"method":  request.Method,
		"id":      request.ID,
		"id_type": fmt.Sprintf("%T", request.ID),
		"params":  request.Params,
	}).Info("Parsed JSON-RPC request")

	// Validate request - be more flexible with JSON-RPC versions
	if request.JSONRPC != "2.0" && request.JSONRPC != "" {
		s.logger.WithField("jsonrpc", request.JSONRPC).Warn("Non-standard JSON-RPC version, but proceeding")
	}

	// If JSONRPC field is empty, assume it's a valid request but log a warning
	if request.JSONRPC == "" {
		s.logger.Warn("Request missing JSONRPC version field, assuming valid request")
	}

	// Handle discovery request
	if request.Method == "discover" {
		s.logger.Info("Handling discovery request")
		s.handleDiscovery(request.ID)
		return nil
	}

	// Get tool
	s.logger.WithField("method", request.Method).Info("Looking up tool")
	tool, ok := s.registry.GetTool(request.Method)
	if !ok {
		s.logger.WithField("method", request.Method).Error("Method not found")
		s.writeError(request.ID, -32601, "Method not found", fmt.Sprintf("method %s not found", request.Method))
		return fmt.Errorf("method not found: %s", request.Method)
	}

	// Execute tool
	s.logger.WithField("method", request.Method).Info("Executing tool")
	result, err := tool.Handler(ctx, request.Params)
	if err != nil {
		s.logger.WithError(err).WithField("method", request.Method).Error("Tool execution failed")
		s.writeError(request.ID, -32000, "Server error", err.Error())
		return err
	}

	// Write result
	s.logger.WithField("method", request.Method).Info("Tool execution succeeded")
	s.writeResult(request.ID, result)
	return nil
}

// handleDiscovery handles the MCP discovery request
func (s *StdioServer) handleDiscovery(id JSONRPCID) {
	// Get all tools and resources
	tools := s.registry.ListTools()
	resources := s.registry.ListResources()

	// Build response
	response := map[string]interface{}{
		"jsonrpc": "2.0",
		"result": map[string]interface{}{
			"serverInfo": map[string]interface{}{
				"name":    "MAAS MCP Server",
				"version": version.GetVersion(),
			},
			"capabilities": map[string]interface{}{
				"tools":     tools,
				"resources": resources,
			},
		},
		"id": id.String(),
	}

	// Write response
	s.writeResponse(response)
}

// writeResult writes a JSON-RPC result to stdout
func (s *StdioServer) writeResult(id JSONRPCID, result json.RawMessage) {
	response := map[string]interface{}{
		"jsonrpc": "2.0",
		"result":  result,
		"id":      id.String(),
	}
	s.logger.WithField("response_type", "result").WithField("id", id.String()).Debug("Preparing result response")
	s.writeResponse(response)
}

// writeError writes a JSON-RPC error to stdout
func (s *StdioServer) writeError(id JSONRPCID, code int, message string, data interface{}) {
	response := map[string]interface{}{
		"jsonrpc": "2.0",
		"error": map[string]interface{}{
			"code":    code,
			"message": message,
			"data":    data,
		},
		"id": id.String(),
	}
	errorLogger := s.logger.WithField("response_type", "error")
	errorLogger = errorLogger.WithField("id", id.String())
	errorLogger = errorLogger.WithField("code", code)
	errorLogger = errorLogger.WithField("message", message)
	errorLogger.Debug("Preparing error response")
	s.writeResponse(response)
}

// writeResponse writes a JSON-RPC response to stdout
func (s *StdioServer) writeResponse(response map[string]interface{}) {
	// Marshal response to JSON
	responseJSON, err := json.Marshal(response)
	if err != nil {
		s.logger.WithError(err).Error("Failed to marshal response")
		s.logger.WithField("response", response).Debug("Response that failed to marshal")
		return
	}

	// Log the response with detailed information
	s.logger.WithField("response", string(responseJSON)).Info("Writing response to stdout")
	s.logger.WithField("response_length", len(responseJSON)).Debug("Response length")
	s.logger.WithField("writer_type", fmt.Sprintf("%T", s.writer)).Debug("Writer type")

	// Ensure the response has the correct content-length header format if needed by VSCode
	responseStr := string(responseJSON)

	// Write response to stdout
	bytesWritten, err := fmt.Fprintln(s.writer, responseStr)
	if err != nil {
		s.logger.WithError(err).Error("Failed to write response to stdout")
	} else {
		s.logger.WithField("bytes_written", bytesWritten).Debug("Bytes written to stdout")
	}

	// Flush stdout to ensure the response is sent immediately
	if f, ok := s.writer.(interface{ Flush() error }); ok {
		if err := f.Flush(); err != nil {
			s.logger.WithError(err).Error("Failed to flush stdout")
		} else {
			s.logger.Debug("Successfully flushed stdout")
		}
	} else {
		s.logger.Debug("Writer does not support Flush method")
	}

	// Add a small delay to ensure the message is properly processed
	time.Sleep(10 * time.Millisecond)
}
