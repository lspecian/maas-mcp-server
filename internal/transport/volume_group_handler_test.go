package transport

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/lspecian/maas-mcp-server/internal/models"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockVolumeGroupService is a mock implementation of the VolumeGroupServiceInterface
type MockVolumeGroupService struct {
	mock.Mock
}

// ListVolumeGroups mocks the ListVolumeGroups method
func (m *MockVolumeGroupService) ListVolumeGroups(ctx context.Context, machineID string) ([]models.VolumeGroupContext, error) {
	args := m.Called(ctx, machineID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.VolumeGroupContext), args.Error(1)
}

// GetVolumeGroup mocks the GetVolumeGroup method
func (m *MockVolumeGroupService) GetVolumeGroup(ctx context.Context, machineID string, volumeGroupID string) (*models.VolumeGroupContext, error) {
	args := m.Called(ctx, machineID, volumeGroupID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.VolumeGroupContext), args.Error(1)
}

// CreateVolumeGroup mocks the CreateVolumeGroup method
func (m *MockVolumeGroupService) CreateVolumeGroup(ctx context.Context, machineID string, params map[string]interface{}) (*models.VolumeGroupContext, error) {
	args := m.Called(ctx, machineID, params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.VolumeGroupContext), args.Error(1)
}

// DeleteVolumeGroup mocks the DeleteVolumeGroup method
func (m *MockVolumeGroupService) DeleteVolumeGroup(ctx context.Context, machineID string, volumeGroupID string) error {
	args := m.Called(ctx, machineID, volumeGroupID)
	return args.Error(0)
}

// CreateLogicalVolume mocks the CreateLogicalVolume method
func (m *MockVolumeGroupService) CreateLogicalVolume(ctx context.Context, machineID string, volumeGroupID string, params map[string]interface{}) (*models.LogicalVolumeContext, error) {
	args := m.Called(ctx, machineID, volumeGroupID, params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.LogicalVolumeContext), args.Error(1)
}

// DeleteLogicalVolume mocks the DeleteLogicalVolume method
func (m *MockVolumeGroupService) DeleteLogicalVolume(ctx context.Context, machineID string, volumeGroupID string, logicalVolumeID string) error {
	args := m.Called(ctx, machineID, volumeGroupID, logicalVolumeID)
	return args.Error(0)
}

// ResizeLogicalVolume mocks the ResizeLogicalVolume method
func (m *MockVolumeGroupService) ResizeLogicalVolume(ctx context.Context, machineID string, volumeGroupID string, logicalVolumeID string, params map[string]interface{}) (*models.LogicalVolumeContext, error) {
	args := m.Called(ctx, machineID, volumeGroupID, logicalVolumeID, params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.LogicalVolumeContext), args.Error(1)
}

func TestListVolumeGroups_Handler(t *testing.T) {
	// Set up Gin in test mode
	gin.SetMode(gin.TestMode)

	// Create a mock service
	mockService := new(MockVolumeGroupService)

	// Create a logger
	logger := logrus.New()

	// Create the handler
	handler := NewVolumeGroupHandler(mockService, logger)

	// Set up the mock expectations
	machineID := "abc123"
	mockVolumeGroups := []models.VolumeGroupContext{
		{
			ID:            "1",
			Name:          "vg-1",
			UUID:          "uuid-1",
			Size:          1024 * 1024 * 1024,
			UsedSize:      0,
			AvailableSize: 1024 * 1024 * 1024,
			BlockDevices:  []string{"1", "2"},
		},
		{
			ID:            "2",
			Name:          "vg-2",
			UUID:          "uuid-2",
			Size:          2 * 1024 * 1024 * 1024,
			UsedSize:      512 * 1024 * 1024,
			AvailableSize: 1536 * 1024 * 1024,
			BlockDevices:  []string{"3", "4"},
		},
	}

	mockService.On("ListVolumeGroups", mock.Anything, machineID).Return(mockVolumeGroups, nil)

	// Create a test router
	router := gin.New()
	router.GET("/machines/:id/volume-groups", handler.ListVolumeGroups)

	// Create a test request
	req, _ := http.NewRequest("GET", "/machines/"+machineID+"/volume-groups", nil)
	resp := httptest.NewRecorder()

	// Serve the request
	router.ServeHTTP(resp, req)

	// Assert expectations
	assert.Equal(t, http.StatusOK, resp.Code)

	// Parse the response
	var response map[string]interface{}
	err := json.Unmarshal(resp.Body.Bytes(), &response)
	assert.NoError(t, err)

	// Check the response
	volumeGroups, ok := response["volume_groups"].([]interface{})
	assert.True(t, ok)
	assert.Equal(t, 2, len(volumeGroups))

	// Verify that the mock was called as expected
	mockService.AssertExpectations(t)
}

func TestCreateVolumeGroup_Handler(t *testing.T) {
	// Set up Gin in test mode
	gin.SetMode(gin.TestMode)

	// Create a mock service
	mockService := new(MockVolumeGroupService)

	// Create a logger
	logger := logrus.New()

	// Create the handler
	handler := NewVolumeGroupHandler(mockService, logger)

	// Set up the mock expectations
	machineID := "abc123"
	requestParams := map[string]interface{}{
		"name":          "vg-test",
		"block_devices": []int{1, 2},
	}

	mockVolumeGroup := &models.VolumeGroupContext{
		ID:            "1",
		Name:          "vg-test",
		UUID:          "uuid-test",
		Size:          1024 * 1024 * 1024,
		UsedSize:      0,
		AvailableSize: 1024 * 1024 * 1024,
		BlockDevices:  []string{"1", "2"},
	}

	mockService.On("CreateVolumeGroup", mock.Anything, machineID, mock.MatchedBy(func(p map[string]interface{}) bool {
		return p["name"] == "vg-test"
	})).Return(mockVolumeGroup, nil)

	// Create a test router
	router := gin.New()
	router.POST("/machines/:id/volume-groups", handler.CreateVolumeGroup)

	// Create a test request
	requestBody, _ := json.Marshal(requestParams)
	req, _ := http.NewRequest("POST", "/machines/"+machineID+"/volume-groups", bytes.NewBuffer(requestBody))
	req.Header.Set("Content-Type", "application/json")
	resp := httptest.NewRecorder()

	// Serve the request
	router.ServeHTTP(resp, req)

	// Assert expectations
	assert.Equal(t, http.StatusOK, resp.Code)

	// Parse the response
	var response map[string]interface{}
	err := json.Unmarshal(resp.Body.Bytes(), &response)
	assert.NoError(t, err)

	// Check the response
	volumeGroup, ok := response["volume_group"].(map[string]interface{})
	assert.True(t, ok)
	assert.Equal(t, "1", volumeGroup["id"])
	assert.Equal(t, "vg-test", volumeGroup["name"])

	// Verify that the mock was called as expected
	mockService.AssertExpectations(t)
}

func TestCreateLogicalVolume_Handler(t *testing.T) {
	// Set up Gin in test mode
	gin.SetMode(gin.TestMode)

	// Create a mock service
	mockService := new(MockVolumeGroupService)

	// Create a logger
	logger := logrus.New()

	// Create the handler
	handler := NewVolumeGroupHandler(mockService, logger)

	// Set up the mock expectations
	machineID := "abc123"
	volumeGroupID := "1"
	requestParams := map[string]interface{}{
		"name": "lv-test",
		"size": float64(512 * 1024 * 1024), // JSON numbers are parsed as float64
	}

	mockLogicalVolume := &models.LogicalVolumeContext{
		ID:          "1",
		Name:        "lv-test",
		UUID:        "uuid-lv-test",
		Size:        512 * 1024 * 1024,
		VolumeGroup: "1",
	}

	mockService.On("CreateLogicalVolume", mock.Anything, machineID, volumeGroupID, mock.MatchedBy(func(p map[string]interface{}) bool {
		return p["name"] == "lv-test"
	})).Return(mockLogicalVolume, nil)

	// Create a test router
	router := gin.New()
	router.POST("/machines/:id/volume-groups/:volume_group_id/logical-volumes", handler.CreateLogicalVolume)

	// Create a test request
	requestBody, _ := json.Marshal(requestParams)
	req, _ := http.NewRequest("POST", "/machines/"+machineID+"/volume-groups/"+volumeGroupID+"/logical-volumes", bytes.NewBuffer(requestBody))
	req.Header.Set("Content-Type", "application/json")
	resp := httptest.NewRecorder()

	// Serve the request
	router.ServeHTTP(resp, req)

	// Assert expectations
	assert.Equal(t, http.StatusOK, resp.Code)

	// Parse the response
	var response map[string]interface{}
	err := json.Unmarshal(resp.Body.Bytes(), &response)
	assert.NoError(t, err)

	// Check the response
	logicalVolume, ok := response["logical_volume"].(map[string]interface{})
	assert.True(t, ok)
	assert.Equal(t, "1", logicalVolume["id"])
	assert.Equal(t, "lv-test", logicalVolume["name"])

	// Verify that the mock was called as expected
	mockService.AssertExpectations(t)
}
