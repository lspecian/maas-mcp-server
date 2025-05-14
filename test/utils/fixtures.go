package utils

import (
	"fmt"

	"github.com/lspecian/maas-mcp-server/internal/models"
)

// CreateTestMachine creates a test machine with the given parameters
func CreateTestMachine(systemID, hostname, status string) models.Machine {
	return models.Machine{
		SystemID:     systemID,
		Hostname:     hostname,
		FQDN:         hostname + ".example.com",
		Status:       status,
		StatusName:   status,
		Architecture: "amd64/generic",
		PowerState:   "off",
		PowerType:    "ipmi",
		Zone:         "default",
		Pool:         "default",
		Tags:         []string{"test"},
		IPAddresses:  []string{"192.168.1.100"},
		CPUCount:     4,
		Memory:       8192,
		OSSystem:     "ubuntu",
		DistroSeries: "focal",
		ResourceURL:  "/MAAS/api/2.0/machines/" + systemID + "/",
		Owner:        "",
		Description:  "Test machine",
	}
}

// CreateTestMachineWithDetails creates a test machine with network interfaces and block devices
func CreateTestMachineWithDetails(systemID, hostname, status string) models.Machine {
	machine := CreateTestMachine(systemID, hostname, status)

	// Add network interfaces
	machine.Interfaces = []models.NetworkInterface{
		{
			ID:          1,
			Name:        "eth0",
			Type:        "physical",
			Enabled:     true,
			MACAddress:  "00:11:22:33:44:55",
			VLANid:      1,
			Tags:        []string{"test-interface"},
			ResourceURL: "/MAAS/api/2.0/nodes/" + systemID + "/interfaces/1/",
			Links: []models.LinkInfo{
				{
					ID:        1,
					Mode:      "static",
					SubnetID:  1,
					IPAddress: "192.168.1.100",
				},
			},
		},
	}

	// Add block devices
	machine.BlockDevices = []models.BlockDevice{
		{
			ID:            1,
			Name:          "sda",
			Type:          "physical",
			Path:          "/dev/sda",
			Size:          107374182400, // 100 GB
			UsedSize:      107374182400,
			AvailableSize: 0,
			Model:         "Test Disk",
			Serial:        "TEST123",
			IDPath:        "/dev/disk/by-id/test-disk",
			Tags:          []string{"test-disk"},
			ResourceURL:   "/MAAS/api/2.0/nodes/" + systemID + "/blockdevices/1/",
		},
	}

	return machine
}

// CreateTestSubnet creates a test subnet with the given parameters
func CreateTestSubnet(id int, name, cidr string) models.Subnet {
	return models.Subnet{
		ID:          id,
		Name:        name,
		CIDR:        cidr,
		VLANid:      1,
		Space:       "default",
		GatewayIP:   "192.168.1.1",
		DNSServers:  []string{"8.8.8.8", "8.8.4.4"},
		Managed:     true,
		Active:      true,
		AllowDNS:    true,
		AllowProxy:  true,
		ResourceURL: fmt.Sprintf("/MAAS/api/2.0/subnets/%d/", id),
		FabricID:    1,
		FabricName:  "fabric-1",
		Description: "Test subnet",
	}
}

// CreateTestVLAN creates a test VLAN with the given parameters
func CreateTestVLAN(id, vid int, name string) models.VLAN {
	return models.VLAN{
		ID:          id,
		Name:        name,
		VID:         vid,
		MTU:         1500,
		FabricID:    1,
		FabricName:  "fabric-1",
		DHCPOn:      true,
		Primary:     false,
		ResourceURL: fmt.Sprintf("/MAAS/api/2.0/vlans/%d/", id),
		Description: "Test VLAN",
	}
}

// CreateTestTag creates a test tag with the given parameters
func CreateTestTag(name, description string) models.Tag {
	return models.Tag{
		Name:        name,
		Description: description,
		Definition:  "",
		Comment:     description,
		ResourceURL: "/MAAS/api/2.0/tags/" + name + "/",
	}
}

// CreateTestBlockDevice creates a test block device with the given parameters
func CreateTestBlockDevice(id int, name, path string, size int64) models.BlockDevice {
	return models.BlockDevice{
		ID:            id,
		Name:          name,
		Type:          "physical",
		Path:          path,
		Size:          size,
		UsedSize:      0,
		AvailableSize: size,
		Model:         "Test Disk",
		Serial:        fmt.Sprintf("TEST%d", id),
		IDPath:        fmt.Sprintf("/dev/disk/by-id/test-disk-%d", id),
		Tags:          []string{"test-disk"},
		ResourceURL:   fmt.Sprintf("/MAAS/api/2.0/blockdevices/%d/", id),
	}
}

// CreateTestNetworkInterface creates a test network interface with the given parameters
func CreateTestNetworkInterface(id int, name, macAddress string) models.NetworkInterface {
	return models.NetworkInterface{
		ID:          id,
		Name:        name,
		Type:        "physical",
		Enabled:     true,
		MACAddress:  macAddress,
		VLANid:      1,
		Tags:        []string{"test-interface"},
		Parents:     []int{},
		Children:    []int{},
		ResourceURL: fmt.Sprintf("/MAAS/api/2.0/interfaces/%d/", id),
	}
}

// CreateTestLinkInfo creates a test link info with the given parameters
func CreateTestLinkInfo(id int, mode, ipAddress string, subnetID int) models.LinkInfo {
	return models.LinkInfo{
		ID:        id,
		Mode:      mode,
		SubnetID:  subnetID,
		IPAddress: ipAddress,
	}
}

// CreateTestPartition creates a test partition with the given parameters
func CreateTestPartition(id int, path string, size int64) models.Partition {
	return models.Partition{
		ID:          id,
		Size:        size,
		UUID:        fmt.Sprintf("test-uuid-%d", id),
		Path:        path,
		Type:        "primary",
		ResourceURL: fmt.Sprintf("/MAAS/api/2.0/partitions/%d/", id),
	}
}

// CreateTestFilesystem creates a test filesystem with the given parameters
func CreateTestFilesystem(id int, fsType, mountPoint string) models.Filesystem {
	return models.Filesystem{
		ID:           id,
		UUID:         fmt.Sprintf("test-uuid-%d", id),
		FSType:       fsType,
		MountPoint:   mountPoint,
		MountOptions: "defaults",
		ResourceURL:  fmt.Sprintf("/MAAS/api/2.0/filesystems/%d/", id),
	}
}
