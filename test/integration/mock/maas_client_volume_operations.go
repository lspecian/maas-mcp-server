package mock

import (
	"fmt"

	"github.com/lspecian/maas-mcp-server/internal/models"
)

// Volume Group operations

// CreateVolumeGroup creates a new volume group
func (m *MockMaasClient) CreateVolumeGroup(systemID string, params models.VolumeGroupParams) (*models.VolumeGroup, error) {
	if err := m.checkFailure("CreateVolumeGroup"); err != nil {
		return nil, err
	}

	m.mutex.Lock()
	defer m.mutex.Unlock()

	// Check if machine exists
	if _, ok := m.machines[systemID]; !ok {
		return nil, fmt.Errorf("machine not found: %s", systemID)
	}

	// Basic validation
	if params.Name == "" {
		return nil, fmt.Errorf("volume group name is required")
	}

	// Create a simulated volume group
	volumeGroup := &models.VolumeGroup{
		ID:            1,
		Name:          params.Name,
		UUID:          "simulated-vg-uuid",
		Size:          1024 * 1024 * 1024 * 10, // 10 GB (simulated)
		UsedSize:      0,
		AvailableSize: 1024 * 1024 * 1024 * 10, // 10 GB (simulated)
		SystemID:      systemID,
		BlockDevices:  params.BlockDevices,
		Partitions:    params.Partitions,
		ResourceURL:   fmt.Sprintf("/MAAS/api/2.0/machines/%s/volume-groups/1/", systemID),
	}

	return volumeGroup, nil
}

// DeleteVolumeGroup deletes a volume group
func (m *MockMaasClient) DeleteVolumeGroup(systemID string, volumeGroupID int) error {
	if err := m.checkFailure("DeleteVolumeGroup"); err != nil {
		return err
	}

	m.mutex.Lock()
	defer m.mutex.Unlock()

	// Check if machine exists
	if _, ok := m.machines[systemID]; !ok {
		return fmt.Errorf("machine not found: %s", systemID)
	}

	// In a real implementation, we would delete the volume group
	// For the mock, we'll just log and return success
	m.logger.WithField("system_id", systemID).Info("Volume group deleted successfully")
	return nil
}

// GetVolumeGroup retrieves a specific volume group
func (m *MockMaasClient) GetVolumeGroup(systemID string, volumeGroupID int) (*models.VolumeGroup, error) {
	if err := m.checkFailure("GetVolumeGroup"); err != nil {
		return nil, err
	}

	m.mutex.RLock()
	defer m.mutex.RUnlock()

	// Check if machine exists
	if _, ok := m.machines[systemID]; !ok {
		return nil, fmt.Errorf("machine not found: %s", systemID)
	}

	// Create a simulated volume group
	volumeGroup := &models.VolumeGroup{
		ID:            volumeGroupID,
		Name:          fmt.Sprintf("vg-%d", volumeGroupID),
		UUID:          fmt.Sprintf("simulated-vg-uuid-%d", volumeGroupID),
		Size:          1024 * 1024 * 1024 * 10, // 10 GB (simulated)
		UsedSize:      1024 * 1024 * 1024 * 2,  // 2 GB (simulated)
		AvailableSize: 1024 * 1024 * 1024 * 8,  // 8 GB (simulated)
		SystemID:      systemID,
		BlockDevices:  []int{1, 2},
		ResourceURL:   fmt.Sprintf("/MAAS/api/2.0/machines/%s/volume-groups/%d/", systemID, volumeGroupID),
	}

	return volumeGroup, nil
}

// ListVolumeGroups retrieves all volume groups for a machine
func (m *MockMaasClient) ListVolumeGroups(systemID string) ([]models.VolumeGroup, error) {
	if err := m.checkFailure("ListVolumeGroups"); err != nil {
		return nil, err
	}

	m.mutex.RLock()
	defer m.mutex.RUnlock()

	// Check if machine exists
	if _, ok := m.machines[systemID]; !ok {
		return nil, fmt.Errorf("machine not found: %s", systemID)
	}

	// Create simulated volume groups
	volumeGroups := []models.VolumeGroup{
		{
			ID:            1,
			Name:          "vg-1",
			UUID:          "simulated-vg-uuid-1",
			Size:          1024 * 1024 * 1024 * 10, // 10 GB (simulated)
			UsedSize:      1024 * 1024 * 1024 * 2,  // 2 GB (simulated)
			AvailableSize: 1024 * 1024 * 1024 * 8,  // 8 GB (simulated)
			SystemID:      systemID,
			BlockDevices:  []int{1},
			ResourceURL:   fmt.Sprintf("/MAAS/api/2.0/machines/%s/volume-groups/1/", systemID),
		},
		{
			ID:            2,
			Name:          "vg-2",
			UUID:          "simulated-vg-uuid-2",
			Size:          1024 * 1024 * 1024 * 20, // 20 GB (simulated)
			UsedSize:      1024 * 1024 * 1024 * 5,  // 5 GB (simulated)
			AvailableSize: 1024 * 1024 * 1024 * 15, // 15 GB (simulated)
			SystemID:      systemID,
			BlockDevices:  []int{2},
			ResourceURL:   fmt.Sprintf("/MAAS/api/2.0/machines/%s/volume-groups/2/", systemID),
		},
	}

	return volumeGroups, nil
}

// Logical Volume operations

// CreateLogicalVolume creates a new logical volume
func (m *MockMaasClient) CreateLogicalVolume(systemID string, volumeGroupID int, params models.LogicalVolumeParams) (*models.LogicalVolume, error) {
	if err := m.checkFailure("CreateLogicalVolume"); err != nil {
		return nil, err
	}

	m.mutex.Lock()
	defer m.mutex.Unlock()

	// Check if machine exists
	if _, ok := m.machines[systemID]; !ok {
		return nil, fmt.Errorf("machine not found: %s", systemID)
	}

	// Basic validation
	if params.Name == "" {
		return nil, fmt.Errorf("logical volume name is required")
	}
	if params.Size <= 0 {
		return nil, fmt.Errorf("logical volume size must be greater than 0")
	}

	// Create a simulated logical volume
	logicalVolume := &models.LogicalVolume{
		ID:          1,
		Name:        params.Name,
		UUID:        "simulated-lv-uuid",
		Size:        params.Size,
		VolumeGroup: volumeGroupID,
		ResourceURL: fmt.Sprintf("/MAAS/api/2.0/machines/%s/volume-groups/%d/logical-volumes/1/", systemID, volumeGroupID),
	}

	return logicalVolume, nil
}

// DeleteLogicalVolume deletes a logical volume
func (m *MockMaasClient) DeleteLogicalVolume(systemID string, volumeGroupID, logicalVolumeID int) error {
	if err := m.checkFailure("DeleteLogicalVolume"); err != nil {
		return err
	}

	m.mutex.Lock()
	defer m.mutex.Unlock()

	// Check if machine exists
	if _, ok := m.machines[systemID]; !ok {
		return fmt.Errorf("machine not found: %s", systemID)
	}

	// In a real implementation, we would delete the logical volume
	// For the mock, we'll just log and return success
	m.logger.WithField("system_id", systemID).Info("Logical volume deleted successfully")
	return nil
}

// ResizeLogicalVolume resizes a logical volume
func (m *MockMaasClient) ResizeLogicalVolume(systemID string, volumeGroupID, logicalVolumeID int, newSize int64) (*models.LogicalVolume, error) {
	if err := m.checkFailure("ResizeLogicalVolume"); err != nil {
		return nil, err
	}

	m.mutex.Lock()
	defer m.mutex.Unlock()

	// Check if machine exists
	if _, ok := m.machines[systemID]; !ok {
		return nil, fmt.Errorf("machine not found: %s", systemID)
	}

	// Create a simulated logical volume with the new size
	logicalVolume := &models.LogicalVolume{
		ID:          logicalVolumeID,
		Name:        fmt.Sprintf("lv-%d", logicalVolumeID),
		UUID:        fmt.Sprintf("simulated-lv-uuid-%d", logicalVolumeID),
		Size:        newSize,
		VolumeGroup: volumeGroupID,
		ResourceURL: fmt.Sprintf("/MAAS/api/2.0/machines/%s/volume-groups/%d/logical-volumes/%d/", systemID, volumeGroupID, logicalVolumeID),
	}

	return logicalVolume, nil
}

// GetLogicalVolume retrieves a specific logical volume
func (m *MockMaasClient) GetLogicalVolume(systemID string, volumeGroupID, logicalVolumeID int) (*models.LogicalVolume, error) {
	if err := m.checkFailure("GetLogicalVolume"); err != nil {
		return nil, err
	}

	m.mutex.RLock()
	defer m.mutex.RUnlock()

	// Check if machine exists
	if _, ok := m.machines[systemID]; !ok {
		return nil, fmt.Errorf("machine not found: %s", systemID)
	}

	// Create a simulated logical volume
	logicalVolume := &models.LogicalVolume{
		ID:          logicalVolumeID,
		Name:        fmt.Sprintf("lv-%d", logicalVolumeID),
		UUID:        fmt.Sprintf("simulated-lv-uuid-%d", logicalVolumeID),
		Size:        1024 * 1024 * 1024 * 2, // 2 GB (simulated)
		VolumeGroup: volumeGroupID,
		ResourceURL: fmt.Sprintf("/MAAS/api/2.0/machines/%s/volume-groups/%d/logical-volumes/%d/", systemID, volumeGroupID, logicalVolumeID),
	}

	return logicalVolume, nil
}
