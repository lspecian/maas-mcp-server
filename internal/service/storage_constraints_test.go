package service

import (
	"context"
	"errors"
	"net/http"
	"testing"

	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"

	"github.com/lspecian/maas-mcp-server/internal/models"
)

func TestSetStorageConstraints(t *testing.T) {
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
		params         models.StorageConstraintParams
		mockError      error
		expectedError  bool
		expectedStatus int
	}{
		{
			name:      "Success",
			machineID: "abc123",
			params: models.StorageConstraintParams{
				Constraints: []models.StorageConstraint{
					{
						Type:       models.SizeConstraint,
						Value:      "100G",
						Operator:   ">=",
						TargetType: "disk",
					},
				},
			},
			mockError:     nil,
			expectedError: false,
		},
		{
			name:           "Empty machine ID",
			machineID:      "",
			params:         models.StorageConstraintParams{},
			mockError:      nil,
			expectedError:  true,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:      "Empty constraints",
			machineID: "abc123",
			params:    models.StorageConstraintParams{},
			mockError: nil,
			// This should fail validation
			expectedError:  true,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:      "Client error",
			machineID: "abc123",
			params: models.StorageConstraintParams{
				Constraints: []models.StorageConstraint{
					{
						Type:       models.SizeConstraint,
						Value:      "100G",
						Operator:   ">=",
						TargetType: "disk",
					},
				},
			},
			mockError:      errors.New("client error"),
			expectedError:  true,
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Setup mock expectations
			if tc.machineID != "" && len(tc.params.Constraints) > 0 {
				mockClient.On("SetStorageConstraints", tc.machineID, tc.params).Return(tc.mockError).Once()
			}

			// Call the service method
			err := service.SetStorageConstraints(context.Background(), tc.machineID, tc.params)

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

func TestGetStorageConstraints(t *testing.T) {
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
		mockParams     *models.StorageConstraintParams
		mockError      error
		expectedError  bool
		expectedStatus int
	}{
		{
			name:      "Success",
			machineID: "abc123",
			mockParams: &models.StorageConstraintParams{
				Constraints: []models.StorageConstraint{
					{
						Type:       models.SizeConstraint,
						Value:      "100G",
						Operator:   ">=",
						TargetType: "disk",
					},
				},
			},
			mockError:     nil,
			expectedError: false,
		},
		{
			name:           "Empty machine ID",
			machineID:      "",
			mockParams:     nil,
			mockError:      nil,
			expectedError:  true,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Client error",
			machineID:      "abc123",
			mockParams:     nil,
			mockError:      errors.New("client error"),
			expectedError:  true,
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Setup mock expectations
			if tc.machineID != "" {
				mockClient.On("GetStorageConstraints", tc.machineID).Return(tc.mockParams, tc.mockError).Once()
			}

			// Call the service method
			result, err := service.GetStorageConstraints(context.Background(), tc.machineID)

			// Check the results
			if tc.expectedError {
				assert.Error(t, err)
				assert.Nil(t, result)
				if svcErr, ok := err.(*ServiceError); ok {
					assert.Equal(t, tc.expectedStatus, svcErr.StatusCode)
				}
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				// Check that the conversion was done correctly
				if tc.mockParams != nil && len(tc.mockParams.Constraints) > 0 {
					assert.Equal(t, string(tc.mockParams.Constraints[0].Type), result.Constraints[0].Type)
					assert.Equal(t, tc.mockParams.Constraints[0].Value, result.Constraints[0].Value)
				}
			}

			// Verify all expectations were met
			mockClient.AssertExpectations(t)
		})
	}
}

func TestValidateStorageConstraints(t *testing.T) {
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
		params         models.StorageConstraintParams
		mockValid      bool
		mockViolations []string
		mockError      error
		expectedError  bool
		expectedStatus int
	}{
		{
			name:      "Success - Valid",
			machineID: "abc123",
			params: models.StorageConstraintParams{
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
			expectedError:  false,
		},
		{
			name:      "Success - Invalid with violations",
			machineID: "abc123",
			params: models.StorageConstraintParams{
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
			expectedError:  false,
		},
		{
			name:           "Empty machine ID",
			machineID:      "",
			params:         models.StorageConstraintParams{},
			mockValid:      false,
			mockViolations: nil,
			mockError:      nil,
			expectedError:  true,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:      "Empty constraints",
			machineID: "abc123",
			params:    models.StorageConstraintParams{},
			mockValid: false,
			// This should fail validation
			expectedError:  true,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:      "Client error",
			machineID: "abc123",
			params: models.StorageConstraintParams{
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
			mockError:      errors.New("client error"),
			expectedError:  true,
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Setup mock expectations
			if tc.machineID != "" && len(tc.params.Constraints) > 0 {
				mockClient.On("ValidateStorageConstraints", tc.machineID, tc.params).Return(tc.mockValid, tc.mockViolations, tc.mockError).Once()
			}

			// Call the service method
			valid, violations, err := service.ValidateStorageConstraints(context.Background(), tc.machineID, tc.params)

			// Check the results
			if tc.expectedError {
				assert.Error(t, err)
				if svcErr, ok := err.(*ServiceError); ok {
					assert.Equal(t, tc.expectedStatus, svcErr.StatusCode)
				}
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tc.mockValid, valid)
				assert.Equal(t, tc.mockViolations, violations)
			}

			// Verify all expectations were met
			mockClient.AssertExpectations(t)
		})
	}
}

func TestApplyStorageConstraints(t *testing.T) {
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
		params         models.StorageConstraintParams
		mockError      error
		expectedError  bool
		expectedStatus int
	}{
		{
			name:      "Success",
			machineID: "abc123",
			params: models.StorageConstraintParams{
				Constraints: []models.StorageConstraint{
					{
						Type:       models.SizeConstraint,
						Value:      "100G",
						Operator:   ">=",
						TargetType: "disk",
					},
				},
			},
			mockError:     nil,
			expectedError: false,
		},
		{
			name:           "Empty machine ID",
			machineID:      "",
			params:         models.StorageConstraintParams{},
			mockError:      nil,
			expectedError:  true,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:      "Empty constraints",
			machineID: "abc123",
			params:    models.StorageConstraintParams{},
			mockError: nil,
			// This should fail validation
			expectedError:  true,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:      "Client error",
			machineID: "abc123",
			params: models.StorageConstraintParams{
				Constraints: []models.StorageConstraint{
					{
						Type:       models.SizeConstraint,
						Value:      "100G",
						Operator:   ">=",
						TargetType: "disk",
					},
				},
			},
			mockError:      errors.New("client error"),
			expectedError:  true,
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Setup mock expectations
			if tc.machineID != "" && len(tc.params.Constraints) > 0 {
				mockClient.On("ApplyStorageConstraints", tc.machineID, tc.params).Return(tc.mockError).Once()
			}

			// Call the service method
			err := service.ApplyStorageConstraints(context.Background(), tc.machineID, tc.params)

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

func TestDeleteStorageConstraints(t *testing.T) {
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
		mockError      error
		expectedError  bool
		expectedStatus int
	}{
		{
			name:          "Success",
			machineID:     "abc123",
			mockError:     nil,
			expectedError: false,
		},
		{
			name:           "Empty machine ID",
			machineID:      "",
			mockError:      nil,
			expectedError:  true,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Client error",
			machineID:      "abc123",
			mockError:      errors.New("client error"),
			expectedError:  true,
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Setup mock expectations
			if tc.machineID != "" {
				mockClient.On("DeleteStorageConstraints", tc.machineID).Return(tc.mockError).Once()
			}

			// Call the service method
			err := service.DeleteStorageConstraints(context.Background(), tc.machineID)

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
