package machine

import (
	"context"
	"errors"
	"testing"

	"github.com/canonical/gomaasclient/entity"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"

	"github.com/lspecian/maas-mcp-server/internal/models"
	"github.com/lspecian/maas-mcp-server/internal/repository/machine"
)

// Helper function to create a test logger
func createTestLogger() *logrus.Logger {
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)
	return logger
}

// TestListMachines tests the ListMachines method
func TestListMachines(t *testing.T) {
	// Test case 1: Successful listing
	t.Run("Success", func(t *testing.T) {
		// Setup mock
		machines := []models.Machine{
			*machine.CreateTestMachine("1"),
			*machine.CreateTestMachine("2"),
		}

		mockRepo := &machine.MockRepository{
			ListMachinesFn: func(ctx context.Context, filters map[string]string) ([]models.Machine, error) {
				assert.Equal(t, "default", filters["zone"])
				return machines, nil
			},
		}

		logger := createTestLogger()
		service := NewService(mockRepo, logger)

		// Call service
		filters := map[string]string{"zone": "default"}
		result, err := service.ListMachines(context.Background(), filters)

		// Assertions
		assert.NoError(t, err)
		assert.Len(t, result, 2)
		assert.Equal(t, "1", result[0].ID)
		assert.Equal(t, "2", result[1].ID)
	})

	// Test case 2: Repository error
	t.Run("RepositoryError", func(t *testing.T) {
		// Setup mock
		mockRepo := &machine.MockRepository{
			ListMachinesFn: func(ctx context.Context, filters map[string]string) ([]models.Machine, error) {
				return []models.Machine{}, errors.New("repository error")
			},
		}

		logger := createTestLogger()
		service := NewService(mockRepo, logger)

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
		testMachine := machine.CreateTestMachine("1")
		mockRepo := &machine.MockRepository{
			GetMachineFn: func(ctx context.Context, systemID string) (*models.Machine, error) {
				assert.Equal(t, "1", systemID)
				return testMachine, nil
			},
		}

		logger := createTestLogger()
		service := NewService(mockRepo, logger)

		// Call service
		result, err := service.GetMachine(context.Background(), "1")

		// Assertions
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, "1", result.ID)
		assert.Equal(t, "test-machine-1", result.Name)
	})

	// Test case 2: Repository error
	t.Run("RepositoryError", func(t *testing.T) {
		// Setup mock
		mockRepo := &machine.MockRepository{
			GetMachineFn: func(ctx context.Context, systemID string) (*models.Machine, error) {
				assert.Equal(t, "999", systemID)
				return nil, errors.New("not found")
			},
		}

		logger := createTestLogger()
		service := NewService(mockRepo, logger)

		// Call service
		result, err := service.GetMachine(context.Background(), "999")

		// Assertions
		assert.Error(t, err)
		assert.Nil(t, result)
	})

	// Test case 3: Empty ID
	t.Run("EmptyID", func(t *testing.T) {
		// Setup mock - should not be called
		mockRepo := &machine.MockRepository{}

		logger := createTestLogger()
		service := NewService(mockRepo, logger)

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
		testMachine := machine.CreateTestMachine("1")
		testMachine.PowerState = "on"
		mockRepo := &machine.MockRepository{
			GetMachineFn: func(ctx context.Context, systemID string) (*models.Machine, error) {
				assert.Equal(t, "1", systemID)
				return testMachine, nil
			},
		}

		logger := createTestLogger()
		service := NewService(mockRepo, logger)

		// Call service
		result, err := service.GetMachinePowerState(context.Background(), "1")

		// Assertions
		assert.NoError(t, err)
		assert.Equal(t, "on", result)
	})

	// Test case 2: Repository error
	t.Run("RepositoryError", func(t *testing.T) {
		// Setup mock
		mockRepo := &machine.MockRepository{
			GetMachineFn: func(ctx context.Context, systemID string) (*models.Machine, error) {
				assert.Equal(t, "999", systemID)
				return nil, errors.New("not found")
			},
		}

		logger := createTestLogger()
		service := NewService(mockRepo, logger)

		// Call service
		result, err := service.GetMachinePowerState(context.Background(), "999")

		// Assertions
		assert.Error(t, err)
		assert.Empty(t, result)
	})

	// Test case 3: Empty ID
	t.Run("EmptyID", func(t *testing.T) {
		// Setup mock - should not be called
		mockRepo := &machine.MockRepository{}

		logger := createTestLogger()
		service := NewService(mockRepo, logger)

		// Call service
		result, err := service.GetMachinePowerState(context.Background(), "")

		// Assertions
		assert.Error(t, err)
		assert.Empty(t, result)
	})
}

// TestPowerOnMachine tests the PowerOnMachine method
func TestPowerOnMachine(t *testing.T) {
	// Test case 1: Successful power on
	t.Run("Success", func(t *testing.T) {
		// Setup mock
		testMachine := machine.CreateTestMachine("1")
		testMachine.PowerState = "on"
		mockRepo := &machine.MockRepository{
			PowerOnMachineFn: func(ctx context.Context, systemID string) (*models.Machine, error) {
				assert.Equal(t, "1", systemID)
				return testMachine, nil
			},
		}

		logger := createTestLogger()
		service := NewService(mockRepo, logger)

		// Call service
		result, err := service.PowerOnMachine(context.Background(), "1")

		// Assertions
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, "1", result.ID)
		assert.Equal(t, "on", result.PowerState)
	})

	// Test case 2: Repository error
	t.Run("RepositoryError", func(t *testing.T) {
		// Setup mock
		mockRepo := &machine.MockRepository{
			PowerOnMachineFn: func(ctx context.Context, systemID string) (*models.Machine, error) {
				assert.Equal(t, "999", systemID)
				return nil, errors.New("not found")
			},
		}

		logger := createTestLogger()
		service := NewService(mockRepo, logger)

		// Call service
		result, err := service.PowerOnMachine(context.Background(), "999")

		// Assertions
		assert.Error(t, err)
		assert.Nil(t, result)
	})

	// Test case 3: Empty ID
	t.Run("EmptyID", func(t *testing.T) {
		// Setup mock - should not be called
		mockRepo := &machine.MockRepository{}

		logger := createTestLogger()
		service := NewService(mockRepo, logger)

		// Call service
		result, err := service.PowerOnMachine(context.Background(), "")

		// Assertions
		assert.Error(t, err)
		assert.Nil(t, result)
	})
}

// TestPowerOffMachine tests the PowerOffMachine method
func TestPowerOffMachine(t *testing.T) {
	// Test case 1: Successful power off
	t.Run("Success", func(t *testing.T) {
		// Setup mock
		testMachine := machine.CreateTestMachine("1")
		testMachine.PowerState = "off"
		mockRepo := &machine.MockRepository{
			PowerOffMachineFn: func(ctx context.Context, systemID string) (*models.Machine, error) {
				assert.Equal(t, "1", systemID)
				return testMachine, nil
			},
		}

		logger := createTestLogger()
		service := NewService(mockRepo, logger)

		// Call service
		result, err := service.PowerOffMachine(context.Background(), "1")

		// Assertions
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, "1", result.ID)
		assert.Equal(t, "off", result.PowerState)
	})

	// Test case 2: Repository error
	t.Run("RepositoryError", func(t *testing.T) {
		// Setup mock
		mockRepo := &machine.MockRepository{
			PowerOffMachineFn: func(ctx context.Context, systemID string) (*models.Machine, error) {
				assert.Equal(t, "999", systemID)
				return nil, errors.New("not found")
			},
		}

		logger := createTestLogger()
		service := NewService(mockRepo, logger)

		// Call service
		result, err := service.PowerOffMachine(context.Background(), "999")

		// Assertions
		assert.Error(t, err)
		assert.Nil(t, result)
	})

	// Test case 3: Empty ID
	t.Run("EmptyID", func(t *testing.T) {
		// Setup mock - should not be called
		mockRepo := &machine.MockRepository{}

		logger := createTestLogger()
		service := NewService(mockRepo, logger)

		// Call service
		result, err := service.PowerOffMachine(context.Background(), "")

		// Assertions
		assert.Error(t, err)
		assert.Nil(t, result)
	})
}

// TestAllocateMachine tests the AllocateMachine method
func TestAllocateMachine(t *testing.T) {
	// Test case 1: Successful allocation
	t.Run("Success", func(t *testing.T) {
		// Setup mock
		testMachine := machine.CreateTestMachine("1")
		mockRepo := &machine.MockRepository{
			AllocateMachineFn: func(ctx context.Context, params *entity.MachineAllocateParams) (*models.Machine, error) {
				// Verify params if needed
				return testMachine, nil
			},
		}

		logger := createTestLogger()
		service := NewService(mockRepo, logger)

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

	// Test case 2: Repository error
	t.Run("RepositoryError", func(t *testing.T) {
		// Setup mock
		mockRepo := &machine.MockRepository{
			AllocateMachineFn: func(ctx context.Context, params *entity.MachineAllocateParams) (*models.Machine, error) {
				return nil, errors.New("allocation failed")
			},
		}

		logger := createTestLogger()
		service := NewService(mockRepo, logger)

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
		testMachine := machine.CreateTestMachine("1")
		testMachine.Status = "7" // Deploying
		testMachine.StatusName = "Deploying"
		mockRepo := &machine.MockRepository{
			DeployMachineFn: func(ctx context.Context, systemID string, params *entity.MachineDeployParams) (*models.Machine, error) {
				assert.Equal(t, "1", systemID)
				// Verify params if needed
				return testMachine, nil
			},
		}

		logger := createTestLogger()
		service := NewService(mockRepo, logger)

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

	// Test case 2: Repository error
	t.Run("RepositoryError", func(t *testing.T) {
		// Setup mock
		mockRepo := &machine.MockRepository{
			DeployMachineFn: func(ctx context.Context, systemID string, params *entity.MachineDeployParams) (*models.Machine, error) {
				assert.Equal(t, "999", systemID)
				return nil, errors.New("deployment failed")
			},
		}

		logger := createTestLogger()
		service := NewService(mockRepo, logger)

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
		mockRepo := &machine.MockRepository{}

		logger := createTestLogger()
		service := NewService(mockRepo, logger)

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
		mockRepo := &machine.MockRepository{
			ReleaseMachineFn: func(ctx context.Context, systemIDs []string, comment string) error {
				assert.Equal(t, []string{"1"}, systemIDs)
				assert.Equal(t, "Test release", comment)
				return nil
			},
		}

		logger := createTestLogger()
		service := NewService(mockRepo, logger)

		// Call service
		err := service.ReleaseMachine(context.Background(), "1", "Test release")

		// Assertions
		assert.NoError(t, err)
	})

	// Test case 2: Repository error
	t.Run("RepositoryError", func(t *testing.T) {
		// Setup mock
		mockRepo := &machine.MockRepository{
			ReleaseMachineFn: func(ctx context.Context, systemIDs []string, comment string) error {
				assert.Equal(t, []string{"999"}, systemIDs)
				assert.Equal(t, "Test release", comment)
				return errors.New("release failed")
			},
		}

		logger := createTestLogger()
		service := NewService(mockRepo, logger)

		// Call service
		err := service.ReleaseMachine(context.Background(), "999", "Test release")

		// Assertions
		assert.Error(t, err)
	})

	// Test case 3: Empty ID
	t.Run("EmptyID", func(t *testing.T) {
		// Setup mock - should not be called
		mockRepo := &machine.MockRepository{}

		logger := createTestLogger()
		service := NewService(mockRepo, logger)

		// Call service
		err := service.ReleaseMachine(context.Background(), "", "Test release")

		// Assertions
		assert.Error(t, err)
	})
}
