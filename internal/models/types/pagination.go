package types

// PaginationOptions represents pagination options for API requests
type PaginationOptions struct {
	Page     int `json:"page"`
	PageSize int `json:"page_size"`
}

// NewPaginationOptions creates a new PaginationOptions with default values
func NewPaginationOptions() *PaginationOptions {
	return &PaginationOptions{
		Page:     1,
		PageSize: 20,
	}
}

// Offset returns the offset for database queries
func (p *PaginationOptions) Offset() int {
	return (p.Page - 1) * p.PageSize
}

// Limit returns the limit for database queries
func (p *PaginationOptions) Limit() int {
	return p.PageSize
}
