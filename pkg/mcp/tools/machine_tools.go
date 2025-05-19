package tools

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/lspecian/maas-mcp-server/internal/models/types"
	"github.com/lspecian/maas-mcp-server/internal/transport/machine"
)

// MachineTools provides MCP tools for machine management
type MachineTools struct {
	service machine.Service
}

// NewMachineTools creates a new MachineTools instance
func NewMachineTools(service machine.Service) *MachineTools {
	return &MachineTools{
		service: service,
	}
}

// ListMachinesInput represents the input for the ListMachines tool
type ListMachinesInput struct {
	Filters map[string]string `json:"filters,omitempty"`
}

// ListMachinesOutput represents the output for the ListMachines tool
type ListMachinesOutput struct {
	Machines []types.MachineContext `json:"machines"`
}

// ListMachines lists machines with optional filtering
func (t *MachineTools) ListMachines(ctx context.Context, input json.RawMessage) (json.RawMessage, error) {
	// Parse input
	var params ListMachinesInput
	if err := json.Unmarshal(input, &params); err != nil {
		return nil, fmt.Errorf("failed to parse input: %w", err)
	}

	// Call service
	machines, err := t.service.ListMachines(ctx, params.Filters)
	if err != nil {
		return nil, fmt.Errorf("failed to list machines: %w", err)
	}

	// Prepare output
	output := ListMachinesOutput{
		Machines: machines,
	}

	// Marshal output
	result, err := json.Marshal(output)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal output: %w", err)
	}

	return result, nil
}

// GetMachineDetailsInput represents the input for the GetMachineDetails tool
type GetMachineDetailsInput struct {
	ID string `json:"id"`
}

// GetMachineDetailsOutput represents the output for the GetMachineDetails tool
type GetMachineDetailsOutput struct {
	Machine *types.MachineContext `json:"machine"`
}

// GetMachineDetails gets details for a specific machine
func (t *MachineTools) GetMachineDetails(ctx context.Context, input json.RawMessage) (json.RawMessage, error) {
	// Parse input
	var params GetMachineDetailsInput
	if err := json.Unmarshal(input, &params); err != nil {
		return nil, fmt.Errorf("failed to parse input: %w", err)
	}

	// Validate input
	if params.ID == "" {
		return nil, fmt.Errorf("machine ID is required")
	}

	// Call service
	machine, err := t.service.GetMachine(ctx, params.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to get machine details: %w", err)
	}

	// Prepare output
	output := GetMachineDetailsOutput{
		Machine: machine,
	}

	// Marshal output
	result, err := json.Marshal(output)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal output: %w", err)
	}

	return result, nil
}

// PowerOnMachineInput represents the input for the PowerOnMachine tool
type PowerOnMachineInput struct {
	ID string `json:"id"`
}

// PowerOnMachineOutput represents the output for the PowerOnMachine tool
type PowerOnMachineOutput struct {
	Machine *types.MachineContext `json:"machine"`
}

// PowerOnMachine powers on a machine
func (t *MachineTools) PowerOnMachine(ctx context.Context, input json.RawMessage) (json.RawMessage, error) {
	// Parse input
	var params PowerOnMachineInput
	if err := json.Unmarshal(input, &params); err != nil {
		return nil, fmt.Errorf("failed to parse input: %w", err)
	}

	// Validate input
	if params.ID == "" {
		return nil, fmt.Errorf("machine ID is required")
	}

	// Call service
	machine, err := t.service.PowerOnMachine(ctx, params.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to power on machine: %w", err)
	}

	// Prepare output
	output := PowerOnMachineOutput{
		Machine: machine,
	}

	// Marshal output
	result, err := json.Marshal(output)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal output: %w", err)
	}

	return result, nil
}

// PowerOffMachineInput represents the input for the PowerOffMachine tool
type PowerOffMachineInput struct {
	ID string `json:"id"`
}

// PowerOffMachineOutput represents the output for the PowerOffMachine tool
type PowerOffMachineOutput struct {
	Machine *types.MachineContext `json:"machine"`
}

// PowerOffMachine powers off a machine
func (t *MachineTools) PowerOffMachine(ctx context.Context, input json.RawMessage) (json.RawMessage, error) {
	// Parse input
	var params PowerOffMachineInput
	if err := json.Unmarshal(input, &params); err != nil {
		return nil, fmt.Errorf("failed to parse input: %w", err)
	}

	// Validate input
	if params.ID == "" {
		return nil, fmt.Errorf("machine ID is required")
	}

	// Call service
	machine, err := t.service.PowerOffMachine(ctx, params.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to power off machine: %w", err)
	}

	// Prepare output
	output := PowerOffMachineOutput{
		Machine: machine,
	}

	// Marshal output
	result, err := json.Marshal(output)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal output: %w", err)
	}

	return result, nil
}
