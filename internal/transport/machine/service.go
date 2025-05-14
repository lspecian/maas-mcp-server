package machine

import (
	"context"

	"github.com/lspecian/maas-mcp-server/internal/models"
)

// Service defines the interface for machine service operations
type Service interface {
	// ListMachines retrieves a list of machines with optional filtering
	ListMachines(ctx context.Context, filters map[string]string) ([]models.MachineContext, error)

	// GetMachine retrieves a specific machine by ID
	GetMachine(ctx context.Context, id string) (*models.MachineContext, error)

	// GetMachinePowerState retrieves the power state of a specific machine
	GetMachinePowerState(ctx context.Context, id string) (string, error)

	// AllocateMachine allocates a machine based on constraints
	AllocateMachine(ctx context.Context, constraints map[string]string) (*models.MachineContext, error)

	// DeployMachine deploys a machine with specified OS and configuration
	DeployMachine(ctx context.Context, id string, osConfig map[string]string) (*models.MachineContext, error)

	// ReleaseMachine releases a machine back to the available pool
	ReleaseMachine(ctx context.Context, id string, comment string) error

	// PowerOnMachine powers on a machine
	PowerOnMachine(ctx context.Context, id string) (*models.MachineContext, error)

	// PowerOffMachine powers off a machine
	PowerOffMachine(ctx context.Context, id string) (*models.MachineContext, error)
}
