package resources

import (
	"context"
	"fmt"

	"github.com/lspecian/maas-mcp-server/internal/errors"
	"github.com/lspecian/maas-mcp-server/internal/logging"
	"github.com/lspecian/maas-mcp-server/internal/service"
)

// TagResourceHandler handles tag resource requests
type TagResourceHandler struct {
	BaseResourceHandler
	mcpService *service.MCPService
}

// NewTagResourceHandler creates a new tag resource handler
func NewTagResourceHandler(mcpService *service.MCPService, logger *logging.Logger) *TagResourceHandler {
	return &TagResourceHandler{
		BaseResourceHandler: BaseResourceHandler{
			Name: "tag",
			URIPatterns: []string{
				"maas://tag/{tag_name}",
				"maas://tag/{tag_name}/machines",
				"maas://tags",
			},
			Logger: logger,
		},
		mcpService: mcpService,
	}
}

// HandleRequest handles a tag resource request
func (h *TagResourceHandler) HandleRequest(ctx context.Context, request *ResourceRequest) (interface{}, error) {
	// Parse the URI
	parsedURI, err := ParseURI(request.URI)
	if err != nil {
		return nil, errors.NewValidationError(fmt.Sprintf("Invalid URI: %s", err.Error()), err)
	}

	// Handle different resource paths
	switch {
	case parsedURI.ResourceType == "tags":
		// List all tags
		return h.listTags(ctx)
	case parsedURI.ResourceType == "tag" && parsedURI.SubResourceType == "":
		// Get tag details
		return h.getTagDetails(ctx, request.Parameters["tag_name"])
	case parsedURI.ResourceType == "tag" && parsedURI.SubResourceType == "machines":
		// Get machines with tag
		return h.getMachinesWithTag(ctx, request.Parameters["tag_name"])
	default:
		return nil, errors.NewNotFoundError(fmt.Sprintf("Resource not found: %s", request.URI), nil)
	}
}

// listTags lists all tags
func (h *TagResourceHandler) listTags(ctx context.Context) (interface{}, error) {
	// For now, return a placeholder since we don't have a direct tag listing method in the current implementation
	// In a real implementation, we would call a method like h.mcpService.ListTags(ctx)
	tags := []map[string]interface{}{
		{
			"name":        "web-server",
			"description": "Web server machines",
			"count":       5,
		},
		{
			"name":        "database",
			"description": "Database machines",
			"count":       3,
		},
		{
			"name":        "load-balancer",
			"description": "Load balancer machines",
			"count":       2,
		},
		{
			"name":        "development",
			"description": "Development machines",
			"count":       10,
		},
		{
			"name":        "production",
			"description": "Production machines",
			"count":       15,
		},
	}

	return map[string]interface{}{
		"tags": tags,
	}, nil
}

// getTagDetails gets tag details
func (h *TagResourceHandler) getTagDetails(ctx context.Context, tagName string) (interface{}, error) {
	if tagName == "" {
		return nil, errors.NewValidationError("tag_name is required", nil)
	}

	// For now, return a placeholder since we don't have a direct tag details method in the current implementation
	// In a real implementation, we would call a method like h.mcpService.GetTagDetails(ctx, tagName)
	return map[string]interface{}{
		"name":        tagName,
		"description": fmt.Sprintf("%s machines", tagName),
		"count":       5,
		"created_at":  "2023-01-01T00:00:00Z",
		"updated_at":  "2023-01-01T00:00:00Z",
	}, nil
}

// getMachinesWithTag gets machines with a specific tag
func (h *TagResourceHandler) getMachinesWithTag(ctx context.Context, tagName string) (interface{}, error) {
	if tagName == "" {
		return nil, errors.NewValidationError("tag_name is required", nil)
	}

	// In a real implementation, we would call a method like h.mcpService.ListMachines(ctx, map[string]string{"tags": tagName})
	// For now, we'll create a placeholder response
	machines := []map[string]interface{}{
		{
			"system_id":   "abc123",
			"hostname":    "machine1",
			"status":      "Deployed",
			"power_state": "on",
			"tags":        []string{tagName, "other-tag"},
		},
		{
			"system_id":   "def456",
			"hostname":    "machine2",
			"status":      "Deployed",
			"power_state": "on",
			"tags":        []string{tagName, "another-tag"},
		},
		{
			"system_id":   "ghi789",
			"hostname":    "machine3",
			"status":      "Ready",
			"power_state": "off",
			"tags":        []string{tagName},
		},
	}

	return map[string]interface{}{
		"tag_name": tagName,
		"count":    len(machines),
		"machines": machines,
	}, nil
}
