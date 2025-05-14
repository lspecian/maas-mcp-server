package mock

import (
	"fmt"

	"github.com/lspecian/maas-mcp-server/internal/models"
)

// --- Mock StorageClient - Storage Constraint Operations ---

// SetStorageConstraints mock
func (m *MockMaasClient) SetStorageConstraints(systemID string, params models.StorageConstraintParams) error {
	if err := m.checkFailure("SetStorageConstraints"); err != nil {
		return err
	}
	m.mutex.Lock()
	defer m.mutex.Unlock()

	if _, ok := m.machines[systemID]; !ok {
		return fmt.Errorf("machine not found: %s", systemID)
	}
	// In a real mock, you might store these constraints: m.storageConstraints[systemID] = params
	m.logger.Infof("Mock SetStorageConstraints for %s: %+v", systemID, params)
	return nil
}

// GetStorageConstraints mock
func (m *MockMaasClient) GetStorageConstraints(systemID string) (*models.StorageConstraintParams, error) {
	if err := m.checkFailure("GetStorageConstraints"); err != nil {
		return nil, err
	}
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	if _, ok := m.machines[systemID]; !ok {
		return nil, fmt.Errorf("machine not found: %s", systemID)
	}
	// In a real mock, retrieve stored constraints: params, ok := m.storageConstraints[systemID]
	// Returning a dummy for now.
	m.logger.Infof("Mock GetStorageConstraints for %s", systemID)
	return &models.StorageConstraintParams{
		// Populate with some dummy constraint data if needed for tests
		Constraints: []models.StorageConstraint{
			{Type: "min_size", Value: "10G"},
		},
	}, nil
}

// ValidateStorageConstraints mock
func (m *MockMaasClient) ValidateStorageConstraints(systemID string, params models.StorageConstraintParams) (bool, []string, error) {
	if err := m.checkFailure("ValidateStorageConstraints"); err != nil {
		return false, nil, err
	}
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	if _, ok := m.machines[systemID]; !ok {
		return false, nil, fmt.Errorf("machine not found: %s", systemID)
	}
	// Mock validation logic. For now, assume valid if machine exists.
	m.logger.Infof("Mock ValidateStorageConstraints for %s: %+v. Returning true (valid).", systemID, params)
	return true, nil, nil // bool: isValid, []string: reasonsForInvalidity, error
}

// ApplyStorageConstraints mock
func (m *MockMaasClient) ApplyStorageConstraints(systemID string, params models.StorageConstraintParams) error {
	if err := m.checkFailure("ApplyStorageConstraints"); err != nil {
		return err
	}
	m.mutex.Lock()
	defer m.mutex.Unlock()

	if _, ok := m.machines[systemID]; !ok {
		return fmt.Errorf("machine not found: %s", systemID)
	}
	// Mock applying constraints.
	m.logger.Infof("Mock ApplyStorageConstraints for %s: %+v", systemID, params)
	return nil
}

// DeleteStorageConstraints mock
func (m *MockMaasClient) DeleteStorageConstraints(systemID string) error {
	if err := m.checkFailure("DeleteStorageConstraints"); err != nil {
		return err
	}
	m.mutex.Lock()
	defer m.mutex.Unlock()

	if _, ok := m.machines[systemID]; !ok {
		return fmt.Errorf("machine not found: %s", systemID)
	}
	// In a real mock, delete stored constraints: delete(m.storageConstraints, systemID)
	m.logger.Infof("Mock DeleteStorageConstraints for %s", systemID)
	return nil
}
