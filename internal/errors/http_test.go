package errors

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func setupGinTest() (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	return c, w
}

func TestGinErrorResponse(t *testing.T) {
	testCases := []struct {
		name               string
		err                error
		expectedStatusCode int
		expectedType       string
		expectedMessage    string
	}{
		{
			name:               "ValidationError",
			err:                NewValidationError("invalid input", nil),
			expectedStatusCode: http.StatusBadRequest,
			expectedType:       string(ErrorTypeValidation),
			expectedMessage:    "invalid input",
		},
		{
			name:               "NotFoundError",
			err:                NewNotFoundError("resource not found", nil),
			expectedStatusCode: http.StatusNotFound,
			expectedType:       string(ErrorTypeNotFound),
			expectedMessage:    "resource not found",
		},
		{
			name:               "AuthenticationError",
			err:                NewAuthenticationError("unauthorized", nil),
			expectedStatusCode: http.StatusUnauthorized,
			expectedType:       string(ErrorTypeAuthentication),
			expectedMessage:    "unauthorized",
		},
		{
			name:               "MaasClientError",
			err:                NewMaasClientError("client error", nil),
			expectedStatusCode: http.StatusBadGateway,
			expectedType:       string(ErrorTypeMaasClient),
			expectedMessage:    "client error",
		},
		{
			name:               "InternalError",
			err:                NewInternalError("internal error", nil),
			expectedStatusCode: http.StatusInternalServerError,
			expectedType:       string(ErrorTypeInternal),
			expectedMessage:    "internal error",
		},
		{
			name:               "StandardError",
			err:                errors.New("standard error"), // This will be wrapped by NewErrorResponse
			expectedStatusCode: http.StatusInternalServerError,
			expectedType:       string(ErrorTypeInternal), // NewErrorResponse wraps it as Internal
			expectedMessage:    "standard error",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			c, w := setupGinTest()
			GinErrorResponse(c, tc.err)

			assert.Equal(t, tc.expectedStatusCode, w.Code)
			assert.Contains(t, w.Body.String(), tc.expectedType)
			assert.Contains(t, w.Body.String(), tc.expectedMessage)
		})
	}
}

func TestGinErrorResponseWithCode(t *testing.T) {
	c, w := setupGinTest()
	customStatusCode := http.StatusTeapot // 418 I'm a teapot

	err := NewValidationError("custom status code", nil)
	GinErrorResponseWithCode(c, err, customStatusCode)

	assert.Equal(t, customStatusCode, w.Code)
	assert.Contains(t, w.Body.String(), string(ErrorTypeValidation))
	assert.Contains(t, w.Body.String(), "custom status code")
}

func TestGinAbortWithError(t *testing.T) {
	c, w := setupGinTest()
	err := NewValidationError("aborted request", nil)
	GinAbortWithError(c, err)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), string(ErrorTypeValidation))
	assert.Contains(t, w.Body.String(), "aborted request")
	assert.True(t, c.IsAborted())
}

func TestGinNotFound(t *testing.T) {
	c, w := setupGinTest()
	GinNotFound(c)

	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.Contains(t, w.Body.String(), string(ErrorTypeNotFound))
	assert.Contains(t, w.Body.String(), "Resource not found")
}

func TestGinMethodNotAllowed(t *testing.T) {
	c, w := setupGinTest()
	GinMethodNotAllowed(c)

	assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
	assert.Contains(t, w.Body.String(), string(ErrorTypeValidation))
	assert.Contains(t, w.Body.String(), "Method not allowed")
}

func TestGinInternalServerError(t *testing.T) {
	c, w := setupGinTest()
	cause := errors.New("original error")
	GinInternalServerError(c, cause)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), string(ErrorTypeInternal))
	assert.Contains(t, w.Body.String(), "Internal server error")
}

func TestGinBadRequest(t *testing.T) {
	c, w := setupGinTest()
	cause := errors.New("original error")
	GinBadRequest(c, "Bad request message", cause)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), string(ErrorTypeValidation))
	assert.Contains(t, w.Body.String(), "Bad request message")
}

func TestGinUnauthorized(t *testing.T) {
	c, w := setupGinTest()
	cause := errors.New("original error")
	GinUnauthorized(c, "Unauthorized message", cause)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Contains(t, w.Body.String(), string(ErrorTypeAuthentication))
	assert.Contains(t, w.Body.String(), "Unauthorized message")
}

func TestGinForbidden(t *testing.T) {
	c, w := setupGinTest()
	cause := errors.New("original error")
	GinForbidden(c, "Forbidden message", cause)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, w.Body.String(), string(ErrorTypeForbidden))
	assert.Contains(t, w.Body.String(), "Forbidden message")
}

func TestGinNotFoundWithMessage(t *testing.T) {
	c, w := setupGinTest()
	cause := errors.New("original error")
	GinNotFoundWithMessage(c, "Custom not found message", cause)

	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.Contains(t, w.Body.String(), string(ErrorTypeNotFound))
	assert.Contains(t, w.Body.String(), "Custom not found message")
}

func TestGinMaasClientError(t *testing.T) {
	c, w := setupGinTest()
	cause := errors.New("original error")
	GinMaasClientError(c, "MAAS client error message", cause)

	assert.Equal(t, http.StatusBadGateway, w.Code)
	assert.Contains(t, w.Body.String(), string(ErrorTypeMaasClient))
	assert.Contains(t, w.Body.String(), "MAAS client error message")
}

func TestGinRateLimitError(t *testing.T) {
	c, w := setupGinTest()
	cause := errors.New("original error")
	GinRateLimitError(c, "Rate limit error message", cause)

	assert.Equal(t, http.StatusTooManyRequests, w.Code)
	assert.Contains(t, w.Body.String(), string(ErrorTypeRateLimit))
	assert.Contains(t, w.Body.String(), "Rate limit error message")
}

func TestGinTimeoutError(t *testing.T) {
	c, w := setupGinTest()
	cause := errors.New("original error")
	GinTimeoutError(c, "Timeout error message", cause)

	assert.Equal(t, http.StatusGatewayTimeout, w.Code) // Corrected expected status
	assert.Contains(t, w.Body.String(), string(ErrorTypeTimeout))
	assert.Contains(t, w.Body.String(), "Timeout error message")
}

func TestGinConflictError(t *testing.T) {
	c, w := setupGinTest()
	cause := errors.New("original error")
	GinConflictError(c, "Conflict error message", cause)

	assert.Equal(t, http.StatusConflict, w.Code)
	assert.Contains(t, w.Body.String(), string(ErrorTypeConflict))
	assert.Contains(t, w.Body.String(), "Conflict error message")
}

func TestGinUnsupportedOperationError(t *testing.T) {
	c, w := setupGinTest()
	cause := errors.New("original error")
	GinUnsupportedOperationError(c, "Unsupported operation message", cause)

	assert.Equal(t, http.StatusMethodNotAllowed, w.Code) // Corrected expected status
	assert.Contains(t, w.Body.String(), string(ErrorTypeUnsupportedOperation))
	assert.Contains(t, w.Body.String(), "Unsupported operation message")
}

func TestGinBadGatewayError(t *testing.T) {
	c, w := setupGinTest()
	cause := errors.New("original error")
	GinBadGatewayError(c, "Bad gateway message", cause)

	assert.Equal(t, http.StatusBadGateway, w.Code)
	assert.Contains(t, w.Body.String(), string(ErrorTypeBadGateway))
	assert.Contains(t, w.Body.String(), "Bad gateway message")
}
