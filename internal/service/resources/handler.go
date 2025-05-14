package resources

import (
	"context"
	"fmt"
	"regexp"
	"sync"
	"time"

	"github.com/lspecian/maas-mcp-server/internal/errors"
	"github.com/lspecian/maas-mcp-server/internal/logging"
)

// ResourceRequest represents a request for a resource
type ResourceRequest struct {
	URI           string
	Parameters    map[string]string
	QueryParams   map[string]string
	FilterOptions *FilterOptions
	PageOptions   *PaginationOptions
	CacheOptions  *CacheOptions
	Payload       interface{}
	ContentType   string
	AcceptType    string
}

// ResourceResponse represents a response for a resource
type ResourceResponse struct {
	Data       interface{}            `json:"data"`
	Metadata   map[string]interface{} `json:"metadata,omitempty"`
	Links      map[string]string      `json:"links,omitempty"`
	Pagination *PaginationMetadata    `json:"pagination,omitempty"`
	Timestamp  int64                  `json:"timestamp"`
}

// PaginationMetadata represents pagination metadata
type PaginationMetadata struct {
	TotalCount int `json:"totalCount"`
	PageCount  int `json:"pageCount"`
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	Offset     int `json:"offset"`
}

// NewResourceResponse creates a new resource response
func NewResourceResponse(data interface{}) *ResourceResponse {
	return &ResourceResponse{
		Data:      data,
		Metadata:  make(map[string]interface{}),
		Links:     make(map[string]string),
		Timestamp: GetCurrentTimestamp(),
	}
}

// WithMetadata adds metadata to the response
func (r *ResourceResponse) WithMetadata(key string, value interface{}) *ResourceResponse {
	r.Metadata[key] = value
	return r
}

// WithLink adds a link to the response
func (r *ResourceResponse) WithLink(rel, href string) *ResourceResponse {
	r.Links[rel] = href
	return r
}

// WithPagination adds pagination metadata to the response
func (r *ResourceResponse) WithPagination(paginatedResult *PaginatedResult) *ResourceResponse {
	r.Pagination = &PaginationMetadata{
		TotalCount: paginatedResult.TotalCount,
		PageCount:  paginatedResult.PageCount,
		Page:       paginatedResult.Page,
		Limit:      paginatedResult.Limit,
		Offset:     paginatedResult.Offset,
	}
	return r
}

// GetCurrentTimestamp returns the current timestamp in milliseconds
func GetCurrentTimestamp() int64 {
	return time.Now().UnixNano() / int64(time.Millisecond)
}

// ResourceHandler defines the interface for handling resource requests
type ResourceHandler interface {
	// GetName returns the name of the resource handler
	GetName() string

	// GetURIPatterns returns the URI patterns supported by this handler
	GetURIPatterns() []string

	// HandleRequest handles a resource request
	HandleRequest(ctx context.Context, request *ResourceRequest) (interface{}, error)

	// CanHandle checks if this handler can handle the given URI
	CanHandle(uri string) bool
}

// BaseResourceHandler provides a base implementation of ResourceHandler
type BaseResourceHandler struct {
	Name        string
	URIPatterns []string
	Logger      *logging.Logger
}

// GetName returns the name of the resource handler
func (h *BaseResourceHandler) GetName() string {
	return h.Name
}

// GetURIPatterns returns the URI patterns supported by this handler
func (h *BaseResourceHandler) GetURIPatterns() []string {
	return h.URIPatterns
}

// CanHandle checks if this handler can handle the given URI
func (h *BaseResourceHandler) CanHandle(uri string) bool {
	for _, pattern := range h.URIPatterns {
		if err := ValidateURI(uri, pattern); err == nil {
			return true
		}
	}
	return false
}

// HandleRequest handles a resource request
func (h *BaseResourceHandler) HandleRequest(ctx context.Context, request *ResourceRequest) (interface{}, error) {
	return nil, errors.NewUnsupportedOperationError("HandleRequest not implemented", nil)
}

// Registry manages resource handlers
type Registry struct {
	handlers map[string]ResourceHandler
	patterns map[string]ResourceHandler
	mu       sync.RWMutex
	logger   *logging.Logger
}

// NewRegistry creates a new resource handler registry
func NewRegistry(logger *logging.Logger) *Registry {
	return &Registry{
		handlers: make(map[string]ResourceHandler),
		patterns: make(map[string]ResourceHandler),
		logger:   logger,
	}
}

// RegisterHandler registers a resource handler
func (r *Registry) RegisterHandler(handler ResourceHandler) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	name := handler.GetName()
	if _, exists := r.handlers[name]; exists {
		return fmt.Errorf("handler with name '%s' already registered", name)
	}

	r.handlers[name] = handler

	// Register patterns
	for _, pattern := range handler.GetURIPatterns() {
		r.patterns[pattern] = handler
	}

	r.logger.WithFields(map[string]interface{}{
		"handler":  name,
		"patterns": handler.GetURIPatterns(),
	}).Info("Registered resource handler")

	return nil
}

// GetHandler returns a handler for the given URI
func (r *Registry) GetHandler(uri string) (ResourceHandler, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	// First, try to find a handler by exact pattern match
	_, err := ParseURI(uri)
	if err != nil {
		return nil, errors.NewValidationError(fmt.Sprintf("Invalid URI: %s", err.Error()), err)
	}

	// Try to find a handler by checking if it can handle the URI
	for _, handler := range r.handlers {
		if handler.CanHandle(uri) {
			return handler, nil
		}
	}

	return nil, errors.NewNotFoundError(fmt.Sprintf("No handler found for URI: %s", uri), nil)
}

// HandleRequest handles a resource request
func (r *Registry) HandleRequest(ctx context.Context, uri string, contentType, acceptType string, payload interface{}) (*ResourceResponse, error) {
	// Get handler for URI
	handler, err := r.GetHandler(uri)
	if err != nil {
		return nil, err
	}

	// Find the matching pattern
	var matchingPattern string
	for _, pattern := range handler.GetURIPatterns() {
		if err := ValidateURI(uri, pattern); err == nil {
			matchingPattern = pattern
			break
		}
	}

	// Parse the URI against the pattern
	parseResult, err := MatchURI(uri, matchingPattern)
	if err != nil {
		return nil, NewResourceError(ErrorCodeInvalidURI, fmt.Sprintf("Failed to parse URI: %s", err.Error()), err)
	}

	// Parse filter options
	filterOptions, err := ParseFilterParams(parseResult.QueryParams)
	if err != nil {
		return nil, WrapError(err, "Failed to parse filter parameters")
	}

	// Parse pagination options
	paginationOptions, err := ParsePaginationParams(parseResult.QueryParams)
	if err != nil {
		return nil, WrapError(err, "Failed to parse pagination parameters")
	}

	// Parse cache options
	cacheOptions := ParseCacheParams(parseResult.QueryParams)

	// Create the request
	request := &ResourceRequest{
		URI:           uri,
		Parameters:    parseResult.Parameters,
		QueryParams:   parseResult.QueryParams,
		FilterOptions: filterOptions,
		PageOptions:   paginationOptions,
		CacheOptions:  cacheOptions,
		Payload:       payload,
		ContentType:   contentType,
		AcceptType:    acceptType,
	}

	// Validate the request
	validator := r.getValidator()
	if validator != nil {
		validationResult := validator.Validate(request)
		if !validationResult.Valid {
			return nil, validationResult.ToAppError()
		}
	}

	// Log request details
	r.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"uri":         uri,
		"handler":     handler.GetName(),
		"contentType": contentType,
		"acceptType":  acceptType,
		"filtering":   filterOptions != nil && len(filterOptions.RootGroup.Conditions) > 0,
		"pagination": map[string]interface{}{
			"limit":  paginationOptions.Limit,
			"offset": paginationOptions.Offset,
			"page":   paginationOptions.Page,
		},
		"caching": cacheOptions.Enabled,
	}).Debug("Processing resource request")

	// Handle the request
	result, err := handler.HandleRequest(ctx, request)
	if err != nil {
		return nil, err
	}

	// Create response
	response := NewResourceResponse(result)

	// Add pagination metadata if result is paginated
	if paginated, ok := result.(*PaginatedResult); ok {
		response.WithPagination(paginated)
	}

	// Add links
	response.WithLink("self", uri)

	return response, nil
}

// GetHandlers returns all registered handlers
func (r *Registry) GetHandlers() []ResourceHandler {
	r.mu.RLock()
	defer r.mu.RUnlock()

	handlers := make([]ResourceHandler, 0, len(r.handlers))
	for _, handler := range r.handlers {
		handlers = append(handlers, handler)
	}

	return handlers
}

// getValidator returns a validator for resource requests
func (r *Registry) getValidator() Validator {
	// Create validators
	uriValidator := NewURIValidator(r)

	// Create parameter validation rules
	paramRules := map[string]ParamRule{
		"limit": {
			Required:    false,
			Pattern:     regexp.MustCompile(`^[0-9]+$`),
			Description: "Maximum number of items to return",
		},
		"offset": {
			Required:    false,
			Pattern:     regexp.MustCompile(`^[0-9]+$`),
			Description: "Number of items to skip",
		},
		"page": {
			Required:    false,
			Pattern:     regexp.MustCompile(`^[0-9]+$`),
			Description: "Page number",
		},
		"filter": {
			Required:    false,
			Description: "Filter expression",
		},
		"sort": {
			Required:    false,
			Description: "Sort expression",
		},
		"fields": {
			Required:    false,
			Description: "Fields to include in response",
		},
		"cache": {
			Required:    false,
			Enum:        []string{"true", "false"},
			Description: "Enable/disable caching",
		},
	}

	paramValidator := NewQueryParamValidator(paramRules)

	// Create composite validator
	return NewCompositeValidator(uriValidator, paramValidator)
}
