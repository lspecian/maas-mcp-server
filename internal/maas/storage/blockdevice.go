package storage

import (
	"fmt"
	"time"

	"github.com/canonical/gomaasclient/client"
	"github.com/canonical/gomaasclient/entity"
	"github.com/sirupsen/logrus"

	"github.com/lspecian/maas-mcp-server/internal/maas/common"
	"github.com/lspecian/maas-mcp-server/internal/models"
	modelsmaas "github.com/lspecian/maas-mcp-server/internal/models/maas"
)

// blockDeviceClient implements the common.BlockDeviceClient interface
type blockDeviceClient struct {
	client *client.Client
	logger *logrus.Logger
	retry  common.RetryFunc
}

// NewBlockDeviceClient creates a new block device client
func NewBlockDeviceClient(client *client.Client, logger *logrus.Logger, retry common.RetryFunc) common.BlockDeviceClient {
	return &blockDeviceClient{
		client: client,
		logger: logger,
		retry:  retry,
	}
}

// GetMachineBlockDevices retrieves block devices for a specific machine.
func (b *blockDeviceClient) GetMachineBlockDevices(systemID string) ([]models.BlockDevice, error) {
	var entityBlockDevices []entity.BlockDevice
	operation := func() error {
		var err error
		// gomaasclient BlockDevices.Get takes systemID string
		entityBlockDevices, err = b.client.BlockDevices.Get(systemID)
		if err != nil {
			b.logger.Errorf("MAAS API error getting block devices for machine %s: %v", systemID, err)
			return fmt.Errorf("maas API error getting block devices for machine %s: %w", systemID, err)
		}
		return nil
	}

	err := b.retry(operation, 3, 2*time.Second)
	if err != nil {
		return nil, err
	}
	modelBlockDevices := make([]models.BlockDevice, len(entityBlockDevices))
	for i, ebd := range entityBlockDevices {
		var mbd models.BlockDevice
		mbd.FromEntity(&ebd)
		modelBlockDevices[i] = mbd
	}
	return modelBlockDevices, nil
}

// GetMachineBlockDevice retrieves a specific block device for a machine.
func (b *blockDeviceClient) GetMachineBlockDevice(systemID string, deviceID int) (*models.BlockDevice, error) {
	var entityBlockDevice *entity.BlockDevice
	operation := func() error {
		var err error
		// gomaasclient BlockDevice.Get(systemID, deviceID)
		entityBlockDevice, err = b.client.BlockDevice.Get(systemID, deviceID)
		if err != nil {
			b.logger.Errorf("MAAS API error getting block device %d for machine %s: %v", deviceID, systemID, err)
			return fmt.Errorf("MAAS API error getting block device %d for machine %s: %w", deviceID, systemID, err)
		}
		return nil
	}

	err := b.retry(operation, 3, 2*time.Second)
	if err != nil {
		return nil, err
	}

	var modelBlockDevice models.BlockDevice
	modelBlockDevice.FromEntity(entityBlockDevice)
	return &modelBlockDevice, nil
}

// CreateMachinePartition creates a partition on a block device.
// Placeholder implementation until gomaasclient API is fully implemented.
func (b *blockDeviceClient) CreateMachinePartition(systemID string, blockDeviceID int, params modelsmaas.PartitionCreateParams) (*models.Partition, error) {
	b.logger.Debugf("Creating partition for machine %s, device %d with params %+v", systemID, blockDeviceID, params)

	// Placeholder for actual implementation
	operation := func() error {
		// TODO: Implement actual MAAS API call when gomaasclient supports it
		// For now, simulating a successful call
		return nil
	}

	err := b.retry(operation, 3, 2*time.Second)
	if err != nil {
		b.logger.WithError(err).Errorf("Failed to create partition for machine %s, device %d", systemID, blockDeviceID)
		return nil, fmt.Errorf("failed to create partition: %w", err)
	}

	// Simulating a successful response
	modelPartition := &models.Partition{
		ID:          123, // Simulated ID
		Size:        params.Size,
		Path:        fmt.Sprintf("/dev/sda%d", blockDeviceID),                                                          // Simulated path
		Type:        "primary",                                                                                         // Simulated type
		ResourceURL: fmt.Sprintf("/MAAS/api/2.0/machines/%s/blockdevices/%d/partitions/123/", systemID, blockDeviceID), // Simulated URL
	}

	if params.FSType != "" {
		modelPartition.Filesystem = &models.Filesystem{
			FSType: params.FSType,
		}
	}

	b.logger.Debugf("Successfully created partition %d for machine %s, device %d", modelPartition.ID, systemID, blockDeviceID)
	return modelPartition, nil
}

// UpdateMachinePartition updates a partition on a block device.
// Placeholder implementation.
func (b *blockDeviceClient) UpdateMachinePartition(systemID string, blockDeviceID, partitionID int, params map[string]interface{}) (*models.Partition, error) {
	b.logger.Warnf("UpdateMachinePartition for machine %s, device %d, partition %d is a placeholder.", systemID, blockDeviceID, partitionID)
	return nil, fmt.Errorf("UpdateMachinePartition not implemented")
}

// DeleteMachinePartition deletes a partition from a block device.
// Placeholder implementation.
func (b *blockDeviceClient) DeleteMachinePartition(systemID string, blockDeviceID, partitionID int) error {
	b.logger.Warnf("DeleteMachinePartition for machine %s, device %d, partition %d is a placeholder.", systemID, blockDeviceID, partitionID)
	return fmt.Errorf("DeleteMachinePartition not implemented")
}

// FormatMachinePartition formats a partition on a block device.
// Placeholder implementation.
func (b *blockDeviceClient) FormatMachinePartition(systemID string, blockDeviceID, partitionID int, params map[string]interface{}) (*models.Filesystem, error) {
	b.logger.Warnf("FormatMachinePartition for machine %s, device %d, partition %d is a placeholder.", systemID, blockDeviceID, partitionID)
	return nil, fmt.Errorf("FormatMachinePartition not implemented")
}
