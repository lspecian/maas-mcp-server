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
	CreatePartition(ctx context.Context, machineID string, deviceID string, params map[string]interface{}) (*models.PartitionContext, error)
	UpdatePartition(ctx context.Context, machineID string, deviceID string, partitionID string, params map[string]interface{}) (*models.PartitionContext, error)
	DeletePartition(ctx context.Context, machineID string, deviceID string, partitionID string) error
	FormatPartition(ctx context.Context, machineID string, deviceID string, partitionID string, params map[string]interface{}) (*models.FilesystemContext, error)

	// RAID operations
	CreateRAID(ctx context.Context, machineID string, params models.RAIDParams) (*models.RAIDContext, error)
	GetRAID(ctx context.Context, machineID string, raidID string) (*models.RAIDContext, error)
	ListRAIDs(ctx context.Context, machineID string) ([]models.RAIDContext, error)
	UpdateRAID(ctx context.Context, machineID string, raidID string, params models.RAIDUpdateParams) (*models.RAIDContext, error)
	DeleteRAID(ctx context.Context, machineID string, raidID string) error
	ConfigureStorage(ctx context.Context, machineID string, config models.DesiredStorageConfiguration) error
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
	router.GET("/machines/:id/storage/:device_id", h.GetMachineBlockDevice)

	// Register partition management routes
	router.POST("/machines/:id/storage/:device_id/partitions", h.CreatePartition)
	router.PUT("/machines/:id/storage/:device_id/partitions/:partition_id", h.UpdatePartition)
	router.DELETE("/machines/:id/storage/:device_id/partitions/:partition_id", h.DeletePartition)
	router.POST("/machines/:id/storage/:device_id/partitions/:partition_id/format", h.FormatPartition)

	// Register RAID management routes
	router.GET("/machines/:id/raids", h.ListRAIDs)
	router.GET("/machines/:id/raids/:raid_id", h.GetRAID)
	router.POST("/machines/:id/raids", h.CreateRAID)
	router.PUT("/machines/:id/raids/:raid_id", h.UpdateRAID)
	router.DELETE("/machines/:id/raids/:raid_id", h.DeleteRAID)

	// Register route for comprehensive storage configuration
	router.POST("/machines/:id/storage/configure", h.ConfigureStorage)
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

// GetMachineBlockDevice handles GET /machines/:id/storage/:device_id requests
func (h *StorageHandler) GetMachineBlockDevice(c *gin.Context) {
	machineID := c.Param("id")
	deviceID := c.Param("device_id")

	if machineID == "" {
		errors.GinBadRequest(c, "Machine ID is required", nil)
		return
	}

	if deviceID == "" {
		errors.GinBadRequest(c, "Device ID is required", nil)
		return
	}

	h.logger.WithFields(logrus.Fields{
		"machine_id": machineID,
		"device_id":  deviceID,
	}).Debug("Handling GetMachineBlockDevice request")

	device, err := h.storageService.GetBlockDevice(c.Request.Context(), machineID, deviceID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"device": device,
	})
}

// CreatePartition handles POST /machines/:id/storage/:device_id/partitions requests
func (h *StorageHandler) CreatePartition(c *gin.Context) {
	machineID := c.Param("id")
	deviceID := c.Param("device_id")

	if machineID == "" {
		errors.GinBadRequest(c, "Machine ID is required", nil)
		return
	}

	if deviceID == "" {
		errors.GinBadRequest(c, "Device ID is required", nil)
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
		errors.GinBadRequest(c, "Partition size is required", nil)
		return
	}

	h.logger.WithFields(logrus.Fields{
		"machine_id": machineID,
		"device_id":  deviceID,
		"params":     params,
	}).Debug("Handling CreatePartition request")

	partition, err := h.storageService.CreatePartition(c.Request.Context(), machineID, deviceID, params)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"partition": partition,
	})
}

// UpdatePartition handles PUT /machines/:id/storage/:device_id/partitions/:partition_id requests
func (h *StorageHandler) UpdatePartition(c *gin.Context) {
	machineID := c.Param("id")
	deviceID := c.Param("device_id")
	partitionID := c.Param("partition_id")

	if machineID == "" {
		errors.GinBadRequest(c, "Machine ID is required", nil)
		return
	}

	if deviceID == "" {
		errors.GinBadRequest(c, "Device ID is required", nil)
		return
	}

	if partitionID == "" {
		errors.GinBadRequest(c, "Partition ID is required", nil)
		return
	}

	// Parse request body
	var params map[string]interface{}
	if err := c.ShouldBindJSON(&params); err != nil {
		errors.GinBadRequest(c, "Invalid request body", err)
		return
	}

	h.logger.WithFields(logrus.Fields{
		"machine_id":   machineID,
		"device_id":    deviceID,
		"partition_id": partitionID,
		"params":       params,
	}).Debug("Handling UpdatePartition request")

	partition, err := h.storageService.UpdatePartition(c.Request.Context(), machineID, deviceID, partitionID, params)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"partition": partition,
	})
}

// DeletePartition handles DELETE /machines/:id/storage/:device_id/partitions/:partition_id requests
func (h *StorageHandler) DeletePartition(c *gin.Context) {
	machineID := c.Param("id")
	deviceID := c.Param("device_id")
	partitionID := c.Param("partition_id")

	if machineID == "" {
		errors.GinBadRequest(c, "Machine ID is required", nil)
		return
	}

	if deviceID == "" {
		errors.GinBadRequest(c, "Device ID is required", nil)
		return
	}

	if partitionID == "" {
		errors.GinBadRequest(c, "Partition ID is required", nil)
		return
	}

	h.logger.WithFields(logrus.Fields{
		"machine_id":   machineID,
		"device_id":    deviceID,
		"partition_id": partitionID,
	}).Debug("Handling DeletePartition request")

	err := h.storageService.DeletePartition(c.Request.Context(), machineID, deviceID, partitionID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Partition deleted successfully",
	})
}

// FormatPartition handles POST /machines/:id/storage/:device_id/partitions/:partition_id/format requests
func (h *StorageHandler) FormatPartition(c *gin.Context) {
	machineID := c.Param("id")
	deviceID := c.Param("device_id")
	partitionID := c.Param("partition_id")

	if machineID == "" {
		errors.GinBadRequest(c, "Machine ID is required", nil)
		return
	}

	if deviceID == "" {
		errors.GinBadRequest(c, "Device ID is required", nil)
		return
	}

	if partitionID == "" {
		errors.GinBadRequest(c, "Partition ID is required", nil)
		return
	}

	// Parse request body
	var params map[string]interface{}
	if err := c.ShouldBindJSON(&params); err != nil {
		errors.GinBadRequest(c, "Invalid request body", err)
		return
	}

	// Validate fstype parameter
	if _, ok := params["fstype"]; !ok {
		errors.GinBadRequest(c, "Filesystem type (fstype) is required", nil)
		return
	}

	h.logger.WithFields(logrus.Fields{
		"machine_id":   machineID,
		"device_id":    deviceID,
		"partition_id": partitionID,
		"params":       params,
	}).Debug("Handling FormatPartition request")

	filesystem, err := h.storageService.FormatPartition(c.Request.Context(), machineID, deviceID, partitionID, params)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"filesystem": filesystem,
	})
}

// ListRAIDs handles GET /machines/:id/raids requests
func (h *StorageHandler) ListRAIDs(c *gin.Context) {
	machineID := c.Param("id")
	if machineID == "" {
		errors.GinBadRequest(c, "Machine ID is required", nil)
		return
	}

	h.logger.WithField("machine_id", machineID).Debug("Handling ListRAIDs request")

	raids, err := h.storageService.ListRAIDs(c.Request.Context(), machineID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"raids": raids,
	})
}

// GetRAID handles GET /machines/:id/raids/:raid_id requests
func (h *StorageHandler) GetRAID(c *gin.Context) {
	machineID := c.Param("id")
	raidID := c.Param("raid_id")

	if machineID == "" {
		errors.GinBadRequest(c, "Machine ID is required", nil)
		return
	}

	if raidID == "" {
		errors.GinBadRequest(c, "RAID ID is required", nil)
		return
	}

	h.logger.WithFields(logrus.Fields{
		"machine_id": machineID,
		"raid_id":    raidID,
	}).Debug("Handling GetRAID request")

	raid, err := h.storageService.GetRAID(c.Request.Context(), machineID, raidID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"raid": raid,
	})
}

// CreateRAID handles POST /machines/:id/raids requests
func (h *StorageHandler) CreateRAID(c *gin.Context) {
	machineID := c.Param("id")

	if machineID == "" {
		errors.GinBadRequest(c, "Machine ID is required", nil)
		return
	}

	// Parse request body
	var params models.RAIDParams
	if err := c.ShouldBindJSON(&params); err != nil {
		errors.GinBadRequest(c, "Invalid request body", err)
		return
	}

	// Validate parameters
	if err := params.Validate(); err != nil {
		errors.GinBadRequest(c, err.Error(), nil)
		return
	}

	h.logger.WithFields(logrus.Fields{
		"machine_id":    machineID,
		"name":          params.Name,
		"level":         params.Level,
		"block_devices": params.BlockDevices,
		"partitions":    params.Partitions,
		"spare_devices": params.SpareDevices,
	}).Debug("Handling CreateRAID request")

	raid, err := h.storageService.CreateRAID(c.Request.Context(), machineID, params)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"raid": raid,
	})
}

// UpdateRAID handles PUT /machines/:id/raids/:raid_id requests
func (h *StorageHandler) UpdateRAID(c *gin.Context) {
	machineID := c.Param("id")
	raidID := c.Param("raid_id")

	if machineID == "" {
		errors.GinBadRequest(c, "Machine ID is required", nil)
		return
	}

	if raidID == "" {
		errors.GinBadRequest(c, "RAID ID is required", nil)
		return
	}

	// Parse request body
	var params models.RAIDUpdateParams
	if err := c.ShouldBindJSON(&params); err != nil {
		errors.GinBadRequest(c, "Invalid request body", err)
		return
	}

	// Validate parameters
	if err := params.Validate(); err != nil {
		errors.GinBadRequest(c, err.Error(), nil)
		return
	}

	h.logger.WithFields(logrus.Fields{
		"machine_id":        machineID,
		"raid_id":           raidID,
		"name":              params.Name,
		"add_block_devices": params.AddBlockDevices,
		"rem_block_devices": params.RemBlockDevices,
		"add_partitions":    params.AddPartitions,
		"rem_partitions":    params.RemPartitions,
		"add_spare_devices": params.AddSpareDevices,
		"rem_spare_devices": params.RemSpareDevices,
	}).Debug("Handling UpdateRAID request")

	raid, err := h.storageService.UpdateRAID(c.Request.Context(), machineID, raidID, params)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"raid": raid,
	})
}

// DeleteRAID handles DELETE /machines/:id/raids/:raid_id requests
func (h *StorageHandler) DeleteRAID(c *gin.Context) {
	machineID := c.Param("id")
	raidID := c.Param("raid_id")

	if machineID == "" {
		errors.GinBadRequest(c, "Machine ID is required", nil)
		return
	}

	if raidID == "" {
		errors.GinBadRequest(c, "RAID ID is required", nil)
		return
	}

	h.logger.WithFields(logrus.Fields{
		"machine_id": machineID,
		"raid_id":    raidID,
	}).Debug("Handling DeleteRAID request")

	err := h.storageService.DeleteRAID(c.Request.Context(), machineID, raidID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "RAID array deleted successfully",
	})
}

// ConfigureStorage handles POST /machines/:id/storage/configure requests
func (h *StorageHandler) ConfigureStorage(c *gin.Context) {
	machineID := c.Param("id")
	if machineID == "" {
		errors.GinBadRequest(c, "Machine ID is required", nil)
		return
	}

	var config models.DesiredStorageConfiguration
	if err := c.ShouldBindJSON(&config); err != nil {
		errors.GinBadRequest(c, "Invalid request body", err)
		return
	}

	h.logger.WithFields(logrus.Fields{
		"machine_id": machineID,
		"config":     config,
	}).Debug("Handling ConfigureStorage request")

	err := h.storageService.ConfigureStorage(c.Request.Context(), machineID, config)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "Storage configured successfully",
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
