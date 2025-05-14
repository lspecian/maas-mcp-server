package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"reflect"

	"github.com/lspecian/maas-mcp-server/internal/errors"
	"github.com/lspecian/maas-mcp-server/internal/logging"
)

// DefaultToolService is the default implementation of ToolService
type DefaultToolService struct {
	registry          ToolRegistry
	validator         ToolValidator
	requestMapper     RequestMapper
	responseFormatter ResponseFormatter
	errorTranslator   ErrorTranslator
	logger            *logging.Logger
}

// NewToolService creates a new tool service
func NewToolService(
	registry ToolRegistry,
	validator ToolValidator,
	requestMapper RequestMapper,
	responseFormatter ResponseFormatter,
	errorTranslator ErrorTranslator,
	logger *logging.Logger,
) ToolService {
	return &DefaultToolService{
		registry:          registry,
		validator:         validator,
		requestMapper:     requestMapper,
		responseFormatter: responseFormatter,
		errorTranslator:   errorTranslator,
		logger:            logger,
	}
}

// ExecuteTool executes a tool by name with the given parameters
func (s *DefaultToolService) ExecuteTool(ctx context.Context, name string, params json.RawMessage) (interface{}, error) {
	// Log tool execution
	s.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"tool":   name,
		"params": string(params),
	}).Info("Executing tool")

	// Get tool
	tool, exists := s.registry.GetTool(name)
	if !exists {
		err := errors.NewNotFoundError(fmt.Sprintf("Tool '%s' not found", name), nil)
		s.logger.WithContext(ctx).WithError(err).Error("Tool not found")
		return nil, err
	}

	// Validate parameters
	if s.validator != nil && tool.Schema.InputSchema != nil {
		if err := s.validator.Validate(tool.Schema.InputSchema, params); err != nil {
			s.logger.WithContext(ctx).WithError(err).Error("Tool parameter validation failed")
			return nil, err
		}
	}

	// Execute tool
	result, err := tool.Handler(ctx, params)
	if err != nil {
		// Translate error
		translatedErr := s.errorTranslator.Translate(err)
		s.logger.WithContext(ctx).WithError(translatedErr).Error("Tool execution failed")
		return nil, translatedErr
	}

	// Format response
	formattedResult, err := s.responseFormatter.Format(result)
	if err != nil {
		s.logger.WithContext(ctx).WithError(err).Error("Response formatting failed")
		return nil, s.errorTranslator.Translate(err)
	}

	return formattedResult, nil
}

// GetTools returns all registered tools
func (s *DefaultToolService) GetTools() []ToolSchema {
	return s.registry.GetTools()
}

// RegisterTool registers a tool with the service
func (s *DefaultToolService) RegisterTool(name string, description string, inputSchema interface{}, handler ToolHandler) error {
	return s.registry.RegisterTool(name, description, inputSchema, handler)
}

// CreateToolHandler creates a handler function for a tool
func CreateToolHandler(
	requestType reflect.Type,
	mapper RequestMapper,
	handlerFunc interface{},
) ToolHandler {
	// Get the type of the handler function
	handlerType := reflect.TypeOf(handlerFunc)
	if handlerType.Kind() != reflect.Func {
		panic("handlerFunc must be a function")
	}

	// Create the handler function
	return func(ctx context.Context, params json.RawMessage) (interface{}, error) {
		// Map parameters to request
		request, err := mapper.Map(params, requestType)
		if err != nil {
			return nil, err
		}

		// Call the handler function
		handlerValue := reflect.ValueOf(handlerFunc)
		args := []reflect.Value{reflect.ValueOf(ctx), reflect.ValueOf(request)}
		results := handlerValue.Call(args)

		// Check for error
		if !results[1].IsNil() {
			return nil, results[1].Interface().(error)
		}

		// Return result
		return results[0].Interface(), nil
	}
}
