package service

import (
	"context"
	"fmt"
	"net/http"

	"github.com/sirupsen/logrus"

	"github.com/lspecian/maas-mcp-server/internal/models"
)

// StorageClient defines the interface for MAAS client operations needed by the storage service
type StorageClient interface {
	// GetMachineBlockDevices retrieves block devices for a specific machine
	GetMachineBlockDevices(systemID string) ([]models.BlockDevice, error)
}

// StorageService handles storage operations
type StorageService struct {
	maasClient StorageClient
	logger     *logrus.Logger
}

// NewStorageService creates a new storage service instance
func NewStorageService(client StorageClient, logger *logrus.Logger) *StorageService {
	return &StorageService{
		maasClient: client,
		logger:     logger,
	}
}

// ListBlockDevices retrieves block devices for a specific machine
func (s *StorageService) ListBlockDevices(ctx context.Context, machineID string) ([]models.StorageContext, error) {
	s.logger.WithField("machine_id", machineID).Debug("Listing block devices for machine")

	// Validate machine ID
	if machineID == "" {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Machine ID is required",
		}
	}

	// Call MAAS client to get block devices
	devices, err := s.maasClient.GetMachineBlockDevices(machineID)
	if err != nil {
		s.logger.WithError(err).WithField("machine_id", machineID).Error("Failed to get block devices from MAAS")
		return nil, mapClientError(err)
	}

	// Convert MAAS block devices to MCP context
	result := make([]models.StorageContext, len(devices))
	for i, device := range devices {
		storageContext := models.MaasBlockDeviceToMCPContext(&device)
		result[i] = *storageContext
	}

	s.logger.WithFields(logrus.Fields{
		"machine_id": machineID,
		"count":      len(result),
	}).Debug("Successfully retrieved block devices")

	return result, nil
}

// GetBlockDevice retrieves a specific block device by machine ID and device ID
func (s *StorageService) GetBlockDevice(ctx context.Context, machineID string, deviceID string) (*models.StorageContext, error) {
	s.logger.WithFields(logrus.Fields{
		"machine_id": machineID,
		"device_id":  deviceID,
	}).Debug("Getting block device")

	// Validate parameters
	if machineID == "" {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Machine ID is required",
		}
	}

	if deviceID == "" {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Device ID is required",
		}
	}

	// Get all block devices for the machine
	devices, err := s.maasClient.GetMachineBlockDevices(machineID)
	if err != nil {
		s.logger.WithError(err).WithField("machine_id", machineID).Error("Failed to get block devices from MAAS")
		return nil, mapClientError(err)
	}

	// Find the specific device by ID
	for _, device := range devices {
		if fmt.Sprintf("%d", device.ID) == deviceID {
			storageContext := models.MaasBlockDeviceToMCPContext(&device)

			s.logger.WithFields(logrus.Fields{
				"machine_id": machineID,
				"device_id":  deviceID,
			}).Debug("Successfully retrieved block device")

			return storageContext, nil
		}
	}

	// Device not found
	return nil, &ServiceError{
		Err:        ErrNotFound,
		StatusCode: http.StatusNotFound,
		Message:    fmt.Sprintf("Block device with ID %s not found for machine %s", deviceID, machineID),
	}
}
