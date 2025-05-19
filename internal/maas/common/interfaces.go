package common

import (
	"context"

	"github.com/canonical/gomaasclient/client"
	"github.com/canonical/gomaasclient/entity"
	"github.com/sirupsen/logrus"

	"github.com/lspecian/maas-mcp-server/internal/models/types"
)

// MachineClient defines operations for machine management
type MachineClient interface {
	ListMachines(ctx context.Context, filters map[string]string, pagination *types.PaginationOptions) ([]types.Machine, int, error)
	GetMachine(systemID string) (*types.Machine, error)
	AllocateMachine(params *entity.MachineAllocateParams) (*types.Machine, error)
	DeployMachine(systemID string, params *entity.MachineDeployParams) (*types.Machine, error)
	ReleaseMachine(systemIDs []string, comment string) error
	PowerOnMachine(systemID string) (*types.Machine, error)
	PowerOffMachine(systemID string) (*types.Machine, error)
	ListMachinesSimple(ctx context.Context, filters map[string]string) ([]types.Machine, error)
	GetMachineWithDetails(ctx context.Context, systemID string, includeDetails bool) (*types.Machine, error)
	CheckStorageConstraints(machine *types.Machine, constraints *types.SimpleStorageConstraint) bool
}

// NetworkClient defines operations for network management
type NetworkClient interface {
	GetSubnet(id int) (*types.Subnet, error)
	ListSubnets() ([]types.Subnet, error)
	ListVLANs(fabricID int) ([]types.VLAN, error)
	GetMachineInterfaces(systemID string) ([]types.NetworkInterface, error)
}

// TagClient defines operations for tag management
type TagClient interface {
	ListTags() ([]types.Tag, error)
	CreateTag(name, comment, definition string) (*types.Tag, error)
	ApplyTagToMachine(tagName, systemID string) error
	RemoveTagFromMachine(tagName, systemID string) error
}

// BlockDeviceClient defines operations for block device management
type BlockDeviceClient interface {
	GetMachineBlockDevices(systemID string) ([]types.BlockDevice, error)
	GetMachineBlockDevice(systemID string, deviceID int) (*types.BlockDevice, error)
	CreateMachinePartition(systemID string, blockDeviceID int, params types.PartitionCreateParams) (*types.Partition, error)
	UpdateMachinePartition(systemID string, blockDeviceID, partitionID int, params map[string]interface{}) (*types.Partition, error)
	DeleteMachinePartition(systemID string, blockDeviceID, partitionID int) error
	FormatMachinePartition(systemID string, blockDeviceID, partitionID int, params map[string]interface{}) (*types.Filesystem, error)
}

// StorageConstraintsClient defines operations for storage constraints
type StorageConstraintsClient interface {
	ApplyStorageConstraints(systemID string, params types.StorageConstraintParams) error
	SetStorageConstraints(systemID string, params types.StorageConstraintParams) error
	GetStorageConstraints(systemID string) (*types.StorageConstraintParams, error)
	ValidateStorageConstraints(systemID string, params types.StorageConstraintParams) (bool, []string, error)
	DeleteStorageConstraints(systemID string) error
}

// VolumeGroupClient defines operations for volume group management
type VolumeGroupClient interface {
	CreateVolumeGroup(systemID string, params types.VolumeGroupParams) (*types.VolumeGroup, error)
	DeleteVolumeGroup(systemID string, volumeGroupID int) error
	GetVolumeGroup(systemID string, volumeGroupID int) (*types.VolumeGroup, error)
	ListVolumeGroups(systemID string) ([]types.VolumeGroup, error)
	CreateLogicalVolume(systemID string, volumeGroupID int, params types.LogicalVolumeParams) (*types.LogicalVolume, error)
	DeleteLogicalVolume(systemID string, volumeGroupID, logicalVolumeID int) error
	ResizeLogicalVolume(systemID string, volumeGroupID, logicalVolumeID int, newSize int64) (*types.LogicalVolume, error)
	GetLogicalVolume(systemID string, volumeGroupID, logicalVolumeID int) (*types.LogicalVolume, error)
}

// RAIDClient defines operations for RAID management
type RAIDClient interface {
	CreateRAID(systemID string, params types.RAIDParams) (*types.RAID, error)
	DeleteRAID(systemID string, raidID int) error
	GetRAID(systemID string, raidID int) (*types.RAID, error)
	ListRAIDs(systemID string) ([]types.RAID, error)
	UpdateRAID(systemID string, raidID int, params types.RAIDUpdateParams) (*types.RAID, error)
}

// ClientDependencies contains the dependencies needed by client implementations
type ClientDependencies struct {
	Client *client.Client
	Logger *logrus.Logger
	Retry  RetryFunc
}

// StorageClient combines all storage-related interfaces for service layer compatibility
type StorageClient interface {
	BlockDeviceClient
	StorageConstraintsClient
}

// MAASClient combines all MAAS client interfaces
type MAASClient interface {
	MachineClient
	NetworkClient
	TagClient
	StorageClient
	VolumeGroupClient
	RAIDClient
}
