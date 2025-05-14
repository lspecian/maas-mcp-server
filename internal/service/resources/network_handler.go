package resources

import (
	"context"
	"fmt"
	"strconv"

	"github.com/lspecian/maas-mcp-server/internal/errors"
	"github.com/lspecian/maas-mcp-server/internal/logging"
	"github.com/lspecian/maas-mcp-server/internal/models" // Added import for models
	"github.com/lspecian/maas-mcp-server/internal/service"
)

// NetworkResourceHandler handles network resource requests
type NetworkResourceHandler struct {
	BaseResourceHandler
	mcpService *service.MCPService
}

// NewNetworkResourceHandler creates a new network resource handler
func NewNetworkResourceHandler(mcpService *service.MCPService, logger *logging.Logger) *NetworkResourceHandler {
	return &NetworkResourceHandler{
		BaseResourceHandler: BaseResourceHandler{
			Name: "network",
			URIPatterns: []string{
				"maas://subnet/{subnet_id}",
				"maas://subnet/{subnet_id}/ip-ranges",
				"maas://subnet/{subnet_id}/reserved-ranges",
				"maas://subnet/{subnet_id}/dynamic-ranges",
				"maas://vlan/{vlan_id}",
				"maas://fabric/{fabric_id}",
				"maas://space/{space_id}",
			},
			Logger: logger,
		},
		mcpService: mcpService,
	}
}

// HandleRequest handles a network resource request
func (h *NetworkResourceHandler) HandleRequest(ctx context.Context, request *ResourceRequest) (interface{}, error) {
	// Parse the URI
	parsedURI, err := ParseURI(request.URI)
	if err != nil {
		return nil, errors.NewValidationError(fmt.Sprintf("Invalid URI: %s", err.Error()), err)
	}

	// Handle different resource types
	switch parsedURI.ResourceType {
	case "subnet":
		return h.handleSubnetResource(ctx, request)
	case "vlan":
		return h.handleVLANResource(ctx, request)
	case "fabric":
		return h.handleFabricResource(ctx, request)
	case "space":
		return h.handleSpaceResource(ctx, request)
	default:
		return nil, errors.NewNotFoundError(fmt.Sprintf("Resource type not found: %s", parsedURI.ResourceType), nil)
	}
}

// handleSubnetResource handles subnet-related resources
func (h *NetworkResourceHandler) handleSubnetResource(ctx context.Context, request *ResourceRequest) (interface{}, error) {
	// Get the subnet ID
	subnetIDStr := request.Parameters["subnet_id"]
	if subnetIDStr == "" {
		return nil, errors.NewValidationError("subnet_id is required", nil)
	}

	// Convert subnet ID to int
	subnetID, err := strconv.Atoi(subnetIDStr)
	if err != nil {
		return nil, errors.NewValidationError(fmt.Sprintf("Invalid subnet ID: %s", err.Error()), err)
	}

	// Parse the URI
	parsedURI, err := ParseURI(request.URI)
	if err != nil {
		return nil, errors.NewValidationError(fmt.Sprintf("Invalid URI: %s", err.Error()), err)
	}

	// Handle different sub-resource types
	switch parsedURI.SubResourceType {
	case "":
		// Get subnet details
		return h.mcpService.GetSubnetDetails(ctx, subnetID)
	case "ip-ranges":
		// Get IP ranges
		return h.handleIPRangesResource(ctx, subnetID, request)
	case "reserved-ranges":
		// Get reserved IP ranges
		return h.handleReservedRangesResource(ctx, subnetID, request)
	case "dynamic-ranges":
		// Get dynamic IP ranges
		return h.handleDynamicRangesResource(ctx, subnetID, request)
	default:
		return nil, errors.NewNotFoundError(fmt.Sprintf("Sub-resource not found: %s", parsedURI.SubResourceType), nil)
	}
}

// handleIPRangesResource handles IP ranges resources
func (h *NetworkResourceHandler) handleIPRangesResource(ctx context.Context, subnetID int, request *ResourceRequest) (interface{}, error) {
	// Get subnet details
	subnet, err := h.mcpService.GetSubnetDetails(ctx, subnetID)
	if err != nil {
		return nil, err
	}

	// For now, return a placeholder since we don't have IP ranges in the current implementation
	// Type assert subnet to *models.NetworkContext (or appropriate MAAS model)
	snet, ok := subnet.(*models.NetworkContext) // Assuming GetSubnetDetails returns *models.NetworkContext or compatible
	if !ok {
		// If it's a different MAAS model, adjust assertion or mapping
		// For now, assume it might be *maas.Subnet and try to access CIDR if direct model is different
		// This part might need adjustment based on actual GetSubnetDetails return type
		if concreteSubnet, castOK := subnet.(interface{ GetCIDR() string }); castOK { // Example if it's a MAAS type with a GetCIDR method
			return map[string]interface{}{
				"subnet_id": subnetID,
				"cidr":      concreteSubnet.GetCIDR(),
				"ranges":    []interface{}{},
			}, nil
		}
		// Fallback if no direct CIDR or GetCIDR method
		h.Logger.WithContext(ctx).Warnf("Failed to assert subnet to a known type with CIDR for ID %d", subnetID)
		return map[string]interface{}{
			"subnet_id": subnetID,
			"cidr":      "unknown", // Indicate CIDR couldn't be determined
			"ranges":    []interface{}{},
		}, nil
	}

	return map[string]interface{}{
		"subnet_id": subnetID,
		"cidr":      snet.CIDR,       // Use snet.CIDR
		"ranges":    []interface{}{}, // Empty array for now
	}, nil
}

// handleReservedRangesResource handles reserved IP ranges resources
func (h *NetworkResourceHandler) handleReservedRangesResource(ctx context.Context, subnetID int, request *ResourceRequest) (interface{}, error) {
	// Get subnet details
	subnet, err := h.mcpService.GetSubnetDetails(ctx, subnetID)
	if err != nil {
		return nil, err
	}

	// For now, return a placeholder since we don't have reserved ranges in the current implementation
	snet, ok := subnet.(*models.NetworkContext)
	if !ok {
		if concreteSubnet, castOK := subnet.(interface{ GetCIDR() string }); castOK {
			return map[string]interface{}{
				"subnet_id": subnetID,
				"cidr":      concreteSubnet.GetCIDR(),
				"ranges":    []interface{}{},
			}, nil
		}
		h.Logger.WithContext(ctx).Warnf("Failed to assert subnet to a known type with CIDR for ID %d (reserved ranges)", subnetID)
		return map[string]interface{}{
			"subnet_id": subnetID,
			"cidr":      "unknown",
			"ranges":    []interface{}{},
		}, nil
	}
	return map[string]interface{}{
		"subnet_id": subnetID,
		"cidr":      snet.CIDR,       // Use snet.CIDR
		"ranges":    []interface{}{}, // Empty array for now
	}, nil
}

// handleDynamicRangesResource handles dynamic IP ranges resources
func (h *NetworkResourceHandler) handleDynamicRangesResource(ctx context.Context, subnetID int, request *ResourceRequest) (interface{}, error) {
	// Get subnet details
	subnet, err := h.mcpService.GetSubnetDetails(ctx, subnetID)
	if err != nil {
		return nil, err
	}

	// For now, return a placeholder since we don't have dynamic ranges in the current implementation
	snet, ok := subnet.(*models.NetworkContext)
	if !ok {
		if concreteSubnet, castOK := subnet.(interface{ GetCIDR() string }); castOK {
			return map[string]interface{}{
				"subnet_id": subnetID,
				"cidr":      concreteSubnet.GetCIDR(),
				"ranges":    []interface{}{},
			}, nil
		}
		h.Logger.WithContext(ctx).Warnf("Failed to assert subnet to a known type with CIDR for ID %d (dynamic ranges)", subnetID)
		return map[string]interface{}{
			"subnet_id": subnetID,
			"cidr":      "unknown",
			"ranges":    []interface{}{},
		}, nil
	}
	return map[string]interface{}{
		"subnet_id": subnetID,
		"cidr":      snet.CIDR,       // Use snet.CIDR
		"ranges":    []interface{}{}, // Empty array for now
	}, nil
}

// handleVLANResource handles VLAN-related resources
func (h *NetworkResourceHandler) handleVLANResource(ctx context.Context, request *ResourceRequest) (interface{}, error) {
	// Get the VLAN ID
	vlanID := request.Parameters["vlan_id"]
	if vlanID == "" {
		return nil, errors.NewValidationError("vlan_id is required", nil)
	}

	// For now, return a placeholder since we don't have VLAN details in the current implementation
	return map[string]interface{}{
		"id":   vlanID,
		"name": "VLAN " + vlanID,
	}, nil
}

// handleFabricResource handles fabric-related resources
func (h *NetworkResourceHandler) handleFabricResource(ctx context.Context, request *ResourceRequest) (interface{}, error) {
	// Get the fabric ID
	fabricID := request.Parameters["fabric_id"]
	if fabricID == "" {
		return nil, errors.NewValidationError("fabric_id is required", nil)
	}

	// For now, return a placeholder since we don't have fabric details in the current implementation
	return map[string]interface{}{
		"id":   fabricID,
		"name": "Fabric " + fabricID,
	}, nil
}

// handleSpaceResource handles space-related resources
func (h *NetworkResourceHandler) handleSpaceResource(ctx context.Context, request *ResourceRequest) (interface{}, error) {
	// Get the space ID
	spaceID := request.Parameters["space_id"]
	if spaceID == "" {
		return nil, errors.NewValidationError("space_id is required", nil)
	}

	// For now, return a placeholder since we don't have space details in the current implementation
	return map[string]interface{}{
		"id":   spaceID,
		"name": "Space " + spaceID,
	}, nil
}
