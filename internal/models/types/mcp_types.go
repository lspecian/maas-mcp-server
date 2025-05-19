package types

import (
	"time"
)

// MachineContext represents a machine in the MCP context
type MachineContext struct {
	ID                string            `json:"id"`
	Name              string            `json:"name"`
	FQDN              string            `json:"fqdn"`
	Status            string            `json:"status"`
	Architecture      string            `json:"architecture"`
	PowerState        string            `json:"power_state"`
	Zone              string            `json:"zone"`
	Pool              string            `json:"pool"`
	Tags              []string          `json:"tags"`
	CPUCount          int               `json:"cpu_count"`
	Memory            int64             `json:"memory"`
	OSInfo            OSInfo            `json:"os_info"`
	NetworkInterfaces []NetworkContext  `json:"network_interfaces,omitempty"`
	BlockDevices      []StorageContext  `json:"block_devices,omitempty"`
	LastUpdated       time.Time         `json:"last_updated"`
	Metadata          map[string]string `json:"metadata,omitempty"`
}

// OSInfo represents operating system information
type OSInfo struct {
	System       string `json:"system"`
	Distribution string `json:"distribution"`
	Release      string `json:"release"`
}

// NetworkContext represents a network interface in the MCP context
type NetworkContext struct {
	ID         string   `json:"id"`
	Name       string   `json:"name"`
	Type       string   `json:"type"`
	MACAddress string   `json:"mac_address"`
	Enabled    bool     `json:"enabled"`
	Primary    bool     `json:"primary"`
	VLAN       string   `json:"vlan,omitempty"`
	VLANTag    int      `json:"vlan_tag,omitempty"`
	MTU        int      `json:"mtu,omitempty"`
	IPAddress  string   `json:"ip_address,omitempty"`
	CIDR       string   `json:"cidr,omitempty"`
	Subnet     string   `json:"subnet,omitempty"`
	Tags       []string `json:"tags,omitempty"`
}

// StorageContext represents a storage device in the MCP context
type StorageContext struct {
	ID            string             `json:"id"`
	Name          string             `json:"name"`
	Type          string             `json:"type"`
	Path          string             `json:"path"`
	Size          int64              `json:"size"`
	UsedSize      int64              `json:"used_size"`
	AvailableSize int64              `json:"available_size"`
	Model         string             `json:"model,omitempty"`
	Serial        string             `json:"serial,omitempty"`
	Partitions    []PartitionContext `json:"partitions,omitempty"`
	Filesystem    *FilesystemContext `json:"filesystem,omitempty"`
	Tags          []string           `json:"tags,omitempty"`
}

// PartitionContext represents a partition in the MCP context
type PartitionContext struct {
	ID         string             `json:"id"`
	Number     int                `json:"number"`
	Size       int64              `json:"size"`
	Path       string             `json:"path"`
	Filesystem *FilesystemContext `json:"filesystem,omitempty"`
}

// FilesystemContext represents a filesystem in the MCP context
type FilesystemContext struct {
	Type         string `json:"type"`
	UUID         string `json:"uuid,omitempty"`
	MountPoint   string `json:"mount_point,omitempty"`
	MountOptions string `json:"mount_options,omitempty"`
}

// TagContext represents a tag in the MCP context
type TagContext struct {
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	Color       string `json:"color,omitempty"`
	Category    string `json:"category,omitempty"`
}

// SimpleStorageConstraint represents simplified storage constraints
type SimpleStorageConstraint struct {
	MinSize int64  `json:"min_size"` // Minimum size in bytes
	MaxSize int64  `json:"max_size"` // Maximum size in bytes
	Count   int    `json:"count"`    // Number of devices
	Tags    string `json:"tags"`     // Comma-separated list of tags
}

// StorageConstraintParams represents storage constraint parameters
type StorageConstraintParams struct {
	RootDisk     int64                  `json:"root_disk,omitempty"`     // Size in bytes
	RootFSType   string                 `json:"root_fstype,omitempty"`   // Filesystem type for root
	BootDisk     string                 `json:"boot_disk,omitempty"`     // Boot disk identifier
	Constraints  map[string]interface{} `json:"constraints,omitempty"`   // Detailed constraints
	SimpleLayout bool                   `json:"simple_layout,omitempty"` // Use simple layout
}

// VolumeGroupParams represents parameters for creating a volume group
type VolumeGroupParams struct {
	Name       string   `json:"name"`
	Devices    []string `json:"devices"`
	Partitions []string `json:"partitions,omitempty"`
	Size       int64    `json:"size,omitempty"`
}

// LogicalVolumeParams represents parameters for creating a logical volume
type LogicalVolumeParams struct {
	Name   string `json:"name"`
	Size   int64  `json:"size"`
	FSType string `json:"fstype,omitempty"`
}

// VolumeGroup represents a volume group
type VolumeGroup struct {
	ID             int             `json:"id"`
	Name           string          `json:"name"`
	Size           int64           `json:"size"`
	AvailableSize  int64           `json:"available_size"`
	UsedSize       int64           `json:"used_size"`
	Devices        []string        `json:"devices"`
	Partitions     []string        `json:"partitions,omitempty"`
	LogicalVolumes []LogicalVolume `json:"logical_volumes,omitempty"`
	ResourceURL    string          `json:"resource_url"`
}

// LogicalVolume represents a logical volume
type LogicalVolume struct {
	ID          int         `json:"id"`
	Name        string      `json:"name"`
	Size        int64       `json:"size"`
	Filesystem  *Filesystem `json:"filesystem,omitempty"`
	ResourceURL string      `json:"resource_url"`
}

// RAIDParams represents parameters for creating a RAID
type RAIDParams struct {
	Name            string   `json:"name"`
	Level           string   `json:"level"`
	Devices         []string `json:"devices"`
	Partitions      []string `json:"partitions,omitempty"`
	SpareDevices    []string `json:"spare_devices,omitempty"`
	SparePartitions []string `json:"spare_partitions,omitempty"`
}

// RAIDUpdateParams represents parameters for updating a RAID
type RAIDUpdateParams struct {
	Name               string   `json:"name,omitempty"`
	AddDevices         []string `json:"add_devices,omitempty"`
	RemoveDevices      []string `json:"remove_devices,omitempty"`
	AddSpareDevices    []string `json:"add_spare_devices,omitempty"`
	RemoveSpareDevices []string `json:"remove_spare_devices,omitempty"`
}

// RAID represents a RAID configuration
type RAID struct {
	ID              int         `json:"id"`
	Name            string      `json:"name"`
	Level           string      `json:"level"`
	Size            int64       `json:"size"`
	Devices         []string    `json:"devices"`
	Partitions      []string    `json:"partitions,omitempty"`
	SpareDevices    []string    `json:"spare_devices,omitempty"`
	SparePartitions []string    `json:"spare_partitions,omitempty"`
	Filesystem      *Filesystem `json:"filesystem,omitempty"`
	ResourceURL     string      `json:"resource_url"`
}
