package utils

import (
	"testing"

	"github.com/lspecian/maas-mcp-server/internal/models"
	"github.com/stretchr/testify/assert"
)

// AssertMachineEqual asserts that two Machine objects are equal
func AssertMachineEqual(t *testing.T, expected, actual models.Machine) {
	assert.Equal(t, expected.SystemID, actual.SystemID, "SystemID should match")
	assert.Equal(t, expected.Hostname, actual.Hostname, "Hostname should match")
	assert.Equal(t, expected.FQDN, actual.FQDN, "FQDN should match")
	assert.Equal(t, expected.Status, actual.Status, "Status should match")
	assert.Equal(t, expected.StatusName, actual.StatusName, "StatusName should match")
	assert.Equal(t, expected.Architecture, actual.Architecture, "Architecture should match")
	assert.Equal(t, expected.PowerState, actual.PowerState, "PowerState should match")
	assert.Equal(t, expected.PowerType, actual.PowerType, "PowerType should match")
	assert.Equal(t, expected.Zone, actual.Zone, "Zone should match")
	assert.Equal(t, expected.Pool, actual.Pool, "Pool should match")
	assert.ElementsMatch(t, expected.Tags, actual.Tags, "Tags should match")
	assert.ElementsMatch(t, expected.IPAddresses, actual.IPAddresses, "IPAddresses should match")
	assert.Equal(t, expected.CPUCount, actual.CPUCount, "CPUCount should match")
	assert.Equal(t, expected.Memory, actual.Memory, "Memory should match")
	assert.Equal(t, expected.OSSystem, actual.OSSystem, "OSSystem should match")
	assert.Equal(t, expected.DistroSeries, actual.DistroSeries, "DistroSeries should match")
	assert.Equal(t, expected.ResourceURL, actual.ResourceURL, "ResourceURL should match")
	assert.Equal(t, expected.Owner, actual.Owner, "Owner should match")
	assert.Equal(t, expected.Description, actual.Description, "Description should match")
}

// AssertMachinePointerEqual asserts that two Machine pointers are equal
func AssertMachinePointerEqual(t *testing.T, expected, actual *models.Machine) {
	if expected == nil && actual == nil {
		return
	}
	assert.NotNil(t, expected, "Expected Machine should not be nil")
	assert.NotNil(t, actual, "Actual Machine should not be nil")
	if expected != nil && actual != nil {
		AssertMachineEqual(t, *expected, *actual)
	}
}

// AssertSubnetEqual asserts that two Subnet objects are equal
func AssertSubnetEqual(t *testing.T, expected, actual models.Subnet) {
	assert.Equal(t, expected.ID, actual.ID, "ID should match")
	assert.Equal(t, expected.Name, actual.Name, "Name should match")
	assert.Equal(t, expected.CIDR, actual.CIDR, "CIDR should match")
	assert.Equal(t, expected.VLANid, actual.VLANid, "VLANid should match")
	assert.Equal(t, expected.Space, actual.Space, "Space should match")
	assert.Equal(t, expected.GatewayIP, actual.GatewayIP, "GatewayIP should match")
	assert.ElementsMatch(t, expected.DNSServers, actual.DNSServers, "DNSServers should match")
	assert.Equal(t, expected.Managed, actual.Managed, "Managed should match")
	assert.Equal(t, expected.Active, actual.Active, "Active should match")
	assert.Equal(t, expected.AllowDNS, actual.AllowDNS, "AllowDNS should match")
	assert.Equal(t, expected.AllowProxy, actual.AllowProxy, "AllowProxy should match")
	assert.Equal(t, expected.ResourceURL, actual.ResourceURL, "ResourceURL should match")
	assert.Equal(t, expected.FabricID, actual.FabricID, "FabricID should match")
	assert.Equal(t, expected.FabricName, actual.FabricName, "FabricName should match")
	assert.Equal(t, expected.Description, actual.Description, "Description should match")
}

// AssertSubnetPointerEqual asserts that two Subnet pointers are equal
func AssertSubnetPointerEqual(t *testing.T, expected, actual *models.Subnet) {
	if expected == nil && actual == nil {
		return
	}
	assert.NotNil(t, expected, "Expected Subnet should not be nil")
	assert.NotNil(t, actual, "Actual Subnet should not be nil")
	if expected != nil && actual != nil {
		AssertSubnetEqual(t, *expected, *actual)
	}
}

// AssertVLANEqual asserts that two VLAN objects are equal
func AssertVLANEqual(t *testing.T, expected, actual models.VLAN) {
	assert.Equal(t, expected.ID, actual.ID, "ID should match")
	assert.Equal(t, expected.Name, actual.Name, "Name should match")
	assert.Equal(t, expected.VID, actual.VID, "VID should match")
	assert.Equal(t, expected.MTU, actual.MTU, "MTU should match")
	assert.Equal(t, expected.FabricID, actual.FabricID, "FabricID should match")
	assert.Equal(t, expected.FabricName, actual.FabricName, "FabricName should match")
	assert.Equal(t, expected.DHCPOn, actual.DHCPOn, "DHCPOn should match")
	assert.Equal(t, expected.Primary, actual.Primary, "Primary should match")
	assert.Equal(t, expected.ResourceURL, actual.ResourceURL, "ResourceURL should match")
	assert.Equal(t, expected.Description, actual.Description, "Description should match")
}

// AssertVLANPointerEqual asserts that two VLAN pointers are equal
func AssertVLANPointerEqual(t *testing.T, expected, actual *models.VLAN) {
	if expected == nil && actual == nil {
		return
	}
	assert.NotNil(t, expected, "Expected VLAN should not be nil")
	assert.NotNil(t, actual, "Actual VLAN should not be nil")
	if expected != nil && actual != nil {
		AssertVLANEqual(t, *expected, *actual)
	}
}

// AssertTagEqual asserts that two Tag objects are equal
func AssertTagEqual(t *testing.T, expected, actual models.Tag) {
	assert.Equal(t, expected.Name, actual.Name, "Name should match")
	assert.Equal(t, expected.Description, actual.Description, "Description should match")
	assert.Equal(t, expected.Definition, actual.Definition, "Definition should match")
	assert.Equal(t, expected.Comment, actual.Comment, "Comment should match")
	assert.Equal(t, expected.ResourceURL, actual.ResourceURL, "ResourceURL should match")
}

// AssertTagPointerEqual asserts that two Tag pointers are equal
func AssertTagPointerEqual(t *testing.T, expected, actual *models.Tag) {
	if expected == nil && actual == nil {
		return
	}
	assert.NotNil(t, expected, "Expected Tag should not be nil")
	assert.NotNil(t, actual, "Actual Tag should not be nil")
	if expected != nil && actual != nil {
		AssertTagEqual(t, *expected, *actual)
	}
}

// AssertBlockDeviceEqual asserts that two BlockDevice objects are equal
func AssertBlockDeviceEqual(t *testing.T, expected, actual models.BlockDevice) {
	assert.Equal(t, expected.ID, actual.ID, "ID should match")
	assert.Equal(t, expected.Name, actual.Name, "Name should match")
	assert.Equal(t, expected.Type, actual.Type, "Type should match")
	assert.Equal(t, expected.Path, actual.Path, "Path should match")
	assert.Equal(t, expected.Size, actual.Size, "Size should match")
	assert.Equal(t, expected.UsedSize, actual.UsedSize, "UsedSize should match")
	assert.Equal(t, expected.AvailableSize, actual.AvailableSize, "AvailableSize should match")
	assert.Equal(t, expected.Model, actual.Model, "Model should match")
	assert.Equal(t, expected.Serial, actual.Serial, "Serial should match")
	assert.Equal(t, expected.IDPath, actual.IDPath, "IDPath should match")
	assert.ElementsMatch(t, expected.Tags, actual.Tags, "Tags should match")
	assert.Equal(t, expected.ResourceURL, actual.ResourceURL, "ResourceURL should match")
}

// AssertBlockDevicePointerEqual asserts that two BlockDevice pointers are equal
func AssertBlockDevicePointerEqual(t *testing.T, expected, actual *models.BlockDevice) {
	if expected == nil && actual == nil {
		return
	}
	assert.NotNil(t, expected, "Expected BlockDevice should not be nil")
	assert.NotNil(t, actual, "Actual BlockDevice should not be nil")
	if expected != nil && actual != nil {
		AssertBlockDeviceEqual(t, *expected, *actual)
	}
}

// AssertNetworkInterfaceEqual asserts that two NetworkInterface objects are equal
func AssertNetworkInterfaceEqual(t *testing.T, expected, actual models.NetworkInterface) {
	assert.Equal(t, expected.ID, actual.ID, "ID should match")
	assert.Equal(t, expected.Name, actual.Name, "Name should match")
	assert.Equal(t, expected.Type, actual.Type, "Type should match")
	assert.Equal(t, expected.Enabled, actual.Enabled, "Enabled should match")
	assert.Equal(t, expected.MACAddress, actual.MACAddress, "MACAddress should match")
	assert.Equal(t, expected.VLANid, actual.VLANid, "VLANid should match")
	assert.ElementsMatch(t, expected.Tags, actual.Tags, "Tags should match")
	assert.ElementsMatch(t, expected.Parents, actual.Parents, "Parents should match")
	assert.ElementsMatch(t, expected.Children, actual.Children, "Children should match")
	assert.Equal(t, expected.ResourceURL, actual.ResourceURL, "ResourceURL should match")
}

// AssertNetworkInterfacePointerEqual asserts that two NetworkInterface pointers are equal
func AssertNetworkInterfacePointerEqual(t *testing.T, expected, actual *models.NetworkInterface) {
	if expected == nil && actual == nil {
		return
	}
	assert.NotNil(t, expected, "Expected NetworkInterface should not be nil")
	assert.NotNil(t, actual, "Actual NetworkInterface should not be nil")
	if expected != nil && actual != nil {
		AssertNetworkInterfaceEqual(t, *expected, *actual)
	}
}
