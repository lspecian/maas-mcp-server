package errors

import (
	"net/http"
	"testing"

	"github.com/lspecian/maas-mcp-server/internal/service"
	"github.com/stretchr/testify/assert"
)

func TestFromServiceError(t *testing.T) {
	testCases := []struct {
		name          string
		serviceErr    *service.ServiceError
		expectedType  ErrorType
		expectedMsg   string
		expectedCause error
	}{
		{
			name: "NotFoundError",
			serviceErr: &service.ServiceError{
				Err:        service.ErrNotFound,
				StatusCode: http.StatusNotFound,
				Message:    "resource not found",
			},
			expectedType:  ErrorTypeNotFound,
			expectedMsg:   "resource not found",
			expectedCause: service.ErrNotFound,
		},
		{
			name: "BadRequestError",
			serviceErr: &service.ServiceError{
				Err:        service.ErrBadRequest,
				StatusCode: http.StatusBadRequest,
				Message:    "invalid request",
			},
			expectedType:  ErrorTypeValidation,
			expectedMsg:   "invalid request",
			expectedCause: service.ErrBadRequest,
		},
		{
			name: "ForbiddenError",
			serviceErr: &service.ServiceError{
				Err:        service.ErrForbidden,
				StatusCode: http.StatusForbidden,
				Message:    "forbidden",
			},
			expectedType:  ErrorTypeAuthentication,
			expectedMsg:   "forbidden",
			expectedCause: service.ErrForbidden,
		},
		{
			name: "ServiceUnavailableError",
			serviceErr: &service.ServiceError{
				Err:        service.ErrServiceUnavailable,
				StatusCode: http.StatusServiceUnavailable,
				Message:    "service unavailable",
			},
			expectedType:  ErrorTypeMaasClient,
			expectedMsg:   "service unavailable",
			expectedCause: service.ErrServiceUnavailable,
		},
		{
			name: "ConflictError",
			serviceErr: &service.ServiceError{
				Err:        service.ErrConflict,
				StatusCode: http.StatusConflict,
				Message:    "conflict",
			},
			expectedType:  ErrorTypeMaasClient,
			expectedMsg:   "conflict",
			expectedCause: service.ErrConflict,
		},
		{
			name: "InternalServerError",
			serviceErr: &service.ServiceError{
				Err:        service.ErrInternalServer,
				StatusCode: http.StatusInternalServerError,
				Message:    "internal server error",
			},
			expectedType:  ErrorTypeInternal,
			expectedMsg:   "internal server error",
			expectedCause: service.ErrInternalServer,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			appErr := FromServiceError(tc.serviceErr)

			assert.Equal(t, tc.expectedType, appErr.Type)
			assert.Equal(t, tc.expectedMsg, appErr.Message)
			assert.Equal(t, tc.expectedCause, appErr.Cause)
		})
	}
}

func TestToServiceError(t *testing.T) {
	testCases := []struct {
		name               string
		appErr             *AppError
		expectedErr        error
		expectedStatusCode int
		expectedMsg        string
	}{
		{
			name: "NotFoundError",
			appErr: &AppError{
				Type:    ErrorTypeNotFound,
				Message: "resource not found",
				Cause:   nil,
			},
			expectedErr:        service.ErrNotFound,
			expectedStatusCode: http.StatusNotFound,
			expectedMsg:        "resource not found",
		},
		{
			name: "ValidationError",
			appErr: &AppError{
				Type:    ErrorTypeValidation,
				Message: "invalid request",
				Cause:   nil,
			},
			expectedErr:        service.ErrBadRequest,
			expectedStatusCode: http.StatusBadRequest,
			expectedMsg:        "invalid request",
		},
		{
			name: "AuthenticationError",
			appErr: &AppError{
				Type:    ErrorTypeAuthentication,
				Message: "unauthorized",
				Cause:   nil,
			},
			expectedErr:        service.ErrForbidden,
			expectedStatusCode: http.StatusUnauthorized,
			expectedMsg:        "unauthorized",
		},
		{
			name: "MaasClientError",
			appErr: &AppError{
				Type:    ErrorTypeMaasClient,
				Message: "maas client error",
				Cause:   nil,
			},
			expectedErr:        service.ErrServiceUnavailable,
			expectedStatusCode: http.StatusBadGateway,
			expectedMsg:        "maas client error",
		},
		{
			name: "InternalError",
			appErr: &AppError{
				Type:    ErrorTypeInternal,
				Message: "internal error",
				Cause:   nil,
			},
			expectedErr:        service.ErrInternalServer,
			expectedStatusCode: http.StatusInternalServerError,
			expectedMsg:        "internal error",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			serviceErr := ToServiceError(tc.appErr)

			assert.Equal(t, tc.expectedErr, serviceErr.Err)
			assert.Equal(t, tc.expectedStatusCode, serviceErr.StatusCode)
			assert.Equal(t, tc.expectedMsg, serviceErr.Message)
		})
	}
}
