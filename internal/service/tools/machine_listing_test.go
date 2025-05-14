package tools

import (
	"context"
	"errors"
	"fmt"
	"io"
	"testing"

	"github.com/canonical/gomaasclient/entity" // Added import
	"github.com/lspecian/maas-mcp-server/internal/logging"
	"github.com/lspecian/maas-mcp-server/internal/models"
	modelsmaas "github.com/lspecian/maas-mcp-server/internal/models/maas" // Correct import alias
	"github.com/lspecian/maas-mcp-server/internal/service"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockMachineClient is a mock type for the service.MachineClient interface
type MockMachineClient struct {
	mock.Mock
}

// ListMachines provides a mock function with given fields: ctx, filters, pagination
func (m *MockMachineClient) ListMachines(ctx context.Context, filters map[string]string, pagination *modelsmaas.PaginationOptions) ([]models.Machine, int, error) {
	args := m.Called(ctx, filters, pagination)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]models.Machine), args.Int(1), args.Error(2)
}

// ListMachinesSimple provides a mock function with given fields: ctx, filters
func (m *MockMachineClient) ListMachinesSimple(ctx context.Context, filters map[string]string) ([]models.Machine, error) {
	args := m.Called(ctx, filters)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.Machine), args.Error(1)
}

// GetMachine provides a mock function with given fields: systemID
func (m *MockMachineClient) GetMachine(systemID string) (*models.Machine, error) {
	args := m.Called(systemID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Machine), args.Error(1)
}

// GetMachineWithDetails provides a mock function with given fields: ctx, systemID, includeDetails
func (m *MockMachineClient) GetMachineWithDetails(ctx context.Context, systemID string, includeDetails bool) (*models.Machine, error) {
	args := m.Called(ctx, systemID, includeDetails)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Machine), args.Error(1)
}

// AllocateMachine provides a mock function with given fields: params
func (m *MockMachineClient) AllocateMachine(params *entity.MachineAllocateParams) (*models.Machine, error) {
	args := m.Called(params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Machine), args.Error(1)
}

// DeployMachine provides a mock function with given fields: systemID, params
func (m *MockMachineClient) DeployMachine(systemID string, params *entity.MachineDeployParams) (*models.Machine, error) {
	args := m.Called(systemID, params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Machine), args.Error(1)
}

// ReleaseMachine provides a mock function with given fields: systemIDs, comment
func (m *MockMachineClient) ReleaseMachine(systemIDs []string, comment string) error {
	args := m.Called(systemIDs, comment)
	return args.Error(0)
}

// PowerOnMachine provides a mock function with given fields: systemID
func (m *MockMachineClient) PowerOnMachine(systemID string) (*models.Machine, error) {
	args := m.Called(systemID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Machine), args.Error(1)
}

// PowerOffMachine provides a mock function with given fields: systemID
func (m *MockMachineClient) PowerOffMachine(systemID string) (*models.Machine, error) {
	args := m.Called(systemID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Machine), args.Error(1)
}

// CheckStorageConstraints provides a mock function with given fields: machine, constraints
func (m *MockMachineClient) CheckStorageConstraints(machine *models.Machine, constraints *models.SimpleStorageConstraint) bool {
	args := m.Called(machine, constraints)
	return args.Bool(0)
}

func TestListMachinesTool_Execute(t *testing.T) {
	log := logrus.New()
	log.SetOutput(io.Discard) // Don't print logs during tests
	enhancedLogger, _ := logging.NewEnhancedLogger(logging.LoggerConfig{Level: "error", Format: logging.LogFormatText})

	// mockClient := new(MockMachineClient) // This was unused as it's re-declared in the loop
	// Create a real MachineService instance, but with the mocked MachineClient
	// realMachineService := service.NewMachineService(mockClient, log) // This was unused as it's re-declared in the loop

	tests := []struct {
		name               string
		inputParams        *models.MachineListingRequest
		mockServiceReturn  *models.PaginatedMachines // This should be what MachineService.ListMachines returns
		mockClientReturn   []models.Machine          // This is what MockMachineClient.ListMachines returns
		mockClientTotal    int
		mockClientError    error
		expectedFilters    map[string]string
		expectedPagination *models.PaginationOptions // This is for the tool's internal logic for MachineService
		expectError        bool
		expectedErrorMsg   string
	}{
		{
			name: "Valid request without storage constraints",
			inputParams: &models.MachineListingRequest{
				Hostname: "test-host",
				Limit:    10,
				Page:     1,
			},
			// This is what the MachineService.ListMachines is expected to return
			mockServiceReturn: &models.PaginatedMachines{
				Machines:   []models.MachineContext{{ID: "sys1", Name: "test-host"}}, // Changed Hostname to Name
				TotalCount: 1,
				Limit:      10,
				Page:       1,
				PageCount:  1,
			},
			// These are for the underlying mockClient.ListMachines call
			mockClientReturn: []models.Machine{{SystemID: "sys1", Hostname: "test-host"}},
			mockClientTotal:  1,
			mockClientError:  nil,
			expectedFilters: map[string]string{ // Filters passed to MachineService
				"hostname": "test-host",
			},
			expectedPagination: &models.PaginationOptions{Limit: 10, Offset: 0, Page: 1},
			expectError:        false,
		},
		{
			name: "Valid request with storage constraints",
			inputParams: &models.MachineListingRequest{
				Zone: "zone-a",
				StorageConstraints: &models.SimpleStorageConstraint{
					MinSize:  100 * 1024 * 1024, // 100MB
					DiskType: "ssd",
					Count:    2,
				},
			},
			mockServiceReturn: &models.PaginatedMachines{ // What MachineService.ListMachines returns
				Machines:   []models.MachineContext{{ID: "sys2", Zone: "zone-a"}},
				TotalCount: 1, // Assuming one machine matches after filtering
				Limit:      50,
				Page:       1,
				PageCount:  1,
			},
			// Mocking the client to return a machine that would pass these constraints
			// The actual filtering logic is in MachineService, so the client might return more.
			// For this test, we assume the client returns machines, and the service filters them.
			// Or, if MAAS API supports these filters, the client would return filtered results.
			// The test for ListMachinesTool focuses on it passing params correctly.
			// The test for MachineService.ListMachines would test the filtering logic.
			mockClientReturn: []models.Machine{{SystemID: "sys2", Zone: "zone-a", BlockDevices: []models.BlockDevice{{Size: 200 * 1024 * 1024 /* Type: "ssd" - assuming type is part of BlockDevice or its sub-fields */}, {Size: 150 * 1024 * 1024 /* Type: "ssd" */}}}},
			mockClientTotal:  1, // Total from client before service-side filtering (if any)
			mockClientError:  nil,
			expectedFilters: map[string]string{ // Filters passed to MachineService by the Tool
				"zone":           "zone-a",
				"min_disk_size":  fmt.Sprintf("%d", 100*1024*1024),
				"disk_type":      "ssd",
				"min_disk_count": "2",
			},
			expectedPagination: &models.PaginationOptions{Limit: 50, Offset: 0, Page: 1},
			expectError:        false,
		},
		// Add more test cases, including error cases from the service
		{
			name:             "Invalid parameters type to tool",
			inputParams:      nil, // Will cause a cast error in the tool
			expectError:      true,
			expectedErrorMsg: "Invalid parameters type",
		},
		{
			name: "Tool receives error from MachineService",
			inputParams: &models.MachineListingRequest{
				Hostname: "test-error-service",
			},
			// mockServiceReturn is nil because an error is returned
			mockClientError: errors.New("maas client internal error"), // Error from the underlying client
			expectedFilters: map[string]string{
				"hostname": "test-error-service",
			},
			expectedPagination: &models.PaginationOptions{Limit: 50, Offset: 0, Page: 1},
			expectError:        true,
			// The error message will be mapped by service.mapClientError
			expectedErrorMsg: "MAAS client error: maas client internal error",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Re-initialize mocks for each test run
			mockClient := new(MockMachineClient)
			realMachineService := service.NewMachineService(mockClient, log)
			listMachinesTool := NewListMachinesTool(realMachineService, enhancedLogger)

			var paramsToPass interface{} = tc.inputParams
			if tc.name == "Invalid parameters type to tool" {
				paramsToPass = "this is not a MachineListingRequest"
			}

			// Setup mock expectation for the MachineClient.ListMachines call
			// This is called by the realMachineService
			if tc.expectedFilters != nil { // Only set expectation if we expect ListMachines to be called
				// The pagination passed to client might be *modelsmaas.PaginationOptions
				var expectedMaasPagination *modelsmaas.PaginationOptions
				if tc.expectedPagination != nil {
					expectedMaasPagination = &modelsmaas.PaginationOptions{
						Limit:  tc.expectedPagination.Limit,
						Offset: tc.expectedPagination.Offset,
						Page:   tc.expectedPagination.Page,
					}
				}
				mockClient.On("ListMachines", mock.Anything, tc.expectedFilters, expectedMaasPagination).
					Return(tc.mockClientReturn, tc.mockClientTotal, tc.mockClientError).Maybe()

				// If storage constraints are involved, MachineService might call CheckStorageConstraints
				if tc.inputParams != nil && tc.inputParams.StorageConstraints != nil && tc.mockClientReturn != nil {
					for i := range tc.mockClientReturn {
						// Decide what CheckStorageConstraints should return for each machine
						// For simplicity, assume it passes if mockClientError is nil
						shouldPass := tc.mockClientError == nil
						mockClient.On("CheckStorageConstraints", &tc.mockClientReturn[i], tc.inputParams.StorageConstraints).Return(shouldPass).Maybe()
					}
				}
			}

			result, err := listMachinesTool.Execute(context.Background(), paramsToPass)

			if tc.expectError {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tc.expectedErrorMsg)
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				// The result from the tool should match what the MachineService is expected to return
				assert.Equal(t, tc.mockServiceReturn, result.(*models.PaginatedMachines))
			}
			mockClient.AssertExpectations(t)
		})
	}
}
