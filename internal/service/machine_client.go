package service

import (
	"github.com/canonical/gomaasclient/entity"
	"github.com/lspecian/maas-mcp-server/internal/models"
)

// MachineClient defines the interface for MAAS client operations needed by the machine service
type MachineClient interface {
	// ListMachines retrieves machines based on filters
	ListMachines(filters map[string]string) ([]models.Machine, error)

	// GetMachine retrieves details for a specific machine
	GetMachine(systemID string) (*models.Machine, error)

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
}
