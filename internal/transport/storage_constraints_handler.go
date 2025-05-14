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

// StorageConstraintsServiceInterface defines the interface for storage constraints service operations
type StorageConstraintsServiceInterface interface {
	SetStorageConstraints(ctx context.Context, machineID string, params models.StorageConstraintParams) error
	GetStorageConstraints(ctx context.Context, machineID string) (*models.StorageConstraintContext, error)
	ValidateStorageConstraints(ctx context.Context, machineID string, params models.StorageConstraintParams) (bool, []string, error)
	ApplyStorageConstraints(ctx context.Context, machineID string, params models.StorageConstraintParams) error
	DeleteStorageConstraints(ctx context.Context, machineID string) error
}

// StorageConstraintsHandler handles HTTP requests for storage constraints
type StorageConstraintsHandler struct {
	storageService StorageConstraintsServiceInterface
	logger         *logrus.Logger
}

// NewStorageConstraintsHandler creates a new storage constraints handler
func NewStorageConstraintsHandler(storageService StorageConstraintsServiceInterface, logger *logrus.Logger) *StorageConstraintsHandler {
	return &StorageConstraintsHandler{
		storageService: storageService,
		logger:         logger,
	}
}

// RegisterRoutes registers the storage constraints routes
func (h *StorageConstraintsHandler) RegisterRoutes(router *gin.RouterGroup) {
	router.POST("/machines/:id/storage-constraints", h.SetStorageConstraints)
	router.GET("/machines/:id/storage-constraints", h.GetStorageConstraints)
	router.POST("/machines/:id/storage-constraints/validate", h.ValidateStorageConstraints)
	router.POST("/machines/:id/storage-constraints/apply", h.ApplyStorageConstraints)
	router.DELETE("/machines/:id/storage-constraints", h.DeleteStorageConstraints)
}

// SetStorageConstraints handles the request to set storage constraints for a machine
func (h *StorageConstraintsHandler) SetStorageConstraints(c *gin.Context) {
	machineID := c.Param("id")
	if machineID == "" {
		errors.GinBadRequest(c, "Machine ID is required", nil)
		return
	}

	var params models.StorageConstraintParams
	if err := c.ShouldBindJSON(&params); err != nil {
		errors.GinBadRequest(c, "Invalid request body", err)
		return
	}

	h.logger.WithFields(logrus.Fields{
		"machine_id":  machineID,
		"constraints": params.Constraints,
	}).Debug("Handling SetStorageConstraints request")

	err := h.storageService.SetStorageConstraints(c.Request.Context(), machineID, params)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
	})
}

// GetStorageConstraints handles the request to get storage constraints for a machine
func (h *StorageConstraintsHandler) GetStorageConstraints(c *gin.Context) {
	machineID := c.Param("id")
	if machineID == "" {
		errors.GinBadRequest(c, "Machine ID is required", nil)
		return
	}

	h.logger.WithField("machine_id", machineID).Debug("Handling GetStorageConstraints request")

	constraints, err := h.storageService.GetStorageConstraints(c.Request.Context(), machineID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"constraints": constraints,
	})
}

// ValidateStorageConstraints handles the request to validate storage constraints for a machine
func (h *StorageConstraintsHandler) ValidateStorageConstraints(c *gin.Context) {
	machineID := c.Param("id")
	if machineID == "" {
		errors.GinBadRequest(c, "Machine ID is required", nil)
		return
	}

	var params models.StorageConstraintParams
	if err := c.ShouldBindJSON(&params); err != nil {
		errors.GinBadRequest(c, "Invalid request body", err)
		return
	}

	h.logger.WithFields(logrus.Fields{
		"machine_id":  machineID,
		"constraints": params.Constraints,
	}).Debug("Handling ValidateStorageConstraints request")

	valid, violations, err := h.storageService.ValidateStorageConstraints(c.Request.Context(), machineID, params)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"valid":      valid,
		"violations": violations,
	})
}

// ApplyStorageConstraints handles the request to apply storage constraints for a machine
func (h *StorageConstraintsHandler) ApplyStorageConstraints(c *gin.Context) {
	machineID := c.Param("id")
	if machineID == "" {
		errors.GinBadRequest(c, "Machine ID is required", nil)
		return
	}

	var params models.StorageConstraintParams
	if err := c.ShouldBindJSON(&params); err != nil {
		errors.GinBadRequest(c, "Invalid request body", err)
		return
	}

	h.logger.WithFields(logrus.Fields{
		"machine_id":  machineID,
		"constraints": params.Constraints,
	}).Debug("Handling ApplyStorageConstraints request")

	err := h.storageService.ApplyStorageConstraints(c.Request.Context(), machineID, params)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
	})
}

// DeleteStorageConstraints handles the request to delete storage constraints for a machine
func (h *StorageConstraintsHandler) DeleteStorageConstraints(c *gin.Context) {
	machineID := c.Param("id")
	if machineID == "" {
		errors.GinBadRequest(c, "Machine ID is required", nil)
		return
	}

	h.logger.WithField("machine_id", machineID).Debug("Handling DeleteStorageConstraints request")

	err := h.storageService.DeleteStorageConstraints(c.Request.Context(), machineID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
	})
}

// handleError handles service errors and maps them to appropriate HTTP responses
func (h *StorageConstraintsHandler) handleError(c *gin.Context, err error) {
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
