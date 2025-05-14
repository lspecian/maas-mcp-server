package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/sirupsen/logrus"

	"github.com/lspecian/maas-mcp-server/internal/config"
	"github.com/lspecian/maas-mcp-server/internal/logging"
	"github.com/lspecian/maas-mcp-server/internal/maas"
	"github.com/lspecian/maas-mcp-server/internal/maasclient"
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

	// Initialize logger
	logger := logging.NewLogger(cfg.Logging.Level)
	logger.Info("Starting MCP server")

	// Create MAAS client
	maasClient, err := maasclient.NewMaasClient(cfg, logger)
	if err != nil {
		logger.WithError(err).Fatal("Failed to create MAAS client")
	}

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
	machineServiceOld := service.NewMachineService(maasClient, logger)
	networkService := service.NewNetworkService(maasClient, logger)
	storageService := service.NewStorageService(maasClient, logger)
	tagService := service.NewTagService(maasClient, logger)

	// Initialize HTTP handlers
	machineHandlerNew := machinetransport.NewHandler(machineServiceNew, logger)

	// For backward compatibility, keep the old handlers
	machineHandler := transport.NewMachineHandler(machineServiceOld, logger)
	networkHandler := transport.NewNetworkHandler(networkService, logger)
	storageHandler := transport.NewStorageHandler(storageService, logger)
	tagHandler := transport.NewTagHandler(tagService, logger)

	// Initialize MCP service
	mcpService := service.NewMCPService(maasClientWrapper)

	// Set up Gin router using the server package
	router := server.NewServer(mcpService, cfg, logger)

	// Register API routes for new clean architecture handlers
	machineHandlerNew.RegisterRoutes(router)

	// Register API routes for backward compatibility
	apiGroup := router.Group("/api/v1")
	machineHandler.RegisterRoutes(apiGroup)
	networkHandler.RegisterRoutes(apiGroup)
	storageHandler.RegisterRoutes(apiGroup)
	tagHandler.RegisterRoutes(apiGroup)

	// Health check endpoint is already registered in server.NewServer

	// Start server
	srv := &http.Server{
		Addr:    fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port),
		Handler: router,
	}

	// Start server in a goroutine
	go func() {
		logger.WithFields(logrus.Fields{
			"host": cfg.Server.Host,
			"port": cfg.Server.Port,
		}).Info("HTTP server listening")

		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.WithError(err).Fatal("Failed to start server")
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")

	// Create a deadline for graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Attempt graceful shutdown
	if err := srv.Shutdown(ctx); err != nil {
		logger.WithError(err).Fatal("Server forced to shutdown")
	}

	// Close repositories
	if err := machineRepo.Close(); err != nil {
		logger.WithError(err).Error("Failed to close machine repository")
	}

	logger.Info("Server exiting")
}
