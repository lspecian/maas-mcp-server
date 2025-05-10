package models

import (
	"fmt"
	"time"
)

// MachineContext represents a machine in the MCP context
type MachineContext struct {
	ID           string            `json:"id"`
	Name         string            `json:"name"`
	Status       string            `json:"status"`
	Architecture string            `json:"architecture"`
	PowerState   string            `json:"power_state"`
	Zone         string            `json:"zone"`
	Pool         string            `json:"pool"`
	Tags         []string          `json:"tags"`
	Networks     []NetworkContext  `json:"networks"`
	Storage      []StorageContext  `json:"storage"`
	CPUCount     int               `json:"cpu_count"`
	Memory       int64             `json:"memory_mb"`
	OSInfo       OSInfo            `json:"os_info"`
	LastUpdated  time.Time         `json:"last_updated"`
	Metadata     map[string]string `json:"metadata,omitempty"`
}

// Validate checks if the MachineContext has all required fields
func (m *MachineContext) Validate() error {
	if m.ID == "" {
		return fmt.Errorf("machine id is required")
	}
	if m.Name == "" {
		return fmt.Errorf("machine name is required")
	}
	return nil
}

// OSInfo represents operating system information
type OSInfo struct {
	System       string `json:"system"`
	Distribution string `json:"distribution"`
	Release      string `json:"release"`
	Version      string `json:"version,omitempty"`
}

// NetworkContext represents a network interface in the MCP context
type NetworkContext struct {
	ID         string   `json:"id"`
	Name       string   `json:"name"`
	Type       string   `json:"type"`
	MACAddress string   `json:"mac_address"`
	IPAddress  string   `json:"ip_address,omitempty"`
	CIDR       string   `json:"cidr,omitempty"`
	Subnet     string   `json:"subnet,omitempty"`
	VLAN       string   `json:"vlan,omitempty"`
	VLANTag    int      `json:"vlan_tag,omitempty"`
	MTU        int      `json:"mtu,omitempty"`
	Enabled    bool     `json:"enabled"`
	Primary    bool     `json:"primary"`
	Tags       []string `json:"tags,omitempty"`
}

// Validate checks if the NetworkContext has all required fields
func (n *NetworkContext) Validate() error {
	if n.ID == "" {
		return fmt.Errorf("network id is required")
	}
	if n.Name == "" {
		return fmt.Errorf("network name is required")
	}
	if n.MACAddress == "" {
		return fmt.Errorf("network mac_address is required")
	}
	return nil
}

// StorageContext represents a storage device in the MCP context
type StorageContext struct {
	ID            string              `json:"id"`
	Name          string              `json:"name"`
	Type          string              `json:"type"`
	Path          string              `json:"path"`
	Size          int64               `json:"size_bytes"`
	UsedSize      int64               `json:"used_bytes"`
	AvailableSize int64               `json:"available_bytes"`
	Model         string              `json:"model,omitempty"`
	Serial        string              `json:"serial,omitempty"`
	Partitions    []PartitionContext  `json:"partitions,omitempty"`
	Filesystem    *FilesystemContext  `json:"filesystem,omitempty"`
	Tags          []string            `json:"tags,omitempty"`
	Mountpoints   []MountpointContext `json:"mountpoints,omitempty"`
}

// Validate checks if the StorageContext has all required fields
func (s *StorageContext) Validate() error {
	if s.ID == "" {
		return fmt.Errorf("storage id is required")
	}
	if s.Name == "" {
		return fmt.Errorf("storage name is required")
	}
	return nil
}

// PartitionContext represents a partition in the MCP context
type PartitionContext struct {
	ID         string             `json:"id"`
	Number     int                `json:"number"`
	Size       int64              `json:"size_bytes"`
	Path       string             `json:"path"`
	Filesystem *FilesystemContext `json:"filesystem,omitempty"`
}

// FilesystemContext represents a filesystem in the MCP context
type FilesystemContext struct {
	Type         string `json:"type"`
	UUID         string `json:"uuid,omitempty"`
	Label        string `json:"label,omitempty"`
	MountPoint   string `json:"mount_point,omitempty"`
	MountOptions string `json:"mount_options,omitempty"`
}

// MountpointContext represents a mountpoint in the MCP context
type MountpointContext struct {
	Path    string `json:"path"`
	Options string `json:"options,omitempty"`
	Device  string `json:"device"`
}

// TagContext represents a tag in the MCP context
type TagContext struct {
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	Color       string `json:"color,omitempty"`
	Category    string `json:"category,omitempty"`
}

// Validate checks if the TagContext has all required fields
func (t *TagContext) Validate() error {
	if t.Name == "" {
		return fmt.Errorf("tag name is required")
	}
	// Tag names should be alphanumeric with dashes and underscores
	if !isValidTagName(t.Name) {
		return fmt.Errorf("tag name must contain only alphanumeric characters, dashes, and underscores")
	}
	return nil
}

// MCPDiscoveryResponse represents the response for the MCP discovery endpoint
// Following the MCP specification at https://modelcontextprotocol.io/specification/2024-11-05
type MCPDiscoveryResponse struct {
	Jsonrpc string `json:"jsonrpc"`
	Result  struct {
		ServerInfo struct {
			Name    string `json:"name"`
			Version string `json:"version"`
		} `json:"serverInfo"`
		Capabilities struct {
			Tools     []MCPTool     `json:"tools,omitempty"`
			Resources []MCPResource `json:"resources,omitempty"`
		} `json:"capabilities"`
	} `json:"result"`
	ID string `json:"id"`
}

// MCPTool represents a tool provided by the MCP server
type MCPTool struct {
	Name        string      `json:"name"`
	Description string      `json:"description"`
	InputSchema interface{} `json:"input_schema"`
}

// MCPResource represents a resource provided by the MCP server
type MCPResource struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	URIPattern  string `json:"uri_pattern"`
}

// MaasConfig represents the MAAS configuration passed from the TypeScript wrapper
type MaasConfig struct {
	APIURL string `json:"apiUrl"`
	APIKey string `json:"apiKey"`
}

// ListMachinesRequest represents the request for listing machines
type ListMachinesRequest struct {
	Filters    map[string]string `json:"filters,omitempty"`
	MaasConfig *MaasConfig       `json:"_maasConfig,omitempty"`
}

// GetMachineDetailsRequest represents the request for getting machine details
type GetMachineDetailsRequest struct {
	SystemID   string      `json:"system_id"`
	MaasConfig *MaasConfig `json:"_maasConfig,omitempty"`
}

// AllocateMachineRequest represents the request for allocating a machine
type AllocateMachineRequest struct {
	Constraints map[string]string `json:"constraints,omitempty"`
	Tags        []string          `json:"tags,omitempty"`
	MaasConfig  *MaasConfig       `json:"_maasConfig,omitempty"`
}

// DeployMachineRequest represents the request for deploying a machine
type DeployMachineRequest struct {
	SystemID   string      `json:"system_id"`
	OSName     string      `json:"os_name,omitempty"`
	Kernel     string      `json:"kernel,omitempty"`
	MaasConfig *MaasConfig `json:"_maasConfig,omitempty"`
}

// ReleaseMachineRequest represents the request for releasing a machine
type ReleaseMachineRequest struct {
	SystemID   string      `json:"system_id"`
	MaasConfig *MaasConfig `json:"_maasConfig,omitempty"`
}

// GetMachinePowerStateRequest represents the request for getting machine power state
type GetMachinePowerStateRequest struct {
	SystemID   string      `json:"system_id"`
	MaasConfig *MaasConfig `json:"_maasConfig,omitempty"`
}

// ListSubnetsRequest represents the request for listing subnets
type ListSubnetsRequest struct {
	FabricID   int         `json:"fabric_id,omitempty"`
	MaasConfig *MaasConfig `json:"_maasConfig,omitempty"`
}

// GetSubnetDetailsRequest represents the request for getting subnet details
type GetSubnetDetailsRequest struct {
	SubnetID   int         `json:"subnet_id"`
	MaasConfig *MaasConfig `json:"_maasConfig,omitempty"`
}

// PowerOnMachineRequest represents the request for powering on a machine
type PowerOnMachineRequest struct {
	SystemID   string      `json:"system_id"`
	MaasConfig *MaasConfig `json:"_maasConfig,omitempty"`
}

// PowerOffMachineRequest represents the request for powering off a machine
type PowerOffMachineRequest struct {
	SystemID   string      `json:"system_id"`
	MaasConfig *MaasConfig `json:"_maasConfig,omitempty"`
}
