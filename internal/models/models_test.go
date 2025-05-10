package models

import (
	"encoding/json"
	"testing"
	"time"
)

func TestMachineValidation(t *testing.T) {
	// Valid machine
	validMachine := &Machine{
		SystemID: "abc123",
		Hostname: "test-machine",
	}
	if err := validMachine.Validate(); err != nil {
		t.Errorf("Expected valid machine to pass validation, got error: %v", err)
	}

	// Invalid machine - missing SystemID
	invalidMachine1 := &Machine{
		Hostname: "test-machine",
	}
	if err := invalidMachine1.Validate(); err == nil {
		t.Error("Expected error for machine with missing SystemID, got nil")
	}

	// Invalid machine - missing Hostname
	invalidMachine2 := &Machine{
		SystemID: "abc123",
	}
	if err := invalidMachine2.Validate(); err == nil {
		t.Error("Expected error for machine with missing Hostname, got nil")
	}
}

func TestMachineContextValidation(t *testing.T) {
	// Valid machine context
	validContext := &MachineContext{
		ID:   "abc123",
		Name: "test-machine",
	}
	if err := validContext.Validate(); err != nil {
		t.Errorf("Expected valid machine context to pass validation, got error: %v", err)
	}

	// Invalid machine context - missing ID
	invalidContext1 := &MachineContext{
		Name: "test-machine",
	}
	if err := invalidContext1.Validate(); err == nil {
		t.Error("Expected error for machine context with missing ID, got nil")
	}

	// Invalid machine context - missing Name
	invalidContext2 := &MachineContext{
		ID: "abc123",
	}
	if err := invalidContext2.Validate(); err == nil {
		t.Error("Expected error for machine context with missing Name, got nil")
	}
}

func TestTagValidation(t *testing.T) {
	// Valid tag
	validTag := &Tag{
		Name: "valid-tag",
	}
	if err := validTag.Validate(); err != nil {
		t.Errorf("Expected valid tag to pass validation, got error: %v", err)
	}

	// Invalid tag - missing Name
	invalidTag1 := &Tag{}
	if err := invalidTag1.Validate(); err == nil {
		t.Error("Expected error for tag with missing Name, got nil")
	}

	// Invalid tag - invalid characters in Name
	invalidTag2 := &Tag{
		Name: "invalid tag!",
	}
	if err := invalidTag2.Validate(); err == nil {
		t.Error("Expected error for tag with invalid characters in Name, got nil")
	}
}

func TestMaasMachineToMCPContext(t *testing.T) {
	// Create a MAAS machine
	machine := &Machine{
		SystemID:     "abc123",
		Hostname:     "test-machine",
		FQDN:         "test-machine.example.com",
		Status:       "Ready",
		Architecture: "amd64/generic",
		PowerState:   "on",
		PowerType:    "ipmi",
		Zone:         "default",
		Pool:         "default",
		Tags:         []string{"tag1", "tag2"},
		IPAddresses:  []string{"192.168.1.100", "10.0.0.100"},
		CPUCount:     4,
		Memory:       8192,
		OSSystem:     "ubuntu",
		DistroSeries: "focal",
		Interfaces: []NetworkInterface{
			{
				ID:         1,
				Name:       "eth0",
				Type:       "physical",
				Enabled:    true,
				MACAddress: "00:11:22:33:44:55",
				VLANid:     1,
				Links: []LinkInfo{
					{
						Mode:      "static",
						IPAddress: "192.168.1.100",
						SubnetID:  1,
					},
				},
			},
		},
		BlockDevices: []BlockDevice{
			{
				ID:            1,
				Name:          "sda",
				Type:          "physical",
				Path:          "/dev/sda",
				Size:          1000000000,
				UsedSize:      900000000,
				AvailableSize: 100000000,
				Model:         "Samsung SSD",
				Serial:        "S123456",
			},
		},
	}

	// Convert to MCP context
	ctx := MaasMachineToMCPContext(machine)

	// Verify conversion
	if ctx.ID != machine.SystemID {
		t.Errorf("Expected ID %s, got %s", machine.SystemID, ctx.ID)
	}
	if ctx.Name != machine.Hostname {
		t.Errorf("Expected Name %s, got %s", machine.Hostname, ctx.Name)
	}
	if ctx.Status != machine.Status {
		t.Errorf("Expected Status %s, got %s", machine.Status, ctx.Status)
	}
	if ctx.Architecture != machine.Architecture {
		t.Errorf("Expected Architecture %s, got %s", machine.Architecture, ctx.Architecture)
	}
	if ctx.PowerState != machine.PowerState {
		t.Errorf("Expected PowerState %s, got %s", machine.PowerState, ctx.PowerState)
	}
	if ctx.Zone != machine.Zone {
		t.Errorf("Expected Zone %s, got %s", machine.Zone, ctx.Zone)
	}
	if ctx.Pool != machine.Pool {
		t.Errorf("Expected Pool %s, got %s", machine.Pool, ctx.Pool)
	}
	if len(ctx.Tags) != len(machine.Tags) {
		t.Errorf("Expected %d tags, got %d", len(machine.Tags), len(ctx.Tags))
	}
	if ctx.CPUCount != machine.CPUCount {
		t.Errorf("Expected CPUCount %d, got %d", machine.CPUCount, ctx.CPUCount)
	}
	if ctx.Memory != machine.Memory {
		t.Errorf("Expected Memory %d, got %d", machine.Memory, ctx.Memory)
	}
	if ctx.OSInfo.System != machine.OSSystem {
		t.Errorf("Expected OSInfo.System %s, got %s", machine.OSSystem, ctx.OSInfo.System)
	}
	if ctx.OSInfo.Release != machine.DistroSeries {
		t.Errorf("Expected OSInfo.Release %s, got %s", machine.DistroSeries, ctx.OSInfo.Release)
	}
	if len(ctx.Networks) != len(machine.Interfaces) {
		t.Errorf("Expected %d networks, got %d", len(machine.Interfaces), len(ctx.Networks))
	}
	if len(ctx.Storage) != len(machine.BlockDevices) {
		t.Errorf("Expected %d storage devices, got %d", len(machine.BlockDevices), len(ctx.Storage))
	}
}

func TestMachineJSONSerialization(t *testing.T) {
	// Create a machine
	machine := &Machine{
		SystemID:     "abc123",
		Hostname:     "test-machine",
		FQDN:         "test-machine.example.com",
		Status:       "Ready",
		Architecture: "amd64/generic",
		PowerState:   "on",
		PowerType:    "ipmi",
		Zone:         "default",
		Pool:         "default",
		Tags:         []string{"tag1", "tag2"},
		IPAddresses:  []string{"192.168.1.100", "10.0.0.100"},
		CPUCount:     4,
		Memory:       8192,
		OSSystem:     "ubuntu",
		DistroSeries: "focal",
	}

	// Serialize to JSON
	data, err := json.Marshal(machine)
	if err != nil {
		t.Fatalf("Failed to marshal machine to JSON: %v", err)
	}

	// Deserialize from JSON
	var unmarshaledMachine Machine
	err = json.Unmarshal(data, &unmarshaledMachine)
	if err != nil {
		t.Fatalf("Failed to unmarshal machine from JSON: %v", err)
	}

	// Verify fields
	if unmarshaledMachine.SystemID != machine.SystemID {
		t.Errorf("Expected SystemID %s, got %s", machine.SystemID, unmarshaledMachine.SystemID)
	}
	if unmarshaledMachine.Hostname != machine.Hostname {
		t.Errorf("Expected Hostname %s, got %s", machine.Hostname, unmarshaledMachine.Hostname)
	}
	if unmarshaledMachine.Status != machine.Status {
		t.Errorf("Expected Status %s, got %s", machine.Status, unmarshaledMachine.Status)
	}
	if unmarshaledMachine.CPUCount != machine.CPUCount {
		t.Errorf("Expected CPUCount %d, got %d", machine.CPUCount, unmarshaledMachine.CPUCount)
	}
	if unmarshaledMachine.Memory != machine.Memory {
		t.Errorf("Expected Memory %d, got %d", machine.Memory, unmarshaledMachine.Memory)
	}
}

func TestMachineContextJSONSerialization(t *testing.T) {
	// Create a machine context
	ctx := &MachineContext{
		ID:           "abc123",
		Name:         "test-machine",
		Status:       "Ready",
		Architecture: "amd64/generic",
		PowerState:   "on",
		Zone:         "default",
		Pool:         "default",
		Tags:         []string{"tag1", "tag2"},
		CPUCount:     4,
		Memory:       8192,
		OSInfo: OSInfo{
			System:       "ubuntu",
			Distribution: "ubuntu",
			Release:      "focal",
			Version:      "20.04",
		},
		LastUpdated: time.Now(),
		Metadata:    map[string]string{"key1": "value1", "key2": "value2"},
	}

	// Serialize to JSON
	data, err := json.Marshal(ctx)
	if err != nil {
		t.Fatalf("Failed to marshal machine context to JSON: %v", err)
	}

	// Deserialize from JSON
	var unmarshaledContext MachineContext
	err = json.Unmarshal(data, &unmarshaledContext)
	if err != nil {
		t.Fatalf("Failed to unmarshal machine context from JSON: %v", err)
	}

	// Verify fields
	if unmarshaledContext.ID != ctx.ID {
		t.Errorf("Expected ID %s, got %s", ctx.ID, unmarshaledContext.ID)
	}
	if unmarshaledContext.Name != ctx.Name {
		t.Errorf("Expected Name %s, got %s", ctx.Name, unmarshaledContext.Name)
	}
	if unmarshaledContext.Status != ctx.Status {
		t.Errorf("Expected Status %s, got %s", ctx.Status, unmarshaledContext.Status)
	}
	if unmarshaledContext.CPUCount != ctx.CPUCount {
		t.Errorf("Expected CPUCount %d, got %d", ctx.CPUCount, unmarshaledContext.CPUCount)
	}
	if unmarshaledContext.Memory != ctx.Memory {
		t.Errorf("Expected Memory %d, got %d", ctx.Memory, unmarshaledContext.Memory)
	}
	if unmarshaledContext.OSInfo.System != ctx.OSInfo.System {
		t.Errorf("Expected OSInfo.System %s, got %s", ctx.OSInfo.System, unmarshaledContext.OSInfo.System)
	}
	if unmarshaledContext.OSInfo.Release != ctx.OSInfo.Release {
		t.Errorf("Expected OSInfo.Release %s, got %s", ctx.OSInfo.Release, unmarshaledContext.OSInfo.Release)
	}
}
