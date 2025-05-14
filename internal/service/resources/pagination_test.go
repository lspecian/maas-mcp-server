package resources

import (
	"reflect"
	"testing"
)

func TestParsePaginationParams(t *testing.T) {
	tests := []struct {
		name        string
		queryParams map[string]string
		want        *PaginationOptions
		wantErr     bool
	}{
		{
			name:        "Empty query params",
			queryParams: map[string]string{},
			want:        NewPaginationOptions(),
			wantErr:     false,
		},
		{
			name: "Valid limit",
			queryParams: map[string]string{
				"limit": "20",
			},
			want: &PaginationOptions{
				Limit:  20,
				Offset: 0,
				Page:   1,
			},
			wantErr: false,
		},
		{
			name: "Valid offset",
			queryParams: map[string]string{
				"offset": "40",
			},
			want: &PaginationOptions{
				Limit:  DefaultLimit,
				Offset: 40,
				Page:   1, // (40 / 50) + 1 = 1.8 -> 1
			},
			wantErr: false,
		},
		{
			name: "Valid page",
			queryParams: map[string]string{
				"page": "3",
			},
			want: &PaginationOptions{
				Limit:  DefaultLimit,
				Offset: 100, // (3-1) * 50 = 100
				Page:   3,
			},
			wantErr: false,
		},
		{
			name: "Limit and page",
			queryParams: map[string]string{
				"limit": "10",
				"page":  "5",
			},
			want: &PaginationOptions{
				Limit:  10,
				Offset: 40, // (5-1) * 10 = 40
				Page:   5,
			},
			wantErr: false,
		},
		{
			name: "Limit exceeds max",
			queryParams: map[string]string{
				"limit": "2000",
			},
			want: &PaginationOptions{
				Limit:  MaxLimit,
				Offset: 0,
				Page:   1,
			},
			wantErr: false,
		},
		{
			name: "Invalid limit",
			queryParams: map[string]string{
				"limit": "invalid",
			},
			want:    nil,
			wantErr: true,
		},
		{
			name: "Invalid offset",
			queryParams: map[string]string{
				"offset": "invalid",
			},
			want:    nil,
			wantErr: true,
		},
		{
			name: "Invalid page",
			queryParams: map[string]string{
				"page": "invalid",
			},
			want:    nil,
			wantErr: true,
		},
		{
			name: "Negative limit",
			queryParams: map[string]string{
				"limit": "-10",
			},
			want:    nil,
			wantErr: true,
		},
		{
			name: "Negative offset",
			queryParams: map[string]string{
				"offset": "-10",
			},
			want:    nil,
			wantErr: true,
		},
		{
			name: "Zero page",
			queryParams: map[string]string{
				"page": "0",
			},
			want:    nil,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ParsePaginationParams(tt.queryParams)
			if (err != nil) != tt.wantErr {
				t.Errorf("ParsePaginationParams() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if tt.wantErr {
				return
			}
			if got.Limit != tt.want.Limit || got.Offset != tt.want.Offset || got.Page != tt.want.Page {
				t.Errorf("ParsePaginationParams() = %+v, want %+v", got, tt.want)
			}
		})
	}
}

func TestApplyPagination(t *testing.T) {
	// Create a test slice with 100 items
	resources := make([]testResource, 100)
	for i := 0; i < 100; i++ {
		resources[i] = testResource{
			ID:     i + 1,
			Name:   "test",
			Status: "active",
			Count:  i * 10,
		}
	}

	tests := []struct {
		name    string
		options *PaginationOptions
		want    *PaginatedResult
		wantErr bool
	}{
		{
			name: "Default pagination",
			options: &PaginationOptions{
				Limit:  DefaultLimit,
				Offset: 0,
				Page:   1,
			},
			want: &PaginatedResult{
				Items:      resources[:DefaultLimit],
				TotalCount: 100,
				Limit:      DefaultLimit,
				Offset:     0,
				Page:       1,
				PageCount:  2, // 100/50 = 2
			},
			wantErr: false,
		},
		{
			name: "Custom limit",
			options: &PaginationOptions{
				Limit:  10,
				Offset: 0,
				Page:   1,
			},
			want: &PaginatedResult{
				Items:      resources[:10],
				TotalCount: 100,
				Limit:      10,
				Offset:     0,
				Page:       1,
				PageCount:  10, // 100/10 = 10
			},
			wantErr: false,
		},
		{
			name: "Custom offset",
			options: &PaginationOptions{
				Limit:  10,
				Offset: 20,
				Page:   3,
			},
			want: &PaginatedResult{
				Items:      resources[20:30],
				TotalCount: 100,
				Limit:      10,
				Offset:     20,
				Page:       3,
				PageCount:  10, // 100/10 = 10
			},
			wantErr: false,
		},
		{
			name: "Last page",
			options: &PaginationOptions{
				Limit:  10,
				Offset: 90,
				Page:   10,
			},
			want: &PaginatedResult{
				Items:      resources[90:],
				TotalCount: 100,
				Limit:      10,
				Offset:     90,
				Page:       10,
				PageCount:  10, // 100/10 = 10
			},
			wantErr: false,
		},
		{
			name: "Partial page",
			options: &PaginationOptions{
				Limit:  30,
				Offset: 80,
				Page:   3,
			},
			want: &PaginatedResult{
				Items:      resources[80:],
				TotalCount: 100,
				Limit:      30,
				Offset:     80,
				Page:       3,
				PageCount:  4, // (100+30-1)/30 = 4.3 -> 4
			},
			wantErr: false,
		},
		{
			name: "Offset out of range",
			options: &PaginationOptions{
				Limit:  10,
				Offset: 100,
				Page:   11,
			},
			want:    nil,
			wantErr: true,
		},
		{
			name:    "Nil options",
			options: nil,
			want: &PaginatedResult{
				Items:      resources[:DefaultLimit],
				TotalCount: 100,
				Limit:      DefaultLimit,
				Offset:     0,
				Page:       1,
				PageCount:  2, // 100/50 = 2
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ApplyPagination(resources, tt.options)
			if (err != nil) != tt.wantErr {
				t.Errorf("ApplyPagination() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if tt.wantErr {
				return
			}

			// Check pagination metadata
			if got.TotalCount != tt.want.TotalCount ||
				got.Limit != tt.want.Limit ||
				got.Offset != tt.want.Offset ||
				got.Page != tt.want.Page ||
				got.PageCount != tt.want.PageCount {
				t.Errorf("ApplyPagination() metadata = %+v, want %+v", got, tt.want)
				return
			}

			// Check items
			gotItems := got.Items.([]testResource)
			wantItems := tt.want.Items.([]testResource)
			if !reflect.DeepEqual(gotItems, wantItems) {
				t.Errorf("ApplyPagination() items = %v, want %v", gotItems, wantItems)
			}
		})
	}
}
