package mock

import (
	"fmt"
	"sync"

	"github.com/canonical/gomaasclient/entity"
	"github.com/lspecian/maas-mcp-server/internal/models"
	"github.com/sirupsen/logrus"
)

// MockMaasClient is a mock implementation of the MAAS client for testing.
type MockMaasClient struct {
	machines      map[string]*models.Machine
	subnets       map[int]*models.Subnet
	vlans         map[int][]models.VLAN
	tags          map[string]*models.Tag
	blockDevices  map[string][]models.BlockDevice
	interfaces    map[string][]models.NetworkInterface
	mutex         sync.RWMutex
	logger        *logrus.Logger
	failNextCall  bool
	failOperation string
}

// NewMockMaasClient creates a new mock MAAS client with test data.
func NewMockMaasClient(logger *logrus.Logger) *MockMaasClient {
	if logger == nil {
		logger = logrus.New()
		logger.SetLevel(logrus.ErrorLevel)
	}

	client := &MockMaasClient{
		machines:     make(map[string]*models.Machine),
		subnets:      make(map[int]*models.Subnet),
		vlans:        make(map[int][]models.VLAN),
		tags:         make(map[string]*models.Tag),
		blockDevices: make(map[string][]models.BlockDevice),
		interfaces:   make(map[string][]models.NetworkInterface),
		logger:       logger,
	}

	// Initialize with test data
	client.initTestData()

	return client
}

// SetFailNextCall sets whether the next call should fail.
func (m *MockMaasClient) SetFailNextCall(fail bool, operation string) {
	m.mutex.Lock()
	defer m.mutex.Unlock()
	m.failNextCall = fail
	m.failOperation = operation
}

// checkFailure checks if the current operation should fail.
func (m *MockMaasClient) checkFailure(operation string) error {
	m.mutex.RLock()
	defer m.mutex.RUnlock()
	if m.failNextCall && m.failOperation == operation {
		m.failNextCall = false
		return fmt.Errorf("mock failure for operation: %s", operation)
	}
	return nil
}

// initTestData initializes the mock client with test data.
func (m *MockMaasClient) initTestData() {
	// Add test machines
	m.machines["abc123"] = &models.Machine{
		SystemID:     "abc123",
		Hostname:     "test-machine-1",
		FQDN:         "test-machine-1.maas",
		Status:       "Ready",
		Architecture: "amd64/generic",
		CPUCount:     4,
		Memory:       8192,
		PowerState:   "off",
		Zone:         "default",
		Pool:         "default",
		Tags:         []string{"test", "virtual"},
	}

	m.machines["def456"] = &models.Machine{
		SystemID:     "def456",
		Hostname:     "test-machine-2",
		FQDN:         "test-machine-2.maas",
		Status:       "Deployed",
		Architecture: "amd64/generic",
		CPUCount:     8,
		Memory:       16384,
		PowerState:   "on",
		Zone:         "default",
		Pool:         "default",
		Tags:         []string{"test", "physical"},
	}

	// Add test block devices
	m.blockDevices["abc123"] = []models.BlockDevice{
		{
			ID:     1,
			Name:   "sda",
			Type:   "physical",
			Size:   107374182400, // 100 GB
			Path:   "/dev/sda",
			Model:  "QEMU HARDDISK",
			Serial: "QM00001",
		},
	}

	m.blockDevices["def456"] = []models.BlockDevice{
		{
			ID:     2,
			Name:   "sda",
			Type:   "physical",
			Size:   214748364800, // 200 GB
			Path:   "/dev/sda",
			Model:  "QEMU HARDDISK",
			Serial: "QM00002",
		},
		{
			ID:     3,
			Name:   "sdb",
			Type:   "physical",
			Size:   107374182400, // 100 GB
			Path:   "/dev/sdb",
			Model:  "QEMU HARDDISK",
			Serial: "QM00003",
		},
	}

	// Add test network interfaces
	m.interfaces["abc123"] = []models.NetworkInterface{
		{
			ID:         1,
			Name:       "eth0",
			Type:       "physical",
			MACAddress: "52:54:00:12:34:56",
			Links: []models.LinkInfo{
				{
					ID:        1,
					Mode:      "auto",
					SubnetID:  1,
					IPAddress: "192.168.1.100",
				},
			},
		},
	}

	m.interfaces["def456"] = []models.NetworkInterface{
		{
			ID:         2,
			Name:       "eth0",
			Type:       "physical",
			MACAddress: "52:54:00:12:34:78",
			Links: []models.LinkInfo{
				{
					ID:        2,
					Mode:      "auto",
					SubnetID:  1,
					IPAddress: "192.168.1.101",
				},
			},
		},
	}

	// Add test subnets
	m.subnets[1] = &models.Subnet{
		ID:         1,
		CIDR:       "192.168.1.0/24",
		Name:       "test-subnet-1",
		VLANid:     1,
		Space:      "default",
		Managed:    true,
		FabricID:   1,
		FabricName: "fabric-1",
	}

	m.subnets[2] = &models.Subnet{
		ID:         2,
		CIDR:       "10.0.0.0/24",
		Name:       "test-subnet-2",
		VLANid:     2,
		Space:      "default",
		Managed:    true,
		FabricID:   1,
		FabricName: "fabric-1",
	}

	// Add test VLANs
	m.vlans[1] = []models.VLAN{
		{
			ID:         1,
			Name:       "default",
			VID:        1,
			FabricID:   1,
			FabricName: "fabric-1",
		},
		{
			ID:         2,
			Name:       "vlan-10",
			VID:        10,
			FabricID:   1,
			FabricName: "fabric-1",
		},
	}

	// Add test tags
	m.tags["test"] = &models.Tag{
		Name:    "test",
		Comment: "Test tag",
	}

	m.tags["virtual"] = &models.Tag{
		Name:    "virtual",
		Comment: "Virtual machine",
	}

	m.tags["physical"] = &models.Tag{
		Name:    "physical",
		Comment: "Physical machine",
	}
}

// ListMachines retrieves machines based on filters.
func (m *MockMaasClient) ListMachines(filters map[string]string) ([]models.Machine, error) {
	if err := m.checkFailure("ListMachines"); err != nil {
		return nil, err
	}

	m.mutex.RLock()
	defer m.mutex.RUnlock()

	var result []models.Machine
	for _, machine := range m.machines {
		// Apply filters
		if hostname, ok := filters["hostname"]; ok && hostname != "" && machine.Hostname != hostname {
			continue
		}
		if zone, ok := filters["zone"]; ok && zone != "" && machine.Zone != zone {
			continue
		}
		if pool, ok := filters["pool"]; ok && pool != "" && machine.Pool != pool {
			continue
		}

		// Deep copy to avoid modifying the original
		machineCopy := *machine
		result = append(result, machineCopy)
	}

	return result, nil
}

// GetMachine retrieves details for a specific machine.
func (m *MockMaasClient) GetMachine(systemID string) (*models.Machine, error) {
	if err := m.checkFailure("GetMachine"); err != nil {
		return nil, err
	}

	m.mutex.RLock()
	defer m.mutex.RUnlock()

	machine, ok := m.machines[systemID]
	if !ok {
		return nil, fmt.Errorf("machine not found: %s", systemID)
	}

	// Deep copy to avoid modifying the original
	machineCopy := *machine

	// Add interfaces and block devices
	if interfaces, ok := m.interfaces[systemID]; ok {
		machineCopy.Interfaces = make([]models.NetworkInterface, len(interfaces))
		copy(machineCopy.Interfaces, interfaces)
	}

	if blockDevices, ok := m.blockDevices[systemID]; ok {
		machineCopy.BlockDevices = make([]models.BlockDevice, len(blockDevices))
		copy(machineCopy.BlockDevices, blockDevices)
	}

	return &machineCopy, nil
}

// AllocateMachine allocates a machine based on constraints.
func (m *MockMaasClient) AllocateMachine(params *entity.MachineAllocateParams) (*models.Machine, error) {
	if err := m.checkFailure("AllocateMachine"); err != nil {
		return nil, err
	}

	m.mutex.Lock()
	defer m.mutex.Unlock()

	// Find a machine that matches the constraints
	for _, machine := range m.machines {
		if machine.Status != "Ready" {
			continue
		}

		// Check constraints
		if params.CPUCount > 0 && machine.CPUCount < params.CPUCount {
			continue
		}
		if params.Mem > 0 && machine.Memory < params.Mem {
			continue
		}
		if len(params.Tags) > 0 {
			matches := true
			for _, tag := range params.Tags {
				found := false
				for _, machineTag := range machine.Tags {
					if machineTag == tag {
						found = true
						break
					}
				}
				if !found {
					matches = false
					break
				}
			}
			if !matches {
				continue
			}
		}

		// Machine matches constraints, allocate it
		machine.Status = "Allocated"
		machineCopy := *machine
		return &machineCopy, nil
	}

	return nil, fmt.Errorf("no machine found matching constraints")
}

// DeployMachine deploys an allocated machine.
func (m *MockMaasClient) DeployMachine(systemID string, params *entity.MachineDeployParams) (*models.Machine, error) {
	if err := m.checkFailure("DeployMachine"); err != nil {
		return nil, err
	}

	m.mutex.Lock()
	defer m.mutex.Unlock()

	machine, ok := m.machines[systemID]
	if !ok {
		return nil, fmt.Errorf("machine not found: %s", systemID)
	}

	if machine.Status != "Allocated" {
		return nil, fmt.Errorf("machine is not allocated: %s", systemID)
	}

	// Deploy the machine
	machine.Status = "Deploying"
	if params.DistroSeries != "" {
		machine.DistroSeries = params.DistroSeries
	} else {
		machine.DistroSeries = "focal"
	}

	machineCopy := *machine
	return &machineCopy, nil
}

// ReleaseMachine releases a machine back to the pool.
func (m *MockMaasClient) ReleaseMachine(systemIDs []string, comment string) error {
	if err := m.checkFailure("ReleaseMachine"); err != nil {
		return err
	}

	m.mutex.Lock()
	defer m.mutex.Unlock()

	for _, systemID := range systemIDs {
		machine, ok := m.machines[systemID]
		if !ok {
			return fmt.Errorf("machine not found: %s", systemID)
		}

		// Release the machine
		machine.Status = "Ready"
	}

	return nil
}

// GetSubnet retrieves subnet details.
func (m *MockMaasClient) GetSubnet(id int) (*models.Subnet, error) {
	if err := m.checkFailure("GetSubnet"); err != nil {
		return nil, err
	}

	m.mutex.RLock()
	defer m.mutex.RUnlock()

	subnet, ok := m.subnets[id]
	if !ok {
		return nil, fmt.Errorf("subnet not found: %d", id)
	}

	// Deep copy to avoid modifying the original
	subnetCopy := *subnet
	return &subnetCopy, nil
}

// ListSubnets retrieves all subnets.
func (m *MockMaasClient) ListSubnets() ([]models.Subnet, error) {
	if err := m.checkFailure("ListSubnets"); err != nil {
		return nil, err
	}

	m.mutex.RLock()
	defer m.mutex.RUnlock()

	var result []models.Subnet
	for _, subnet := range m.subnets {
		// Deep copy to avoid modifying the original
		subnetCopy := *subnet
		result = append(result, subnetCopy)
	}

	return result, nil
}

// ListVLANs retrieves all VLANs.
func (m *MockMaasClient) ListVLANs(fabricID int) ([]models.VLAN, error) {
	if err := m.checkFailure("ListVLANs"); err != nil {
		return nil, err
	}

	m.mutex.RLock()
	defer m.mutex.RUnlock()

	vlans, ok := m.vlans[fabricID]
	if !ok {
		return []models.VLAN{}, nil
	}

	// Deep copy to avoid modifying the original
	result := make([]models.VLAN, len(vlans))
	copy(result, vlans)
	return result, nil
}

// GetMachineBlockDevices retrieves block devices for a specific machine.
func (m *MockMaasClient) GetMachineBlockDevices(systemID string) ([]models.BlockDevice, error) {
	if err := m.checkFailure("GetMachineBlockDevices"); err != nil {
		return nil, err
	}

	m.mutex.RLock()
	defer m.mutex.RUnlock()

	devices, ok := m.blockDevices[systemID]
	if !ok {
		return []models.BlockDevice{}, nil
	}

	// Deep copy to avoid modifying the original
	result := make([]models.BlockDevice, len(devices))
	copy(result, devices)
	return result, nil
}

// GetMachineInterfaces retrieves network interfaces for a specific machine.
func (m *MockMaasClient) GetMachineInterfaces(systemID string) ([]models.NetworkInterface, error) {
	if err := m.checkFailure("GetMachineInterfaces"); err != nil {
		return nil, err
	}

	m.mutex.RLock()
	defer m.mutex.RUnlock()

	interfaces, ok := m.interfaces[systemID]
	if !ok {
		return []models.NetworkInterface{}, nil
	}

	// Deep copy to avoid modifying the original
	result := make([]models.NetworkInterface, len(interfaces))
	copy(result, interfaces)
	return result, nil
}

// ListTags retrieves all tags.
func (m *MockMaasClient) ListTags() ([]models.Tag, error) {
	if err := m.checkFailure("ListTags"); err != nil {
		return nil, err
	}

	m.mutex.RLock()
	defer m.mutex.RUnlock()

	var result []models.Tag
	for _, tag := range m.tags {
		// Deep copy to avoid modifying the original
		tagCopy := *tag
		result = append(result, tagCopy)
	}

	return result, nil
}

// CreateTag creates a new tag.
func (m *MockMaasClient) CreateTag(name, comment, definition string) (*models.Tag, error) {
	if err := m.checkFailure("CreateTag"); err != nil {
		return nil, err
	}

	m.mutex.Lock()
	defer m.mutex.Unlock()

	if _, ok := m.tags[name]; ok {
		return nil, fmt.Errorf("tag already exists: %s", name)
	}

	tag := &models.Tag{
		Name:       name,
		Comment:    comment,
		Definition: definition,
	}
	m.tags[name] = tag

	// Deep copy to avoid modifying the original
	tagCopy := *tag
	return &tagCopy, nil
}

// ApplyTagToMachine applies a tag to a machine.
func (m *MockMaasClient) ApplyTagToMachine(tagName, systemID string) error {
	if err := m.checkFailure("ApplyTagToMachine"); err != nil {
		return err
	}

	m.mutex.Lock()
	defer m.mutex.Unlock()

	_, ok := m.tags[tagName]
	if !ok {
		return fmt.Errorf("tag not found: %s", tagName)
	}

	machine, ok := m.machines[systemID]
	if !ok {
		return fmt.Errorf("machine not found: %s", systemID)
	}

	// Check if tag is already applied
	for _, t := range machine.Tags {
		if t == tagName {
			return nil
		}
	}

	// Apply tag
	machine.Tags = append(machine.Tags, tagName)
	return nil
}

// RemoveTagFromMachine removes a tag from a machine.
func (m *MockMaasClient) RemoveTagFromMachine(tagName, systemID string) error {
	if err := m.checkFailure("RemoveTagFromMachine"); err != nil {
		return err
	}

	m.mutex.Lock()
	defer m.mutex.Unlock()

	machine, ok := m.machines[systemID]
	if !ok {
		return fmt.Errorf("machine not found: %s", systemID)
	}

	// Find and remove tag
	for i, t := range machine.Tags {
		if t == tagName {
			machine.Tags = append(machine.Tags[:i], machine.Tags[i+1:]...)
			return nil
		}
	}

	return fmt.Errorf("tag not applied to machine: %s", tagName)
}

// PowerOnMachine powers on a machine.
func (m *MockMaasClient) PowerOnMachine(systemID string) (*models.Machine, error) {
	if err := m.checkFailure("PowerOnMachine"); err != nil {
		return nil, err
	}

	m.mutex.Lock()
	defer m.mutex.Unlock()

	machine, ok := m.machines[systemID]
	if !ok {
		return nil, fmt.Errorf("machine not found: %s", systemID)
	}

	// Update power state
	machine.PowerState = "on"

	// Deep copy to avoid modifying the original
	machineCopy := *machine
	return &machineCopy, nil
}

// PowerOffMachine powers off a machine.
func (m *MockMaasClient) PowerOffMachine(systemID string) (*models.Machine, error) {
	if err := m.checkFailure("PowerOffMachine"); err != nil {
		return nil, err
	}

	m.mutex.Lock()
	defer m.mutex.Unlock()

	machine, ok := m.machines[systemID]
	if !ok {
		return nil, fmt.Errorf("machine not found: %s", systemID)
	}

	// Update power state
	machine.PowerState = "off"

	// Deep copy to avoid modifying the original
	machineCopy := *machine
	return &machineCopy, nil
}
