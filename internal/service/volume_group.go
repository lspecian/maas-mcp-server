package service

import (
	"context"
	"net/http"
	"strconv"

	"github.com/lspecian/maas-mcp-server/internal/models"
	"github.com/sirupsen/logrus"
)

// VolumeGroupClient defines the interface for MAAS client operations needed by the volume group service
type VolumeGroupClient interface {
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
}

// VolumeGroupService handles volume group operations
type VolumeGroupService struct {
	maasClient VolumeGroupClient
	logger     *logrus.Logger
}

// NewVolumeGroupService creates a new volume group service instance
func NewVolumeGroupService(client VolumeGroupClient, logger *logrus.Logger) *VolumeGroupService {
	return &VolumeGroupService{
		maasClient: client,
		logger:     logger,
	}
}

// ListVolumeGroups retrieves all volume groups for a machine
func (s *VolumeGroupService) ListVolumeGroups(ctx context.Context, machineID string) ([]models.VolumeGroupContext, error) {
	s.logger.WithField("machine_id", machineID).Debug("Listing volume groups for machine")

	// Validate machine ID
	if machineID == "" {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Machine ID is required",
		}
	}

	// Call MAAS client to get volume groups
	volumeGroups, err := s.maasClient.ListVolumeGroups(machineID)
	if err != nil {
		s.logger.WithError(err).WithField("machine_id", machineID).Error("Failed to get volume groups from MAAS")
		return nil, mapClientError(err)
	}

	// Convert MAAS volume groups to MCP context
	result := make([]models.VolumeGroupContext, len(volumeGroups))
	for i, vg := range volumeGroups {
		vgContext := models.MaasVolumeGroupToMCPContext(&vg)
		result[i] = *vgContext
	}

	s.logger.WithFields(logrus.Fields{
		"machine_id": machineID,
		"count":      len(result),
	}).Debug("Successfully retrieved volume groups")

	return result, nil
}

// GetVolumeGroup retrieves a specific volume group by machine ID and volume group ID
func (s *VolumeGroupService) GetVolumeGroup(ctx context.Context, machineID string, volumeGroupID string) (*models.VolumeGroupContext, error) {
	s.logger.WithFields(logrus.Fields{
		"machine_id":      machineID,
		"volume_group_id": volumeGroupID,
	}).Debug("Getting volume group")

	// Validate parameters
	if machineID == "" {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Machine ID is required",
		}
	}

	if volumeGroupID == "" {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Volume Group ID is required",
		}
	}

	// Convert volumeGroupID from string to int
	volumeGroupIDInt, err := strconv.Atoi(volumeGroupID)
	if err != nil {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Volume Group ID must be a valid integer",
		}
	}

	// Get the specific volume group
	volumeGroup, err := s.maasClient.GetVolumeGroup(machineID, volumeGroupIDInt)
	if err != nil {
		s.logger.WithError(err).WithFields(logrus.Fields{
			"machine_id":      machineID,
			"volume_group_id": volumeGroupID,
		}).Error("Failed to get volume group from MAAS")
		return nil, mapClientError(err)
	}

	// Convert to MCP context
	vgContext := models.MaasVolumeGroupToMCPContext(volumeGroup)

	s.logger.WithFields(logrus.Fields{
		"machine_id":      machineID,
		"volume_group_id": volumeGroupID,
	}).Debug("Successfully retrieved volume group")

	return vgContext, nil
}

// CreateVolumeGroup creates a new volume group
func (s *VolumeGroupService) CreateVolumeGroup(ctx context.Context, machineID string, params map[string]interface{}) (*models.VolumeGroupContext, error) {
	s.logger.WithFields(logrus.Fields{
		"machine_id": machineID,
		"params":     params,
	}).Debug("Creating volume group")

	// Validate parameters
	if machineID == "" {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Machine ID is required",
		}
	}

	// Validate name parameter
	name, ok := params["name"].(string)
	if !ok || name == "" {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Volume group name is required",
		}
	}

	// Check for block devices or partitions
	var blockDevices []int
	var partitions []int

	// Process block devices
	if blockDevicesParam, ok := params["block_devices"]; ok {
		if blockDevicesArray, ok := blockDevicesParam.([]interface{}); ok {
			for _, id := range blockDevicesArray {
				if idFloat, ok := id.(float64); ok {
					blockDevices = append(blockDevices, int(idFloat))
				} else if idInt, ok := id.(int); ok {
					blockDevices = append(blockDevices, idInt)
				} else if idString, ok := id.(string); ok {
					if idInt, err := strconv.Atoi(idString); err == nil {
						blockDevices = append(blockDevices, idInt)
					}
				}
			}
		}
	}

	// Process partitions
	if partitionsParam, ok := params["partitions"]; ok {
		if partitionsArray, ok := partitionsParam.([]interface{}); ok {
			for _, id := range partitionsArray {
				if idFloat, ok := id.(float64); ok {
					partitions = append(partitions, int(idFloat))
				} else if idInt, ok := id.(int); ok {
					partitions = append(partitions, idInt)
				} else if idString, ok := id.(string); ok {
					if idInt, err := strconv.Atoi(idString); err == nil {
						partitions = append(partitions, idInt)
					}
				}
			}
		}
	}

	// Ensure at least one block device or partition is provided
	if len(blockDevices) == 0 && len(partitions) == 0 {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "At least one block device or partition is required",
		}
	}

	// Prepare parameters for MAAS client
	vgParams := models.VolumeGroupParams{
		Name:         name,
		BlockDevices: blockDevices,
		Partitions:   partitions,
	}

	// Call MAAS client to create the volume group
	volumeGroup, err := s.maasClient.CreateVolumeGroup(machineID, vgParams)
	if err != nil {
		s.logger.WithError(err).WithField("machine_id", machineID).Error("Failed to create volume group")
		return nil, mapClientError(err)
	}

	// Convert to MCP context
	vgContext := models.MaasVolumeGroupToMCPContext(volumeGroup)

	s.logger.WithFields(logrus.Fields{
		"machine_id":      machineID,
		"volume_group_id": volumeGroup.ID,
		"name":            volumeGroup.Name,
	}).Debug("Successfully created volume group")

	return vgContext, nil
}

// DeleteVolumeGroup deletes a volume group
func (s *VolumeGroupService) DeleteVolumeGroup(ctx context.Context, machineID string, volumeGroupID string) error {
	s.logger.WithFields(logrus.Fields{
		"machine_id":      machineID,
		"volume_group_id": volumeGroupID,
	}).Debug("Deleting volume group")

	// Validate parameters
	if machineID == "" {
		return &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Machine ID is required",
		}
	}

	if volumeGroupID == "" {
		return &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Volume Group ID is required",
		}
	}

	// Convert volumeGroupID from string to int
	volumeGroupIDInt, err := strconv.Atoi(volumeGroupID)
	if err != nil {
		return &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Volume Group ID must be a valid integer",
		}
	}

	// Call MAAS client to delete the volume group
	err = s.maasClient.DeleteVolumeGroup(machineID, volumeGroupIDInt)
	if err != nil {
		s.logger.WithError(err).WithFields(logrus.Fields{
			"machine_id":      machineID,
			"volume_group_id": volumeGroupID,
		}).Error("Failed to delete volume group")
		return mapClientError(err)
	}

	s.logger.WithFields(logrus.Fields{
		"machine_id":      machineID,
		"volume_group_id": volumeGroupID,
	}).Debug("Successfully deleted volume group")

	return nil
}

// CreateLogicalVolume creates a new logical volume in a volume group
func (s *VolumeGroupService) CreateLogicalVolume(ctx context.Context, machineID string, volumeGroupID string, params map[string]interface{}) (*models.LogicalVolumeContext, error) {
	s.logger.WithFields(logrus.Fields{
		"machine_id":      machineID,
		"volume_group_id": volumeGroupID,
		"params":          params,
	}).Debug("Creating logical volume")

	// Validate parameters
	if machineID == "" {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Machine ID is required",
		}
	}

	if volumeGroupID == "" {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Volume Group ID is required",
		}
	}

	// Convert volumeGroupID from string to int
	volumeGroupIDInt, err := strconv.Atoi(volumeGroupID)
	if err != nil {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Volume Group ID must be a valid integer",
		}
	}

	// Validate name parameter
	name, ok := params["name"].(string)
	if !ok || name == "" {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Logical volume name is required",
		}
	}

	// Validate size parameter
	var size int64
	if sizeParam, ok := params["size"]; ok {
		if sizeFloat, ok := sizeParam.(float64); ok {
			size = int64(sizeFloat)
		} else if sizeInt, ok := sizeParam.(int); ok {
			size = int64(sizeInt)
		} else if sizeInt64, ok := sizeParam.(int64); ok {
			size = sizeInt64
		} else if sizeString, ok := sizeParam.(string); ok {
			if sizeInt, err := strconv.ParseInt(sizeString, 10, 64); err == nil {
				size = sizeInt
			}
		}
	}

	if size <= 0 {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Logical volume size must be greater than zero",
		}
	}

	// Get optional fstype parameter
	fstype := ""
	if fstypeParam, ok := params["fstype"]; ok {
		if fstypeString, ok := fstypeParam.(string); ok {
			fstype = fstypeString
		}
	}

	// Prepare parameters for MAAS client
	lvParams := models.LogicalVolumeParams{
		Name:   name,
		Size:   size,
		FSType: fstype,
	}

	// Call MAAS client to create the logical volume
	logicalVolume, err := s.maasClient.CreateLogicalVolume(machineID, volumeGroupIDInt, lvParams)
	if err != nil {
		s.logger.WithError(err).WithFields(logrus.Fields{
			"machine_id":      machineID,
			"volume_group_id": volumeGroupID,
		}).Error("Failed to create logical volume")
		return nil, mapClientError(err)
	}

	// Convert to MCP context
	lvContext := models.MaasLogicalVolumeToMCPContext(logicalVolume)

	s.logger.WithFields(logrus.Fields{
		"machine_id":        machineID,
		"volume_group_id":   volumeGroupID,
		"logical_volume_id": logicalVolume.ID,
		"name":              logicalVolume.Name,
	}).Debug("Successfully created logical volume")

	return lvContext, nil
}

// DeleteLogicalVolume deletes a logical volume
func (s *VolumeGroupService) DeleteLogicalVolume(ctx context.Context, machineID string, volumeGroupID string, logicalVolumeID string) error {
	s.logger.WithFields(logrus.Fields{
		"machine_id":        machineID,
		"volume_group_id":   volumeGroupID,
		"logical_volume_id": logicalVolumeID,
	}).Debug("Deleting logical volume")

	// Validate parameters
	if machineID == "" {
		return &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Machine ID is required",
		}
	}

	if volumeGroupID == "" {
		return &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Volume Group ID is required",
		}
	}

	if logicalVolumeID == "" {
		return &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Logical Volume ID is required",
		}
	}

	// Convert IDs from string to int
	volumeGroupIDInt, err := strconv.Atoi(volumeGroupID)
	if err != nil {
		return &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Volume Group ID must be a valid integer",
		}
	}

	logicalVolumeIDInt, err := strconv.Atoi(logicalVolumeID)
	if err != nil {
		return &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Logical Volume ID must be a valid integer",
		}
	}

	// Call MAAS client to delete the logical volume
	err = s.maasClient.DeleteLogicalVolume(machineID, volumeGroupIDInt, logicalVolumeIDInt)
	if err != nil {
		s.logger.WithError(err).WithFields(logrus.Fields{
			"machine_id":        machineID,
			"volume_group_id":   volumeGroupID,
			"logical_volume_id": logicalVolumeID,
		}).Error("Failed to delete logical volume")
		return mapClientError(err)
	}

	s.logger.WithFields(logrus.Fields{
		"machine_id":        machineID,
		"volume_group_id":   volumeGroupID,
		"logical_volume_id": logicalVolumeID,
	}).Debug("Successfully deleted logical volume")

	return nil
}

// ResizeLogicalVolume resizes a logical volume
func (s *VolumeGroupService) ResizeLogicalVolume(ctx context.Context, machineID string, volumeGroupID string, logicalVolumeID string, params map[string]interface{}) (*models.LogicalVolumeContext, error) {
	s.logger.WithFields(logrus.Fields{
		"machine_id":        machineID,
		"volume_group_id":   volumeGroupID,
		"logical_volume_id": logicalVolumeID,
		"params":            params,
	}).Debug("Resizing logical volume")

	// Validate parameters
	if machineID == "" {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Machine ID is required",
		}
	}

	if volumeGroupID == "" {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Volume Group ID is required",
		}
	}

	if logicalVolumeID == "" {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Logical Volume ID is required",
		}
	}

	// Convert IDs from string to int
	volumeGroupIDInt, err := strconv.Atoi(volumeGroupID)
	if err != nil {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Volume Group ID must be a valid integer",
		}
	}

	logicalVolumeIDInt, err := strconv.Atoi(logicalVolumeID)
	if err != nil {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Logical Volume ID must be a valid integer",
		}
	}

	// Validate size parameter
	var newSize int64
	if sizeParam, ok := params["size"]; ok {
		if sizeFloat, ok := sizeParam.(float64); ok {
			newSize = int64(sizeFloat)
		} else if sizeInt, ok := sizeParam.(int); ok {
			newSize = int64(sizeInt)
		} else if sizeInt64, ok := sizeParam.(int64); ok {
			newSize = sizeInt64
		} else if sizeString, ok := sizeParam.(string); ok {
			if sizeInt, err := strconv.ParseInt(sizeString, 10, 64); err == nil {
				newSize = sizeInt
			}
		}
	}

	if newSize <= 0 {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "New size must be greater than zero",
		}
	}

	// Call MAAS client to resize the logical volume
	logicalVolume, err := s.maasClient.ResizeLogicalVolume(machineID, volumeGroupIDInt, logicalVolumeIDInt, newSize)
	if err != nil {
		s.logger.WithError(err).WithFields(logrus.Fields{
			"machine_id":        machineID,
			"volume_group_id":   volumeGroupID,
			"logical_volume_id": logicalVolumeID,
		}).Error("Failed to resize logical volume")
		return nil, mapClientError(err)
	}

	// Convert to MCP context
	lvContext := models.MaasLogicalVolumeToMCPContext(logicalVolume)

	s.logger.WithFields(logrus.Fields{
		"machine_id":        machineID,
		"volume_group_id":   volumeGroupID,
		"logical_volume_id": logicalVolumeID,
		"new_size":          newSize,
	}).Debug("Successfully resized logical volume")

	return lvContext, nil
}
