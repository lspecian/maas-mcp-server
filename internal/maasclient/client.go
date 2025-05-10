package maasclient

import (
	"fmt"
	"strings"
	"time"

	gomaasclient "github.com/canonical/gomaasclient/client"
	"github.com/canonical/gomaasclient/entity"
	"github.com/sirupsen/logrus"

	"github.com/lspecian/maas-mcp-server/internal/config"
	"github.com/lspecian/maas-mcp-server/internal/models"
)

// MaasClient provides an abstraction layer over gomaasclient.
type MaasClient struct {
	client *gomaasclient.Client
	logger *logrus.Logger
	config *config.Config
}

// NewMaasClient creates and initializes a new MAAS client.
// It parses the MAAS API key into consumer key, token, and secret.
func NewMaasClient(cfg *config.Config, logger *logrus.Logger) (*MaasClient, error) {
	// Get the default MAAS instance
	maasInstance := cfg.GetDefaultMAASInstance()

	// Check if we have a valid MAAS instance
	if maasInstance.APIURL == "" || maasInstance.APIKey == "" {
		return nil, fmt.Errorf("no valid MAAS instance configuration found")
	}

	// Parse MAAS API key into consumer key, token, secret
	parts := strings.Split(maasInstance.APIKey, ":")
	if len(parts) != 3 {
		return nil, fmt.Errorf("invalid MAAS API key format")
	}

	// Initialize the gomaasclient
	client, err := gomaasclient.GetClient(maasInstance.APIURL, maasInstance.APIKey, "2.0")
	if err != nil {
		return nil, fmt.Errorf("failed to initialize MAAS client: %w", err)
	}

	return &MaasClient{
		client: client,
		logger: logger,
		config: cfg,
	}, nil
}

// PowerOnMachine powers on a machine.
func (c *MaasClient) PowerOnMachine(systemID string) (*models.Machine, error) {
	c.logger.WithField("system_id", systemID).Debug("Powering on machine")

	// Retry logic for API calls
	var machine *entity.Machine
	var err error

	for i := 0; i < 3; i++ {
		params := &entity.MachinePowerOnParams{} // Default parameters
		machine, err = c.client.Machine.PowerOn(systemID, params)
		if err == nil {
			break
		}
		c.logger.WithError(err).Warnf("Attempt %d to power on machine %s failed", i+1, systemID)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		c.logger.WithError(err).Errorf("Failed to power on machine %s", systemID)
		return nil, fmt.Errorf("failed to power on machine: %w", err)
	}

	// Convert to our internal model
	result := &models.Machine{
		SystemID:     machine.SystemID,
		Hostname:     machine.Hostname,
		FQDN:         machine.FQDN,
		Status:       machine.StatusName,
		Zone:         machine.Zone.Name,
		Pool:         machine.Pool.Name,
		Tags:         machine.TagNames,
		PowerState:   machine.PowerState,
		PowerType:    machine.PowerType,
		Architecture: machine.Architecture,
	}

	c.logger.WithField("system_id", systemID).Info("Successfully powered on machine")
	return result, nil
}

// PowerOffMachine powers off a machine.
func (c *MaasClient) PowerOffMachine(systemID string) (*models.Machine, error) {
	c.logger.WithField("system_id", systemID).Debug("Powering off machine")

	// Retry logic for API calls
	var machine *entity.Machine
	var err error

	for i := 0; i < 3; i++ {
		params := &entity.MachinePowerOffParams{} // Default parameters
		machine, err = c.client.Machine.PowerOff(systemID, params)
		if err == nil {
			break
		}
		c.logger.WithError(err).Warnf("Attempt %d to power off machine %s failed", i+1, systemID)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		c.logger.WithError(err).Errorf("Failed to power off machine %s", systemID)
		return nil, fmt.Errorf("failed to power off machine: %w", err)
	}

	// Convert to our internal model
	result := &models.Machine{
		SystemID:     machine.SystemID,
		Hostname:     machine.Hostname,
		FQDN:         machine.FQDN,
		Status:       machine.StatusName,
		Zone:         machine.Zone.Name,
		Pool:         machine.Pool.Name,
		Tags:         machine.TagNames,
		PowerState:   machine.PowerState,
		PowerType:    machine.PowerType,
		Architecture: machine.Architecture,
	}

	c.logger.WithField("system_id", systemID).Info("Successfully powered off machine")
	return result, nil
}

// NewMaasClientForInstance creates a new MAAS client for a specific instance.
func NewMaasClientForInstance(cfg *config.Config, instanceName string, logger *logrus.Logger) (*MaasClient, error) {
	// Get the specified MAAS instance
	maasInstance, ok := cfg.GetMAASInstance(instanceName)
	if !ok {
		return nil, fmt.Errorf("MAAS instance '%s' not found in configuration", instanceName)
	}

	// Parse MAAS API key into consumer key, token, secret
	parts := strings.Split(maasInstance.APIKey, ":")
	if len(parts) != 3 {
		return nil, fmt.Errorf("invalid MAAS API key format for instance '%s'", instanceName)
	}

	// Initialize the gomaasclient
	client, err := gomaasclient.GetClient(maasInstance.APIURL, maasInstance.APIKey, "2.0")
	if err != nil {
		return nil, fmt.Errorf("failed to initialize MAAS client for instance '%s': %w", instanceName, err)
	}

	return &MaasClient{
		client: client,
		logger: logger,
		config: cfg,
	}, nil
}

// retry is a helper function that retries operations with exponential backoff
func (m *MaasClient) retry(operation func() error, maxAttempts int, initialDelay time.Duration) error {
	var err error
	delay := initialDelay

	for attempt := 1; attempt <= maxAttempts; attempt++ {
		err = operation()
		if err == nil {
			return nil
		}

		if attempt == maxAttempts {
			break
		}

		m.logger.WithFields(logrus.Fields{
			"attempt":      attempt,
			"max_attempts": maxAttempts,
			"delay":        delay.String(),
			"error":        err.Error(),
		}).Warn("Operation failed, retrying...")

		time.Sleep(delay)
		delay *= 2 // Exponential backoff
	}

	return fmt.Errorf("operation failed after %d attempts: %w", maxAttempts, err)
}

// ==================== Machine Operations ====================

// ListMachines retrieves machines based on filters.
func (m *MaasClient) ListMachines(filters map[string]string) ([]models.Machine, error) {
	params := &entity.MachinesParams{}

	// Apply filters to params if provided
	if hostname, ok := filters["hostname"]; ok {
		params.Hostname = []string{hostname}
	}
	if zone, ok := filters["zone"]; ok {
		params.Zone = []string{zone}
	}
	if pool, ok := filters["pool"]; ok {
		params.Pool = []string{pool}
	}

	var entityMachines []entity.Machine
	operation := func() error {
		var err error
		m.logger.WithField("filters", filters).Debug("Listing MAAS machines")
		entityMachines, err = m.client.Machines.Get(params)
		if err != nil {
			m.logger.WithError(err).Error("Failed to list MAAS machines")
			return fmt.Errorf("MAAS API error listing machines: %w", err)
		}
		return nil
	}

	if err := m.retry(operation, 3, 1*time.Second); err != nil {
		return nil, err
	}

	// Convert entity.Machine to models.Machine
	machines := make([]models.Machine, len(entityMachines))
	for i, entityMachine := range entityMachines {
		var machine models.Machine
		machine.FromEntity(&entityMachine)
		machines[i] = machine
	}

	return machines, nil
}

// GetMachine retrieves details for a specific machine.
func (m *MaasClient) GetMachine(systemID string) (*models.Machine, error) {
	if systemID == "" {
		return nil, fmt.Errorf("system ID is required")
	}

	var entityMachine *entity.Machine
	operation := func() error {
		var err error
		m.logger.WithField("system_id", systemID).Debug("Getting MAAS machine")
		entityMachine, err = m.client.Machine.Get(systemID)
		if err != nil {
			m.logger.WithError(err).WithField("system_id", systemID).Error("Failed to get MAAS machine")
			return fmt.Errorf("MAAS API error getting machine %s: %w", systemID, err)
		}
		return nil
	}

	if err := m.retry(operation, 3, 1*time.Second); err != nil {
		return nil, err
	}

	// Convert entity.Machine to models.Machine
	machine := &models.Machine{}
	machine.FromEntity(entityMachine)

	// Get interfaces and block devices for the machine
	if err := m.populateMachineDetails(machine); err != nil {
		m.logger.WithError(err).WithField("system_id", systemID).Warn("Failed to populate machine details")
		// Continue with partial data
	}

	return machine, nil
}

// populateMachineDetails fetches additional details for a machine
func (m *MaasClient) populateMachineDetails(machine *models.Machine) error {
	// Get network interfaces
	interfaces, err := m.GetMachineInterfaces(machine.SystemID)
	if err != nil {
		return fmt.Errorf("failed to get machine interfaces: %w", err)
	}
	machine.Interfaces = interfaces

	// Get block devices
	blockDevices, err := m.GetMachineBlockDevices(machine.SystemID)
	if err != nil {
		return fmt.Errorf("failed to get machine block devices: %w", err)
	}
	machine.BlockDevices = blockDevices

	return nil
}

// AllocateMachine allocates a machine based on constraints.
func (m *MaasClient) AllocateMachine(params *entity.MachineAllocateParams) (*models.Machine, error) {
	var entityMachine *entity.Machine
	operation := func() error {
		var err error
		m.logger.WithField("params", fmt.Sprintf("%+v", params)).Debug("Allocating MAAS machine")
		entityMachine, err = m.client.Machines.Allocate(params)
		if err != nil {
			m.logger.WithError(err).Error("Failed to allocate MAAS machine")
			return fmt.Errorf("MAAS API error allocating machine: %w", err)
		}
		return nil
	}

	if err := m.retry(operation, 3, 1*time.Second); err != nil {
		return nil, err
	}

	// Convert entity.Machine to models.Machine
	machine := &models.Machine{}
	machine.FromEntity(entityMachine)

	return machine, nil
}

// DeployMachine deploys an allocated machine.
func (m *MaasClient) DeployMachine(systemID string, params *entity.MachineDeployParams) (*models.Machine, error) {
	if systemID == "" {
		return nil, fmt.Errorf("system ID is required")
	}

	var entityMachine *entity.Machine
	operation := func() error {
		var err error
		m.logger.WithFields(logrus.Fields{
			"system_id": systemID,
			"params":    fmt.Sprintf("%+v", params),
		}).Debug("Deploying MAAS machine")
		entityMachine, err = m.client.Machine.Deploy(systemID, params)
		if err != nil {
			m.logger.WithError(err).WithField("system_id", systemID).Error("Failed to deploy MAAS machine")
			return fmt.Errorf("MAAS API error deploying machine %s: %w", systemID, err)
		}
		return nil
	}

	if err := m.retry(operation, 3, 1*time.Second); err != nil {
		return nil, err
	}

	// Convert entity.Machine to models.Machine
	machine := &models.Machine{}
	machine.FromEntity(entityMachine)

	return machine, nil
}

// ReleaseMachine releases a machine back to the pool.
func (m *MaasClient) ReleaseMachine(systemIDs []string, comment string) error {
	if len(systemIDs) == 0 {
		return fmt.Errorf("at least one system ID is required")
	}

	operation := func() error {
		m.logger.WithFields(logrus.Fields{
			"system_ids": systemIDs,
			"comment":    comment,
		}).Debug("Releasing MAAS machine(s)")
		err := m.client.Machines.Release(systemIDs, comment)
		if err != nil {
			m.logger.WithError(err).WithField("system_ids", systemIDs).Error("Failed to release MAAS machine(s)")
			return fmt.Errorf("MAAS API error releasing machines %v: %w", systemIDs, err)
		}
		return nil
	}

	return m.retry(operation, 3, 1*time.Second)
}

// ==================== Network Operations ====================

// GetSubnet retrieves subnet details.
func (m *MaasClient) GetSubnet(id int) (*models.Subnet, error) {
	if id <= 0 {
		return nil, fmt.Errorf("valid subnet ID is required")
	}

	var entitySubnet *entity.Subnet
	operation := func() error {
		var err error
		m.logger.WithField("subnet_id", id).Debug("Getting MAAS subnet")
		entitySubnet, err = m.client.Subnet.Get(id)
		if err != nil {
			m.logger.WithError(err).WithField("subnet_id", id).Error("Failed to get MAAS subnet")
			return fmt.Errorf("MAAS API error getting subnet %d: %w", id, err)
		}
		return nil
	}

	if err := m.retry(operation, 3, 1*time.Second); err != nil {
		return nil, err
	}

	// Convert entity.Subnet to models.Subnet
	subnet := &models.Subnet{}
	subnet.FromEntity(entitySubnet)

	return subnet, nil
}

// ListSubnets retrieves all subnets.
func (m *MaasClient) ListSubnets() ([]models.Subnet, error) {
	var entitySubnets []entity.Subnet
	operation := func() error {
		var err error
		m.logger.Debug("Listing MAAS subnets")
		entitySubnets, err = m.client.Subnets.Get()
		if err != nil {
			m.logger.WithError(err).Error("Failed to list MAAS subnets")
			return fmt.Errorf("MAAS API error listing subnets: %w", err)
		}
		return nil
	}

	if err := m.retry(operation, 3, 1*time.Second); err != nil {
		return nil, err
	}

	// Convert entity.Subnet to models.Subnet
	subnets := make([]models.Subnet, len(entitySubnets))
	for i, entitySubnet := range entitySubnets {
		var subnet models.Subnet
		subnet.FromEntity(&entitySubnet)
		subnets[i] = subnet
	}

	return subnets, nil
}

// ListVLANs retrieves all VLANs.
func (m *MaasClient) ListVLANs(fabricID int) ([]models.VLAN, error) {
	var entityVLANs []entity.VLAN
	operation := func() error {
		var err error
		m.logger.WithField("fabric_id", fabricID).Debug("Listing MAAS VLANs")
		entityVLANs, err = m.client.VLANs.Get(fabricID)
		if err != nil {
			m.logger.WithError(err).WithField("fabric_id", fabricID).Error("Failed to list MAAS VLANs")
			return fmt.Errorf("MAAS API error listing VLANs for fabric %d: %w", fabricID, err)
		}
		return nil
	}

	if err := m.retry(operation, 3, 1*time.Second); err != nil {
		return nil, err
	}

	// Convert entity.VLAN to models.VLAN
	vlans := make([]models.VLAN, len(entityVLANs))
	for i, entityVLAN := range entityVLANs {
		var vlan models.VLAN
		vlan.FromEntity(&entityVLAN)
		vlans[i] = vlan
	}

	return vlans, nil
}

// ==================== Storage Operations ====================

// GetMachineBlockDevices retrieves block devices for a specific machine.
func (m *MaasClient) GetMachineBlockDevices(systemID string) ([]models.BlockDevice, error) {
	if systemID == "" {
		return nil, fmt.Errorf("system ID is required")
	}

	var entityDevices []entity.BlockDevice
	operation := func() error {
		var err error
		m.logger.WithField("system_id", systemID).Debug("Getting MAAS machine block devices")
		entityDevices, err = m.client.BlockDevices.Get(systemID)
		if err != nil {
			m.logger.WithError(err).WithField("system_id", systemID).Error("Failed to get MAAS machine block devices")
			return fmt.Errorf("MAAS API error getting block devices for machine %s: %w", systemID, err)
		}
		return nil
	}

	if err := m.retry(operation, 3, 1*time.Second); err != nil {
		return nil, err
	}

	// Convert entity.BlockDevice to models.BlockDevice
	devices := make([]models.BlockDevice, len(entityDevices))
	for i, entityDevice := range entityDevices {
		var device models.BlockDevice
		device.FromEntity(&entityDevice)
		devices[i] = device
	}

	return devices, nil
}

// ==================== Interface Operations ====================

// GetMachineInterfaces retrieves network interfaces for a specific machine.
func (m *MaasClient) GetMachineInterfaces(systemID string) ([]models.NetworkInterface, error) {
	if systemID == "" {
		return nil, fmt.Errorf("system ID is required")
	}

	var entityInterfaces []entity.NetworkInterface
	operation := func() error {
		var err error
		m.logger.WithField("system_id", systemID).Debug("Getting MAAS machine network interfaces")
		entityInterfaces, err = m.client.NetworkInterfaces.Get(systemID)
		if err != nil {
			m.logger.WithError(err).WithField("system_id", systemID).Error("Failed to get MAAS machine network interfaces")
			return fmt.Errorf("MAAS API error getting network interfaces for machine %s: %w", systemID, err)
		}
		return nil
	}

	if err := m.retry(operation, 3, 1*time.Second); err != nil {
		return nil, err
	}

	// Convert entity.NetworkInterface to models.NetworkInterface
	interfaces := make([]models.NetworkInterface, len(entityInterfaces))
	for i, entityInterface := range entityInterfaces {
		var iface models.NetworkInterface
		iface.FromEntity(&entityInterface)
		interfaces[i] = iface
	}

	return interfaces, nil
}

// ==================== Tag Operations ====================

// ListTags retrieves all tags.
func (m *MaasClient) ListTags() ([]models.Tag, error) {
	var entityTags []entity.Tag
	operation := func() error {
		var err error
		m.logger.Debug("Listing MAAS tags")
		entityTags, err = m.client.Tags.Get()
		if err != nil {
			m.logger.WithError(err).Error("Failed to list MAAS tags")
			return fmt.Errorf("MAAS API error listing tags: %w", err)
		}
		return nil
	}

	if err := m.retry(operation, 3, 1*time.Second); err != nil {
		return nil, err
	}

	// Convert entity.Tag to models.Tag
	tags := make([]models.Tag, len(entityTags))
	for i, entityTag := range entityTags {
		var tag models.Tag
		tag.FromEntity(&entityTag)
		tags[i] = tag
	}

	return tags, nil
}

// CreateTag creates a new tag.
func (m *MaasClient) CreateTag(name, comment, definition string) (*models.Tag, error) {
	if name == "" {
		return nil, fmt.Errorf("tag name is required")
	}

	var entityTag *entity.Tag
	operation := func() error {
		var err error
		m.logger.WithFields(logrus.Fields{
			"name":       name,
			"comment":    comment,
			"definition": definition,
		}).Debug("Creating MAAS tag")

		params := &entity.TagParams{
			Name: name,
		}
		if comment != "" {
			params.Comment = comment
		}
		if definition != "" {
			params.Definition = definition
		}
		entityTag, err = m.client.Tags.Create(params)
		if err != nil {
			m.logger.WithError(err).WithField("name", name).Error("Failed to create MAAS tag")
			return fmt.Errorf("MAAS API error creating tag %s: %w", name, err)
		}
		return nil
	}

	if err := m.retry(operation, 3, 1*time.Second); err != nil {
		return nil, err
	}

	// Convert entity.Tag to models.Tag
	tag := &models.Tag{}
	tag.FromEntity(entityTag)

	return tag, nil
}

// ApplyTagToMachine applies a tag to a machine.
func (m *MaasClient) ApplyTagToMachine(tagName, systemID string) error {
	if tagName == "" || systemID == "" {
		return fmt.Errorf("tag name and system ID are required")
	}

	operation := func() error {
		m.logger.WithFields(logrus.Fields{
			"tag_name":  tagName,
			"system_id": systemID,
		}).Debug("Applying tag to MAAS machine")

		err := m.client.Tag.AddMachines(tagName, []string{systemID})
		if err != nil {
			m.logger.WithError(err).WithFields(logrus.Fields{
				"tag_name":  tagName,
				"system_id": systemID,
			}).Error("Failed to apply tag to MAAS machine")
			return fmt.Errorf("MAAS API error applying tag %s to machine %s: %w", tagName, systemID, err)
		}
		return nil
	}

	return m.retry(operation, 3, 1*time.Second)
}

// RemoveTagFromMachine removes a tag from a machine.
func (m *MaasClient) RemoveTagFromMachine(tagName, systemID string) error {
	if tagName == "" || systemID == "" {
		return fmt.Errorf("tag name and system ID are required")
	}

	operation := func() error {
		m.logger.WithFields(logrus.Fields{
			"tag_name":  tagName,
			"system_id": systemID,
		}).Debug("Removing tag from MAAS machine")

		err := m.client.Tag.RemoveMachines(tagName, []string{systemID})
		if err != nil {
			m.logger.WithError(err).WithFields(logrus.Fields{
				"tag_name":  tagName,
				"system_id": systemID,
			}).Error("Failed to remove tag from MAAS machine")
			return fmt.Errorf("MAAS API error removing tag %s from machine %s: %w", tagName, systemID, err)
		}
		return nil
	}

	return m.retry(operation, 3, 1*time.Second)
}
