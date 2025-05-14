package service

import (
	"context"
	"errors"
	"strconv"
	"testing"

	"github.com/canonical/gomaasclient/entity"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"

	"github.com/lspecian/maas-mcp-server/internal/models"
	"github.com/lspecian/maas-mcp-server/internal/models/maas"
)

// MockMaasClient is a mock implementation of the MachineClient interface for testing
type MockMaasClient struct {
	ListMachinesFn            func(ctx context.Context, filters map[string]string, pagination *maas.PaginationOptions) ([]models.Machine, int, error)
	ListMachinesSimpleFn      func(ctx context.Context, filters map[string]string) ([]models.Machine, error)
	GetMachineFn              func(systemID string) (*models.Machine, error)
	GetMachineWithDetailsFn   func(ctx context.Context, systemID string, includeDetails bool) (*models.Machine, error)
	AllocateMachineFn         func(params *entity.MachineAllocateParams) (*models.Machine, error)
	DeployMachineFn           func(systemID string, params *entity.MachineDeployParams) (*models.Machine, error)
	ReleaseMachineFn          func(systemIDs []string, comment string) error
	PowerOnMachineFn          func(systemID string) (*models.Machine, error)
	PowerOffMachineFn         func(systemID string) (*models.Machine, error)
	CheckStorageConstraintsFn func(machine *models.Machine, constraints *models.SimpleStorageConstraint) bool
}

// Ensure MockMaasClient implements MachineClient interface
// var _ MachineClient = (*MockMaasClient)(nil)

// ListMachines implements the MachineClient interface
func (m *MockMaasClient) ListMachines(ctx context.Context, filters map[string]string, pagination *maas.PaginationOptions) ([]models.Machine, int, error) {
	if m.ListMachinesFn != nil {
		return m.ListMachinesFn(ctx, filters, pagination)
	}
	// Default implementation returns empty list and count
	return []models.Machine{}, 0, nil
}

// ListMachinesSimple implements the MachineClient interface
func (m *MockMaasClient) ListMachinesSimple(ctx context.Context, filters map[string]string) ([]models.Machine, error) {
	if m.ListMachinesSimpleFn != nil {
		return m.ListMachinesSimpleFn(ctx, filters)
	}
	// Default implementation returns empty list
	return []models.Machine{}, nil
}

// GetMachine implements the MachineClient interface
func (m *MockMaasClient) GetMachine(systemID string) (*models.Machine, error) {
	if m.GetMachineFn != nil {
		return m.GetMachineFn(systemID)
	}
	return nil, nil
}

// GetMachineWithDetails implements the MachineClient interface
func (m *MockMaasClient) GetMachineWithDetails(ctx context.Context, systemID string, includeDetails bool) (*models.Machine, error) {
	if m.GetMachineWithDetailsFn != nil {
		return m.GetMachineWithDetailsFn(ctx, systemID, includeDetails)
	}
	// Default implementation calls GetMachine
	return m.GetMachine(systemID)
}

// AllocateMachine implements the MachineClient interface
func (m *MockMaasClient) AllocateMachine(params *entity.MachineAllocateParams) (*models.Machine, error) {
	if m.AllocateMachineFn != nil {
		return m.AllocateMachineFn(params)
	}
	return nil, nil
}

// DeployMachine implements the MachineClient interface
func (m *MockMaasClient) DeployMachine(systemID string, params *entity.MachineDeployParams) (*models.Machine, error) {
	if m.DeployMachineFn != nil {
		return m.DeployMachineFn(systemID, params)
	}
	return nil, nil
}

// ReleaseMachine implements the MachineClient interface
func (m *MockMaasClient) ReleaseMachine(systemIDs []string, comment string) error {
	if m.ReleaseMachineFn != nil {
		return m.ReleaseMachineFn(systemIDs, comment)
	}
	return nil
}

// PowerOnMachine implements the MachineClient interface
func (m *MockMaasClient) PowerOnMachine(systemID string) (*models.Machine, error) {
	if m.PowerOnMachineFn != nil {
		return m.PowerOnMachineFn(systemID)
	}
	return nil, nil
}

// PowerOffMachine implements the MachineClient interface
func (m *MockMaasClient) PowerOffMachine(systemID string) (*models.Machine, error) {
	if m.PowerOffMachineFn != nil {
		return m.PowerOffMachineFn(systemID)
	}
	return nil, nil
}

// CheckStorageConstraints implements the MachineClient interface
func (m *MockMaasClient) CheckStorageConstraints(machine *models.Machine, constraints *models.SimpleStorageConstraint) bool {
	if m.CheckStorageConstraintsFn != nil {
		return m.CheckStorageConstraintsFn(machine, constraints)
	}
	// Default mock behavior: pass all constraints if no specific function is set
	return true
}

func TestListMachines(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		// Setup test data
		filters := map[string]string{"hostname": "test"}

		// Setup mock
		mockClient := &MockMaasClient{
			ListMachinesSimpleFn: func(ctx context.Context, filters map[string]string) ([]models.Machine, error) {
				return []models.Machine{
					{SystemID: "1", Hostname: "machine1"},
					{SystemID: "2", Hostname: "machine2"},
				}, nil
			},
		}
		logger := logrus.New()
		service := NewMachineService(mockClient, logger)

		// Call the service
		result, err := service.ListMachines(context.Background(), filters)

		// Assert results
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Len(t, result, 2)
		assert.Equal(t, "1", result[0].ID)
		assert.Equal(t, "2", result[1].ID)
	})

	t.Run("error", func(t *testing.T) {
		// Setup test data
		filters := map[string]string{"hostname": "test"}

		// Setup mock
		mockClient := &MockMaasClient{
			ListMachinesSimpleFn: func(ctx context.Context, filters map[string]string) ([]models.Machine, error) {
				return nil, errors.New("MAAS API error")
			},
		}
		logger := logrus.New()
		service := NewMachineService(mockClient, logger)

		// Call the service
		result, err := service.ListMachines(context.Background(), filters)

		// Assert results
		assert.Error(t, err)
		assert.Nil(t, result)
	})
}

func TestGetMachine(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		// Setup mock
		mockClient := &MockMaasClient{
			GetMachineWithDetailsFn: func(ctx context.Context, systemID string, includeDetails bool) (*models.Machine, error) {
				return &models.Machine{SystemID: "1", Hostname: "machine1"}, nil
			},
		}
		logger := logrus.New()
		service := NewMachineService(mockClient, logger)

		// Call the service
		result, err := service.GetMachine(context.Background(), "1")

		// Assert results
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, "1", result.ID)
	})

	t.Run("not found", func(t *testing.T) {
		// Setup mock
		mockClient := &MockMaasClient{
			GetMachineWithDetailsFn: func(ctx context.Context, systemID string, includeDetails bool) (*models.Machine, error) {
				return nil, errors.New("machine not found")
			},
		}
		logger := logrus.New()
		service := NewMachineService(mockClient, logger)

		// Call the service
		result, err := service.GetMachine(context.Background(), "999")

		// Assert results
		assert.Error(t, err)
		assert.Nil(t, result)
	})

	t.Run("invalid id", func(t *testing.T) {
		// Setup mock
		mockClient := &MockMaasClient{}
		logger := logrus.New()
		service := NewMachineService(mockClient, logger)

		// Call the service
		result, err := service.GetMachine(context.Background(), "")

		// Assert results
		assert.Error(t, err)
		assert.Nil(t, result)
	})
}

func TestAllocateMachine(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		// Setup test data
		constraints := map[string]string{"cpu_count": "2"}

		// Setup mock
		mockClient := &MockMaasClient{
			AllocateMachineFn: func(params *entity.MachineAllocateParams) (*models.Machine, error) {
				return &models.Machine{SystemID: "1", Hostname: "machine1"}, nil
			},
		}
		logger := logrus.New()
		service := NewMachineService(mockClient, logger)

		// Call the service
		result, err := service.AllocateMachine(context.Background(), constraints)

		// Assert results
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, "1", result.ID)
	})

	t.Run("error", func(t *testing.T) {
		// Setup test data
		constraints := map[string]string{"cpu_count": "2"}

		// Setup mock
		mockClient := &MockMaasClient{
			AllocateMachineFn: func(params *entity.MachineAllocateParams) (*models.Machine, error) {
				return nil, errors.New("allocation failed")
			},
		}
		logger := logrus.New()
		service := NewMachineService(mockClient, logger)

		// Call the service
		result, err := service.AllocateMachine(context.Background(), constraints)

		// Assert results
		assert.Error(t, err)
		assert.Nil(t, result)
	})
}

func TestDeployMachine(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		// Setup test data
		osConfig := map[string]string{"distro_series": "focal"}

		// Setup mock
		mockClient := &MockMaasClient{
			DeployMachineFn: func(systemID string, params *entity.MachineDeployParams) (*models.Machine, error) {
				return &models.Machine{SystemID: "1", Hostname: "machine1"}, nil
			},
		}
		logger := logrus.New()
		service := NewMachineService(mockClient, logger)

		// Call the service
		result, err := service.DeployMachine(context.Background(), "1", osConfig)

		// Assert results
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, "1", result.ID)
	})

	t.Run("error", func(t *testing.T) {
		// Setup test data
		osConfig := map[string]string{"distro_series": "focal"}

		// Setup mock
		mockClient := &MockMaasClient{
			DeployMachineFn: func(systemID string, params *entity.MachineDeployParams) (*models.Machine, error) {
				return nil, errors.New("deployment failed")
			},
		}
		logger := logrus.New()
		service := NewMachineService(mockClient, logger)

		// Call the service
		result, err := service.DeployMachine(context.Background(), "1", osConfig)

		// Assert results
		assert.Error(t, err)
		assert.Nil(t, result)
	})

	t.Run("invalid id", func(t *testing.T) {
		// Setup test data
		osConfig := map[string]string{"distro_series": "focal"}

		// Setup mock
		mockClient := &MockMaasClient{}
		logger := logrus.New()
		service := NewMachineService(mockClient, logger)

		// Call the service
		result, err := service.DeployMachine(context.Background(), "", osConfig)

		// Assert results
		assert.Error(t, err)
		assert.Nil(t, result)
	})
}

func TestReleaseMachine(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		// Setup mock
		mockClient := &MockMaasClient{
			ReleaseMachineFn: func(systemIDs []string, comment string) error {
				return nil
			},
		}
		logger := logrus.New()
		service := NewMachineService(mockClient, logger)

		// Call the service
		err := service.ReleaseMachine(context.Background(), "1", "test comment")

		// Assert results
		assert.NoError(t, err)
	})

	t.Run("error", func(t *testing.T) {
		// Setup mock
		mockClient := &MockMaasClient{
			ReleaseMachineFn: func(systemIDs []string, comment string) error {
				return errors.New("release failed")
			},
		}
		logger := logrus.New()
		service := NewMachineService(mockClient, logger)

		// Call the service
		err := service.ReleaseMachine(context.Background(), "1", "test comment")

		// Assert results
		assert.Error(t, err)
	})

	t.Run("invalid id", func(t *testing.T) {
		// Setup mock
		mockClient := &MockMaasClient{}
		logger := logrus.New()
		service := NewMachineService(mockClient, logger)

		// Call the service
		err := service.ReleaseMachine(context.Background(), "", "test comment")

		// Assert results
		assert.Error(t, err)
	})
}

func TestListMachines_WithStorageConstraints(t *testing.T) {
	logger := logrus.New()
	// logger.SetOutput(io.Discard) // Optional: suppress log output during tests

	machine1 := models.Machine{
		SystemID: "sys1", Hostname: "machine1", Zone: "zone-a",
		BlockDevices: []models.BlockDevice{
			{ID: 1, Name: "sda", Size: 250 * 1024 * 1024 * 1024, Type: "ssd"}, // 250GB SSD
			{ID: 2, Name: "sdb", Size: 500 * 1024 * 1024 * 1024, Type: "hdd"}, // 500GB HDD
		},
	}
	machine2 := models.Machine{
		SystemID: "sys2", Hostname: "machine2", Zone: "zone-b",
		BlockDevices: []models.BlockDevice{
			{ID: 3, Name: "sda", Size: 100 * 1024 * 1024 * 1024, Type: "ssd"}, // 100GB SSD
		},
	}
	machine3 := models.Machine{ // Meets count but not individual size/type for some tests
		SystemID: "sys3", Hostname: "machine3", Zone: "zone-a",
		BlockDevices: []models.BlockDevice{
			{ID: 4, Name: "sda", Size: 50 * 1024 * 1024 * 1024, Type: "hdd"}, // 50GB HDD
			{ID: 5, Name: "sdb", Size: 60 * 1024 * 1024 * 1024, Type: "hdd"}, // 60GB HDD
			{ID: 6, Name: "sdc", Size: 70 * 1024 * 1024 * 1024, Type: "ssd"}, // 70GB SSD
		},
	}

	allMachines := []models.Machine{machine1, machine2, machine3}

	tests := []struct {
		name                      string
		filters                   map[string]string
		pagination                *models.PaginationOptions
		mockListMachinesReturn    []models.Machine
		mockListMachinesTotal     int
		mockListMachinesError     error
		mockCheckConstraintsSetup func(mockClient *MockMaasClient, constraints *models.SimpleStorageConstraint)
		expectedResultCount       int
		expectedMachineIDs        []string
		expectError               bool
	}{
		{
			name:                   "Filter by min_disk_size and disk_type, count - machine1 passes",
			filters:                map[string]string{"min_disk_size": "200000000000", "disk_type": "ssd", "min_disk_count": "1"}, // 200GB
			pagination:             &models.PaginationOptions{Limit: 10, Page: 1},
			mockListMachinesReturn: allMachines,
			mockListMachinesTotal:  len(allMachines),
			mockCheckConstraintsSetup: func(mockClient *MockMaasClient, constraints *models.SimpleStorageConstraint) {
				mockClient.CheckStorageConstraintsFn = func(m *models.Machine, c *models.SimpleStorageConstraint) bool {
					if m.SystemID == "sys1" { // sda is 250GB SSD
						return true
					}
					return false
				}
			},
			expectedResultCount: 1,
			expectedMachineIDs:  []string{"sys1"},
		},
		{
			name:                   "Filter by min_disk_count - machine1 and machine3 pass",
			filters:                map[string]string{"min_disk_count": "2"},
			pagination:             &models.PaginationOptions{Limit: 10, Page: 1},
			mockListMachinesReturn: allMachines,
			mockListMachinesTotal:  len(allMachines),
			mockCheckConstraintsSetup: func(mockClient *MockMaasClient, constraints *models.SimpleStorageConstraint) {
				mockClient.CheckStorageConstraintsFn = func(m *models.Machine, c *models.SimpleStorageConstraint) bool {
					return len(m.BlockDevices) >= c.Count
				}
			},
			expectedResultCount: 2,
			expectedMachineIDs:  []string{"sys1", "sys3"},
		},
		{
			name:                   "Filter by disk_type hdd - machine1 and machine3 have hdd",
			filters:                map[string]string{"disk_type": "hdd"},
			pagination:             &models.PaginationOptions{Limit: 10, Page: 1},
			mockListMachinesReturn: allMachines,
			mockListMachinesTotal:  len(allMachines),
			mockCheckConstraintsSetup: func(mockClient *MockMaasClient, constraints *models.SimpleStorageConstraint) {
				mockClient.CheckStorageConstraintsFn = func(m *models.Machine, c *models.SimpleStorageConstraint) bool {
					for _, bd := range m.BlockDevices {
						if bd.Type == c.DiskType {
							return true
						}
					}
					return false
				}
			},
			expectedResultCount: 2,
			expectedMachineIDs:  []string{"sys1", "sys3"},
		},
		{
			name:                   "No matching machines",
			filters:                map[string]string{"min_disk_size": "1000000000000"}, // 1TB
			pagination:             &models.PaginationOptions{Limit: 10, Page: 1},
			mockListMachinesReturn: allMachines,
			mockListMachinesTotal:  len(allMachines),
			mockCheckConstraintsSetup: func(mockClient *MockMaasClient, constraints *models.SimpleStorageConstraint) {
				mockClient.CheckStorageConstraintsFn = func(m *models.Machine, c *models.SimpleStorageConstraint) bool {
					return false // Simulate no machine passes
				}
			},
			expectedResultCount: 0,
			expectedMachineIDs:  []string{},
		},
		{
			name:                  "MAAS client returns error",
			filters:               map[string]string{"min_disk_count": "1"},
			pagination:            &models.PaginationOptions{Limit: 10, Page: 1},
			mockListMachinesError: errors.New("maas api error"),
			expectError:           true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			mockClient := &MockMaasClient{}
			mockClient.ListMachinesFn = func(ctx context.Context, f map[string]string, p *maas.PaginationOptions) ([]models.Machine, int, error) {
				// The filters passed to ListMachines in MachineService won't include the parsed storage constraints directly
				// It will include min_disk_size, disk_type, min_disk_count as strings
				// We are testing the MachineService's ability to parse these and use CheckStorageConstraints
				return tc.mockListMachinesReturn, tc.mockListMachinesTotal, tc.mockListMachinesError
			}

			// Setup the CheckStorageConstraintsFn based on the test case
			// This mock is crucial for testing the filtering logic within MachineService.ListMachines
			var parsedConstraints *models.SimpleStorageConstraint
			if minSizeStr, ok := tc.filters["min_disk_size"]; ok {
				if parsedConstraints == nil {
					parsedConstraints = &models.SimpleStorageConstraint{}
				}
				minSize, _ := strconv.ParseInt(minSizeStr, 10, 64)
				parsedConstraints.MinSize = minSize
			}
			if diskType, ok := tc.filters["disk_type"]; ok {
				if parsedConstraints == nil {
					parsedConstraints = &models.SimpleStorageConstraint{}
				}
				parsedConstraints.DiskType = diskType
			}
			if minDiskCountStr, ok := tc.filters["min_disk_count"]; ok {
				if parsedConstraints == nil {
					parsedConstraints = &models.SimpleStorageConstraint{}
				}
				minDiskCount, _ := strconv.Atoi(minDiskCountStr)
				parsedConstraints.Count = minDiskCount
			}
			if tc.mockCheckConstraintsSetup != nil {
				tc.mockCheckConstraintsSetup(mockClient, parsedConstraints)
			} else {
				// Default pass if no specific setup
				mockClient.CheckStorageConstraintsFn = func(m *models.Machine, c *models.SimpleStorageConstraint) bool { return true }
			}

			service := NewMachineService(mockClient, logger)
			result, err := service.ListMachinesPaginated(context.Background(), tc.filters, tc.pagination)

			if tc.expectError {
				assert.Error(t, err)
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.Len(t, result.Machines, tc.expectedResultCount)

				resultMachineIDs := make([]string, len(result.Machines))
				for i, m := range result.Machines {
					resultMachineIDs[i] = m.ID
				}
				assert.ElementsMatch(t, tc.expectedMachineIDs, resultMachineIDs)
				// TotalCount from ListMachinesPaginated refers to MAAS total before in-service filtering.
				// Assert against the mockListMachinesTotal which represents the pre-filter count from MAAS.
				assert.Equal(t, tc.mockListMachinesTotal, result.TotalCount)
			}
		})
	}
}
