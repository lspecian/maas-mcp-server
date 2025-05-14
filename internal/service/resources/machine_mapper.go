package resources

import (
	"fmt"
	"time"

	"github.com/lspecian/maas-mcp-server/internal/errors"
	"github.com/lspecian/maas-mcp-server/internal/logging"
	"github.com/lspecian/maas-mcp-server/internal/models"
	maasmodels "github.com/lspecian/maas-mcp-server/internal/models/maas"
)

// MachineResourceMapper handles mapping between MAAS Machine and MCP MachineContext
type MachineResourceMapper struct {
	BaseResourceMapper
}

// NewMachineResourceMapper creates a new machine resource mapper
func NewMachineResourceMapper(logger *logging.Logger) *MachineResourceMapper {
	return &MachineResourceMapper{
		BaseResourceMapper: BaseResourceMapper{
			Name:   "machine",
			Logger: logger,
		},
	}
}

// MapToMCP maps a MAAS Machine to an MCP MachineContext
func (m *MachineResourceMapper) MapToMCP(maasResource interface{}) (interface{}, error) {
	machine, ok := maasResource.(*maasmodels.Machine)
	if !ok {
		return nil, errors.NewValidationError(
			fmt.Sprintf("Expected *maasmodels.Machine, got %T", maasResource),
			nil,
		)
	}

	// Validate the machine
	if err := machine.Validate(); err != nil {
		return nil, errors.NewValidationError(
			fmt.Sprintf("Invalid MAAS Machine: %s", err.Error()),
			err,
		)
	}

	ctx := &models.MachineContext{
		ID:           machine.SystemID,
		Name:         machine.Hostname,
		FQDN:         machine.FQDN, // Added FQDN
		Status:       machine.Status,
		Architecture: machine.Architecture,
		PowerState:   machine.PowerState,
		Zone:         machine.Zone,
		Pool:         machine.Pool,
		Tags:         machine.Tags,
		CPUCount:     machine.CPUCount,
		Memory:       machine.Memory,
		LastUpdated:  time.Now(),
		Metadata:     machine.Metadata,
	}

	// Convert OS info
	ctx.OSInfo = models.OSInfo{
		System:       machine.OSSystem,
		Distribution: machine.OSSystem,
		Release:      machine.DistroSeries,
	}

	// Convert network interfaces
	ctx.NetworkInterfaces = make([]models.NetworkContext, 0, len(machine.Interfaces)) // Changed to NetworkInterfaces
	for _, iface := range machine.Interfaces {
		netMapper := NewNetworkResourceMapper(m.Logger)
		netCtx, err := netMapper.MapToMCP(&iface)
		if err != nil {
			m.Logger.WithError(err).Warn("Failed to map network interface")
			continue
		}
		ctx.NetworkInterfaces = append(ctx.NetworkInterfaces, *netCtx.(*models.NetworkContext)) // Changed to NetworkInterfaces
	}

	// Convert block devices
	ctx.BlockDevices = make([]models.StorageContext, 0, len(machine.BlockDevices)) // Changed to BlockDevices
	for _, device := range machine.BlockDevices {
		storageMapper := NewStorageResourceMapper(m.Logger)
		storageCtx, err := storageMapper.MapToMCP(&device)
		if err != nil {
			m.Logger.WithError(err).Warn("Failed to map block device")
			continue
		}
		ctx.BlockDevices = append(ctx.BlockDevices, *storageCtx.(*models.StorageContext)) // Changed to BlockDevices
	}

	return ctx, nil
}

// MapToMaas maps an MCP MachineContext to a MAAS Machine
func (m *MachineResourceMapper) MapToMaas(mcpResource interface{}) (interface{}, error) {
	ctx, ok := mcpResource.(*models.MachineContext)
	if !ok {
		return nil, errors.NewValidationError(
			fmt.Sprintf("Expected *models.MachineContext, got %T", mcpResource),
			nil,
		)
	}

	// Validate the machine context
	if err := ctx.Validate(); err != nil {
		return nil, errors.NewValidationError(
			fmt.Sprintf("Invalid MCP MachineContext: %s", err.Error()),
			err,
		)
	}

	machine := &maasmodels.Machine{
		SystemID:     ctx.ID,
		Hostname:     ctx.Name,
		FQDN:         ctx.FQDN, // Added FQDN
		Status:       ctx.Status,
		Architecture: ctx.Architecture,
		PowerState:   ctx.PowerState,
		Zone:         ctx.Zone,
		Pool:         ctx.Pool,
		Tags:         ctx.Tags,
		CPUCount:     ctx.CPUCount,
		Memory:       ctx.Memory,
		OSSystem:     ctx.OSInfo.System,
		DistroSeries: ctx.OSInfo.Release,
		Metadata:     ctx.Metadata,
	}

	// Convert network interfaces
	machine.Interfaces = make([]maasmodels.NetworkInterface, 0, len(ctx.NetworkInterfaces)) // Changed to NetworkInterfaces
	for _, netCtx := range ctx.NetworkInterfaces {                                          // Changed to NetworkInterfaces
		netMapper := NewNetworkResourceMapper(m.Logger)
		iface, err := netMapper.MapToMaas(&netCtx)
		if err != nil {
			m.Logger.WithError(err).Warn("Failed to map network context")
			continue
		}
		machine.Interfaces = append(machine.Interfaces, *iface.(*maasmodels.NetworkInterface))
	}

	// Convert storage devices
	machine.BlockDevices = make([]maasmodels.BlockDevice, 0, len(ctx.BlockDevices)) // Changed to BlockDevices
	for _, storageCtx := range ctx.BlockDevices {                                   // Changed to BlockDevices
		storageMapper := NewStorageResourceMapper(m.Logger)
		device, err := storageMapper.MapToMaas(&storageCtx)
		if err != nil {
			m.Logger.WithError(err).Warn("Failed to map storage context")
			continue
		}
		machine.BlockDevices = append(machine.BlockDevices, *device.(*maasmodels.BlockDevice))
	}

	return machine, nil
}
