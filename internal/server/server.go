package server

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/lspecian/maas-mcp-server/internal/auth"
	"github.com/lspecian/maas-mcp-server/internal/config"
	"github.com/lspecian/maas-mcp-server/internal/service"
	"github.com/sirupsen/logrus"
)

// Server holds dependencies for the HTTP server.
type Server struct {
	service        *service.MCPService
	router         *gin.Engine
	logger         *logrus.Logger
	authMiddleware *auth.Middleware
}

// NewServer creates a new Server instance.
func NewServer(svc *service.MCPService, cfg *config.Config, logger *logrus.Logger) *gin.Engine {
	router := gin.New() // Create a new Gin instance without default middleware

	// Add recovery middleware
	router.Use(gin.Recovery())

	// Add CORS middleware for MCP compatibility
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Accept, Origin, Authorization")
		c.Writer.Header().Set("Access-Control-Expose-Headers", "Content-Length, Content-Type")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	})

	// Initialize auth middleware
	authMiddleware, err := auth.NewMiddleware(cfg, logger)
	if err != nil {
		logger.WithError(err).Fatal("Failed to initialize auth middleware")
	}

	// Add auth middleware
	router.Use(authMiddleware.Handler())

	// Create handlers instance (if separating handlers logic)
	handlers := NewHandlers(svc)

	// Define MCP tool routes
	mcpGroup := router.Group("/mcp")
	{
		// MCP Discovery endpoint - must be GET method
		mcpGroup.GET("", handlers.MCPDiscovery)

		// Machine Tools
		mcpGroup.POST("/maas_list_machines", handlers.ListMachines)
		mcpGroup.POST("/maas_get_machine_details", handlers.GetMachineDetails)
		mcpGroup.POST("/maas_get_machine_power_state", handlers.GetMachinePowerState)
		mcpGroup.POST("/maas_power_on_machine", handlers.PowerOnMachine)
		mcpGroup.POST("/maas_power_off_machine", handlers.PowerOffMachine)
		mcpGroup.POST("/maas_allocate_machine", handlers.AllocateMachine)
		mcpGroup.POST("/maas_deploy_machine", handlers.DeployMachine)
		mcpGroup.POST("/maas_release_machine", handlers.ReleaseMachine)

		// Network Tools
		mcpGroup.POST("/maas_list_subnets", handlers.ListSubnets)
		mcpGroup.POST("/maas_get_subnet_details", handlers.GetSubnetDetails)
		//... other network routes

		// Add routes for other tools (Storage, Tags, etc.)
	}

	// Simple health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	return router // Return the engine for main to run
}
