package models

// PaginationOptions represents pagination parameters for API requests
type PaginationOptions struct {
	// Limit is the maximum number of items to return
	Limit int `json:"limit"`

	// Offset is the number of items to skip
	Offset int `json:"offset"`

	// Page is the page number (1-based)
	Page int `json:"page"`
}

// NewPaginationOptions creates a new PaginationOptions with default values
func NewPaginationOptions() *PaginationOptions {
	return &PaginationOptions{
		Limit:  50,
		Offset: 0,
		Page:   1,
	}
}

// WithLimit sets the limit and returns the options
func (p *PaginationOptions) WithLimit(limit int) *PaginationOptions {
	p.Limit = limit
	return p
}

// WithOffset sets the offset and returns the options
func (p *PaginationOptions) WithOffset(offset int) *PaginationOptions {
	p.Offset = offset
	// Update page based on offset and limit
	if p.Limit > 0 {
		p.Page = (offset / p.Limit) + 1
	}
	return p
}

// WithPage sets the page and returns the options
func (p *PaginationOptions) WithPage(page int) *PaginationOptions {
	p.Page = page
	// Update offset based on page and limit
	p.Offset = (page - 1) * p.Limit
	return p
}

// PaginatedMachines represents a paginated list of machines
type PaginatedMachines struct {
	// The list of machines
	Machines []MachineContext `json:"machines"`

	// Pagination metadata
	TotalCount int `json:"total_count"`
	Limit      int `json:"limit"`
	Offset     int `json:"offset"`
	Page       int `json:"page"`
	PageCount  int `json:"page_count"`
}

// MachineDiscoveryOptions represents options for machine discovery
type MachineDiscoveryOptions struct {
	// CommissioningEnabled indicates whether to commission discovered machines
	CommissioningEnabled bool `json:"commissioning_enabled"`

	// ScanNetworks indicates whether to scan networks during discovery
	ScanNetworks bool `json:"scan_networks"`

	// ScanStorage indicates whether to scan storage during discovery
	ScanStorage bool `json:"scan_storage"`
}

// MachineDiscoveryResult represents the result of a machine discovery operation
type MachineDiscoveryResult struct {
	// The number of machines discovered
	DiscoveredCount int `json:"discovered_count"`

	// The list of newly discovered machines
	DiscoveredMachines []MachineContext `json:"discovered_machines,omitempty"`

	// Status of the discovery operation
	Status string `json:"status"`
}
