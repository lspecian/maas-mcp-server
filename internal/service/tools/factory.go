package tools

import (
	"context"
	"encoding/json"
	"reflect"

	"github.com/lspecian/maas-mcp-server/internal/logging"
	"github.com/lspecian/maas-mcp-server/internal/models"
	"github.com/lspecian/maas-mcp-server/internal/service"
)

// Factory creates and configures tool services
type Factory struct {
	mcpService *service.MCPService
	logger     *logging.Logger
}

// NewFactory creates a new factory
func NewFactory(mcpService *service.MCPService, logger *logging.Logger) *Factory {
	return &Factory{
		mcpService: mcpService,
		logger:     logger,
	}
}

// CreateToolService creates a new tool service with all dependencies
func (f *Factory) CreateToolService() ToolService {
	// Create dependencies
	validator := NewToolValidator()
	requestMapper := NewRequestMapper()
	responseFormatter := NewResponseFormatter()
	errorTranslator := NewErrorTranslator()
	registry := NewToolRegistry(validator)

	// Create service
	toolService := NewToolService(
		registry,
		validator,
		requestMapper,
		responseFormatter,
		errorTranslator,
		f.logger,
	)

	// Register tools
	f.registerTools(toolService)

	return toolService
}

// registerTools registers all tools with the service
func (f *Factory) registerTools(toolService ToolService) {
	// Register machine management tools
	f.registerMachineTools(toolService)

	// Register network management tools
	f.registerNetworkTools(toolService)

	// Register tag management tools
	f.registerTagTools(toolService)

	// Register storage management tools
	f.registerStorageTools(toolService)

	// Register script management tools
	f.registerScriptTools(toolService)
}

// registerMachineTools registers machine management tools
func (f *Factory) registerMachineTools(toolService ToolService) {
	// List Machines
	toolService.RegisterTool(
		"maas_list_machines",
		"List all machines managed by MAAS with filtering and pagination",
		ToolSchemas["maas_list_machines"].InputSchema,
		f.createMCPServiceHandler(
			reflect.TypeOf((*models.MachineListingRequest)(nil)).Elem(),
			f.mcpService.ListMachines,
		),
	)

	// Discover Machines
	toolService.RegisterTool(
		"maas_discover_machines",
		"Discover new machines in the network",
		ToolSchemas["maas_discover_machines"].InputSchema,
		f.createMCPServiceHandler(
			reflect.TypeOf((*models.MachineDiscoveryRequest)(nil)).Elem(),
			f.mcpService.DiscoverMachines,
		),
	)

	// Get Machine Details
	toolService.RegisterTool(
		"maas_get_machine_details",
		"Get detailed information about a specific machine",
		ToolSchemas["maas_get_machine_details"].InputSchema,
		func(ctx context.Context, params json.RawMessage) (interface{}, error) {
			var request struct {
				SystemID string `json:"system_id"`
			}
			if err := json.Unmarshal(params, &request); err != nil {
				return nil, err
			}
			return f.mcpService.GetMachineDetails(ctx, request.SystemID)
		},
	)

	// Allocate Machine
	toolService.RegisterTool(
		"maas_allocate_machine",
		"Allocate a machine based on constraints",
		ToolSchemas["maas_allocate_machine"].InputSchema,
		f.createMCPServiceHandler(
			reflect.TypeOf((*struct {
				Hostname     string   `json:"hostname,omitempty"`
				Zone         string   `json:"zone,omitempty"`
				Pool         string   `json:"pool,omitempty"`
				Tags         []string `json:"tags,omitempty"`
				Architecture string   `json:"architecture,omitempty"`
				MinCPUCount  int      `json:"min_cpu_count,omitempty"`
				MinMemory    int      `json:"min_memory,omitempty"`
			})(nil)).Elem(),
			f.mcpService.AllocateMachine,
		),
	)

	// Deploy Machine
	toolService.RegisterTool(
		"maas_deploy_machine",
		"Deploy an operating system to a machine",
		ToolSchemas["maas_deploy_machine"].InputSchema,
		f.createMCPServiceHandler(
			reflect.TypeOf((*struct {
				SystemID     string `json:"system_id" validate:"required"`
				DistroSeries string `json:"distro_series,omitempty"`
				UserData     string `json:"user_data,omitempty"`
				HWEKernel    string `json:"hwe_kernel,omitempty"`
			})(nil)).Elem(),
			f.mcpService.DeployMachine,
		),
	)

	// Release Machine
	toolService.RegisterTool(
		"maas_release_machine",
		"Release a machine back to the pool",
		ToolSchemas["maas_release_machine"].InputSchema,
		f.createMCPServiceHandler(
			reflect.TypeOf((*struct {
				SystemID string `json:"system_id" validate:"required"`
				Comment  string `json:"comment,omitempty"`
			})(nil)).Elem(),
			f.mcpService.ReleaseMachine,
		),
	)

	// Get Machine Power State
	toolService.RegisterTool(
		"maas_get_machine_power_state",
		"Get the power state of a machine",
		ToolSchemas["maas_get_machine_power_state"].InputSchema,
		func(ctx context.Context, params json.RawMessage) (interface{}, error) {
			var request struct {
				SystemID string `json:"system_id"`
			}
			if err := json.Unmarshal(params, &request); err != nil {
				return nil, err
			}
			powerState, err := f.mcpService.GetMachinePowerState(ctx, request.SystemID)
			if err != nil {
				return nil, err
			}
			return map[string]interface{}{
				"system_id":   request.SystemID,
				"power_state": powerState,
			}, nil
		},
	)

	// Power On Machine
	toolService.RegisterTool(
		"maas_power_on_machine",
		"Power on a machine",
		ToolSchemas["maas_power_on_machine"].InputSchema,
		func(ctx context.Context, params json.RawMessage) (interface{}, error) {
			var request struct {
				SystemID string `json:"system_id"`
			}
			if err := json.Unmarshal(params, &request); err != nil {
				return nil, err
			}
			return f.mcpService.PowerOnMachine(ctx, request.SystemID)
		},
	)

	// Power Off Machine
	toolService.RegisterTool(
		"maas_power_off_machine",
		"Power off a machine",
		ToolSchemas["maas_power_off_machine"].InputSchema,
		func(ctx context.Context, params json.RawMessage) (interface{}, error) {
			var request struct {
				SystemID string `json:"system_id"`
			}
			if err := json.Unmarshal(params, &request); err != nil {
				return nil, err
			}
			return f.mcpService.PowerOffMachine(ctx, request.SystemID)
		},
	)
}

// registerNetworkTools registers network management tools
func (f *Factory) registerNetworkTools(toolService ToolService) {
	// List Subnets
	toolService.RegisterTool(
		"maas_list_subnets",
		"List all subnets",
		ToolSchemas["maas_list_subnets"].InputSchema,
		f.createMCPServiceHandler(
			reflect.TypeOf((*struct {
				FabricID int `json:"fabric_id,omitempty"`
			})(nil)).Elem(),
			f.mcpService.ListSubnets,
		),
	)

	// Get Subnet Details
	toolService.RegisterTool(
		"maas_get_subnet_details",
		"Get detailed information about a specific subnet",
		ToolSchemas["maas_get_subnet_details"].InputSchema,
		func(ctx context.Context, params json.RawMessage) (interface{}, error) {
			var request struct {
				SubnetID int `json:"subnet_id"`
			}
			if err := json.Unmarshal(params, &request); err != nil {
				return nil, err
			}
			return f.mcpService.GetSubnetDetails(ctx, request.SubnetID)
		},
	)
}

// registerTagTools registers tag management tools
func (f *Factory) registerTagTools(toolService ToolService) {
	// These will be implemented when the tag service is available
}

// registerStorageTools registers storage management tools
func (f *Factory) registerStorageTools(toolService ToolService) {
	// These will be implemented when the storage service is available
}

// registerScriptTools registers script management tools
func (f *Factory) registerScriptTools(toolService ToolService) {
	// These will be implemented when the script service is available
}

// createMCPServiceHandler creates a handler function for an MCP service method
func (f *Factory) createMCPServiceHandler(
	requestType reflect.Type,
	handlerFunc interface{},
) ToolHandler {
	requestMapper := NewRequestMapper()
	return CreateToolHandler(requestType, requestMapper, handlerFunc)
}
