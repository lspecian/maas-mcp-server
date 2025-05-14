package maas

import (
	"context"

	"github.com/canonical/gomaasclient/entity"
	"github.com/lspecian/maas-mcp-server/internal/models/maas"
)

// Client defines the interface for interacting with the MAAS API
type Client interface {
	// GetVersion returns the MAAS API version
	GetVersion(ctx context.Context) (string, error)

	// Machine Operations
	MachineOperations

	// Network Operations
	NetworkOperations

	// Storage Operations
	StorageOperations

	// Tag Operations
	TagOperations

	// Close closes the client and releases any resources
	Close() error
}

// MachineOperations defines the interface for machine-related operations
type MachineOperations interface {
	// ListMachines retrieves machines based on filters with pagination
	ListMachines(ctx context.Context, filters map[string]string, pagination *maas.PaginationOptions) ([]maas.Machine, int, error)

	// ListMachinesSimple retrieves machines based on filters without pagination
	ListMachinesSimple(ctx context.Context, filters map[string]string) ([]maas.Machine, error)

	// GetMachine retrieves details for a specific machine
	GetMachine(ctx context.Context, systemID string) (*maas.Machine, error)

	// GetMachineWithDetails retrieves details for a specific machine with optional detailed information
	GetMachineWithDetails(ctx context.Context, systemID string, includeDetails bool) (*maas.Machine, error)

	// AllocateMachine allocates a machine based on constraints
	AllocateMachine(ctx context.Context, params *entity.MachineAllocateParams) (*maas.Machine, error)

	// DeployMachine deploys an allocated machine
	DeployMachine(ctx context.Context, systemID string, params *entity.MachineDeployParams) (*maas.Machine, error)

	// ReleaseMachine releases a machine back to the pool
	ReleaseMachine(ctx context.Context, systemIDs []string, comment string) error

	// PowerOnMachine powers on a machine
	PowerOnMachine(ctx context.Context, systemID string) (*maas.Machine, error)

	// PowerOffMachine powers off a machine
	PowerOffMachine(ctx context.Context, systemID string) (*maas.Machine, error)

	// GetMachineStatus gets the current status of a machine
	GetMachineStatus(ctx context.Context, systemID string) (string, error)

	// GetMachinePowerState gets the current power state of a machine
	GetMachinePowerState(ctx context.Context, systemID string) (string, error)

	// CommissionMachine commissions a machine
	CommissionMachine(ctx context.Context, systemID string, params *entity.MachineCommissionParams) (*maas.Machine, error)

	// AbortMachineOperation aborts the current operation on a machine
	AbortMachineOperation(ctx context.Context, systemID string, comment string) (*maas.Machine, error)
}

// NetworkOperations defines the interface for network-related operations
type NetworkOperations interface {
	// ListSubnets retrieves all subnets
	ListSubnets(ctx context.Context) ([]maas.Subnet, error)

	// GetSubnet retrieves subnet details
	GetSubnet(ctx context.Context, id int) (*maas.Subnet, error)

	// ListVLANs retrieves all VLANs for a fabric
	ListVLANs(ctx context.Context, fabricID int) ([]maas.VLAN, error)

	// GetVLAN retrieves VLAN details
	GetVLAN(ctx context.Context, fabricID, vlanID int) (*maas.VLAN, error)

	// ListFabrics retrieves all fabrics
	ListFabrics(ctx context.Context) ([]maas.Fabric, error)

	// GetFabric retrieves fabric details
	GetFabric(ctx context.Context, fabricID int) (*maas.Fabric, error)

	// GetMachineInterfaces retrieves network interfaces for a specific machine
	GetMachineInterfaces(ctx context.Context, systemID string) ([]maas.NetworkInterface, error)

	// CreateSubnet creates a new subnet
	CreateSubnet(ctx context.Context, params map[string]interface{}) (*maas.Subnet, error)

	// UpdateSubnet updates an existing subnet
	UpdateSubnet(ctx context.Context, id int, params map[string]interface{}) (*maas.Subnet, error)

	// DeleteSubnet deletes a subnet
	DeleteSubnet(ctx context.Context, id int) error
}

// StorageOperations defines the interface for storage-related operations
type StorageOperations interface {
	// GetMachineBlockDevices retrieves block devices for a specific machine
	GetMachineBlockDevices(ctx context.Context, systemID string) ([]maas.BlockDevice, error)

	// GetMachineFilesystems retrieves filesystems for a specific machine
	GetMachineFilesystems(ctx context.Context, systemID string) ([]maas.Filesystem, error)

	// CreateMachineBlockDevice creates a block device for a specific machine
	CreateMachineBlockDevice(ctx context.Context, systemID string, params map[string]interface{}) (*maas.BlockDevice, error)

	// UpdateMachineBlockDevice updates a block device for a specific machine
	UpdateMachineBlockDevice(ctx context.Context, systemID string, blockDeviceID int, params map[string]interface{}) (*maas.BlockDevice, error)

	// DeleteMachineBlockDevice deletes a block device for a specific machine
	DeleteMachineBlockDevice(ctx context.Context, systemID string, blockDeviceID int) error

	// CreateMachinePartition creates a partition on a block device for a specific machine
	CreateMachinePartition(ctx context.Context, systemID string, blockDeviceID int, params map[string]interface{}) (*maas.Partition, error)

	// UpdateMachinePartition updates a partition on a block device for a specific machine
	UpdateMachinePartition(ctx context.Context, systemID string, blockDeviceID, partitionID int, params map[string]interface{}) (*maas.Partition, error)

	// DeleteMachinePartition deletes a partition from a block device for a specific machine
	DeleteMachinePartition(ctx context.Context, systemID string, blockDeviceID, partitionID int) error

	// FormatMachinePartition formats a partition on a block device for a specific machine
	FormatMachinePartition(ctx context.Context, systemID string, blockDeviceID, partitionID int, params map[string]interface{}) (*maas.Filesystem, error)

	// MountMachineFilesystem mounts a filesystem for a specific machine
	MountMachineFilesystem(ctx context.Context, systemID string, filesystemID int, params map[string]interface{}) (*maas.Filesystem, error)
}

// TagOperations defines the interface for tag-related operations
type TagOperations interface {
	// ListTags retrieves all tags
	ListTags(ctx context.Context) ([]maas.Tag, error)

	// GetTag retrieves tag details
	GetTag(ctx context.Context, name string) (*maas.Tag, error)

	// CreateTag creates a new tag
	CreateTag(ctx context.Context, name, comment, definition string) (*maas.Tag, error)

	// UpdateTag updates an existing tag
	UpdateTag(ctx context.Context, name string, params map[string]interface{}) (*maas.Tag, error)

	// DeleteTag deletes a tag
	DeleteTag(ctx context.Context, name string) error

	// ApplyTagToMachine applies a tag to a machine
	ApplyTagToMachine(ctx context.Context, tagName, systemID string) error

	// RemoveTagFromMachine removes a tag from a machine
	RemoveTagFromMachine(ctx context.Context, tagName, systemID string) error

	// GetMachinesWithTag retrieves all machines with a specific tag
	GetMachinesWithTag(ctx context.Context, tagName string) ([]maas.Machine, error)
}

// ClientRegistry defines the interface for managing multiple MAAS clients
type ClientRegistry interface {
	// GetClient returns the client for a specific MAAS instance
	GetClient(instanceName string) (Client, error)

	// GetDefaultClient returns the client for the default MAAS instance
	GetDefaultClient() (Client, error)

	// RegisterClient registers a client for a MAAS instance
	RegisterClient(instanceName string, client Client) error

	// RemoveClient removes a client for a MAAS instance
	RemoveClient(instanceName string) error

	// ListInstances lists all registered MAAS instances
	ListInstances() ([]string, error)

	// SetDefaultInstance sets the default MAAS instance
	SetDefaultInstance(instanceName string) error

	// Close closes all clients and releases any resources
	Close() error
}

// Fabric represents a MAAS fabric entity
type Fabric struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	ResourceURL string `json:"resource_url"`
}
