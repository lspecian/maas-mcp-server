package service

import (
	"context"
	"fmt"
	"net/http"
	"strconv"

	"github.com/sirupsen/logrus"

	"github.com/lspecian/maas-mcp-server/internal/models"
	modelsmaas "github.com/lspecian/maas-mcp-server/internal/models/maas"
)

// StorageClient defines the interface for MAAS client operations needed by the storage service
type StorageClient interface {
	// Block Device operations
	GetMachineBlockDevices(systemID string) ([]models.BlockDevice, error)
	GetMachineBlockDevice(systemID string, deviceID int) (*models.BlockDevice, error)

	// Partition operations
	CreateMachinePartition(systemID string, blockDeviceID int, params modelsmaas.PartitionCreateParams) (*models.Partition, error)
	UpdateMachinePartition(systemID string, blockDeviceID, partitionID int, params map[string]interface{}) (*models.Partition, error)
	DeleteMachinePartition(systemID string, blockDeviceID, partitionID int) error
	FormatMachinePartition(systemID string, blockDeviceID, partitionID int, params map[string]interface{}) (*models.Filesystem, error)

	// Volume Group operations
	CreateVolumeGroup(systemID string, params models.VolumeGroupParams) (*models.VolumeGroup, error)
	DeleteVolumeGroup(systemID string, volumeGroupID int) error
	GetVolumeGroup(systemID string, volumeGroupID int) (*models.VolumeGroup, error)
	ListVolumeGroups(systemID string) ([]models.VolumeGroup, error)

	// Logical Volume operations
	CreateLogicalVolume(systemID string, volumeGroupID int, params models.LogicalVolumeParams) (*models.LogicalVolume, error)
	DeleteLogicalVolume(systemID string, volumeGroupID, logicalVolumeID int) error
	ResizeLogicalVolume(systemID string, volumeGroupID, logicalVolumeID int, newSize int64) (*models.LogicalVolume, error)
	GetLogicalVolume(systemID string, volumeGroupID, logicalVolumeID int) (*models.LogicalVolume, error)

	// RAID operations
	CreateRAID(systemID string, params models.RAIDParams) (*models.RAID, error)
	DeleteRAID(systemID string, raidID int) error
	GetRAID(systemID string, raidID int) (*models.RAID, error)
	ListRAIDs(systemID string) ([]models.RAID, error)
	UpdateRAID(systemID string, raidID int, params models.RAIDUpdateParams) (*models.RAID, error)

	// Storage Constraint operations
	SetStorageConstraints(systemID string, params models.StorageConstraintParams) error
	GetStorageConstraints(systemID string) (*models.StorageConstraintParams, error)
	ValidateStorageConstraints(systemID string, params models.StorageConstraintParams) (bool, []string, error)
	ApplyStorageConstraints(systemID string, params models.StorageConstraintParams) error
	DeleteStorageConstraints(systemID string) error
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

	// Convert deviceID from string to int
	deviceIDInt, err := strconv.Atoi(deviceID)
	if err != nil {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Device ID must be a valid integer",
		}
	}

	// Get the specific block device directly
	device, err := s.maasClient.GetMachineBlockDevice(machineID, deviceIDInt)
	if err != nil {
		s.logger.WithError(err).WithFields(logrus.Fields{
			"machine_id": machineID,
			"device_id":  deviceID,
		}).Error("Failed to get block device from MAAS")
		return nil, mapClientError(err)
	}

	// Convert to MCP context
	storageContext := models.MaasBlockDeviceToMCPContext(device)

	s.logger.WithFields(logrus.Fields{
		"machine_id": machineID,
		"device_id":  deviceID,
	}).Debug("Successfully retrieved block device")

	return storageContext, nil
}

// CreatePartition creates a partition on a block device for a specific machine
func (s *StorageService) CreatePartition(ctx context.Context, machineID string, deviceID string, params map[string]interface{}) (*models.PartitionContext, error) {
	s.logger.WithFields(logrus.Fields{
		"machine_id": machineID,
		"device_id":  deviceID,
		"params":     params,
	}).Debug("Creating partition on block device")

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

	// Validate size parameter
	if _, ok := params["size"]; !ok {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Partition size is required",
		}
	}

	// Convert deviceID from string to int
	deviceIDInt, err := strconv.Atoi(deviceID)
	if err != nil {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Device ID must be a valid integer",
		}
	}

	// Convert map[string]interface{} to modelsmaas.PartitionCreateParams
	createParams := modelsmaas.PartitionCreateParams{}

	// Extract size parameter
	if sizeVal, ok := params["size"]; ok {
		switch v := sizeVal.(type) {
		case int64:
			createParams.Size = v
		case int:
			createParams.Size = int64(v)
		case float64:
			createParams.Size = int64(v)
		case string:
			if size, err := strconv.ParseInt(v, 10, 64); err == nil {
				createParams.Size = size
			}
		}
	}

	// Extract fstype parameter if present
	if fsTypeVal, ok := params["fstype"]; ok {
		if fsType, ok := fsTypeVal.(string); ok {
			createParams.FSType = fsType
		}
	}

	// Call MAAS client to create the partition
	partition, err := s.maasClient.CreateMachinePartition(machineID, deviceIDInt, createParams)
	if err != nil {
		s.logger.WithError(err).WithFields(logrus.Fields{
			"machine_id": machineID,
			"device_id":  deviceID,
		}).Error("Failed to create partition on block device")
		return nil, mapClientError(err)
	}

	// Convert to MCP context
	partitionContext := &models.PartitionContext{
		ID:     idToString(partition.ID),
		Size:   partition.Size,
		Path:   partition.Path,
		Number: partition.ID, // Using ID as the partition number
	}

	if partition.Filesystem != nil {
		partitionContext.Filesystem = &models.FilesystemContext{
			Type:         partition.Filesystem.FSType,
			UUID:         partition.Filesystem.UUID,
			MountPoint:   partition.Filesystem.MountPoint,
			MountOptions: partition.Filesystem.MountOptions,
		}
	}

	s.logger.WithFields(logrus.Fields{
		"machine_id":   machineID,
		"device_id":    deviceID,
		"partition_id": partition.ID,
	}).Debug("Successfully created partition on block device")

	return partitionContext, nil
}

// UpdatePartition updates a partition on a block device for a specific machine
func (s *StorageService) UpdatePartition(ctx context.Context, machineID string, deviceID string, partitionID string, params map[string]interface{}) (*models.PartitionContext, error) {
	s.logger.WithFields(logrus.Fields{
		"machine_id":   machineID,
		"device_id":    deviceID,
		"partition_id": partitionID,
		"params":       params,
	}).Debug("Updating partition on block device")

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

	if partitionID == "" {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Partition ID is required",
		}
	}

	// Convert IDs from string to int
	deviceIDInt, err := strconv.Atoi(deviceID)
	if err != nil {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Device ID must be a valid integer",
		}
	}

	partitionIDInt, err := strconv.Atoi(partitionID)
	if err != nil {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Partition ID must be a valid integer",
		}
	}

	// Call MAAS client to update the partition
	partition, err := s.maasClient.UpdateMachinePartition(machineID, deviceIDInt, partitionIDInt, params)
	if err != nil {
		s.logger.WithError(err).WithFields(logrus.Fields{
			"machine_id":   machineID,
			"device_id":    deviceID,
			"partition_id": partitionID,
		}).Error("Failed to update partition on block device")
		return nil, mapClientError(err)
	}

	// Convert to MCP context
	partitionContext := &models.PartitionContext{
		ID:     idToString(partition.ID),
		Size:   partition.Size,
		Path:   partition.Path,
		Number: partition.ID, // Using ID as the partition number
	}

	if partition.Filesystem != nil {
		partitionContext.Filesystem = &models.FilesystemContext{
			Type:         partition.Filesystem.FSType,
			UUID:         partition.Filesystem.UUID,
			MountPoint:   partition.Filesystem.MountPoint,
			MountOptions: partition.Filesystem.MountOptions,
		}
	}

	s.logger.WithFields(logrus.Fields{
		"machine_id":   machineID,
		"device_id":    deviceID,
		"partition_id": partitionID,
	}).Debug("Successfully updated partition on block device")

	return partitionContext, nil
}

// DeletePartition deletes a partition from a block device for a specific machine
func (s *StorageService) DeletePartition(ctx context.Context, machineID string, deviceID string, partitionID string) error {
	s.logger.WithFields(logrus.Fields{
		"machine_id":   machineID,
		"device_id":    deviceID,
		"partition_id": partitionID,
	}).Debug("Deleting partition from block device")

	// Validate parameters
	if machineID == "" {
		return &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Machine ID is required",
		}
	}

	if deviceID == "" {
		return &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Device ID is required",
		}
	}

	if partitionID == "" {
		return &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Partition ID is required",
		}
	}

	// Convert IDs from string to int
	deviceIDInt, err := strconv.Atoi(deviceID)
	if err != nil {
		return &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Device ID must be a valid integer",
		}
	}

	partitionIDInt, err := strconv.Atoi(partitionID)
	if err != nil {
		return &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Partition ID must be a valid integer",
		}
	}

	// Call MAAS client to delete the partition
	err = s.maasClient.DeleteMachinePartition(machineID, deviceIDInt, partitionIDInt)
	if err != nil {
		s.logger.WithError(err).WithFields(logrus.Fields{
			"machine_id":   machineID,
			"device_id":    deviceID,
			"partition_id": partitionID,
		}).Error("Failed to delete partition from block device")
		return mapClientError(err)
	}

	s.logger.WithFields(logrus.Fields{
		"machine_id":   machineID,
		"device_id":    deviceID,
		"partition_id": partitionID,
	}).Debug("Successfully deleted partition from block device")

	return nil
}

// FormatPartition formats a partition on a block device for a specific machine
func (s *StorageService) FormatPartition(ctx context.Context, machineID string, deviceID string, partitionID string, params map[string]interface{}) (*models.FilesystemContext, error) {
	s.logger.WithFields(logrus.Fields{
		"machine_id":   machineID,
		"device_id":    deviceID,
		"partition_id": partitionID,
		"params":       params,
	}).Debug("Formatting partition on block device")

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

	if partitionID == "" {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Partition ID is required",
		}
	}

	// Validate fstype parameter
	if _, ok := params["fstype"]; !ok {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Filesystem type (fstype) is required",
		}
	}

	// Convert IDs from string to int
	deviceIDInt, err := strconv.Atoi(deviceID)
	if err != nil {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Device ID must be a valid integer",
		}
	}

	partitionIDInt, err := strconv.Atoi(partitionID)
	if err != nil {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Partition ID must be a valid integer",
		}
	}

	// Call MAAS client to format the partition
	filesystem, err := s.maasClient.FormatMachinePartition(machineID, deviceIDInt, partitionIDInt, params)
	if err != nil {
		s.logger.WithError(err).WithFields(logrus.Fields{
			"machine_id":   machineID,
			"device_id":    deviceID,
			"partition_id": partitionID,
		}).Error("Failed to format partition on block device")
		return nil, mapClientError(err)
	}

	// Convert to MCP context
	filesystemContext := &models.FilesystemContext{
		Type:         filesystem.FSType,
		UUID:         filesystem.UUID,
		MountPoint:   filesystem.MountPoint,
		MountOptions: filesystem.MountOptions,
	}

	s.logger.WithFields(logrus.Fields{
		"machine_id":   machineID,
		"device_id":    deviceID,
		"partition_id": partitionID,
		"filesystem":   filesystem.FSType,
	}).Debug("Successfully formatted partition on block device")

	return filesystemContext, nil
}

// Helper function to convert int ID to string
func idToString(id int) string {
	return strconv.Itoa(id)
}

// ConfigureStorage orchestrates the storage configuration for a machine based on the desired configuration and constraints.
func (s *StorageService) ConfigureStorage(ctx context.Context, machineID string, config models.DesiredStorageConfiguration) error {
	s.logger.WithFields(logrus.Fields{
		"machine_id": machineID,
		"config":     config,
	}).Debug("Configuring storage for machine")

	// 1. Validate the desired configuration structure
	if err := config.Validate(); err != nil {
		return &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    fmt.Sprintf("Invalid storage configuration: %v", err),
		}
	}

	// 2. Get and validate against existing storage constraints (if provided in config)
	if config.Constraints != nil {
		// Get existing constraints to potentially merge or override
		// Note: The StorageService currently doesn't have direct access to the StorageConstraintsService.
		// This indicates a potential need for refactoring the service structure or passing
		// the StorageConstraintsService as a dependency to StorageService.
		// For now, assuming the maasClient interface includes constraint validation/application.
		// A more robust implementation would involve calling the dedicated StorageConstraintsService.

		// Validate the desired constraints against the machine's current state
		valid, violations, err := s.maasClient.ValidateStorageConstraints(machineID, *config.Constraints)
		if err != nil {
			s.logger.WithError(err).WithField("machine_id", machineID).Error("Failed to validate storage constraints via MAAS client")
			return mapClientError(err)
		}
		if !valid {
			return &ServiceError{
				Err:        ErrBadRequest,
				StatusCode: http.StatusBadRequest,
				Message:    fmt.Sprintf("Storage constraints validation failed: %v", violations),
			}
		}

		// Apply the constraints (if needed - MAAS API might handle enforcement during deployment)
		// This step might be redundant if MAAS enforces constraints automatically based on the set constraints.
		// However, if 'ApplyStorageConstraints' in MAAS triggers the actual configuration based on constraints,
		// this call is necessary. Based on the MAAS API documentation, 'ApplyStorageConstraints'
		// seems to be the trigger for MAAS to configure storage according to the set constraints.
		err = s.maasClient.ApplyStorageConstraints(machineID, *config.Constraints)
		if err != nil {
			s.logger.WithError(err).WithField("machine_id", machineID).Error("Failed to apply storage constraints via MAAS client")
			return mapClientError(err)
		}
	}

	// 3. Orchestrate the creation of storage components (Volume Groups, Logical Volumes, Partitions, RAID)
	// This part requires iterating through the desired configuration and calling the appropriate MAAS client methods.
	// Note: The current StorageService only has methods for Block Devices and Partitions.
	// It needs access to VolumeGroupClient, LogicalVolumeClient, and RAIDClient interfaces
	// or the corresponding service instances to orchestrate these operations.
	// This indicates a need to either:
	// a) Expand the StorageClient interface to include all necessary creation methods (already done).
	// b) Pass dependencies for VolumeGroupService, RAIDService, etc., to the StorageService.
	// Option (a) is simpler with the current structure.

	// Create Volume Groups
	for _, desiredVG := range config.VolumeGroups {
		vgParams := models.VolumeGroupParams{
			Name:         desiredVG.Name,
			BlockDevices: stringSliceToIntSlice(desiredVG.BlockDevices), // Need helper function
			Partitions:   stringSliceToIntSlice(desiredVG.Partitions),   // Need helper function
		}
		volumeGroup, err := s.maasClient.CreateVolumeGroup(machineID, vgParams)
		if err != nil {
			s.logger.WithError(err).WithFields(logrus.Fields{
				"machine_id": machineID,
				"vg_name":    desiredVG.Name,
			}).Error("Failed to create volume group")
			// TODO: Implement rollback or partial success reporting
			return mapClientError(err)
		}

		// Create Logical Volumes within the new Volume Group
		for _, desiredLV := range desiredVG.LogicalVolumes {
			lvParams := models.LogicalVolumeParams{
				Name:   desiredLV.Name,
				Size:   desiredLV.Size,
				FSType: desiredLV.FSType,
			}
			_, err := s.maasClient.CreateLogicalVolume(machineID, volumeGroup.ID, lvParams)
			if err != nil {
				s.logger.WithError(err).WithFields(logrus.Fields{
					"machine_id": machineID,
					"vg_id":      volumeGroup.ID,
					"lv_name":    desiredLV.Name,
				}).Error("Failed to create logical volume")
				// TODO: Implement rollback or partial success reporting
				return mapClientError(err)
			}
		}
	}

	// TODO: Implement creation logic for Partitions and RAIDArrays if included in DesiredStorageConfiguration

	s.logger.WithField("machine_id", machineID).Debug("Successfully configured storage for machine")
	return nil
}

// Helper function to convert a slice of string IDs to a slice of int IDs
// TODO: Move this to a shared utility package if needed elsewhere
func stringSliceToIntSlice(stringSlice []string) []int {
	intSlice := make([]int, len(stringSlice))
	for i, str := range stringSlice {
		// Assuming the string IDs are valid integers
		id, err := strconv.Atoi(str)
		if err != nil {
			// Handle error appropriately, perhaps log a warning or return an error
			// For now, just assigning 0 on error
			intSlice[i] = 0
			logrus.WithField("id_string", str).WithError(err).Warn("Failed to convert string ID to int")
		} else {
			intSlice[i] = id
		}
	}
	return intSlice
}
