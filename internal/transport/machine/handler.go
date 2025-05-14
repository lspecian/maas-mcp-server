package machine

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

// Handler handles HTTP requests for machine operations
type Handler struct {
	service Service
	logger  *logrus.Logger
}

// NewHandler creates a new machine handler
func NewHandler(service Service, logger *logrus.Logger) *Handler {
	return &Handler{
		service: service,
		logger:  logger,
	}
}

// RegisterRoutes registers the machine routes with the given router
func (h *Handler) RegisterRoutes(router *gin.Engine) {
	machineGroup := router.Group("/api/v1/machines")
	{
		machineGroup.GET("", h.ListMachines)
		machineGroup.GET("/:id", h.GetMachine)
		machineGroup.GET("/:id/power", h.GetMachinePowerState)
		machineGroup.POST("", h.AllocateMachine)
		machineGroup.POST("/:id/deploy", h.DeployMachine)
		machineGroup.POST("/:id/release", h.ReleaseMachine)
		machineGroup.POST("/:id/power/on", h.PowerOnMachine)
		machineGroup.POST("/:id/power/off", h.PowerOffMachine)
	}
}

// ListMachines handles GET /api/v1/machines
func (h *Handler) ListMachines(c *gin.Context) {
	// Extract query parameters as filters
	filters := make(map[string]string)
	for key, values := range c.Request.URL.Query() {
		if len(values) > 0 {
			filters[key] = values[0]
		}
	}

	// Call service
	machines, err := h.service.ListMachines(c.Request.Context(), filters)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, machines)
}

// GetMachine handles GET /api/v1/machines/:id
func (h *Handler) GetMachine(c *gin.Context) {
	id := c.Param("id")

	// Call service
	machine, err := h.service.GetMachine(c.Request.Context(), id)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, machine)
}

// GetMachinePowerState handles GET /api/v1/machines/:id/power
func (h *Handler) GetMachinePowerState(c *gin.Context) {
	id := c.Param("id")

	// Call service
	powerState, err := h.service.GetMachinePowerState(c.Request.Context(), id)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"power_state": powerState})
}

// AllocateMachine handles POST /api/v1/machines
func (h *Handler) AllocateMachine(c *gin.Context) {
	// Parse request body
	var constraints map[string]string
	if err := json.NewDecoder(c.Request.Body).Decode(&constraints); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Call service
	machine, err := h.service.AllocateMachine(c.Request.Context(), constraints)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, machine)
}

// DeployMachine handles POST /api/v1/machines/:id/deploy
func (h *Handler) DeployMachine(c *gin.Context) {
	id := c.Param("id")

	// Parse request body
	var osConfig map[string]string
	if err := json.NewDecoder(c.Request.Body).Decode(&osConfig); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Call service
	machine, err := h.service.DeployMachine(c.Request.Context(), id, osConfig)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, machine)
}

// ReleaseMachine handles POST /api/v1/machines/:id/release
func (h *Handler) ReleaseMachine(c *gin.Context) {
	id := c.Param("id")

	// Parse request body
	var request struct {
		Comment string `json:"comment"`
	}
	if err := json.NewDecoder(c.Request.Body).Decode(&request); err != nil {
		// If body is empty, use empty comment
		request.Comment = ""
	}

	// Call service
	err := h.service.ReleaseMachine(c.Request.Context(), id, request.Comment)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Machine released successfully"})
}

// PowerOnMachine handles POST /api/v1/machines/:id/power/on
func (h *Handler) PowerOnMachine(c *gin.Context) {
	id := c.Param("id")

	// Call service
	machine, err := h.service.PowerOnMachine(c.Request.Context(), id)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, machine)
}

// PowerOffMachine handles POST /api/v1/machines/:id/power/off
func (h *Handler) PowerOffMachine(c *gin.Context) {
	id := c.Param("id")

	// Call service
	machine, err := h.service.PowerOffMachine(c.Request.Context(), id)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, machine)
}

// handleError handles errors from the service layer
func (h *Handler) handleError(c *gin.Context, err error) {
	// Check if it's a service error with status code
	type serviceError interface {
		Error() string
		StatusCode() int
	}

	if serviceErr, ok := err.(serviceError); ok {
		c.JSON(serviceErr.StatusCode(), gin.H{"error": serviceErr.Error()})
		return
	}

	// Default to internal server error
	c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
}
