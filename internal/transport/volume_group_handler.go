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

// VolumeGroupServiceInterface defines the interface for volume group service operations
type VolumeGroupServiceInterface interface {
	ListVolumeGroups(ctx context.Context, machineID string) ([]models.VolumeGroupContext, error)
	GetVolumeGroup(ctx context.Context, machineID string, volumeGroupID string) (*models.VolumeGroupContext, error)
	CreateVolumeGroup(ctx context.Context, machineID string, params map[string]interface{}) (*models.VolumeGroupContext, error)
	DeleteVolumeGroup(ctx context.Context, machineID string, volumeGroupID string) error
	CreateLogicalVolume(ctx context.Context, machineID string, volumeGroupID string, params map[string]interface{}) (*models.LogicalVolumeContext, error)
	DeleteLogicalVolume(ctx context.Context, machineID string, volumeGroupID string, logicalVolumeID string) error
	ResizeLogicalVolume(ctx context.Context, machineID string, volumeGroupID string, logicalVolumeID string, params map[string]interface{}) (*models.LogicalVolumeContext, error)
}

// VolumeGroupHandler handles HTTP requests for volume group operations
type VolumeGroupHandler struct {
	volumeGroupService VolumeGroupServiceInterface
	logger             *logrus.Logger
}

// NewVolumeGroupHandler creates a new volume group handler instance
func NewVolumeGroupHandler(service VolumeGroupServiceInterface, logger *logrus.Logger) *VolumeGroupHandler {
	return &VolumeGroupHandler{
		volumeGroupService: service,
		logger:             logger,
	}
}

// RegisterRoutes registers the volume group routes with the provided router group
func (h *VolumeGroupHandler) RegisterRoutes(router *gin.RouterGroup) {
	// Register machine-specific volume group routes
	router.GET("/machines/:id/volume-groups", h.ListVolumeGroups)
	router.GET("/machines/:id/volume-groups/:volume_group_id", h.GetVolumeGroup)
	router.POST("/machines/:id/volume-groups", h.CreateVolumeGroup)
	router.DELETE("/machines/:id/volume-groups/:volume_group_id", h.DeleteVolumeGroup)

	// Register logical volume routes
	router.POST("/machines/:id/volume-groups/:volume_group_id/logical-volumes", h.CreateLogicalVolume)
	router.DELETE("/machines/:id/volume-groups/:volume_group_id/logical-volumes/:logical_volume_id", h.DeleteLogicalVolume)
	router.PUT("/machines/:id/volume-groups/:volume_group_id/logical-volumes/:logical_volume_id", h.ResizeLogicalVolume)
}

// ListVolumeGroups handles GET /machines/:id/volume-groups requests
func (h *VolumeGroupHandler) ListVolumeGroups(c *gin.Context) {
	machineID := c.Param("id")
	if machineID == "" {
		errors.GinBadRequest(c, "Machine ID is required", nil)
		return
	}

	h.logger.WithField("machine_id", machineID).Debug("Handling ListVolumeGroups request")

	volumeGroups, err := h.volumeGroupService.ListVolumeGroups(c.Request.Context(), machineID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"volume_groups": volumeGroups,
	})
}

// GetVolumeGroup handles GET /machines/:id/volume-groups/:volume_group_id requests
func (h *VolumeGroupHandler) GetVolumeGroup(c *gin.Context) {
	machineID := c.Param("id")
	volumeGroupID := c.Param("volume_group_id")

	if machineID == "" {
		errors.GinBadRequest(c, "Machine ID is required", nil)
		return
	}

	if volumeGroupID == "" {
		errors.GinBadRequest(c, "Volume Group ID is required", nil)
		return
	}

	h.logger.WithFields(logrus.Fields{
		"machine_id":      machineID,
		"volume_group_id": volumeGroupID,
	}).Debug("Handling GetVolumeGroup request")

	volumeGroup, err := h.volumeGroupService.GetVolumeGroup(c.Request.Context(), machineID, volumeGroupID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"volume_group": volumeGroup,
	})
}

// CreateVolumeGroup handles POST /machines/:id/volume-groups requests
func (h *VolumeGroupHandler) CreateVolumeGroup(c *gin.Context) {
	machineID := c.Param("id")

	if machineID == "" {
		errors.GinBadRequest(c, "Machine ID is required", nil)
		return
	}

	// Parse request body
	var params map[string]interface{}
	if err := c.ShouldBindJSON(&params); err != nil {
		errors.GinBadRequest(c, "Invalid request body", err)
		return
	}

	// Validate name parameter
	if _, ok := params["name"]; !ok {
		errors.GinBadRequest(c, "Volume group name is required", nil)
		return
	}

	// Validate block_devices or partitions parameter
	if _, ok := params["block_devices"]; !ok && !isParamPresent(params, "partitions") {
		errors.GinBadRequest(c, "At least one block device or partition is required", nil)
		return
	}

	h.logger.WithFields(logrus.Fields{
		"machine_id": machineID,
		"params":     params,
	}).Debug("Handling CreateVolumeGroup request")

	volumeGroup, err := h.volumeGroupService.CreateVolumeGroup(c.Request.Context(), machineID, params)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"volume_group": volumeGroup,
	})
}

// DeleteVolumeGroup handles DELETE /machines/:id/volume-groups/:volume_group_id requests
func (h *VolumeGroupHandler) DeleteVolumeGroup(c *gin.Context) {
	machineID := c.Param("id")
	volumeGroupID := c.Param("volume_group_id")

	if machineID == "" {
		errors.GinBadRequest(c, "Machine ID is required", nil)
		return
	}

	if volumeGroupID == "" {
		errors.GinBadRequest(c, "Volume Group ID is required", nil)
		return
	}

	h.logger.WithFields(logrus.Fields{
		"machine_id":      machineID,
		"volume_group_id": volumeGroupID,
	}).Debug("Handling DeleteVolumeGroup request")

	err := h.volumeGroupService.DeleteVolumeGroup(c.Request.Context(), machineID, volumeGroupID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Volume group deleted successfully",
	})
}

// CreateLogicalVolume handles POST /machines/:id/volume-groups/:volume_group_id/logical-volumes requests
func (h *VolumeGroupHandler) CreateLogicalVolume(c *gin.Context) {
	machineID := c.Param("id")
	volumeGroupID := c.Param("volume_group_id")

	if machineID == "" {
		errors.GinBadRequest(c, "Machine ID is required", nil)
		return
	}

	if volumeGroupID == "" {
		errors.GinBadRequest(c, "Volume Group ID is required", nil)
		return
	}

	// Parse request body
	var params map[string]interface{}
	if err := c.ShouldBindJSON(&params); err != nil {
		errors.GinBadRequest(c, "Invalid request body", err)
		return
	}

	// Validate name parameter
	if _, ok := params["name"]; !ok {
		errors.GinBadRequest(c, "Logical volume name is required", nil)
		return
	}

	// Validate size parameter
	if _, ok := params["size"]; !ok {
		errors.GinBadRequest(c, "Logical volume size is required", nil)
		return
	}

	h.logger.WithFields(logrus.Fields{
		"machine_id":      machineID,
		"volume_group_id": volumeGroupID,
		"params":          params,
	}).Debug("Handling CreateLogicalVolume request")

	logicalVolume, err := h.volumeGroupService.CreateLogicalVolume(c.Request.Context(), machineID, volumeGroupID, params)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"logical_volume": logicalVolume,
	})
}

// DeleteLogicalVolume handles DELETE /machines/:id/volume-groups/:volume_group_id/logical-volumes/:logical_volume_id requests
func (h *VolumeGroupHandler) DeleteLogicalVolume(c *gin.Context) {
	machineID := c.Param("id")
	volumeGroupID := c.Param("volume_group_id")
	logicalVolumeID := c.Param("logical_volume_id")

	if machineID == "" {
		errors.GinBadRequest(c, "Machine ID is required", nil)
		return
	}

	if volumeGroupID == "" {
		errors.GinBadRequest(c, "Volume Group ID is required", nil)
		return
	}

	if logicalVolumeID == "" {
		errors.GinBadRequest(c, "Logical Volume ID is required", nil)
		return
	}

	h.logger.WithFields(logrus.Fields{
		"machine_id":        machineID,
		"volume_group_id":   volumeGroupID,
		"logical_volume_id": logicalVolumeID,
	}).Debug("Handling DeleteLogicalVolume request")

	err := h.volumeGroupService.DeleteLogicalVolume(c.Request.Context(), machineID, volumeGroupID, logicalVolumeID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Logical volume deleted successfully",
	})
}

// ResizeLogicalVolume handles PUT /machines/:id/volume-groups/:volume_group_id/logical-volumes/:logical_volume_id requests
func (h *VolumeGroupHandler) ResizeLogicalVolume(c *gin.Context) {
	machineID := c.Param("id")
	volumeGroupID := c.Param("volume_group_id")
	logicalVolumeID := c.Param("logical_volume_id")

	if machineID == "" {
		errors.GinBadRequest(c, "Machine ID is required", nil)
		return
	}

	if volumeGroupID == "" {
		errors.GinBadRequest(c, "Volume Group ID is required", nil)
		return
	}

	if logicalVolumeID == "" {
		errors.GinBadRequest(c, "Logical Volume ID is required", nil)
		return
	}

	// Parse request body
	var params map[string]interface{}
	if err := c.ShouldBindJSON(&params); err != nil {
		errors.GinBadRequest(c, "Invalid request body", err)
		return
	}

	// Validate size parameter
	if _, ok := params["size"]; !ok {
		errors.GinBadRequest(c, "New size is required", nil)
		return
	}

	h.logger.WithFields(logrus.Fields{
		"machine_id":        machineID,
		"volume_group_id":   volumeGroupID,
		"logical_volume_id": logicalVolumeID,
		"params":            params,
	}).Debug("Handling ResizeLogicalVolume request")

	logicalVolume, err := h.volumeGroupService.ResizeLogicalVolume(c.Request.Context(), machineID, volumeGroupID, logicalVolumeID, params)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"logical_volume": logicalVolume,
	})
}

// handleError handles service errors and maps them to appropriate HTTP responses
func (h *VolumeGroupHandler) handleError(c *gin.Context, err error) {
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

// isParamPresent checks if a parameter is present in the params map
func isParamPresent(params map[string]interface{}, key string) bool {
	_, ok := params[key]
	return ok
}
