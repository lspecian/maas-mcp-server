package mock

import (
	"fmt"
	"time"

	"github.com/lspecian/maas-mcp-server/internal/models"
)

// --- Mock StorageClient - RAID Operations ---

// CreateRAID mock
func (m *MockMaasClient) CreateRAID(systemID string, params models.RAIDParams) (*models.RAID, error) {
	if err := m.checkFailure("CreateRAID"); err != nil {
		return nil, err
	}
	m.mutex.Lock()
	defer m.mutex.Unlock()

	if _, ok := m.machines[systemID]; !ok {
		return nil, fmt.Errorf("machine not found: %s", systemID)
	}
	if params.Name == "" {
		return nil, fmt.Errorf("RAID name is required")
	}
	if len(params.BlockDevices) == 0 {
		return nil, fmt.Errorf("RAID requires at least one block device")
	}

	raidID := time.Now().Nanosecond() // Dummy ID
	raid := &models.RAID{
		ID:           raidID,
		Name:         params.Name,
		Level:        params.Level,
		Size:         0, // Should be calculated based on devices and level
		SystemID:     systemID,
		BlockDevices: params.BlockDevices,
		ResourceURL:  fmt.Sprintf("/MAAS/api/2.0/machines/%s/raids/%d/", systemID, raidID),
		// Add other fields as necessary
	}
	// In a real mock, store this: m.raids[systemID][raidID] = raid
	m.logger.Infof("Mock CreateRAID for %s: %s (ID: %d)", systemID, raid.Name, raid.ID)
	return raid, nil
}

// DeleteRAID mock
func (m *MockMaasClient) DeleteRAID(systemID string, raidID int) error {
	if err := m.checkFailure("DeleteRAID"); err != nil {
		return err
	}
	m.mutex.Lock()
	defer m.mutex.Unlock()

	if _, ok := m.machines[systemID]; !ok {
		return fmt.Errorf("machine not found: %s", systemID)
	}
	// In a real mock, delete this: delete(m.raids[systemID], raidID)
	m.logger.Infof("Mock DeleteRAID for %s: ID %d", systemID, raidID)
	return nil
}

// GetRAID mock
func (m *MockMaasClient) GetRAID(systemID string, raidID int) (*models.RAID, error) {
	if err := m.checkFailure("GetRAID"); err != nil {
		return nil, err
	}
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	if _, ok := m.machines[systemID]; !ok {
		return nil, fmt.Errorf("machine not found: %s", systemID)
	}
	// In a real mock, retrieve this: raid, ok := m.raids[systemID][raidID]
	// Returning a dummy for now.
	m.logger.Infof("Mock GetRAID for %s: ID %d", systemID, raidID)
	return &models.RAID{
		ID:           raidID,
		Name:         fmt.Sprintf("mock-raid-%d", raidID),
		Level:        "raid1",
		Size:         10737418240, // 10GB
		SystemID:     systemID,
		BlockDevices: []int{1, 2}, // Dummy device IDs
		ResourceURL:  fmt.Sprintf("/MAAS/api/2.0/machines/%s/raids/%d/", systemID, raidID),
	}, nil
}

// ListRAIDs mock
func (m *MockMaasClient) ListRAIDs(systemID string) ([]models.RAID, error) {
	if err := m.checkFailure("ListRAIDs"); err != nil {
		return nil, err
	}
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	if _, ok := m.machines[systemID]; !ok {
		return nil, fmt.Errorf("machine not found: %s", systemID)
	}
	// In a real mock, retrieve this: raids := m.raids[systemID]
	// Returning a dummy list for now.
	m.logger.Infof("Mock ListRAIDs for %s", systemID)
	return []models.RAID{
		{
			ID:           1,
			Name:         "mock-raid1",
			Level:        "raid1",
			Size:         10737418240,
			SystemID:     systemID,
			BlockDevices: []int{1, 2},
			ResourceURL:  fmt.Sprintf("/MAAS/api/2.0/machines/%s/raids/1/", systemID),
		},
		{
			ID:           2,
			Name:         "mock-raid2",
			Level:        "raid0",
			Size:         21474836480,
			SystemID:     systemID,
			BlockDevices: []int{3, 4},
			ResourceURL:  fmt.Sprintf("/MAAS/api/2.0/machines/%s/raids/2/", systemID),
		},
	}, nil
}

// UpdateRAID mock
func (m *MockMaasClient) UpdateRAID(systemID string, raidID int, params models.RAIDUpdateParams) (*models.RAID, error) {
	if err := m.checkFailure("UpdateRAID"); err != nil {
		return nil, err
	}
	m.mutex.Lock()
	defer m.mutex.Unlock()

	if _, ok := m.machines[systemID]; !ok {
		return nil, fmt.Errorf("machine not found: %s", systemID)
	}
	// In a real mock, retrieve and update: raid, ok := m.raids[systemID][raidID]
	// For now, just return a modified dummy RAID.
	m.logger.Infof("Mock UpdateRAID for %s: ID %d with params %+v", systemID, raidID, params)
	updatedRAID := &models.RAID{
		ID:           raidID,
		Name:         params.Name, // Assume name can be updated
		Level:        "raid1",     // Level typically cannot be updated post-creation
		Size:         10737418240,
		SystemID:     systemID,
		BlockDevices: []int{1, 2}, // Block devices typically cannot be updated this way
		ResourceURL:  fmt.Sprintf("/MAAS/api/2.0/machines/%s/raids/%d/", systemID, raidID),
	}
	if params.Name != "" {
		updatedRAID.Name = params.Name
	}
	// m.raids[systemID][raidID] = updatedRAID
	return updatedRAID, nil
}
