package resources

import (
	"testing"

	"github.com/lspecian/maas-mcp-server/internal/models"
	maasmodels "github.com/lspecian/maas-mcp-server/internal/models/maas"
	"github.com/stretchr/testify/assert"
)

func TestMachineResourceMapper(t *testing.T) {
	logger := NewMockLogger()
	mapper := NewMachineResourceMapper(logger)

	// Test MapToMCP
	t.Run("MapToMCP with valid machine", func(t *testing.T) {
		machine := &maasmodels.Machine{
			SystemID:     "abc123",
			Hostname:     "test-machine",
			Status:       "Ready",
			Architecture: "amd64",
			PowerState:   "on",
			Zone:         "default",
			Pool:         "default",
			Tags:         []string{"test", "dev"},
			CPUCount:     4,
			Memory:       8192,
			OSSystem:     "ubuntu",
			DistroSeries: "focal",
		}

		result, err := mapper.MapToMCP(machine)
		assert.NoError(t, err)
		assert.NotNil(t, result)

		mcpMachine, ok := result.(*models.MachineContext)
		assert.True(t, ok)
		assert.Equal(t, machine.SystemID, mcpMachine.ID)
		assert.Equal(t, machine.Hostname, mcpMachine.Name)
		assert.Equal(t, machine.Status, mcpMachine.Status)
		assert.Equal(t, machine.Architecture, mcpMachine.Architecture)
		assert.Equal(t, machine.PowerState, mcpMachine.PowerState)
		assert.Equal(t, machine.Zone, mcpMachine.Zone)
		assert.Equal(t, machine.Pool, mcpMachine.Pool)
		assert.Equal(t, machine.Tags, mcpMachine.Tags)
		assert.Equal(t, machine.CPUCount, mcpMachine.CPUCount)
		assert.Equal(t, machine.Memory, mcpMachine.Memory)
		assert.Equal(t, machine.OSSystem, mcpMachine.OSInfo.System)
		assert.Equal(t, machine.DistroSeries, mcpMachine.OSInfo.Release)
	})

	t.Run("MapToMCP with invalid machine", func(t *testing.T) {
		machine := &maasmodels.Machine{
			// Missing required fields
		}

		result, err := mapper.MapToMCP(machine)
		assert.Error(t, err)
		assert.Nil(t, result)
	})

	t.Run("MapToMCP with wrong type", func(t *testing.T) {
		result, err := mapper.MapToMCP("not a machine")
		assert.Error(t, err)
		assert.Nil(t, result)
	})

	// Test MapToMaas
	t.Run("MapToMaas with valid machine context", func(t *testing.T) {
		mcpMachine := &models.MachineContext{
			ID:           "abc123",
			Name:         "test-machine",
			Status:       "Ready",
			Architecture: "amd64",
			PowerState:   "on",
			Zone:         "default",
			Pool:         "default",
			Tags:         []string{"test", "dev"},
			CPUCount:     4,
			Memory:       8192,
			OSInfo: models.OSInfo{
				System:       "ubuntu",
				Distribution: "ubuntu",
				Release:      "focal",
			},
		}

		result, err := mapper.MapToMaas(mcpMachine)
		assert.NoError(t, err)
		assert.NotNil(t, result)

		machine, ok := result.(*maasmodels.Machine)
		assert.True(t, ok)
		assert.Equal(t, mcpMachine.ID, machine.SystemID)
		assert.Equal(t, mcpMachine.Name, machine.Hostname)
		assert.Equal(t, mcpMachine.Status, machine.Status)
		assert.Equal(t, mcpMachine.Architecture, machine.Architecture)
		assert.Equal(t, mcpMachine.PowerState, machine.PowerState)
		assert.Equal(t, mcpMachine.Zone, machine.Zone)
		assert.Equal(t, mcpMachine.Pool, machine.Pool)
		assert.Equal(t, mcpMachine.Tags, machine.Tags)
		assert.Equal(t, mcpMachine.CPUCount, machine.CPUCount)
		assert.Equal(t, mcpMachine.Memory, machine.Memory)
		assert.Equal(t, mcpMachine.OSInfo.System, machine.OSSystem)
		assert.Equal(t, mcpMachine.OSInfo.Release, machine.DistroSeries)
	})

	t.Run("MapToMaas with invalid machine context", func(t *testing.T) {
		mcpMachine := &models.MachineContext{
			// Missing required fields
		}

		result, err := mapper.MapToMaas(mcpMachine)
		assert.Error(t, err)
		assert.Nil(t, result)
	})

	t.Run("MapToMaas with wrong type", func(t *testing.T) {
		result, err := mapper.MapToMaas("not a machine context")
		assert.Error(t, err)
		assert.Nil(t, result)
	})
}

func TestNetworkResourceMapper(t *testing.T) {
	logger := NewMockLogger()
	mapper := NewNetworkResourceMapper(logger)

	// Test MapToMCP
	t.Run("MapToMCP with valid network interface", func(t *testing.T) {
		iface := &maasmodels.NetworkInterface{
			ID:         1,
			Name:       "eth0",
			Type:       "physical",
			MACAddress: "00:11:22:33:44:55",
			Enabled:    true,
			Tags:       []string{"test", "dev"},
			VLAN: &maasmodels.VLAN{
				Name: "default",
				VID:  1,
				MTU:  1500,
			},
			Links: []maasmodels.LinkInfo{
				{
					Mode:      "static",
					IPAddress: "192.168.1.100",
					Subnet: &maasmodels.Subnet{
						Name: "default",
						CIDR: "192.168.1.0/24",
					},
				},
			},
		}

		result, err := mapper.MapToMCP(iface)
		assert.NoError(t, err)
		assert.NotNil(t, result)

		mcpNetwork, ok := result.(*models.NetworkContext)
		assert.True(t, ok)
		assert.Equal(t, "1", mcpNetwork.ID)
		assert.Equal(t, iface.Name, mcpNetwork.Name)
		assert.Equal(t, iface.Type, mcpNetwork.Type)
		assert.Equal(t, iface.MACAddress, mcpNetwork.MACAddress)
		assert.Equal(t, iface.Enabled, mcpNetwork.Enabled)
		assert.Equal(t, iface.Tags, mcpNetwork.Tags)
		assert.Equal(t, iface.VLAN.Name, mcpNetwork.VLAN)
		assert.Equal(t, iface.VLAN.VID, mcpNetwork.VLANTag)
		assert.Equal(t, iface.VLAN.MTU, mcpNetwork.MTU)
		assert.Equal(t, iface.Links[0].IPAddress, mcpNetwork.IPAddress)
		assert.Equal(t, iface.Links[0].Subnet.CIDR, mcpNetwork.CIDR)
		assert.Equal(t, iface.Links[0].Subnet.Name, mcpNetwork.Subnet)
		assert.True(t, mcpNetwork.Primary)
	})

	// Test MapToMaas
	t.Run("MapToMaas with valid network context", func(t *testing.T) {
		mcpNetwork := &models.NetworkContext{
			ID:         "1",
			Name:       "eth0",
			Type:       "physical",
			MACAddress: "00:11:22:33:44:55",
			IPAddress:  "192.168.1.100",
			CIDR:       "192.168.1.0/24",
			Subnet:     "default",
			VLAN:       "default",
			VLANTag:    1,
			MTU:        1500,
			Enabled:    true,
			Primary:    true,
			Tags:       []string{"test", "dev"},
		}

		result, err := mapper.MapToMaas(mcpNetwork)
		assert.NoError(t, err)
		assert.NotNil(t, result)

		iface, ok := result.(*maasmodels.NetworkInterface)
		assert.True(t, ok)
		assert.Equal(t, 1, iface.ID)
		assert.Equal(t, mcpNetwork.Name, iface.Name)
		assert.Equal(t, mcpNetwork.Type, iface.Type)
		assert.Equal(t, mcpNetwork.MACAddress, iface.MACAddress)
		assert.Equal(t, mcpNetwork.Enabled, iface.Enabled)
		assert.Equal(t, mcpNetwork.Tags, iface.Tags)
		assert.NotNil(t, iface.VLAN)
		assert.Equal(t, mcpNetwork.VLAN, iface.VLAN.Name)
		assert.Equal(t, mcpNetwork.VLANTag, iface.VLAN.VID)
		assert.Equal(t, mcpNetwork.MTU, iface.VLAN.MTU)
		assert.Len(t, iface.Links, 1)
		assert.Equal(t, mcpNetwork.IPAddress, iface.Links[0].IPAddress)
		assert.NotNil(t, iface.Links[0].Subnet)
		assert.Equal(t, mcpNetwork.CIDR, iface.Links[0].Subnet.CIDR)
		assert.Equal(t, mcpNetwork.Subnet, iface.Links[0].Subnet.Name)
	})
}

func TestTagResourceMapper(t *testing.T) {
	logger := NewMockLogger()
	mapper := NewTagResourceMapper(logger)

	// Test MapToMCP
	t.Run("MapToMCP with valid tag", func(t *testing.T) {
		tag := &maasmodels.Tag{
			Name:        "test-tag",
			Description: "Test tag description",
			Comment:     "test",
		}

		result, err := mapper.MapToMCP(tag)
		assert.NoError(t, err)
		assert.NotNil(t, result)

		mcpTag, ok := result.(*models.TagContext)
		assert.True(t, ok)
		assert.Equal(t, tag.Name, mcpTag.Name)
		assert.Equal(t, tag.Description, mcpTag.Description)
		assert.Equal(t, tag.Comment, mcpTag.Category)
		assert.Equal(t, "#808080", mcpTag.Color) // Default color
	})

	// Test MapToMaas
	t.Run("MapToMaas with valid tag context", func(t *testing.T) {
		mcpTag := &models.TagContext{
			Name:        "test-tag",
			Description: "Test tag description",
			Color:       "#ff0000",
			Category:    "test",
		}

		result, err := mapper.MapToMaas(mcpTag)
		assert.NoError(t, err)
		assert.NotNil(t, result)

		tag, ok := result.(*maasmodels.Tag)
		assert.True(t, ok)
		assert.Equal(t, mcpTag.Name, tag.Name)
		assert.Equal(t, mcpTag.Description, tag.Description)
		assert.Equal(t, mcpTag.Category, tag.Comment)
	})
}

func TestMapperRegistry(t *testing.T) {
	logger := NewMockLogger()
	registry := NewMapperRegistry(logger)

	// Register mappers
	machineMapper := NewMachineResourceMapper(logger)
	err := registry.RegisterMapper(machineMapper)
	assert.NoError(t, err)

	networkMapper := NewNetworkResourceMapper(logger)
	err = registry.RegisterMapper(networkMapper)
	assert.NoError(t, err)

	storageMapper := NewStorageResourceMapper(logger)
	err = registry.RegisterMapper(storageMapper)
	assert.NoError(t, err)

	tagMapper := NewTagResourceMapper(logger)
	err = registry.RegisterMapper(tagMapper)
	assert.NoError(t, err)

	// Test GetMapper
	t.Run("GetMapper with valid name", func(t *testing.T) {
		mapper, err := registry.GetMapper("machine")
		assert.NoError(t, err)
		assert.NotNil(t, mapper)
		assert.Equal(t, "machine", mapper.GetName())
	})

	t.Run("GetMapper with invalid name", func(t *testing.T) {
		mapper, err := registry.GetMapper("invalid")
		assert.Error(t, err)
		assert.Nil(t, mapper)
	})

	// Test MapToMCP
	t.Run("MapToMCP with valid resource", func(t *testing.T) {
		machine := &maasmodels.Machine{
			SystemID:     "abc123",
			Hostname:     "test-machine",
			Status:       "Ready",
			Architecture: "amd64",
			PowerState:   "on",
			Zone:         "default",
			Pool:         "default",
		}

		result, err := registry.MapToMCP("machine", machine)
		assert.NoError(t, err)
		assert.NotNil(t, result)

		mcpMachine, ok := result.(*models.MachineContext)
		assert.True(t, ok)
		assert.Equal(t, machine.SystemID, mcpMachine.ID)
	})

	// Test MapToMaas
	t.Run("MapToMaas with valid resource", func(t *testing.T) {
		mcpMachine := &models.MachineContext{
			ID:           "abc123",
			Name:         "test-machine",
			Status:       "Ready",
			Architecture: "amd64",
			PowerState:   "on",
			Zone:         "default",
			Pool:         "default",
		}

		result, err := registry.MapToMaas("machine", mcpMachine)
		assert.NoError(t, err)
		assert.NotNil(t, result)

		machine, ok := result.(*maasmodels.Machine)
		assert.True(t, ok)
		assert.Equal(t, mcpMachine.ID, machine.SystemID)
	})
}

func TestMapperService(t *testing.T) {
	logger := NewMockLogger()
	service := NewMapperService(logger)

	// Test MapMachineToMCP
	t.Run("MapMachineToMCP with valid machine", func(t *testing.T) {
		machine := &maasmodels.Machine{
			SystemID:     "abc123",
			Hostname:     "test-machine",
			Status:       "Ready",
			Architecture: "amd64",
			PowerState:   "on",
			Zone:         "default",
			Pool:         "default",
		}

		result, err := service.MapMachineToMCP(nil, machine)
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, machine.SystemID, result.ID)
	})

	// Test MapMachinesToMCP
	t.Run("MapMachinesToMCP with valid machines", func(t *testing.T) {
		machines := []maasmodels.Machine{
			{
				SystemID:     "abc123",
				Hostname:     "test-machine-1",
				Status:       "Ready",
				Architecture: "amd64",
				PowerState:   "on",
				Zone:         "default",
				Pool:         "default",
			},
			{
				SystemID:     "def456",
				Hostname:     "test-machine-2",
				Status:       "Ready",
				Architecture: "amd64",
				PowerState:   "on",
				Zone:         "default",
				Pool:         "default",
			},
		}

		results, err := service.MapMachinesToMCP(nil, machines)
		assert.NoError(t, err)
		assert.Len(t, results, 2)
		assert.Equal(t, machines[0].SystemID, results[0].ID)
		assert.Equal(t, machines[1].SystemID, results[1].ID)
	})

	// Test MapMachineToMaas
	t.Run("MapMachineToMaas with valid machine context", func(t *testing.T) {
		mcpMachine := &models.MachineContext{
			ID:           "abc123",
			Name:         "test-machine",
			Status:       "Ready",
			Architecture: "amd64",
			PowerState:   "on",
			Zone:         "default",
			Pool:         "default",
		}

		result, err := service.MapMachineToMaas(nil, mcpMachine)
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, mcpMachine.ID, result.SystemID)
	})
}
