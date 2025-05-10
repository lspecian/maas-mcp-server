package transport

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/lspecian/maas-mcp-server/internal/models"
	"github.com/lspecian/maas-mcp-server/internal/service"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
)

// MockStorageService is a mock implementation of the StorageServiceInterface
type MockStorageService struct {
	ListBlockDevicesFunc func(ctx context.Context, machineID string) ([]models.StorageContext, error)
	GetBlockDeviceFunc   func(ctx context.Context, machineID string, deviceID string) (*models.StorageContext, error)
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

	var errorResponse map[string]string
	err = json.Unmarshal(w.Body.Bytes(), &errorResponse)
	assert.NoError(t, err)
	assert.Equal(t, "Machine not found", errorResponse["error"])
}
