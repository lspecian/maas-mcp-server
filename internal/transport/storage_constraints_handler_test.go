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
	"github.com/stretchr/testify/mock"
)

// MockStorageConstraintsService is a mock implementation of the storage constraints service
type MockStorageConstraintsService struct {
	mock.Mock
	*service.StorageService
}

func (m *MockStorageConstraintsService) SetStorageConstraints(ctx context.Context, machineID string, params models.StorageConstraintParams) error {
	args := m.Called(ctx, machineID, params)
	return args.Error(0)
}

func (m *MockStorageConstraintsService) GetStorageConstraints(ctx context.Context, machineID string) (*models.StorageConstraintContext, error) {
	args := m.Called(ctx, machineID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.StorageConstraintContext), args.Error(1)
}

func (m *MockStorageConstraintsService) ValidateStorageConstraints(ctx context.Context, machineID string, params models.StorageConstraintParams) (bool, []string, error) {
	args := m.Called(ctx, machineID, params)
	return args.Bool(0), args.Get(1).([]string), args.Error(2)
}

func (m *MockStorageConstraintsService) ApplyStorageConstraints(ctx context.Context, machineID string, params models.StorageConstraintParams) error {
	args := m.Called(ctx, machineID, params)
	return args.Error(0)
}

func (m *MockStorageConstraintsService) DeleteStorageConstraints(ctx context.Context, machineID string) error {
	args := m.Called(ctx, machineID)
	return args.Error(0)
}

func TestSetStorageConstraints(t *testing.T) {
	// Setup
	gin.SetMode(gin.TestMode)
	logger := logrus.New()
	logger.SetLevel(logrus.ErrorLevel)

	mockService := new(MockStorageConstraintsService)
	handler := NewStorageConstraintsHandler(mockService, logger)

	// Test cases
	tests := []struct {
		name           string
		machineID      string
		requestBody    interface{}
		mockError      error
		expectedStatus int
	}{
		{
			name:      "Success",
			machineID: "abc123",
			requestBody: models.StorageConstraintParams{
				Constraints: []models.StorageConstraint{
					{
						Type:       models.SizeConstraint,
						Value:      "100G",
						Operator:   ">=",
						TargetType: "disk",
					},
				},
			},
			mockError:      nil,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Empty machine ID",
			machineID:      "",
			requestBody:    models.StorageConstraintParams{},
			mockError:      nil,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:      "Service error",
			machineID: "abc123",
			requestBody: models.StorageConstraintParams{
				Constraints: []models.StorageConstraint{
					{
						Type:       models.SizeConstraint,
						Value:      "100G",
						Operator:   ">=",
						TargetType: "disk",
					},
				},
			},
			mockError:      &service.ServiceError{Err: service.ErrBadRequest, StatusCode: http.StatusBadRequest, Message: "Invalid constraint"},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Create a new router for each test
			router := gin.New()
			router.Use(gin.Recovery())

			// Setup the route
			router.POST("/api/machines/:id/storage-constraints", handler.SetStorageConstraints)

			// Setup mock expectations
			if tc.machineID != "" {
				mockService.On("SetStorageConstraints", mock.Anything, tc.machineID, mock.AnythingOfType("models.StorageConstraintParams")).Return(tc.mockError).Once()
			}

			// Create the request
			requestBody, _ := json.Marshal(tc.requestBody)
			req, _ := http.NewRequest("POST", "/api/machines/"+tc.machineID+"/storage-constraints", bytes.NewBuffer(requestBody))
			req.Header.Set("Content-Type", "application/json")

			// Create a response recorder
			w := httptest.NewRecorder()

			// Perform the request
			router.ServeHTTP(w, req)

			// Check the status code
			assert.Equal(t, tc.expectedStatus, w.Code)

			// Verify mock expectations
			mockService.AssertExpectations(t)
		})
	}
}

func TestGetStorageConstraints(t *testing.T) {
	// Setup
	gin.SetMode(gin.TestMode)
	logger := logrus.New()
	logger.SetLevel(logrus.ErrorLevel)

	mockService := new(MockStorageConstraintsService)
	handler := NewStorageConstraintsHandler(mockService, logger)

	// Test cases
	tests := []struct {
		name           string
		machineID      string
		mockResult     *models.StorageConstraintContext
		mockError      error
		expectedStatus int
	}{
		{
			name:      "Success",
			machineID: "abc123",
			mockResult: &models.StorageConstraintContext{
				Constraints: []models.StorageConstraintContextItem{
					{
						Type:       "size",
						Value:      "100G",
						Operator:   ">=",
						TargetType: "disk",
					},
				},
			},
			mockError:      nil,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Empty machine ID",
			machineID:      "",
			mockResult:     nil,
			mockError:      nil,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Service error",
			machineID:      "abc123",
			mockResult:     nil,
			mockError:      &service.ServiceError{Err: service.ErrNotFound, StatusCode: http.StatusNotFound, Message: "Machine not found"},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Create a new router for each test
			router := gin.New()
			router.Use(gin.Recovery())

			// Setup the route
			router.GET("/api/machines/:id/storage-constraints", handler.GetStorageConstraints)

			// Setup mock expectations
			if tc.machineID != "" {
				mockService.On("GetStorageConstraints", mock.Anything, tc.machineID).Return(tc.mockResult, tc.mockError).Once()
			}

			// Create the request
			req, _ := http.NewRequest("GET", "/api/machines/"+tc.machineID+"/storage-constraints", nil)

			// Create a response recorder
			w := httptest.NewRecorder()

			// Perform the request
			router.ServeHTTP(w, req)

			// Check the status code
			assert.Equal(t, tc.expectedStatus, w.Code)

			// Verify mock expectations
			mockService.AssertExpectations(t)
		})
	}
}

func TestValidateStorageConstraints(t *testing.T) {
	// Setup
	gin.SetMode(gin.TestMode)
	logger := logrus.New()
	logger.SetLevel(logrus.ErrorLevel)

	mockService := new(MockStorageConstraintsService)
	handler := NewStorageConstraintsHandler(mockService, logger)

	// Test cases
	tests := []struct {
		name           string
		machineID      string
		requestBody    interface{}
		mockValid      bool
		mockViolations []string
		mockError      error
		expectedStatus int
	}{
		{
			name:      "Success - Valid",
			machineID: "abc123",
			requestBody: models.StorageConstraintParams{
				Constraints: []models.StorageConstraint{
					{
						Type:       models.SizeConstraint,
						Value:      "100G",
						Operator:   ">=",
						TargetType: "disk",
					},
				},
			},
			mockValid:      true,
			mockViolations: []string{},
			mockError:      nil,
			expectedStatus: http.StatusOK,
		},
		{
			name:      "Success - Invalid with violations",
			machineID: "abc123",
			requestBody: models.StorageConstraintParams{
				Constraints: []models.StorageConstraint{
					{
						Type:       models.SizeConstraint,
						Value:      "1000G",
						Operator:   ">=",
						TargetType: "disk",
					},
				},
			},
			mockValid:      false,
			mockViolations: []string{"Machine does not have storage of size 1000G"},
			mockError:      nil,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Empty machine ID",
			machineID:      "",
			requestBody:    models.StorageConstraintParams{},
			mockValid:      false,
			mockViolations: nil,
			mockError:      nil,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:      "Service error",
			machineID: "abc123",
			requestBody: models.StorageConstraintParams{
				Constraints: []models.StorageConstraint{
					{
						Type:       models.SizeConstraint,
						Value:      "100G",
						Operator:   ">=",
						TargetType: "disk",
					},
				},
			},
			mockValid:      false,
			mockViolations: nil,
			mockError:      errors.New("service error"),
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Create a new router for each test
			router := gin.New()
			router.Use(gin.Recovery())

			// Setup the route
			router.POST("/api/machines/:id/storage-constraints/validate", handler.ValidateStorageConstraints)

			// Setup mock expectations
			if tc.machineID != "" {
				mockService.On("ValidateStorageConstraints", mock.Anything, tc.machineID, mock.AnythingOfType("models.StorageConstraintParams")).Return(tc.mockValid, tc.mockViolations, tc.mockError).Once()
			}

			// Create the request
			requestBody, _ := json.Marshal(tc.requestBody)
			req, _ := http.NewRequest("POST", "/api/machines/"+tc.machineID+"/storage-constraints/validate", bytes.NewBuffer(requestBody))
			req.Header.Set("Content-Type", "application/json")

			// Create a response recorder
			w := httptest.NewRecorder()

			// Perform the request
			router.ServeHTTP(w, req)

			// Check the status code
			assert.Equal(t, tc.expectedStatus, w.Code)

			// Verify mock expectations
			mockService.AssertExpectations(t)
		})
	}
}
