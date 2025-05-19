package main

import (
	"flag"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/lspecian/maas-mcp-server/internal/config"
	"github.com/lspecian/maas-mcp-server/internal/logging"
	"github.com/lspecian/maas-mcp-server/internal/maas"
	"github.com/lspecian/maas-mcp-server/internal/repository/machine"
	"github.com/lspecian/maas-mcp-server/internal/service"
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
	machineService := service.NewMachineService(maasClientWrapper, logger)

	// Initialize MCP service
	fmt.Println("Step 5: Initializing MCP service...")
	_ = service.NewMCPService(machineService, nil, nil, nil, enhancedLogger)
	fmt.Println("MCP service initialized successfully")

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	enhancedLogger.Info("Shutting down server...")

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
