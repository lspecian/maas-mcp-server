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

// StorageServiceInterface defines the interface for storage service operations
type StorageServiceInterface interface {
	ListBlockDevices(ctx context.Context, machineID string) ([]models.StorageContext, error)
	GetBlockDevice(ctx context.Context, machineID string, deviceID string) (*models.StorageContext, error)
}

// StorageHandler handles HTTP requests for storage management operations
type StorageHandler struct {
	storageService StorageServiceInterface
	logger         *logrus.Logger
}

// NewStorageHandler creates a new storage handler instance
func NewStorageHandler(service StorageServiceInterface, logger *logrus.Logger) *StorageHandler {
	return &StorageHandler{
		storageService: service,
		logger:         logger,
	}
}

// RegisterRoutes registers the storage management routes with the provided router group
func (h *StorageHandler) RegisterRoutes(router *gin.RouterGroup) {
	// Register machine-specific storage routes
	router.GET("/machines/:id/storage", h.ListMachineBlockDevices)
}

// ListMachineBlockDevices handles GET /machines/:id/storage requests
func (h *StorageHandler) ListMachineBlockDevices(c *gin.Context) {
	machineID := c.Param("id")
	if machineID == "" {
		errors.GinBadRequest(c, "Machine ID is required", nil)
		return
	}

	h.logger.WithField("machine_id", machineID).Debug("Handling ListMachineBlockDevices request")

	blockDevices, err := h.storageService.ListBlockDevices(c.Request.Context(), machineID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"block_devices": blockDevices,
	})
}

// handleError handles service errors and maps them to appropriate HTTP responses
func (h *StorageHandler) handleError(c *gin.Context, err error) {
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
