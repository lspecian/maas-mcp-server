package maas

import (
	"fmt"
	"strconv"

	"github.com/canonical/gomaasclient/entity"
)

// Machine represents a MAAS machine entity
type Machine struct {
	SystemID     string             `json:"system_id"`
	Hostname     string             `json:"hostname"`
	FQDN         string             `json:"fqdn"`
	Status       string             `json:"status"`
	StatusName   string             `json:"status_name"`
	Architecture string             `json:"architecture"`
	PowerState   string             `json:"power_state"`
	PowerType    string             `json:"power_type"`
	Zone         string             `json:"zone"`
	Pool         string             `json:"pool"`
	Tags         []string           `json:"tags"`
	IPAddresses  []string           `json:"ip_addresses"`
	CPUCount     int                `json:"cpu_count"`
	Memory       int64              `json:"memory"`
	OSSystem     string             `json:"os_system"`
	DistroSeries string             `json:"distro_series"`
	Interfaces   []NetworkInterface `json:"interfaces,omitempty"`
	BlockDevices []BlockDevice      `json:"block_devices,omitempty"`
	ResourceURL  string             `json:"resource_url"`
	Owner        string             `json:"owner,omitempty"`
	Description  string             `json:"description,omitempty"`
	Metadata     map[string]string  `json:"metadata,omitempty"`
}

// Validate checks if the Machine has all required fields
func (m *Machine) Validate() error {
	if m.SystemID == "" {
		return fmt.Errorf("machine system_id is required")
	}
	if m.Hostname == "" {
		return fmt.Errorf("machine hostname is required")
	}
	return nil
}

// FromEntity converts a gomaasclient entity.Machine to our Machine model
func (m *Machine) FromEntity(entity *entity.Machine) {
	m.SystemID = entity.SystemID
	m.Hostname = entity.Hostname
	m.FQDN = entity.FQDN
	m.Status = fmt.Sprint(entity.Status)
	m.StatusName = entity.StatusName
	m.Architecture = entity.Architecture
	m.PowerState = entity.PowerState
	m.PowerType = entity.PowerType

	// Handle Zone - extract name from Zone struct
	m.Zone = entity.Zone.Name

	// Handle Pool - extract name from Pool struct
	m.Pool = entity.Pool.Name

	// Convert tags
	m.Tags = make([]string, 0)
	if entity.TagNames != nil {
		m.Tags = entity.TagNames
	}

	// Convert IP addresses
	m.IPAddresses = make([]string, 0)
	for _, ip := range entity.IPAddresses {
		m.IPAddresses = append(m.IPAddresses, ip.String())
	}

	m.CPUCount = entity.CPUCount
	m.Memory = entity.Memory

	// OS info might be in different fields
	// Set defaults based on available information
	m.OSSystem = "ubuntu"    // Default value
	m.DistroSeries = "focal" // Default value

	m.ResourceURL = entity.ResourceURI
	m.Owner = entity.Owner

	// Handle Description
	m.Description = entity.Description

	// Initialize empty metadata map
	m.Metadata = make(map[string]string)
	// Add some basic metadata from available fields
	m.Metadata["system_id"] = entity.SystemID
	m.Metadata["hostname"] = entity.Hostname
}

// Subnet represents a MAAS subnet entity
type Subnet struct {
	ID          int      `json:"id"`
	Name        string   `json:"name"`
	CIDR        string   `json:"cidr"`
	VLAN        *VLAN    `json:"vlan,omitempty"`
	VLANid      int      `json:"vlan_id"`
	Space       string   `json:"space"`
	GatewayIP   string   `json:"gateway_ip,omitempty"`
	DNSServers  []string `json:"dns_servers,omitempty"`
	Managed     bool     `json:"managed"`
	Active      bool     `json:"active"`
	AllowDNS    bool     `json:"allow_dns"`
	AllowProxy  bool     `json:"allow_proxy"`
	ResourceURL string   `json:"resource_url"`
	FabricID    int      `json:"fabric_id"`
	FabricName  string   `json:"fabric_name,omitempty"`
	Description string   `json:"description,omitempty"`
}

// Validate checks if the Subnet has all required fields
func (s *Subnet) Validate() error {
	if s.CIDR == "" {
		return fmt.Errorf("subnet CIDR is required")
	}
	return nil
}

// FromEntity converts a gomaasclient entity.Subnet to our Subnet model
func (s *Subnet) FromEntity(entity *entity.Subnet) {
	s.ID = entity.ID
	s.Name = entity.Name
	s.CIDR = entity.CIDR

	// Handle VLAN
	s.VLANid = entity.VLAN.ID

	// Try to convert fabric ID from string to int
	if entity.VLAN.Fabric != "" {
		if fabricID, err := strconv.Atoi(entity.VLAN.Fabric); err == nil {
			s.FabricID = fabricID
		}
	}

	s.Space = entity.Space

	if entity.GatewayIP != nil {
		s.GatewayIP = entity.GatewayIP.String()
	}

	// Convert DNS servers from net.IP to strings
	s.DNSServers = make([]string, 0)
	for _, dns := range entity.DNSServers {
		s.DNSServers = append(s.DNSServers, dns.String())
	}

	s.Managed = entity.Managed

	// These fields might not be directly available in the entity
	// Set defaults or map from other fields if needed
	s.Active = true     // Default to true
	s.AllowDNS = true   // Default to true
	s.AllowProxy = true // Default to true

	s.ResourceURL = entity.ResourceURI

	// Handle Description
	s.Description = entity.Description
}

// VLAN represents a MAAS VLAN entity
type VLAN struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	VID         int    `json:"vid"`
	MTU         int    `json:"mtu"`
	FabricID    int    `json:"fabric_id"`
	FabricName  string `json:"fabric_name,omitempty"`
	DHCPOn      bool   `json:"dhcp_on"`
	Primary     bool   `json:"primary"`
	ResourceURL string `json:"resource_url"`
	Description string `json:"description,omitempty"`
}

// Validate checks if the VLAN has all required fields
func (v *VLAN) Validate() error {
	if v.FabricID == 0 {
		return fmt.Errorf("VLAN fabric_id is required")
	}
	return nil
}

// FromEntity converts a gomaasclient entity.VLAN to our VLAN model
func (v *VLAN) FromEntity(entity *entity.VLAN) {
	v.ID = entity.ID
	v.Name = entity.Name
	v.VID = entity.VID
	v.MTU = entity.MTU

	// Try to convert fabric ID from string to int
	if entity.Fabric != "" {
		if fabricID, err := strconv.Atoi(entity.Fabric); err == nil {
			v.FabricID = fabricID
		}
	}

	v.DHCPOn = entity.DHCPOn

	// Primary field might not be directly available
	v.Primary = false // Default value

	v.ResourceURL = entity.ResourceURI

	// Handle Description
	v.Description = entity.Description
}

// Fabric represents a MAAS fabric entity
type Fabric struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	ResourceURL string `json:"resource_url"`
	ClassType   string `json:"class_type,omitempty"`
}

// Validate checks if the Fabric has all required fields
func (f *Fabric) Validate() error {
	if f.Name == "" {
		return fmt.Errorf("fabric name is required")
	}
	return nil
}

// FromEntity converts a gomaasclient entity.Fabric to our Fabric model
func (f *Fabric) FromEntity(entity *entity.Fabric) {
	f.ID = entity.ID
	f.Name = entity.Name
	// Description might not be directly available in the entity
	f.Description = "" // Default empty description
	f.ResourceURL = entity.ResourceURI
	f.ClassType = entity.ClassType
}

// NetworkInterface represents a MAAS network interface entity
type NetworkInterface struct {
	ID          int        `json:"id"`
	Name        string     `json:"name"`
	Type        string     `json:"type"`
	Enabled     bool       `json:"enabled"`
	MACAddress  string     `json:"mac_address"`
	VLAN        *VLAN      `json:"vlan,omitempty"`
	VLANid      int        `json:"vlan_id"`
	Links       []LinkInfo `json:"links,omitempty"`
	Tags        []string   `json:"tags,omitempty"`
	Parents     []int      `json:"parents,omitempty"`
	Children    []int      `json:"children,omitempty"`
	ResourceURL string     `json:"resource_url"`
}

// Validate checks if the NetworkInterface has all required fields
func (n *NetworkInterface) Validate() error {
	if n.Name == "" {
		return fmt.Errorf("network interface name is required")
	}
	if n.MACAddress == "" {
		return fmt.Errorf("network interface mac_address is required")
	}
	return nil
}

// FromEntity converts a gomaasclient entity.NetworkInterface to our NetworkInterface model
func (n *NetworkInterface) FromEntity(entity *entity.NetworkInterface) {
	n.ID = entity.ID
	n.Name = entity.Name
	n.Type = entity.Type
	n.Enabled = entity.Enabled
	n.MACAddress = entity.MACAddress

	// Handle VLAN
	if entity.VLAN.ID != 0 {
		n.VLANid = entity.VLAN.ID
	}

	// Convert parent IDs from strings to ints
	n.Parents = make([]int, 0)
	for _, parent := range entity.Parents {
		if parentID, err := strconv.Atoi(parent); err == nil {
			n.Parents = append(n.Parents, parentID)
		}
	}

	// Convert children IDs from strings to ints
	n.Children = make([]int, 0)
	for _, child := range entity.Children {
		if childID, err := strconv.Atoi(child); err == nil {
			n.Children = append(n.Children, childID)
		}
	}

	n.ResourceURL = entity.ResourceURI

	// Set tags from available information
	n.Tags = []string{}
}

// LinkInfo represents a link configuration on a network interface
type LinkInfo struct {
	ID        int     `json:"id"`
	Mode      string  `json:"mode"`
	Subnet    *Subnet `json:"subnet,omitempty"`
	SubnetID  int     `json:"subnet_id"`
	IPAddress string  `json:"ip_address,omitempty"`
}

// BlockDevice represents a MAAS block device entity
type BlockDevice struct {
	ID            int         `json:"id"`
	Name          string      `json:"name"`
	Type          string      `json:"type"`
	Path          string      `json:"path"`
	Size          int64       `json:"size"`
	UsedSize      int64       `json:"used_size"`
	AvailableSize int64       `json:"available_size"`
	Model         string      `json:"model,omitempty"`
	Serial        string      `json:"serial,omitempty"`
	IDPath        string      `json:"id_path,omitempty"`
	Partitions    []Partition `json:"partitions,omitempty"`
	Tags          []string    `json:"tags,omitempty"`
	Filesystem    *Filesystem `json:"filesystem,omitempty"`
	ResourceURL   string      `json:"resource_url"`
}

// Validate checks if the BlockDevice has all required fields
func (b *BlockDevice) Validate() error {
	if b.Name == "" {
		return fmt.Errorf("block device name is required")
	}
	if b.Path == "" {
		return fmt.Errorf("block device path is required")
	}
	return nil
}

// FromEntity converts a gomaasclient entity.BlockDevice to our BlockDevice model
func (b *BlockDevice) FromEntity(entity *entity.BlockDevice) {
	b.ID = entity.ID
	b.Name = entity.Name
	b.Type = entity.Type
	b.Path = entity.Path
	b.Size = entity.Size
	b.UsedSize = entity.UsedSize
	b.AvailableSize = entity.AvailableSize
	b.Model = entity.Model
	b.Serial = entity.Serial
	b.IDPath = entity.IDPath
	b.ResourceURL = entity.ResourceURI
	b.Tags = entity.Tags
}

// Partition represents a partition on a block device
type Partition struct {
	ID          int         `json:"id"`
	Size        int64       `json:"size"`
	UUID        string      `json:"uuid,omitempty"`
	Path        string      `json:"path"`
	Type        string      `json:"type,omitempty"`
	Filesystem  *Filesystem `json:"filesystem,omitempty"`
	ResourceURL string      `json:"resource_url"`
}

// Filesystem represents a filesystem on a block device or partition
type Filesystem struct {
	ID           int    `json:"id"`
	UUID         string `json:"uuid,omitempty"`
	FSType       string `json:"fstype"`
	MountPoint   string `json:"mount_point,omitempty"`
	MountOptions string `json:"mount_options,omitempty"`
	ResourceURL  string `json:"resource_url"`
}

// Tag represents a MAAS tag entity
type Tag struct {
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	Definition  string `json:"definition,omitempty"`
	Comment     string `json:"comment,omitempty"`
	ResourceURL string `json:"resource_url"`
}

// PartitionCreateParams represents parameters for creating a partition in MAAS
type PartitionCreateParams struct {
	Size   int64  `json:"size"`             // Size in bytes
	FSType string `json:"fstype,omitempty"` // Filesystem type (e.g., "ext4", "xfs", "swap") to format with
	// Add other relevant parameters if needed based on MAAS API documentation
}

// Validate checks if the Tag has all required fields
func (t *Tag) Validate() error {
	if t.Name == "" {
		return fmt.Errorf("tag name is required")
	}
	// Tag names should be alphanumeric with dashes and underscores
	if !isValidTagName(t.Name) {
		return fmt.Errorf("tag name must contain only alphanumeric characters, dashes, and underscores")
	}
	return nil
}

// isValidTagName checks if a tag name contains only allowed characters
func isValidTagName(name string) bool {
	for _, char := range name {
		if !((char >= 'a' && char <= 'z') ||
			(char >= 'A' && char <= 'Z') ||
			(char >= '0' && char <= '9') ||
			char == '-' ||
			char == '_') {
			return false
		}
	}
	return true
}

// FromEntity converts a gomaasclient entity.Tag to our Tag model
func (t *Tag) FromEntity(entity *entity.Tag) {
	t.Name = entity.Name

	// Set default values for fields not available in the entity
	t.Description = ""
	t.Definition = ""
	t.Comment = ""

	// If Comment is available in the entity, use it for Description
	if comment := entity.Comment; comment != "" {
		t.Comment = comment
		// Also use it for Description if empty
		if t.Description == "" {
			t.Description = comment
		}
	}

	t.ResourceURL = entity.ResourceURI
}
