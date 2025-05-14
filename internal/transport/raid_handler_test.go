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

func TestListRAIDs(t *testing.T) {
	// Setup
	gin.SetMode(gin.TestMode)
	logger := logrus.New()
	logger.SetLevel(logrus.ErrorLevel)

	// Test cases
	tests := []struct {
		name           string
		machineID      string
		mockRAIDs      []models.RAIDContext
		mockError      error
		expectedStatus int
		expectedBody   string
	}{
		{
func (m *MockStorageService) ConfigureStorage(ctx context.Context, machineID string, config models.DesiredStorageConfiguration) error {
	// Mock implementation - just return nil for now
	return nil
}

			name:      "Success",
			machineID: "abc123",
			mockRAIDs: []models.RAIDContext{
				{
					ID:            "1",
					Name:          "raid-1",
					Level:         "raid-1",
					Size:          1000,
					UsedSize:      500,
					AvailableSize: 500,
					BlockDevices:  []string{"sda", "sdb"},
				},
				{
					ID:            "2",
					Name:          "raid-2",
					Level:         "raid-5",
					Size:          2000,
					UsedSize:      1000,
					AvailableSize: 1000,
					BlockDevices:  []string{"sdc", "sdd", "sde"},
				},
			},
			mockError:      nil,
			expectedStatus: http.StatusOK,
			expectedBody:   `{"raids":[{"id":"1","name":"raid-1","level":"raid-1","size_bytes":1000,"used_bytes":500,"available_bytes":500,"block_devices":["sda","sdb"]},{"id":"2","name":"raid-2","level":"raid-5","size_bytes":2000,"used_bytes":1000,"available_bytes":1000,"block_devices":["sdc","sdd","sde"]}]}`,
		},
		{
			name:           "Empty machine ID",
			machineID:      "",
			mockRAIDs:      nil,
			mockError:      nil,
			expectedStatus: http.StatusBadRequest,
			expectedBody:   `{"error":"Machine ID is required"}`,
		},
		{
			name:           "Service error",
			machineID:      "abc123",
			mockRAIDs:      nil,
			mockError:      errors.New("service error"),
			expectedStatus: http.StatusInternalServerError,
			expectedBody:   `{"error":"service error"}`,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Create a mock service
			mockService := &MockStorageService{
				ListRAIDsFunc: func(ctx context.Context, machineID string) ([]models.RAIDContext, error) {
					if machineID != tc.machineID {
						t.Errorf("Expected machineID %s, got %s", tc.machineID, machineID)
					}
					return tc.mockRAIDs, tc.mockError
				},
			}

			// Create the handler with the mock service
			handler := NewStorageHandler(mockService, logger)

			// Create a test router
			router := gin.New()
			router.GET("/machines/:id/raids", handler.ListRAIDs)

			// Create a test request
			req, _ := http.NewRequest("GET", "/machines/"+tc.machineID+"/raids", nil)
			resp := httptest.NewRecorder()

			// Serve the request
			router.ServeHTTP(resp, req)

			// Check the response
			assert.Equal(t, tc.expectedStatus, resp.Code)
			if tc.expectedStatus == http.StatusOK {
				// Compare JSON objects
				var expected, actual map[string]interface{}
				json.Unmarshal([]byte(tc.expectedBody), &expected)
				json.Unmarshal(resp.Body.Bytes(), &actual)
				assert.Equal(t, expected, actual)
			} else {
				// For error responses, just check if the error message is contained
				assert.Contains(t, resp.Body.String(), tc.expectedBody)
			}
		})
	}
}

func TestGetRAID(t *testing.T) {
	// Setup
	gin.SetMode(gin.TestMode)
	logger := logrus.New()
	logger.SetLevel(logrus.ErrorLevel)

	// Test cases
	tests := []struct {
		name           string
		machineID      string
		raidID         string
		mockRAID       *models.RAIDContext
		mockError      error
		expectedStatus int
		expectedBody   string
	}{
		{
			name:      "Success",
			machineID: "abc123",
			raidID:    "1",
			mockRAID: &models.RAIDContext{
				ID:            "1",
				Name:          "raid-1",
				Level:         "raid-1",
				Size:          1000,
				UsedSize:      500,
				AvailableSize: 500,
				BlockDevices:  []string{"sda", "sdb"},
			},
			mockError:      nil,
			expectedStatus: http.StatusOK,
			expectedBody:   `{"raid":{"id":"1","name":"raid-1","level":"raid-1","size_bytes":1000,"used_bytes":500,"available_bytes":500,"block_devices":["sda","sdb"]}}`,
		},
		{
			name:           "Empty machine ID",
			machineID:      "",
			raidID:         "1",
			mockRAID:       nil,
			mockError:      nil,
			expectedStatus: http.StatusBadRequest,
			expectedBody:   `{"error":"Machine ID is required"}`,
		},
		{
			name:           "Empty RAID ID",
			machineID:      "abc123",
			raidID:         "",
			mockRAID:       nil,
			mockError:      nil,
			expectedStatus: http.StatusBadRequest,
			expectedBody:   `{"error":"RAID ID is required"}`,
		},
		{
			name:           "Service error",
			machineID:      "abc123",
			raidID:         "1",
			mockRAID:       nil,
			mockError:      errors.New("service error"),
			expectedStatus: http.StatusInternalServerError,
			expectedBody:   `{"error":"service error"}`,
		},
		{
			name:           "Not found",
			machineID:      "abc123",
			raidID:         "999",
			mockRAID:       nil,
			mockError:      &service.ServiceError{Err: service.ErrNotFound, Message: "RAID not found"},
			expectedStatus: http.StatusNotFound,
			expectedBody:   `{"error":"RAID not found"}`,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Create a mock service
			mockService := &MockStorageService{
				GetRAIDFunc: func(ctx context.Context, machineID string, raidID string) (*models.RAIDContext, error) {
					if machineID != tc.machineID {
						t.Errorf("Expected machineID %s, got %s", tc.machineID, machineID)
					}
					if raidID != tc.raidID {
						t.Errorf("Expected raidID %s, got %s", tc.raidID, raidID)
					}
					return tc.mockRAID, tc.mockError
				},
			}

			// Create the handler with the mock service
			handler := NewStorageHandler(mockService, logger)

			// Create a test router
			router := gin.New()
			router.GET("/machines/:id/raids/:raid_id", handler.GetRAID)

			// Create a test request
			req, _ := http.NewRequest("GET", "/machines/"+tc.machineID+"/raids/"+tc.raidID, nil)
			resp := httptest.NewRecorder()

			// Serve the request
			router.ServeHTTP(resp, req)

			// Check the response
			assert.Equal(t, tc.expectedStatus, resp.Code)
			if tc.expectedStatus == http.StatusOK {
				// Compare JSON objects
				var expected, actual map[string]interface{}
				json.Unmarshal([]byte(tc.expectedBody), &expected)
				json.Unmarshal(resp.Body.Bytes(), &actual)
				assert.Equal(t, expected, actual)
			} else {
				// For error responses, just check if the error message is contained
				assert.Contains(t, resp.Body.String(), tc.expectedBody)
			}
		})
	}
}

func TestCreateRAID(t *testing.T) {
	// Setup
	gin.SetMode(gin.TestMode)
	logger := logrus.New()
	logger.SetLevel(logrus.ErrorLevel)

	// Test cases
	tests := []struct {
		name           string
		machineID      string
		requestBody    string
		mockRAID       *models.RAIDContext
		mockError      error
		expectedStatus int
		expectedBody   string
	}{
		{
			name:      "Success",
			machineID: "abc123",
			requestBody: `{
				"name": "raid-1",
				"level": "raid-1",
				"block_devices": [1, 2]
			}`,
			mockRAID: &models.RAIDContext{
				ID:           "1",
				Name:         "raid-1",
				Level:        "raid-1",
				BlockDevices: []string{"1", "2"},
			},
			mockError:      nil,
			expectedStatus: http.StatusOK,
			expectedBody:   `{"raid":{"id":"1","name":"raid-1","level":"raid-1","block_devices":["1","2"]}}`,
		},
		{
			name:           "Empty machine ID",
			machineID:      "",
			requestBody:    `{"name": "raid-1", "level": "raid-1", "block_devices": [1, 2]}`,
			mockRAID:       nil,
			mockError:      nil,
			expectedStatus: http.StatusBadRequest,
			expectedBody:   `{"error":"Machine ID is required"}`,
		},
		{
			name:           "Invalid request body",
			machineID:      "abc123",
			requestBody:    `{invalid json}`,
			mockRAID:       nil,
			mockError:      nil,
			expectedStatus: http.StatusBadRequest,
			expectedBody:   `{"error":"Invalid request body"}`,
		},
		{
			name:           "Missing required fields",
			machineID:      "abc123",
			requestBody:    `{"name": "raid-1"}`,
			mockRAID:       nil,
			mockError:      nil,
			expectedStatus: http.StatusBadRequest,
			expectedBody:   `{"error":"RAID level is required"}`,
		},
		{
			name:           "Service error",
			machineID:      "abc123",
			requestBody:    `{"name": "raid-1", "level": "raid-1", "block_devices": [1, 2]}`,
			mockRAID:       nil,
			mockError:      errors.New("service error"),
			expectedStatus: http.StatusInternalServerError,
			expectedBody:   `{"error":"service error"}`,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Create a mock service
			mockService := &MockStorageService{
				CreateRAIDFunc: func(ctx context.Context, machineID string, params models.RAIDParams) (*models.RAIDContext, error) {
					if machineID != tc.machineID {
						t.Errorf("Expected machineID %s, got %s", tc.machineID, machineID)
					}
					// Validate params if needed
					return tc.mockRAID, tc.mockError
				},
			}

			// Create the handler with the mock service
			handler := NewStorageHandler(mockService, logger)

			// Create a test router
			router := gin.New()
			router.POST("/machines/:id/raids", handler.CreateRAID)

			// Create a test request
			req, _ := http.NewRequest("POST", "/machines/"+tc.machineID+"/raids", bytes.NewBufferString(tc.requestBody))
			req.Header.Set("Content-Type", "application/json")
			resp := httptest.NewRecorder()

			// Serve the request
			router.ServeHTTP(resp, req)

			// Check the response
			assert.Equal(t, tc.expectedStatus, resp.Code)
			if tc.expectedStatus == http.StatusOK {
				// Compare JSON objects
				var expected, actual map[string]interface{}
				json.Unmarshal([]byte(tc.expectedBody), &expected)
				json.Unmarshal(resp.Body.Bytes(), &actual)
				assert.Equal(t, expected, actual)
			} else {
				// For error responses, just check if the error message is contained
				assert.Contains(t, resp.Body.String(), tc.expectedBody)
			}
		})
	}
}

func TestUpdateRAID(t *testing.T) {
	// Setup
	gin.SetMode(gin.TestMode)
	logger := logrus.New()
	logger.SetLevel(logrus.ErrorLevel)

	// Test cases
	tests := []struct {
		name           string
		machineID      string
		raidID         string
		requestBody    string
		mockRAID       *models.RAIDContext
		mockError      error
		expectedStatus int
		expectedBody   string
	}{
		{
			name:      "Success",
			machineID: "abc123",
			raidID:    "1",
			requestBody: `{
				"name": "updated-raid"
			}`,
			mockRAID: &models.RAIDContext{ // Should match the fields in RAIDContext
				ID:            "1",
				Name:          "updated-raid",
				Level:         "raid-1",
				Size:          10737418240,        // Example value, adjust if mock should have specific data
				UsedSize:      0,                  // Example value
				AvailableSize: 10737418240,        // Example value
				BlockDevices:  []string{"1", "2"}, // Example value
			},
			mockError:      nil,
			expectedStatus: http.StatusOK,
			expectedBody:   `{"raid":{"id":"1","name":"updated-raid","level":"raid-1","size_bytes":10737418240,"used_bytes":0,"available_bytes":10737418240,"block_devices":["1","2"]}}`,
		},
		{
			name:           "Empty machine ID",
			machineID:      "",
			raidID:         "1",
			requestBody:    `{"name": "updated-raid"}`,
			mockRAID:       nil,
			mockError:      nil,
			expectedStatus: http.StatusBadRequest,
			expectedBody:   `{"type":"validation","message":"Machine ID is required"}`, // Updated to match AppError JSON
		},
		{
			name:           "Empty RAID ID",
			machineID:      "abc123",
			raidID:         "", // This will cause a 404 from Gin router due to malformed path
			requestBody:    `{"name": "updated-raid"}`,
			mockRAID:       nil,
			mockError:      nil,
			expectedStatus: http.StatusNotFound,  // Gin will 404 before handler validation
			expectedBody:   "404 page not found", // Default Gin 404 body
		},
		{
			name:           "Invalid request body",
			machineID:      "abc123",
			raidID:         "1",
			requestBody:    `{invalid json}`,
			mockRAID:       nil,
			mockError:      nil,
			expectedStatus: http.StatusBadRequest,
			expectedBody:   `{"type":"validation","message":"Invalid request body"}`, // Updated
		},
		{
			name:           "Empty update params",
			machineID:      "abc123",
			raidID:         "1",
			requestBody:    `{}`,
			mockRAID:       nil,
			mockError:      nil,
			expectedStatus: http.StatusBadRequest,
			expectedBody:   `{"type":"validation","message":"at least one field must be set for update"}`, // Updated
		},
		{
			name:           "Service error",
			machineID:      "abc123",
			raidID:         "1",
			requestBody:    `{"name": "updated-raid"}`,
			mockRAID:       nil,
			mockError:      errors.New("service error"), // This will be wrapped as Internal by handleError
			expectedStatus: http.StatusInternalServerError,
			expectedBody:   `{"type":"internal","message":"service error"}`, // Updated
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Create a mock service
			mockService := &MockStorageService{
				UpdateRAIDFunc: func(ctx context.Context, machineID string, raidID string, params models.RAIDUpdateParams) (*models.RAIDContext, error) {
					if machineID != tc.machineID {
						t.Errorf("Expected machineID %s, got %s", tc.machineID, machineID)
					}
					if raidID != tc.raidID {
						t.Errorf("Expected raidID %s, got %s", tc.raidID, raidID)
					}
					// Validate params if needed
					return tc.mockRAID, tc.mockError
				},
			}

			// Create the handler with the mock service
			handler := NewStorageHandler(mockService, logger)

			// Create a test router
			router := gin.New()
			router.PUT("/machines/:id/raids/:raid_id", handler.UpdateRAID)

			// Create a test request
			req, _ := http.NewRequest("PUT", "/machines/"+tc.machineID+"/raids/"+tc.raidID, bytes.NewBufferString(tc.requestBody))
			req.Header.Set("Content-Type", "application/json")
			resp := httptest.NewRecorder()

			// Serve the request
			router.ServeHTTP(resp, req)

			// Check the response
			assert.Equal(t, tc.expectedStatus, resp.Code)
			if tc.expectedStatus == http.StatusOK {
				// Compare JSON objects
				var expected, actual map[string]interface{}
				json.Unmarshal([]byte(tc.expectedBody), &expected)
				json.Unmarshal(resp.Body.Bytes(), &actual)
				assert.Equal(t, expected, actual)
			} else {
				// For error responses, just check if the error message is contained
				assert.Contains(t, resp.Body.String(), tc.expectedBody)
			}
		})
	}
}

func TestDeleteRAID(t *testing.T) {
	// Setup
	gin.SetMode(gin.TestMode)
	logger := logrus.New()
	logger.SetLevel(logrus.ErrorLevel)

	// Test cases
	tests := []struct {
		name           string
		machineID      string
		raidID         string
		mockError      error
		expectedStatus int
		expectedBody   string
	}{
		{
			name:           "Success",
			machineID:      "abc123",
			raidID:         "1",
			mockError:      nil,
			expectedStatus: http.StatusOK,
			expectedBody:   `{"message":"RAID array deleted successfully"}`,
		},
		{
			name:           "Empty machine ID",
			machineID:      "",
			raidID:         "1",
			mockError:      nil,
			expectedStatus: http.StatusBadRequest,
			expectedBody:   `{"type":"validation","message":"Machine ID is required"}`, // Updated
		},
		{
			name:           "Empty RAID ID",
			machineID:      "abc123",
			raidID:         "", // This will cause a 404 from Gin router
			mockError:      nil,
			expectedStatus: http.StatusNotFound,  // Gin will 404
			expectedBody:   "404 page not found", // Default Gin 404 body
		},
		{
			name:           "Service error",
			machineID:      "abc123",
			raidID:         "1",
			mockError:      errors.New("service error"), // Wrapped as Internal by handleError
			expectedStatus: http.StatusInternalServerError,
			expectedBody:   `{"type":"internal","message":"service error"}`, // Updated
		},
		{
			name:           "Not found",
			machineID:      "abc123",
			raidID:         "999",
			mockError:      &service.ServiceError{Err: service.ErrNotFound, Message: "RAID not found"},
			expectedStatus: http.StatusNotFound,
			expectedBody:   `{"type":"not_found","message":"RAID not found"}`, // Updated
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Create a mock service
			mockService := &MockStorageService{
				DeleteRAIDFunc: func(ctx context.Context, machineID string, raidID string) error {
					if machineID != tc.machineID {
						t.Errorf("Expected machineID %s, got %s", tc.machineID, machineID)
					}
					if raidID != tc.raidID {
						t.Errorf("Expected raidID %s, got %s", tc.raidID, raidID)
					}
					return tc.mockError
				},
			}

			// Create the handler with the mock service
			handler := NewStorageHandler(mockService, logger)

			// Create a test router
			router := gin.New()
			router.DELETE("/machines/:id/raids/:raid_id", handler.DeleteRAID)

			// Create a test request
			req, _ := http.NewRequest("DELETE", "/machines/"+tc.machineID+"/raids/"+tc.raidID, nil)
			resp := httptest.NewRecorder()

			// Serve the request
			router.ServeHTTP(resp, req)

			// Check the response
			assert.Equal(t, tc.expectedStatus, resp.Code)
			if tc.expectedStatus == http.StatusOK {
				// Compare JSON objects
				var expected, actual map[string]interface{}
				json.Unmarshal([]byte(tc.expectedBody), &expected)
				json.Unmarshal(resp.Body.Bytes(), &actual)
				assert.Equal(t, expected, actual)
			} else {
				// For error responses, just check if the error message is contained
				assert.Contains(t, resp.Body.String(), tc.expectedBody)
			}
		})
	}
}
