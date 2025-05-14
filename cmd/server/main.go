package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/lspecian/maas-mcp-server/internal/config"
	"github.com/lspecian/maas-mcp-server/internal/logging"
	"github.com/lspecian/maas-mcp-server/internal/maas"
	"github.com/lspecian/maas-mcp-server/internal/repository/machine"
	"github.com/lspecian/maas-mcp-server/internal/server"
	"github.com/lspecian/maas-mcp-server/internal/service"
	machineservice "github.com/lspecian/maas-mcp-server/internal/service/machine"
	"github.com/lspecian/maas-mcp-server/internal/transport"
	machinetransport "github.com/lspecian/maas-mcp-server/internal/transport/machine"
)

func main() {
	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		fmt.Printf("Failed to load configuration: %v\n", err)
		os.Exit(1)
	}

	// Initialize enhanced logger
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

	enhancedLogger, err := logging.NewEnhancedLogger(logConfig)
	if err != nil {
		fmt.Printf("Failed to create enhanced logger: %v\n", err)
		os.Exit(1)
	}

	// For backward compatibility, create a logrus logger
	logger := enhancedLogger.Logger
	logger.Info("Starting MCP server")

	// Create MAAS client (maasClient is unused, replaced by maasClientWrapper)
	// maasClient, err := maasclient.NewMaasClient(cfg, logger)
	// if err != nil {
	// 	logger.WithError(err).Fatal("Failed to create MAAS client")
	// }

	// Get the default MAAS instance
	maasInstance := cfg.GetDefaultMAASInstance()

	// Create a MAAS client wrapper for the MCP service
	maasClientWrapper, err := maas.NewClientWrapper(maasInstance.APIURL, maasInstance.APIKey, "2.0", logger)
	if err != nil {
		logger.WithError(err).Fatal("Failed to create MAAS client wrapper")
	}

	// Initialize repositories
	machineRepo := machine.NewMaasRepository(maasClientWrapper, logger)

	// Initialize services
	machineServiceNew := machineservice.NewService(machineRepo, logger)

	// For backward compatibility, keep the old services
	// These should use maasClientWrapper as it's being refactored for interface compliance
	machineServiceOld := service.NewMachineService(maasClientWrapper, logger)
	networkService := service.NewNetworkService(maasClientWrapper, logger)
	storageService := service.NewStorageService(maasClientWrapper, logger)
	volumeGroupService := service.NewVolumeGroupService(maasClientWrapper, logger)
	tagService := service.NewTagService(maasClientWrapper, logger)

	// Initialize HTTP handlers
	machineHandlerNew := machinetransport.NewHandler(machineServiceNew, logger)

	// For backward compatibility, keep the old handlers
	machineHandler := transport.NewMachineHandler(machineServiceOld, logger)
	networkHandler := transport.NewNetworkHandler(networkService, logger)
	storageHandler := transport.NewStorageHandler(storageService, logger)
	volumeGroupHandler := transport.NewVolumeGroupHandler(volumeGroupService, logger)
	tagHandler := transport.NewTagHandler(tagService, logger)

	// Initialize MCP service
	mcpService := service.NewMCPService(machineServiceOld, networkService, tagService, storageService, enhancedLogger)

	// Set up Gin router using the server package
	router := server.NewServerWithService(mcpService, cfg, logger)

	// Register API routes for new clean architecture handlers
	machineHandlerNew.RegisterRoutes(router)

	// Register API routes for backward compatibility
	apiGroup := router.Group("/api/v1")
	machineHandler.RegisterRoutes(apiGroup)
	networkHandler.RegisterRoutes(apiGroup)
	storageHandler.RegisterRoutes(apiGroup)
	volumeGroupHandler.RegisterRoutes(apiGroup)
	tagHandler.RegisterRoutes(apiGroup)

	// Start server
	srv := &http.Server{
		Addr:    fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port),
		Handler: router,
	}

	// Start server in a goroutine
	go func() {
		enhancedLogger.WithFields(map[string]interface{}{
			"host": cfg.Server.Host,
			"port": cfg.Server.Port,
		}).Info("HTTP server listening")

		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			enhancedLogger.WithField("error", err.Error()).Fatal("Failed to start server")
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	enhancedLogger.Info("Shutting down server...")

	// Create a deadline for graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Attempt graceful shutdown
	if err := srv.Shutdown(ctx); err != nil {
		enhancedLogger.WithField("error", err.Error()).Fatal("Server forced to shutdown")
	}

	// Close repositories
	if err := machineRepo.Close(); err != nil {
		enhancedLogger.WithField("error", err.Error()).Error("Failed to close machine repository")
	}

	// Close logger
	if err := enhancedLogger.Close(); err != nil {
		fmt.Printf("Failed to close logger: %v\n", err)
	}

	enhancedLogger.Info("Server exiting")
}
