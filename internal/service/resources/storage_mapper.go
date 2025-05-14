package resources

import (
	"fmt"
	"strconv"

	"github.com/lspecian/maas-mcp-server/internal/errors"
	"github.com/lspecian/maas-mcp-server/internal/logging"
	"github.com/lspecian/maas-mcp-server/internal/models"
	maasmodels "github.com/lspecian/maas-mcp-server/internal/models/maas"
)

// StorageResourceMapper handles mapping between MAAS BlockDevice and MCP StorageContext
type StorageResourceMapper struct {
	BaseResourceMapper
}

// NewStorageResourceMapper creates a new storage resource mapper
func NewStorageResourceMapper(logger *logging.Logger) *StorageResourceMapper {
	return &StorageResourceMapper{
		BaseResourceMapper: BaseResourceMapper{
			Name:   "storage",
			Logger: logger,
		},
	}
}

// MapToMCP maps a MAAS BlockDevice to an MCP StorageContext
func (m *StorageResourceMapper) MapToMCP(maasResource interface{}) (interface{}, error) {
	device, ok := maasResource.(*maasmodels.BlockDevice)
	if !ok {
		return nil, errors.NewValidationError(
			fmt.Sprintf("Expected *maasmodels.BlockDevice, got %T", maasResource),
			nil,
		)
	}

	// Validate the block device
	if err := device.Validate(); err != nil {
		return nil, errors.NewValidationError(
			fmt.Sprintf("Invalid MAAS BlockDevice: %s", err.Error()),
			err,
		)
	}

	ctx := &models.StorageContext{
		ID:            idToString(device.ID),
		Name:          device.Name,
		Type:          device.Type,
		Path:          device.Path,
		Size:          device.Size,
		UsedSize:      device.UsedSize,
		AvailableSize: device.AvailableSize,
		Model:         device.Model,
		Serial:        device.Serial,
		Tags:          device.Tags,
	}

	// Convert filesystem if available
	if device.Filesystem != nil {
		ctx.Filesystem = &models.FilesystemContext{
			Type:         device.Filesystem.FSType,
			UUID:         device.Filesystem.UUID,
			MountPoint:   device.Filesystem.MountPoint,
			MountOptions: device.Filesystem.MountOptions,
		}

		// Add mountpoint if available
		if device.Filesystem.MountPoint != "" {
			ctx.Mountpoints = []models.MountpointContext{
				{
					Path:    device.Filesystem.MountPoint,
					Options: device.Filesystem.MountOptions,
					Device:  device.Path,
				},
			}
		}
	}

	// Convert partitions
	ctx.Partitions = make([]models.PartitionContext, 0, len(device.Partitions))
	for i, part := range device.Partitions {
		partCtx := models.PartitionContext{
			ID:     idToString(part.ID),
			Number: i + 1,
			Size:   part.Size,
			Path:   part.Path,
		}

		// Convert filesystem if available
		if part.Filesystem != nil {
			partCtx.Filesystem = &models.FilesystemContext{
				Type:         part.Filesystem.FSType,
				UUID:         part.Filesystem.UUID,
				MountPoint:   part.Filesystem.MountPoint,
				MountOptions: part.Filesystem.MountOptions,
			}

			// Add mountpoint if available
			if part.Filesystem.MountPoint != "" {
				mountpoint := models.MountpointContext{
					Path:    part.Filesystem.MountPoint,
					Options: part.Filesystem.MountOptions,
					Device:  part.Path,
				}
				ctx.Mountpoints = append(ctx.Mountpoints, mountpoint)
			}
		}

		ctx.Partitions = append(ctx.Partitions, partCtx)
	}

	return ctx, nil
}

// MapToMaas maps an MCP StorageContext to a MAAS BlockDevice
func (m *StorageResourceMapper) MapToMaas(mcpResource interface{}) (interface{}, error) {
	ctx, ok := mcpResource.(*models.StorageContext)
	if !ok {
		return nil, errors.NewValidationError(
			fmt.Sprintf("Expected *models.StorageContext, got %T", mcpResource),
			nil,
		)
	}

	// Validate the storage context
	if err := ctx.Validate(); err != nil {
		return nil, errors.NewValidationError(
			fmt.Sprintf("Invalid MCP StorageContext: %s", err.Error()),
			err,
		)
	}

	// Convert ID from string to int
	id, err := strconv.Atoi(ctx.ID)
	if err != nil {
		m.Logger.WithError(err).Warn("Failed to convert storage ID to int, using 0")
		id = 0
	}

	device := &maasmodels.BlockDevice{
		ID:            id,
		Name:          ctx.Name,
		Type:          ctx.Type,
		Path:          ctx.Path,
		Size:          ctx.Size,
		UsedSize:      ctx.UsedSize,
		AvailableSize: ctx.AvailableSize,
		Model:         ctx.Model,
		Serial:        ctx.Serial,
		Tags:          ctx.Tags,
	}

	// Create filesystem if available
	if ctx.Filesystem != nil {
		device.Filesystem = &maasmodels.Filesystem{
			FSType:       ctx.Filesystem.Type,
			UUID:         ctx.Filesystem.UUID,
			MountPoint:   ctx.Filesystem.MountPoint,
			MountOptions: ctx.Filesystem.MountOptions,
		}
	}

	// Create partitions
	device.Partitions = make([]maasmodels.Partition, 0, len(ctx.Partitions))
	for _, partCtx := range ctx.Partitions {
		// Convert ID from string to int
		partID, err := strconv.Atoi(partCtx.ID)
		if err != nil {
			m.Logger.WithError(err).Warn("Failed to convert partition ID to int, using 0")
			partID = 0
		}

		part := maasmodels.Partition{
			ID:   partID,
			Size: partCtx.Size,
			Path: partCtx.Path,
		}

		// Create filesystem if available
		if partCtx.Filesystem != nil {
			part.Filesystem = &maasmodels.Filesystem{
				FSType:       partCtx.Filesystem.Type,
				UUID:         partCtx.Filesystem.UUID,
				MountPoint:   partCtx.Filesystem.MountPoint,
				MountOptions: partCtx.Filesystem.MountOptions,
			}
		}

		device.Partitions = append(device.Partitions, part)
	}

	return device, nil
}
