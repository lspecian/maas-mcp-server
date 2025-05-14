package resources

import (
	"context"
	"fmt"

	"github.com/lspecian/maas-mcp-server/internal/errors"
	"github.com/lspecian/maas-mcp-server/internal/logging"
	"github.com/lspecian/maas-mcp-server/internal/service"
)

// StorageResourceHandler handles storage resource requests
type StorageResourceHandler struct {
	BaseResourceHandler
	mcpService *service.MCPService
}

// NewStorageResourceHandler creates a new storage resource handler
func NewStorageResourceHandler(mcpService *service.MCPService, logger *logging.Logger) *StorageResourceHandler {
	return &StorageResourceHandler{
		BaseResourceHandler: BaseResourceHandler{
			Name: "storage",
			URIPatterns: []string{
				"maas://storage-pool/{pool_id}",
				"maas://storage-pool/{pool_id}/devices",
				"maas://storage-device/{device_id}",
				"maas://storage-device/{device_id}/partitions",
				"maas://storage-device/{device_id}/filesystem",
			},
			Logger: logger,
		},
		mcpService: mcpService,
	}
}

// HandleRequest handles a storage resource request
func (h *StorageResourceHandler) HandleRequest(ctx context.Context, request *ResourceRequest) (interface{}, error) {
	// Parse the URI
	parsedURI, err := ParseURI(request.URI)
	if err != nil {
		return nil, errors.NewValidationError(fmt.Sprintf("Invalid URI: %s", err.Error()), err)
	}

	// Handle different resource types
	switch parsedURI.ResourceType {
	case "storage-pool":
		return h.handleStoragePoolResource(ctx, request)
	case "storage-device":
		return h.handleStorageDeviceResource(ctx, request)
	default:
		return nil, errors.NewNotFoundError(fmt.Sprintf("Resource type not found: %s", parsedURI.ResourceType), nil)
	}
}

// handleStoragePoolResource handles storage pool resources
func (h *StorageResourceHandler) handleStoragePoolResource(ctx context.Context, request *ResourceRequest) (interface{}, error) {
	// Get the pool ID
	poolID := request.Parameters["pool_id"]
	if poolID == "" {
		return nil, errors.NewValidationError("pool_id is required", nil)
	}

	// Parse the URI
	parsedURI, err := ParseURI(request.URI)
	if err != nil {
		return nil, errors.NewValidationError(fmt.Sprintf("Invalid URI: %s", err.Error()), err)
	}

	// Handle different sub-resource types
	switch parsedURI.SubResourceType {
	case "":
		// Get storage pool details
		return h.getStoragePoolDetails(ctx, poolID)
	case "devices":
		// Get storage pool devices
		return h.getStoragePoolDevices(ctx, poolID)
	default:
		return nil, errors.NewNotFoundError(fmt.Sprintf("Sub-resource not found: %s", parsedURI.SubResourceType), nil)
	}
}

// handleStorageDeviceResource handles storage device resources
func (h *StorageResourceHandler) handleStorageDeviceResource(ctx context.Context, request *ResourceRequest) (interface{}, error) {
	// Get the device ID
	deviceID := request.Parameters["device_id"]
	if deviceID == "" {
		return nil, errors.NewValidationError("device_id is required", nil)
	}

	// Parse the URI
	parsedURI, err := ParseURI(request.URI)
	if err != nil {
		return nil, errors.NewValidationError(fmt.Sprintf("Invalid URI: %s", err.Error()), err)
	}

	// Handle different sub-resource types
	switch parsedURI.SubResourceType {
	case "":
		// Get storage device details
		return h.getStorageDeviceDetails(ctx, deviceID)
	case "partitions":
		// Get storage device partitions
		return h.getStorageDevicePartitions(ctx, deviceID)
	case "filesystem":
		// Get storage device filesystem
		return h.getStorageDeviceFilesystem(ctx, deviceID)
	default:
		return nil, errors.NewNotFoundError(fmt.Sprintf("Sub-resource not found: %s", parsedURI.SubResourceType), nil)
	}
}

// getStoragePoolDetails gets storage pool details
func (h *StorageResourceHandler) getStoragePoolDetails(ctx context.Context, poolID string) (interface{}, error) {
	// For now, return a placeholder since we don't have storage pool details in the current implementation
	return map[string]interface{}{
		"id":          poolID,
		"name":        "Storage Pool " + poolID,
		"description": "Storage pool description",
		"type":        "lvm",
		"status":      "active",
		"total_size":  1024 * 1024 * 1024 * 100, // 100 GB
		"used_size":   1024 * 1024 * 1024 * 20,  // 20 GB
		"free_size":   1024 * 1024 * 1024 * 80,  // 80 GB
	}, nil
}

// getStoragePoolDevices gets storage pool devices
func (h *StorageResourceHandler) getStoragePoolDevices(ctx context.Context, poolID string) (interface{}, error) {
	// For now, return a placeholder since we don't have storage pool devices in the current implementation
	devices := []map[string]interface{}{
		{
			"id":        "1",
			"name":      "sda",
			"type":      "disk",
			"size":      1024 * 1024 * 1024 * 50, // 50 GB
			"used_size": 1024 * 1024 * 1024 * 10, // 10 GB
			"status":    "active",
		},
		{
			"id":        "2",
			"name":      "sdb",
			"type":      "disk",
			"size":      1024 * 1024 * 1024 * 50, // 50 GB
			"used_size": 1024 * 1024 * 1024 * 10, // 10 GB
			"status":    "active",
		},
	}

	return map[string]interface{}{
		"pool_id": poolID,
		"devices": devices,
	}, nil
}

// getStorageDeviceDetails gets storage device details
func (h *StorageResourceHandler) getStorageDeviceDetails(ctx context.Context, deviceID string) (interface{}, error) {
	// For now, return a placeholder since we don't have storage device details in the current implementation
	return map[string]interface{}{
		"id":          deviceID,
		"name":        "sd" + deviceID,
		"type":        "disk",
		"size":        1024 * 1024 * 1024 * 50, // 50 GB
		"used_size":   1024 * 1024 * 1024 * 10, // 10 GB
		"free_size":   1024 * 1024 * 1024 * 40, // 40 GB
		"model":       "Samsung SSD 850 EVO",
		"serial":      "S3Z1NB0K123456",
		"path":        "/dev/sd" + deviceID,
		"status":      "active",
		"partitioned": true,
	}, nil
}

// getStorageDevicePartitions gets storage device partitions
func (h *StorageResourceHandler) getStorageDevicePartitions(ctx context.Context, deviceID string) (interface{}, error) {
	// For now, return a placeholder since we don't have storage device partitions in the current implementation
	partitions := []map[string]interface{}{
		{
			"id":         "1",
			"number":     1,
			"size":       1024 * 1024 * 1024 * 1, // 1 GB
			"path":       "/dev/sd" + deviceID + "1",
			"filesystem": "ext4",
			"mountpoint": "/boot",
		},
		{
			"id":         "2",
			"number":     2,
			"size":       1024 * 1024 * 1024 * 49, // 49 GB
			"path":       "/dev/sd" + deviceID + "2",
			"filesystem": "ext4",
			"mountpoint": "/",
		},
	}

	return map[string]interface{}{
		"device_id":  deviceID,
		"partitions": partitions,
	}, nil
}

// getStorageDeviceFilesystem gets storage device filesystem
func (h *StorageResourceHandler) getStorageDeviceFilesystem(ctx context.Context, deviceID string) (interface{}, error) {
	// For now, return a placeholder since we don't have storage device filesystem in the current implementation
	return map[string]interface{}{
		"device_id":     deviceID,
		"filesystem":    "ext4",
		"mountpoint":    "/",
		"mount_options": "rw,relatime",
		"uuid":          "12345678-1234-1234-1234-123456789abc",
		"label":         "root",
	}, nil
}
