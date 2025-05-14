package tools

import (
	"github.com/lspecian/maas-mcp-server/internal/models"
)

func init() {
	// Register machine listing schemas
	registerMachineListingSchemas()
}

// registerMachineListingSchemas registers schemas for machine listing operations
func registerMachineListingSchemas() {
	// Schema for listing machines
	ToolSchemas["maas_list_machines"] = ToolSchema{
		Name:        "maas_list_machines",
		Description: "List all machines managed by MAAS with filtering and pagination",
		InputSchema: models.MachineListingRequest{},
	}

	// Schema for discovering machines
	ToolSchemas["maas_discover_machines"] = ToolSchema{
		Name:        "maas_discover_machines",
		Description: "Discover new machines in the network",
		InputSchema: models.MachineDiscoveryRequest{},
	}
}
