package mcp

// --- Request Structs ---

// ListMachinesRequest defines parameters for the maas_list_machines tool.
type ListMachinesRequest struct {
	Tags     []string `json:"tags,omitempty"` // Changed to []string to match PRD Table 2 & gomaasclient.MachinesParams
	Zone     string   `json:"zone,omitempty"`
	Hostname string   `json:"hostname,omitempty"` // Assuming single hostname, PRD Table 2 implies optional filter
	Status   string   `json:"status,omitempty"`
	// Add other potential filters based on gomaasclient.MachinesParams
}

// GetMachineDetailsRequest defines parameters for maas_get_machine_details.
type GetMachineDetailsRequest struct {
	SystemID string `json:"system_id" binding:"required"`
}

// AllocateMachineRequest defines parameters for maas_allocate_machine.
type AllocateMachineRequest struct {
	Hostname     string   `json:"hostname,omitempty"`
	MinCPUCount  int      `json:"min_cpu_count,omitempty"`
	MinMemory    int      `json:"min_memory,omitempty"` // In MB
	Tags         []string `json:"tags,omitempty"`       // Changed to []string
	Zone         string   `json:"zone,omitempty"`
	Pool         string   `json:"pool,omitempty"`
	Architecture string   `json:"architecture,omitempty"`
	// Map directly to entity.MachineAllocateParams fields where possible [56]
}

// DeployMachineRequest defines parameters for maas_deploy_machine.
type DeployMachineRequest struct {
	SystemID     string `json:"system_id" binding:"required"`
	DistroSeries string `json:"distro_series,omitempty"`
	UserData     string `json:"user_data,omitempty"` // Base64 encoded cloud-init script?
	HWEKernel    string `json:"hwe_kernel,omitempty"`
	// Map directly to entity.MachineDeployParams fields where possible [56]
}

// ReleaseMachineRequest defines parameters for maas_release_machine.
type ReleaseMachineRequest struct {
	SystemID string `json:"system_id" binding:"required"`
	Comment  string `json:"comment,omitempty"`
}

// GetMachinePowerStateRequest defines parameters for maas_get_machine_power_state.
type GetMachinePowerStateRequest struct {
	SystemID string `json:"system_id" binding:"required"`
}

// PowerOnMachineRequest defines parameters for maas_power_on_machine.
type PowerOnMachineRequest struct {
	SystemID string `json:"system_id" binding:"required"`
}

// PowerOffMachineRequest defines parameters for maas_power_off_machine.
type PowerOffMachineRequest struct {
	SystemID string `json:"system_id" binding:"required"`
}

// ListSubnetsRequest defines parameters for maas_list_subnets.
type ListSubnetsRequest struct {
	FabricID int `json:"fabric_id,omitempty"` // PRD Table 2 indicates optional fabric_id (int)
}

// GetSubnetDetailsRequest defines parameters for maas_get_subnet_details.
type GetSubnetDetailsRequest struct {
	SubnetID int    `json:"subnet_id,omitempty"` // PRD Table 2 indicates subnet_id (int) or cidr (string)
	CIDR     string `json:"cidr,omitempty"`
}

// --- Response Structs (Examples - Define based on required output) ---

// MachineSummary is a simplified view of a machine for list responses.
type MachineSummary struct {
	SystemID   string   `json:"id"`   // Changed from system_id
	Hostname   string   `json:"name"` // Changed from hostname
	FQDN       string   `json:"fqdn"`
	Status     string   `json:"status"` // Map from MAAS status codes/names
	Zone       string   `json:"zone"`
	Pool       string   `json:"pool"`
	Tags       []string `json:"tags"` // Changed to []string
	PowerState string   `json:"power_state"`
}

// MachineDetails includes more comprehensive machine information.
type MachineDetails struct {
	SystemID          string            `json:"id"`   // Changed from system_id
	Hostname          string            `json:"name"` // Changed from hostname
	FQDN              string            `json:"fqdn"`
	Status            string            `json:"status"`
	Zone              string            `json:"zone"`
	Pool              string            `json:"pool"`
	Tags              []string          `json:"tags"` // Changed to []string
	PowerState        string            `json:"power_state"`
	CPUCount          int               `json:"cpu_count"`
	MemoryMB          int64             `json:"memory_mb"`
	Architecture      string            `json:"architecture"`
	IPAddresses       []string          `json:"ip_addresses"`                 // Changed to []string
	OSSystem          string            `json:"os_system"`                    // e.g., "ubuntu"
	DistroSeries      string            `json:"distro_series"`                // e.g., "focal"
	NetworkInterfaces []InterfaceInfo   `json:"network_interfaces,omitempty"` // Changed to slice
	BlockDevices      []BlockDeviceInfo `json:"block_devices,omitempty"`      // Changed to slice
	// Add other relevant fields from entity.Machine
}

// InterfaceInfo represents network interface details.
type InterfaceInfo struct {
	ID         string     `json:"id"` // Changed from int to string
	Name       string     `json:"name"`
	Type       string     `json:"type"` // physical, bond, bridge, vlan
	MACAddress string     `json:"mac_address"`
	Links      []LinkInfo `json:"links,omitempty"` // Changed to slice
	// Add other relevant fields like MTU, parent IDs etc. from entity.NetworkInterface
}

// LinkInfo represents a link configuration on an interface.
type LinkInfo struct {
	ID         int    `json:"id"`
	Mode       string `json:"mode"` // static, dhcp, auto, link_up
	SubnetCIDR string `json:"subnet_cidr"`
	IPAddress  string `json:"ip_address,omitempty"`
}

// BlockDeviceInfo represents storage device details.
type BlockDeviceInfo struct {
	ID         string `json:"id"` // Changed from int to string
	Name       string `json:"name"`
	Type       string `json:"type"`       // physical, virtual
	Size       int64  `json:"size_bytes"` // Use int64 for potentially large sizes
	Path       string `json:"path"`
	Model      string `json:"model,omitempty"`
	Serial     string `json:"serial,omitempty"`
	Filesystem string `json:"filesystem,omitempty"`
	MountPoint string `json:"mount_point,omitempty"`
	// Add other relevant fields from entity.BlockDevice
}

// SubnetDetails represents subnet information.
type SubnetDetails struct {
	ID             string        `json:"id"` // Changed from int to string
	CIDR           string        `json:"cidr"`
	Name           string        `json:"name"`
	Fabric         string        `json:"fabric"` // Fabric name
	VLAN           string        `json:"vlan"`   // VLAN name/tag
	Space          string        `json:"space"`
	GatewayIP      string        `json:"gateway_ip,omitempty"`
	DNSServers     []string      `json:"dns_servers,omitempty"` // Changed to []string
	Managed        bool          `json:"managed"`
	ReservedRanges []IPRangeInfo `json:"reserved_ranges,omitempty"` // Changed to slice
	DynamicRanges  []IPRangeInfo `json:"dynamic_ranges,omitempty"`  // Changed to slice
	// Add other relevant fields from entity.Subnet
}

// IPRangeInfo represents details of an IP range within a subnet.
type IPRangeInfo struct {
	Type    string `json:"type"` // reserved, dynamic
	StartIP string `json:"start_ip"`
	EndIP   string `json:"end_ip"`
	Comment string `json:"comment,omitempty"`
}
