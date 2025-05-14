package machine

import (
	"context"
	"fmt"

	"github.com/canonical/gomaasclient/entity"
	"github.com/sirupsen/logrus"

	"github.com/lspecian/maas-mcp-server/internal/maas"
	"github.com/lspecian/maas-mcp-server/internal/models"
)

// MaasRepository implements the Repository interface using the MAAS client
type MaasRepository struct {
	client *maas.ClientWrapper
	logger *logrus.Logger
}

// NewMaasRepository creates a new MAAS machine repository
func NewMaasRepository(client *maas.ClientWrapper, logger *logrus.Logger) *MaasRepository {
	return &MaasRepository{
		client: client,
		logger: logger,
	}
}

// Close implements the Repository interface
func (r *MaasRepository) Close() error {
	// No resources to close for this repository
	return nil
}

// ListMachines retrieves machines based on filters
func (r *MaasRepository) ListMachines(ctx context.Context, filters map[string]string) ([]models.Machine, error) {
	// Convert filters to MAAS parameters
	params := &entity.MachinesParams{}

	if hostname, ok := filters["hostname"]; ok {
		params.Hostname = []string{hostname}
	}

	if zone, ok := filters["zone"]; ok {
		params.Zone = []string{zone}
	}

	if tags, ok := filters["tags"]; ok {
		params.Tags = []string{tags}
	}

	// Call MAAS client
	machines, err := r.client.ListMachines(params)
	if err != nil {
		r.logger.WithError(err).Error("Failed to list machines from MAAS")
		return nil, err
	}

	// Convert to internal models
	result := make([]models.Machine, len(machines))
	for i, m := range machines {
		result[i] = models.Machine{
			SystemID:     m.SystemID,
			Hostname:     m.Hostname,
			FQDN:         m.FQDN,
			Status:       fmt.Sprint(m.Status),
			StatusName:   mapMAASStatus(int(m.Status)),
			Architecture: m.Architecture,
			PowerState:   m.PowerState,
			Zone:         m.Zone.Name,
			Pool:         m.Pool.Name,
			Tags:         m.TagNames,
			CPUCount:     m.CPUCount,
			Memory:       m.Memory,
			OSSystem:     m.OSystem,
			DistroSeries: m.DistroSeries,
		}
	}

	return result, nil
}

// GetMachine retrieves details for a specific machine
func (r *MaasRepository) GetMachine(ctx context.Context, systemID string) (*models.Machine, error) {
	// Call MAAS client
	machine, err := r.client.GetMachine(systemID)
	if err != nil {
		r.logger.WithError(err).WithField("id", systemID).Error("Failed to get machine from MAAS")
		return nil, err
	}

	// Convert to internal model
	result := &models.Machine{
		SystemID:     machine.SystemID,
		Hostname:     machine.Hostname,
		FQDN:         machine.FQDN,
		Status:       fmt.Sprint(machine.Status),
		StatusName:   mapMAASStatus(int(machine.Status)),
		Architecture: machine.Architecture,
		PowerState:   machine.PowerState,
		Zone:         machine.Zone.Name,
		Pool:         machine.Pool.Name,
		Tags:         machine.TagNames,
		CPUCount:     machine.CPUCount,
		Memory:       machine.Memory,
		OSSystem:     machine.OSystem,
		DistroSeries: machine.DistroSeries,
	}

	return result, nil
}

// AllocateMachine allocates a machine based on constraints
func (r *MaasRepository) AllocateMachine(ctx context.Context, params *entity.MachineAllocateParams) (*models.Machine, error) {
	// Call MAAS client
	machine, err := r.client.AllocateMachine(params)
	if err != nil {
		r.logger.WithError(err).Error("Failed to allocate machine from MAAS")
		return nil, err
	}

	// Convert to internal model
	result := &models.Machine{
		SystemID:     machine.SystemID,
		Hostname:     machine.Hostname,
		FQDN:         machine.FQDN,
		Status:       fmt.Sprint(machine.Status),
		StatusName:   mapMAASStatus(int(machine.Status)),
		Architecture: machine.Architecture,
		PowerState:   machine.PowerState,
		Zone:         machine.Zone.Name,
		Pool:         machine.Pool.Name,
		Tags:         machine.TagNames,
		CPUCount:     machine.CPUCount,
		Memory:       machine.Memory,
		OSSystem:     machine.OSystem,
		DistroSeries: machine.DistroSeries,
	}

	return result, nil
}

// DeployMachine deploys an allocated machine
func (r *MaasRepository) DeployMachine(ctx context.Context, systemID string, params *entity.MachineDeployParams) (*models.Machine, error) {
	// Call MAAS client
	machine, err := r.client.DeployMachine(systemID, params)
	if err != nil {
		r.logger.WithError(err).WithField("id", systemID).Error("Failed to deploy machine from MAAS")
		return nil, err
	}

	// Convert to internal model
	result := &models.Machine{
		SystemID:     machine.SystemID,
		Hostname:     machine.Hostname,
		FQDN:         machine.FQDN,
		Status:       fmt.Sprint(machine.Status),
		StatusName:   mapMAASStatus(int(machine.Status)),
		Architecture: machine.Architecture,
		PowerState:   machine.PowerState,
		Zone:         machine.Zone.Name,
		Pool:         machine.Pool.Name,
		Tags:         machine.TagNames,
		CPUCount:     machine.CPUCount,
		Memory:       machine.Memory,
		OSSystem:     machine.OSystem,
		DistroSeries: machine.DistroSeries,
	}

	return result, nil
}

// ReleaseMachine releases a machine back to the pool
func (r *MaasRepository) ReleaseMachine(ctx context.Context, systemIDs []string, comment string) error {
	// Call MAAS client
	err := r.client.ReleaseMachine(systemIDs, comment)
	if err != nil {
		r.logger.WithError(err).WithField("ids", systemIDs).Error("Failed to release machine from MAAS")
		return err
	}

	return nil
}

// PowerOnMachine powers on a machine
func (r *MaasRepository) PowerOnMachine(ctx context.Context, systemID string) (*models.Machine, error) {
	// Call MAAS client
	machine, err := r.client.PowerOnMachine(systemID)
	if err != nil {
		r.logger.WithError(err).WithField("id", systemID).Error("Failed to power on machine")
		return nil, err
	}

	// Convert to internal model
	result := &models.Machine{
		SystemID:     machine.SystemID,
		Hostname:     machine.Hostname,
		FQDN:         machine.FQDN,
		Status:       fmt.Sprint(machine.Status),
		StatusName:   mapMAASStatus(int(machine.Status)),
		Architecture: machine.Architecture,
		PowerState:   machine.PowerState,
		Zone:         machine.Zone.Name,
		Pool:         machine.Pool.Name,
		Tags:         machine.TagNames,
		CPUCount:     machine.CPUCount,
		Memory:       machine.Memory,
		OSSystem:     machine.OSystem,
		DistroSeries: machine.DistroSeries,
	}

	return result, nil
}

// PowerOffMachine powers off a machine
func (r *MaasRepository) PowerOffMachine(ctx context.Context, systemID string) (*models.Machine, error) {
	// Call MAAS client
	machine, err := r.client.PowerOffMachine(systemID)
	if err != nil {
		r.logger.WithError(err).WithField("id", systemID).Error("Failed to power off machine")
		return nil, err
	}

	// Convert to internal model
	result := &models.Machine{
		SystemID:     machine.SystemID,
		Hostname:     machine.Hostname,
		FQDN:         machine.FQDN,
		Status:       fmt.Sprint(machine.Status),
		StatusName:   mapMAASStatus(int(machine.Status)),
		Architecture: machine.Architecture,
		PowerState:   machine.PowerState,
		Zone:         machine.Zone.Name,
		Pool:         machine.Pool.Name,
		Tags:         machine.TagNames,
		CPUCount:     machine.CPUCount,
		Memory:       machine.Memory,
		OSSystem:     machine.OSystem,
		DistroSeries: machine.DistroSeries,
	}

	return result, nil
}

// Helper function to map MAAS status codes to human-readable status names
func mapMAASStatus(maasStatusCode int) string {
	// Based on potential MAAS status codes/enums
	switch maasStatusCode {
	case 0:
		return "New"
	case 1:
		return "Commissioning"
	case 2:
		return "Failed Commissioning"
	case 3:
		return "Missing/Lost"
	case 4:
		return "Ready"
	case 5:
		return "Reserved"
	case 6:
		return "Allocated"
	case 7:
		return "Deploying"
	case 8:
		return "Deployed"
	case 9:
		return "Retiring"
	case 10:
		return "Failed Deployment"
	case 11:
		return "Releasing"
	case 12:
		return "Failed Releasing"
	case 13:
		return "Disk Erasing"
	case 14:
		return "Failed Disk Erasing"
	default:
		return "Unknown"
	}
}
