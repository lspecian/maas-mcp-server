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

// MachineServiceInterface defines the interface for machine service operations
type MachineServiceInterface interface {
	ListMachines(ctx context.Context, filters map[string]string) ([]models.MachineContext, error)
	GetMachine(ctx context.Context, id string) (*models.MachineContext, error)
	GetMachinePowerState(ctx context.Context, id string) (string, error)
	AllocateMachine(ctx context.Context, constraints map[string]string) (*models.MachineContext, error)
	DeployMachine(ctx context.Context, id string, osConfig map[string]string) (*models.MachineContext, error)
	ReleaseMachine(ctx context.Context, id string, comment string) error
}

// MachineHandler handles HTTP requests for machine management operations
type MachineHandler struct {
	machineService MachineServiceInterface
	logger         *logrus.Logger
}

// NewMachineHandler creates a new machine handler instance
func NewMachineHandler(service MachineServiceInterface, logger *logrus.Logger) *MachineHandler {
	return &MachineHandler{
		machineService: service,
		logger:         logger,
	}
}

// RegisterRoutes registers the machine management routes with the provided router group
func (h *MachineHandler) RegisterRoutes(router *gin.RouterGroup) {
	machines := router.Group("/machines")
	{
		machines.GET("", h.ListMachines)
		machines.GET("/:id", h.GetMachine)
		machines.GET("/:id/power", h.GetMachinePowerState)
		machines.POST("/allocate", h.AllocateMachine)
		machines.POST("/:id/deploy", h.DeployMachine)
		machines.POST("/:id/release", h.ReleaseMachine)
	}
}

// ListMachines handles GET /machines requests
func (h *MachineHandler) ListMachines(c *gin.Context) {
	// Parse query parameters for filters
	filters := make(map[string]string)
	for k, v := range c.Request.URL.Query() {
		if len(v) > 0 {
			filters[k] = v[0]
		}
	}

	h.logger.WithField("filters", filters).Debug("Handling ListMachines request")

	machines, err := h.machineService.ListMachines(c.Request.Context(), filters)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"machines": machines,
	})
}

// GetMachine handles GET /machines/:id requests
func (h *MachineHandler) GetMachine(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		errors.GinBadRequest(c, "Machine ID is required", nil)
		return
	}

	h.logger.WithField("id", id).Debug("Handling GetMachine request")

	machine, err := h.machineService.GetMachine(c.Request.Context(), id)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, machine)
}

// GetMachinePowerState handles GET /machines/:id/power requests
func (h *MachineHandler) GetMachinePowerState(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		errors.GinBadRequest(c, "Machine ID is required", nil)
		return
	}

	h.logger.WithField("id", id).Debug("Handling GetMachinePowerState request")

	powerState, err := h.machineService.GetMachinePowerState(c.Request.Context(), id)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":          id,
		"power_state": powerState,
	})
}

// AllocateMachine handles POST /machines/allocate requests
func (h *MachineHandler) AllocateMachine(c *gin.Context) {
	var request struct {
		Constraints map[string]string `json:"constraints"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		errors.GinBadRequest(c, "Invalid request format", err)
		return
	}

	h.logger.WithField("constraints", request.Constraints).Debug("Handling AllocateMachine request")

	machine, err := h.machineService.AllocateMachine(c.Request.Context(), request.Constraints)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, machine)
}

// DeployMachine handles POST /machines/:id/deploy requests
func (h *MachineHandler) DeployMachine(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		errors.GinBadRequest(c, "Machine ID is required", nil)
		return
	}

	var request struct {
		OSConfig map[string]string `json:"os_config"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		errors.GinBadRequest(c, "Invalid request format", err)
		return
	}

	h.logger.WithFields(logrus.Fields{
		"id":        id,
		"os_config": request.OSConfig,
	}).Debug("Handling DeployMachine request")

	machine, err := h.machineService.DeployMachine(c.Request.Context(), id, request.OSConfig)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, machine)
}

// ReleaseMachine handles POST /machines/:id/release requests
func (h *MachineHandler) ReleaseMachine(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		errors.GinBadRequest(c, "Machine ID is required", nil)
		return
	}

	var request struct {
		Comment string `json:"comment"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		// Comment is optional, so we'll just use an empty string if the request body is invalid
		request.Comment = ""
	}

	h.logger.WithFields(logrus.Fields{
		"id":      id,
		"comment": request.Comment,
	}).Debug("Handling ReleaseMachine request")

	err := h.machineService.ReleaseMachine(c.Request.Context(), id, request.Comment)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Machine released successfully",
	})
}

// handleError handles service errors and maps them to appropriate HTTP responses
func (h *MachineHandler) handleError(c *gin.Context, err error) {
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
