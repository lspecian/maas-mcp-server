package service

import (
	"context"
	"fmt"
	"net/http"
	"strconv"

	"github.com/sirupsen/logrus"

	"github.com/lspecian/maas-mcp-server/internal/models"
)

// CreateRAID creates a new RAID array
func (s *StorageService) CreateRAID(ctx context.Context, machineID string, params models.RAIDParams) (*models.RAIDContext, error) {
	s.logger.WithFields(logrus.Fields{
		"machine_id":    machineID,
		"name":          params.Name,
		"level":         params.Level,
		"block_devices": params.BlockDevices,
		"partitions":    params.Partitions,
		"spare_devices": params.SpareDevices,
	}).Debug("Creating RAID array")

	// Validate machine ID
	if machineID == "" {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Machine ID is required",
		}
	}

	// Validate RAID parameters
	if err := params.Validate(); err != nil {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    fmt.Sprintf("Invalid RAID parameters: %v", err),
		}
	}

	// Call MAAS client to create RAID
	raid, err := s.maasClient.CreateRAID(machineID, params)
	if err != nil {
		s.logger.WithError(err).WithField("machine_id", machineID).Error("Failed to create RAID array")
		return nil, mapClientError(err)
	}

	// Convert MAAS RAID to MCP context
	result := models.MaasRAIDToMCPContext(raid)

	s.logger.WithFields(logrus.Fields{
		"machine_id": machineID,
		"raid_id":    raid.ID,
		"name":       raid.Name,
		"level":      raid.Level,
	}).Debug("Successfully created RAID array")

	return result, nil
}

// DeleteRAID deletes a RAID array
func (s *StorageService) DeleteRAID(ctx context.Context, machineID string, raidID string) error {
	s.logger.WithFields(logrus.Fields{
		"machine_id": machineID,
		"raid_id":    raidID,
	}).Debug("Deleting RAID array")

	// Validate machine ID
	if machineID == "" {
		return &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Machine ID is required",
		}
	}

	// Validate RAID ID
	if raidID == "" {
		return &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "RAID ID is required",
		}
	}

	// Convert RAID ID to int
	raidIDInt, err := strconv.Atoi(raidID)
	if err != nil {
		return &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Invalid RAID ID format",
		}
	}

	// Call MAAS client to delete RAID
	err = s.maasClient.DeleteRAID(machineID, raidIDInt)
	if err != nil {
		s.logger.WithError(err).WithFields(logrus.Fields{
			"machine_id": machineID,
			"raid_id":    raidID,
		}).Error("Failed to delete RAID array")
		return mapClientError(err)
	}

	s.logger.WithFields(logrus.Fields{
		"machine_id": machineID,
		"raid_id":    raidID,
	}).Debug("Successfully deleted RAID array")

	return nil
}

// GetRAID retrieves a specific RAID array
func (s *StorageService) GetRAID(ctx context.Context, machineID string, raidID string) (*models.RAIDContext, error) {
	s.logger.WithFields(logrus.Fields{
		"machine_id": machineID,
		"raid_id":    raidID,
	}).Debug("Getting RAID array")

	// Validate machine ID
	if machineID == "" {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Machine ID is required",
		}
	}

	// Validate RAID ID
	if raidID == "" {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "RAID ID is required",
		}
	}

	// Convert RAID ID to int
	raidIDInt, err := strconv.Atoi(raidID)
	if err != nil {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Invalid RAID ID format",
		}
	}

	// Call MAAS client to get RAID
	raid, err := s.maasClient.GetRAID(machineID, raidIDInt)
	if err != nil {
		s.logger.WithError(err).WithFields(logrus.Fields{
			"machine_id": machineID,
			"raid_id":    raidID,
		}).Error("Failed to get RAID array")
		return nil, mapClientError(err)
	}

	// Convert MAAS RAID to MCP context
	result := models.MaasRAIDToMCPContext(raid)

	s.logger.WithFields(logrus.Fields{
		"machine_id": machineID,
		"raid_id":    raidID,
	}).Debug("Successfully retrieved RAID array")

	return result, nil
}

// ListRAIDs retrieves all RAID arrays for a machine
func (s *StorageService) ListRAIDs(ctx context.Context, machineID string) ([]models.RAIDContext, error) {
	s.logger.WithField("machine_id", machineID).Debug("Listing RAID arrays for machine")

	// Validate machine ID
	if machineID == "" {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Machine ID is required",
		}
	}

	// Call MAAS client to get RAIDs
	raids, err := s.maasClient.ListRAIDs(machineID)
	if err != nil {
		s.logger.WithError(err).WithField("machine_id", machineID).Error("Failed to list RAID arrays")
		return nil, mapClientError(err)
	}

	// Convert MAAS RAIDs to MCP context
	result := make([]models.RAIDContext, len(raids))
	for i, raid := range raids {
		raidContext := models.MaasRAIDToMCPContext(&raid)
		result[i] = *raidContext
	}

	s.logger.WithFields(logrus.Fields{
		"machine_id": machineID,
		"count":      len(result),
	}).Debug("Successfully retrieved RAID arrays")

	return result, nil
}

// UpdateRAID updates a RAID array
func (s *StorageService) UpdateRAID(ctx context.Context, machineID string, raidID string, params models.RAIDUpdateParams) (*models.RAIDContext, error) {
	s.logger.WithFields(logrus.Fields{
		"machine_id":        machineID,
		"raid_id":           raidID,
		"name":              params.Name,
		"add_block_devices": params.AddBlockDevices,
		"rem_block_devices": params.RemBlockDevices,
		"add_partitions":    params.AddPartitions,
		"rem_partitions":    params.RemPartitions,
		"add_spare_devices": params.AddSpareDevices,
		"rem_spare_devices": params.RemSpareDevices,
	}).Debug("Updating RAID array")

	// Validate machine ID
	if machineID == "" {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Machine ID is required",
		}
	}

	// Validate RAID ID
	if raidID == "" {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "RAID ID is required",
		}
	}

	// Convert RAID ID to int
	raidIDInt, err := strconv.Atoi(raidID)
	if err != nil {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Invalid RAID ID format",
		}
	}

	// Validate update parameters
	if err := params.Validate(); err != nil {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    fmt.Sprintf("Invalid RAID update parameters: %v", err),
		}
	}

	// Call MAAS client to update RAID
	raid, err := s.maasClient.UpdateRAID(machineID, raidIDInt, params)
	if err != nil {
		s.logger.WithError(err).WithFields(logrus.Fields{
			"machine_id": machineID,
			"raid_id":    raidID,
		}).Error("Failed to update RAID array")
		return nil, mapClientError(err)
	}

	// Convert MAAS RAID to MCP context
	result := models.MaasRAIDToMCPContext(raid)

	s.logger.WithFields(logrus.Fields{
		"machine_id": machineID,
		"raid_id":    raidID,
	}).Debug("Successfully updated RAID array")

	return result, nil
}
