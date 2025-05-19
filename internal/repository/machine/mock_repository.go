package machine

import (
	"context"
	"errors"

	"github.com/canonical/gomaasclient/entity"
	"github.com/lspecian/maas-mcp-server/internal/models/types"
)

// MockRepository is a mock implementation of the Repository interface for testing
type MockRepository struct {
	ListMachinesFn    func(ctx context.Context, filters map[string]string) ([]types.Machine, error)
	GetMachineFn      func(ctx context.Context, systemID string) (*types.Machine, error)
	AllocateMachineFn func(ctx context.Context, params *entity.MachineAllocateParams) (*types.Machine, error)
	DeployMachineFn   func(ctx context.Context, systemID string, params *entity.MachineDeployParams) (*types.Machine, error)
	ReleaseMachineFn  func(ctx context.Context, systemIDs []string, comment string) error
	PowerOnMachineFn  func(ctx context.Context, systemID string) (*types.Machine, error)
	PowerOffMachineFn func(ctx context.Context, systemID string) (*types.Machine, error)
}

// Ensure MockRepository implements Repository interface
var _ Repository = (*MockRepository)(nil)

// Close implements the Repository interface
func (m *MockRepository) Close() error {
	return nil
}

// ListMachines implements the Repository interface
func (m *MockRepository) ListMachines(ctx context.Context, filters map[string]string) ([]types.Machine, error) {
	if m.ListMachinesFn != nil {
		return m.ListMachinesFn(ctx, filters)
	}
	return []types.Machine{}, errors.New("ListMachines not implemented")
}

// GetMachine implements the Repository interface
func (m *MockRepository) GetMachine(ctx context.Context, systemID string) (*types.Machine, error) {
	if m.GetMachineFn != nil {
		return m.GetMachineFn(ctx, systemID)
	}
	return nil, errors.New("GetMachine not implemented")
}

// AllocateMachine implements the Repository interface
func (m *MockRepository) AllocateMachine(ctx context.Context, params *entity.MachineAllocateParams) (*types.Machine, error) {
	if m.AllocateMachineFn != nil {
		return m.AllocateMachineFn(ctx, params)
	}
	return nil, errors.New("AllocateMachine not implemented")
}

// DeployMachine implements the Repository interface
func (m *MockRepository) DeployMachine(ctx context.Context, systemID string, params *entity.MachineDeployParams) (*types.Machine, error) {
	if m.DeployMachineFn != nil {
		return m.DeployMachineFn(ctx, systemID, params)
	}
	return nil, errors.New("DeployMachine not implemented")
}

// ReleaseMachine implements the Repository interface
func (m *MockRepository) ReleaseMachine(ctx context.Context, systemIDs []string, comment string) error {
	if m.ReleaseMachineFn != nil {
		return m.ReleaseMachineFn(ctx, systemIDs, comment)
	}
	return errors.New("ReleaseMachine not implemented")
}

// PowerOnMachine implements the Repository interface
func (m *MockRepository) PowerOnMachine(ctx context.Context, systemID string) (*types.Machine, error) {
	if m.PowerOnMachineFn != nil {
		return m.PowerOnMachineFn(ctx, systemID)
	}
	return nil, errors.New("PowerOnMachine not implemented")
}

// PowerOffMachine implements the Repository interface
func (m *MockRepository) PowerOffMachine(ctx context.Context, systemID string) (*types.Machine, error) {
	if m.PowerOffMachineFn != nil {
		return m.PowerOffMachineFn(ctx, systemID)
	}
	return nil, errors.New("PowerOffMachine not implemented")
}

// CreateTestMachine is a helper function to create a test machine
func CreateTestMachine(id string) *types.Machine {
	return &types.Machine{
		SystemID:     id,
		Hostname:     "test-machine-" + id,
		FQDN:         "test-machine-" + id + ".maas",
		Status:       "4", // Ready
		StatusName:   "Ready",
		Architecture: "amd64/generic",
		PowerState:   "off",
		Zone:         "default",
		Pool:         "default",
		Tags:         []string{"test", "virtual"},
		CPUCount:     4,
		Memory:       8192,
		OSSystem:     "ubuntu",
		DistroSeries: "focal",
	}
}
