package service

import (
	"context"
	"fmt"

	"github.com/canonical/gomaasclient/entity"
	"github.com/lspecian/maas-mcp-server/internal/maasclient"
	"github.com/lspecian/maas-mcp-server/internal/models"
	"github.com/lspecian/maas-mcp-server/internal/models/maas"
	modelsmaas "github.com/lspecian/maas-mcp-server/internal/models/maas"
)

// MaasClientWrapper adapts the MaasClient to the service interfaces
type MaasClientWrapper struct {
	client *maasclient.MaasClient
}

// NewMaasClientWrapper creates a new wrapper for the MAAS client
func NewMaasClientWrapper(client *maasclient.MaasClient) *MaasClientWrapper {
	return &MaasClientWrapper{
		client: client,
	}
}

// Ensure MaasClientWrapper implements all required interfaces
var _ MachineClient = (*MaasClientWrapper)(nil)
var _ StorageClient = (*MaasClientWrapper)(nil)
var _ TagClient = (*MaasClientWrapper)(nil)

// ListMachines implements the MachineClient interface
func (w *MaasClientWrapper) ListMachines(ctx context.Context, filters map[string]string, pagination *maas.PaginationOptions) ([]models.Machine, int, error) {
	// For now, we'll implement this using the existing client method and add pagination in memory
	machines, err := w.client.ListMachines(filters)
	if err != nil {
		return nil, 0, err
	}

	totalCount := len(machines)

	// Apply in-memory pagination if specified
	if pagination != nil {
		startIndex := pagination.Offset
		endIndex := startIndex + pagination.Limit

		if startIndex >= len(machines) {
			// Return empty result if offset is beyond the available machines
			return []models.Machine{}, totalCount, nil
		}

		if endIndex > len(machines) {
			endIndex = len(machines)
		}

		machines = machines[startIndex:endIndex]
	}

	return machines, totalCount, nil
}

// ListMachinesSimple implements the MachineClient interface
func (w *MaasClientWrapper) ListMachinesSimple(ctx context.Context, filters map[string]string) ([]models.Machine, error) {
	// Use the existing client method directly
	return w.client.ListMachines(filters)
}

// GetMachine implements the MachineClient interface
func (w *MaasClientWrapper) GetMachine(systemID string) (*models.Machine, error) {
	// Use the existing client method directly
	return w.client.GetMachine(systemID)
}

// GetMachineWithDetails implements the MachineClient interface
func (w *MaasClientWrapper) GetMachineWithDetails(ctx context.Context, systemID string, includeDetails bool) (*models.Machine, error) {
	// For now, we'll implement this using the existing client method
	// In a real implementation, we would respect the includeDetails flag
	return w.client.GetMachine(systemID)
}

// AllocateMachine implements the MachineClient interface
func (w *MaasClientWrapper) AllocateMachine(params *entity.MachineAllocateParams) (*models.Machine, error) {
	return w.client.AllocateMachine(params)
}

// DeployMachine implements the MachineClient interface
func (w *MaasClientWrapper) DeployMachine(systemID string, params *entity.MachineDeployParams) (*models.Machine, error) {
	return w.client.DeployMachine(systemID, params)
}

// ReleaseMachine implements the MachineClient interface
func (w *MaasClientWrapper) ReleaseMachine(systemIDs []string, comment string) error {
	return w.client.ReleaseMachine(systemIDs, comment)
}

// PowerOnMachine implements the MachineClient interface
func (w *MaasClientWrapper) PowerOnMachine(systemID string) (*models.Machine, error) {
	return w.client.PowerOnMachine(systemID)
}

// PowerOffMachine implements the MachineClient interface
func (w *MaasClientWrapper) PowerOffMachine(systemID string) (*models.Machine, error) {
	return w.client.PowerOffMachine(systemID)
}

// GetMachineBlockDevices implements the StorageClient interface
func (w *MaasClientWrapper) GetMachineBlockDevices(systemID string) ([]models.BlockDevice, error) {
	return w.client.GetMachineBlockDevices(systemID)
}

// GetMachineBlockDevice implements the StorageClient interface
func (w *MaasClientWrapper) GetMachineBlockDevice(systemID string, deviceID int) (*models.BlockDevice, error) {
	return w.client.GetMachineBlockDevice(systemID, deviceID)
}

// CreateMachinePartition implements the StorageClient interface
func (w *MaasClientWrapper) CreateMachinePartition(systemID string, blockDeviceID int, params modelsmaas.PartitionCreateParams) (*models.Partition, error) {
	// This is a stub implementation since the underlying client doesn't support this operation yet
	// In a real implementation, this would call the client's method
	return nil, fmt.Errorf("operation not implemented in the underlying client")
}

// UpdateMachinePartition implements the StorageClient interface
func (w *MaasClientWrapper) UpdateMachinePartition(systemID string, blockDeviceID, partitionID int, params map[string]interface{}) (*models.Partition, error) {
	// This is a stub implementation since the underlying client doesn't support this operation yet
	// In a real implementation, this would call the client's method
	return nil, fmt.Errorf("operation not implemented in the underlying client")
}

// DeleteMachinePartition implements the StorageClient interface
func (w *MaasClientWrapper) DeleteMachinePartition(systemID string, blockDeviceID, partitionID int) error {
	// This is a stub implementation since the underlying client doesn't support this operation yet
	// In a real implementation, this would call the client's method
	return fmt.Errorf("operation not implemented in the underlying client")
}

// FormatMachinePartition implements the StorageClient interface
func (w *MaasClientWrapper) FormatMachinePartition(systemID string, blockDeviceID, partitionID int, params map[string]interface{}) (*models.Filesystem, error) {
	// This is a stub implementation since the underlying client doesn't support this operation yet
	// In a real implementation, this would call the client's method
	return nil, fmt.Errorf("operation not implemented in the underlying client")
}

// Volume Group operations

// CreateVolumeGroup implements the StorageClient interface
func (w *MaasClientWrapper) CreateVolumeGroup(systemID string, params models.VolumeGroupParams) (*models.VolumeGroup, error) {
	return w.client.CreateVolumeGroup(systemID, params)
}

// DeleteVolumeGroup implements the StorageClient interface
func (w *MaasClientWrapper) DeleteVolumeGroup(systemID string, volumeGroupID int) error {
	return w.client.DeleteVolumeGroup(systemID, volumeGroupID)
}

// GetVolumeGroup implements the StorageClient interface
func (w *MaasClientWrapper) GetVolumeGroup(systemID string, volumeGroupID int) (*models.VolumeGroup, error) {
	return w.client.GetVolumeGroup(systemID, volumeGroupID)
}

// ListVolumeGroups implements the StorageClient interface
func (w *MaasClientWrapper) ListVolumeGroups(systemID string) ([]models.VolumeGroup, error) {
	return w.client.ListVolumeGroups(systemID)
}

// Logical Volume operations

// CreateLogicalVolume implements the StorageClient interface
func (w *MaasClientWrapper) CreateLogicalVolume(systemID string, volumeGroupID int, params models.LogicalVolumeParams) (*models.LogicalVolume, error) {
	return w.client.CreateLogicalVolume(systemID, volumeGroupID, params)
}

// DeleteLogicalVolume implements the StorageClient interface
func (w *MaasClientWrapper) DeleteLogicalVolume(systemID string, volumeGroupID, logicalVolumeID int) error {
	return w.client.DeleteLogicalVolume(systemID, volumeGroupID, logicalVolumeID)
}

// ResizeLogicalVolume implements the StorageClient interface
func (w *MaasClientWrapper) ResizeLogicalVolume(systemID string, volumeGroupID, logicalVolumeID int, newSize int64) (*models.LogicalVolume, error) {
	return w.client.ResizeLogicalVolume(systemID, volumeGroupID, logicalVolumeID, newSize)
}

// GetLogicalVolume implements the StorageClient interface
func (w *MaasClientWrapper) GetLogicalVolume(systemID string, volumeGroupID, logicalVolumeID int) (*models.LogicalVolume, error) {
	return w.client.GetLogicalVolume(systemID, volumeGroupID, logicalVolumeID)
}

// RAID operations

// CreateRAID implements the StorageClient interface
func (w *MaasClientWrapper) CreateRAID(systemID string, params models.RAIDParams) (*models.RAID, error) {
	return w.client.CreateRAID(systemID, params)
}

// DeleteRAID implements the StorageClient interface
func (w *MaasClientWrapper) DeleteRAID(systemID string, raidID int) error {
	return w.client.DeleteRAID(systemID, raidID)
}

// GetRAID implements the StorageClient interface
func (w *MaasClientWrapper) GetRAID(systemID string, raidID int) (*models.RAID, error) {
	return w.client.GetRAID(systemID, raidID)
}

// ListRAIDs implements the StorageClient interface
func (w *MaasClientWrapper) ListRAIDs(systemID string) ([]models.RAID, error) {
	return w.client.ListRAIDs(systemID)
}

// UpdateRAID implements the StorageClient interface
func (w *MaasClientWrapper) UpdateRAID(systemID string, raidID int, params models.RAIDUpdateParams) (*models.RAID, error) {
	return w.client.UpdateRAID(systemID, raidID, params)
}

// ListTags implements the TagClient interface
func (w *MaasClientWrapper) ListTags() ([]models.Tag, error) {
	return w.client.ListTags()
}

// CreateTag implements the TagClient interface
func (w *MaasClientWrapper) CreateTag(name, comment, definition string) (*models.Tag, error) {
	return w.client.CreateTag(name, comment, definition)
}

// ApplyTagToMachine implements the TagClient interface
func (w *MaasClientWrapper) ApplyTagToMachine(tagName, systemID string) error {
	return w.client.ApplyTagToMachine(tagName, systemID)
}

// RemoveTagFromMachine implements the TagClient interface
func (w *MaasClientWrapper) RemoveTagFromMachine(tagName, systemID string) error {
	return w.client.RemoveTagFromMachine(tagName, systemID)
}

// Storage Constraint methods

// SetStorageConstraints implements the StorageClient interface
func (w *MaasClientWrapper) SetStorageConstraints(systemID string, params models.StorageConstraintParams) error {
	return w.client.SetStorageConstraints(systemID, params)
}

// GetStorageConstraints implements the StorageClient interface
func (w *MaasClientWrapper) GetStorageConstraints(systemID string) (*models.StorageConstraintParams, error) {
	return w.client.GetStorageConstraints(systemID)
}

// ValidateStorageConstraints implements the StorageClient interface
func (w *MaasClientWrapper) ValidateStorageConstraints(systemID string, params models.StorageConstraintParams) (bool, []string, error) {
	return w.client.ValidateStorageConstraints(systemID, params)
}

// ApplyStorageConstraints implements the StorageClient interface
func (w *MaasClientWrapper) ApplyStorageConstraints(systemID string, params models.StorageConstraintParams) error {
	return w.client.ApplyStorageConstraints(systemID, params)
}

// DeleteStorageConstraints implements the StorageClient interface
func (w *MaasClientWrapper) DeleteStorageConstraints(systemID string) error {
	return w.client.DeleteStorageConstraints(systemID)
}

// CheckStorageConstraints implements the MachineClient interface
func (w *MaasClientWrapper) CheckStorageConstraints(machine *models.Machine, constraints *models.SimpleStorageConstraint) bool {
	// This is a simplified check. A real implementation would involve more complex logic
	// to iterate through machine's block devices and compare against constraints.
	if machine == nil || constraints == nil {
		return true // Or false, depending on desired behavior for nil inputs
	}

	// Example: Check minimum disk count
	if constraints.Count > 0 {
		if len(machine.BlockDevices) < constraints.Count {
			return false
		}
	}

	// Example: Check minimum disk size and type (simplified)
	// This requires iterating through machine.BlockDevices and checking individual disks.
	// For simplicity, we'll assume if MinSize or DiskType is set, we need to check them.
	// A more robust implementation would be needed here.
	if constraints.MinSize > 0 || (constraints.DiskType != "" && constraints.DiskType != "any") {
		// Placeholder for actual disk checking logic
		// Iterate through machine.BlockDevices
		// For each disk:
		//   Check if disk.Size >= constraints.MinSize (if MinSize > 0)
		//   Check if disk.Type matches constraints.DiskType (if DiskType is specified and not "any")
		// If a sufficient number of disks meet the criteria (related to constraints.Count), return true.
		// This is a complex check and depends on how MAAS exposes disk type and how to aggregate.
		// For now, let's assume if these are set, the check needs more detail.
		// We can return true to allow filtering at a higher level or implement a basic check.

		// Simplified check: if any disk meets the size, and if type is specified, at least one matches.
		// This is not a perfect match for "all disks of this type must be at least X size"
		// or "N disks of this type and size".
		disksMeetingCriteria := 0
		for _, bd := range machine.BlockDevices {
			meetsSize := true
			if constraints.MinSize > 0 {
				if bd.Size < constraints.MinSize {
					meetsSize = false
				}
			}

			meetsType := true
			if constraints.DiskType != "" && constraints.DiskType != "any" {
				// Assuming bd.Type exists and matches "ssd", "hdd" etc.
				// This field might not be directly available or named 'Type' in models.BlockDevice
				// For example, it might be in bd.StoragePool.DiskType or similar.
				// This is a placeholder for actual type checking.
				// if bd.Type != constraints.DiskType {
				// 	meetsType = false
				// }
				// Let's assume for now if a type is specified, we need a more detailed check
				// or that the MAAS API query handles this.
				// For in-memory filtering, this needs to be robust.
			}

			if meetsSize && meetsType {
				disksMeetingCriteria++
			}
		}
		if constraints.Count > 0 {
			return disksMeetingCriteria >= constraints.Count
		}
		// If count is not specified, but size/type are, then at least one disk must match.
		if constraints.MinSize > 0 || (constraints.DiskType != "" && constraints.DiskType != "any") {
			return disksMeetingCriteria > 0
		}
	}

	return true // Default to true if no specific constraints failed
}
