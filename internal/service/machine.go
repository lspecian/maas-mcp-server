package service

import (
	"context"
	"fmt"
	"net/http"
	"strconv"

	"github.com/canonical/gomaasclient/entity"
	"github.com/sirupsen/logrus"

	"github.com/lspecian/maas-mcp-server/internal/models"
	"github.com/lspecian/maas-mcp-server/internal/models/maas"
)

// MachineService handles machine management operations
type MachineService struct {
	maasClient MachineClient
	logger     *logrus.Logger
}

// NewMachineService creates a new machine service instance
func NewMachineService(client MachineClient, logger *logrus.Logger) *MachineService {
	return &MachineService{
		maasClient: client,
		logger:     logger,
	}
}

// ListMachinesPaginated retrieves a list of machines with optional filtering and pagination.
func (s *MachineService) ListMachinesPaginated(ctx context.Context, filters map[string]string, pagination *models.PaginationOptions) (*models.PaginatedMachines, error) {
	s.logger.WithFields(logrus.Fields{
		"filters":    filters,
		"pagination": pagination,
	}).Debug("Listing machines with pagination")

	if err := validateFilters(filters); err != nil {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    fmt.Sprintf("Invalid filters: %v", err),
		}
	}

	var maasPagination *maas.PaginationOptions
	if pagination != nil {
		maasPagination = &maas.PaginationOptions{
			Limit:  pagination.Limit,
			Offset: pagination.Offset,
			Page:   pagination.Page,
		}
	}

	// Call MAAS client to list machines (this client method handles pagination)
	machines, totalCount, err := s.maasClient.ListMachines(ctx, filters, maasPagination)
	if err != nil {
		s.logger.WithError(err).Error("Failed to list machines from MAAS")
		return nil, mapClientError(err)
	}

	machineContexts := make([]models.MachineContext, 0, len(machines))
	for _, m := range machines {
		// Apply storage constraint filtering if constraints are present in filters
		// This filtering is done in-service after fetching the paginated list from MAAS.
		var storageConstraints *models.SimpleStorageConstraint
		if minSizeStr, ok := filters["min_disk_size"]; ok {
			if storageConstraints == nil {
				storageConstraints = &models.SimpleStorageConstraint{}
			}
			minSize, _ := parseInt64(minSizeStr)
			storageConstraints.MinSize = minSize
		}
		if diskType, ok := filters["disk_type"]; ok {
			if storageConstraints == nil {
				storageConstraints = &models.SimpleStorageConstraint{}
			}
			storageConstraints.DiskType = diskType
		}
		if minDiskCountStr, ok := filters["min_disk_count"]; ok {
			if storageConstraints == nil {
				storageConstraints = &models.SimpleStorageConstraint{}
			}
			minDiskCount, _ := parseInt(minDiskCountStr)
			storageConstraints.Count = minDiskCount
		}

		if storageConstraints != nil {
			if !s.maasClient.CheckStorageConstraints(&m, storageConstraints) {
				continue
			}
		}
		machineContext := models.MaasMachineToMCPContext(&m)
		machineContexts = append(machineContexts, *machineContext)
	}

	// Note: totalCount from MAAS is before in-service filtering.
	// The returned PaginatedMachines.Machines will be the filtered list for the current page.
	// PaginatedMachines.TotalCount will reflect the MAAS total for pagination calculation.
	result := &models.PaginatedMachines{
		Machines:   machineContexts,
		TotalCount: totalCount,
	}

	if pagination != nil {
		result.Limit = pagination.Limit
		result.Offset = pagination.Offset
		result.Page = pagination.Page
		if pagination.Limit > 0 {
			result.PageCount = (totalCount + pagination.Limit - 1) / pagination.Limit
		} else if totalCount > 0 {
			result.PageCount = 1
		} else {
			result.PageCount = 0
		}
	} else if totalCount > 0 {
		result.PageCount = 1
		result.Limit = totalCount
	}

	s.logger.WithFields(logrus.Fields{
		"returned_count":   len(machineContexts),
		"maas_total_count": totalCount,
	}).Debug("Successfully retrieved paginated machines")

	return result, nil
}

// ListMachines retrieves a list of machines with optional filtering (conforms to MachineServiceInterface).
func (s *MachineService) ListMachines(ctx context.Context, filters map[string]string) ([]models.MachineContext, error) {
	s.logger.WithFields(logrus.Fields{
		"filters": filters,
	}).Debug("Listing machines (for MachineServiceInterface)")

	// Validate filters if needed
	if err := validateFilters(filters); err != nil {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    fmt.Sprintf("Invalid filters: %v", err),
		}
	}

	// Call MAAS client to list machines
	machines, err := s.maasClient.ListMachinesSimple(ctx, filters)
	if err != nil {
		s.logger.WithError(err).Error("Failed to list machines from MAAS client (simple)")
		return nil, mapClientError(err)
	}

	// Convert MAAS machines to MCP context and apply in-memory storage constraint filtering
	machineContexts := make([]models.MachineContext, 0, len(machines))
	for _, m := range machines {
		// Placeholder: Parse storage constraints from filters
		// This logic was previously in the paginated ListMachines and is kept here for consistency
		// if MAAS API doesn't directly support these filters for ListMachinesSimple.
		var storageConstraints *models.SimpleStorageConstraint
		if minSizeStr, ok := filters["min_disk_size"]; ok {
			if storageConstraints == nil {
				storageConstraints = &models.SimpleStorageConstraint{}
			}
			minSize, _ := parseInt64(minSizeStr)
			storageConstraints.MinSize = minSize
		}
		if diskType, ok := filters["disk_type"]; ok {
			if storageConstraints == nil {
				storageConstraints = &models.SimpleStorageConstraint{}
			}
			storageConstraints.DiskType = diskType
		}
		if minDiskCountStr, ok := filters["min_disk_count"]; ok {
			if storageConstraints == nil {
				storageConstraints = &models.SimpleStorageConstraint{}
			}
			minDiskCount, _ := parseInt(minDiskCountStr)
			storageConstraints.Count = minDiskCount
		}

		// If storage constraints are defined, check if the machine meets them
		if storageConstraints != nil {
			// Assuming CheckStorageConstraints can work with models.Machine from ListMachinesSimple.
			if !s.maasClient.CheckStorageConstraints(&m, storageConstraints) {
				continue // Skip this machine if it doesn't meet constraints
			}
		}

		machineContext := models.MaasMachineToMCPContext(&m)
		machineContexts = append(machineContexts, *machineContext)
	}

	s.logger.WithField("count", len(machineContexts)).Debug("Successfully retrieved machines for interface")
	return machineContexts, nil
}

// GetMachine retrieves a specific machine by ID
func (s *MachineService) GetMachine(ctx context.Context, id string) (*models.MachineContext, error) {
	s.logger.WithFields(logrus.Fields{
		"id": id,
	}).Debug("Getting machine by ID (details always included by default in this service method)")

	// Validate ID
	if id == "" {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Machine ID is required",
		}
	}

	// Call MAAS client to get machine, always including details from the service layer's perspective
	machine, err := s.maasClient.GetMachineWithDetails(ctx, id, true)
	if err != nil {
		s.logger.WithError(err).WithField("id", id).Error("Failed to get machine from MAAS")
		return nil, mapClientError(err)
	}

	// Convert MAAS machine to MCP context
	result := models.MaasMachineToMCPContext(machine)

	s.logger.WithField("id", id).Debug("Successfully retrieved machine")
	return result, nil
}

// DiscoverMachines initiates machine discovery in MAAS
func (s *MachineService) DiscoverMachines(ctx context.Context, options *models.MachineDiscoveryOptions) (*models.MachineDiscoveryResult, error) {
	s.logger.WithFields(logrus.Fields{
		"options": options,
	}).Info("Initiating machine discovery")

	// In a real implementation, this would call the MAAS API to initiate machine discovery
	// For now, we'll simulate the discovery process by listing existing machines

	// Get existing machines before discovery
	beforeMachines, err := s.maasClient.ListMachinesSimple(ctx, nil)
	if err != nil {
		s.logger.WithError(err).Error("Failed to list machines before discovery")
		return nil, mapClientError(err)
	}

	// In a real implementation, this would trigger the actual discovery process
	// For now, we'll just return the existing machines as "discovered"

	// Create discovery result
	result := &models.MachineDiscoveryResult{
		DiscoveredCount: len(beforeMachines),
		Status:          "completed",
	}

	// Convert MAAS machines to MCP context for the result
	discoveredMachines := make([]models.MachineContext, len(beforeMachines))
	for i, m := range beforeMachines {
		machineContext := models.MaasMachineToMCPContext(&m)
		discoveredMachines[i] = *machineContext
	}
	result.DiscoveredMachines = discoveredMachines

	s.logger.WithField("discoveredCount", result.DiscoveredCount).Info("Machine discovery completed")
	return result, nil
}

// GetMachinePowerState retrieves the power state of a specific machine
func (s *MachineService) GetMachinePowerState(ctx context.Context, id string) (string, error) {
	s.logger.WithField("id", id).Debug("Getting machine power state")

	// Validate ID
	if id == "" {
		return "", &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Machine ID is required",
		}
	}

	// Call MAAS client to get machine
	machine, err := s.maasClient.GetMachine(id)
	if err != nil {
		s.logger.WithError(err).WithField("id", id).Error("Failed to get machine from MAAS")
		return "", mapClientError(err)
	}

	s.logger.WithFields(logrus.Fields{
		"id":          id,
		"power_state": machine.PowerState,
	}).Debug("Successfully retrieved machine power state")

	return machine.PowerState, nil
}

// AllocateMachine allocates a machine based on constraints
func (s *MachineService) AllocateMachine(ctx context.Context, constraints map[string]string) (*models.MachineContext, error) {
	s.logger.WithField("constraints", constraints).Debug("Allocating machine")

	// Validate constraints
	if err := validateConstraints(constraints); err != nil {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    fmt.Sprintf("Invalid constraints: %v", err),
		}
	}

	// Convert constraints to MAAS allocation parameters
	params := convertConstraintsToParams(constraints)

	// Call MAAS client to allocate machine
	machine, err := s.maasClient.AllocateMachine(params)
	if err != nil {
		s.logger.WithError(err).Error("Failed to allocate machine from MAAS")
		return nil, mapClientError(err)
	}

	// Convert MAAS machine to MCP context
	result := models.MaasMachineToMCPContext(machine)

	s.logger.WithFields(logrus.Fields{
		"id":   machine.SystemID,
		"name": machine.Hostname,
	}).Info("Successfully allocated machine")

	return result, nil
}

// DeployMachine deploys a machine with specified OS and configuration
func (s *MachineService) DeployMachine(ctx context.Context, id string, osConfig map[string]string) (*models.MachineContext, error) {
	s.logger.WithFields(logrus.Fields{
		"id":        id,
		"os_config": osConfig,
	}).Debug("Deploying machine")

	// Validate ID
	if id == "" {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Machine ID is required",
		}
	}

	// Validate OS configuration
	if err := validateOSConfig(osConfig); err != nil {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    fmt.Sprintf("Invalid OS configuration: %v", err),
		}
	}

	// Convert OS configuration to MAAS deployment parameters
	params := convertOSConfigToParams(osConfig)

	// Call MAAS client to deploy machine
	machine, err := s.maasClient.DeployMachine(id, params)
	if err != nil {
		s.logger.WithError(err).WithField("id", id).Error("Failed to deploy machine from MAAS")
		return nil, mapClientError(err)
	}

	// Convert MAAS machine to MCP context
	result := models.MaasMachineToMCPContext(machine)

	s.logger.WithFields(logrus.Fields{
		"id":   machine.SystemID,
		"name": machine.Hostname,
	}).Info("Successfully started machine deployment")

	return result, nil
}

// ReleaseMachine releases a machine back to the available pool
func (s *MachineService) ReleaseMachine(ctx context.Context, id string, comment string) error {
	s.logger.WithFields(logrus.Fields{
		"id":      id,
		"comment": comment,
	}).Debug("Releasing machine")

	// Validate ID
	if id == "" {
		return &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Machine ID is required",
		}
	}

	// Call MAAS client to release machine
	err := s.maasClient.ReleaseMachine([]string{id}, comment)
	if err != nil {
		s.logger.WithError(err).WithField("id", id).Error("Failed to release machine from MAAS")
		return mapClientError(err)
	}

	s.logger.WithField("id", id).Info("Successfully released machine")
	return nil
}

// PowerOnMachine powers on a machine
func (s *MachineService) PowerOnMachine(ctx context.Context, id string) (*models.MachineContext, error) {
	s.logger.WithField("id", id).Debug("Powering on machine")

	// Validate ID
	if id == "" {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Machine ID is required",
		}
	}

	// Call MAAS client to power on machine
	machine, err := s.maasClient.PowerOnMachine(id)
	if err != nil {
		s.logger.WithError(err).WithField("id", id).Error("Failed to power on machine")
		return nil, mapClientError(err)
	}

	// Convert MAAS machine to MCP context
	result := models.MaasMachineToMCPContext(machine)

	s.logger.WithFields(logrus.Fields{
		"id":   id,
		"name": machine.Hostname,
	}).Info("Successfully powered on machine")

	return result, nil
}

// PowerOffMachine powers off a machine
func (s *MachineService) PowerOffMachine(ctx context.Context, id string) (*models.MachineContext, error) {
	s.logger.WithField("id", id).Debug("Powering off machine")

	// Validate ID
	if id == "" {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Machine ID is required",
		}
	}

	// Call MAAS client to power off machine
	machine, err := s.maasClient.PowerOffMachine(id)
	if err != nil {
		s.logger.WithError(err).WithField("id", id).Error("Failed to power off machine")
		return nil, mapClientError(err)
	}

	// Convert MAAS machine to MCP context
	result := models.MaasMachineToMCPContext(machine)

	s.logger.WithFields(logrus.Fields{
		"id":   id,
		"name": machine.Hostname,
	}).Info("Successfully powered off machine")

	return result, nil
}

// Helper functions

// validateFilters validates machine listing filters
func validateFilters(filters map[string]string) error {
	// Implement validation logic for filters
	// For now, accept all filters as valid
	return nil
}

// validateConstraints validates machine allocation constraints
func validateConstraints(constraints map[string]string) error {
	// Implement validation logic for constraints
	// For now, accept all constraints as valid
	return nil
}

// validateOSConfig validates OS deployment configuration
func validateOSConfig(osConfig map[string]string) error {
	// Implement validation logic for OS configuration
	// For now, accept all configurations as valid
	return nil
}

// convertConstraintsToParams converts constraint map to MAAS allocation parameters
func convertConstraintsToParams(constraints map[string]string) *entity.MachineAllocateParams {
	params := &entity.MachineAllocateParams{}

	// Map constraints to parameters
	if hostname, ok := constraints["hostname"]; ok {
		params.Name = hostname
	}

	if zone, ok := constraints["zone"]; ok {
		params.Zone = zone
	}

	if pool, ok := constraints["pool"]; ok {
		params.Pool = pool
	}

	if arch, ok := constraints["architecture"]; ok {
		params.Arch = arch
	}

	if tags, ok := constraints["tags"]; ok {
		// Assuming tags are comma-separated
		params.Tags = []string{tags}
	}

	// Add more mappings as needed

	return params
}

// convertOSConfigToParams converts OS configuration map to MAAS deployment parameters
func convertOSConfigToParams(osConfig map[string]string) *entity.MachineDeployParams {
	params := &entity.MachineDeployParams{}

	// Map OS configuration to parameters
	if distro, ok := osConfig["distro_series"]; ok {
		params.DistroSeries = distro
	}

	if userData, ok := osConfig["user_data"]; ok {
		params.UserData = userData
	}

	if kernel, ok := osConfig["hwe_kernel"]; ok {
		params.HWEKernel = kernel
	}

	// Add more mappings as needed

	return params
}

// parseInt64 is a helper function to parse a string to int64
func parseInt64(s string) (int64, error) {
	return strconv.ParseInt(s, 10, 64)
}

// parseInt is a helper function to parse a string to int
func parseInt(s string) (int, error) {
	val, err := strconv.ParseInt(s, 10, 32)
	if err != nil {
		return 0, err
	}
	return int(val), nil
}
