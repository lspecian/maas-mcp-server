package service

import (
	"context"
	"errors"
	"testing"

	"github.com/canonical/gomaasclient/entity"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"

	"github.com/lspecian/maas-mcp-server/internal/models"
)

// MockMaasClient is a mock implementation of the MachineClient interface for testing
type MockMaasClient struct {
	ListMachinesFn    func(filters map[string]string) ([]models.Machine, error)
	GetMachineFn      func(systemID string) (*models.Machine, error)
	AllocateMachineFn func(params *entity.MachineAllocateParams) (*models.Machine, error)
	DeployMachineFn   func(systemID string, params *entity.MachineDeployParams) (*models.Machine, error)
	ReleaseMachineFn  func(systemIDs []string, comment string) error
}

// Ensure MockMaasClient implements MachineClient interface
var _ MachineClient = (*MockMaasClient)(nil)

// ListMachines implements the MachineClient interface
func (m *MockMaasClient) ListMachines(filters map[string]string) ([]models.Machine, error) {
	return m.ListMachinesFn(filters)
}

// GetMachine implements the MachineClient interface
func (m *MockMaasClient) GetMachine(systemID string) (*models.Machine, error) {
	return m.GetMachineFn(systemID)
}

// AllocateMachine implements the MachineClient interface
func (m *MockMaasClient) AllocateMachine(params *entity.MachineAllocateParams) (*models.Machine, error) {
	return m.AllocateMachineFn(params)
}

// DeployMachine implements the MachineClient interface
func (m *MockMaasClient) DeployMachine(systemID string, params *entity.MachineDeployParams) (*models.Machine, error) {
	return m.DeployMachineFn(systemID, params)
}

// ReleaseMachine implements the MachineClient interface
func (m *MockMaasClient) ReleaseMachine(systemIDs []string, comment string) error {
	return m.ReleaseMachineFn(systemIDs, comment)
}

// Helper function to create a test logger
func createTestLogger() *logrus.Logger {
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)
	return logger
}

// Helper function to create a test machine
func createTestMachine(id string) *models.Machine {
	return &models.Machine{
		SystemID:     id,
		Hostname:     "test-machine-" + id,
		FQDN:         "test-machine-" + id + ".maas",
		Status:       "Ready",
		StatusName:   "Ready",
		Architecture: "amd64/generic",
		PowerState:   "off",
		Zone:         "default",
		Pool:         "default",
		Tags:         []string{"test", "virtual"},
		CPUCount:     4,
		Memory:       8192,
		OSSystem:     "ubuntu",
		DistroSeries: "focal",
	}
}

// TestListMachines tests the ListMachines method
func TestListMachines(t *testing.T) {
	// Test case 1: Successful listing
	t.Run("Success", func(t *testing.T) {
		// Setup mock
		machines := []models.Machine{
			*createTestMachine("1"),
			*createTestMachine("2"),
		}

		mockClient := &MockMaasClient{
			ListMachinesFn: func(filters map[string]string) ([]models.Machine, error) {
				assert.Equal(t, "default", filters["zone"])
				return machines, nil
			},
		}

		logger := createTestLogger()
		service := NewMachineService(mockClient, logger)

		// Call service
		filters := map[string]string{"zone": "default"}
		result, err := service.ListMachines(context.Background(), filters)

		// Assertions
		assert.NoError(t, err)
		assert.Len(t, result, 2)
		assert.Equal(t, "1", result[0].ID)
		assert.Equal(t, "2", result[1].ID)
	})

	// Test case 2: Client error
	t.Run("ClientError", func(t *testing.T) {
		// Setup mock
		mockClient := &MockMaasClient{
			ListMachinesFn: func(filters map[string]string) ([]models.Machine, error) {
				return []models.Machine{}, errors.New("client error")
			},
		}

		logger := createTestLogger()
		service := NewMachineService(mockClient, logger)

		// Call service
		filters := map[string]string{"zone": "default"}
		result, err := service.ListMachines(context.Background(), filters)

		// Assertions
		assert.Error(t, err)
		assert.Empty(t, result)
	})
}

// TestGetMachine tests the GetMachine method
func TestGetMachine(t *testing.T) {
	// Test case 1: Successful retrieval
	t.Run("Success", func(t *testing.T) {
		// Setup mock
		machine := createTestMachine("1")
		mockClient := &MockMaasClient{
			GetMachineFn: func(systemID string) (*models.Machine, error) {
				assert.Equal(t, "1", systemID)
				return machine, nil
			},
		}

		logger := createTestLogger()
		service := NewMachineService(mockClient, logger)

		// Call service
		result, err := service.GetMachine(context.Background(), "1")

		// Assertions
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, "1", result.ID)
		assert.Equal(t, "test-machine-1", result.Name)
	})

	// Test case 2: Client error
	t.Run("ClientError", func(t *testing.T) {
		// Setup mock
		mockClient := &MockMaasClient{
			GetMachineFn: func(systemID string) (*models.Machine, error) {
				assert.Equal(t, "999", systemID)
				return nil, errors.New("not found")
			},
		}

		logger := createTestLogger()
		service := NewMachineService(mockClient, logger)

		// Call service
		result, err := service.GetMachine(context.Background(), "999")

		// Assertions
		assert.Error(t, err)
		assert.Nil(t, result)
	})

	// Test case 3: Empty ID
	t.Run("EmptyID", func(t *testing.T) {
		// Setup mock - should not be called
		mockClient := &MockMaasClient{}

		logger := createTestLogger()
		service := NewMachineService(mockClient, logger)

		// Call service
		result, err := service.GetMachine(context.Background(), "")

		// Assertions
		assert.Error(t, err)
		assert.Nil(t, result)
	})
}

// TestGetMachinePowerState tests the GetMachinePowerState method
func TestGetMachinePowerState(t *testing.T) {
	// Test case 1: Successful retrieval
	t.Run("Success", func(t *testing.T) {
		// Setup mock
		machine := createTestMachine("1")
		machine.PowerState = "on"
		mockClient := &MockMaasClient{
			GetMachineFn: func(systemID string) (*models.Machine, error) {
				assert.Equal(t, "1", systemID)
				return machine, nil
			},
		}

		logger := createTestLogger()
		service := NewMachineService(mockClient, logger)

		// Call service
		result, err := service.GetMachinePowerState(context.Background(), "1")

		// Assertions
		assert.NoError(t, err)
		assert.Equal(t, "on", result)
	})

	// Test case 2: Client error
	t.Run("ClientError", func(t *testing.T) {
		// Setup mock
		mockClient := &MockMaasClient{
			GetMachineFn: func(systemID string) (*models.Machine, error) {
				assert.Equal(t, "999", systemID)
				return nil, errors.New("not found")
			},
		}

		logger := createTestLogger()
		service := NewMachineService(mockClient, logger)

		// Call service
		result, err := service.GetMachinePowerState(context.Background(), "999")

		// Assertions
		assert.Error(t, err)
		assert.Empty(t, result)
	})

	// Test case 3: Empty ID
	t.Run("EmptyID", func(t *testing.T) {
		// Setup mock - should not be called
		mockClient := &MockMaasClient{}

		logger := createTestLogger()
		service := NewMachineService(mockClient, logger)

		// Call service
		result, err := service.GetMachinePowerState(context.Background(), "")

		// Assertions
		assert.Error(t, err)
		assert.Empty(t, result)
	})
}

// TestAllocateMachine tests the AllocateMachine method
func TestAllocateMachine(t *testing.T) {
	// Test case 1: Successful allocation
	t.Run("Success", func(t *testing.T) {
		// Setup mock
		machine := createTestMachine("1")
		mockClient := &MockMaasClient{
			AllocateMachineFn: func(params *entity.MachineAllocateParams) (*models.Machine, error) {
				// Verify params if needed
				return machine, nil
			},
		}

		logger := createTestLogger()
		service := NewMachineService(mockClient, logger)

		// Call service
		constraints := map[string]string{
			"architecture": "amd64/generic",
			"zone":         "default",
		}
		result, err := service.AllocateMachine(context.Background(), constraints)

		// Assertions
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, "1", result.ID)
	})

	// Test case 2: Client error
	t.Run("ClientError", func(t *testing.T) {
		// Setup mock
		mockClient := &MockMaasClient{
			AllocateMachineFn: func(params *entity.MachineAllocateParams) (*models.Machine, error) {
				return nil, errors.New("allocation failed")
			},
		}

		logger := createTestLogger()
		service := NewMachineService(mockClient, logger)

		// Call service
		constraints := map[string]string{
			"architecture": "invalid",
		}
		result, err := service.AllocateMachine(context.Background(), constraints)

		// Assertions
		assert.Error(t, err)
		assert.Nil(t, result)
	})
}

// TestDeployMachine tests the DeployMachine method
func TestDeployMachine(t *testing.T) {
	// Test case 1: Successful deployment
	t.Run("Success", func(t *testing.T) {
		// Setup mock
		machine := createTestMachine("1")
		machine.Status = "Deploying"
		machine.StatusName = "Deploying"
		mockClient := &MockMaasClient{
			DeployMachineFn: func(systemID string, params *entity.MachineDeployParams) (*models.Machine, error) {
				assert.Equal(t, "1", systemID)
				// Verify params if needed
				return machine, nil
			},
		}

		logger := createTestLogger()
		service := NewMachineService(mockClient, logger)

		// Call service
		osConfig := map[string]string{
			"distro_series": "focal",
			"user_data":     "#!/bin/bash\necho 'Hello World'",
		}
		result, err := service.DeployMachine(context.Background(), "1", osConfig)

		// Assertions
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, "1", result.ID)
	})

	// Test case 2: Client error
	t.Run("ClientError", func(t *testing.T) {
		// Setup mock
		mockClient := &MockMaasClient{
			DeployMachineFn: func(systemID string, params *entity.MachineDeployParams) (*models.Machine, error) {
				assert.Equal(t, "999", systemID)
				return nil, errors.New("deployment failed")
			},
		}

		logger := createTestLogger()
		service := NewMachineService(mockClient, logger)

		// Call service
		osConfig := map[string]string{
			"distro_series": "focal",
		}
		result, err := service.DeployMachine(context.Background(), "999", osConfig)

		// Assertions
		assert.Error(t, err)
		assert.Nil(t, result)
	})

	// Test case 3: Empty ID
	t.Run("EmptyID", func(t *testing.T) {
		// Setup mock - should not be called
		mockClient := &MockMaasClient{}

		logger := createTestLogger()
		service := NewMachineService(mockClient, logger)

		// Call service
		result, err := service.DeployMachine(context.Background(), "", map[string]string{})

		// Assertions
		assert.Error(t, err)
		assert.Nil(t, result)
	})
}

// TestReleaseMachine tests the ReleaseMachine method
func TestReleaseMachine(t *testing.T) {
	// Test case 1: Successful release
	t.Run("Success", func(t *testing.T) {
		// Setup mock
		mockClient := &MockMaasClient{
			ReleaseMachineFn: func(systemIDs []string, comment string) error {
				assert.Equal(t, []string{"1"}, systemIDs)
				assert.Equal(t, "Test release", comment)
				return nil
			},
		}

		logger := createTestLogger()
		service := NewMachineService(mockClient, logger)

		// Call service
		err := service.ReleaseMachine(context.Background(), "1", "Test release")

		// Assertions
		assert.NoError(t, err)
	})

	// Test case 2: Client error
	t.Run("ClientError", func(t *testing.T) {
		// Setup mock
		mockClient := &MockMaasClient{
			ReleaseMachineFn: func(systemIDs []string, comment string) error {
				assert.Equal(t, []string{"999"}, systemIDs)
				assert.Equal(t, "Test release", comment)
				return errors.New("release failed")
			},
		}

		logger := createTestLogger()
		service := NewMachineService(mockClient, logger)

		// Call service
		err := service.ReleaseMachine(context.Background(), "999", "Test release")

		// Assertions
		assert.Error(t, err)
	})

	// Test case 3: Empty ID
	t.Run("EmptyID", func(t *testing.T) {
		// Setup mock - should not be called
		mockClient := &MockMaasClient{}

		logger := createTestLogger()
		service := NewMachineService(mockClient, logger)

		// Call service
		err := service.ReleaseMachine(context.Background(), "", "Test release")

		// Assertions
		assert.Error(t, err)
	})
}
