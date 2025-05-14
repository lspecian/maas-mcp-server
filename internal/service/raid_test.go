package service

import (
	"context"
	"errors"
	"testing"

	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/lspecian/maas-mcp-server/internal/models"
)

// Add RAID-related methods to the MockStorageClient
func (m *MockStorageClient) CreateRAID(systemID string, params models.RAIDParams) (*models.RAID, error) {
	args := m.Called(systemID, params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.RAID), args.Error(1)
}

func (m *MockStorageClient) DeleteRAID(systemID string, raidID int) error {
	args := m.Called(systemID, raidID)
	return args.Error(0)
}

func (m *MockStorageClient) GetRAID(systemID string, raidID int) (*models.RAID, error) {
	args := m.Called(systemID, raidID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.RAID), args.Error(1)
}

func (m *MockStorageClient) ListRAIDs(systemID string) ([]models.RAID, error) {
	args := m.Called(systemID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.RAID), args.Error(1)
}

func (m *MockStorageClient) UpdateRAID(systemID string, raidID int, params models.RAIDUpdateParams) (*models.RAID, error) {
	args := m.Called(systemID, raidID, params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.RAID), args.Error(1)
}

func TestCreateRAID(t *testing.T) {
	// Setup
	mockClient := new(MockStorageClient)
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)
	service := NewStorageService(mockClient, logger)
	ctx := context.Background()

	// Test cases
	tests := []struct {
		name      string
		machineID string
		params    models.RAIDParams
		mockSetup func()
		wantErr   bool
		errMsg    string
	}{
		{
			name:      "Valid RAID creation",
			machineID: "abc123",
			params: models.RAIDParams{
				Name:         "test-raid",
				Level:        models.RAID1,
				BlockDevices: []int{1, 2},
			},
			mockSetup: func() {
				mockClient.On("CreateRAID", "abc123", mock.Anything).Return(&models.RAID{
					ID:           1,
					Name:         "test-raid",
					Level:        models.RAID1,
					BlockDevices: []int{1, 2},
				}, nil)
			},
			wantErr: false,
		},
		{
			name:      "Empty machine ID",
			machineID: "",
			params: models.RAIDParams{
				Name:         "test-raid",
				Level:        models.RAID1,
				BlockDevices: []int{1, 2},
			},
			mockSetup: func() {
				// No mock setup needed as it should fail before calling the client
			},
			wantErr: true,
			errMsg:  "Machine ID is required",
		},
		{
			name:      "Invalid RAID params",
			machineID: "abc123",
			params: models.RAIDParams{
				// Missing name and level
				BlockDevices: []int{1, 2},
			},
			mockSetup: func() {
				// No mock setup needed as it should fail before calling the client
			},
			wantErr: true,
			errMsg:  "Invalid RAID parameters",
		},
		{
			name:      "Client error",
			machineID: "abc123",
			params: models.RAIDParams{
				Name:         "test-raid",
				Level:        models.RAID1,
				BlockDevices: []int{1, 2},
			},
			mockSetup: func() {
				mockClient.On("CreateRAID", "abc123", mock.Anything).Return(nil, errors.New("client error"))
			},
			wantErr: true,
			errMsg:  "client error",
		},
	}

	// Run tests
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup mocks
			mockClient.ExpectedCalls = nil
			tt.mockSetup()

			// Call the service
			result, err := service.CreateRAID(ctx, tt.machineID, tt.params)

			// Check results
			if tt.wantErr {
				assert.Error(t, err)
				if tt.errMsg != "" {
					assert.Contains(t, err.Error(), tt.errMsg)
				}
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.Equal(t, tt.params.Name, result.Name)
				assert.Equal(t, string(tt.params.Level), result.Level)
			}

			// Verify mocks
			mockClient.AssertExpectations(t)
		})
	}
}

func TestDeleteRAID(t *testing.T) {
	// Setup
	mockClient := new(MockStorageClient)
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)
	service := NewStorageService(mockClient, logger)
	ctx := context.Background()

	// Test cases
	tests := []struct {
		name      string
		machineID string
		raidID    string
		mockSetup func()
		wantErr   bool
		errMsg    string
	}{
		{
			name:      "Valid RAID deletion",
			machineID: "abc123",
			raidID:    "1",
			mockSetup: func() {
				mockClient.On("DeleteRAID", "abc123", 1).Return(nil)
			},
			wantErr: false,
		},
		{
			name:      "Empty machine ID",
			machineID: "",
			raidID:    "1",
			mockSetup: func() {
				// No mock setup needed as it should fail before calling the client
			},
			wantErr: true,
			errMsg:  "Machine ID is required",
		},
		{
			name:      "Empty RAID ID",
			machineID: "abc123",
			raidID:    "",
			mockSetup: func() {
				// No mock setup needed as it should fail before calling the client
			},
			wantErr: true,
			errMsg:  "RAID ID is required",
		},
		{
			name:      "Invalid RAID ID format",
			machineID: "abc123",
			raidID:    "invalid",
			mockSetup: func() {
				// No mock setup needed as it should fail before calling the client
			},
			wantErr: true,
			errMsg:  "Invalid RAID ID format",
		},
		{
			name:      "Client error",
			machineID: "abc123",
			raidID:    "1",
			mockSetup: func() {
				mockClient.On("DeleteRAID", "abc123", 1).Return(errors.New("client error"))
			},
			wantErr: true,
			errMsg:  "client error",
		},
	}

	// Run tests
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup mocks
			mockClient.ExpectedCalls = nil
			tt.mockSetup()

			// Call the service
			err := service.DeleteRAID(ctx, tt.machineID, tt.raidID)

			// Check results
			if tt.wantErr {
				assert.Error(t, err)
				if tt.errMsg != "" {
					assert.Contains(t, err.Error(), tt.errMsg)
				}
			} else {
				assert.NoError(t, err)
			}

			// Verify mocks
			mockClient.AssertExpectations(t)
		})
	}
}

func TestGetRAID(t *testing.T) {
	// Setup
	mockClient := new(MockStorageClient)
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)
	service := NewStorageService(mockClient, logger)
	ctx := context.Background()

	// Test cases
	tests := []struct {
		name      string
		machineID string
		raidID    string
		mockSetup func()
		wantErr   bool
		errMsg    string
	}{
		{
			name:      "Valid RAID retrieval",
			machineID: "abc123",
			raidID:    "1",
			mockSetup: func() {
				mockClient.On("GetRAID", "abc123", 1).Return(&models.RAID{
					ID:           1,
					Name:         "test-raid",
					Level:        models.RAID1,
					BlockDevices: []int{1, 2},
				}, nil)
			},
			wantErr: false,
		},
		{
			name:      "Empty machine ID",
			machineID: "",
			raidID:    "1",
			mockSetup: func() {
				// No mock setup needed as it should fail before calling the client
			},
			wantErr: true,
			errMsg:  "Machine ID is required",
		},
		{
			name:      "Empty RAID ID",
			machineID: "abc123",
			raidID:    "",
			mockSetup: func() {
				// No mock setup needed as it should fail before calling the client
			},
			wantErr: true,
			errMsg:  "RAID ID is required",
		},
		{
			name:      "Invalid RAID ID format",
			machineID: "abc123",
			raidID:    "invalid",
			mockSetup: func() {
				// No mock setup needed as it should fail before calling the client
			},
			wantErr: true,
			errMsg:  "Invalid RAID ID format",
		},
		{
			name:      "Client error",
			machineID: "abc123",
			raidID:    "1",
			mockSetup: func() {
				mockClient.On("GetRAID", "abc123", 1).Return(nil, errors.New("client error"))
			},
			wantErr: true,
			errMsg:  "client error",
		},
	}

	// Run tests
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup mocks
			mockClient.ExpectedCalls = nil
			tt.mockSetup()

			// Call the service
			result, err := service.GetRAID(ctx, tt.machineID, tt.raidID)

			// Check results
			if tt.wantErr {
				assert.Error(t, err)
				if tt.errMsg != "" {
					assert.Contains(t, err.Error(), tt.errMsg)
				}
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
			}

			// Verify mocks
			mockClient.AssertExpectations(t)
		})
	}
}

func TestListRAIDs(t *testing.T) {
	// Setup
	mockClient := new(MockStorageClient)
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)
	service := NewStorageService(mockClient, logger)
	ctx := context.Background()

	// Test cases
	tests := []struct {
		name      string
		machineID string
		mockSetup func()
		wantErr   bool
		errMsg    string
	}{
		{
			name:      "Valid RAID listing",
			machineID: "abc123",
			mockSetup: func() {
				mockClient.On("ListRAIDs", "abc123").Return([]models.RAID{
					{
						ID:           1,
						Name:         "raid-1",
						Level:        models.RAID1,
						BlockDevices: []int{1, 2},
					},
					{
						ID:           2,
						Name:         "raid-2",
						Level:        models.RAID5,
						BlockDevices: []int{3, 4, 5},
					},
				}, nil)
			},
			wantErr: false,
		},
		{
			name:      "Empty machine ID",
			machineID: "",
			mockSetup: func() {
				// No mock setup needed as it should fail before calling the client
			},
			wantErr: true,
			errMsg:  "Machine ID is required",
		},
		{
			name:      "Client error",
			machineID: "abc123",
			mockSetup: func() {
				mockClient.On("ListRAIDs", "abc123").Return(nil, errors.New("client error"))
			},
			wantErr: true,
			errMsg:  "client error",
		},
	}

	// Run tests
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup mocks
			mockClient.ExpectedCalls = nil
			tt.mockSetup()

			// Call the service
			result, err := service.ListRAIDs(ctx, tt.machineID)

			// Check results
			if tt.wantErr {
				assert.Error(t, err)
				if tt.errMsg != "" {
					assert.Contains(t, err.Error(), tt.errMsg)
				}
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.Len(t, result, 2)
			}

			// Verify mocks
			mockClient.AssertExpectations(t)
		})
	}
}

func TestUpdateRAID(t *testing.T) {
	// Setup
	mockClient := new(MockStorageClient)
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)
	service := NewStorageService(mockClient, logger)
	ctx := context.Background()

	// Test cases
	tests := []struct {
		name      string
		machineID string
		raidID    string
		params    models.RAIDUpdateParams
		mockSetup func()
		wantErr   bool
		errMsg    string
	}{
		{
			name:      "Valid RAID update",
			machineID: "abc123",
			raidID:    "1",
			params: models.RAIDUpdateParams{
				Name: "updated-raid",
			},
			mockSetup: func() {
				mockClient.On("UpdateRAID", "abc123", 1, mock.Anything).Return(&models.RAID{
					ID:           1,
					Name:         "updated-raid",
					Level:        models.RAID1,
					BlockDevices: []int{1, 2},
				}, nil)
			},
			wantErr: false,
		},
		{
			name:      "Empty machine ID",
			machineID: "",
			raidID:    "1",
			params: models.RAIDUpdateParams{
				Name: "updated-raid",
			},
			mockSetup: func() {
				// No mock setup needed as it should fail before calling the client
			},
			wantErr: true,
			errMsg:  "Machine ID is required",
		},
		{
			name:      "Empty RAID ID",
			machineID: "abc123",
			raidID:    "",
			params: models.RAIDUpdateParams{
				Name: "updated-raid",
			},
			mockSetup: func() {
				// No mock setup needed as it should fail before calling the client
			},
			wantErr: true,
			errMsg:  "RAID ID is required",
		},
		{
			name:      "Invalid RAID ID format",
			machineID: "abc123",
			raidID:    "invalid",
			params: models.RAIDUpdateParams{
				Name: "updated-raid",
			},
			mockSetup: func() {
				// No mock setup needed as it should fail before calling the client
			},
			wantErr: true,
			errMsg:  "Invalid RAID ID format",
		},
		{
			name:      "Invalid update params",
			machineID: "abc123",
			raidID:    "1",
			params:    models.RAIDUpdateParams{}, // Empty params
			mockSetup: func() {
				// No mock setup needed as it should fail before calling the client
			},
			wantErr: true,
			errMsg:  "Invalid RAID update parameters",
		},
		{
			name:      "Client error",
			machineID: "abc123",
			raidID:    "1",
			params: models.RAIDUpdateParams{
				Name: "updated-raid",
			},
			mockSetup: func() {
				mockClient.On("UpdateRAID", "abc123", 1, mock.Anything).Return(nil, errors.New("client error"))
			},
			wantErr: true,
			errMsg:  "client error",
		},
	}

	// Run tests
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup mocks
			mockClient.ExpectedCalls = nil
			tt.mockSetup()

			// Call the service
			result, err := service.UpdateRAID(ctx, tt.machineID, tt.raidID, tt.params)

			// Check results
			if tt.wantErr {
				assert.Error(t, err)
				if tt.errMsg != "" {
					assert.Contains(t, err.Error(), tt.errMsg)
				}
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				if tt.params.Name != "" {
					assert.Equal(t, tt.params.Name, result.Name)
				}
			}

			// Verify mocks
			mockClient.AssertExpectations(t)
		})
	}
}
