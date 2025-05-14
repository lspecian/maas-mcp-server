package service

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"testing"

	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/lspecian/maas-mcp-server/internal/models"
)

// MockStorageClient is a mock implementation of the StorageClient interface
type MockStorageClient struct {
	mock.Mock
}

func (m *MockStorageClient) GetMachineBlockDevices(systemID string) ([]models.BlockDevice, error) {
	args := m.Called(systemID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.BlockDevice), args.Error(1)
}

func (m *MockStorageClient) GetMachineBlockDevice(systemID string, deviceID int) (*models.BlockDevice, error) {
	args := m.Called(systemID, deviceID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.BlockDevice), args.Error(1)
}

func (m *MockStorageClient) CreateMachinePartition(systemID string, blockDeviceID int, params map[string]interface{}) (*models.Partition, error) {
	args := m.Called(systemID, blockDeviceID, params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Partition), args.Error(1)
}

func (m *MockStorageClient) UpdateMachinePartition(systemID string, blockDeviceID, partitionID int, params map[string]interface{}) (*models.Partition, error) {
	args := m.Called(systemID, blockDeviceID, partitionID, params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Partition), args.Error(1)
}

func (m *MockStorageClient) DeleteMachinePartition(systemID string, blockDeviceID, partitionID int) error {
	args := m.Called(systemID, blockDeviceID, partitionID)
	return args.Error(0)
}

func (m *MockStorageClient) FormatMachinePartition(systemID string, blockDeviceID, partitionID int, params map[string]interface{}) (*models.Filesystem, error) {
	args := m.Called(systemID, blockDeviceID, partitionID, params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Filesystem), args.Error(1)
}

// Volume Group methods
func (m *MockStorageClient) CreateVolumeGroup(systemID string, params models.VolumeGroupParams) (*models.VolumeGroup, error) {
	args := m.Called(systemID, params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.VolumeGroup), args.Error(1)
}

func (m *MockStorageClient) DeleteVolumeGroup(systemID string, volumeGroupID int) error {
	args := m.Called(systemID, volumeGroupID)
	return args.Error(0)
}

func (m *MockStorageClient) GetVolumeGroup(systemID string, volumeGroupID int) (*models.VolumeGroup, error) {
	args := m.Called(systemID, volumeGroupID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.VolumeGroup), args.Error(1)
}

func (m *MockStorageClient) ListVolumeGroups(systemID string) ([]models.VolumeGroup, error) {
	args := m.Called(systemID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.VolumeGroup), args.Error(1)
}

// Logical Volume methods
func (m *MockStorageClient) CreateLogicalVolume(systemID string, volumeGroupID int, params models.LogicalVolumeParams) (*models.LogicalVolume, error) {
	args := m.Called(systemID, volumeGroupID, params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.LogicalVolume), args.Error(1)
}

func (m *MockStorageClient) DeleteLogicalVolume(systemID string, volumeGroupID, logicalVolumeID int) error {
	args := m.Called(systemID, volumeGroupID, logicalVolumeID)
	return args.Error(0)
}

func (m *MockStorageClient) ResizeLogicalVolume(systemID string, volumeGroupID, logicalVolumeID int, newSize int64) (*models.LogicalVolume, error) {
	args := m.Called(systemID, volumeGroupID, logicalVolumeID, newSize)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.LogicalVolume), args.Error(1)
}

func (m *MockStorageClient) GetLogicalVolume(systemID string, volumeGroupID, logicalVolumeID int) (*models.LogicalVolume, error) {
	args := m.Called(systemID, volumeGroupID, logicalVolumeID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.LogicalVolume), args.Error(1)
}

// Storage Constraint methods
func (m *MockStorageClient) SetStorageConstraints(systemID string, params models.StorageConstraintParams) error {
	args := m.Called(systemID, params)
	return args.Error(0)
}

func (m *MockStorageClient) GetStorageConstraints(systemID string) (*models.StorageConstraintParams, error) {
	args := m.Called(systemID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.StorageConstraintParams), args.Error(1)
}

func (m *MockStorageClient) ValidateStorageConstraints(systemID string, params models.StorageConstraintParams) (bool, []string, error) {
	args := m.Called(systemID, params)
	return args.Bool(0), args.Get(1).([]string), args.Error(2)
}

func (m *MockStorageClient) ApplyStorageConstraints(systemID string, params models.StorageConstraintParams) error {
	args := m.Called(systemID, params)
	return args.Error(0)
}

func (m *MockStorageClient) DeleteStorageConstraints(systemID string) error {
	args := m.Called(systemID)
	return args.Error(0)
}

func TestListBlockDevices(t *testing.T) {
	// Create a mock client
	mockClient := new(MockStorageClient)
	logger := logrus.New()
	logger.SetLevel(logrus.ErrorLevel)

	// Create the service with the mock client
	service := NewStorageService(mockClient, logger)

	// Test cases
	tests := []struct {
		name           string
		machineID      string
		mockDevices    []models.BlockDevice
		mockError      error
		expectedError  bool
		expectedStatus int
	}{
		{
			name:          "Success",
			machineID:     "abc123",
			mockDevices:   []models.BlockDevice{{ID: 1, Name: "sda", Path: "/dev/sda"}},
			mockError:     nil,
			expectedError: false,
		},
		{
			name:           "Empty machine ID",
			machineID:      "",
			mockDevices:    nil,
			mockError:      nil,
			expectedError:  true,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Client error",
			machineID:      "abc123",
			mockDevices:    nil,
			mockError:      errors.New("client error"),
			expectedError:  true,
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Setup mock expectations
			if tc.machineID != "" {
				mockClient.On("GetMachineBlockDevices", tc.machineID).Return(tc.mockDevices, tc.mockError).Once()
			}

			// Call the service method
			result, err := service.ListBlockDevices(context.Background(), tc.machineID)

			// Check the results
			if tc.expectedError {
				assert.Error(t, err)
				if svcErr, ok := err.(*ServiceError); ok {
					assert.Equal(t, tc.expectedStatus, svcErr.StatusCode)
				}
			} else {
				assert.NoError(t, err)
				assert.Len(t, result, len(tc.mockDevices))
			}

			// Verify all expectations were met
			mockClient.AssertExpectations(t)
		})
	}
}

func TestGetBlockDevice(t *testing.T) {
	// Create a mock client
	mockClient := new(MockStorageClient)
	logger := logrus.New()
	logger.SetLevel(logrus.ErrorLevel)

	// Create the service with the mock client
	service := NewStorageService(mockClient, logger)

	// Test cases
	tests := []struct {
		name           string
		machineID      string
		deviceID       string
		mockDevice     *models.BlockDevice
		mockError      error
		expectedError  bool
		expectedStatus int
	}{
		{
			name:          "Success",
			machineID:     "abc123",
			deviceID:      "1",
			mockDevice:    &models.BlockDevice{ID: 1, Name: "sda", Path: "/dev/sda"},
			mockError:     nil,
			expectedError: false,
		},
		{
			name:           "Empty machine ID",
			machineID:      "",
			deviceID:       "1",
			mockDevice:     nil,
			mockError:      nil,
			expectedError:  true,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Empty device ID",
			machineID:      "abc123",
			deviceID:       "",
			mockDevice:     nil,
			mockError:      nil,
			expectedError:  true,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Invalid device ID",
			machineID:      "abc123",
			deviceID:       "not-a-number",
			mockDevice:     nil,
			mockError:      nil,
			expectedError:  true,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Device not found",
			machineID:      "abc123",
			deviceID:       "999",
			mockDevice:     nil,
			mockError:      errors.New("device not found"),
			expectedError:  true,
			expectedStatus: http.StatusInternalServerError,
		},
		{
			name:           "Client error",
			machineID:      "abc123",
			deviceID:       "1",
			mockDevice:     nil,
			mockError:      errors.New("client error"),
			expectedError:  true,
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Setup mock expectations
			if tc.machineID != "" && tc.deviceID != "" && tc.deviceID != "not-a-number" {
				deviceID := 0
				if tc.deviceID != "" {
					deviceID = 1 // Default for test case "1"
					if tc.deviceID == "999" {
						deviceID = 999
					}
				}
				mockClient.On("GetMachineBlockDevice", tc.machineID, deviceID).Return(tc.mockDevice, tc.mockError).Once()
			}

			// Call the service method
			result, err := service.GetBlockDevice(context.Background(), tc.machineID, tc.deviceID)

			// Check the results
			if tc.expectedError {
				assert.Error(t, err)
				if svcErr, ok := err.(*ServiceError); ok {
					assert.Equal(t, tc.expectedStatus, svcErr.StatusCode)
				}
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.Equal(t, tc.mockDevice.Name, result.Name)
			}

			// Verify all expectations were met
			mockClient.AssertExpectations(t)
		})
	}
}

func TestCreatePartition(t *testing.T) {
	// Create a mock client
	mockClient := new(MockStorageClient)
	logger := logrus.New()
	logger.SetLevel(logrus.ErrorLevel)

	// Create the service with the mock client
	service := NewStorageService(mockClient, logger)

	// Test cases
	tests := []struct {
		name           string
		machineID      string
		deviceID       string
		params         map[string]interface{}
		mockPartition  *models.Partition
		mockError      error
		expectedError  bool
		expectedStatus int
	}{
		{
			name:      "Success",
			machineID: "abc123",
			deviceID:  "1",
			params: map[string]interface{}{
				"size": int64(1024 * 1024 * 1024), // 1GB
			},
			mockPartition: &models.Partition{
				ID:   1,
				Size: 1024 * 1024 * 1024,
				Path: "/dev/sda1",
			},
			mockError:     nil,
			expectedError: false,
		},
		{
			name:           "Empty machine ID",
			machineID:      "",
			deviceID:       "1",
			params:         map[string]interface{}{"size": int64(1024 * 1024 * 1024)},
			mockPartition:  nil,
			mockError:      nil,
			expectedError:  true,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Empty device ID",
			machineID:      "abc123",
			deviceID:       "",
			params:         map[string]interface{}{"size": int64(1024 * 1024 * 1024)},
			mockPartition:  nil,
			mockError:      nil,
			expectedError:  true,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Missing size parameter",
			machineID:      "abc123",
			deviceID:       "1",
			params:         map[string]interface{}{},
			mockPartition:  nil,
			mockError:      nil,
			expectedError:  true,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Invalid device ID",
			machineID:      "abc123",
			deviceID:       "not-a-number",
			params:         map[string]interface{}{"size": int64(1024 * 1024 * 1024)},
			mockPartition:  nil,
			mockError:      nil,
			expectedError:  true,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Client error",
			machineID:      "abc123",
			deviceID:       "1",
			params:         map[string]interface{}{"size": int64(1024 * 1024 * 1024)},
			mockPartition:  nil,
			mockError:      errors.New("client error"),
			expectedError:  true,
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Setup mock expectations
			if tc.machineID != "" && tc.deviceID != "" && tc.deviceID != "not-a-number" && len(tc.params) > 0 {
				deviceID, _ := strconv.Atoi(tc.deviceID)
				mockClient.On("CreateMachinePartition", tc.machineID, deviceID, tc.params).Return(tc.mockPartition, tc.mockError).Once()
			}

			// Call the service method
			result, err := service.CreatePartition(context.Background(), tc.machineID, tc.deviceID, tc.params)

			// Check the results
			if tc.expectedError {
				assert.Error(t, err)
				if svcErr, ok := err.(*ServiceError); ok {
					assert.Equal(t, tc.expectedStatus, svcErr.StatusCode)
				}
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.Equal(t, idToString(tc.mockPartition.ID), result.ID)
				assert.Equal(t, tc.mockPartition.Size, result.Size)
				assert.Equal(t, tc.mockPartition.Path, result.Path)
			}

			// Verify all expectations were met
			mockClient.AssertExpectations(t)
		})
	}
}

func TestUpdatePartition(t *testing.T) {
	// Create a mock client
	mockClient := new(MockStorageClient)
	logger := logrus.New()
	logger.SetLevel(logrus.ErrorLevel)

	// Create the service with the mock client
	service := NewStorageService(mockClient, logger)

	// Test cases
	tests := []struct {
		name           string
		machineID      string
		deviceID       string
		partitionID    string
		params         map[string]interface{}
		mockPartition  *models.Partition
		mockError      error
		expectedError  bool
		expectedStatus int
	}{
		{
			name:        "Success",
			machineID:   "abc123",
			deviceID:    "1",
			partitionID: "1",
			params: map[string]interface{}{
				"size": int64(2 * 1024 * 1024 * 1024), // 2GB
			},
			mockPartition: &models.Partition{
				ID:   1,
				Size: 2 * 1024 * 1024 * 1024,
				Path: "/dev/sda1",
			},
			mockError:     nil,
			expectedError: false,
		},
		{
			name:           "Empty machine ID",
			machineID:      "",
			deviceID:       "1",
			partitionID:    "1",
			params:         map[string]interface{}{"size": int64(2 * 1024 * 1024 * 1024)},
			mockPartition:  nil,
			mockError:      nil,
			expectedError:  true,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Empty device ID",
			machineID:      "abc123",
			deviceID:       "",
			partitionID:    "1",
			params:         map[string]interface{}{"size": int64(2 * 1024 * 1024 * 1024)},
			mockPartition:  nil,
			mockError:      nil,
			expectedError:  true,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Empty partition ID",
			machineID:      "abc123",
			deviceID:       "1",
			partitionID:    "",
			params:         map[string]interface{}{"size": int64(2 * 1024 * 1024 * 1024)},
			mockPartition:  nil,
			mockError:      nil,
			expectedError:  true,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Invalid device ID",
			machineID:      "abc123",
			deviceID:       "not-a-number",
			partitionID:    "1",
			params:         map[string]interface{}{"size": int64(2 * 1024 * 1024 * 1024)},
			mockPartition:  nil,
			mockError:      nil,
			expectedError:  true,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Invalid partition ID",
			machineID:      "abc123",
			deviceID:       "1",
			partitionID:    "not-a-number",
			params:         map[string]interface{}{"size": int64(2 * 1024 * 1024 * 1024)},
			mockPartition:  nil,
			mockError:      nil,
			expectedError:  true,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Client error",
			machineID:      "abc123",
			deviceID:       "1",
			partitionID:    "1",
			params:         map[string]interface{}{"size": int64(2 * 1024 * 1024 * 1024)},
			mockPartition:  nil,
			mockError:      errors.New("client error"),
			expectedError:  true,
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Setup mock expectations
			if tc.machineID != "" && tc.deviceID != "" && tc.partitionID != "" &&
				tc.deviceID != "not-a-number" && tc.partitionID != "not-a-number" {
				deviceID, _ := strconv.Atoi(tc.deviceID)
				partitionID, _ := strconv.Atoi(tc.partitionID)
				mockClient.On("UpdateMachinePartition", tc.machineID, deviceID, partitionID, tc.params).Return(tc.mockPartition, tc.mockError).Once()
			}

			// Call the service method
			result, err := service.UpdatePartition(context.Background(), tc.machineID, tc.deviceID, tc.partitionID, tc.params)

			// Check the results
			if tc.expectedError {
				assert.Error(t, err)
				if svcErr, ok := err.(*ServiceError); ok {
					assert.Equal(t, tc.expectedStatus, svcErr.StatusCode)
				}
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.Equal(t, idToString(tc.mockPartition.ID), result.ID)
				assert.Equal(t, tc.mockPartition.Size, result.Size)
				assert.Equal(t, tc.mockPartition.Path, result.Path)
			}

			// Verify all expectations were met
			mockClient.AssertExpectations(t)
		})
	}
}

func TestDeletePartition(t *testing.T) {
	// Create a mock client
	mockClient := new(MockStorageClient)
	logger := logrus.New()
	logger.SetLevel(logrus.ErrorLevel)

	// Create the service with the mock client
	service := NewStorageService(mockClient, logger)

	// Test cases
	tests := []struct {
		name           string
		machineID      string
		deviceID       string
		partitionID    string
		mockError      error
		expectedError  bool
		expectedStatus int
	}{
		{
			name:          "Success",
			machineID:     "abc123",
			deviceID:      "1",
			partitionID:   "1",
			mockError:     nil,
			expectedError: false,
		},
		{
			name:           "Empty machine ID",
			machineID:      "",
			deviceID:       "1",
			partitionID:    "1",
			mockError:      nil,
			expectedError:  true,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Empty device ID",
			machineID:      "abc123",
			deviceID:       "",
			partitionID:    "1",
			mockError:      nil,
			expectedError:  true,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Empty partition ID",
			machineID:      "abc123",
			deviceID:       "1",
			partitionID:    "",
			mockError:      nil,
			expectedError:  true,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Invalid device ID",
			machineID:      "abc123",
			deviceID:       "not-a-number",
			partitionID:    "1",
			mockError:      nil,
			expectedError:  true,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Invalid partition ID",
			machineID:      "abc123",
			deviceID:       "1",
			partitionID:    "not-a-number",
			mockError:      nil,
			expectedError:  true,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Client error",
			machineID:      "abc123",
			deviceID:       "1",
			partitionID:    "1",
			mockError:      errors.New("client error"),
			expectedError:  true,
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Setup mock expectations
			if tc.machineID != "" && tc.deviceID != "" && tc.partitionID != "" &&
				tc.deviceID != "not-a-number" && tc.partitionID != "not-a-number" {
				deviceID, _ := strconv.Atoi(tc.deviceID)
				partitionID, _ := strconv.Atoi(tc.partitionID)
				mockClient.On("DeleteMachinePartition", tc.machineID, deviceID, partitionID).Return(tc.mockError).Once()
			}

			// Call the service method
			err := service.DeletePartition(context.Background(), tc.machineID, tc.deviceID, tc.partitionID)

			// Check the results
			if tc.expectedError {
				assert.Error(t, err)
				if svcErr, ok := err.(*ServiceError); ok {
					assert.Equal(t, tc.expectedStatus, svcErr.StatusCode)
				}
			} else {
				assert.NoError(t, err)
			}

			// Verify all expectations were met
			mockClient.AssertExpectations(t)
		})
	}
}

func TestFormatPartition(t *testing.T) {
	// Create a mock client
	mockClient := new(MockStorageClient)
	logger := logrus.New()
	logger.SetLevel(logrus.ErrorLevel)

	// Create the service with the mock client
	service := NewStorageService(mockClient, logger)

	// Test cases
	tests := []struct {
		name           string
		machineID      string
		deviceID       string
		partitionID    string
		params         map[string]interface{}
		mockFilesystem *models.Filesystem
		mockError      error
		expectedError  bool
		expectedStatus int
	}{
		{
			name:        "Success",
			machineID:   "abc123",
			deviceID:    "1",
			partitionID: "1",
			params: map[string]interface{}{
				"fstype": "ext4",
			},
			mockFilesystem: &models.Filesystem{
				ID:     1,
				FSType: "ext4",
				UUID:   "uuid-1-1-123456789",
			},
			mockError:     nil,
			expectedError: false,
		},
		{
			name:           "Empty machine ID",
			machineID:      "",
			deviceID:       "1",
			partitionID:    "1",
			params:         map[string]interface{}{"fstype": "ext4"},
			mockFilesystem: nil,
			mockError:      nil,
			expectedError:  true,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Empty device ID",
			machineID:      "abc123",
			deviceID:       "",
			partitionID:    "1",
			params:         map[string]interface{}{"fstype": "ext4"},
			mockFilesystem: nil,
			mockError:      nil,
			expectedError:  true,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Empty partition ID",
			machineID:      "abc123",
			deviceID:       "1",
			partitionID:    "",
			params:         map[string]interface{}{"fstype": "ext4"},
			mockFilesystem: nil,
			mockError:      nil,
			expectedError:  true,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Missing fstype parameter",
			machineID:      "abc123",
			deviceID:       "1",
			partitionID:    "1",
			params:         map[string]interface{}{},
			mockFilesystem: nil,
			mockError:      nil,
			expectedError:  true,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Invalid device ID",
			machineID:      "abc123",
			deviceID:       "not-a-number",
			partitionID:    "1",
			params:         map[string]interface{}{"fstype": "ext4"},
			mockFilesystem: nil,
			mockError:      nil,
			expectedError:  true,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Invalid partition ID",
			machineID:      "abc123",
			deviceID:       "1",
			partitionID:    "not-a-number",
			params:         map[string]interface{}{"fstype": "ext4"},
			mockFilesystem: nil,
			mockError:      nil,
			expectedError:  true,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Client error",
			machineID:      "abc123",
			deviceID:       "1",
			partitionID:    "1",
			params:         map[string]interface{}{"fstype": "ext4"},
			mockFilesystem: nil,
			mockError:      errors.New("client error"),
			expectedError:  true,
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Setup mock expectations
			if tc.machineID != "" && tc.deviceID != "" && tc.partitionID != "" &&
				tc.deviceID != "not-a-number" && tc.partitionID != "not-a-number" &&
				len(tc.params) > 0 {
				deviceID, _ := strconv.Atoi(tc.deviceID)
				partitionID, _ := strconv.Atoi(tc.partitionID)
				mockClient.On("FormatMachinePartition", tc.machineID, deviceID, partitionID, tc.params).Return(tc.mockFilesystem, tc.mockError).Once()
			}

			// Call the service method
			result, err := service.FormatPartition(context.Background(), tc.machineID, tc.deviceID, tc.partitionID, tc.params)

			// Check the results
			if tc.expectedError {
				assert.Error(t, err)
				if svcErr, ok := err.(*ServiceError); ok {
					assert.Equal(t, tc.expectedStatus, svcErr.StatusCode)
				}
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.Equal(t, tc.mockFilesystem.FSType, result.Type)
				assert.Equal(t, tc.mockFilesystem.UUID, result.UUID)
			}

			// Verify all expectations were met
			mockClient.AssertExpectations(t)
		})
	}
}
