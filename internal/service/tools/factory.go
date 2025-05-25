package tools

import (
	"context"
	"encoding/json"
	"reflect"
	"os"
	"path/filepath"
	"fmt"
	"strings" // Added for createGenericToolHandler

	"github.com/lspecian/maas-mcp-server/internal/logging"
	"github.com/lspecian/maas-mcp-server/internal/models"
	"github.com/lspecian/maas-mcp-server/internal/service"
)

// OsReadFile is a package-level variable that defaults to os.ReadFile.
// It can be overridden in tests to mock file reading.
var OsReadFile = os.ReadFile


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
	toolsFilePath := "cmd/gen-tools/generated_maas_tools.json" // Assumes execution from project root

	// Attempt to construct a more robust path if running from within internal/service/tools or similar
	// This is a simple attempt; a more robust solution might involve build tags or runtime detection.
	absPath, err := filepath.Abs(toolsFilePath)
	if err != nil {
		f.logger.Warnf("Failed to get absolute path for %s: %v. Using relative path.", toolsFilePath, err)
	} else {
		// Check if the absolute path exists, if not, try a path relative to common execution points
		if _, err := os.Stat(absPath); os.IsNotExist(err) {
			f.logger.Warnf("Tool definitions file not found at absolute path %s. Trying alternative paths.", absPath)
			// This could be expanded. For instance, if 'go run' is executed from 'cmd/server',
			// the relative path might need to be '../../cmd/gen-tools/generated_maas_tools.json'.
			// For now, we stick to the initial simple relative path and rely on correct CWD.
			// A common alternative if running `go run cmd/server/main.go` would be:
			// toolsFilePath = "../../cmd/gen-tools/generated_maas_tools.json" 
			// But for this task, we will use the simpler path and expect CWD to be project root.
		} else {
			toolsFilePath = absPath // Use absolute path if it exists
		}
	}


	jsonData, err := OsReadFile(toolsFilePath) // Use the package-level variable
	if err != nil {
		f.logger.Fatalf("Failed to read tool definitions file '%s': %v", toolsFilePath, err)
		return 
	}

	var toolDefinitions struct {
		Tools []models.MCPTool `json:"tools"`
	}
	if err := json.Unmarshal(jsonData, &toolDefinitions); err != nil {
		f.logger.Fatalf("Failed to unmarshal tool definitions from '%s': %v", toolsFilePath, err)
		return
	}

	if len(toolDefinitions.Tools) == 0 {
		f.logger.Warnf("No tools found in %s. MCP server will have no dynamically registered MAAS tools.", toolsFilePath)
	}

	registeredCount := 0
	for _, tool := range toolDefinitions.Tools {
		// Ensure tool.InputSchema is correctly passed. It's already part of models.MCPTool.
		// The RegisterTool function expects an interface{} for the schema, which models.MCPInputSchema is.
		
		handler := f.createGenericToolHandler(tool) // Pass the whole tool model

		// The inputSchema for RegisterTool is interface{}. tool.InputSchema is models.MCPInputSchema.
		// This should be compatible.
		err := toolService.RegisterTool(tool.Name, tool.Description, tool.InputSchema, handler)
		if err != nil {
			f.logger.Errorf("Failed to register tool '%s': %v", tool.Name, err)
		} else {
			registeredCount++
			// f.logger.Debugf("Successfully registered tool: %s", tool.Name) // Optional
		}
	}
	f.logger.Infof("Successfully registered %d tools from %s", registeredCount, toolsFilePath)
}

// registerMachineTools registers machine management tools
func (f *Factory) registerMachineTools(toolService ToolService) {
	// List Machines
	/*
		toolService.RegisterTool(
			"maas_list_machines",
			"List all machines managed by MAAS with filtering and pagination",
			ToolSchemas["maas_list_machines"].InputSchema,
			f.createMCPServiceHandler(
				reflect.TypeOf((*models.MachineListingRequest)(nil)).Elem(),
				f.mcpService.ListMachines,
			),
		)
	*/

	// Discover Machines
	/*
		toolService.RegisterTool(
			"maas_discover_machines",
			"Discover new machines in the network",
			ToolSchemas["maas_discover_machines"].InputSchema,
			f.createMCPServiceHandler(
				reflect.TypeOf((*models.MachineDiscoveryRequest)(nil)).Elem(),
				f.mcpService.DiscoverMachines,
			),
		)
	*/

	// Get Machine Details
	/*
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
	*/

	// Allocate Machine
	/*
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
	*/

	// Deploy Machine
	/*
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
	*/

	// Release Machine
	/*
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
	*/

	// Get Machine Power State
	/*
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
	*/

	// Power On Machine
	/*
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
	*/

	// Power Off Machine
	/*
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
	*/
}

// registerNetworkTools registers network management tools
func (f *Factory) registerNetworkTools(toolService ToolService) {
	// List Subnets
	/*
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
	*/

	// Get Subnet Details
	/*
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
	*/
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

// createGenericToolHandler creates a "smart" placeholder handler that logs details.
func (f *Factory) createGenericToolHandler(toolDefinition models.MCPTool) ToolHandler {
	return func(ctx context.Context, params json.RawMessage) (interface{}, error) {
		// Tool name format is expected to be like "maas_<method>_<path_segments_joined_by_underscores>"
		// e.g., "maas_post_api_2.0_account_op-create_authorisation_token"
		// or "maas_delete_api_2.0_account_prefs_sshkeys_id" (where id was a path param)

		f.logger.Infof("GenericToolHandler: Tool '%s' invoked.", toolDefinition.Name)

		nameParts := strings.SplitN(toolDefinition.Name, "_", 3)
		if len(nameParts) < 3 || nameParts[0] != "maas" {
			errMsg := fmt.Sprintf("generic handler: could not parse tool name '%s' into expected format [maas_method_path]", toolDefinition.Name)
			f.logger.Error(errMsg)
			return nil, fmt.Errorf(errMsg) // Or a more structured internal error
		}

		httpMethod := strings.ToUpper(nameParts[1])
		// Reconstruct path: replace underscores with slashes in the path part.
		// This is a simplification. If path parameters were originally named e.g. "system_id",
		// the name might be "..._system_id_..." and this would become "/system/id/".
		// This basic reconstruction is a starting point.
		derivedPath := "/" + strings.ReplaceAll(nameParts[2], "_", "/")
		
		// A more robust path reconstruction would ideally rely on an original path template
		// stored in the tool definition if available. For now, this derivation is an approximation.

		f.logger.Infof("  Derived HTTP Method: %s", httpMethod)
		f.logger.Infof("  Derived API Path (approximate): %s", derivedPath)
		f.logger.Infof("  Input Parameters (raw): %s", string(params))
		f.logger.Debugf("  Tool Description: %s", toolDefinition.Description)
		// For debugging, you might want to see the schema, but it can be very verbose:
		// schemaBytes, _ := json.Marshal(toolDefinition.InputSchema)
		// f.logger.Debugf("  Input Schema: %s", string(schemaBytes))

		// Future logic for actual dispatch and MAAS client call will go here.
		// For now, it remains a "smart" placeholder.
		
		// Ensure mcpService is available
		if f.mcpService == nil {
			f.logger.Error("GenericToolHandler: MCPService is not available in factory.")
			return nil, fmt.Errorf("internal server error: MCPService not configured for generic handler")
		}

		// Call f.mcpService.CallAPI with the derived information
		return f.mcpService.CallAPI(ctx, httpMethod, derivedPath, params)
	}
}


// createMCPServiceHandler creates a handler function for an MCP service method
func (f *Factory) createMCPServiceHandler(
	requestType reflect.Type,
	handlerFunc interface{},
) ToolHandler {
	requestMapper := NewRequestMapper()
	return CreateToolHandler(requestType, requestMapper, handlerFunc)
}
