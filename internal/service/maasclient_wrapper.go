package service

import (
	"github.com/canonical/gomaasclient/entity"
	"github.com/lspecian/maas-mcp-server/internal/maasclient"
	"github.com/lspecian/maas-mcp-server/internal/models"
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
func (w *MaasClientWrapper) ListMachines(filters map[string]string) ([]models.Machine, error) {
	return w.client.ListMachines(filters)
}

// GetMachine implements the MachineClient interface
func (w *MaasClientWrapper) GetMachine(systemID string) (*models.Machine, error) {
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
