package mcp

import (
	"context"
	"encoding/json"
	"fmt"
)

// ToolsCallParams represents the parameters for a tools/call request
type ToolsCallParams struct {
	Name      string          `json:"name"`
	Arguments json.RawMessage `json:"arguments"`
}

// handleToolsCall handles the tools/call request
func (s *StdioServer) handleToolsCall(ctx context.Context, id JSONRPCID, params json.RawMessage) error {
	// Parse params
	var toolsCallParams ToolsCallParams
	if err := json.Unmarshal(params, &toolsCallParams); err != nil {
		s.logger.WithError(err).Error("Failed to parse tools/call params")
		s.writeError(id, -32602, "Invalid params", err.Error())
		return err
	}

	// Validate params
	if toolsCallParams.Name == "" {
		s.logger.Error("Missing tool name in tools/call params")
		s.writeError(id, -32602, "Invalid params", "tool name is required")
		return fmt.Errorf("tool name is required")
	}

	// Log the tool call
	s.logger.WithField("tool", toolsCallParams.Name).WithField("arguments", string(toolsCallParams.Arguments)).Info("Calling tool")

	// Get tool
	tool, ok := s.registry.GetTool(toolsCallParams.Name)
	if !ok {
		s.logger.WithField("tool", toolsCallParams.Name).Error("Tool not found")
		s.writeError(id, -32601, "Method not found", fmt.Sprintf("tool %s not found", toolsCallParams.Name))
		return fmt.Errorf("tool not found: %s", toolsCallParams.Name)
	}

	// Execute tool
	result, err := tool.Handler(ctx, toolsCallParams.Arguments)
	if err != nil {
		s.logger.WithError(err).WithField("tool", toolsCallParams.Name).Error("Tool execution failed")
		s.writeError(id, -32000, "Server error", err.Error())
		return err
	}

	// Format the result according to MCP protocol requirements
	// The MCP protocol requires a "content" array in the response
	formattedResult := map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": string(result),
			},
		},
	}

	// Marshal the formatted result
	formattedResultJSON, err := json.Marshal(formattedResult)
	if err != nil {
		s.logger.WithError(err).WithField("tool", toolsCallParams.Name).Error("Failed to marshal formatted result")
		s.writeError(id, -32000, "Server error", "Failed to format result")
		return err
	}

	// Write result
	s.logger.WithField("tool", toolsCallParams.Name).Info("Tool execution succeeded")
	s.writeResult(id, formattedResultJSON)
	return nil
}
