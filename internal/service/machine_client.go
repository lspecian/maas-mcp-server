package service

import (
	"context"

	"github.com/canonical/gomaasclient/entity"
	"github.com/lspecian/maas-mcp-server/internal/models/types"
)

// MachineClient defines the interface for MAAS client operations needed by the machine service
type MachineClient interface {
	// ListMachines retrieves machines based on filters with pagination
	ListMachines(ctx context.Context, filters map[string]string, pagination *types.PaginationOptions) ([]types.Machine, int, error)

	// ListMachinesSimple retrieves machines based on filters without pagination
	ListMachinesSimple(ctx context.Context, filters map[string]string) ([]types.Machine, error)

	// GetMachine retrieves details for a specific machine
	GetMachine(systemID string) (*types.Machine, error)

	// GetMachineWithDetails retrieves details for a specific machine with optional detailed information
	GetMachineWithDetails(ctx context.Context, systemID string, includeDetails bool) (*types.Machine, error)

	// AllocateMachine allocates a machine based on constraints
	AllocateMachine(params *entity.MachineAllocateParams) (*types.Machine, error)

	// DeployMachine deploys an allocated machine
	DeployMachine(systemID string, params *entity.MachineDeployParams) (*types.Machine, error)

	// ReleaseMachine releases a machine back to the pool
	ReleaseMachine(systemIDs []string, comment string) error

	// PowerOnMachine powers on a machine
	PowerOnMachine(systemID string) (*types.Machine, error)

	// PowerOffMachine powers off a machine
	PowerOffMachine(systemID string) (*types.Machine, error)

	// CheckStorageConstraints checks if a machine meets the specified storage constraints
	CheckStorageConstraints(machine *types.Machine, constraints *types.SimpleStorageConstraint) bool
}
