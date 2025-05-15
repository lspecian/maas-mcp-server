package main

import (
	"encoding/json"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/lspecian/maas-mcp-server/internal/config"
	"github.com/lspecian/maas-mcp-server/internal/logging"
	"github.com/lspecian/maas-mcp-server/internal/maas"
	"github.com/lspecian/maas-mcp-server/internal/repository/machine"
	machineservice "github.com/lspecian/maas-mcp-server/internal/service/machine"
	"github.com/lspecian/maas-mcp-server/pkg/mcp"
	"github.com/lspecian/maas-mcp-server/pkg/mcp/tools"
)

func main() {
	// Check if stdio mode is requested
	useStdio := len(os.Args) > 1 && os.Args[1] == "stdio"

	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		fmt.Printf("Failed to load configuration: %v\n", err)
		os.Exit(1)
	}

	// Initialize logger
	logger := logging.NewLogger(cfg.Logging.Level)
	logger.Info("Starting MCP server")

	// Get the default MAAS instance
	maasInstance := cfg.GetDefaultMAASInstance()

	// Create a MAAS client wrapper
	maasClientWrapper, err := maas.NewClientWrapper(maasInstance.APIURL, maasInstance.APIKey, "2.0", logger)
	if err != nil {
		logger.WithError(err).Fatal("Failed to create MAAS client wrapper")
	}

	// Initialize repository
	machineRepo := machine.NewMaasRepository(maasClientWrapper, logger)

	// Initialize service
	machineService := machineservice.NewService(machineRepo, logger)

	// Initialize MCP tools
	machineTools := tools.NewMachineTools(machineService)

	// Create MCP registry
	registry := mcp.NewRegistry()

	// Register MCP tools
	listMachinesSchema := json.RawMessage(`{
		"type": "object",
		"properties": {
			"filters": {
				"type": "object",
				"additionalProperties": {
					"type": "string"
				}
			}
		}
	}`)

	getMachineDetailsSchema := json.RawMessage(`{
		"type": "object",
		"required": ["id"],
		"properties": {
			"id": {
				"type": "string"
			}
		}
	}`)

	powerOnMachineSchema := json.RawMessage(`{
		"type": "object",
		"required": ["id"],
		"properties": {
			"id": {
				"type": "string"
			}
		}
	}`)

	powerOffMachineSchema := json.RawMessage(`{
		"type": "object",
		"required": ["id"],
		"properties": {
			"id": {
				"type": "string"
			}
		}
	}`)

	err = registry.RegisterTool(mcp.ToolInfo{
		Name:        "maas_list_machines",
		Description: "List machines with optional filtering",
		InputSchema: listMachinesSchema,
		Handler:     machineTools.ListMachines,
	})
	if err != nil {
		logger.WithError(err).Fatal("Failed to register maas_list_machines tool")
	}

	err = registry.RegisterTool(mcp.ToolInfo{
		Name:        "maas_get_machine_details",
		Description: "Get details for a specific machine",
		InputSchema: getMachineDetailsSchema,
		Handler:     machineTools.GetMachineDetails,
	})
	if err != nil {
		logger.WithError(err).Fatal("Failed to register maas_get_machine_details tool")
	}

	err = registry.RegisterTool(mcp.ToolInfo{
		Name:        "maas_power_on_machine",
		Description: "Power on a machine",
		InputSchema: powerOnMachineSchema,
		Handler:     machineTools.PowerOnMachine,
	})
	if err != nil {
		logger.WithError(err).Fatal("Failed to register maas_power_on_machine tool")
	}

	err = registry.RegisterTool(mcp.ToolInfo{
		Name:        "maas_power_off_machine",
		Description: "Power off a machine",
		InputSchema: powerOffMachineSchema,
		Handler:     machineTools.PowerOffMachine,
	})
	if err != nil {
		logger.WithError(err).Fatal("Failed to register maas_power_off_machine tool")
	}

	// Register MCP resources
	err = registry.RegisterResource(mcp.ResourceInfo{
		Name:        "maas_machine",
		Description: "MAAS machine resource",
		URIPattern:  "maas://machine/{id}",
	})
	if err != nil {
		logger.WithError(err).Fatal("Failed to register maas_machine resource")
	}

	// Register list_machines tool (alias for maas_list_machines)
	err = registry.RegisterTool(mcp.ToolInfo{
		Name:        "list_machines",
		Description: "List MAAS machines with optional filtering",
		InputSchema: listMachinesSchema,
		Handler:     machineTools.ListMachines,
	})
	if err != nil {
		logger.WithError(err).Fatal("Failed to register list_machines tool")
	}

	// Create and run the appropriate server based on the mode
	if useStdio {
		// Create stdio server
		stdioServer := mcp.NewStdioServer(registry, logger)

		// Run stdio server
		if err := stdioServer.Run(); err != nil {
			logger.WithError(err).Fatal("Failed to run stdio server")
		}
	} else {
		// Create HTTP server
		httpServer := mcp.NewServer(registry, logger)

		// Start HTTP server in a goroutine
		go func() {
			addr := fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port)
			logger.WithField("addr", addr).Info("Starting HTTP MCP server")
			if err := httpServer.Run(addr); err != nil {
				logger.WithError(err).Fatal("Failed to start HTTP server")
			}
		}()

		// Wait for interrupt signal
		quit := make(chan os.Signal, 1)
		signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
		<-quit

		logger.Info("Shutting down server...")
	}

	// Close repositories
	if err := machineRepo.Close(); err != nil {
		logger.WithError(err).Error("Failed to close machine repository")
	}

	logger.Info("Server exiting")
}
