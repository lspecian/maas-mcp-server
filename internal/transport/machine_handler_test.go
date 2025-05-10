package transport

import (
	"bytes"
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

// MockMachineService is a mock implementation of the MachineService
type MockMachineService struct {
	ListMachinesFunc         func(ctx context.Context, filters map[string]string) ([]models.MachineContext, error)
	GetMachineFunc           func(ctx context.Context, id string) (*models.MachineContext, error)
	GetMachinePowerStateFunc func(ctx context.Context, id string) (string, error)
	AllocateMachineFunc      func(ctx context.Context, constraints map[string]string) (*models.MachineContext, error)
	DeployMachineFunc        func(ctx context.Context, id string, osConfig map[string]string) (*models.MachineContext, error)
	ReleaseMachineFunc       func(ctx context.Context, id string, comment string) error
}

func (m *MockMachineService) ListMachines(ctx context.Context, filters map[string]string) ([]models.MachineContext, error) {
	if m.ListMachinesFunc != nil {
		return m.ListMachinesFunc(ctx, filters)
	}
	return nil, errors.New("ListMachinesFunc not implemented")
}

func (m *MockMachineService) GetMachine(ctx context.Context, id string) (*models.MachineContext, error) {
	if m.GetMachineFunc != nil {
		return m.GetMachineFunc(ctx, id)
	}
	return nil, errors.New("GetMachineFunc not implemented")
}

func (m *MockMachineService) GetMachinePowerState(ctx context.Context, id string) (string, error) {
	if m.GetMachinePowerStateFunc != nil {
		return m.GetMachinePowerStateFunc(ctx, id)
	}
	return "", errors.New("GetMachinePowerStateFunc not implemented")
}

func (m *MockMachineService) AllocateMachine(ctx context.Context, constraints map[string]string) (*models.MachineContext, error) {
	if m.AllocateMachineFunc != nil {
		return m.AllocateMachineFunc(ctx, constraints)
	}
	return nil, errors.New("AllocateMachineFunc not implemented")
}

func (m *MockMachineService) DeployMachine(ctx context.Context, id string, osConfig map[string]string) (*models.MachineContext, error) {
	if m.DeployMachineFunc != nil {
		return m.DeployMachineFunc(ctx, id, osConfig)
	}
	return nil, errors.New("DeployMachineFunc not implemented")
}

func (m *MockMachineService) ReleaseMachine(ctx context.Context, id string, comment string) error {
	if m.ReleaseMachineFunc != nil {
		return m.ReleaseMachineFunc(ctx, id, comment)
	}
	return errors.New("ReleaseMachineFunc not implemented")
}

func setupTest() (*gin.Engine, *MockMachineService) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	mockService := new(MockMachineService)
	logger := logrus.New()
	logger.SetLevel(logrus.FatalLevel) // Suppress logs during tests

	// Create the handler with the mock service
	handler := NewMachineHandler(mockService, logger)
	handler.RegisterRoutes(router.Group(""))

	return router, mockService
}

func TestListMachines(t *testing.T) {
	router, mockService := setupTest()

	// Test case 1: Successful response
	machines := []models.MachineContext{
		{
			ID:           "machine-1",
			Name:         "test-machine-1",
			Status:       "Ready",
			Architecture: "amd64",
			PowerState:   "on",
		},
		{
			ID:           "machine-2",
			Name:         "test-machine-2",
			Status:       "Deployed",
			Architecture: "amd64",
			PowerState:   "on",
		},
	}

	mockService.ListMachinesFunc = func(ctx context.Context, filters map[string]string) ([]models.MachineContext, error) {
		return machines, nil
	}

	req := httptest.NewRequest(http.MethodGet, "/machines", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string][]models.MachineContext
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Len(t, response["machines"], 2)
	assert.Equal(t, "machine-1", response["machines"][0].ID)
	assert.Equal(t, "machine-2", response["machines"][1].ID)

	// Test case 2: Service error
	mockService.ListMachinesFunc = func(ctx context.Context, filters map[string]string) ([]models.MachineContext, error) {
		return nil, &service.ServiceError{
			Err:        service.ErrInternalServer,
			StatusCode: http.StatusInternalServerError,
			Message:    "Internal server error",
		}
	}

	req = httptest.NewRequest(http.MethodGet, "/machines", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)

	var errorResponse map[string]string
	err = json.Unmarshal(w.Body.Bytes(), &errorResponse)
	assert.NoError(t, err)
	assert.Equal(t, "Internal server error", errorResponse["error"])
}

func TestGetMachine(t *testing.T) {
	router, mockService := setupTest()

	// Test case 1: Successful response
	machine := &models.MachineContext{
		ID:           "machine-1",
		Name:         "test-machine-1",
		Status:       "Ready",
		Architecture: "amd64",
		PowerState:   "on",
	}

	mockService.GetMachineFunc = func(ctx context.Context, id string) (*models.MachineContext, error) {
		if id == "machine-1" {
			return machine, nil
		}
		return nil, errors.New("unexpected id")
	}

	req := httptest.NewRequest(http.MethodGet, "/machines/machine-1", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response models.MachineContext
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "machine-1", response.ID)
	assert.Equal(t, "test-machine-1", response.Name)

	// Test case 2: Machine not found
	mockService.GetMachineFunc = func(ctx context.Context, id string) (*models.MachineContext, error) {
		if id == "non-existent" {
			return nil, &service.ServiceError{
				Err:        service.ErrNotFound,
				StatusCode: http.StatusNotFound,
				Message:    "Machine not found",
			}
		}
		return nil, errors.New("unexpected id")
	}

	req = httptest.NewRequest(http.MethodGet, "/machines/non-existent", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)

	var errorResponse map[string]string
	err = json.Unmarshal(w.Body.Bytes(), &errorResponse)
	assert.NoError(t, err)
	assert.Equal(t, "Machine not found", errorResponse["error"])
}

func TestGetMachinePowerState(t *testing.T) {
	router, mockService := setupTest()

	// Test case 1: Successful response
	mockService.GetMachinePowerStateFunc = func(ctx context.Context, id string) (string, error) {
		if id == "machine-1" {
			return "on", nil
		}
		return "", errors.New("unexpected id")
	}

	req := httptest.NewRequest(http.MethodGet, "/machines/machine-1/power", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "machine-1", response["id"])
	assert.Equal(t, "on", response["power_state"])

	// Test case 2: Machine not found
	mockService.GetMachinePowerStateFunc = func(ctx context.Context, id string) (string, error) {
		if id == "non-existent" {
			return "", &service.ServiceError{
				Err:        service.ErrNotFound,
				StatusCode: http.StatusNotFound,
				Message:    "Machine not found",
			}
		}
		return "", errors.New("unexpected id")
	}

	req = httptest.NewRequest(http.MethodGet, "/machines/non-existent/power", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)

	var errorResponse map[string]string
	err = json.Unmarshal(w.Body.Bytes(), &errorResponse)
	assert.NoError(t, err)
	assert.Equal(t, "Machine not found", errorResponse["error"])
}

func TestAllocateMachine(t *testing.T) {
	router, mockService := setupTest()

	// Test case 1: Successful allocation
	machine := &models.MachineContext{
		ID:           "machine-1",
		Name:         "test-machine-1",
		Status:       "Allocated",
		Architecture: "amd64",
		PowerState:   "off",
	}

	constraints := map[string]string{
		"architecture": "amd64",
		"zone":         "default",
	}

	mockService.AllocateMachineFunc = func(ctx context.Context, c map[string]string) (*models.MachineContext, error) {
		return machine, nil
	}

	requestBody, _ := json.Marshal(map[string]interface{}{
		"constraints": constraints,
	})

	req := httptest.NewRequest(http.MethodPost, "/machines/allocate", bytes.NewBuffer(requestBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response models.MachineContext
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "machine-1", response.ID)
	assert.Equal(t, "Allocated", response.Status)

	// Test case 2: Invalid request format
	req = httptest.NewRequest(http.MethodPost, "/machines/allocate", bytes.NewBuffer([]byte("invalid json")))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	// Test case 3: Service error
	mockService.AllocateMachineFunc = func(ctx context.Context, c map[string]string) (*models.MachineContext, error) {
		return nil, &service.ServiceError{
			Err:        service.ErrServiceUnavailable,
			StatusCode: http.StatusServiceUnavailable,
			Message:    "MAAS service unavailable",
		}
	}

	requestBody, _ = json.Marshal(map[string]interface{}{
		"constraints": map[string]string{},
	})

	req = httptest.NewRequest(http.MethodPost, "/machines/allocate", bytes.NewBuffer(requestBody))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusServiceUnavailable, w.Code)

	var errorResponse map[string]string
	err = json.Unmarshal(w.Body.Bytes(), &errorResponse)
	assert.NoError(t, err)
	assert.Equal(t, "MAAS service unavailable", errorResponse["error"])
}

func TestDeployMachine(t *testing.T) {
	router, mockService := setupTest()

	// Test case 1: Successful deployment
	machine := &models.MachineContext{
		ID:           "machine-1",
		Name:         "test-machine-1",
		Status:       "Deploying",
		Architecture: "amd64",
		PowerState:   "on",
	}

	osConfig := map[string]string{
		"distro_series": "ubuntu",
		"hwe_kernel":    "hwe-22.04",
	}

	mockService.DeployMachineFunc = func(ctx context.Context, id string, config map[string]string) (*models.MachineContext, error) {
		if id == "machine-1" {
			return machine, nil
		}
		return nil, errors.New("unexpected id")
	}

	requestBody, _ := json.Marshal(map[string]interface{}{
		"os_config": osConfig,
	})

	req := httptest.NewRequest(http.MethodPost, "/machines/machine-1/deploy", bytes.NewBuffer(requestBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response models.MachineContext
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "machine-1", response.ID)
	assert.Equal(t, "Deploying", response.Status)

	// Test case 2: Machine not found
	mockService.DeployMachineFunc = func(ctx context.Context, id string, config map[string]string) (*models.MachineContext, error) {
		if id == "non-existent" {
			return nil, &service.ServiceError{
				Err:        service.ErrNotFound,
				StatusCode: http.StatusNotFound,
				Message:    "Machine not found",
			}
		}
		return nil, errors.New("unexpected id")
	}

	requestBody, _ = json.Marshal(map[string]interface{}{
		"os_config": osConfig,
	})

	req = httptest.NewRequest(http.MethodPost, "/machines/non-existent/deploy", bytes.NewBuffer(requestBody))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)

	var errorResponse map[string]string
	err = json.Unmarshal(w.Body.Bytes(), &errorResponse)
	assert.NoError(t, err)
	assert.Equal(t, "Machine not found", errorResponse["error"])
}

func TestReleaseMachine(t *testing.T) {
	router, mockService := setupTest()

	// Test case 1: Successful release
	mockService.ReleaseMachineFunc = func(ctx context.Context, id string, comment string) error {
		if id == "machine-1" && comment == "Test release" {
			return nil
		}
		return errors.New("unexpected id or comment")
	}

	requestBody, _ := json.Marshal(map[string]interface{}{
		"comment": "Test release",
	})

	req := httptest.NewRequest(http.MethodPost, "/machines/machine-1/release", bytes.NewBuffer(requestBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "Machine released successfully", response["message"])

	// Test case 2: Machine not found
	mockService.ReleaseMachineFunc = func(ctx context.Context, id string, comment string) error {
		if id == "non-existent" {
			return &service.ServiceError{
				Err:        service.ErrNotFound,
				StatusCode: http.StatusNotFound,
				Message:    "Machine not found",
			}
		}
		return errors.New("unexpected id")
	}

	req = httptest.NewRequest(http.MethodPost, "/machines/non-existent/release", nil)
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)

	var errorResponse map[string]string
	err = json.Unmarshal(w.Body.Bytes(), &errorResponse)
	assert.NoError(t, err)
	assert.Equal(t, "Machine not found", errorResponse["error"])

	// Test case 3: Empty comment
	mockService.ReleaseMachineFunc = func(ctx context.Context, id string, comment string) error {
		if id == "machine-2" && comment == "" {
			return nil
		}
		return errors.New("unexpected id or comment")
	}

	req = httptest.NewRequest(http.MethodPost, "/machines/machine-2/release", nil)
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestHandleError(t *testing.T) {
	// Create a test context
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	// Create a handler instance
	logger := logrus.New()
	logger.SetLevel(logrus.FatalLevel)
	handler := &MachineHandler{
		logger: logger,
	}

	// Test case 1: ServiceError
	serviceErr := &service.ServiceError{
		Err:        errors.New("test error"),
		StatusCode: http.StatusBadRequest,
		Message:    "Bad request",
	}

	handler.handleError(c, serviceErr)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "Bad request", response["error"])

	// Test case 2: Regular error
	w = httptest.NewRecorder()
	c, _ = gin.CreateTestContext(w)

	regularErr := errors.New("regular error")

	handler.handleError(c, regularErr)

	assert.Equal(t, http.StatusInternalServerError, w.Code)

	err = json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "regular error", response["error"])
}
