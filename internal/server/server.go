package server

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lspecian/maas-mcp-server/internal/auth"
	"github.com/lspecian/maas-mcp-server/internal/config"
	"github.com/lspecian/maas-mcp-server/internal/logging"
	"github.com/lspecian/maas-mcp-server/internal/middleware"
	"github.com/lspecian/maas-mcp-server/internal/models"
	"github.com/lspecian/maas-mcp-server/internal/service" // Added for StorageConstraintsServiceInterface
	"github.com/lspecian/maas-mcp-server/internal/transport/mcp"
	"github.com/sirupsen/logrus"
)

// Server represents the HTTP server
type Server struct {
	router      *gin.Engine
	server      *http.Server
	logger      *logging.Logger
	mcpService  *service.MCPService
	handlers    *Handlers
	mcpServer   *mcp.Server
	authHandler *auth.Middleware
}

// NewServer creates a new server instance
func NewServer() (*Server, error) {
	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to load configuration: %w", err)
	}

	// Create logger
	logConfig := logging.LoggerConfig{
		Level:      cfg.Logging.Level,
		Format:     logging.LogFormat(cfg.Logging.Format),
		FilePath:   cfg.Logging.FilePath,
		MaxAge:     time.Duration(cfg.Logging.MaxAge) * 24 * time.Hour,
		RotateTime: time.Duration(cfg.Logging.RotateTime) * time.Hour,
		Fields: map[string]interface{}{
			"service": "maas-mcp-server",
		},
	}

	logger, err := logging.NewEnhancedLogger(logConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create logger: %w", err)
	}

	// Set Gin mode
	if cfg.Logging.Level == "debug" {
		gin.SetMode(gin.DebugMode)
	} else {
		gin.SetMode(gin.ReleaseMode)
	}

	// Create router
	router := gin.New()

	// Add middleware
	router.Use(middleware.ErrorHandlerMiddleware(logger))
	router.Use(logging.GinLoggerMiddleware(logger))
	router.Use(gin.Recovery())

	// Set 404 handler
	router.NoRoute(middleware.NotFoundMiddleware(logger))

	// Set 405 handler
	router.NoMethod(middleware.MethodNotAllowedMiddleware(logger))

	// Create HTTP server
	server := &http.Server{
		Addr:    fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port),
		Handler: router,
	}

	// Create auth middleware
	authHandler, err := auth.NewMiddleware(cfg, logger.Logger)
	if err != nil {
		return nil, fmt.Errorf("failed to create auth middleware: %w", err)
	}

	return &Server{
		router:      router,
		server:      server,
		logger:      logger,
		authHandler: authHandler,
	}, nil
}

// NewServerWithService creates a new server instance with the provided service
// This maintains backward compatibility with the existing code
func NewServerWithService(mcpService *service.MCPService, cfg *models.AppConfig, logger *logrus.Logger) *gin.Engine {
	// Create a wrapper logger for compatibility
	logConfig := logging.LoggerConfig{
		Level:  cfg.Logging.Level,
		Format: logging.LogFormat(cfg.Logging.Format),
		Fields: map[string]interface{}{
			"service": "maas-mcp-server",
		},
	}

	// Create enhanced logger
	enhancedLogger, err := logging.NewEnhancedLogger(logConfig)
	if err != nil {
		// Fallback to basic logger
		enhancedLogger = &logging.Logger{
			Logger: logger,
		}
	}

	// Set Gin mode
	if cfg.Logging.Level == "debug" {
		gin.SetMode(gin.DebugMode)
	} else {
		gin.SetMode(gin.ReleaseMode)
	}

	// Create router
	router := gin.New()

	// Add middleware
	router.Use(middleware.ErrorHandlerMiddleware(enhancedLogger))
	router.Use(logging.GinLoggerMiddleware(enhancedLogger))
	router.Use(gin.Recovery())

	// Set 404 handler
	router.NoRoute(middleware.NotFoundMiddleware(enhancedLogger))

	// Set 405 handler
	router.NoMethod(middleware.MethodNotAllowedMiddleware(enhancedLogger))

	// Create handlers
	handlers := NewHandlers(mcpService, enhancedLogger) // Pass enhancedLogger

	// Register MCP routes
	router.POST("/mcp", handlers.MCPDiscovery)
	router.POST("/mcp/maas_list_machines", handlers.ListMachines)
	router.POST("/mcp/maas_get_machine_details", handlers.GetMachineDetails)
	router.POST("/mcp/maas_allocate_machine", handlers.AllocateMachine)
	router.POST("/mcp/maas_deploy_machine", handlers.DeployMachine)
	router.POST("/mcp/maas_release_machine", handlers.ReleaseMachine)
	router.POST("/mcp/maas_get_machine_power_state", handlers.GetMachinePowerState)
	router.POST("/mcp/maas_power_on_machine", handlers.PowerOnMachine)
	router.POST("/mcp/maas_power_off_machine", handlers.PowerOffMachine)
	router.POST("/mcp/maas_list_subnets", handlers.ListSubnets)
	router.POST("/mcp/maas_get_subnet_details", handlers.GetSubnetDetails)

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	return router
}

// Router returns the Gin router
func (s *Server) Router() *gin.Engine {
	return s.router
}

// Logger returns the logger
func (s *Server) Logger() *logging.Logger {
	return s.logger
}

// SetMCPService sets the MCP service
func (s *Server) SetMCPService(mcpService *service.MCPService) {
	s.mcpService = mcpService
	s.handlers = NewHandlers(mcpService, s.logger) // Pass s.logger

	// Get the app config
	cfg, err := config.LoadConfig()
	if err != nil {
		s.logger.WithField("error", err.Error()).Error("Failed to load configuration")
		return
	}

	// Create MCP server
	// Pass s.mcpService directly. The compiler will check if it satisfies
	// transport.StorageConstraintsServiceInterface. If not, it will result in a compile error.
	// This assumes that *service.MCPService is designed to implement or provide this interface.
	s.mcpServer = mcp.NewServer(s.mcpService, s.mcpService, s.logger, cfg, s.authHandler)

	// Register MCP routes
	s.mcpServer.RegisterRoutes(s.router)

	// Health check endpoint
	s.router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
}

// Start starts the server
func (s *Server) Start() error {
	// Start configuration watcher
	if err := config.StartConfigWatcher(); err != nil {
		s.logger.WithField("error", err.Error()).Error("Failed to start configuration watcher")
	}

	// Subscribe to configuration changes
	go s.handleConfigChanges()

	// Log server start
	s.logger.WithField("address", s.server.Addr).Info("Starting server")

	// Start server
	if err := s.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		return fmt.Errorf("failed to start server: %w", err)
	}

	return nil
}

// Stop stops the server
func (s *Server) Stop() error {
	s.logger.Info("Stopping server")

	// Create a context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Shutdown server
	if err := s.server.Shutdown(ctx); err != nil {
		return fmt.Errorf("failed to stop server: %w", err)
	}

	// Close logger
	if err := s.logger.Close(); err != nil {
		return fmt.Errorf("failed to close logger: %w", err)
	}

	return nil
}

// Run runs the server until a signal is received
func (s *Server) Run() error {
	// Create a channel to receive signals
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Start server in a goroutine
	go func() {
		if err := s.Start(); err != nil {
			s.logger.WithField("error", err.Error()).Fatal("Failed to start server")
		}
	}()

	// Wait for signal
	sig := <-sigChan
	s.logger.WithField("signal", sig.String()).Info("Received signal")

	// Stop server
	if err := s.Stop(); err != nil {
		return fmt.Errorf("failed to stop server: %w", err)
	}

	return nil
}

// handleConfigChanges handles configuration changes
func (s *Server) handleConfigChanges() {
	configChan := config.GetConfigChangeChannel()

	for event := range configChan {
		// Check if logging configuration has changed
		oldLogging := event.OldConfig.Logging
		newLogging := event.NewConfig.Logging

		if oldLogging.Level != newLogging.Level {
			s.logger.WithFields(map[string]interface{}{
				"old_level": oldLogging.Level,
				"new_level": newLogging.Level,
			}).Info("Logging level changed")

			// Update log level
			if err := s.logger.SetLevel(newLogging.Level); err != nil {
				s.logger.WithField("error", err.Error()).Error("Failed to update log level")
			}
		}

		// Check if log file path has changed
		if oldLogging.FilePath != newLogging.FilePath {
			s.logger.WithFields(map[string]interface{}{
				"old_path": oldLogging.FilePath,
				"new_path": newLogging.FilePath,
			}).Info("Log file path changed")

			// Update log file path
			if newLogging.FilePath != "" {
				if err := s.logger.SetOutput(
					newLogging.FilePath,
					time.Duration(newLogging.MaxAge)*24*time.Hour,
					time.Duration(newLogging.RotateTime)*time.Hour,
				); err != nil {
					s.logger.WithField("error", err.Error()).Error("Failed to update log file path")
				}
			}
		}
	}
}
