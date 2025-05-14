package models

import (
	"fmt"
	"time"
)

// MaasMachineToMCPContext converts a MAAS Machine to an MCP MachineContext
func MaasMachineToMCPContext(machine *Machine) *MachineContext {
	ctx := &MachineContext{
		ID:           machine.SystemID,
		Name:         machine.Hostname,
		FQDN:         machine.FQDN, // Added FQDN
		Status:       machine.Status,
		Architecture: machine.Architecture,
		PowerState:   machine.PowerState,
		Zone:         machine.Zone,
		Pool:         machine.Pool,
		Tags:         machine.Tags, // Assuming machine.Tags is []string
		CPUCount:     machine.CPUCount,
		Memory:       machine.Memory,
		LastUpdated:  time.Now(), // Placeholder, consider using actual update time if available
		Metadata:     machine.Metadata,
	}

	// Convert OS info
	ctx.OSInfo = OSInfo{
		System:       machine.OSSystem,
		Distribution: machine.OSSystem, // Or machine.DistroSeries if more appropriate
		Release:      machine.DistroSeries,
	}

	// Convert network interfaces
	ctx.NetworkInterfaces = make([]NetworkContext, 0, len(machine.Interfaces)) // Changed to NetworkInterfaces
	for _, iface := range machine.Interfaces {
		netCtx := MaasNetworkInterfaceToMCPContext(&iface)
		if netCtx != nil {
			ctx.NetworkInterfaces = append(ctx.NetworkInterfaces, *netCtx) // Changed to NetworkInterfaces
		}
	}

	// Convert block devices
	ctx.BlockDevices = make([]StorageContext, 0, len(machine.BlockDevices)) // Changed to BlockDevices
	for _, device := range machine.BlockDevices {
		storageCtx := MaasBlockDeviceToMCPContext(&device)
		if storageCtx != nil {
			ctx.BlockDevices = append(ctx.BlockDevices, *storageCtx) // Changed to BlockDevices
		}
	}

	return ctx
}

// MaasNetworkInterfaceToMCPContext converts a MAAS NetworkInterface to an MCP NetworkContext
func MaasNetworkInterfaceToMCPContext(iface *NetworkInterface) *NetworkContext {
	ctx := &NetworkContext{
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
func MaasBlockDeviceToMCPContext(device *BlockDevice) *StorageContext {
	ctx := &StorageContext{
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
		ctx.Filesystem = &FilesystemContext{
			Type:         device.Filesystem.FSType,
			UUID:         device.Filesystem.UUID,
			MountPoint:   device.Filesystem.MountPoint,
			MountOptions: device.Filesystem.MountOptions,
		}

		// Add mountpoint if available
		if device.Filesystem.MountPoint != "" {
			ctx.Mountpoints = []MountpointContext{
				{
					Path:    device.Filesystem.MountPoint,
					Options: device.Filesystem.MountOptions,
					Device:  device.Path,
				},
			}
		}
	}

	// Convert partitions
	ctx.Partitions = make([]PartitionContext, 0, len(device.Partitions))
	for i, part := range device.Partitions {
		partCtx := PartitionContext{
			ID:     idToString(part.ID),
			Number: i + 1,
			Size:   part.Size,
			Path:   part.Path,
		}

		// Convert filesystem if available
		if part.Filesystem != nil {
			partCtx.Filesystem = &FilesystemContext{
				Type:         part.Filesystem.FSType,
				UUID:         part.Filesystem.UUID,
				MountPoint:   part.Filesystem.MountPoint,
				MountOptions: part.Filesystem.MountOptions,
			}

			// Add mountpoint if available
			if part.Filesystem.MountPoint != "" {
				mountpoint := MountpointContext{
					Path:    part.Filesystem.MountPoint,
					Options: part.Filesystem.MountOptions,
					Device:  part.Path,
				}
				ctx.Mountpoints = append(ctx.Mountpoints, mountpoint)
			}
		}

		ctx.Partitions = append(ctx.Partitions, partCtx)
	}

	return ctx
}

// MaasTagToMCPContext converts a MAAS Tag to an MCP TagContext
func MaasTagToMCPContext(tag *Tag) *TagContext {
	return &TagContext{
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

// MCPContextToMaasMachine converts an MCP MachineContext to a MAAS Machine
// This is a simplified implementation for demonstration purposes
func MCPContextToMaasMachine(ctx *MachineContext) *Machine {
	machine := &Machine{
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
	machine.Interfaces = make([]NetworkInterface, 0, len(ctx.NetworkInterfaces)) // Changed to NetworkInterfaces
	for _, netCtx := range ctx.NetworkInterfaces {                               // Changed to NetworkInterfaces
		iface := MCPContextToMaasNetworkInterface(&netCtx)
		if iface != nil {
			machine.Interfaces = append(machine.Interfaces, *iface)
		}
	}

	// Convert storage devices
	machine.BlockDevices = make([]BlockDevice, 0, len(ctx.BlockDevices)) // Changed to BlockDevices
	for _, storageCtx := range ctx.BlockDevices {                        // Changed to BlockDevices
		device := MCPContextToMaasBlockDevice(&storageCtx)
		if device != nil {
			machine.BlockDevices = append(machine.BlockDevices, *device)
		}
	}

	return machine
}

// MCPContextToMaasNetworkInterface converts an MCP NetworkContext to a MAAS NetworkInterface
// This is a simplified implementation for demonstration purposes
func MCPContextToMaasNetworkInterface(ctx *NetworkContext) *NetworkInterface {
	iface := &NetworkInterface{
		Name:       ctx.Name,
		Type:       ctx.Type,
		Enabled:    ctx.Enabled,
		MACAddress: ctx.MACAddress,
		Tags:       ctx.Tags,
	}

	// Create VLAN if available
	if ctx.VLAN != "" {
		iface.VLAN = &VLAN{
			Name: ctx.VLAN,
			VID:  ctx.VLANTag,
			MTU:  ctx.MTU,
		}
		iface.VLANid = 0 // Would need to be set to the actual VLAN ID
	}

	// Create link if IP address is available
	if ctx.IPAddress != "" {
		link := LinkInfo{
			Mode:      "static",
			IPAddress: ctx.IPAddress,
		}

		// Create subnet if available
		if ctx.CIDR != "" {
			link.Subnet = &Subnet{
				Name: ctx.Subnet,
				CIDR: ctx.CIDR,
			}
		}

		iface.Links = []LinkInfo{link}
	}

	return iface
}

// MCPContextToMaasBlockDevice converts an MCP StorageContext to a MAAS BlockDevice
// This is a simplified implementation for demonstration purposes
func MCPContextToMaasBlockDevice(ctx *StorageContext) *BlockDevice {
	device := &BlockDevice{
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
		device.Filesystem = &Filesystem{
			FSType:       ctx.Filesystem.Type,
			UUID:         ctx.Filesystem.UUID,
			MountPoint:   ctx.Filesystem.MountPoint,
			MountOptions: ctx.Filesystem.MountOptions,
		}
	}

	// Create partitions
	device.Partitions = make([]Partition, 0, len(ctx.Partitions))
	for _, partCtx := range ctx.Partitions {
		part := Partition{
			Size: partCtx.Size,
			Path: partCtx.Path,
		}

		// Create filesystem if available
		if partCtx.Filesystem != nil {
			part.Filesystem = &Filesystem{
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
// This is a simplified implementation for demonstration purposes
func MCPContextToMaasTag(ctx *TagContext) *Tag {
	return &Tag{
		Name:        ctx.Name,
		Description: ctx.Description,
	}
}
