package models

// MachineListingRequest represents the request parameters for listing machines
type MachineListingRequest struct {
	// Hostname filter for machines
	Hostname string `json:"hostname,omitempty"`

	// Zone filter for machines
	Zone string `json:"zone,omitempty"`

	// Pool filter for machines
	Pool string `json:"pool,omitempty"`

	// Status filter for machines
	Status string `json:"status,omitempty"`

	// PowerState filter for machines
	PowerState string `json:"power_state,omitempty"`

	// SystemID filter for machines
	SystemID string `json:"system_id,omitempty"`

	// Architecture filter for machines
	Architecture string `json:"architecture,omitempty"`

	// Tags filter for machines
	Tags []string `json:"tags,omitempty"`

	// Storage constraints for filtering machines
	StorageConstraints *SimpleStorageConstraint `json:"storage_constraints,omitempty"`

	// Pagination parameters
	Limit  int `json:"limit,omitempty"`
	Offset int `json:"offset,omitempty"`
	Page   int `json:"page,omitempty"`
}

// MachineDiscoveryRequest represents the request parameters for discovering machines
type MachineDiscoveryRequest struct {
	// CommissioningEnabled indicates whether to commission discovered machines
	CommissioningEnabled bool `json:"commissioning_enabled,omitempty"`

	// ScanNetworks indicates whether to scan networks during discovery
	ScanNetworks bool `json:"scan_networks,omitempty"`

	// ScanStorage indicates whether to scan storage during discovery
	ScanStorage bool `json:"scan_storage,omitempty"`
}

// MachineListingResponse represents the response for listing machines
type MachineListingResponse struct {
	// The list of machines
	Machines []MachineContext `json:"machines"`

	// Pagination metadata
	TotalCount int `json:"total_count"`
	Limit      int `json:"limit,omitempty"`
	Offset     int `json:"offset,omitempty"`
	Page       int `json:"page,omitempty"`
	PageCount  int `json:"page_count,omitempty"`
}

// MachineDiscoveryResponse represents the response for discovering machines
type MachineDiscoveryResponse struct {
	// The number of machines discovered
	DiscoveredCount int `json:"discovered_count"`

	// The list of newly discovered machines
	DiscoveredMachines []MachineContext `json:"discovered_machines,omitempty"`

	// Status of the discovery operation
	Status string `json:"status"`
}
