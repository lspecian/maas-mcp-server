package transport

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/gin-gonic/gin"
	apperrors "github.com/lspecian/maas-mcp-server/internal/errors" // Added import alias
	"github.com/lspecian/maas-mcp-server/internal/models"
	modelsmaas "github.com/lspecian/maas-mcp-server/internal/models/maas"
	"github.com/lspecian/maas-mcp-server/internal/service"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
)

// MockStorageService is a mock implementation of the StorageServiceInterface
type MockStorageService struct {
	ListBlockDevicesFunc func(ctx context.Context, machineID string) ([]models.StorageContext, error)
	GetBlockDeviceFunc   func(ctx context.Context, machineID string, deviceID string) (*models.StorageContext, error)
	CreatePartitionFunc  func(ctx context.Context, machineID string, deviceID string, params modelsmaas.PartitionCreateParams) (*models.PartitionContext, error)
	UpdatePartitionFunc  func(ctx context.Context, machineID string, deviceID string, partitionID string, params map[string]interface{}) (*models.PartitionContext, error)
	DeletePartitionFunc  func(ctx context.Context, machineID string, deviceID string, partitionID string) error
	FormatPartitionFunc  func(ctx context.Context, machineID string, deviceID string, partitionID string, params map[string]interface{}) (*models.FilesystemContext, error)

	// RAID operations
	CreateRAIDFunc func(ctx context.Context, machineID string, params models.RAIDParams) (*models.RAIDContext, error)
	GetRAIDFunc    func(ctx context.Context, machineID string, raidID string) (*models.RAIDContext, error)
	ListRAIDsFunc  func(ctx context.Context, machineID string) ([]models.RAIDContext, error)
	UpdateRAIDFunc func(ctx context.Context, machineID string, raidID string, params models.RAIDUpdateParams) (*models.RAIDContext, error)
	DeleteRAIDFunc func(ctx context.Context, machineID string, raidID string) error
}

func (m *MockStorageService) ListBlockDevices(ctx context.Context, machineID string) ([]models.StorageContext, error) {
	if m.ListBlockDevicesFunc != nil {
		return m.ListBlockDevicesFunc(ctx, machineID)
	}
	return nil, errors.New("ListBlockDevicesFunc not implemented")
}

func (m *MockStorageService) GetBlockDevice(ctx context.Context, machineID string, deviceID string) (*models.StorageContext, error) {
	if m.GetBlockDeviceFunc != nil {
		return m.GetBlockDeviceFunc(ctx, machineID, deviceID)
	}
	return nil, errors.New("GetBlockDeviceFunc not implemented")
}

func (m *MockStorageService) CreatePartition(ctx context.Context, machineID string, deviceID string, params map[string]interface{}) (*models.PartitionContext, error) {
	if m.CreatePartitionFunc != nil {
		// Convert map[string]interface{} to modelsmaas.PartitionCreateParams
		createParams := modelsmaas.PartitionCreateParams{}

		// Extract size parameter
		if sizeVal, ok := params["size"]; ok {
			switch v := sizeVal.(type) {
			case int64:
				createParams.Size = v
			case int:
				createParams.Size = int64(v)
			case float64:
				createParams.Size = int64(v)
			case string:
				if size, err := strconv.ParseInt(v, 10, 64); err == nil {
					createParams.Size = size
				}
			}
		}

		// Extract fstype parameter if present
		if fsTypeVal, ok := params["fstype"]; ok {
			if fsType, ok := fsTypeVal.(string); ok {
				createParams.FSType = fsType
			}
		}

		return m.CreatePartitionFunc(ctx, machineID, deviceID, createParams)
	}
	return nil, errors.New("CreatePartitionFunc not implemented")
}

func (m *MockStorageService) UpdatePartition(ctx context.Context, machineID string, deviceID string, partitionID string, params map[string]interface{}) (*models.PartitionContext, error) {
	if m.UpdatePartitionFunc != nil {
		return m.UpdatePartitionFunc(ctx, machineID, deviceID, partitionID, params)
	}
	return nil, errors.New("UpdatePartitionFunc not implemented")
}

func (m *MockStorageService) DeletePartition(ctx context.Context, machineID string, deviceID string, partitionID string) error {
	if m.DeletePartitionFunc != nil {
		return m.DeletePartitionFunc(ctx, machineID, deviceID, partitionID)
	}
	return errors.New("DeletePartitionFunc not implemented")
}

func (m *MockStorageService) FormatPartition(ctx context.Context, machineID string, deviceID string, partitionID string, params map[string]interface{}) (*models.FilesystemContext, error) {
	if m.FormatPartitionFunc != nil {
		return m.FormatPartitionFunc(ctx, machineID, deviceID, partitionID, params)
	}
	return nil, errors.New("FormatPartitionFunc not implemented")
}

// RAID operations implementations
func (m *MockStorageService) CreateRAID(ctx context.Context, machineID string, params models.RAIDParams) (*models.RAIDContext, error) {
	if m.CreateRAIDFunc != nil {
		return m.CreateRAIDFunc(ctx, machineID, params)
	}
	return nil, errors.New("CreateRAIDFunc not implemented")
}

func (m *MockStorageService) GetRAID(ctx context.Context, machineID string, raidID string) (*models.RAIDContext, error) {
	if m.GetRAIDFunc != nil {
		return m.GetRAIDFunc(ctx, machineID, raidID)
	}
	return nil, errors.New("GetRAIDFunc not implemented")
}

func (m *MockStorageService) ListRAIDs(ctx context.Context, machineID string) ([]models.RAIDContext, error) {
	if m.ListRAIDsFunc != nil {
		return m.ListRAIDsFunc(ctx, machineID)
	}
	return nil, errors.New("ListRAIDsFunc not implemented")
}

func (m *MockStorageService) UpdateRAID(ctx context.Context, machineID string, raidID string, params models.RAIDUpdateParams) (*models.RAIDContext, error) {
	if m.UpdateRAIDFunc != nil {
		return m.UpdateRAIDFunc(ctx, machineID, raidID, params)
	}
	return nil, errors.New("UpdateRAIDFunc not implemented")
}

func (m *MockStorageService) DeleteRAID(ctx context.Context, machineID string, raidID string) error {
	if m.DeleteRAIDFunc != nil {
		return m.DeleteRAIDFunc(ctx, machineID, raidID)
	}
	return errors.New("DeleteRAIDFunc not implemented")
}
func (m *MockStorageService) ConfigureStorage(ctx context.Context, machineID string, config models.DesiredStorageConfiguration) error {
	// Mock implementation - just return nil for now
	return nil
}

func setupStorageTest() (*gin.Engine, *MockStorageService) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	mockService := new(MockStorageService)
	logger := logrus.New()
	logger.SetLevel(logrus.FatalLevel) // Suppress logs during tests

	// Create the handler with the mock service
	handler := NewStorageHandler(mockService, logger)
	handler.RegisterRoutes(router.Group(""))

	return router, mockService
}

func TestListMachineBlockDevices(t *testing.T) {
	router, mockService := setupStorageTest()

	// Test case 1: Successful response
	blockDevices := []models.StorageContext{
		{
			ID:            "1",
			Name:          "sda",
			Type:          "physical",
			Size:          1000000000,
			UsedSize:      800000000,
			AvailableSize: 200000000,
			Path:          "/dev/sda",
			Model:         "Samsung SSD",
			Serial:        "S123456",
			Filesystem: &models.FilesystemContext{
				Type:       "ext4",
				MountPoint: "/",
			},
			Mountpoints: []models.MountpointContext{
				{
					Path:   "/",
					Device: "/dev/sda1",
				},
			},
		},
		{
			ID:            "2",
			Name:          "sdb",
			Type:          "physical",
			Size:          2000000000,
			UsedSize:      0,
			AvailableSize: 2000000000,
			Path:          "/dev/sdb",
			Model:         "WD HDD",
			Serial:        "WD123456",
			Filesystem:    nil,
		},
	}

	mockService.ListBlockDevicesFunc = func(ctx context.Context, machineID string) ([]models.StorageContext, error) {
		if machineID == "machine-1" {
			return blockDevices, nil
		}
		return nil, errors.New("unexpected machine ID")
	}

	req := httptest.NewRequest(http.MethodGet, "/machines/machine-1/storage", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string][]models.StorageContext
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Len(t, response["block_devices"], 2)
	assert.Equal(t, "sda", response["block_devices"][0].Name)
	assert.Equal(t, "sdb", response["block_devices"][1].Name)

	// Test case 2: Missing machine ID
	req = httptest.NewRequest(http.MethodGet, "/machines//storage", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	// Test case 3: Service error
	mockService.ListBlockDevicesFunc = func(ctx context.Context, machineID string) ([]models.StorageContext, error) {
		return nil, &service.ServiceError{
			Err:        service.ErrNotFound,
			StatusCode: http.StatusNotFound,
			Message:    "Machine not found",
		}
	}

	req = httptest.NewRequest(http.MethodGet, "/machines/non-existent/storage", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)

	var errorResponse struct {
		Type    string `json:"type"`
		Message string `json:"message"`
		Code    string `json:"code,omitempty"`
	}
	err = json.Unmarshal(w.Body.Bytes(), &errorResponse)
	assert.NoError(t, err)
	assert.Equal(t, string(apperrors.ErrorTypeNotFound), errorResponse.Type) // Used aliased package
	assert.Equal(t, "Machine not found", errorResponse.Message)
	// Optionally assert Code if it's consistently set for ErrNotFound
	// assert.Equal(t, string(errors.ErrorCodeResourceNotFound), errorResponse.Code)
}
