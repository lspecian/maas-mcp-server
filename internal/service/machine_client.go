package service

import (
	"context"

	"github.com/canonical/gomaasclient/entity"
	"github.com/lspecian/maas-mcp-server/internal/models"
	"github.com/lspecian/maas-mcp-server/internal/models/maas"
)

// MachineClient defines the interface for MAAS client operations needed by the machine service
type MachineClient interface {
	// ListMachines retrieves machines based on filters with pagination
	ListMachines(ctx context.Context, filters map[string]string, pagination *maas.PaginationOptions) ([]models.Machine, int, error)

	// ListMachinesSimple retrieves machines based on filters without pagination
	ListMachinesSimple(ctx context.Context, filters map[string]string) ([]models.Machine, error)

	// GetMachine retrieves details for a specific machine
	GetMachine(systemID string) (*models.Machine, error)

	// GetMachineWithDetails retrieves details for a specific machine with optional detailed information
	GetMachineWithDetails(ctx context.Context, systemID string, includeDetails bool) (*models.Machine, error)

	// AllocateMachine allocates a machine based on constraints
	AllocateMachine(params *entity.MachineAllocateParams) (*models.Machine, error)

	// DeployMachine deploys an allocated machine
	DeployMachine(systemID string, params *entity.MachineDeployParams) (*models.Machine, error)

	// ReleaseMachine releases a machine back to the pool
	ReleaseMachine(systemIDs []string, comment string) error

	// PowerOnMachine powers on a machine
	PowerOnMachine(systemID string) (*models.Machine, error)

	// PowerOffMachine powers off a machine
	PowerOffMachine(systemID string) (*models.Machine, error)

	// CheckStorageConstraints checks if a machine meets the specified storage constraints
	CheckStorageConstraints(machine *models.Machine, constraints *models.SimpleStorageConstraint) bool
}
