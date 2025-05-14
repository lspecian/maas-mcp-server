package resources

import (
	"context"
	"fmt"

	"github.com/lspecian/maas-mcp-server/internal/errors"
	"github.com/lspecian/maas-mcp-server/internal/logging"
	"github.com/lspecian/maas-mcp-server/internal/models" // Added import for models
	"github.com/lspecian/maas-mcp-server/internal/service"
)

// MachineResourceHandler handles machine resource requests
type MachineResourceHandler struct {
	BaseResourceHandler
	mcpService *service.MCPService
	processor  *ResourceProcessor
}

// NewMachineResourceHandler creates a new machine resource handler
func NewMachineResourceHandler(mcpService *service.MCPService, logger *logging.Logger) *MachineResourceHandler {
	return &MachineResourceHandler{
		BaseResourceHandler: BaseResourceHandler{
			Name: "machine",
			URIPatterns: []string{
				"maas://machine/{system_id}",
				"maas://machine/{system_id}/power",
				"maas://machine/{system_id}/interfaces",
				"maas://machine/{system_id}/storage",
				"maas://machine/{system_id}/tags",
			},
			Logger: logger,
		},
		mcpService: mcpService,
		processor:  NewResourceProcessor(logger),
	}
}

// HandleRequest handles a machine resource request
func (h *MachineResourceHandler) HandleRequest(ctx context.Context, request *ResourceRequest) (interface{}, error) {
	// Parse the URI
	parsedURI, err := ParseURI(request.URI)
	if err != nil {
		return nil, errors.NewValidationError(fmt.Sprintf("Invalid URI: %s", err.Error()), err)
	}

	// Get the system ID
	systemID := request.Parameters["system_id"]
	if systemID == "" {
		return nil, errors.NewValidationError("system_id is required", nil)
	}

	// Handle different resource paths
	var result interface{}
	var resultErr error

	switch {
	case parsedURI.SubResourceType == "":
		// Get machine details
		result, resultErr = h.mcpService.GetMachineDetails(ctx, systemID)

	case parsedURI.SubResourceType == "power":
		// Get machine power state
		result, resultErr = h.handlePowerResource(ctx, systemID, request)

	case parsedURI.SubResourceType == "interfaces":
		// Get machine interfaces
		result, resultErr = h.handleInterfacesResource(ctx, systemID, request)

	case parsedURI.SubResourceType == "storage":
		// Get machine storage
		result, resultErr = h.handleStorageResource(ctx, systemID, request)

	case parsedURI.SubResourceType == "tags":
		// Get machine tags
		result, resultErr = h.handleTagsResource(ctx, systemID, request)

	default:
		return nil, errors.NewNotFoundError(fmt.Sprintf("Resource not found: %s", request.URI), nil)
	}

	if resultErr != nil {
		return nil, resultErr
	}

	// Apply filtering and pagination
	processedResult, err := h.processor.ProcessResource(ctx, result, request)
	if err != nil {
		h.Logger.WithContext(ctx).WithError(err).Warn("Error processing resource")
		// Continue with the original result if processing fails
		return result, nil
	}

	return processedResult, nil
}

// No replacement needed - removing the duplicate function

// handlePowerResource handles power-related resources
func (h *MachineResourceHandler) handlePowerResource(ctx context.Context, systemID string, request *ResourceRequest) (interface{}, error) {
	// If no sub-resource ID, get the power state
	if request.Parameters["sub_resource_id"] == "" {
		powerState, err := h.mcpService.GetMachinePowerState(ctx, systemID)
		if err != nil {
			return nil, err
		}

		return map[string]interface{}{
			"system_id":   systemID,
			"power_state": powerState,
		}, nil
	}

	return nil, errors.NewNotFoundError(fmt.Sprintf("Resource not found: %s", request.URI), nil)
}

// handleInterfacesResource handles interface-related resources
func (h *MachineResourceHandler) handleInterfacesResource(ctx context.Context, systemID string, request *ResourceRequest) (interface{}, error) {
	// Get machine details to extract interfaces
	machineDetails, err := h.mcpService.GetMachineDetails(ctx, systemID)
	if err != nil {
		return nil, err
	}

	// If we have a specific interface ID
	if interfaceID := request.Parameters["sub_resource_id"]; interfaceID != "" {
		// Type assert machineDetails to *models.MachineContext
		md, ok := machineDetails.(*models.MachineContext)
		if !ok {
			return nil, errors.NewInternalError("Failed to assert machineDetails to *models.MachineContext", nil)
		}
		// Find the specific interface
		for _, iface := range md.NetworkInterfaces { // Changed from md.Networks
			// Convert ID to string for comparison - Assuming iface.ID is string as per NetworkContext
			if iface.ID == interfaceID {
				return iface, nil
			}
		}
		return nil, errors.NewNotFoundError(fmt.Sprintf("Interface not found: %s", interfaceID), nil)
	}

	// Type assert machineDetails to *models.MachineContext
	md, ok := machineDetails.(*models.MachineContext)
	if !ok {
		return nil, errors.NewInternalError("Failed to assert machineDetails to *models.MachineContext", nil)
	}
	// Return all interfaces
	return md.NetworkInterfaces, nil // Changed from md.Networks
}

// handleStorageResource handles storage-related resources
func (h *MachineResourceHandler) handleStorageResource(ctx context.Context, systemID string, request *ResourceRequest) (interface{}, error) {
	// Get machine details to extract storage
	machineDetails, err := h.mcpService.GetMachineDetails(ctx, systemID)
	if err != nil {
		return nil, err
	}

	// If we have a specific storage ID
	if storageID := request.Parameters["sub_resource_id"]; storageID != "" {
		// Type assert machineDetails to *models.MachineContext
		md, ok := machineDetails.(*models.MachineContext)
		if !ok {
			return nil, errors.NewInternalError("Failed to assert machineDetails to *models.MachineContext", nil)
		}
		// Find the specific storage
		for _, storage := range md.BlockDevices { // Changed from md.Storage
			// Convert ID to string for comparison - Assuming storage.ID is string as per StorageContext
			if storage.ID == storageID {
				return storage, nil
			}
		}
		return nil, errors.NewNotFoundError(fmt.Sprintf("Storage not found: %s", storageID), nil)
	}

	// Type assert machineDetails to *models.MachineContext
	md, ok := machineDetails.(*models.MachineContext)
	if !ok {
		return nil, errors.NewInternalError("Failed to assert machineDetails to *models.MachineContext", nil)
	}
	// Return all storage
	return md.BlockDevices, nil // Changed from md.Storage
}

// handleTagsResource handles tag-related resources
func (h *MachineResourceHandler) handleTagsResource(ctx context.Context, systemID string, request *ResourceRequest) (interface{}, error) {
	// Get machine details to extract tags
	machineDetails, err := h.mcpService.GetMachineDetails(ctx, systemID)
	if err != nil {
		return nil, err
	}

	// If we have a specific tag
	if tagName := request.Parameters["sub_resource_id"]; tagName != "" {
		// Type assert machineDetails to *models.MachineContext
		md, ok := machineDetails.(*models.MachineContext)
		if !ok {
			return nil, errors.NewInternalError("Failed to assert machineDetails to *models.MachineContext", nil)
		}
		// Check if the tag exists
		for _, tag := range md.Tags { // Use md.Tags
			if tag == tagName {
				return map[string]interface{}{
					"name": tag,
				}, nil
			}
		}
		return nil, errors.NewNotFoundError(fmt.Sprintf("Tag not found: %s", tagName), nil)
	}

	// Type assert machineDetails to *models.MachineContext
	md, ok := machineDetails.(*models.MachineContext)
	if !ok {
		return nil, errors.NewInternalError("Failed to assert machineDetails to *models.MachineContext", nil)
	}
	// Return all tags
	tags := make([]map[string]interface{}, len(md.Tags)) // Use md.Tags
	for i, tag := range md.Tags {                        // Use md.Tags
		tags[i] = map[string]interface{}{
			"name": tag,
		}
	}
	return tags, nil
}
