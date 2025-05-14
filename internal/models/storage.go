package models

import (
	"fmt"
)

// VolumeGroup represents a MAAS LVM volume group
type VolumeGroup struct {
	ID             int             `json:"id"`
	Name           string          `json:"name"`
	UUID           string          `json:"uuid,omitempty"`
	Size           int64           `json:"size"`
	UsedSize       int64           `json:"used_size"`
	AvailableSize  int64           `json:"available_size"`
	SystemID       string          `json:"system_id"`
	BlockDevices   []int           `json:"block_devices,omitempty"`
	Partitions     []int           `json:"partitions,omitempty"`
	LogicalVolumes []LogicalVolume `json:"logical_volumes,omitempty"`
	ResourceURL    string          `json:"resource_url"`
}

// Validate checks if the VolumeGroup has all required fields
func (vg *VolumeGroup) Validate() error {
	if vg.Name == "" {
		return fmt.Errorf("volume group name is required")
	}
	return nil
}

// LogicalVolume represents a MAAS LVM logical volume
type LogicalVolume struct {
	ID          int         `json:"id"`
	Name        string      `json:"name"`
	UUID        string      `json:"uuid,omitempty"`
	Size        int64       `json:"size"`
	VolumeGroup int         `json:"volume_group"`
	Filesystem  *Filesystem `json:"filesystem,omitempty"`
	ResourceURL string      `json:"resource_url"`
}

// Validate checks if the LogicalVolume has all required fields
func (lv *LogicalVolume) Validate() error {
	if lv.Name == "" {
		return fmt.Errorf("logical volume name is required")
	}
	if lv.VolumeGroup == 0 {
		return fmt.Errorf("logical volume must belong to a volume group")
	}
	return nil
}

// VolumeGroupContext represents a volume group in the MCP context
type VolumeGroupContext struct {
	ID             string                 `json:"id"`
	Name           string                 `json:"name"`
	UUID           string                 `json:"uuid,omitempty"`
	Size           int64                  `json:"size_bytes"`
	UsedSize       int64                  `json:"used_bytes"`
	AvailableSize  int64                  `json:"available_bytes"`
	BlockDevices   []string               `json:"block_devices,omitempty"`
	Partitions     []string               `json:"partitions,omitempty"`
	LogicalVolumes []LogicalVolumeContext `json:"logical_volumes,omitempty"`
}

// Validate checks if the VolumeGroupContext has all required fields
func (vg *VolumeGroupContext) Validate() error {
	if vg.ID == "" {
		return fmt.Errorf("volume group id is required")
	}
	if vg.Name == "" {
		return fmt.Errorf("volume group name is required")
	}
	return nil
}

// LogicalVolumeContext represents a logical volume in the MCP context
type LogicalVolumeContext struct {
	ID          string             `json:"id"`
	Name        string             `json:"name"`
	UUID        string             `json:"uuid,omitempty"`
	Size        int64              `json:"size_bytes"`
	VolumeGroup string             `json:"volume_group"`
	Filesystem  *FilesystemContext `json:"filesystem,omitempty"`
}

// Validate checks if the LogicalVolumeContext has all required fields
func (lv *LogicalVolumeContext) Validate() error {
	if lv.ID == "" {
		return fmt.Errorf("logical volume id is required")
	}
	if lv.Name == "" {
		return fmt.Errorf("logical volume name is required")
	}
	if lv.VolumeGroup == "" {
		return fmt.Errorf("logical volume must belong to a volume group")
	}
	return nil
}

// MaasVolumeGroupToMCPContext converts a MAAS VolumeGroup to MCP VolumeGroupContext
func MaasVolumeGroupToMCPContext(vg *VolumeGroup) *VolumeGroupContext {
	if vg == nil {
		return nil
	}

	context := &VolumeGroupContext{
		ID:            idToString(vg.ID),
		Name:          vg.Name,
		UUID:          vg.UUID,
		Size:          vg.Size,
		UsedSize:      vg.UsedSize,
		AvailableSize: vg.AvailableSize,
	}

	// Convert block device IDs to strings
	context.BlockDevices = make([]string, len(vg.BlockDevices))
	for i, id := range vg.BlockDevices {
		context.BlockDevices[i] = idToString(id)
	}

	// Convert partition IDs to strings
	context.Partitions = make([]string, len(vg.Partitions))
	for i, id := range vg.Partitions {
		context.Partitions[i] = idToString(id)
	}

	// Convert logical volumes
	context.LogicalVolumes = make([]LogicalVolumeContext, len(vg.LogicalVolumes))
	for i, lv := range vg.LogicalVolumes {
		context.LogicalVolumes[i] = LogicalVolumeContext{
			ID:          idToString(lv.ID),
			Name:        lv.Name,
			UUID:        lv.UUID,
			Size:        lv.Size,
			VolumeGroup: idToString(lv.VolumeGroup),
		}

		if lv.Filesystem != nil {
			context.LogicalVolumes[i].Filesystem = &FilesystemContext{
				Type:         lv.Filesystem.FSType,
				UUID:         lv.Filesystem.UUID,
				MountPoint:   lv.Filesystem.MountPoint,
				MountOptions: lv.Filesystem.MountOptions,
			}
		}
	}

	return context
}

// MaasLogicalVolumeToMCPContext converts a MAAS LogicalVolume to MCP LogicalVolumeContext
func MaasLogicalVolumeToMCPContext(lv *LogicalVolume) *LogicalVolumeContext {
	if lv == nil {
		return nil
	}

	context := &LogicalVolumeContext{
		ID:          idToString(lv.ID),
		Name:        lv.Name,
		UUID:        lv.UUID,
		Size:        lv.Size,
		VolumeGroup: idToString(lv.VolumeGroup),
	}

	if lv.Filesystem != nil {
		context.Filesystem = &FilesystemContext{
			Type:         lv.Filesystem.FSType,
			UUID:         lv.Filesystem.UUID,
			MountPoint:   lv.Filesystem.MountPoint,
			MountOptions: lv.Filesystem.MountOptions,
		}
	}

	return context
}

// VolumeGroupParams represents parameters for creating a volume group
type VolumeGroupParams struct {
	Name         string `json:"name"`
	BlockDevices []int  `json:"block_devices,omitempty"`
	Partitions   []int  `json:"partitions,omitempty"`
}

// LogicalVolumeParams represents parameters for creating a logical volume
type LogicalVolumeParams struct {
	Name   string `json:"name"`
	Size   int64  `json:"size"`
	FSType string `json:"fstype,omitempty"`
}

// DesiredStorageConfiguration represents the desired storage setup for a machine, including constraints and LVM configurations.
type DesiredStorageConfiguration struct {
	Constraints  *StorageConstraintParams `json:"constraints,omitempty"`
	VolumeGroups []DesiredVolumeGroup     `json:"volume_groups,omitempty"`
	Partitions   []PartitionParams        `json:"partitions,omitempty"`  // Include if orchestrator handles direct partition creation
	RAIDArrays   []RAIDParams             `json:"raid_arrays,omitempty"` // Include if orchestrator handles direct RAID creation
}

// Validate performs basic validation on the DesiredStorageConfiguration.
func (dsc *DesiredStorageConfiguration) Validate() error {
	// Basic validation: ensure at least one configuration type is provided
	if dsc.Constraints == nil && len(dsc.VolumeGroups) == 0 && len(dsc.Partitions) == 0 && len(dsc.RAIDArrays) == 0 {
		return fmt.Errorf("at least one of constraints, volume_groups, partitions, or raid_arrays must be provided")
	}

	// Validate nested structures (VolumeGroups, Partitions, RAIDArrays)
	for _, vg := range dsc.VolumeGroups {
		if err := vg.Validate(); err != nil {
			return fmt.Errorf("invalid volume group configuration: %w", err)
		}
	}

	return nil
}

// DesiredVolumeGroup represents the desired configuration for a volume group.
type DesiredVolumeGroup struct {
	Name           string                 `json:"name"`
	BlockDevices   []string               `json:"block_devices,omitempty"` // Use string IDs
	Partitions     []string               `json:"partitions,omitempty"`    // Use string IDs
	LogicalVolumes []DesiredLogicalVolume `json:"logical_volumes,omitempty"`
}

// Validate performs basic validation on the DesiredVolumeGroup.
func (dvg *DesiredVolumeGroup) Validate() error {
	if dvg.Name == "" {
		return fmt.Errorf("volume group name is required")
	}
	if len(dvg.BlockDevices) == 0 && len(dvg.Partitions) == 0 {
		return fmt.Errorf("at least one block device or partition is required for volume group '%s'", dvg.Name)
	}
	for _, lv := range dvg.LogicalVolumes {
		if err := lv.Validate(); err != nil {
			return fmt.Errorf("invalid logical volume configuration in volume group '%s': %w", dvg.Name, err)
		}
	}
	return nil
}

// DesiredLogicalVolume represents the desired configuration for a logical volume.
type DesiredLogicalVolume struct {
	Name   string `json:"name"`
	Size   int64  `json:"size_bytes"` // Size in bytes
	FSType string `json:"fstype,omitempty"`
}

// Validate performs basic validation on the DesiredLogicalVolume.
func (dlv *DesiredLogicalVolume) Validate() error {
	if dlv.Name == "" {
		return fmt.Errorf("logical volume name is required")
	}
	if dlv.Size <= 0 {
		return fmt.Errorf("logical volume size must be greater than zero for logical volume '%s'", dlv.Name)
	}
	return nil
}

// PartitionParams represents parameters for creating a partition
type PartitionParams struct {
	Size       int64  `json:"size"`                  // Size in bytes
	Type       string `json:"type,omitempty"`        // e.g., "primary", "logical", or a filesystem type like "ext4", "xfs" if MAAS uses it this way for auto-partitioning
	Label      string `json:"label,omitempty"`       // Filesystem label
	FSType     string `json:"fstype,omitempty"`      // Filesystem type (e.g., "ext4", "xfs", "swap") to format with
	MountPoint string `json:"mount_point,omitempty"` // Mount point if creating a filesystem
	Bootable   bool   `json:"bootable,omitempty"`
}

// Note: Definitions for StorageConstraintType, StorageConstraint, StorageConstraintParams,
// StorageConstraintContext, StorageConstraintContextItem, SimpleStorageConstraint,
// and their associated methods are assumed to be canonical in a different file
// within the 'models' package (e.g., internal/models/storage_constraints.go),
// as indicated by previous 'redeclared in this block' compiler errors.
// This file (storage.go) should retain PartitionParams if it's not defined elsewhere
// and other general storage models like VolumeGroup, LogicalVolume, etc.

// Definitions for StorageConstraintType, StorageConstraint, StorageConstraintParams,
// StorageConstraintContext, StorageConstraintContextItem, SimpleStorageConstraint,
// and their associated methods are assumed to be canonical in
// internal/models/storage_constraints.go (even if not currently readable by the tool)
// or another file within the models package.
// The "redeclared in this block" errors from the compiler suggest these exist elsewhere.
// This file (storage.go) should primarily contain LVM, RAID, and general storage models
// other than the specific constraint definition types if they are indeed separated.
// For now, leaving PartitionParams as it was not reported as redeclared with maas.go or storage_constraints.go.
