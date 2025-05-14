package models

import (
	"fmt"
)

// FilesystemParams represents parameters for creating a filesystem
type FilesystemParams struct {
	FSType       string `json:"fstype"`
	Label        string `json:"label,omitempty"`
	UUID         string `json:"uuid,omitempty"`
	MountPoint   string `json:"mount_point,omitempty"`
	MountOptions string `json:"mount_options,omitempty"`
}

// Validate checks if the FilesystemParams has all required fields
func (fp *FilesystemParams) Validate() error {
	if fp.FSType == "" {
		return fmt.Errorf("filesystem type is required")
	}
	return nil
}

// MountParams represents parameters for mounting a filesystem
type MountParams struct {
	MountPoint   string `json:"mount_point"`
	MountOptions string `json:"mount_options,omitempty"`
}

// Validate checks if the MountParams has all required fields
func (mp *MountParams) Validate() error {
	if mp.MountPoint == "" {
		return fmt.Errorf("mount point is required")
	}
	return nil
}

// FilesystemListParams represents parameters for listing filesystems
type FilesystemListParams struct {
	DeviceType string `json:"device_type,omitempty"` // "partition", "block-device", or "logical-volume"
}
