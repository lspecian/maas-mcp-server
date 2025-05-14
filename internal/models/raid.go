package models

import (
	"fmt"
)

// RAIDLevel represents the RAID level
type RAIDLevel string

// RAID levels
const (
	RAID0  RAIDLevel = "raid-0"
	RAID1  RAIDLevel = "raid-1"
	RAID5  RAIDLevel = "raid-5"
	RAID6  RAIDLevel = "raid-6"
	RAID10 RAIDLevel = "raid-10"
)

// RAID represents a MAAS RAID array
type RAID struct {
	ID            int         `json:"id"`
	Name          string      `json:"name"`
	UUID          string      `json:"uuid,omitempty"`
	Level         RAIDLevel   `json:"level"`
	Size          int64       `json:"size"`
	UsedSize      int64       `json:"used_size"`
	AvailableSize int64       `json:"available_size"`
	SystemID      string      `json:"system_id"`
	BlockDevices  []int       `json:"block_devices,omitempty"`
	Partitions    []int       `json:"partitions,omitempty"`
	SpareDevices  []int       `json:"spare_devices,omitempty"`
	Filesystem    *Filesystem `json:"filesystem,omitempty"`
	ResourceURL   string      `json:"resource_url"`
}

// Validate checks if the RAID has all required fields
func (r *RAID) Validate() error {
	if r.Name == "" {
		return fmt.Errorf("RAID name is required")
	}
	if r.Level == "" {
		return fmt.Errorf("RAID level is required")
	}
	if len(r.BlockDevices) == 0 && len(r.Partitions) == 0 {
		return fmt.Errorf("at least one block device or partition is required")
	}
	return nil
}

// RAIDContext represents a RAID array in the MCP context
type RAIDContext struct {
	ID            string             `json:"id"`
	Name          string             `json:"name"`
	UUID          string             `json:"uuid,omitempty"`
	Level         string             `json:"level"`
	Size          int64              `json:"size_bytes"`
	UsedSize      int64              `json:"used_bytes"`
	AvailableSize int64              `json:"available_bytes"`
	BlockDevices  []string           `json:"block_devices,omitempty"`
	Partitions    []string           `json:"partitions,omitempty"`
	SpareDevices  []string           `json:"spare_devices,omitempty"`
	Filesystem    *FilesystemContext `json:"filesystem,omitempty"`
}

// Validate checks if the RAIDContext has all required fields
func (r *RAIDContext) Validate() error {
	if r.ID == "" {
		return fmt.Errorf("RAID id is required")
	}
	if r.Name == "" {
		return fmt.Errorf("RAID name is required")
	}
	if r.Level == "" {
		return fmt.Errorf("RAID level is required")
	}
	return nil
}

// MaasRAIDToMCPContext converts a MAAS RAID to MCP RAIDContext
func MaasRAIDToMCPContext(raid *RAID) *RAIDContext {
	if raid == nil {
		return nil
	}

	context := &RAIDContext{
		ID:            idToString(raid.ID),
		Name:          raid.Name,
		UUID:          raid.UUID,
		Level:         string(raid.Level),
		Size:          raid.Size,
		UsedSize:      raid.UsedSize,
		AvailableSize: raid.AvailableSize,
	}

	// Convert block device IDs to strings
	context.BlockDevices = make([]string, len(raid.BlockDevices))
	for i, id := range raid.BlockDevices {
		context.BlockDevices[i] = idToString(id)
	}

	// Convert partition IDs to strings
	context.Partitions = make([]string, len(raid.Partitions))
	for i, id := range raid.Partitions {
		context.Partitions[i] = idToString(id)
	}

	// Convert spare device IDs to strings
	context.SpareDevices = make([]string, len(raid.SpareDevices))
	for i, id := range raid.SpareDevices {
		context.SpareDevices[i] = idToString(id)
	}

	// Convert filesystem
	if raid.Filesystem != nil {
		context.Filesystem = MaasFilesystemToMCPContext(raid.Filesystem)
	}

	return context
}

// RAIDParams represents parameters for creating a RAID array
type RAIDParams struct {
	Name         string    `json:"name"`
	Level        RAIDLevel `json:"level"`
	BlockDevices []int     `json:"block_devices,omitempty"`
	Partitions   []int     `json:"partitions,omitempty"`
	SpareDevices []int     `json:"spare_devices,omitempty"`
}

// Validate checks if the RAIDParams has all required fields
func (rp *RAIDParams) Validate() error {
	if rp.Name == "" {
		return fmt.Errorf("RAID name is required")
	}
	if rp.Level == "" {
		return fmt.Errorf("RAID level is required")
	}
	if len(rp.BlockDevices) == 0 && len(rp.Partitions) == 0 {
		return fmt.Errorf("at least one block device or partition is required")
	}
	return nil
}

// RAIDUpdateParams represents parameters for updating a RAID array
type RAIDUpdateParams struct {
	Name            string `json:"name,omitempty"`
	AddBlockDevices []int  `json:"add_block_devices,omitempty"`
	RemBlockDevices []int  `json:"remove_block_devices,omitempty"`
	AddPartitions   []int  `json:"add_partitions,omitempty"`
	RemPartitions   []int  `json:"remove_partitions,omitempty"`
	AddSpareDevices []int  `json:"add_spare_devices,omitempty"`
	RemSpareDevices []int  `json:"remove_spare_devices,omitempty"`
}

// Validate checks if the RAIDUpdateParams has valid fields
func (rp *RAIDUpdateParams) Validate() error {
	// At least one field should be set for update
	if rp.Name == "" &&
		len(rp.AddBlockDevices) == 0 &&
		len(rp.RemBlockDevices) == 0 &&
		len(rp.AddPartitions) == 0 &&
		len(rp.RemPartitions) == 0 &&
		len(rp.AddSpareDevices) == 0 &&
		len(rp.RemSpareDevices) == 0 {
		return fmt.Errorf("at least one field must be set for update")
	}
	return nil
}
