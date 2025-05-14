package transport

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/lspecian/maas-mcp-server/internal/errors"
	"github.com/lspecian/maas-mcp-server/internal/models"
	"github.com/lspecian/maas-mcp-server/internal/service"
	"github.com/sirupsen/logrus"
)

// TagServiceInterface defines the interface for tag service operations
type TagServiceInterface interface {
	ListTags(ctx context.Context) ([]models.TagContext, error)
	CreateTag(ctx context.Context, name string, comment string) (models.TagContext, error)
	ApplyTagToMachine(ctx context.Context, tagName string, machineID string) error
	RemoveTagFromMachine(ctx context.Context, tagName string, machineID string) error
}

// TagHandler handles HTTP requests for tag management operations
type TagHandler struct {
	tagService TagServiceInterface
	logger     *logrus.Logger
}

// NewTagHandler creates a new tag handler instance
func NewTagHandler(service TagServiceInterface, logger *logrus.Logger) *TagHandler {
	return &TagHandler{
		tagService: service,
		logger:     logger,
	}
}

// RegisterRoutes registers the tag management routes with the provided router group
func (h *TagHandler) RegisterRoutes(router *gin.RouterGroup) {
	// Register tag routes
	router.GET("/tags", h.ListTags)
	router.POST("/tags", h.CreateTag)

	// Register machine-specific tag routes
	router.POST("/machines/:id/tags/:tag", h.ApplyTagToMachine)
	router.DELETE("/machines/:id/tags/:tag", h.RemoveTagFromMachine) // Added DELETE route
}

// ListTags handles GET /tags requests
func (h *TagHandler) ListTags(c *gin.Context) {
	h.logger.Debug("Handling ListTags request")

	tags, err := h.tagService.ListTags(c.Request.Context())
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"tags": tags,
	})
}

// CreateTag handles POST /tags requests
func (h *TagHandler) CreateTag(c *gin.Context) {
	var request struct {
		Name    string `json:"name" binding:"required"`
		Comment string `json:"comment"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		errors.GinBadRequest(c, "Invalid request format", err)
		return
	}

	h.logger.WithFields(logrus.Fields{
		"name":    request.Name,
		"comment": request.Comment,
	}).Debug("Handling CreateTag request")

	tag, err := h.tagService.CreateTag(c.Request.Context(), request.Name, request.Comment)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, tag)
}

// ApplyTagToMachine handles POST /machines/:id/tags/:tag requests
func (h *TagHandler) ApplyTagToMachine(c *gin.Context) {
	machineID := c.Param("id")
	if machineID == "" {
		errors.GinBadRequest(c, "Machine ID is required", nil)
		return
	}

	tagName := c.Param("tag")
	if tagName == "" {
		errors.GinBadRequest(c, "Tag name is required", nil)
		return
	}

	h.logger.WithFields(logrus.Fields{
		"machine_id": machineID,
		"tag_name":   tagName,
	}).Debug("Handling ApplyTagToMachine request")

	err := h.tagService.ApplyTagToMachine(c.Request.Context(), tagName, machineID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Tag applied successfully",
	})
}

// RemoveTagFromMachine handles DELETE /machines/:id/tags/:tag requests
func (h *TagHandler) RemoveTagFromMachine(c *gin.Context) {
	machineID := c.Param("id")
	if machineID == "" {
		errors.GinBadRequest(c, "Machine ID is required", nil)
		return
	}

	tagName := c.Param("tag")
	if tagName == "" {
		errors.GinBadRequest(c, "Tag name is required", nil)
		return
	}

	h.logger.WithFields(logrus.Fields{
		"machine_id": machineID,
		"tag_name":   tagName,
	}).Debug("Handling RemoveTagFromMachine request")

	err := h.tagService.RemoveTagFromMachine(c.Request.Context(), tagName, machineID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Tag removed successfully",
	})
}

// handleError handles service errors and maps them to appropriate HTTP responses
func (h *TagHandler) handleError(c *gin.Context, err error) {
	// Check if it's a ServiceError
	if serviceErr, ok := err.(*service.ServiceError); ok {
		// Map ServiceError to our new error types
		switch serviceErr.Err {
		case service.ErrNotFound:
			errors.GinNotFoundWithMessage(c, serviceErr.Error(), serviceErr.Err)
		case service.ErrBadRequest:
			errors.GinBadRequest(c, serviceErr.Error(), serviceErr.Err)
		case service.ErrForbidden:
			errors.GinForbidden(c, serviceErr.Error(), serviceErr.Err)
		case service.ErrServiceUnavailable, service.ErrConflict:
			errors.GinMaasClientError(c, serviceErr.Error(), serviceErr.Err)
		default:
			errors.GinInternalServerError(c, serviceErr.Err)
		}
		return
	}

	// Use our error handling utility for other errors
	errors.GinErrorResponse(c, err)
}
