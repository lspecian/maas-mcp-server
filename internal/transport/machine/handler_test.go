package machine

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"

	"github.com/lspecian/maas-mcp-server/internal/models"
	machineservice "github.com/lspecian/maas-mcp-server/internal/service/machine"
)

// MockService is a mock implementation of the machine service
type MockService struct {
	ListMachinesFn         func(ctx context.Context, filters map[string]string) ([]models.MachineContext, error)
	GetMachineFn           func(ctx context.Context, id string) (*models.MachineContext, error)
	GetMachinePowerStateFn func(ctx context.Context, id string) (string, error)
	AllocateMachineFn      func(ctx context.Context, constraints map[string]string) (*models.MachineContext, error)
	DeployMachineFn        func(ctx context.Context, id string, osConfig map[string]string) (*models.MachineContext, error)
	ReleaseMachineFn       func(ctx context.Context, id string, comment string) error
	PowerOnMachineFn       func(ctx context.Context, id string) (*models.MachineContext, error)
	PowerOffMachineFn      func(ctx context.Context, id string) (*models.MachineContext, error)
}

// Ensure MockService implements Service interface
var _ Service = (*MockService)(nil)

// ListMachines implements the Service interface
func (m *MockService) ListMachines(ctx context.Context, filters map[string]string) ([]models.MachineContext, error) {
	return m.ListMachinesFn(ctx, filters)
}

// GetMachine implements the Service interface
func (m *MockService) GetMachine(ctx context.Context, id string) (*models.MachineContext, error) {
	return m.GetMachineFn(ctx, id)
}

// GetMachinePowerState implements the Service interface
func (m *MockService) GetMachinePowerState(ctx context.Context, id string) (string, error) {
	return m.GetMachinePowerStateFn(ctx, id)
}

// AllocateMachine implements the Service interface
func (m *MockService) AllocateMachine(ctx context.Context, constraints map[string]string) (*models.MachineContext, error) {
	return m.AllocateMachineFn(ctx, constraints)
}

// DeployMachine implements the Service interface
func (m *MockService) DeployMachine(ctx context.Context, id string, osConfig map[string]string) (*models.MachineContext, error) {
	return m.DeployMachineFn(ctx, id, osConfig)
}

// ReleaseMachine implements the Service interface
func (m *MockService) ReleaseMachine(ctx context.Context, id string, comment string) error {
	return m.ReleaseMachineFn(ctx, id, comment)
}

// PowerOnMachine implements the Service interface
func (m *MockService) PowerOnMachine(ctx context.Context, id string) (*models.MachineContext, error) {
	return m.PowerOnMachineFn(ctx, id)
}

// PowerOffMachine implements the Service interface
func (m *MockService) PowerOffMachine(ctx context.Context, id string) (*models.MachineContext, error) {
	return m.PowerOffMachineFn(ctx, id)
}

// Helper function to create a test logger
func createTestLogger() *logrus.Logger {
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)
	return logger
}

// Helper function to create a test router
func createTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(gin.Recovery())
	return router
}

// Helper function to create a test machine context
func createTestMachineContext(id string) *models.MachineContext {
	return &models.MachineContext{
		ID:           id,
		Name:         "test-machine-" + id,
		Status:       "Ready",
		Architecture: "amd64/generic",
		PowerState:   "off",
		Zone:         "default",
		Pool:         "default",
		Tags:         []string{"test", "virtual"},
		CPUCount:     4,
		Memory:       8192,
		OSInfo: models.OSInfo{
			System:       "ubuntu",
			Distribution: "focal",
			Release:      "20.04",
		},
		LastUpdated: time.Now(),
		Metadata:    map[string]string{"test": "value"},
	}
}

// ServiceError is a mock implementation of the service error
type ServiceError struct {
	Err        error
	StatusCode int
	Message    string
}

// Error implements the error interface
func (e *ServiceError) Error() string {
	return e.Message
}

// TestListMachines tests the ListMachines handler
func TestListMachines(t *testing.T) {
	// Test case 1: Successful listing
	t.Run("Success", func(t *testing.T) {
		// Setup mock service
		machines := []models.MachineContext{
			*createTestMachineContext("1"),
			*createTestMachineContext("2"),
		}

		mockService := &MockService{
			ListMachinesFn: func(ctx context.Context, filters map[string]string) ([]models.MachineContext, error) {
				assert.Equal(t, "default", filters["zone"])
				return machines, nil
			},
		}

		// Setup handler and router
		logger := createTestLogger()
		handler := NewHandler(mockService, logger)
		router := createTestRouter()
		handler.RegisterRoutes(router)

		// Create request
		req, _ := http.NewRequest("GET", "/api/v1/machines?zone=default", nil)
		resp := httptest.NewRecorder()

		// Serve request
		router.ServeHTTP(resp, req)

		// Assertions
		assert.Equal(t, http.StatusOK, resp.Code)

		var result []models.MachineContext
		err := json.Unmarshal(resp.Body.Bytes(), &result)
		assert.NoError(t, err)
		assert.Len(t, result, 2)
		assert.Equal(t, "1", result[0].ID)
		assert.Equal(t, "2", result[1].ID)
	})

	// Test case 2: Service error
	t.Run("ServiceError", func(t *testing.T) {
		// Setup mock service
		mockService := &MockService{
			ListMachinesFn: func(ctx context.Context, filters map[string]string) ([]models.MachineContext, error) {
				return nil, &machineservice.ServiceError{
					Err:        errors.New("service error"),
					StatusCode: http.StatusInternalServerError,
					Message:    "Failed to list machines",
				}
			},
		}

		// Setup handler and router
		logger := createTestLogger()
		handler := NewHandler(mockService, logger)
		router := createTestRouter()
		handler.RegisterRoutes(router)

		// Create request
		req, _ := http.NewRequest("GET", "/api/v1/machines", nil)
		resp := httptest.NewRecorder()

		// Serve request
		router.ServeHTTP(resp, req)

		// Assertions
		assert.Equal(t, http.StatusInternalServerError, resp.Code)

		var result map[string]string
		err := json.Unmarshal(resp.Body.Bytes(), &result)
		assert.NoError(t, err)
		assert.Contains(t, result, "error")
	})
}

// TestGetMachine tests the GetMachine handler
func TestGetMachine(t *testing.T) {
	// Test case 1: Successful retrieval
	t.Run("Success", func(t *testing.T) {
		// Setup mock service
		machine := createTestMachineContext("1")
		mockService := &MockService{
			GetMachineFn: func(ctx context.Context, id string) (*models.MachineContext, error) {
				assert.Equal(t, "1", id)
				return machine, nil
			},
		}

		// Setup handler and router
		logger := createTestLogger()
		handler := NewHandler(mockService, logger)
		router := createTestRouter()
		handler.RegisterRoutes(router)

		// Create request
		req, _ := http.NewRequest("GET", "/api/v1/machines/1", nil)
		resp := httptest.NewRecorder()

		// Serve request
		router.ServeHTTP(resp, req)

		// Assertions
		assert.Equal(t, http.StatusOK, resp.Code)

		var result models.MachineContext
		err := json.Unmarshal(resp.Body.Bytes(), &result)
		assert.NoError(t, err)
		assert.Equal(t, "1", result.ID)
		assert.Equal(t, "test-machine-1", result.Name)
	})

	// Test case 2: Not found
	t.Run("NotFound", func(t *testing.T) {
		// Setup mock service
		mockService := &MockService{
			GetMachineFn: func(ctx context.Context, id string) (*models.MachineContext, error) {
				assert.Equal(t, "999", id)
				return nil, &machineservice.ServiceError{
					Err:        errors.New("not found"),
					StatusCode: http.StatusNotFound,
					Message:    "Machine not found",
				}
			},
		}

		// Setup handler and router
		logger := createTestLogger()
		handler := NewHandler(mockService, logger)
		router := createTestRouter()
		handler.RegisterRoutes(router)

		// Create request
		req, _ := http.NewRequest("GET", "/api/v1/machines/999", nil)
		resp := httptest.NewRecorder()

		// Serve request
		router.ServeHTTP(resp, req)

		// Assertions
		assert.Equal(t, http.StatusNotFound, resp.Code)

		var result map[string]string
		err := json.Unmarshal(resp.Body.Bytes(), &result)
		assert.NoError(t, err)
		assert.Contains(t, result, "error")
		assert.Equal(t, "Machine not found", result["error"])
	})
}

// TestPowerOnMachine tests the PowerOnMachine handler
func TestPowerOnMachine(t *testing.T) {
	// Test case 1: Successful power on
	t.Run("Success", func(t *testing.T) {
		// Setup mock service
		machine := createTestMachineContext("1")
		machine.PowerState = "on"
		mockService := &MockService{
			PowerOnMachineFn: func(ctx context.Context, id string) (*models.MachineContext, error) {
				assert.Equal(t, "1", id)
				return machine, nil
			},
		}

		// Setup handler and router
		logger := createTestLogger()
		handler := NewHandler(mockService, logger)
		router := createTestRouter()
		handler.RegisterRoutes(router)

		// Create request
		req, _ := http.NewRequest("POST", "/api/v1/machines/1/power/on", nil)
		resp := httptest.NewRecorder()

		// Serve request
		router.ServeHTTP(resp, req)

		// Assertions
		assert.Equal(t, http.StatusOK, resp.Code)

		var result models.MachineContext
		err := json.Unmarshal(resp.Body.Bytes(), &result)
		assert.NoError(t, err)
		assert.Equal(t, "1", result.ID)
		assert.Equal(t, "on", result.PowerState)
	})

	// Test case 2: Service error
	t.Run("ServiceError", func(t *testing.T) {
		// Setup mock service
		mockService := &MockService{
			PowerOnMachineFn: func(ctx context.Context, id string) (*models.MachineContext, error) {
				assert.Equal(t, "999", id)
				return nil, &machineservice.ServiceError{
					Err:        errors.New("power on failed"),
					StatusCode: http.StatusInternalServerError,
					Message:    "Failed to power on machine",
				}
			},
		}

		// Setup handler and router
		logger := createTestLogger()
		handler := NewHandler(mockService, logger)
		router := createTestRouter()
		handler.RegisterRoutes(router)

		// Create request
		req, _ := http.NewRequest("POST", "/api/v1/machines/999/power/on", nil)
		resp := httptest.NewRecorder()

		// Serve request
		router.ServeHTTP(resp, req)

		// Assertions
		assert.Equal(t, http.StatusInternalServerError, resp.Code)

		var result map[string]string
		err := json.Unmarshal(resp.Body.Bytes(), &result)
		assert.NoError(t, err)
		assert.Contains(t, result, "error")
		assert.Equal(t, "Failed to power on machine", result["error"])
	})
}

// TestAllocateMachine tests the AllocateMachine handler
func TestAllocateMachine(t *testing.T) {
	// Test case 1: Successful allocation
	t.Run("Success", func(t *testing.T) {
		// Setup mock service
		machine := createTestMachineContext("1")
		mockService := &MockService{
			AllocateMachineFn: func(ctx context.Context, constraints map[string]string) (*models.MachineContext, error) {
				assert.Equal(t, "amd64/generic", constraints["architecture"])
				assert.Equal(t, "default", constraints["zone"])
				return machine, nil
			},
		}

		// Setup handler and router
		logger := createTestLogger()
		handler := NewHandler(mockService, logger)
		router := createTestRouter()
		handler.RegisterRoutes(router)

		// Create request body
		constraints := map[string]string{
			"architecture": "amd64/generic",
			"zone":         "default",
		}
		body, _ := json.Marshal(constraints)

		// Create request
		req, _ := http.NewRequest("POST", "/api/v1/machines", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		resp := httptest.NewRecorder()

		// Serve request
		router.ServeHTTP(resp, req)

		// Assertions
		assert.Equal(t, http.StatusOK, resp.Code)

		var result models.MachineContext
		err := json.Unmarshal(resp.Body.Bytes(), &result)
		assert.NoError(t, err)
		assert.Equal(t, "1", result.ID)
	})

	// Test case 2: Invalid request body
	t.Run("InvalidRequestBody", func(t *testing.T) {
		// Setup mock service
		mockService := &MockService{}

		// Setup handler and router
		logger := createTestLogger()
		handler := NewHandler(mockService, logger)
		router := createTestRouter()
		handler.RegisterRoutes(router)

		// Create request with invalid JSON
		req, _ := http.NewRequest("POST", "/api/v1/machines", bytes.NewBufferString("invalid json"))
		req.Header.Set("Content-Type", "application/json")
		resp := httptest.NewRecorder()

		// Serve request
		router.ServeHTTP(resp, req)

		// Assertions
		assert.Equal(t, http.StatusBadRequest, resp.Code)

		var result map[string]string
		err := json.Unmarshal(resp.Body.Bytes(), &result)
		assert.NoError(t, err)
		assert.Contains(t, result, "error")
		assert.Equal(t, "Invalid request body", result["error"])
	})
}
