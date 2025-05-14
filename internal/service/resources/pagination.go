package resources

import (
	"fmt"
	"reflect"
	"strconv"

	"github.com/lspecian/maas-mcp-server/internal/errors"
)

// Default pagination values
const (
	DefaultLimit  = 50
	MaxLimit      = 1000
	DefaultOffset = 0
)

// PaginationOptions represents pagination parameters
type PaginationOptions struct {
	Limit  int
	Offset int
	Page   int
}

// PaginatedResult represents a paginated result set
type PaginatedResult struct {
	Items      interface{} `json:"items"`
	TotalCount int         `json:"total_count"`
	Limit      int         `json:"limit"`
	Offset     int         `json:"offset"`
	Page       int         `json:"page"`
	PageCount  int         `json:"page_count"`
}

// NewPaginationOptions creates a new PaginationOptions with default values
func NewPaginationOptions() *PaginationOptions {
	return &PaginationOptions{
		Limit:  DefaultLimit,
		Offset: DefaultOffset,
		Page:   1,
	}
}

// ParsePaginationParams parses pagination parameters from query parameters
func ParsePaginationParams(queryParams map[string]string) (*PaginationOptions, error) {
	options := NewPaginationOptions()

	// Parse limit
	if limitStr, ok := queryParams["limit"]; ok && limitStr != "" {
		limit, err := strconv.Atoi(limitStr)
		if err != nil {
			return nil, errors.NewValidationError(fmt.Sprintf("Invalid limit parameter: %s", err.Error()), err)
		}
		if limit < 1 {
			return nil, errors.NewValidationError("Limit must be greater than 0", nil)
		}
		if limit > MaxLimit {
			limit = MaxLimit
		}
		options.Limit = limit
	}

	// Parse offset or page
	if offsetStr, ok := queryParams["offset"]; ok && offsetStr != "" {
		offset, err := strconv.Atoi(offsetStr)
		if err != nil {
			return nil, errors.NewValidationError(fmt.Sprintf("Invalid offset parameter: %s", err.Error()), err)
		}
		if offset < 0 {
			return nil, errors.NewValidationError("Offset must be non-negative", nil)
		}
		options.Offset = offset
		// Calculate page from offset
		options.Page = (offset / options.Limit) + 1
	} else if pageStr, ok := queryParams["page"]; ok && pageStr != "" {
		page, err := strconv.Atoi(pageStr)
		if err != nil {
			return nil, errors.NewValidationError(fmt.Sprintf("Invalid page parameter: %s", err.Error()), err)
		}
		if page < 1 {
			return nil, errors.NewValidationError("Page must be greater than 0", nil)
		}
		options.Page = page
		// Calculate offset from page
		options.Offset = (page - 1) * options.Limit
	}

	return options, nil
}

// ApplyPagination applies pagination to a slice of resources
func ApplyPagination(resources interface{}, options *PaginationOptions) (*PaginatedResult, error) {
	if options == nil {
		options = NewPaginationOptions()
	}

	// Get the slice value
	sliceValue := reflect.ValueOf(resources)
	if sliceValue.Kind() != reflect.Slice {
		return nil, fmt.Errorf("resources must be a slice")
	}

	// Get total count
	totalCount := sliceValue.Len()

	// Calculate page count
	pageCount := (totalCount + options.Limit - 1) / options.Limit
	if pageCount == 0 {
		pageCount = 1
	}

	// Validate offset
	if options.Offset >= totalCount && totalCount > 0 {
		return nil, errors.NewValidationError(fmt.Sprintf("Offset %d is out of range (total: %d)", options.Offset, totalCount), nil)
	}

	// Calculate start and end indices
	startIndex := options.Offset
	endIndex := startIndex + options.Limit
	if endIndex > totalCount {
		endIndex = totalCount
	}

	// Create a new slice with the paginated items
	resultSlice := reflect.MakeSlice(sliceValue.Type(), 0, endIndex-startIndex)
	for i := startIndex; i < endIndex; i++ {
		resultSlice = reflect.Append(resultSlice, sliceValue.Index(i))
	}

	// Create the paginated result
	result := &PaginatedResult{
		Items:      resultSlice.Interface(),
		TotalCount: totalCount,
		Limit:      options.Limit,
		Offset:     options.Offset,
		Page:       options.Page,
		PageCount:  pageCount,
	}

	return result, nil
}
