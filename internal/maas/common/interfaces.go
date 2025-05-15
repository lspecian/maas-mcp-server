package common

import (
	"context"

	"github.com/canonical/gomaasclient/client"
	"github.com/canonical/gomaasclient/entity"
	"github.com/sirupsen/logrus"

	"github.com/lspecian/maas-mcp-server/internal/models"
	modelsmaas "github.com/lspecian/maas-mcp-server/internal/models/maas"
)

// MachineClient defines operations for machine management
type MachineClient interface {
	ListMachines(ctx context.Context, filters map[string]string, pagination *modelsmaas.PaginationOptions) ([]models.Machine, int, error)
	GetMachine(systemID string) (*models.Machine, error)
	AllocateMachine(params *entity.MachineAllocateParams) (*models.Machine, error)
	DeployMachine(systemID string, params *entity.MachineDeployParams) (*models.Machine, error)
	ReleaseMachine(systemIDs []string, comment string) error
	PowerOnMachine(systemID string) (*models.Machine, error)
	PowerOffMachine(systemID string) (*models.Machine, error)
	ListMachinesSimple(ctx context.Context, filters map[string]string) ([]models.Machine, error)
	GetMachineWithDetails(ctx context.Context, systemID string, includeDetails bool) (*models.Machine, error)
	CheckStorageConstraints(machine *models.Machine, constraints *models.SimpleStorageConstraint) bool
}

// NetworkClient defines operations for network management
type NetworkClient interface {
	GetSubnet(id int) (*models.Subnet, error)
	ListSubnets() ([]models.Subnet, error)
	ListVLANs(fabricID int) ([]models.VLAN, error)
	GetMachineInterfaces(systemID string) ([]models.NetworkInterface, error)
}

// TagClient defines operations for tag management
type TagClient interface {
	ListTags() ([]models.Tag, error)
	CreateTag(name, comment, definition string) (*models.Tag, error)
	ApplyTagToMachine(tagName, systemID string) error
	RemoveTagFromMachine(tagName, systemID string) error
}

// BlockDeviceClient defines operations for block device management
type BlockDeviceClient interface {
	GetMachineBlockDevices(systemID string) ([]models.BlockDevice, error)
	GetMachineBlockDevice(systemID string, deviceID int) (*models.BlockDevice, error)
	CreateMachinePartition(systemID string, blockDeviceID int, params modelsmaas.PartitionCreateParams) (*models.Partition, error)
	UpdateMachinePartition(systemID string, blockDeviceID, partitionID int, params map[string]interface{}) (*models.Partition, error)
	DeleteMachinePartition(systemID string, blockDeviceID, partitionID int) error
	FormatMachinePartition(systemID string, blockDeviceID, partitionID int, params map[string]interface{}) (*models.Filesystem, error)
}

// StorageConstraintsClient defines operations for storage constraints
type StorageConstraintsClient interface {
	ApplyStorageConstraints(systemID string, params models.StorageConstraintParams) error
	SetStorageConstraints(systemID string, params models.StorageConstraintParams) error
	GetStorageConstraints(systemID string) (*models.StorageConstraintParams, error)
	ValidateStorageConstraints(systemID string, params models.StorageConstraintParams) (bool, []string, error)
	DeleteStorageConstraints(systemID string) error
}

// VolumeGroupClient defines operations for volume group management
type VolumeGroupClient interface {
	CreateVolumeGroup(systemID string, params models.VolumeGroupParams) (*models.VolumeGroup, error)
	DeleteVolumeGroup(systemID string, volumeGroupID int) error
	GetVolumeGroup(systemID string, volumeGroupID int) (*models.VolumeGroup, error)
	ListVolumeGroups(systemID string) ([]models.VolumeGroup, error)
	CreateLogicalVolume(systemID string, volumeGroupID int, params models.LogicalVolumeParams) (*models.LogicalVolume, error)
	DeleteLogicalVolume(systemID string, volumeGroupID, logicalVolumeID int) error
	ResizeLogicalVolume(systemID string, volumeGroupID, logicalVolumeID int, newSize int64) (*models.LogicalVolume, error)
	GetLogicalVolume(systemID string, volumeGroupID, logicalVolumeID int) (*models.LogicalVolume, error)
}

// RAIDClient defines operations for RAID management
type RAIDClient interface {
	CreateRAID(systemID string, params models.RAIDParams) (*models.RAID, error)
	DeleteRAID(systemID string, raidID int) error
	GetRAID(systemID string, raidID int) (*models.RAID, error)
	ListRAIDs(systemID string) ([]models.RAID, error)
	UpdateRAID(systemID string, raidID int, params models.RAIDUpdateParams) (*models.RAID, error)
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
