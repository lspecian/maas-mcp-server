package tools

import (
	"context"
	"encoding/json"
	"errors"
	"reflect"
	"testing"

	"github.com/lspecian/maas-mcp-server/internal/logging"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockToolRegistry is a mock implementation of ToolRegistry
type MockToolRegistry struct {
	mock.Mock
}

func (m *MockToolRegistry) RegisterTool(name string, description string, inputSchema interface{}, handler ToolHandler) error {
	args := m.Called(name, description, inputSchema, handler)
	return args.Error(0)
}

func (m *MockToolRegistry) GetTool(name string) (*ToolDefinition, bool) {
	args := m.Called(name)
	if args.Get(0) == nil {
		return nil, false
	}
	return args.Get(0).(*ToolDefinition), args.Bool(1)
}

func (m *MockToolRegistry) GetTools() []ToolSchema {
	args := m.Called()
	return args.Get(0).([]ToolSchema)
}

func (m *MockToolRegistry) ExecuteTool(ctx context.Context, name string, params json.RawMessage) (interface{}, error) {
	args := m.Called(ctx, name, params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0), args.Error(1)
}

// MockToolValidator is a mock implementation of ToolValidator
type MockToolValidator struct {
	mock.Mock
}

func (m *MockToolValidator) Validate(schema interface{}, params json.RawMessage) error {
	args := m.Called(schema, params)
	return args.Error(0)
}

// MockRequestMapper is a mock implementation of RequestMapper
type MockRequestMapper struct {
	mock.Mock
}

func (m *MockRequestMapper) Map(params json.RawMessage, requestType reflect.Type) (interface{}, error) {
	args := m.Called(params, requestType)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0), args.Error(1)
}

// MockResponseFormatter is a mock implementation of ResponseFormatter
type MockResponseFormatter struct {
	mock.Mock
}

func (m *MockResponseFormatter) Format(response interface{}) (interface{}, error) {
	args := m.Called(response)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0), args.Error(1)
}

// MockErrorTranslator is a mock implementation of ErrorTranslator
type MockErrorTranslator struct {
	mock.Mock
}

func (m *MockErrorTranslator) Translate(err error) error {
	args := m.Called(err)
	return args.Error(0)
}

func TestDefaultToolService_ExecuteTool(t *testing.T) {
	// Create mocks
	registry := new(MockToolRegistry)
	validator := new(MockToolValidator)
	requestMapper := new(MockRequestMapper)
	responseFormatter := new(MockResponseFormatter)
	errorTranslator := new(MockErrorTranslator)
	// Create a mock logger for testing
	logger := &logging.Logger{
		Logger: logrus.New(),
	}

	// Create service
	service := NewToolService(
		registry,
		validator,
		requestMapper,
		responseFormatter,
		errorTranslator,
		logger,
	)

	// Test data
	ctx := context.Background()
	toolName := "test_tool"
	params := json.RawMessage(`{"param1": "value1"}`)
	toolSchema := ToolSchema{
		Name:        toolName,
		Description: "Test tool",
		InputSchema: struct {
			Param1 string `json:"param1"`
		}{},
	}
	toolHandler := func(ctx context.Context, params json.RawMessage) (interface{}, error) {
		return map[string]string{"result": "success"}, nil
	}
	toolDef := &ToolDefinition{
		Schema:  toolSchema,
		Handler: toolHandler,
	}

	// Test cases
	t.Run("Tool not found", func(t *testing.T) {
		// Setup
		registry.On("GetTool", toolName).Return(nil, false).Once()
		errorTranslator.On("Translate", mock.Anything).Return(errors.New("tool not found")).Once()

		// Execute
		result, err := service.ExecuteTool(ctx, toolName, params)

		// Assert
		assert.Error(t, err)
		assert.Nil(t, result)
		registry.AssertExpectations(t)
		errorTranslator.AssertExpectations(t)
	})

	t.Run("Validation error", func(t *testing.T) {
		// Setup
		registry.On("GetTool", toolName).Return(toolDef, true).Once()
		validator.On("Validate", toolDef.Schema.InputSchema, params).Return(errors.New("validation error")).Once()
		errorTranslator.On("Translate", mock.Anything).Return(errors.New("validation error")).Once()

		// Execute
		result, err := service.ExecuteTool(ctx, toolName, params)

		// Assert
		assert.Error(t, err)
		assert.Nil(t, result)
		registry.AssertExpectations(t)
		validator.AssertExpectations(t)
		errorTranslator.AssertExpectations(t)
	})

	t.Run("Execution error", func(t *testing.T) {
		// Setup
		registry.On("GetTool", toolName).Return(toolDef, true).Once()
		validator.On("Validate", toolDef.Schema.InputSchema, params).Return(nil).Once()
		registry.On("ExecuteTool", ctx, toolName, params).Return(nil, errors.New("execution error")).Once()
		errorTranslator.On("Translate", mock.Anything).Return(errors.New("execution error")).Once()

		// Execute
		result, err := service.ExecuteTool(ctx, toolName, params)

		// Assert
		assert.Error(t, err)
		assert.Nil(t, result)
		registry.AssertExpectations(t)
		validator.AssertExpectations(t)
		errorTranslator.AssertExpectations(t)
	})

	t.Run("Formatting error", func(t *testing.T) {
		// Setup
		registry.On("GetTool", toolName).Return(toolDef, true).Once()
		validator.On("Validate", toolDef.Schema.InputSchema, params).Return(nil).Once()
		registry.On("ExecuteTool", ctx, toolName, params).Return(map[string]string{"result": "success"}, nil).Once()
		responseFormatter.On("Format", map[string]string{"result": "success"}).Return(nil, errors.New("formatting error")).Once()
		errorTranslator.On("Translate", mock.Anything).Return(errors.New("formatting error")).Once()

		// Execute
		result, err := service.ExecuteTool(ctx, toolName, params)

		// Assert
		assert.Error(t, err)
		assert.Nil(t, result)
		registry.AssertExpectations(t)
		validator.AssertExpectations(t)
		responseFormatter.AssertExpectations(t)
		errorTranslator.AssertExpectations(t)
	})

	t.Run("Success", func(t *testing.T) {
		// Setup
		registry.On("GetTool", toolName).Return(toolDef, true).Once()
		validator.On("Validate", toolDef.Schema.InputSchema, params).Return(nil).Once()
		registry.On("ExecuteTool", ctx, toolName, params).Return(map[string]string{"result": "success"}, nil).Once()
		responseFormatter.On("Format", map[string]string{"result": "success"}).Return(map[string]string{"result": "success"}, nil).Once()

		// Execute
		result, err := service.ExecuteTool(ctx, toolName, params)

		// Assert
		assert.NoError(t, err)
		assert.Equal(t, map[string]string{"result": "success"}, result)
		registry.AssertExpectations(t)
		validator.AssertExpectations(t)
		responseFormatter.AssertExpectations(t)
	})
}

func TestDefaultToolService_GetTools(t *testing.T) {
	// Create mocks
	registry := new(MockToolRegistry)
	validator := new(MockToolValidator)
	requestMapper := new(MockRequestMapper)
	responseFormatter := new(MockResponseFormatter)
	errorTranslator := new(MockErrorTranslator)
	// Create a mock logger for testing
	logger := &logging.Logger{
		Logger: logrus.New(),
	}

	// Create service
	service := NewToolService(
		registry,
		validator,
		requestMapper,
		responseFormatter,
		errorTranslator,
		logger,
	)

	// Test data
	tools := []ToolSchema{
		{
			Name:        "tool1",
			Description: "Tool 1",
			InputSchema: struct{}{},
		},
		{
			Name:        "tool2",
			Description: "Tool 2",
			InputSchema: struct{}{},
		},
	}

	// Setup
	registry.On("GetTools").Return(tools).Once()

	// Execute
	result := service.GetTools()

	// Assert
	assert.Equal(t, tools, result)
	registry.AssertExpectations(t)
}

func TestDefaultToolService_RegisterTool(t *testing.T) {
	// Create mocks
	registry := new(MockToolRegistry)
	validator := new(MockToolValidator)
	requestMapper := new(MockRequestMapper)
	responseFormatter := new(MockResponseFormatter)
	errorTranslator := new(MockErrorTranslator)
	// Create a mock logger for testing
	logger := &logging.Logger{
		Logger: logrus.New(),
	}

	// Create service
	service := NewToolService(
		registry,
		validator,
		requestMapper,
		responseFormatter,
		errorTranslator,
		logger,
	)

	// Test data
	toolName := "test_tool"
	toolDescription := "Test tool"
	toolSchema := struct {
		Param1 string `json:"param1"`
	}{}
	toolHandler := func(ctx context.Context, params json.RawMessage) (interface{}, error) {
		return map[string]string{"result": "success"}, nil
	}

	// Test cases
	t.Run("Success", func(t *testing.T) {
		// Setup
		registry.On("RegisterTool", toolName, toolDescription, toolSchema, mock.AnythingOfType("ToolHandler")).Return(nil).Once()

		// Execute
		err := service.RegisterTool(toolName, toolDescription, toolSchema, toolHandler)

		// Assert
		assert.NoError(t, err)
		registry.AssertExpectations(t)
	})

	t.Run("Error", func(t *testing.T) {
		// Setup
		registry.On("RegisterTool", toolName, toolDescription, toolSchema, mock.AnythingOfType("ToolHandler")).Return(errors.New("registration error")).Once()

		// Execute
		err := service.RegisterTool(toolName, toolDescription, toolSchema, toolHandler)

		// Assert
		assert.Error(t, err)
		registry.AssertExpectations(t)
	})
}
