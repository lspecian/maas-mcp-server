package machine

import (
	"context"

	"github.com/canonical/gomaasclient/entity"
	"github.com/lspecian/maas-mcp-server/internal/models/types"
	"github.com/lspecian/maas-mcp-server/internal/repository"
)

// Repository defines the interface for machine repository operations
type Repository interface {
	repository.Repository

	// ListMachines retrieves machines based on filters
	ListMachines(ctx context.Context, filters map[string]string) ([]types.Machine, error)

	// GetMachine retrieves details for a specific machine
	GetMachine(ctx context.Context, systemID string) (*types.Machine, error)

	// AllocateMachine allocates a machine based on constraints
	AllocateMachine(ctx context.Context, params *entity.MachineAllocateParams) (*types.Machine, error)

	// DeployMachine deploys an allocated machine
	DeployMachine(ctx context.Context, systemID string, params *entity.MachineDeployParams) (*types.Machine, error)

	// ReleaseMachine releases a machine back to the pool
	ReleaseMachine(ctx context.Context, systemIDs []string, comment string) error

	// PowerOnMachine powers on a machine
	PowerOnMachine(ctx context.Context, systemID string) (*types.Machine, error)

	// PowerOffMachine powers off a machine
	PowerOffMachine(ctx context.Context, systemID string) (*types.Machine, error)
}
