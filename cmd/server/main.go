package main

import (
	"context"
	"flag"
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
	"github.com/lspecian/maas-mcp-server/internal/version"
)

func main() {
	// Handle version flag
	showVersion := flag.Bool("version", false, "Show version information")
	flag.Parse()

	if *showVersion {
		fmt.Printf("MAAS MCP Server version %s\n", version.Version)
		os.Exit(0)
	}

	// Load configuration
	fmt.Println("=== MCP SERVER INITIALIZATION ===")
	fmt.Println("Step 1: Loading configuration...")
	cfg, err := config.LoadConfig()
	if err != nil {
		fmt.Printf("FATAL: Failed to load configuration: %v\n", err)
		os.Exit(1)
	}
	fmt.Println("Configuration loaded successfully")

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
	fmt.Println("Step 2: Logger initialized successfully")

	// Create MAAS client (maasClient is unused, replaced by maasClientWrapper)
	// maasClient, err := maasclient.NewMaasClient(cfg, logger)
	// if err != nil {
	// 	logger.WithError(err).Fatal("Failed to create MAAS client")
	// }

	// Get the default MAAS instance
	fmt.Println("Step 3: Getting default MAAS instance...")
	maasInstance := cfg.GetDefaultMAASInstance()
	fmt.Printf("Default MAAS instance - API URL: %s, API Key present: %v\n",
		maasInstance.APIURL, maasInstance.APIKey != "")

	// Create a MAAS client wrapper for the MCP service
	fmt.Println("Step 4: Creating MAAS client wrapper...")
	maasClientWrapper, err := maas.NewClientWrapper(maasInstance.APIURL, maasInstance.APIKey, "2.0", logger)
	if err != nil {
		fmt.Printf("FATAL: Failed to create MAAS client wrapper: %v\n", err)
		logger.WithError(err).Fatal("Failed to create MAAS client wrapper")
	}
	fmt.Println("MAAS client wrapper created successfully")

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
	// Comment out the old machine handler to avoid route conflicts
	// machineHandler := transport.NewMachineHandler(machineServiceOld, logger)
	networkHandler := transport.NewNetworkHandler(networkService, logger)
	storageHandler := transport.NewStorageHandler(storageService, logger)
	volumeGroupHandler := transport.NewVolumeGroupHandler(volumeGroupService, logger)
	tagHandler := transport.NewTagHandler(tagService, logger)

	// Initialize MCP service
	fmt.Println("Step 5: Initializing MCP service...")
	mcpService := service.NewMCPService(machineServiceOld, networkService, tagService, storageService, enhancedLogger)
	fmt.Println("MCP service initialized successfully")

	// Set up Gin router using the server package
	fmt.Println("Step 6: Setting up Gin router...")
	router := server.NewServerWithService(mcpService, cfg, logger)
	fmt.Println("Gin router set up successfully")

	// Register API routes for new clean architecture handlers
	machineHandlerNew.RegisterRoutes(router)

	// Register API routes for backward compatibility
	apiGroup := router.Group("/api/v1")
	// Comment out the old machine handler to avoid route conflicts
	// machineHandler.RegisterRoutes(apiGroup)
	networkHandler.RegisterRoutes(apiGroup)
	storageHandler.RegisterRoutes(apiGroup)
	volumeGroupHandler.RegisterRoutes(apiGroup)
	tagHandler.RegisterRoutes(apiGroup)

	// Start server
	fmt.Println("Step 7: Starting HTTP server...")
	srv := &http.Server{
		Addr:    fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port),
		Handler: router,
	}
	fmt.Println("HTTP server created successfully")

	// Start server in a goroutine
	go func() {
		enhancedLogger.WithFields(map[string]interface{}{
			"host": cfg.Server.Host,
			"port": cfg.Server.Port,
		}).Info("HTTP server listening")

		fmt.Printf("Step 8: HTTP server listening on %s:%d\n", cfg.Server.Host, cfg.Server.Port)
		fmt.Println("=== MCP SERVER INITIALIZATION COMPLETE ===")

		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			fmt.Printf("FATAL: Failed to start server: %v\n", err)
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
