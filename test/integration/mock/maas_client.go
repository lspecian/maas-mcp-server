package mock

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/canonical/gomaasclient/entity"
	"github.com/lspecian/maas-mcp-server/internal/models"
	"github.com/lspecian/maas-mcp-server/internal/models/maas"
	modelsmaas "github.com/lspecian/maas-mcp-server/internal/models/maas"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/mock" // Added import
)

// MockMaasClient is a mock implementation of the MAAS client for testing.
type MockMaasClient struct {
	mock.Mock     // Embedded mock.Mock
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

// ListMachines retrieves machines based on filters with pagination.
func (m *MockMaasClient) ListMachines(ctx context.Context, filters map[string]string, pagination *maas.PaginationOptions) ([]models.Machine, int, error) {
	if err := m.checkFailure("ListMachines"); err != nil {
		return nil, 0, err
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
		// Add more filter checks as needed based on your MachineClient interface and MAAS capabilities

		// Deep copy to avoid modifying the original
		machineCopy := *machine
		result = append(result, machineCopy)
	}

	// Mock pagination logic (simplified)
	total := len(result)
	if pagination != nil && pagination.Limit > 0 {
		start := pagination.Page * pagination.Limit
		if start > total {
			start = total
		}
		end := start + pagination.Limit
		if end > total {
			end = total
		}
		if start < end {
			result = result[start:end]
		} else {
			result = []models.Machine{}
		}
	}

	return result, total, nil
}

// ListMachinesSimple retrieves machines based on filters without pagination.
func (m *MockMaasClient) ListMachinesSimple(ctx context.Context, filters map[string]string) ([]models.Machine, error) {
	if err := m.checkFailure("ListMachinesSimple"); err != nil {
		return nil, err
	}
	// For mock, this can just call ListMachines with nil pagination and ignore the count
	machines, _, err := m.ListMachines(ctx, filters, nil)
	return machines, err
}

// GetMachineWithDetails retrieves details for a specific machine with optional detailed information.
// For mock, this can be similar to GetMachine.
func (m *MockMaasClient) GetMachineWithDetails(ctx context.Context, systemID string, includeDetails bool) (*models.Machine, error) {
	if err := m.checkFailure("GetMachineWithDetails"); err != nil {
		return nil, err
	}
	return m.GetMachine(systemID) // Simple passthrough for mock
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
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Subnet), args.Error(1)
}

// ListSubnets retrieves all subnets.
func (m *MockMaasClient) ListSubnets() ([]models.Subnet, error) { // Reverted signature
	// Use testify/mock
	args := m.Called() // No arguments for this interface method

	// Handle nil case for the first return value if an error is returned.
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.Subnet), args.Error(1)
}

// ListVLANs retrieves all VLANs.
func (m *MockMaasClient) ListVLANs(fabricID int) ([]models.VLAN, error) {
	args := m.Called(fabricID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.VLAN), args.Error(1)
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

// GetMachineBlockDevice retrieves a specific block device for a machine.
func (m *MockMaasClient) GetMachineBlockDevice(systemID string, deviceID int) (*models.BlockDevice, error) {
	if err := m.checkFailure("GetMachineBlockDevice"); err != nil {
		return nil, err
	}

	m.mutex.RLock()
	defer m.mutex.RUnlock()

	devices, ok := m.blockDevices[systemID]
	if !ok {
		return nil, fmt.Errorf("no block devices found for machine: %s", systemID)
	}

	for _, device := range devices {
		if device.ID == deviceID {
			// Deep copy to avoid modifying the original
			deviceCopy := device
			return &deviceCopy, nil
		}
	}

	return nil, fmt.Errorf("block device with ID %d not found for machine %s", deviceID, systemID)
}

// CreateMachinePartition creates a partition on a block device for a specific machine.
func (m *MockMaasClient) CreateMachinePartition(systemID string, blockDeviceID int, params modelsmaas.PartitionCreateParams) (*models.Partition, error) {
	if err := m.checkFailure("CreateMachinePartition"); err != nil {
		return nil, err
	}

	m.mutex.Lock()
	defer m.mutex.Unlock()

	// Check if the machine exists
	if _, ok := m.machines[systemID]; !ok {
		return nil, fmt.Errorf("machine not found: %s", systemID)
	}

	// Check if the block device exists
	devices, ok := m.blockDevices[systemID]
	if !ok {
		return nil, fmt.Errorf("no block devices found for machine: %s", systemID)
	}

	var device *models.BlockDevice
	for i, d := range devices {
		if d.ID == blockDeviceID {
			device = &devices[i]
			break
		}
	}

	if device == nil {
		return nil, fmt.Errorf("block device with ID %d not found for machine %s", blockDeviceID, systemID)
	}

	// Check if there's enough space on the device
	if params.Size > device.AvailableSize {
		return nil, fmt.Errorf("not enough space on device: available %d, requested %d", device.AvailableSize, params.Size)
	}

	// Create a new partition
	partitionID := len(device.Partitions) + 1
	partition := models.Partition{
		ID:   partitionID,
		Size: params.Size,
		Path: fmt.Sprintf("%s%d", device.Path, partitionID),
		Type: "primary",
	}

	// Add filesystem if specified
	if params.FSType != "" {
		partition.Filesystem = &models.Filesystem{
			FSType: params.FSType,
		}
	}

	// Update the device's available size
	device.AvailableSize -= params.Size
	device.UsedSize += params.Size
	device.Partitions = append(device.Partitions, partition)

	// Return a copy of the partition
	partitionCopy := partition
	return &partitionCopy, nil
}

// UpdateMachinePartition updates a partition on a block device for a specific machine.
func (m *MockMaasClient) UpdateMachinePartition(systemID string, blockDeviceID, partitionID int, params map[string]interface{}) (*models.Partition, error) {
	if err := m.checkFailure("UpdateMachinePartition"); err != nil {
		return nil, err
	}

	m.mutex.Lock()
	defer m.mutex.Unlock()

	// Check if the machine exists
	if _, ok := m.machines[systemID]; !ok {
		return nil, fmt.Errorf("machine not found: %s", systemID)
	}

	// Check if the block device exists
	devices, ok := m.blockDevices[systemID]
	if !ok {
		return nil, fmt.Errorf("no block devices found for machine: %s", systemID)
	}

	var device *models.BlockDevice
	for i, d := range devices {
		if d.ID == blockDeviceID {
			device = &devices[i]
			break
		}
	}

	if device == nil {
		return nil, fmt.Errorf("block device with ID %d not found for machine %s", blockDeviceID, systemID)
	}

	// Find the partition
	var partition *models.Partition
	for i, p := range device.Partitions {
		if p.ID == partitionID {
			partition = &device.Partitions[i]
			break
		}
	}

	if partition == nil {
		return nil, fmt.Errorf("partition with ID %d not found on block device %d", partitionID, blockDeviceID)
	}

	// Update partition properties based on params
	if sizeParam, ok := params["size"]; ok {
		// Convert size to int64
		var newSize int64
		switch s := sizeParam.(type) {
		case int:
			newSize = int64(s)
		case int64:
			newSize = s
		case float64:
			newSize = int64(s)
		default:
			return nil, fmt.Errorf("invalid size parameter type")
		}

		// Calculate size difference
		sizeDiff := newSize - partition.Size

		// Check if there's enough space on the device for resizing
		if sizeDiff > 0 && sizeDiff > device.AvailableSize {
			return nil, fmt.Errorf("not enough space on device: available %d, additional needed %d", device.AvailableSize, sizeDiff)
		}

		// Update device's available size
		device.AvailableSize -= sizeDiff
		device.UsedSize += sizeDiff

		// Update partition size
		partition.Size = newSize
	}

	// Return a copy of the updated partition
	partitionCopy := *partition
	return &partitionCopy, nil
}

// DeleteMachinePartition deletes a partition from a block device for a specific machine.
func (m *MockMaasClient) DeleteMachinePartition(systemID string, blockDeviceID, partitionID int) error {
	if err := m.checkFailure("DeleteMachinePartition"); err != nil {
		return err
	}

	m.mutex.Lock()
	defer m.mutex.Unlock()

	// Check if the machine exists
	if _, ok := m.machines[systemID]; !ok {
		return fmt.Errorf("machine not found: %s", systemID)
	}

	// Check if the block device exists
	devices, ok := m.blockDevices[systemID]
	if !ok {
		return fmt.Errorf("no block devices found for machine: %s", systemID)
	}

	var device *models.BlockDevice
	for i, d := range devices {
		if d.ID == blockDeviceID {
			device = &devices[i]
			break
		}
	}

	if device == nil {
		return fmt.Errorf("block device with ID %d not found for machine %s", blockDeviceID, systemID)
	}

	// Find the partition
	var partitionIndex = -1
	var partition models.Partition
	for i, p := range device.Partitions {
		if p.ID == partitionID {
			partitionIndex = i
			partition = p
			break
		}
	}

	if partitionIndex == -1 {
		return fmt.Errorf("partition with ID %d not found on block device %d", partitionID, blockDeviceID)
	}

	// Update device's available size
	device.AvailableSize += partition.Size
	device.UsedSize -= partition.Size

	// Remove the partition
	device.Partitions = append(device.Partitions[:partitionIndex], device.Partitions[partitionIndex+1:]...)

	return nil
}

// FormatMachinePartition formats a partition on a block device for a specific machine.
func (m *MockMaasClient) FormatMachinePartition(systemID string, blockDeviceID, partitionID int, params map[string]interface{}) (*models.Filesystem, error) {
	if err := m.checkFailure("FormatMachinePartition"); err != nil {
		return nil, err
	}

	m.mutex.Lock()
	defer m.mutex.Unlock()

	// Check if the machine exists
	if _, ok := m.machines[systemID]; !ok {
		return nil, fmt.Errorf("machine not found: %s", systemID)
	}

	// Check if the block device exists
	devices, ok := m.blockDevices[systemID]
	if !ok {
		return nil, fmt.Errorf("no block devices found for machine: %s", systemID)
	}

	var device *models.BlockDevice
	for i, d := range devices {
		if d.ID == blockDeviceID {
			device = &devices[i]
			break
		}
	}

	if device == nil {
		return nil, fmt.Errorf("block device with ID %d not found for machine %s", blockDeviceID, systemID)
	}

	// Find the partition
	var partition *models.Partition
	for i, p := range device.Partitions {
		if p.ID == partitionID {
			partition = &device.Partitions[i]
			break
		}
	}

	if partition == nil {
		return nil, fmt.Errorf("partition with ID %d not found on block device %d", partitionID, blockDeviceID)
	}

	// Check if fstype parameter is provided
	fsTypeParam, ok := params["fstype"]
	if !ok {
		return nil, fmt.Errorf("fstype parameter is required")
	}

	fsType, ok := fsTypeParam.(string)
	if !ok {
		return nil, fmt.Errorf("invalid fstype parameter type")
	}

	// Create a new filesystem
	filesystem := &models.Filesystem{
		ID:     partitionID, // Use partition ID as filesystem ID for simplicity
		FSType: fsType,
		UUID:   fmt.Sprintf("uuid-%d-%d-%d", blockDeviceID, partitionID, time.Now().Unix()),
	}

	// Set mount point if provided
	if mountPointParam, ok := params["mount_point"]; ok {
		if mountPoint, ok := mountPointParam.(string); ok {
			filesystem.MountPoint = mountPoint
		}
	}

	// Set mount options if provided
	if mountOptionsParam, ok := params["mount_options"]; ok {
		if mountOptions, ok := mountOptionsParam.(string); ok {
			filesystem.MountOptions = mountOptions
		}
	}

	// Update the partition with the filesystem
	partition.Filesystem = filesystem

	// Return a copy of the filesystem
	filesystemCopy := *filesystem
	return &filesystemCopy, nil
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

// CheckStorageConstraints checks if a machine meets the specified storage constraints.
// This is a mock implementation.
func (m *MockMaasClient) CheckStorageConstraints(machine *models.Machine, constraints *models.SimpleStorageConstraint) bool {
	if err := m.checkFailure("CheckStorageConstraints"); err != nil {
		m.logger.Warnf("Mock CheckStorageConstraints failed due to induced error: %v", err)
		return false // Or handle error as appropriate for a boolean return
	}

	m.logger.Infof("Mock CheckStorageConstraints called for machine %s", machine.SystemID)
	// Basic mock logic:
	// If constraints are nil, assume it meets (or doesn't, depending on desired default)
	if constraints == nil {
		return true
	}

	// Example: Check if there's at least one disk of the required size.
	// This is a very simplified check. A real check would be more complex.
	if constraints.MinSize > 0 { // MinSize is in bytes
		foundDisk := false
		for _, bd := range machine.BlockDevices {
			if bd.Size >= constraints.MinSize { // Compare int64 directly
				foundDisk = true
				break
			}
		}
		if !foundDisk {
			m.logger.Infof("Mock CheckStorageConstraints: Machine %s does not meet MinSize %d bytes", machine.SystemID, constraints.MinSize)
			return false
		}
	}

	// Example: Check if all required tags are present on the machine
	if len(constraints.Tags) > 0 {
		allTagsPresent := true
		for _, requiredTag := range constraints.Tags {
			machineHasTag := false
			for _, machineTag := range machine.Tags {
				if machineTag == requiredTag {
					machineHasTag = true
					break
				}
			}
			if !machineHasTag {
				allTagsPresent = false
				m.logger.Infof("Mock CheckStorageConstraints: Machine %s is missing required tag %s", machine.SystemID, requiredTag)
				break
			}
		}
		if !allTagsPresent {
			return false
		}
	}

	m.logger.Infof("Mock CheckStorageConstraints: Machine %s meets constraints", machine.SystemID)
	return true
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

// Note: The following placeholder methods were removed as they caused
// "already declared" errors. They likely exist in other files within the
// test/integration/mock/ package, such as:
// - maas_client_storage_constraints.go
// - maas_client_volume_operations.go
// - maas_client_raid_operations.go
//
// // --- Mock StorageClient Methods (Placeholders) ---
//
// // CreateVolumeGroup creates a volume group on a machine.
// func (m *MockMaasClient) CreateVolumeGroup(systemID string, params models.VolumeGroupParams) (*models.VolumeGroup, error) { ... }
// // DeleteVolumeGroup deletes a volume group from a machine.
// func (m *MockMaasClient) DeleteVolumeGroup(systemID string, volumeGroupID int) error { ... }
// // GetVolumeGroup retrieves a specific volume group from a machine.
// func (m *MockMaasClient) GetVolumeGroup(systemID string, volumeGroupID int) (*models.VolumeGroup, error) { ... }
// // ListVolumeGroups lists volume groups on a machine.
// func (m *MockMaasClient) ListVolumeGroups(systemID string) ([]models.VolumeGroup, error) { ... }
// // CreateLogicalVolume creates a logical volume within a volume group.
// func (m *MockMaasClient) CreateLogicalVolume(systemID string, volumeGroupID int, params models.LogicalVolumeParams) (*models.LogicalVolume, error) { ... }
// // DeleteLogicalVolume deletes a logical volume.
// func (m *MockMaasClient) DeleteLogicalVolume(systemID string, volumeGroupID, logicalVolumeID int) error { ... }
// // ResizeLogicalVolume resizes a logical volume.
// func (m *MockMaasClient) ResizeLogicalVolume(systemID string, volumeGroupID, logicalVolumeID int, newSize int64) (*models.LogicalVolume, error) { ... }
// // GetLogicalVolume retrieves a specific logical volume.
// func (m *MockMaasClient) GetLogicalVolume(systemID string, volumeGroupID, logicalVolumeID int) (*models.LogicalVolume, error) { ... }
// // CreateRAID creates a RAID array on a machine.
// func (m *MockMaasClient) CreateRAID(systemID string, params models.RAIDParams) (*models.RAID, error) { ... }
// // DeleteRAID deletes a RAID array from a machine.
// func (m *MockMaasClient) DeleteRAID(systemID string, raidID int) error { ... }
// // GetRAID retrieves a specific RAID array from a machine.
// func (m *MockMaasClient) GetRAID(systemID string, raidID int) (*models.RAID, error) { ... }
// // ListRAIDs lists RAID arrays on a machine.
// func (m *MockMaasClient) ListRAIDs(systemID string) ([]models.RAID, error) { ... }
// // UpdateRAID updates a RAID array on a machine.
// func (m *MockMaasClient) UpdateRAID(systemID string, raidID int, params models.RAIDUpdateParams) (*models.RAID, error) { ... }
// // SetStorageConstraints sets the storage constraints for a machine.
// func (m *MockMaasClient) SetStorageConstraints(systemID string, params models.StorageConstraintParams) error { ... }
// // GetStorageConstraints retrieves the storage constraints for a machine.
// func (m *MockMaasClient) GetStorageConstraints(systemID string) (*models.StorageConstraintParams, error) { ... }
// // ValidateStorageConstraints validates storage constraints against a machine.
// func (m *MockMaasClient) ValidateStorageConstraints(systemID string, params models.StorageConstraintParams) (bool, []string, error) { ... }
// // ApplyStorageConstraints applies the given storage constraints to a machine.
// func (m *MockMaasClient) ApplyStorageConstraints(systemID string, params models.StorageConstraintParams) error { ... }
// // DeleteStorageConstraints deletes storage constraints for a machine.
// func (m *MockMaasClient) DeleteStorageConstraints(systemID string) error { ... }
