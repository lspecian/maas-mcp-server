package transport

import (
	"context"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/lspecian/maas-mcp-server/internal/errors"
	"github.com/lspecian/maas-mcp-server/internal/models"
	"github.com/lspecian/maas-mcp-server/internal/service"
	"github.com/sirupsen/logrus"
)

// NetworkServiceInterface defines the interface for network service operations
type NetworkServiceInterface interface {
	ListSubnets(ctx context.Context, filters map[string]string) ([]models.SubnetContext, error)
	GetSubnetDetails(ctx context.Context, id int) (*models.SubnetContext, error)
	ListVLANs(ctx context.Context, fabricID int) ([]models.VLANContext, error)
}

// NetworkHandler handles HTTP requests for network management operations
type NetworkHandler struct {
	networkService NetworkServiceInterface
	logger         *logrus.Logger
}

// NewNetworkHandler creates a new network handler instance
func NewNetworkHandler(service NetworkServiceInterface, logger *logrus.Logger) *NetworkHandler {
	return &NetworkHandler{
		networkService: service,
		logger:         logger,
	}
}

// RegisterRoutes registers the network management routes with the provided router group
func (h *NetworkHandler) RegisterRoutes(router *gin.RouterGroup) {
	networks := router.Group("/networks")
	{
		networks.GET("/subnets", h.ListSubnets)
		networks.GET("/subnets/:id", h.GetSubnetDetails)
		networks.GET("/vlans", h.ListVLANs)
	}
}

// ListSubnets handles GET /networks/subnets requests
func (h *NetworkHandler) ListSubnets(c *gin.Context) {
	// Parse query parameters for filters
	filters := make(map[string]string)
	for k, v := range c.Request.URL.Query() {
		if len(v) > 0 {
			filters[k] = v[0]
		}
	}

	h.logger.WithField("filters", filters).Debug("Handling ListSubnets request")

	subnets, err := h.networkService.ListSubnets(c.Request.Context(), filters)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"subnets": subnets,
	})
}

// GetSubnetDetails handles GET /networks/subnets/:id requests
func (h *NetworkHandler) GetSubnetDetails(c *gin.Context) {
	idParam := c.Param("id")
	if idParam == "" {
		errors.GinBadRequest(c, "Subnet ID is required", nil)
		return
	}

	id, err := strconv.Atoi(idParam)
	if err != nil {
		errors.GinBadRequest(c, "Invalid subnet ID format, must be an integer", err)
		return
	}

	h.logger.WithField("id", id).Debug("Handling GetSubnetDetails request")

	subnet, err := h.networkService.GetSubnetDetails(c.Request.Context(), id)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, subnet)
}

// ListVLANs handles GET /networks/vlans requests
func (h *NetworkHandler) ListVLANs(c *gin.Context) {
	// Parse fabric_id from query parameters
	fabricIDStr := c.Query("fabric_id")
	var fabricID int
	var err error

	if fabricIDStr != "" {
		fabricID, err = strconv.Atoi(fabricIDStr)
		if err != nil {
			errors.GinBadRequest(c, "Invalid fabric_id format, must be an integer", err)
			return
		}
	} else {
		// Default to fabric_id=1 if not provided
		fabricID = 1
	}

	h.logger.WithField("fabric_id", fabricID).Debug("Handling ListVLANs request")

	vlans, err := h.networkService.ListVLANs(c.Request.Context(), fabricID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"vlans": vlans,
	})
}

// handleError handles service errors and maps them to appropriate HTTP responses
func (h *NetworkHandler) handleError(c *gin.Context, err error) {
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
