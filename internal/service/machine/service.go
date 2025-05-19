package machine

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"github.com/canonical/gomaasclient/entity"
	"github.com/sirupsen/logrus"

	"github.com/lspecian/maas-mcp-server/internal/conversion"
	"github.com/lspecian/maas-mcp-server/internal/models/types"
	"github.com/lspecian/maas-mcp-server/internal/repository/machine"
)

// Common error types for service operations
var (
	ErrNotFound           = errors.New("resource not found")
	ErrBadRequest         = errors.New("invalid request parameters")
	ErrInternalServer     = errors.New("internal server error")
	ErrServiceUnavailable = errors.New("service unavailable")
	ErrConflict           = errors.New("resource conflict")
	ErrForbidden          = errors.New("operation not permitted")
)

// ServiceError represents an error with HTTP status code mapping
type ServiceError struct {
	Err        error
	StatusCode int
	Message    string
}

// Error implements the error interface
func (e *ServiceError) Error() string {
	if e.Message != "" {
		return e.Message
	}
	return e.Err.Error()
}

// Unwrap returns the wrapped error
func (e *ServiceError) Unwrap() error {
	return e.Err
}

// Service handles machine management operations
type Service struct {
	repository machine.Repository
	logger     *logrus.Logger
}

// NewService creates a new machine service instance
func NewService(repository machine.Repository, logger *logrus.Logger) *Service {
	return &Service{
		repository: repository,
		logger:     logger,
	}
}

// ListMachines retrieves a list of machines with optional filtering
func (s *Service) ListMachines(ctx context.Context, filters map[string]string) ([]types.MachineContext, error) {
	s.logger.WithFields(logrus.Fields{
		"filters": filters,
	}).Debug("Listing machines")

	// Validate filters if needed
	if err := validateFilters(filters); err != nil {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    fmt.Sprintf("Invalid filters: %v", err),
		}
	}

	// Call repository to list machines
	machines, err := s.repository.ListMachines(ctx, filters)
	if err != nil {
		s.logger.WithError(err).Error("Failed to list machines from repository")
		return nil, mapRepositoryError(err)
	}

	// Convert machines to MCP context
	result := make([]types.MachineContext, len(machines))
	for i, m := range machines {
		// Create a simple MachineContext from the Machine
		result[i] = types.MachineContext{
			ID:           m.SystemID,
			Name:         m.Hostname,
			FQDN:         m.FQDN,
			Status:       m.Status,
			Architecture: m.Architecture,
			PowerState:   m.PowerState,
			Zone:         m.Zone,
			Pool:         m.Pool,
			Tags:         m.Tags,
			CPUCount:     m.CPUCount,
			Memory:       m.Memory,
			OSInfo: types.OSInfo{
				System:       m.OSSystem,
				Distribution: m.OSSystem,
				Release:      m.DistroSeries,
			},
			Metadata: m.Metadata,
		}
	}

	s.logger.WithField("count", len(result)).Debug("Successfully retrieved machines")
	return result, nil
}

// GetMachine retrieves a specific machine by ID
func (s *Service) GetMachine(ctx context.Context, id string) (*types.MachineContext, error) {
	s.logger.WithField("id", id).Debug("Getting machine by ID")

	// Validate ID
	if id == "" {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Machine ID is required",
		}
	}

	// Call repository to get machine
	machine, err := s.repository.GetMachine(ctx, id)
	if err != nil {
		s.logger.WithError(err).WithField("id", id).Error("Failed to get machine from repository")
		return nil, mapRepositoryError(err)
	}

	// Use the conversion function to create a MachineContext from the Machine
	result := conversion.MaasMachineToMCPContext(machine, machine.SystemID, s.logger, nil)

	s.logger.WithField("id", id).Debug("Successfully retrieved machine")
	return result, nil
}

// GetMachinePowerState retrieves the power state of a specific machine
func (s *Service) GetMachinePowerState(ctx context.Context, id string) (string, error) {
	s.logger.WithField("id", id).Debug("Getting machine power state")

	// Validate ID
	if id == "" {
		return "", &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Machine ID is required",
		}
	}

	// Call repository to get machine
	machine, err := s.repository.GetMachine(ctx, id)
	if err != nil {
		s.logger.WithError(err).WithField("id", id).Error("Failed to get machine from repository")
		return "", mapRepositoryError(err)
	}

	s.logger.WithFields(logrus.Fields{
		"id":          id,
		"power_state": machine.PowerState,
	}).Debug("Successfully retrieved machine power state")

	return machine.PowerState, nil
}

// AllocateMachine allocates a machine based on constraints
func (s *Service) AllocateMachine(ctx context.Context, constraints map[string]string) (*types.MachineContext, error) {
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

	// Call repository to allocate machine
	machine, err := s.repository.AllocateMachine(ctx, params)
	if err != nil {
		s.logger.WithError(err).Error("Failed to allocate machine from repository")
		return nil, mapRepositoryError(err)
	}

	// Use the conversion function to create a MachineContext from the Machine
	result := conversion.MaasMachineToMCPContext(machine, machine.SystemID, s.logger, nil)

	s.logger.WithFields(logrus.Fields{
		"id":   machine.SystemID,
		"name": machine.Hostname,
	}).Info("Successfully allocated machine")

	return result, nil
}

// DeployMachine deploys a machine with specified OS and configuration
func (s *Service) DeployMachine(ctx context.Context, id string, osConfig map[string]string) (*types.MachineContext, error) {
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

	// Call repository to deploy machine
	machine, err := s.repository.DeployMachine(ctx, id, params)
	if err != nil {
		s.logger.WithError(err).WithField("id", id).Error("Failed to deploy machine from repository")
		return nil, mapRepositoryError(err)
	}

	// Use the conversion function to create a MachineContext from the Machine
	result := conversion.MaasMachineToMCPContext(machine, machine.SystemID, s.logger, nil)

	s.logger.WithFields(logrus.Fields{
		"id":   machine.SystemID,
		"name": machine.Hostname,
	}).Info("Successfully started machine deployment")

	return result, nil
}

// ReleaseMachine releases a machine back to the available pool
func (s *Service) ReleaseMachine(ctx context.Context, id string, comment string) error {
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

	// Call repository to release machine
	err := s.repository.ReleaseMachine(ctx, []string{id}, comment)
	if err != nil {
		s.logger.WithError(err).WithField("id", id).Error("Failed to release machine from repository")
		return mapRepositoryError(err)
	}

	s.logger.WithField("id", id).Info("Successfully released machine")
	return nil
}

// PowerOnMachine powers on a machine
func (s *Service) PowerOnMachine(ctx context.Context, id string) (*types.MachineContext, error) {
	s.logger.WithField("id", id).Debug("Powering on machine")

	// Validate ID
	if id == "" {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Machine ID is required",
		}
	}

	// Call repository to power on machine
	machine, err := s.repository.PowerOnMachine(ctx, id)
	if err != nil {
		s.logger.WithError(err).WithField("id", id).Error("Failed to power on machine")
		return nil, mapRepositoryError(err)
	}

	// Use the conversion function to create a MachineContext from the Machine
	result := conversion.MaasMachineToMCPContext(machine, machine.SystemID, s.logger, nil)

	s.logger.WithFields(logrus.Fields{
		"id":   id,
		"name": machine.Hostname,
	}).Info("Successfully powered on machine")

	return result, nil
}

// PowerOffMachine powers off a machine
func (s *Service) PowerOffMachine(ctx context.Context, id string) (*types.MachineContext, error) {
	s.logger.WithField("id", id).Debug("Powering off machine")

	// Validate ID
	if id == "" {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Machine ID is required",
		}
	}

	// Call repository to power off machine
	machine, err := s.repository.PowerOffMachine(ctx, id)
	if err != nil {
		s.logger.WithError(err).WithField("id", id).Error("Failed to power off machine")
		return nil, mapRepositoryError(err)
	}

	// Use the conversion function to create a MachineContext from the Machine
	result := conversion.MaasMachineToMCPContext(machine, machine.SystemID, s.logger, nil)

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

// mapRepositoryError maps repository errors to service errors with appropriate HTTP status codes
func mapRepositoryError(err error) error {
	// Implement error mapping logic
	// This is a simplified version; in a real implementation, you would
	// check for specific error types from the repository

	// For now, return a generic internal server error
	return &ServiceError{
		Err:        ErrInternalServer,
		StatusCode: http.StatusInternalServerError,
		Message:    fmt.Sprintf("Repository error: %v", err),
	}
}
