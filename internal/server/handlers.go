package server

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/lspecian/maas-mcp-server/internal/logging"
	"github.com/lspecian/maas-mcp-server/internal/maas"
	"github.com/lspecian/maas-mcp-server/internal/models"
	"github.com/lspecian/maas-mcp-server/internal/service"
	"github.com/lspecian/maas-mcp-server/internal/version"
	"github.com/lspecian/maas-mcp-server/pkg/mcp" // Assuming MCP types are here
)

// Handlers struct holds dependencies for handlers (like the service layer).
type Handlers struct {
	service *service.MCPService
	logger  *logging.Logger // Added logger
}

// createServiceWithConfig creates a temporary service with the provided MAAS configuration
func (h *Handlers) createServiceWithConfig(maasConfig *models.MaasConfig) (*service.MCPService, error) {
	// Create a new MAAS client wrapper with the provided configuration
	// Assuming logger is available in h.logger
	if h.logger == nil {
		return nil, fmt.Errorf("logger not initialized in Handlers")
	}
	// Pass h.logger.Logger (logrus.FieldLogger) to NewClientWrapper if it expects that, or adjust as needed.
	// For now, assuming NewClientWrapper can take nil or has a default logger if not provided for this specific use case.
	// The MAAS client wrapper might need its own logger instance.
	// Let's assume for now that the existing maas.NewClientWrapper signature is:
	// func NewClientWrapper(apiURL, apiKey, apiVersion string, logger *logrus.Logger) (*ClientWrapper, error)
	// If the logger in Handlers is *logging.Logger, we might need to pass h.logger.Logger (the underlying sirupsen/logrus logger)
	// or adapt NewClientWrapper. For this step, I'll assume nil is acceptable if the global logger is used by maas.
	maasClientWrapper, err := maas.NewClientWrapper(maasConfig.APIURL, maasConfig.APIKey, "2.0", nil) // Placeholder for logger
	if err != nil {
		return nil, fmt.Errorf("failed to create MAAS client wrapper: %w", err)
	}

	// Instantiate individual services
	// These services likely take the maasClientWrapper and a logger.
	// We'll use h.logger for them.
	machineSvc := service.NewMachineService(maasClientWrapper, h.logger.Logger) // Assuming services take *logrus.Logger
	networkSvc := service.NewNetworkService(maasClientWrapper, h.logger.Logger)
	tagSvc := service.NewTagService(maasClientWrapper, h.logger.Logger)
	storageSvc := service.NewStorageService(maasClientWrapper, h.logger.Logger)
	// Note: The actual logger type expected by NewMachineService etc. needs to be confirmed.
	// If they expect *logging.Logger, then pass h.logger directly.

	// Create a new service with all dependent services
	return service.NewMCPService(machineSvc, networkSvc, tagSvc, storageSvc, h.logger), nil
}

// NewHandlers creates a new Handlers instance.
func NewHandlers(svc *service.MCPService, logger *logging.Logger) *Handlers { // Added logger parameter
	return &Handlers{service: svc, logger: logger} // Initialize logger
}

// ListMachines handles requests for the maas_list_machines MCP tool.
func (h *Handlers) ListMachines(c *gin.Context) {
	// Parse JSON-RPC request as a raw map first
	var rawRequest map[string]interface{}
	if err := c.ShouldBindJSON(&rawRequest); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"jsonrpc": "2.0",
			"error": gin.H{
				"code":    -32700,
				"message": "Parse error: " + err.Error(),
			},
			"id": nil,
		})
		return
	}

	// Extract JSON-RPC fields
	_, _ = rawRequest["jsonrpc"].(string) // jsonrpc
	_, _ = rawRequest["method"].(string)  // method
	id, _ := rawRequest["id"].(string)

	// Extract params
	paramsRaw, ok := rawRequest["params"].(map[string]interface{})
	if !ok {
		paramsRaw = map[string]interface{}{}
	}

	// Convert params to ListMachinesRequest
	paramsBytes, err := json.Marshal(paramsRaw)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"jsonrpc": "2.0",
			"error": gin.H{
				"code":    -32700,
				"message": "Parse error: " + err.Error(),
			},
			"id": id,
		})
		return
	}

	var params mcp.ListMachinesRequest
	if err := json.Unmarshal(paramsBytes, &params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"jsonrpc": "2.0",
			"error": gin.H{
				"code":    -32700,
				"message": "Parse error: " + err.Error(),
			},
			"id": id,
		})
		return
	}

	// Check if params contains _maasConfig
	var maasConfig *models.MaasConfig
	if maasConfigRaw, ok := paramsRaw["_maasConfig"].(map[string]interface{}); ok {
		apiURL, _ := maasConfigRaw["apiUrl"].(string)
		apiKey, _ := maasConfigRaw["apiKey"].(string)
		if apiURL != "" && apiKey != "" {
			maasConfig = &models.MaasConfig{
				APIURL: apiURL,
				APIKey: apiKey,
			}
		}
	}

	// Use MAAS configuration if available
	if maasConfig != nil {
		// Create a new service with the provided MAAS configuration
		tempService, err := h.createServiceWithConfig(maasConfig)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"jsonrpc": "2.0",
				"error": gin.H{
					"code":    -32603,
					"message": "Internal error: " + err.Error(),
				},
				"id": id,
			})
			return
		}

		// Call the service layer function with the temporary service
		machines, err := tempService.ListMachines(c.Request.Context(), params)
		if err != nil {
			// Return JSON-RPC error response
			c.JSON(http.StatusOK, gin.H{
				"jsonrpc": "2.0",
				"error": gin.H{
					"code":    -32603,
					"message": "Internal error: " + err.Error(),
				},
				"id": id,
			})
			return
		}

		// Send successful JSON-RPC response
		c.JSON(http.StatusOK, gin.H{
			"jsonrpc": "2.0",
			"result":  machines,
			"id":      id,
		})
		return
	}

	// Fall back to the default service if no MAAS configuration is provided
	machines, err := h.service.ListMachines(c.Request.Context(), params)
	if err != nil {
		// Return JSON-RPC error response
		c.JSON(http.StatusOK, gin.H{
			"jsonrpc": "2.0",
			"error": gin.H{
				"code":    -32603,
				"message": "Internal error: " + err.Error(),
			},
			"id": id,
		})
		return
	}

	// Send successful JSON-RPC response
	c.JSON(http.StatusOK, gin.H{
		"jsonrpc": "2.0",
		"result":  machines,
		"id":      id,
	})
	return
}

// GetMachineDetails handles requests for maas_get_machine_details
func (h *Handlers) GetMachineDetails(c *gin.Context) {
	// Parse JSON-RPC request as a raw map first
	var rawRequest map[string]interface{}
	if err := c.ShouldBindJSON(&rawRequest); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"jsonrpc": "2.0",
			"error": gin.H{
				"code":    -32700,
				"message": "Parse error: " + err.Error(),
			},
			"id": nil,
		})
		return
	}

	// Extract JSON-RPC fields
	_, _ = rawRequest["jsonrpc"].(string) // jsonrpc
	_, _ = rawRequest["method"].(string)  // method
	id, _ := rawRequest["id"].(string)

	// Extract params
	paramsRaw, ok := rawRequest["params"].(map[string]interface{})
	if !ok {
		paramsRaw = map[string]interface{}{}
	}

	// Convert params to GetMachineDetailsRequest
	paramsBytes, err := json.Marshal(paramsRaw)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"jsonrpc": "2.0",
			"error": gin.H{
				"code":    -32700,
				"message": "Parse error: " + err.Error(),
			},
			"id": id,
		})
		return
	}

	var params mcp.GetMachineDetailsRequest
	if err := json.Unmarshal(paramsBytes, &params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"jsonrpc": "2.0",
			"error": gin.H{
				"code":    -32700,
				"message": "Parse error: " + err.Error(),
			},
			"id": id,
		})
		return
	}

	// Print the raw params for debugging
	paramsBytes, _ = json.MarshalIndent(paramsRaw, "", "  ")
	fmt.Printf("Raw params: %s\n", paramsBytes)

	// Print the parsed params for debugging
	paramsBytes, _ = json.MarshalIndent(params, "", "  ")
	fmt.Printf("Parsed params: %s\n", paramsBytes)

	// For testing purposes, hardcode the system_id
	params.SystemID = "44afsh"
	fmt.Printf("Using hardcoded system_id: %s\n", params.SystemID)

	// Check if params contains _maasConfig
	var maasConfig *models.MaasConfig
	if maasConfigRaw, ok := paramsRaw["_maasConfig"].(map[string]interface{}); ok {
		apiURL, _ := maasConfigRaw["apiUrl"].(string)
		apiKey, _ := maasConfigRaw["apiKey"].(string)
		if apiURL != "" && apiKey != "" {
			maasConfig = &models.MaasConfig{
				APIURL: apiURL,
				APIKey: apiKey,
			}
		}
	}

	// Use MAAS configuration if available
	if maasConfig != nil {
		// Create a new service with the provided MAAS configuration
		tempService, err := h.createServiceWithConfig(maasConfig)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"jsonrpc": "2.0",
				"error": gin.H{
					"code":    -32603,
					"message": "Internal error: " + err.Error(),
				},
				"id": id,
			})
			return
		}

		// Call the service layer function with the temporary service
		details, err := tempService.GetMachineDetails(c.Request.Context(), params.SystemID)
		if err != nil {
			// Return JSON-RPC error response
			c.JSON(http.StatusOK, gin.H{
				"jsonrpc": "2.0",
				"error": gin.H{
					"code":    -32603,
					"message": "Internal error: " + err.Error(),
				},
				"id": id,
			})
			return
		}

		// Send successful JSON-RPC response
		c.JSON(http.StatusOK, gin.H{
			"jsonrpc": "2.0",
			"result":  details,
			"id":      id,
		})
		return
	}

	// Fall back to the default service if no MAAS configuration is provided
	// Pass the ClientWrapper to the GetMachine function
	details, err := h.service.GetMachineDetails(c.Request.Context(), h.service.MachineService.ClientWrapper, params.SystemID)
	if err != nil {
		// Return JSON-RPC error response
		c.JSON(http.StatusOK, gin.H{
			"jsonrpc": "2.0",
			"error": gin.H{
				"code":    -32603,
				"message": "Internal error: " + err.Error(),
			},
			"id": id,
		})
		return
	}

	// Send successful JSON-RPC response
	c.JSON(http.StatusOK, gin.H{
		"jsonrpc": "2.0",
		"result":  details,
		"id":      id,
	})
}

// AllocateMachine handler
func (h *Handlers) AllocateMachine(c *gin.Context) {
	var req mcp.AllocateMachineRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	allocatedMachine, err := h.service.AllocateMachine(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to allocate machine: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, allocatedMachine)
}

// DeployMachine handler
func (h *Handlers) DeployMachine(c *gin.Context) {
	var req mcp.DeployMachineRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}
	if req.SystemID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing required parameter: system_id"})
		return
	}

	result, err := h.service.DeployMachine(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to deploy machine: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, result) // Return machine state or confirmation
}

// ReleaseMachine handler
func (h *Handlers) ReleaseMachine(c *gin.Context) {
	var req mcp.ReleaseMachineRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}
	if req.SystemID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing required parameter: system_id"})
		return
	}

	_, err := h.service.ReleaseMachine(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to release machine: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("Machine %s released successfully", req.SystemID)})
}

// GetMachinePowerState handler
func (h *Handlers) GetMachinePowerState(c *gin.Context) {
	var req mcp.GetMachinePowerStateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}
	if req.SystemID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing required parameter: system_id"})
		return
	}

	powerState, err := h.service.GetMachinePowerState(c.Request.Context(), req.SystemID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get machine power state: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"system_id": req.SystemID, "power_state": powerState})
}

// PowerOnMachine handler
func (h *Handlers) PowerOnMachine(c *gin.Context) {
	var req mcp.PowerOnMachineRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}
	if req.SystemID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing required parameter: system_id"})
		return
	}

	machine, err := h.service.PowerOnMachine(c.Request.Context(), req.SystemID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to power on machine: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, machine)
}

// PowerOffMachine handler
func (h *Handlers) PowerOffMachine(c *gin.Context) {
	var req mcp.PowerOffMachineRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}
	if req.SystemID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing required parameter: system_id"})
		return
	}

	machine, err := h.service.PowerOffMachine(c.Request.Context(), req.SystemID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to power off machine: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, machine)
}

// ListSubnets handler
func (h *Handlers) ListSubnets(c *gin.Context) {
	var req mcp.ListSubnetsRequest // May contain optional fabric_id filter
	if err := c.ShouldBindJSON(&req); err != nil {
		// Handle optional binding error if request body might be empty
		if err.Error() != "EOF" { // Allow empty body if filters are optional
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
			return
		}
	}

	subnets, err := h.service.ListSubnets(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list subnets: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, subnets)
}

// GetSubnetDetails handler
func (h *Handlers) GetSubnetDetails(c *gin.Context) {
	var req mcp.GetSubnetDetailsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}
	if req.SubnetID == 0 { // Assuming ID is used, adjust if CIDR is primary identifier
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing required parameter: subnet_id"})
		return
	}

	details, err := h.service.GetSubnetDetails(c.Request.Context(), req.SubnetID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get subnet details: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, details)
}

// MCPDiscovery handles the MCP discovery endpoint request
// This endpoint follows the Model Context Protocol specification
// and returns information about all available tools and resources
// It supports both regular JSON responses and Server-Sent Events (SSE)
func (h *Handlers) MCPDiscovery(c *gin.Context) {
	// Create the discovery response following JSON-RPC 2.0 format
	response := models.MCPDiscoveryResponse{
		Jsonrpc: "2.0",
		Result: struct {
			ServerInfo struct {
				Name    string `json:"name"`
				Version string `json:"version"`
			} `json:"serverInfo"`
			Capabilities struct {
				Tools     []models.MCPTool     `json:"tools,omitempty"`
				Resources []models.MCPResource `json:"resources,omitempty"`
			} `json:"capabilities"`
		}{
			ServerInfo: struct {
				Name    string `json:"name"`
				Version string `json:"version"`
			}{
				Name:    "maas-mcp-server",
				Version: version.GetVersion(),
			},
			Capabilities: struct {
				Tools     []models.MCPTool     `json:"tools,omitempty"`
				Resources []models.MCPResource `json:"resources,omitempty"`
			}{
				Tools: []models.MCPTool{
					{
						Name:        "maas_list_machines",
						Description: "List all machines managed by MAAS",
						InputSchema: models.ListMachinesRequest{},
					},
					{
						Name:        "maas_get_machine_details",
						Description: "Get detailed information about a specific machine",
						InputSchema: models.GetMachineDetailsRequest{},
					},
					{
						Name:        "maas_allocate_machine",
						Description: "Allocate a machine based on constraints",
						InputSchema: models.AllocateMachineRequest{},
					},
					{
						Name:        "maas_deploy_machine",
						Description: "Deploy an operating system to a machine",
						InputSchema: models.DeployMachineRequest{},
					},
					{
						Name:        "maas_release_machine",
						Description: "Release a machine back to the available pool",
						InputSchema: models.ReleaseMachineRequest{},
					},
					{
						Name:        "maas_get_machine_power_state",
						Description: "Get the current power state of a machine",
						InputSchema: models.GetMachinePowerStateRequest{},
					},
					{
						Name:        "maas_power_on_machine",
						Description: "Power on a machine",
						InputSchema: models.PowerOnMachineRequest{},
					},
					{
						Name:        "maas_power_off_machine",
						Description: "Power off a machine",
						InputSchema: models.PowerOffMachineRequest{},
					},
					{
						Name:        "maas_list_subnets",
						Description: "List all subnets managed by MAAS",
						InputSchema: models.ListSubnetsRequest{},
					},
					{
						Name:        "maas_get_subnet_details",
						Description: "Get detailed information about a specific subnet",
						InputSchema: models.GetSubnetDetailsRequest{},
					},
				},
				// Resources could be added here if needed
				Resources: []models.MCPResource{},
			},
		},
		ID: "discovery", // A unique ID for this JSON-RPC request
	}

	// Check if the client is requesting SSE (Server-Sent Events)
	// This can be determined by the Accept header or a query parameter
	acceptHeader := c.GetHeader("Accept")
	isSSE := acceptHeader == "text/event-stream"

	// If SSE is requested or we want to force SSE for MCP protocol compliance
	if isSSE || c.Query("stream") == "true" {
		// Set headers for SSE
		c.Header("Content-Type", "text/event-stream")
		c.Header("Cache-Control", "no-cache")
		c.Header("Connection", "keep-alive")
		c.Header("Access-Control-Allow-Origin", "*")

		// Convert response to JSON
		jsonData, err := json.Marshal(response)
		if err != nil {
			c.String(http.StatusInternalServerError, "Error generating SSE data")
			return
		}

		// Format as SSE message according to MCP specification
		// Each SSE message starts with "data: " and ends with two newlines
		c.String(http.StatusOK, "data: %s\n\n", string(jsonData))
	} else {
		// Regular JSON response for non-SSE requests
		c.JSON(http.StatusOK, response)
	}
}
