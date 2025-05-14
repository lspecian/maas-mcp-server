package service

import (
	"context"
	"net/http"

	"github.com/sirupsen/logrus"

	"github.com/lspecian/maas-mcp-server/internal/models"
)

// SetStorageConstraints sets storage constraints for a machine deployment
func (s *StorageService) SetStorageConstraints(ctx context.Context, machineID string, params models.StorageConstraintParams) error {
	s.logger.WithFields(logrus.Fields{
		"machine_id":  machineID,
		"constraints": params.Constraints,
	}).Debug("Setting storage constraints")

	// Validate parameters
	if machineID == "" {
		return &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Machine ID is required",
		}
	}

	if err := params.Validate(); err != nil {
		return &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    err.Error(),
		}
	}

	// Call MAAS client to set storage constraints
	err := s.maasClient.SetStorageConstraints(machineID, params)
	if err != nil {
		s.logger.WithError(err).WithField("machine_id", machineID).Error("Failed to set storage constraints")
		return mapClientError(err)
	}

	s.logger.WithField("machine_id", machineID).Debug("Successfully set storage constraints")
	return nil
}

// GetStorageConstraints retrieves storage constraints for a machine
func (s *StorageService) GetStorageConstraints(ctx context.Context, machineID string) (*models.StorageConstraintContext, error) {
	s.logger.WithField("machine_id", machineID).Debug("Getting storage constraints")

	// Validate parameters
	if machineID == "" {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Machine ID is required",
		}
	}

	// Call MAAS client to get storage constraints
	params, err := s.maasClient.GetStorageConstraints(machineID)
	if err != nil {
		s.logger.WithError(err).WithField("machine_id", machineID).Error("Failed to get storage constraints")
		return nil, mapClientError(err)
	}

	// Convert to MCP context
	context := models.MaasStorageConstraintsToMCPContext(params)

	s.logger.WithField("machine_id", machineID).Debug("Successfully retrieved storage constraints")
	return context, nil
}

// ValidateStorageConstraints validates storage constraints against a machine's available storage
func (s *StorageService) ValidateStorageConstraints(ctx context.Context, machineID string, params models.StorageConstraintParams) (bool, []string, error) {
	s.logger.WithFields(logrus.Fields{
		"machine_id":  machineID,
		"constraints": params.Constraints,
	}).Debug("Validating storage constraints")

	// Validate parameters
	if machineID == "" {
		return false, nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Machine ID is required",
		}
	}

	if err := params.Validate(); err != nil {
		return false, nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    err.Error(),
		}
	}

	// Call MAAS client to validate storage constraints
	valid, violations, err := s.maasClient.ValidateStorageConstraints(machineID, params)
	if err != nil {
		s.logger.WithError(err).WithField("machine_id", machineID).Error("Failed to validate storage constraints")
		return false, nil, mapClientError(err)
	}

	s.logger.WithFields(logrus.Fields{
		"machine_id": machineID,
		"valid":      valid,
		"violations": violations,
	}).Debug("Completed storage constraints validation")

	return valid, violations, nil
}

// ApplyStorageConstraints applies storage constraints during machine deployment
func (s *StorageService) ApplyStorageConstraints(ctx context.Context, machineID string, params models.StorageConstraintParams) error {
	s.logger.WithFields(logrus.Fields{
		"machine_id":  machineID,
		"constraints": params.Constraints,
	}).Debug("Applying storage constraints")

	// Validate parameters
	if machineID == "" {
		return &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Machine ID is required",
		}
	}

	if err := params.Validate(); err != nil {
		return &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    err.Error(),
		}
	}

	// Call MAAS client to apply storage constraints
	err := s.maasClient.ApplyStorageConstraints(machineID, params)
	if err != nil {
		s.logger.WithError(err).WithField("machine_id", machineID).Error("Failed to apply storage constraints")
		return mapClientError(err)
	}

	s.logger.WithField("machine_id", machineID).Debug("Successfully applied storage constraints")
	return nil
}

// DeleteStorageConstraints removes storage constraints from a machine
func (s *StorageService) DeleteStorageConstraints(ctx context.Context, machineID string) error {
	s.logger.WithField("machine_id", machineID).Debug("Deleting storage constraints")

	// Validate parameters
	if machineID == "" {
		return &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Machine ID is required",
		}
	}

	// Call MAAS client to delete storage constraints
	err := s.maasClient.DeleteStorageConstraints(machineID)
	if err != nil {
		s.logger.WithError(err).WithField("machine_id", machineID).Error("Failed to delete storage constraints")
		return mapClientError(err)
	}

	s.logger.WithField("machine_id", machineID).Debug("Successfully deleted storage constraints")
	return nil
}
