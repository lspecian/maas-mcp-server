package resources

import (
	"fmt"

	"github.com/lspecian/maas-mcp-server/internal/errors"
	"github.com/lspecian/maas-mcp-server/internal/logging"
)

// ResourceMapper defines the interface for mapping between MAAS and MCP resources
type ResourceMapper interface {
	// GetName returns the name of the resource mapper
	GetName() string

	// MapToMCP maps a MAAS resource to an MCP resource
	MapToMCP(maasResource interface{}) (interface{}, error)

	// MapToMaas maps an MCP resource to a MAAS resource
	MapToMaas(mcpResource interface{}) (interface{}, error)
}

// BaseResourceMapper provides a base implementation of ResourceMapper
type BaseResourceMapper struct {
	Name   string
	Logger *logging.Logger
}

// GetName returns the name of the resource mapper
func (m *BaseResourceMapper) GetName() string {
	return m.Name
}

// MapToMCP maps a MAAS resource to an MCP resource
func (m *BaseResourceMapper) MapToMCP(maasResource interface{}) (interface{}, error) {
	return nil, errors.NewUnsupportedOperationError("MapToMCP not implemented", nil)
}

// MapToMaas maps an MCP resource to a MAAS resource
func (m *BaseResourceMapper) MapToMaas(mcpResource interface{}) (interface{}, error) {
	return nil, errors.NewUnsupportedOperationError("MapToMaas not implemented", nil)
}

// MapperRegistry manages resource mappers
type MapperRegistry struct {
	mappers map[string]ResourceMapper
	logger  *logging.Logger
}

// NewMapperRegistry creates a new resource mapper registry
func NewMapperRegistry(logger *logging.Logger) *MapperRegistry {
	return &MapperRegistry{
		mappers: make(map[string]ResourceMapper),
		logger:  logger,
	}
}

// RegisterMapper registers a resource mapper
func (r *MapperRegistry) RegisterMapper(mapper ResourceMapper) error {
	name := mapper.GetName()
	if _, exists := r.mappers[name]; exists {
		return fmt.Errorf("mapper with name '%s' already registered", name)
	}

	r.mappers[name] = mapper
	r.logger.WithFields(map[string]interface{}{
		"mapper": name,
	}).Info("Registered resource mapper")

	return nil
}

// GetMapper returns a mapper by name
func (r *MapperRegistry) GetMapper(name string) (ResourceMapper, error) {
	mapper, exists := r.mappers[name]
	if !exists {
		return nil, errors.NewNotFoundError(fmt.Sprintf("No mapper found with name: %s", name), nil)
	}
	return mapper, nil
}

// MapToMCP maps a MAAS resource to an MCP resource using the appropriate mapper
func (r *MapperRegistry) MapToMCP(resourceType string, maasResource interface{}) (interface{}, error) {
	mapper, err := r.GetMapper(resourceType)
	if err != nil {
		return nil, err
	}
	return mapper.MapToMCP(maasResource)
}

// MapToMaas maps an MCP resource to a MAAS resource using the appropriate mapper
func (r *MapperRegistry) MapToMaas(resourceType string, mcpResource interface{}) (interface{}, error) {
	mapper, err := r.GetMapper(resourceType)
	if err != nil {
		return nil, err
	}
	return mapper.MapToMaas(mcpResource)
}
