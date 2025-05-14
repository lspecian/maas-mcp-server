package service

import (
	"context"
	"testing"

	"github.com/lspecian/maas-mcp-server/internal/models"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockVolumeGroupClient is a mock implementation of the VolumeGroupClient interface
type MockVolumeGroupClient struct {
	mock.Mock
}

// CreateVolumeGroup mocks the CreateVolumeGroup method
func (m *MockVolumeGroupClient) CreateVolumeGroup(systemID string, params models.VolumeGroupParams) (*models.VolumeGroup, error) {
	args := m.Called(systemID, params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.VolumeGroup), args.Error(1)
}

// DeleteVolumeGroup mocks the DeleteVolumeGroup method
func (m *MockVolumeGroupClient) DeleteVolumeGroup(systemID string, volumeGroupID int) error {
	args := m.Called(systemID, volumeGroupID)
	return args.Error(0)
}

// GetVolumeGroup mocks the GetVolumeGroup method
func (m *MockVolumeGroupClient) GetVolumeGroup(systemID string, volumeGroupID int) (*models.VolumeGroup, error) {
	args := m.Called(systemID, volumeGroupID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.VolumeGroup), args.Error(1)
}

// ListVolumeGroups mocks the ListVolumeGroups method
func (m *MockVolumeGroupClient) ListVolumeGroups(systemID string) ([]models.VolumeGroup, error) {
	args := m.Called(systemID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.VolumeGroup), args.Error(1)
}

// CreateLogicalVolume mocks the CreateLogicalVolume method
func (m *MockVolumeGroupClient) CreateLogicalVolume(systemID string, volumeGroupID int, params models.LogicalVolumeParams) (*models.LogicalVolume, error) {
	args := m.Called(systemID, volumeGroupID, params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.LogicalVolume), args.Error(1)
}

// DeleteLogicalVolume mocks the DeleteLogicalVolume method
func (m *MockVolumeGroupClient) DeleteLogicalVolume(systemID string, volumeGroupID, logicalVolumeID int) error {
	args := m.Called(systemID, volumeGroupID, logicalVolumeID)
	return args.Error(0)
}

// ResizeLogicalVolume mocks the ResizeLogicalVolume method
func (m *MockVolumeGroupClient) ResizeLogicalVolume(systemID string, volumeGroupID, logicalVolumeID int, newSize int64) (*models.LogicalVolume, error) {
	args := m.Called(systemID, volumeGroupID, logicalVolumeID, newSize)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.LogicalVolume), args.Error(1)
}

// GetLogicalVolume mocks the GetLogicalVolume method
func (m *MockVolumeGroupClient) GetLogicalVolume(systemID string, volumeGroupID, logicalVolumeID int) (*models.LogicalVolume, error) {
	args := m.Called(systemID, volumeGroupID, logicalVolumeID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.LogicalVolume), args.Error(1)
}

func TestListVolumeGroups(t *testing.T) {
	// Create a mock client
	mockClient := new(MockVolumeGroupClient)

	// Create a logger
	logger := logrus.New()

	// Create the service
	service := NewVolumeGroupService(mockClient, logger)

	// Set up the mock expectations
	machineID := "abc123"
	mockVolumeGroups := []models.VolumeGroup{
		{
			ID:            1,
			Name:          "vg-1",
			UUID:          "uuid-1",
			Size:          1024 * 1024 * 1024,
			UsedSize:      0,
			AvailableSize: 1024 * 1024 * 1024,
			SystemID:      machineID,
			BlockDevices:  []int{1, 2},
		},
		{
			ID:            2,
			Name:          "vg-2",
			UUID:          "uuid-2",
			Size:          2 * 1024 * 1024 * 1024,
			UsedSize:      512 * 1024 * 1024,
			AvailableSize: 1536 * 1024 * 1024,
			SystemID:      machineID,
			BlockDevices:  []int{3, 4},
		},
	}

	mockClient.On("ListVolumeGroups", machineID).Return(mockVolumeGroups, nil)

	// Call the service method
	result, err := service.ListVolumeGroups(context.Background(), machineID)

	// Assert expectations
	assert.NoError(t, err)
	assert.Equal(t, 2, len(result))
	assert.Equal(t, "1", result[0].ID)
	assert.Equal(t, "vg-1", result[0].Name)
	assert.Equal(t, "2", result[1].ID)
	assert.Equal(t, "vg-2", result[1].Name)

	// Verify that the mock was called as expected
	mockClient.AssertExpectations(t)
}

func TestCreateVolumeGroup(t *testing.T) {
	// Create a mock client
	mockClient := new(MockVolumeGroupClient)

	// Create a logger
	logger := logrus.New()

	// Create the service
	service := NewVolumeGroupService(mockClient, logger)

	// Set up the mock expectations
	machineID := "abc123"
	params := map[string]interface{}{
		"name":          "vg-test",
		"block_devices": []interface{}{1, 2},
	}

	mockVolumeGroup := &models.VolumeGroup{
		ID:            1,
		Name:          "vg-test",
		UUID:          "uuid-test",
		Size:          1024 * 1024 * 1024,
		UsedSize:      0,
		AvailableSize: 1024 * 1024 * 1024,
		SystemID:      machineID,
		BlockDevices:  []int{1, 2},
	}

	// Set up the mock to expect the CreateVolumeGroup call with the correct parameters
	mockClient.On("CreateVolumeGroup", machineID, mock.MatchedBy(func(p models.VolumeGroupParams) bool {
		return p.Name == "vg-test" && len(p.BlockDevices) == 2
	})).Return(mockVolumeGroup, nil)

	// Call the service method
	result, err := service.CreateVolumeGroup(context.Background(), machineID, params)

	// Assert expectations
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "1", result.ID)
	assert.Equal(t, "vg-test", result.Name)
	assert.Equal(t, int64(1024*1024*1024), result.Size)

	// Verify that the mock was called as expected
	mockClient.AssertExpectations(t)
}

func TestCreateLogicalVolume(t *testing.T) {
	// Create a mock client
	mockClient := new(MockVolumeGroupClient)

	// Create a logger
	logger := logrus.New()

	// Create the service
	service := NewVolumeGroupService(mockClient, logger)

	// Set up the mock expectations
	machineID := "abc123"
	volumeGroupID := "1"
	params := map[string]interface{}{
		"name": "lv-test",
		"size": int64(512 * 1024 * 1024),
	}

	mockLogicalVolume := &models.LogicalVolume{
		ID:          1,
		Name:        "lv-test",
		UUID:        "uuid-lv-test",
		Size:        512 * 1024 * 1024,
		VolumeGroup: 1,
	}

	// Set up the mock to expect the CreateLogicalVolume call with the correct parameters
	mockClient.On("CreateLogicalVolume", machineID, 1, mock.MatchedBy(func(p models.LogicalVolumeParams) bool {
		return p.Name == "lv-test" && p.Size == 512*1024*1024
	})).Return(mockLogicalVolume, nil)

	// Call the service method
	result, err := service.CreateLogicalVolume(context.Background(), machineID, volumeGroupID, params)

	// Assert expectations
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "1", result.ID)
	assert.Equal(t, "lv-test", result.Name)
	assert.Equal(t, int64(512*1024*1024), result.Size)

	// Verify that the mock was called as expected
	mockClient.AssertExpectations(t)
}

func TestResizeLogicalVolume(t *testing.T) {
	// Create a mock client
	mockClient := new(MockVolumeGroupClient)

	// Create a logger
	logger := logrus.New()

	// Create the service
	service := NewVolumeGroupService(mockClient, logger)

	// Set up the mock expectations
	machineID := "abc123"
	volumeGroupID := "1"
	logicalVolumeID := "1"
	params := map[string]interface{}{
		"size": int64(1024 * 1024 * 1024),
	}

	mockLogicalVolume := &models.LogicalVolume{
		ID:          1,
		Name:        "lv-test",
		UUID:        "uuid-lv-test",
		Size:        1024 * 1024 * 1024,
		VolumeGroup: 1,
	}

	// Set up the mock to expect the ResizeLogicalVolume call with the correct parameters
	mockClient.On("ResizeLogicalVolume", machineID, 1, 1, int64(1024*1024*1024)).Return(mockLogicalVolume, nil)

	// Call the service method
	result, err := service.ResizeLogicalVolume(context.Background(), machineID, volumeGroupID, logicalVolumeID, params)

	// Assert expectations
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "1", result.ID)
	assert.Equal(t, "lv-test", result.Name)
	assert.Equal(t, int64(1024*1024*1024), result.Size)

	// Verify that the mock was called as expected
	mockClient.AssertExpectations(t)
}
