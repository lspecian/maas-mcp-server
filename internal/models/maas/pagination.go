package maas

// PaginationOptions represents pagination parameters for MAAS API requests
type PaginationOptions struct {
	// Limit is the maximum number of items to return
	Limit int

	// Offset is the number of items to skip
	Offset int

	// Page is the page number (1-based)
	Page int
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
