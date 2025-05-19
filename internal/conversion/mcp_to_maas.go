package conversion

import (
	"github.com/lspecian/maas-mcp-server/internal/models/types"
)

// MCPContextToMaasMachine converts an MCP MachineContext to a MAAS Machine
func MCPContextToMaasMachine(ctx *types.MachineContext) *types.Machine {
	machine := &types.Machine{
		SystemID:     ctx.ID,
		Hostname:     ctx.Name,
		FQDN:         ctx.FQDN,
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
	machine.Interfaces = make([]types.NetworkInterface, 0, len(ctx.NetworkInterfaces))
	for _, netCtx := range ctx.NetworkInterfaces {
		iface := MCPContextToMaasNetworkInterface(&netCtx)
		if iface != nil {
			machine.Interfaces = append(machine.Interfaces, *iface)
		}
	}

	// Convert storage devices
	machine.BlockDevices = make([]types.BlockDevice, 0, len(ctx.BlockDevices))
	for _, storageCtx := range ctx.BlockDevices {
		device := MCPContextToMaasBlockDevice(&storageCtx)
		if device != nil {
			machine.BlockDevices = append(machine.BlockDevices, *device)
		}
	}

	return machine
}

// MCPContextToMaasNetworkInterface converts an MCP NetworkContext to a MAAS NetworkInterface
func MCPContextToMaasNetworkInterface(ctx *types.NetworkContext) *types.NetworkInterface {
	iface := &types.NetworkInterface{
		Name:       ctx.Name,
		Type:       ctx.Type,
		Enabled:    ctx.Enabled,
		MACAddress: ctx.MACAddress,
		Tags:       ctx.Tags,
	}

	// Create VLAN if available
	if ctx.VLAN != "" {
		iface.VLAN = &types.VLAN{
			Name: ctx.VLAN,
			VID:  ctx.VLANTag,
			MTU:  ctx.MTU,
		}
	}

	// Create link if IP address is available
	if ctx.IPAddress != "" {
		link := types.LinkInfo{
			Mode:      "static",
			IPAddress: ctx.IPAddress,
		}

		// Create subnet if available
		if ctx.CIDR != "" {
			link.Subnet = &types.Subnet{
				Name: ctx.Subnet,
				CIDR: ctx.CIDR,
			}
		}

		iface.Links = []types.LinkInfo{link}
	}

	return iface
}

// MCPContextToMaasBlockDevice converts an MCP StorageContext to a MAAS BlockDevice
func MCPContextToMaasBlockDevice(ctx *types.StorageContext) *types.BlockDevice {
	device := &types.BlockDevice{
		Name:          ctx.Name,
		Type:          ctx.Type,
		Path:          ctx.Path,
		Size:          ctx.Size,
		UsedSize:      ctx.UsedSize,
		AvailableSize: ctx.AvailableSize,
		Model:         ctx.Model,
		Serial:        ctx.Serial,
		Tags:          ctx.Tags,
	}

	// Create filesystem if available
	if ctx.Filesystem != nil {
		device.Filesystem = &types.Filesystem{
			FSType:       ctx.Filesystem.Type,
			UUID:         ctx.Filesystem.UUID,
			MountPoint:   ctx.Filesystem.MountPoint,
			MountOptions: ctx.Filesystem.MountOptions,
		}
	}

	// Create partitions
	device.Partitions = make([]types.Partition, 0, len(ctx.Partitions))
	for _, partCtx := range ctx.Partitions {
		part := types.Partition{
			Size: partCtx.Size,
			Path: partCtx.Path,
		}

		// Create filesystem if available
		if partCtx.Filesystem != nil {
			part.Filesystem = &types.Filesystem{
				FSType:       partCtx.Filesystem.Type,
				UUID:         partCtx.Filesystem.UUID,
				MountPoint:   partCtx.Filesystem.MountPoint,
				MountOptions: partCtx.Filesystem.MountOptions,
			}
		}

		device.Partitions = append(device.Partitions, part)
	}

	return device
}

// MCPContextToMaasTag converts an MCP TagContext to a MAAS Tag
func MCPContextToMaasTag(ctx *types.TagContext) *types.Tag {
	return &types.Tag{
		Name:        ctx.Name,
		Description: ctx.Description,
	}
}
