package resources

import (
	"context"
	"reflect"

	"github.com/lspecian/maas-mcp-server/internal/logging"
)

// ResourceProcessor provides utility functions for processing resources
type ResourceProcessor struct {
	Logger *logging.Logger
}

// NewResourceProcessor creates a new resource processor
func NewResourceProcessor(logger *logging.Logger) *ResourceProcessor {
	return &ResourceProcessor{
		Logger: logger,
	}
}

// ProcessResource applies filtering and pagination to a resource
func (p *ResourceProcessor) ProcessResource(ctx context.Context, resource interface{}, request *ResourceRequest) (interface{}, error) {
	result := resource

	// Apply filtering if needed
	if request.FilterOptions != nil && len(request.FilterOptions.RootGroup.Conditions) > 0 {
		p.Logger.WithContext(ctx).WithFields(map[string]interface{}{
			"uri":        request.URI,
			"conditions": len(request.FilterOptions.RootGroup.Conditions),
		}).Debug("Applying filters to resource")

		// Check if result is a slice that can be filtered
		if isSlice(result) {
			filteredResult, err := ApplyFilters(result, request.FilterOptions)
			if err != nil {
				p.Logger.WithContext(ctx).WithError(err).Warn("Failed to apply filters")
			} else {
				result = filteredResult
			}
		}
	}

	// Apply pagination if needed
	if request.PageOptions != nil && isSlice(result) {
		p.Logger.WithContext(ctx).WithFields(map[string]interface{}{
			"uri":    request.URI,
			"limit":  request.PageOptions.Limit,
			"offset": request.PageOptions.Offset,
			"page":   request.PageOptions.Page,
		}).Debug("Applying pagination to resource")

		paginatedResult, err := ApplyPagination(result, request.PageOptions)
		if err != nil {
			p.Logger.WithContext(ctx).WithError(err).Warn("Failed to apply pagination")
		} else {
			result = paginatedResult
		}
	}

	return result, nil
}

// isSlice checks if a value is a slice
func isSlice(value interface{}) bool {
	if value == nil {
		return false
	}
	return reflect.TypeOf(value).Kind() == reflect.Slice
}
