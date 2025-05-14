package service

import (
	"context"
	"fmt"
	"net/http"

	"github.com/lspecian/maas-mcp-server/internal/logging"
	"github.com/lspecian/maas-mcp-server/internal/models"
)

// ServiceError represents an error from a service
type ServiceError struct {
	Err        error
	StatusCode int
	Message    string
}

// Error returns the error message
func (e *ServiceError) Error() string {
	if e.Message != "" {
		return e.Message
	}
	if e.Err != nil {
		return e.Err.Error()
	}
	return "unknown error"
}

// Unwrap returns the underlying error
func (e *ServiceError) Unwrap() error {
	return e.Err
}

// Common error types
var (
	ErrNotFound           = fmt.Errorf("not found")
	ErrBadRequest         = fmt.Errorf("bad request")
	ErrUnauthorized       = fmt.Errorf("unauthorized")
	ErrForbidden          = fmt.Errorf("forbidden")
	ErrInternalServer     = fmt.Errorf("internal server error")
	ErrServiceUnavailable = fmt.Errorf("service unavailable")
	ErrConflict           = fmt.Errorf("conflict") // Added for HTTP 409
)

// MCPService is the main service for MCP operations
type MCPService struct {
	machineService *MachineService
	networkService *NetworkService
	tagService     *TagService
	storageService *StorageService // Added StorageService
	logger         *logging.Logger
}

// NewMCPService creates a new MCP service
func NewMCPService(
	machineService *MachineService,
	networkService *NetworkService,
	tagService *TagService,
	storageService *StorageService, // Added StorageService
	logger *logging.Logger,
) *MCPService {
	return &MCPService{
		machineService: machineService,
		networkService: networkService,
		tagService:     tagService,
		storageService: storageService, // Added StorageService
		logger:         logger,
	}
}

// ListMachines lists machines with optional filtering
func (s *MCPService) ListMachines(ctx context.Context, params interface{}) (interface{}, error) {
	s.logger.Debug("MCPService.ListMachines called")

	// Convert params to the expected type
	req, ok := params.(*models.MachineListingRequest)
	if !ok {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Invalid parameters",
		}
	}

	// Create filters map from the request parameters
	filters := make(map[string]string)
	if req.Hostname != "" {
		filters["hostname"] = req.Hostname
	}
	if req.Zone != "" {
		filters["zone"] = req.Zone
	}
	if req.Pool != "" {
		filters["pool"] = req.Pool
	}
	if req.Status != "" {
		filters["status"] = req.Status
	}
	if req.PowerState != "" {
		filters["power_state"] = req.PowerState
	}
	if req.SystemID != "" {
		filters["system_id"] = req.SystemID
	}
	if req.Architecture != "" {
		filters["architecture"] = req.Architecture
	}
	if len(req.Tags) > 0 {
		// Join tags with commas for the filter
		tags := ""
		for i, tag := range req.Tags {
			if i > 0 {
				tags += ","
			}
			tags += tag
		}
		filters["tags"] = tags
	}

	// Create pagination options if provided
	var paginationOptions *models.PaginationOptions
	if req.Limit > 0 || req.Offset > 0 || req.Page > 0 {
		paginationOptions = &models.PaginationOptions{
			Limit:  req.Limit,
			Offset: req.Offset,
			Page:   req.Page,
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

	// Call the machine service to list machines
	return s.machineService.ListMachinesPaginated(ctx, filters, paginationOptions)
}

// DiscoverMachines discovers machines in the network
func (s *MCPService) DiscoverMachines(ctx context.Context, params interface{}) (interface{}, error) {
	s.logger.Debug("MCPService.DiscoverMachines called")

	// Convert params to the expected type
	req, ok := params.(*models.MachineDiscoveryRequest)
	if !ok {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Invalid parameters",
		}
	}

	// Create discovery options
	options := &models.MachineDiscoveryOptions{
		CommissioningEnabled: req.CommissioningEnabled,
		ScanNetworks:         req.ScanNetworks,
		ScanStorage:          req.ScanStorage,
	}

	// Call the machine service to discover machines
	return s.machineService.DiscoverMachines(ctx, options)
}

// GetMachineDetails gets details for a specific machine
func (s *MCPService) GetMachineDetails(ctx context.Context, systemID string) (interface{}, error) {
	s.logger.WithField("system_id", systemID).Debug("MCPService.GetMachineDetails called")

	// Call the machine service to get machine details
	return s.machineService.GetMachine(ctx, systemID)
}

// AllocateMachine allocates a machine based on constraints
func (s *MCPService) AllocateMachine(ctx context.Context, params interface{}) (interface{}, error) {
	s.logger.Debug("MCPService.AllocateMachine called")

	// Convert params to constraints map
	constraints := make(map[string]string)
	// TODO: Convert params to constraints

	// Call the machine service to allocate a machine
	return s.machineService.AllocateMachine(ctx, constraints)
}

// DeployMachine deploys an operating system to a machine
func (s *MCPService) DeployMachine(ctx context.Context, params interface{}) (interface{}, error) {
	s.logger.Debug("MCPService.DeployMachine called")

	// TODO: Extract systemID and osConfig from params

	// Call the machine service to deploy a machine
	return nil, fmt.Errorf("not implemented")
}

// ReleaseMachine releases a machine back to the pool
func (s *MCPService) ReleaseMachine(ctx context.Context, params interface{}) (interface{}, error) {
	s.logger.Debug("MCPService.ReleaseMachine called")

	// TODO: Extract systemID and comment from params

	// Call the machine service to release a machine
	return nil, fmt.Errorf("not implemented")
}

// PowerOnMachine powers on a machine
func (s *MCPService) PowerOnMachine(ctx context.Context, systemID string) (interface{}, error) {
	s.logger.WithField("system_id", systemID).Debug("MCPService.PowerOnMachine called")

	// Call the machine service to power on a machine
	return s.machineService.PowerOnMachine(ctx, systemID)
}

// PowerOffMachine powers off a machine
func (s *MCPService) PowerOffMachine(ctx context.Context, systemID string) (interface{}, error) {
	s.logger.WithField("system_id", systemID).Debug("MCPService.PowerOffMachine called")

	// Call the machine service to power off a machine
	return s.machineService.PowerOffMachine(ctx, systemID)
}

// GetMachinePowerState gets the power state of a machine
func (s *MCPService) GetMachinePowerState(ctx context.Context, systemID string) (string, error) {
	s.logger.WithField("system_id", systemID).Debug("MCPService.GetMachinePowerState called")

	// Call the machine service to get the power state
	return s.machineService.GetMachinePowerState(ctx, systemID)
}

// ListSubnets lists all subnets
func (s *MCPService) ListSubnets(ctx context.Context, params interface{}) (interface{}, error) {
	s.logger.Debug("MCPService.ListSubnets called")

	// Call the network service to list subnets
	return s.networkService.ListSubnets(ctx, nil)
}

// GetSubnetDetails gets details for a specific subnet
func (s *MCPService) GetSubnetDetails(ctx context.Context, subnetID int) (interface{}, error) {
	s.logger.WithField("subnet_id", subnetID).Debug("MCPService.GetSubnetDetails called")

	// Call the network service to get subnet details
	return s.networkService.GetSubnetDetails(ctx, subnetID)
}

// Helper function to map client errors to service errors
func mapClientError(err error) error {
	if err == nil {
		return nil
	}

	// Check if it's already a ServiceError
	if serviceErr, ok := err.(*ServiceError); ok {
		return serviceErr
	}

	// Default to internal server error
	statusCode := http.StatusInternalServerError
	message := err.Error()

	// TODO: Map specific client errors to appropriate service errors

	return &ServiceError{
		Err:        err,
		StatusCode: statusCode,
		Message:    message,
	}
}

// --- Implement transport.StorageConstraintsServiceInterface for *MCPService by delegation ---

// SetStorageConstraints sets storage constraints for a machine deployment
func (s *MCPService) SetStorageConstraints(ctx context.Context, machineID string, params models.StorageConstraintParams) error {
	if s.storageService == nil {
		return fmt.Errorf("StorageService not initialized in MCPService")
	}
	return s.storageService.SetStorageConstraints(ctx, machineID, params)
}

// GetStorageConstraints retrieves storage constraints for a machine
func (s *MCPService) GetStorageConstraints(ctx context.Context, machineID string) (*models.StorageConstraintContext, error) {
	if s.storageService == nil {
		return nil, fmt.Errorf("StorageService not initialized in MCPService")
	}
	return s.storageService.GetStorageConstraints(ctx, machineID)
}

// ValidateStorageConstraints validates storage constraints against a machine's available storage
func (s *MCPService) ValidateStorageConstraints(ctx context.Context, machineID string, params models.StorageConstraintParams) (bool, []string, error) {
	if s.storageService == nil {
		return false, nil, fmt.Errorf("StorageService not initialized in MCPService")
	}
	return s.storageService.ValidateStorageConstraints(ctx, machineID, params)
}

// ApplyStorageConstraints applies storage constraints during machine deployment
func (s *MCPService) ApplyStorageConstraints(ctx context.Context, machineID string, params models.StorageConstraintParams) error {
	if s.storageService == nil {
		return fmt.Errorf("StorageService not initialized in MCPService")
	}
	return s.storageService.ApplyStorageConstraints(ctx, machineID, params)
}

// DeleteStorageConstraints removes storage constraints from a machine
func (s *MCPService) DeleteStorageConstraints(ctx context.Context, machineID string) error {
	if s.storageService == nil {
		return fmt.Errorf("StorageService not initialized in MCPService")
	}
	return s.storageService.DeleteStorageConstraints(ctx, machineID)
}
