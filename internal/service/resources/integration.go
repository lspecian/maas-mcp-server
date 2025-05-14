package resources

import (
	"context"
	"encoding/json" // Added import for json
	"fmt"

	"github.com/lspecian/maas-mcp-server/internal/logging"
	"github.com/lspecian/maas-mcp-server/internal/models"
	"github.com/lspecian/maas-mcp-server/internal/service"
	"github.com/lspecian/maas-mcp-server/internal/transport/mcp"
)

// ResourceServiceProvider provides access to the resource service
type ResourceServiceProvider struct {
	resourceService *ResourceService
	logger          *logging.Logger
}

// NewResourceServiceProvider creates a new resource service provider
func NewResourceServiceProvider(mcpService *service.MCPService, logger *logging.Logger) (*ResourceServiceProvider, error) {
	// Create the resource service
	resourceService, err := NewResourceService(mcpService, logger)
	if err != nil {
		return nil, fmt.Errorf("failed to create resource service: %w", err)
	}

	return &ResourceServiceProvider{
		resourceService: resourceService,
		logger:          logger,
	}, nil
}

// GetResource retrieves a resource by URI
func (p *ResourceServiceProvider) GetResource(ctx context.Context, uri string) (interface{}, error) {
	p.logger.WithContext(ctx).WithField("uri", uri).Info("Getting resource via provider")
	return p.resourceService.GetResource(ctx, uri)
}

// GetResourceURIPatterns returns all supported URI patterns
func (p *ResourceServiceProvider) GetResourceURIPatterns() []string {
	return p.resourceService.GetResourceURIPatterns()
}

// GetResourceHandlers returns all registered resource handlers
func (p *ResourceServiceProvider) GetResourceHandlers() []ResourceHandler {
	return p.resourceService.GetResourceHandlers()
}

// ValidateURI validates a URI against supported patterns
func (p *ResourceServiceProvider) ValidateURI(uri string) error {
	return p.resourceService.ValidateURI(uri)
}

// EnhanceServerInfo enhances the server info with resource URI patterns
func (p *ResourceServiceProvider) EnhanceServerInfo(serverInfo *models.MCPDiscoveryResponse) error {
	// Get the resource URI patterns
	patterns := p.GetResourceURIPatterns()

	// Add the resource URI patterns to the server info
	for _, pattern := range patterns {
		// Check if the pattern is already in the server info
		found := false
		for _, resource := range serverInfo.Result.Capabilities.Resources {
			if resource.URIPattern == pattern {
				found = true
				break
			}
		}

		// If the pattern is not already in the server info, add it
		if !found {
			// Parse the pattern to get the resource type
			parsedPattern, err := ParseURI(pattern)
			if err != nil {
				p.logger.WithError(err).WithField("pattern", pattern).Error("Failed to parse URI pattern")
				continue
			}

			// Add the resource to the server info
			serverInfo.Result.Capabilities.Resources = append(serverInfo.Result.Capabilities.Resources, models.MCPResource{
				Name:        parsedPattern.ResourceType,
				Description: fmt.Sprintf("Access %s resources", parsedPattern.ResourceType),
				URIPattern:  pattern,
			})
		}
	}

	return nil
}

// ResourceHandlerService is a service that implements the MCP service interface
// and delegates resource handling to the resource handlers
type ResourceHandlerService struct {
	provider *ResourceServiceProvider
	delegate mcp.Service
	logger   *logging.Logger
}

// NewResourceHandlerService creates a new resource handler service
func NewResourceHandlerService(provider *ResourceServiceProvider, delegate mcp.Service, logger *logging.Logger) *ResourceHandlerService {
	return &ResourceHandlerService{
		provider: provider,
		delegate: delegate,
		logger:   logger,
	}
}

// GetResource retrieves a resource by URI
func (s *ResourceHandlerService) GetResource(ctx context.Context, uri string) (interface{}, error) {
	// Try to handle the URI with the resource handlers
	result, err := s.provider.GetResource(ctx, uri)
	if err != nil {
		// If the resource handlers can't handle the URI, fall back to the delegate
		s.logger.WithContext(ctx).WithError(err).WithField("uri", uri).Debug("Resource handlers failed, falling back to delegate")
		return s.delegate.GetResource(ctx, uri)
	}
	return result, nil
}

// GetServerInfo returns information about the MCP server
func (s *ResourceHandlerService) GetServerInfo(ctx context.Context) (*models.MCPDiscoveryResponse, error) {
	// Get the server info from the delegate
	serverInfo, err := s.delegate.GetServerInfo(ctx)
	if err != nil {
		return nil, err
	}

	// Enhance the server info with resource URI patterns
	if err := s.provider.EnhanceServerInfo(serverInfo); err != nil {
		s.logger.WithContext(ctx).WithError(err).Error("Failed to enhance server info")
	}

	return serverInfo, nil
}

// ExecuteTool executes a tool with the given parameters
func (s *ResourceHandlerService) ExecuteTool(ctx context.Context, toolName string, params map[string]interface{}) (interface{}, error) {
	// Marshal params to json.RawMessage
	rawParams, err := json.Marshal(params)
	if err != nil {
		s.logger.WithContext(ctx).WithError(err).Error("Failed to marshal tool parameters")
		// Consider returning a structured error, e.g., using errors.NewValidationError
		return nil, fmt.Errorf("failed to marshal tool parameters: %w", err)
	}
	// Delegate to the original service
	return s.delegate.ExecuteTool(ctx, toolName, rawParams) // Pass rawParams
}

// NegotiateVersion negotiates the protocol version with the client
func (s *ResourceHandlerService) NegotiateVersion(ctx context.Context, clientVersion string) (string, error) {
	// Delegate to the original service
	return s.delegate.NegotiateVersion(ctx, clientVersion)
}
