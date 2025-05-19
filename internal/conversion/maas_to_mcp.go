package conversion

import (
	"fmt"
	"time"

	"github.com/lspecian/maas-mcp-server/internal/models/types"
	"github.com/sirupsen/logrus"
)

// MaasClientWrapper is an interface for the MAAS client wrapper
type MaasClientWrapper interface {
	GetMachineInterfaces(systemID string) ([]types.NetworkInterface, error)
}

// MaasMachineToMCPContext converts a MAAS Machine to an MCP MachineContext
func MaasMachineToMCPContext(machine *types.Machine, systemID string, logger *logrus.Logger, maasClient MaasClientWrapper) *types.MachineContext {
	// Debug logging
	if logger != nil {
		logger.WithFields(logrus.Fields{
			"machine_id":     machine.SystemID,
			"hostname":       machine.Hostname,
			"ip_addresses":   machine.IPAddresses,
			"ip_count":       len(machine.IPAddresses),
			"has_metadata":   machine.Metadata != nil,
			"has_interfaces": len(machine.Interfaces) > 0,
		}).Debug("Converting machine to MCP context")
	}

	ctx := &types.MachineContext{
		ID:           machine.SystemID,
		Name:         machine.Hostname,
		FQDN:         machine.FQDN,
		Status:       machine.Status,
		Architecture: machine.Architecture,
		PowerState:   machine.PowerState,
		Zone:         machine.Zone,
		Pool:         machine.Pool,
		Tags:         machine.Tags,
		CPUCount:     machine.CPUCount,
		Memory:       machine.Memory,
		LastUpdated:  time.Now(), // Placeholder, consider using actual update time if available
		Metadata:     machine.Metadata,
	}

	// Add IP addresses to metadata for easy access
	if len(machine.IPAddresses) > 0 {
		if ctx.Metadata == nil {
			ctx.Metadata = make(map[string]string)
		}
		for i, ip := range machine.IPAddresses {
			ctx.Metadata[fmt.Sprintf("ip_address_%d", i)] = ip
		}
		// Also add the first IP address as the primary one
		if len(machine.IPAddresses) > 0 {
			ctx.Metadata["ip_address"] = machine.IPAddresses[0]
		}
	} else if logger != nil {
		logger.Debug("No IP addresses found for machine")
	}

	// Convert OS info
	ctx.OSInfo = types.OSInfo{
		System:       machine.OSSystem,
		Distribution: machine.OSSystem, // Or machine.DistroSeries if more appropriate
		Release:      machine.DistroSeries,
	}

	// Get network interfaces if client is provided
	if maasClient != nil {
		interfaces, err := maasClient.GetMachineInterfaces(systemID)
		if err != nil {
			logger.WithError(err).Warn("Failed to get machine interfaces")
		} else {
			// Convert network interfaces
			ctx.NetworkInterfaces = make([]types.NetworkContext, 0, len(interfaces))
			for _, iface := range interfaces {
				netCtx := MaasNetworkInterfaceToMCPContext(&iface)
				if netCtx != nil {
					ctx.NetworkInterfaces = append(ctx.NetworkInterfaces, *netCtx)
				}
			}
		}
	}

	// Convert block devices
	ctx.BlockDevices = make([]types.StorageContext, 0, len(machine.BlockDevices))
	for _, device := range machine.BlockDevices {
		storageCtx := MaasBlockDeviceToMCPContext(&device)
		if storageCtx != nil {
			ctx.BlockDevices = append(ctx.BlockDevices, *storageCtx)
		}
	}

	return ctx
}

func MaasNetworkInterfaceToMCPContext(iface *types.NetworkInterface) *types.NetworkContext {
	ctx := &types.NetworkContext{
		ID:         idToString(iface.ID),
		Name:       iface.Name,
		Type:       iface.Type,
		MACAddress: iface.MACAddress,
		Enabled:    iface.Enabled,
		Tags:       iface.Tags,
	}

	// Set VLAN info if available
	if iface.VLAN != nil {
		ctx.VLAN = iface.VLAN.Name
		ctx.VLANTag = iface.VLAN.VID
		ctx.MTU = iface.VLAN.MTU
	}

	// Set IP address and subnet info from the first link
	if len(iface.Links) > 0 {
		link := iface.Links[0]
		ctx.IPAddress = link.IPAddress
		if link.Subnet != nil {
			ctx.CIDR = link.Subnet.CIDR
			ctx.Subnet = link.Subnet.Name
		}
		// Set primary flag for the first link with a static IP
		if link.Mode == "static" && link.IPAddress != "" {
			ctx.Primary = true
		}
	}

	return ctx
}

// MaasBlockDeviceToMCPContext converts a MAAS BlockDevice to an MCP StorageContext
func MaasBlockDeviceToMCPContext(device *types.BlockDevice) *types.StorageContext {
	ctx := &types.StorageContext{
		ID:            idToString(device.ID),
		Name:          device.Name,
		Type:          device.Type,
		Path:          device.Path,
		Size:          device.Size,
		UsedSize:      device.UsedSize,
		AvailableSize: device.AvailableSize,
		Model:         device.Model,
		Serial:        device.Serial,
		Tags:          device.Tags,
	}

	// Convert filesystem if available
	if device.Filesystem != nil {
		ctx.Filesystem = &types.FilesystemContext{
			Type:         device.Filesystem.FSType,
			UUID:         device.Filesystem.UUID,
			MountPoint:   device.Filesystem.MountPoint,
			MountOptions: device.Filesystem.MountOptions,
		}
	}

	// Create partitions
	ctx.Partitions = make([]types.PartitionContext, 0, len(device.Partitions))
	for i, part := range device.Partitions {
		partCtx := types.PartitionContext{
			ID:     idToString(part.ID),
			Number: i + 1,
			Size:   part.Size,
			Path:   part.Path,
		}

		// Convert filesystem if available
		if part.Filesystem != nil {
			partCtx.Filesystem = &types.FilesystemContext{
				Type:         part.Filesystem.FSType,
				UUID:         part.Filesystem.UUID,
				MountPoint:   part.Filesystem.MountPoint,
				MountOptions: part.Filesystem.MountOptions,
			}
		}

		ctx.Partitions = append(ctx.Partitions, partCtx)
	}

	return ctx
}

// MaasTagToMCPContext converts a MAAS Tag to an MCP TagContext
func MaasTagToMCPContext(tag *types.Tag) *types.TagContext {
	return &types.TagContext{
		Name:        tag.Name,
		Description: tag.Description,
		// Default values for fields not available in MAAS
		Color:    "#808080", // Default gray
		Category: "general",
	}
}

// Helper function to convert int ID to string
func idToString(id int) string {
	return fmt.Sprintf("%d", id)
}
