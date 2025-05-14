package tools

import (
	"context"
	"fmt"
	"net/http"

	"github.com/lspecian/maas-mcp-server/internal/errors"
	"github.com/lspecian/maas-mcp-server/internal/logging"
	"github.com/lspecian/maas-mcp-server/internal/models"
	"github.com/lspecian/maas-mcp-server/internal/service"
)

// ListMachinesTool implements the Tool interface for listing machines
type ListMachinesTool struct {
	machineService *service.MachineService
	logger         *logging.Logger
}

// NewListMachinesTool creates a new ListMachinesTool
func NewListMachinesTool(machineService *service.MachineService, logger *logging.Logger) *ListMachinesTool {
	return &ListMachinesTool{
		machineService: machineService,
		logger:         logger,
	}
}

// Execute implements the Tool interface
func (t *ListMachinesTool) Execute(ctx context.Context, params interface{}) (interface{}, error) {
	// Cast params to the expected type
	listParams, ok := params.(*models.MachineListingRequest)
	if !ok {
		return nil, errors.NewValidationError("Invalid parameters type", nil)
	}

	// Create filters map from the request parameters
	filters := make(map[string]string)
	if listParams.Hostname != "" {
		filters["hostname"] = listParams.Hostname
	}
	if listParams.Zone != "" {
		filters["zone"] = listParams.Zone
	}
	if listParams.Pool != "" {
		filters["pool"] = listParams.Pool
	}
	if listParams.Status != "" {
		filters["status"] = listParams.Status
	}
	if listParams.PowerState != "" {
		filters["power_state"] = listParams.PowerState
	}
	if listParams.SystemID != "" {
		filters["system_id"] = listParams.SystemID
	}
	if listParams.Architecture != "" {
		filters["architecture"] = listParams.Architecture
	}
	if len(listParams.Tags) > 0 {
		// Join tags with commas for the filter
		tags := ""
		for i, tag := range listParams.Tags {
			if i > 0 {
				tags += ","
			}
			tags += tag
		}
		filters["tags"] = tags
	}

	// Add storage constraints if provided
	if listParams.StorageConstraints != nil {
		// Validate storage constraints
		if err := listParams.StorageConstraints.Validate(); err != nil {
			return nil, errors.NewValidationError(fmt.Sprintf("Invalid storage constraints: %v", err), nil)
		}

		// Add minimum disk size constraint
		if listParams.StorageConstraints.MinSize > 0 {
			filters["min_disk_size"] = fmt.Sprintf("%d", listParams.StorageConstraints.MinSize)
		}

		// Add disk type constraint
		if listParams.StorageConstraints.DiskType != "" && listParams.StorageConstraints.DiskType != "any" {
			filters["disk_type"] = listParams.StorageConstraints.DiskType
		}

		// Add disk count constraint
		if listParams.StorageConstraints.Count > 0 {
			filters["min_disk_count"] = fmt.Sprintf("%d", listParams.StorageConstraints.Count)
		}
	}

	// Create pagination options if provided
	var paginationOptions *models.PaginationOptions
	if listParams.Limit > 0 || listParams.Offset > 0 || listParams.Page > 0 {
		paginationOptions = &models.PaginationOptions{
			Limit:  listParams.Limit,
			Offset: listParams.Offset,
			Page:   listParams.Page,
		}

		// Set default limit if not provided
		if paginationOptions.Limit == 0 {
			paginationOptions.Limit = 50
		}

		// Set default page if not provided and offset is 0
		if paginationOptions.Page == 0 && paginationOptions.Offset == 0 {
			paginationOptions.Page = 1
		}

		// Calculate offset from page if offset is 0 and page is provided
		if paginationOptions.Offset == 0 && paginationOptions.Page > 0 {
			paginationOptions.Offset = (paginationOptions.Page - 1) * paginationOptions.Limit
		}
	}

	// Call the service to list machines
	result, err := t.machineService.ListMachinesPaginated(ctx, filters, paginationOptions)
	if err != nil {
		t.logger.WithError(err).Error("Failed to list machines")
		return nil, mapServiceError(err)
	}

	// Return the result
	return result, nil
}

// DiscoverMachinesTool implements the Tool interface for discovering machines
type DiscoverMachinesTool struct {
	machineService *service.MachineService
	logger         *logging.Logger
}

// NewDiscoverMachinesTool creates a new DiscoverMachinesTool
func NewDiscoverMachinesTool(machineService *service.MachineService, logger *logging.Logger) *DiscoverMachinesTool {
	return &DiscoverMachinesTool{
		machineService: machineService,
		logger:         logger,
	}
}

// Execute implements the Tool interface
func (t *DiscoverMachinesTool) Execute(ctx context.Context, params interface{}) (interface{}, error) {
	// Cast params to the expected type
	discoverParams, ok := params.(*models.MachineDiscoveryRequest)
	if !ok {
		return nil, errors.NewValidationError("Invalid parameters type", nil)
	}

	// Create discovery options
	options := &models.MachineDiscoveryOptions{
		CommissioningEnabled: discoverParams.CommissioningEnabled,
		ScanNetworks:         discoverParams.ScanNetworks,
		ScanStorage:          discoverParams.ScanStorage,
	}

	// Call the service to discover machines
	result, err := t.machineService.DiscoverMachines(ctx, options)
	if err != nil {
		t.logger.WithError(err).Error("Failed to discover machines")
		return nil, mapServiceError(err)
	}

	// Return the result
	return result, nil
}

// Helper function to map service errors to appropriate HTTP errors
func mapServiceError(err error) error {
	if serviceErr, ok := err.(*service.ServiceError); ok {
		// Create an appropriate error based on the status code
		switch serviceErr.StatusCode {
		case http.StatusBadRequest:
			return errors.NewValidationError(serviceErr.Error(), serviceErr.Err)
		case http.StatusNotFound:
			return errors.NewNotFoundError(serviceErr.Error(), serviceErr.Err)
		case http.StatusUnauthorized:
			return errors.NewUnauthorizedError(serviceErr.Error(), serviceErr.Err)
		case http.StatusForbidden:
			return errors.NewForbiddenError(serviceErr.Error(), serviceErr.Err)
		default:
			return errors.NewInternalError(serviceErr.Error(), serviceErr.Err)
		}
	}
	return errors.NewInternalError(fmt.Sprintf("Internal server error: %v", err), err)
}
