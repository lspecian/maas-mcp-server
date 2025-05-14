package resources

import (
	"context"
	"fmt"

	"github.com/lspecian/maas-mcp-server/internal/errors"
	"github.com/lspecian/maas-mcp-server/internal/logging"
	"github.com/lspecian/maas-mcp-server/internal/service"
)

// ResourceService handles resource access requests
type ResourceService struct {
	registry   *Registry
	logger     *logging.Logger
	mcpService *service.MCPService
	cache      *ResourceCache
}

// NewResourceService creates a new resource service
func NewResourceService(mcpService *service.MCPService, logger *logging.Logger) (*ResourceService, error) {
	// Create the service
	s := &ResourceService{
		registry:   NewRegistry(logger),
		logger:     logger,
		mcpService: mcpService,
		cache:      NewResourceCache(logger),
	}

	// Register handlers
	if err := s.registerHandlers(); err != nil {
		return nil, fmt.Errorf("failed to register resource handlers: %w", err)
	}

	logger.Info("Resource service initialized with caching support")
	return s, nil
}

// registerHandlers registers all resource handlers
func (s *ResourceService) registerHandlers() error {
	// Register machine handler
	machineHandler := NewMachineResourceHandler(s.mcpService, s.logger)
	if err := s.registry.RegisterHandler(machineHandler); err != nil {
		return fmt.Errorf("failed to register machine handler: %w", err)
	}

	// Register network handler
	networkHandler := NewNetworkResourceHandler(s.mcpService, s.logger)
	if err := s.registry.RegisterHandler(networkHandler); err != nil {
		return fmt.Errorf("failed to register network handler: %w", err)
	}

	// Register storage handler
	storageHandler := NewStorageResourceHandler(s.mcpService, s.logger)
	if err := s.registry.RegisterHandler(storageHandler); err != nil {
		return fmt.Errorf("failed to register storage handler: %w", err)
	}

	// Register tag handler
	tagHandler := NewTagResourceHandler(s.mcpService, s.logger)
	if err := s.registry.RegisterHandler(tagHandler); err != nil {
		return fmt.Errorf("failed to register tag handler: %w", err)
	}

	return nil
}

// GetResource retrieves a resource by URI
func (s *ResourceService) GetResource(ctx context.Context, uri string) (interface{}, error) {
	return s.GetResourceWithContentType(ctx, uri, "", ContentTypeJSON, nil)
}

// GetResourceWithContentType retrieves a resource by URI with content type
func (s *ResourceService) GetResourceWithContentType(ctx context.Context, uri string, contentType string, acceptType string, payload interface{}) (interface{}, error) {
	s.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"uri":         uri,
		"contentType": contentType,
		"acceptType":  acceptType,
	}).Info("Getting resource")

	// Parse the URI to extract query parameters for cache key generation
	parsedURI, err := ParseURI(uri)
	if err != nil {
		return nil, NewResourceError(ErrorCodeInvalidURI, fmt.Sprintf("Invalid URI: %s", err.Error()), err)
	}

	// Generate cache key
	cacheKey := s.cache.GenerateCacheKey(uri, parsedURI.QueryParams)

	// Check cache options from query parameters
	cacheOptions := ParseCacheParams(parsedURI.QueryParams)

	// Try to get from cache if caching is enabled and it's a GET request (no payload)
	if cacheOptions.Enabled && payload == nil {
		if cachedResult, found := s.cache.Get(ctx, cacheKey); found {
			s.logger.WithContext(ctx).WithFields(map[string]interface{}{
				"uri":       uri,
				"cache_key": cacheKey,
			}).Debug("Returning cached resource")
			return cachedResult, nil
		}
	}

	// Set default content type if not provided
	if contentType == "" {
		contentType = ContentTypeJSON
	}

	// Set default accept type if not provided
	if acceptType == "" {
		acceptType = ContentTypeJSON
	}

	// Handle the request
	response, err := s.registry.HandleRequest(ctx, uri, contentType, acceptType, payload)
	if err != nil {
		s.logger.WithContext(ctx).WithError(err).WithField("uri", uri).Error("Failed to get resource")
		return nil, err
	}

	// Cache the result if caching is enabled and it's a GET request (no payload)
	if cacheOptions.Enabled && payload == nil {
		s.cache.Set(ctx, cacheKey, response, cacheOptions.TTL)
	}

	s.logger.WithContext(ctx).WithField("uri", uri).Debug("Successfully retrieved resource")
	return response, nil
}

// GetResourceHandlers returns all registered resource handlers
func (s *ResourceService) GetResourceHandlers() []ResourceHandler {
	return s.registry.GetHandlers()
}

// GetResourceURIPatterns returns all supported URI patterns
func (s *ResourceService) GetResourceURIPatterns() []string {
	handlers := s.registry.GetHandlers()
	patterns := make([]string, 0)

	for _, handler := range handlers {
		patterns = append(patterns, handler.GetURIPatterns()...)
	}

	return patterns
}

// ValidateURI validates a URI against supported patterns
func (s *ResourceService) ValidateURI(uri string) error {
	handlers := s.registry.GetHandlers()

	for _, handler := range handlers {
		for _, pattern := range handler.GetURIPatterns() {
			if err := ValidateURI(uri, pattern); err == nil {
				return nil
			}
		}
	}

	return errors.NewValidationError(fmt.Sprintf("URI does not match any supported pattern: %s", uri), nil)
}

// ParseURI parses a URI into its components
func (s *ResourceService) ParseURI(uri string) (*URIPattern, error) {
	return ParseURI(uri)
}
