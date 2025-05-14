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
	apperrors "github.com/lspecian/maas-mcp-server/internal/errors" // Added import alias
	"github.com/lspecian/maas-mcp-server/internal/models"
	"github.com/lspecian/maas-mcp-server/internal/service"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
)

// MockTagService is a mock implementation of the TagServiceInterface
type MockTagService struct {
	ListTagsFunc             func(ctx context.Context) ([]models.TagContext, error)
	CreateTagFunc            func(ctx context.Context, name string, comment string) (models.TagContext, error)
	ApplyTagToMachineFunc    func(ctx context.Context, tagName string, machineID string) error
	RemoveTagFromMachineFunc func(ctx context.Context, tagName string, machineID string) error
}

func (m *MockTagService) ListTags(ctx context.Context) ([]models.TagContext, error) {
	if m.ListTagsFunc != nil {
		return m.ListTagsFunc(ctx)
	}
	return nil, errors.New("ListTagsFunc not implemented")
}

func (m *MockTagService) CreateTag(ctx context.Context, name string, comment string) (models.TagContext, error) {
	if m.CreateTagFunc != nil {
		return m.CreateTagFunc(ctx, name, comment)
	}
	return models.TagContext{}, errors.New("CreateTagFunc not implemented")
}

func (m *MockTagService) ApplyTagToMachine(ctx context.Context, tagName string, machineID string) error {
	if m.ApplyTagToMachineFunc != nil {
		return m.ApplyTagToMachineFunc(ctx, tagName, machineID)
	}
	return errors.New("ApplyTagToMachineFunc not implemented")
}

func (m *MockTagService) RemoveTagFromMachine(ctx context.Context, tagName string, machineID string) error {
	if m.RemoveTagFromMachineFunc != nil {
		return m.RemoveTagFromMachineFunc(ctx, tagName, machineID)
	}
	return errors.New("RemoveTagFromMachineFunc not implemented")
}

func setupTagTest() (*gin.Engine, *MockTagService) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	mockService := new(MockTagService)
	logger := logrus.New()
	logger.SetLevel(logrus.FatalLevel) // Suppress logs during tests

	// Create the handler with the mock service
	handler := NewTagHandler(mockService, logger)
	handler.RegisterRoutes(router.Group(""))

	return router, mockService
}

func TestListTags(t *testing.T) {
	router, mockService := setupTagTest()

	// Test case 1: Successful response
	tags := []models.TagContext{
		{
			Name:        "tag1",
			Description: "First tag",
			Color:       "blue",
			Category:    "category1",
		},
		{
			Name:        "tag2",
			Description: "Second tag",
			Color:       "red",
			Category:    "category2",
		},
	}

	mockService.ListTagsFunc = func(ctx context.Context) ([]models.TagContext, error) {
		return tags, nil
	}

	req := httptest.NewRequest(http.MethodGet, "/tags", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string][]models.TagContext
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Len(t, response["tags"], 2)
	assert.Equal(t, "tag1", response["tags"][0].Name)
	assert.Equal(t, "tag2", response["tags"][1].Name)

	// Test case 2: Service error
	mockService.ListTagsFunc = func(ctx context.Context) ([]models.TagContext, error) {
		return nil, &service.ServiceError{
			Err:        service.ErrServiceUnavailable,
			StatusCode: http.StatusServiceUnavailable, // This will be mapped by handleError
			Message:    "MAAS API unavailable",
		}
	}

	req = httptest.NewRequest(http.MethodGet, "/tags", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// handleError in TagHandler (assuming similar to StorageHandler) will map ServiceUnavailable to BadGateway
	assert.Equal(t, http.StatusBadGateway, w.Code)

	var errorResponse struct {
		Type    string `json:"type"`
		Message string `json:"message"`
	}
	err = json.Unmarshal(w.Body.Bytes(), &errorResponse)
	assert.NoError(t, err)
	// Assuming ServiceUnavailable maps to ErrorTypeMaasClient or similar
	assert.Equal(t, string(apperrors.ErrorTypeMaasClient), errorResponse.Type)
	assert.Equal(t, "MAAS API unavailable", errorResponse.Message)
}

func TestCreateTag(t *testing.T) {
	router, mockService := setupTagTest()

	// Test case 1: Successful tag creation
	createdTag := models.TagContext{
		Name:        "new-tag",
		Description: "A new tag",
		Color:       "green",
		Category:    "test",
	}

	mockService.CreateTagFunc = func(ctx context.Context, name string, comment string) (models.TagContext, error) {
		if name == "new-tag" {
			return createdTag, nil
		}
		return models.TagContext{}, errors.New("unexpected tag name")
	}

	requestBody, _ := json.Marshal(map[string]interface{}{
		"name":    "new-tag",
		"comment": "A new tag",
	})

	req := httptest.NewRequest(http.MethodPost, "/tags", bytes.NewBuffer(requestBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	var response models.TagContext
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "new-tag", response.Name)
	assert.Equal(t, "A new tag", response.Description)

	// Test case 2: Invalid request format
	req = httptest.NewRequest(http.MethodPost, "/tags", bytes.NewBuffer([]byte("invalid json")))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	// Test case 3: Service error
	mockService.CreateTagFunc = func(ctx context.Context, name string, comment string) (models.TagContext, error) {
		return models.TagContext{}, &service.ServiceError{
			Err:        service.ErrBadRequest, // This will be mapped by handleError
			StatusCode: http.StatusBadRequest,
			Message:    "Invalid tag name format",
		}
	}

	requestBody, _ = json.Marshal(map[string]interface{}{
		"name":    "invalid tag name",
		"comment": "This tag has an invalid name",
	})

	req = httptest.NewRequest(http.MethodPost, "/tags", bytes.NewBuffer(requestBody))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var badRequestResponse struct {
		Type    string `json:"type"`
		Message string `json:"message"`
	}
	err = json.Unmarshal(w.Body.Bytes(), &badRequestResponse)
	assert.NoError(t, err)
	// Assuming ErrBadRequest maps to ErrorTypeValidation
	assert.Equal(t, string(apperrors.ErrorTypeValidation), badRequestResponse.Type)
	assert.Equal(t, "Invalid tag name format", badRequestResponse.Message)
}

func TestApplyTagToMachine(t *testing.T) {
	router, mockService := setupTagTest()

	// Test case 1: Successful tag application
	mockService.ApplyTagToMachineFunc = func(ctx context.Context, tagName string, machineID string) error {
		if tagName == "test-tag" && machineID == "machine-1" {
			return nil
		}
		return errors.New("unexpected tag name or machine ID")
	}

	req := httptest.NewRequest(http.MethodPost, "/machines/machine-1/tags/test-tag", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "Tag applied successfully", response["message"])

	// Test case 2: Missing machine ID (results in 404 from Gin router)
	req = httptest.NewRequest(http.MethodPost, "/machines//tags/test-tag", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code) // Gin returns 404 for malformed path parameters

	// Test case 3: Missing tag name (results in 404 from Gin router)
	req = httptest.NewRequest(http.MethodPost, "/machines/machine-1/tags/", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code) // Gin returns 404 for malformed path parameters

	// Test case 4: Service error
	mockService.ApplyTagToMachineFunc = func(ctx context.Context, tagName string, machineID string) error {
		return &service.ServiceError{
			Err:        service.ErrNotFound, // Mapped by handleError
			StatusCode: http.StatusNotFound,
			Message:    "Tag or machine not found",
		}
	}

	req = httptest.NewRequest(http.MethodPost, "/machines/non-existent/tags/non-existent-tag", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)

	var errorResponse struct {
		Type    string `json:"type"`
		Message string `json:"message"`
	}
	err = json.Unmarshal(w.Body.Bytes(), &errorResponse)
	assert.NoError(t, err)
	assert.Equal(t, string(apperrors.ErrorTypeNotFound), errorResponse.Type)
	assert.Equal(t, "Tag or machine not found", errorResponse.Message)
}
