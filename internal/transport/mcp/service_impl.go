package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/lspecian/maas-mcp-server/internal/errors"
	"github.com/lspecian/maas-mcp-server/internal/logging"
	"github.com/lspecian/maas-mcp-server/internal/models"
	"github.com/lspecian/maas-mcp-server/internal/service"   // Main business logic service
	"github.com/lspecian/maas-mcp-server/internal/transport" // For StorageConstraintsServiceInterface
	"github.com/lspecian/maas-mcp-server/internal/version"
	"github.com/lspecian/maas-mcp-server/pkg/mcp"
)

// ServiceImpl is the implementation of the Service interface
type ServiceImpl struct {
	mcpService                *service.MCPService                          // Existing general MAAS service
	storageConstraintsService transport.StorageConstraintsServiceInterface // New specific service for storage constraints
	logger                    *logging.Logger
	config                    *models.AppConfig
}

// NewServiceImpl creates a new MCP service implementation
func NewServiceImpl(
	mcpService *service.MCPService,
	storageConstraintsService transport.StorageConstraintsServiceInterface, // Added
	logger *logging.Logger,
	config *models.AppConfig,
) Service {
	return &ServiceImpl{
		mcpService:                mcpService,
		storageConstraintsService: storageConstraintsService, // Added
		logger:                    logger,
		config:                    config,
	}
}

// ExecuteTool executes an MCP tool with the given parameters
func (s *ServiceImpl) ExecuteTool(ctx context.Context, toolName string, rawParams json.RawMessage) (interface{}, error) {
	// Log tool execution
	s.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"tool":   toolName,
		"params": string(rawParams), // Log rawParams as string
	}).Info("Executing MCP tool")

	// Check if the tool exists
	switch toolName {
	case "maas_list_machines":
		return s.executeMaasListMachines(ctx, rawParams)
	case "maas_get_machine_details":
		return s.executeMaasGetMachineDetails(ctx, rawParams)
	case "maas_allocate_machine":
		return s.executeMaasAllocateMachine(ctx, rawParams)
	case "maas_deploy_machine":
		return s.executeMaasDeployMachine(ctx, rawParams)
	case "maas_release_machine":
		return s.executeMaasReleaseMachine(ctx, rawParams)
	case "maas_get_machine_power_state":
		return s.executeMaasGetMachinePowerState(ctx, rawParams)
	case "maas_power_on_machine":
		return s.executeMaasPowerOnMachine(ctx, rawParams)
	case "maas_power_off_machine":
		return s.executeMaasPowerOffMachine(ctx, rawParams)
	case "maas_list_subnets":
		return s.executeMaasListSubnets(ctx, rawParams)
	case "maas_get_subnet_details":
		return s.executeMaasGetSubnetDetails(ctx, rawParams)
	// Storage Constraint Tools
	case "set_machine_storage_constraints":
		return s.executeSetMachineStorageConstraints(ctx, rawParams)
	case "get_machine_storage_constraints":
		return s.executeGetMachineStorageConstraints(ctx, rawParams)
	case "validate_machine_storage_constraints":
		return s.executeValidateMachineStorageConstraints(ctx, rawParams)
	case "apply_machine_storage_constraints":
		return s.executeApplyMachineStorageConstraints(ctx, rawParams)
	case "delete_machine_storage_constraints":
		return s.executeDeleteMachineStorageConstraints(ctx, rawParams)
	default:
		return nil, errors.NewNotFoundError(fmt.Sprintf("Tool '%s' not found", toolName), nil)
	}
}

// GetResource retrieves a resource by URI
func (s *ServiceImpl) GetResource(ctx context.Context, uri string) (interface{}, error) {
	// Log resource access
	s.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"uri": uri,
	}).Info("Accessing MCP resource")

	// Parse URI
	parts := strings.Split(uri, "://")
	if len(parts) != 2 {
		return nil, errors.NewValidationError("Invalid URI format", nil)
	}

	scheme := parts[0]
	path := parts[1]

	// Handle different resource types
	switch scheme {
	case "maas":
		return s.handleMaasResource(ctx, path)
	default:
		return nil, errors.NewNotFoundError(fmt.Sprintf("Resource scheme '%s' not supported", scheme), nil)
	}
}

// GetServerInfo returns information about the MCP server
func (s *ServiceImpl) GetServerInfo(ctx context.Context) (*models.MCPDiscoveryResponse, error) {
	// Create a discovery response
	response := &models.MCPDiscoveryResponse{
		Jsonrpc: "2.0",
		Result: struct {
			ServerInfo struct {
				Name    string `json:"name"`
				Version string `json:"version"`
			} `json:"serverInfo"`
			Capabilities struct {
				Tools     []models.MCPTool     `json:"tools,omitempty"`
				Resources []models.MCPResource `json:"resources,omitempty"`
			} `json:"capabilities"`
		}{
			ServerInfo: struct {
				Name    string `json:"name"`
				Version string `json:"version"`
			}{
				Name:    "maas-mcp-server",
				Version: version.GetVersion(),
			},
			Capabilities: struct {
				Tools     []models.MCPTool     `json:"tools,omitempty"`
				Resources []models.MCPResource `json:"resources,omitempty"`
			}{
				Tools: []models.MCPTool{
					// Existing tools...
					{
						Name:        "maas_list_machines",
						Description: "List all machines managed by MAAS",
						InputSchema: models.ListMachinesRequest{},
					},
					{
						Name:        "maas_get_machine_details",
						Description: "Get detailed information about a specific machine",
						InputSchema: models.GetMachineDetailsRequest{},
					},
					{
						Name:        "maas_allocate_machine",
						Description: "Allocate a machine based on constraints",
						InputSchema: models.AllocateMachineRequest{},
					},
					{
						Name:        "maas_deploy_machine",
						Description: "Deploy an operating system to a machine",
						InputSchema: models.DeployMachineRequest{},
					},
					{
						Name:        "maas_release_machine",
						Description: "Release a machine back to the pool",
						InputSchema: models.ReleaseMachineRequest{},
					},
					{
						Name:        "maas_get_machine_power_state",
						Description: "Get the power state of a machine",
						InputSchema: models.GetMachinePowerStateRequest{},
					},
					{
						Name:        "maas_power_on_machine",
						Description: "Power on a machine",
						InputSchema: models.PowerOnMachineRequest{},
					},
					{
						Name:        "maas_power_off_machine",
						Description: "Power off a machine",
						InputSchema: models.PowerOffMachineRequest{},
					},
					{
						Name:        "maas_list_subnets",
						Description: "List all subnets",
						InputSchema: models.ListSubnetsRequest{},
					},
					{
						Name:        "maas_get_subnet_details",
						Description: "Get detailed information about a specific subnet",
						InputSchema: models.GetSubnetDetailsRequest{},
					},
					// New Storage Constraint Tools
					{
						Name:        "set_machine_storage_constraints",
						Description: "Sets or updates the storage constraints for a specific machine.",
						InputSchema: SetMachineStorageConstraintsParams{}, // From mcp/models.go
					},
					{
						Name:        "get_machine_storage_constraints",
						Description: "Retrieves the storage constraints for a specific machine.",
						InputSchema: GetMachineStorageConstraintsParams{}, // From mcp/models.go
					},
					{
						Name:        "validate_machine_storage_constraints",
						Description: "Validates a proposed set of storage constraints against a machine's current storage.",
						InputSchema: ValidateMachineStorageConstraintsParams{}, // From mcp/models.go
					},
					{
						Name:        "apply_machine_storage_constraints",
						Description: "Applies a defined set of storage constraints, typically during machine deployment or commissioning.",
						InputSchema: ApplyMachineStorageConstraintsParams{}, // From mcp/models.go
					},
					{
						Name:        "delete_machine_storage_constraints",
						Description: "Removes/clears all storage constraints from a specific machine.",
						InputSchema: DeleteMachineStorageConstraintsParams{}, // From mcp/models.go
					},
				},
				Resources: []models.MCPResource{
					{
						Name:        "machine",
						Description: "Access machine resources",
						URIPattern:  "maas://machine/{system_id}",
					},
					{
						Name:        "subnet",
						Description: "Access subnet resources",
						URIPattern:  "maas://subnet/{subnet_id}",
					},
				},
			},
		},
	}

	return response, nil
}

// NegotiateVersion negotiates the protocol version with the client
func (s *ServiceImpl) NegotiateVersion(ctx context.Context, clientVersion string) (string, error) {
	// For now, we only support version 1.0
	return "1.0", nil
}

// Tool execution methods

// Tool execution methods

// Helper to convert MCP StorageConstraintItemParams to models.StorageConstraintParams
func convertMCPItemsToModelParams(mcpItems []StorageConstraintItemParams) models.StorageConstraintParams {
	modelConstraints := make([]models.StorageConstraint, len(mcpItems))
	for i, item := range mcpItems {
		modelConstraints[i] = models.StorageConstraint{
			Type:       models.StorageConstraintType(item.Type),
			Value:      item.Value,
			Operator:   item.Operator,
			TargetType: item.TargetType,
		}
	}
	return models.StorageConstraintParams{Constraints: modelConstraints}
}

func (s *ServiceImpl) executeMaasListMachines(ctx context.Context, rawParams json.RawMessage) (interface{}, error) {
	var request models.ListMachinesRequest // Assuming models.ListMachinesRequest is the expected input structure
	if err := json.Unmarshal(rawParams, &request); err != nil {
		return nil, errors.NewValidationError("Invalid parameters for maas_list_machines: "+err.Error(), err)
	}

	// Convert models.ListMachinesRequest to pkg/mcp.ListMachinesRequest
	// This is a temporary solution until we unify the models
	pkgRequest := mcp.ListMachinesRequest{
		// Map fields as needed
		Hostname: "", // Not available in our model
		Zone:     "", // Not available in our model
		Status:   "", // Not available in our model
	}

	// Execute the service method
	return s.mcpService.ListMachines(ctx, pkgRequest)
}

func (s *ServiceImpl) executeMaasGetMachineDetails(ctx context.Context, rawParams json.RawMessage) (interface{}, error) {
	var request models.GetMachineDetailsRequest
	if err := json.Unmarshal(rawParams, &request); err != nil {
		return nil, errors.NewValidationError("Invalid parameters for maas_get_machine_details: "+err.Error(), err)
	}

	// Validate required fields
	if request.SystemID == "" {
		return nil, errors.NewValidationError("system_id is required", nil)
	}

	// Execute the service method
	return s.mcpService.GetMachineDetails(ctx, request.SystemID)
}

func (s *ServiceImpl) executeMaasAllocateMachine(ctx context.Context, rawParams json.RawMessage) (interface{}, error) {
	var request models.AllocateMachineRequest
	if err := json.Unmarshal(rawParams, &request); err != nil {
		return nil, errors.NewValidationError("Invalid parameters for maas_allocate_machine: "+err.Error(), err)
	}

	// Convert models.AllocateMachineRequest to pkg/mcp.AllocateMachineRequest
	// This is a temporary solution until we unify the models
	pkgRequest := mcp.AllocateMachineRequest{
		// Map fields as needed
		Tags: request.Tags,
		// Other fields not available in our model
	}

	// Execute the service method
	return s.mcpService.AllocateMachine(ctx, pkgRequest)
}

func (s *ServiceImpl) executeMaasDeployMachine(ctx context.Context, rawParams json.RawMessage) (interface{}, error) {
	var request models.DeployMachineRequest
	if err := json.Unmarshal(rawParams, &request); err != nil {
		return nil, errors.NewValidationError("Invalid parameters for maas_deploy_machine: "+err.Error(), err)
	}

	// Validate required fields
	if request.SystemID == "" {
		return nil, errors.NewValidationError("system_id is required", nil)
	}

	// Convert models.DeployMachineRequest to pkg/mcp.DeployMachineRequest
	// This is a temporary solution until we unify the models
	pkgRequest := mcp.DeployMachineRequest{
		SystemID:     request.SystemID,
		DistroSeries: "", // Not available in our model
		UserData:     "", // Not available in our model
		HWEKernel:    "", // Not available in our model
	}

	// Execute the service method
	return s.mcpService.DeployMachine(ctx, pkgRequest)
}

func (s *ServiceImpl) executeMaasReleaseMachine(ctx context.Context, rawParams json.RawMessage) (interface{}, error) {
	var request models.ReleaseMachineRequest
	if err := json.Unmarshal(rawParams, &request); err != nil {
		return nil, errors.NewValidationError("Invalid parameters for maas_release_machine: "+err.Error(), err)
	}

	// Validate required fields
	if request.SystemID == "" {
		return nil, errors.NewValidationError("system_id is required", nil)
	}

	// Convert models.ReleaseMachineRequest to pkg/mcp.ReleaseMachineRequest
	// This is a temporary solution until we unify the models
	pkgRequest := mcp.ReleaseMachineRequest{
		SystemID: request.SystemID,
		Comment:  "", // Not available in our model
	}

	// Execute the service method
	// Assuming the first return value is not explicitly needed here beyond error checking.
	if _, err := s.mcpService.ReleaseMachine(ctx, pkgRequest); err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"success":   true,
		"system_id": request.SystemID,
		"message":   fmt.Sprintf("Machine %s released successfully", request.SystemID),
	}, nil
}

func (s *ServiceImpl) executeMaasGetMachinePowerState(ctx context.Context, rawParams json.RawMessage) (interface{}, error) {
	var request models.GetMachinePowerStateRequest
	if err := json.Unmarshal(rawParams, &request); err != nil {
		return nil, errors.NewValidationError("Invalid parameters for maas_get_machine_power_state: "+err.Error(), err)
	}

	// Validate required fields
	if request.SystemID == "" {
		return nil, errors.NewValidationError("system_id is required", nil)
	}

	// Execute the service method
	powerState, err := s.mcpService.GetMachinePowerState(ctx, request.SystemID)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"system_id":   request.SystemID,
		"power_state": powerState,
	}, nil
}

func (s *ServiceImpl) executeMaasPowerOnMachine(ctx context.Context, rawParams json.RawMessage) (interface{}, error) {
	var request models.PowerOnMachineRequest
	if err := json.Unmarshal(rawParams, &request); err != nil {
		return nil, errors.NewValidationError("Invalid parameters for maas_power_on_machine: "+err.Error(), err)
	}

	// Validate required fields
	if request.SystemID == "" {
		return nil, errors.NewValidationError("system_id is required", nil)
	}

	// Execute the service method
	return s.mcpService.PowerOnMachine(ctx, request.SystemID)
}

func (s *ServiceImpl) executeMaasPowerOffMachine(ctx context.Context, rawParams json.RawMessage) (interface{}, error) {
	var request models.PowerOffMachineRequest
	if err := json.Unmarshal(rawParams, &request); err != nil {
		return nil, errors.NewValidationError("Invalid parameters for maas_power_off_machine: "+err.Error(), err)
	}

	// Validate required fields
	if request.SystemID == "" {
		return nil, errors.NewValidationError("system_id is required", nil)
	}

	// Execute the service method
	return s.mcpService.PowerOffMachine(ctx, request.SystemID)
}

func (s *ServiceImpl) executeMaasListSubnets(ctx context.Context, rawParams json.RawMessage) (interface{}, error) {
	var request models.ListSubnetsRequest
	if err := json.Unmarshal(rawParams, &request); err != nil {
		return nil, errors.NewValidationError("Invalid parameters for maas_list_subnets: "+err.Error(), err)
	}

	// Convert models.ListSubnetsRequest to pkg/mcp.ListSubnetsRequest
	// This is a temporary solution until we unify the models
	pkgRequest := mcp.ListSubnetsRequest{
		FabricID: request.FabricID,
	}

	// Execute the service method
	return s.mcpService.ListSubnets(ctx, pkgRequest)
}

func (s *ServiceImpl) executeMaasGetSubnetDetails(ctx context.Context, rawParams json.RawMessage) (interface{}, error) {
	var request models.GetSubnetDetailsRequest
	if err := json.Unmarshal(rawParams, &request); err != nil {
		return nil, errors.NewValidationError("Invalid parameters for maas_get_subnet_details: "+err.Error(), err)
	}

	// Validate required fields
	if request.SubnetID == 0 {
		return nil, errors.NewValidationError("subnet_id is required", nil)
	}

	// Execute the service method
	return s.mcpService.GetSubnetDetails(ctx, request.SubnetID)
}

// Resource handling methods

func (s *ServiceImpl) handleMaasResource(ctx context.Context, path string) (interface{}, error) {
	// Parse path
	parts := strings.SplitN(path, "/", 2)
	if len(parts) != 2 {
		return nil, errors.NewValidationError("Invalid resource path", nil)
	}

	resourceType := parts[0]
	resourceID := parts[1]

	// Handle different resource types
	switch resourceType {
	case "machine":
		return s.mcpService.GetMachineDetails(ctx, resourceID)
	case "subnet":
		subnetID := 0
		if _, err := fmt.Sscanf(resourceID, "%d", &subnetID); err != nil {
			return nil, errors.NewValidationError("Invalid subnet ID", err)
		}
		return s.mcpService.GetSubnetDetails(ctx, subnetID)
	default:
		return nil, errors.NewNotFoundError(fmt.Sprintf("Resource type '%s' not supported", resourceType), nil)
	}
}

// --- Storage Constraint Tool Handlers ---

func (s *ServiceImpl) executeSetMachineStorageConstraints(ctx context.Context, rawParams json.RawMessage) (interface{}, error) {
	var params SetMachineStorageConstraintsParams // From mcp/models.go
	if err := json.Unmarshal(rawParams, &params); err != nil {
		return nil, errors.NewValidationError("Invalid params for set_machine_storage_constraints: "+err.Error(), err)
	}
	if params.MachineID == "" {
		return nil, errors.NewValidationError("machine_id is required for set_machine_storage_constraints", nil)
	}

	modelParams := convertMCPItemsToModelParams(params.Constraints)

	err := s.storageConstraintsService.SetStorageConstraints(ctx, params.MachineID, modelParams)
	if err != nil {
		return nil, err // Assuming service returns AppError or compatible
	}
	return GenericMCPResult{Status: "success", MachineID: params.MachineID}, nil
}

func (s *ServiceImpl) executeGetMachineStorageConstraints(ctx context.Context, rawParams json.RawMessage) (interface{}, error) {
	var params GetMachineStorageConstraintsParams // From mcp/models.go
	if err := json.Unmarshal(rawParams, &params); err != nil {
		return nil, errors.NewValidationError("Invalid params for get_machine_storage_constraints: "+err.Error(), err)
	}
	if params.MachineID == "" {
		return nil, errors.NewValidationError("machine_id is required for get_machine_storage_constraints", nil)
	}

	mcpContextConstraints, err := s.storageConstraintsService.GetStorageConstraints(ctx, params.MachineID)
	if err != nil {
		return nil, err
	}

	resultItems := make([]StorageConstraintItemParams, len(mcpContextConstraints.Constraints))
	for i, item := range mcpContextConstraints.Constraints {
		resultItems[i] = StorageConstraintItemParams{
			Type:       item.Type,
			Value:      item.Value,
			Operator:   item.Operator,
			TargetType: item.TargetType,
		}
	}
	return &GetMachineStorageConstraintsResult{
		MachineID:   params.MachineID,
		Constraints: resultItems,
	}, nil
}

func (s *ServiceImpl) executeValidateMachineStorageConstraints(ctx context.Context, rawParams json.RawMessage) (interface{}, error) {
	var params ValidateMachineStorageConstraintsParams // From mcp/models.go
	if err := json.Unmarshal(rawParams, &params); err != nil {
		return nil, errors.NewValidationError("Invalid params for validate_machine_storage_constraints: "+err.Error(), err)
	}
	if params.MachineID == "" {
		return nil, errors.NewValidationError("machine_id is required for validate_machine_storage_constraints", nil)
	}

	modelParams := convertMCPItemsToModelParams(params.Constraints)

	valid, violations, err := s.storageConstraintsService.ValidateStorageConstraints(ctx, params.MachineID, modelParams)
	if err != nil {
		return nil, err
	}
	return &ValidateMachineStorageConstraintsResult{
		MachineID:  params.MachineID,
		Valid:      valid,
		Violations: violations,
	}, nil
}

func (s *ServiceImpl) executeApplyMachineStorageConstraints(ctx context.Context, rawParams json.RawMessage) (interface{}, error) {
	var params ApplyMachineStorageConstraintsParams // From mcp/models.go
	if err := json.Unmarshal(rawParams, &params); err != nil {
		return nil, errors.NewValidationError("Invalid params for apply_machine_storage_constraints: "+err.Error(), err)
	}
	if params.MachineID == "" {
		return nil, errors.NewValidationError("machine_id is required for apply_machine_storage_constraints", nil)
	}

	modelParams := convertMCPItemsToModelParams(params.Constraints)

	err := s.storageConstraintsService.ApplyStorageConstraints(ctx, params.MachineID, modelParams)
	if err != nil {
		return nil, err
	}
	return GenericMCPResult{Status: "success", MachineID: params.MachineID}, nil
}

func (s *ServiceImpl) executeDeleteMachineStorageConstraints(ctx context.Context, rawParams json.RawMessage) (interface{}, error) {
	var params DeleteMachineStorageConstraintsParams // From mcp/models.go
	if err := json.Unmarshal(rawParams, &params); err != nil {
		return nil, errors.NewValidationError("Invalid params for delete_machine_storage_constraints: "+err.Error(), err)
	}
	if params.MachineID == "" {
		return nil, errors.NewValidationError("machine_id is required for delete_machine_storage_constraints", nil)
	}

	err := s.storageConstraintsService.DeleteStorageConstraints(ctx, params.MachineID)
	if err != nil {
		return nil, err
	}
	return GenericMCPResult{Status: "success", MachineID: params.MachineID}, nil
}
