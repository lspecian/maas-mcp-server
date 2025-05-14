package utils

import (
	"context"

	"github.com/canonical/gomaasclient/entity"
	"github.com/lspecian/maas-mcp-server/internal/models"
	"github.com/lspecian/maas-mcp-server/internal/models/maas"
	"github.com/stretchr/testify/mock"
)

// MockMachineClient is a testify/mock implementation of the MachineClient interface
type MockMachineClient struct {
	mock.Mock
}

// ListMachines implements the MachineClient interface
func (m *MockMachineClient) ListMachines(ctx context.Context, filters map[string]string, pagination *maas.PaginationOptions) ([]models.Machine, int, error) {
	args := m.Called(ctx, filters, pagination)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]models.Machine), args.Int(1), args.Error(2)
}

// ListMachinesSimple implements the MachineClient interface
func (m *MockMachineClient) ListMachinesSimple(ctx context.Context, filters map[string]string) ([]models.Machine, error) {
	args := m.Called(ctx, filters)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.Machine), args.Error(1)
}

// GetMachine implements the MachineClient interface
func (m *MockMachineClient) GetMachine(systemID string) (*models.Machine, error) {
	args := m.Called(systemID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Machine), args.Error(1)
}

// GetMachineWithDetails implements the MachineClient interface
func (m *MockMachineClient) GetMachineWithDetails(ctx context.Context, systemID string, includeDetails bool) (*models.Machine, error) {
	args := m.Called(ctx, systemID, includeDetails)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Machine), args.Error(1)
}

// AllocateMachine implements the MachineClient interface
func (m *MockMachineClient) AllocateMachine(params *entity.MachineAllocateParams) (*models.Machine, error) {
	args := m.Called(params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Machine), args.Error(1)
}

// DeployMachine implements the MachineClient interface
func (m *MockMachineClient) DeployMachine(systemID string, params *entity.MachineDeployParams) (*models.Machine, error) {
	args := m.Called(systemID, params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Machine), args.Error(1)
}

// ReleaseMachine implements the MachineClient interface
func (m *MockMachineClient) ReleaseMachine(systemIDs []string, comment string) error {
	args := m.Called(systemIDs, comment)
	return args.Error(0)
}

// PowerOnMachine implements the MachineClient interface
func (m *MockMachineClient) PowerOnMachine(systemID string) (*models.Machine, error) {
	args := m.Called(systemID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Machine), args.Error(1)
}

// PowerOffMachine implements the MachineClient interface
func (m *MockMachineClient) PowerOffMachine(systemID string) (*models.Machine, error) {
	args := m.Called(systemID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Machine), args.Error(1)
}

// CheckStorageConstraints implements the MachineClient interface
func (m *MockMachineClient) CheckStorageConstraints(machine *models.Machine, constraints *models.SimpleStorageConstraint) bool {
	args := m.Called(machine, constraints)
	return args.Bool(0)
}

// MockSubnetClient is a testify/mock implementation of the SubnetClient interface
type MockSubnetClient struct {
	mock.Mock
}

// ListSubnets implements the SubnetClient interface
func (m *MockSubnetClient) ListSubnets(ctx context.Context, filters map[string]string) ([]models.Subnet, error) {
	args := m.Called(ctx, filters)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.Subnet), args.Error(1)
}

// GetSubnet implements the SubnetClient interface
func (m *MockSubnetClient) GetSubnet(ctx context.Context, id string) (*models.Subnet, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Subnet), args.Error(1)
}

// MockVLANClient is a testify/mock implementation of the VLANClient interface
type MockVLANClient struct {
	mock.Mock
}

// ListVLANs implements the VLANClient interface
func (m *MockVLANClient) ListVLANs(ctx context.Context) ([]models.VLAN, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.VLAN), args.Error(1)
}

// GetVLAN implements the VLANClient interface
func (m *MockVLANClient) GetVLAN(ctx context.Context, id string) (*models.VLAN, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.VLAN), args.Error(1)
}

// MockBlockDeviceClient is a testify/mock implementation of the BlockDeviceClient interface
type MockBlockDeviceClient struct {
	mock.Mock
}

// ListBlockDevices implements the BlockDeviceClient interface
func (m *MockBlockDeviceClient) ListBlockDevices(ctx context.Context) ([]models.BlockDevice, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.BlockDevice), args.Error(1)
}

// GetBlockDevice implements the BlockDeviceClient interface
func (m *MockBlockDeviceClient) GetBlockDevice(ctx context.Context, id string) (*models.BlockDevice, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.BlockDevice), args.Error(1)
}

// MockTagClient is a testify/mock implementation of the TagClient interface
type MockTagClient struct {
	mock.Mock
}

// ListTags implements the TagClient interface
func (m *MockTagClient) ListTags(ctx context.Context) ([]models.Tag, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.Tag), args.Error(1)
}

// GetTag implements the TagClient interface
func (m *MockTagClient) GetTag(ctx context.Context, name string) (*models.Tag, error) {
	args := m.Called(ctx, name)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Tag), args.Error(1)
}

// CreateTag implements the TagClient interface
func (m *MockTagClient) CreateTag(ctx context.Context, name string, comment string) (*models.Tag, error) {
	args := m.Called(ctx, name, comment)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Tag), args.Error(1)
}

// DeleteTag implements the TagClient interface
func (m *MockTagClient) DeleteTag(ctx context.Context, name string) error {
	args := m.Called(ctx, name)
	return args.Error(0)
}

// AddTagToMachine implements the TagClient interface
func (m *MockTagClient) AddTagToMachine(ctx context.Context, tagName string, systemID string) error {
	args := m.Called(ctx, tagName, systemID)
	return args.Error(0)
}

// RemoveTagFromMachine implements the TagClient interface
func (m *MockTagClient) RemoveTagFromMachine(ctx context.Context, tagName string, systemID string) error {
	args := m.Called(ctx, tagName, systemID)
	return args.Error(0)
}

// MockProgressReporter is a mock implementation of the ProgressReporter interface
type MockProgressReporter struct {
	mock.Mock
}

// Start implements the ProgressReporter interface
func (m *MockProgressReporter) Start(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

// Update implements the ProgressReporter interface
func (m *MockProgressReporter) Update(ctx context.Context, id string, progress float64, message string) error {
	args := m.Called(ctx, id, progress, message)
	return args.Error(0)
}

// Complete implements the ProgressReporter interface
func (m *MockProgressReporter) Complete(ctx context.Context, id string, message string) error {
	args := m.Called(ctx, id, message)
	return args.Error(0)
}

// Fail implements the ProgressReporter interface
func (m *MockProgressReporter) Fail(ctx context.Context, id string, message string) error {
	args := m.Called(ctx, id, message)
	return args.Error(0)
}
