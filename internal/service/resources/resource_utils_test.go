package resources

import (
	"context"
	"reflect"
	"testing"
)

func TestResourceProcessor_ProcessResource(t *testing.T) {
	logger := NewMockLogger()
	processor := NewResourceProcessor(logger)
	ctx := context.Background()

	// Create test resources
	resources := []testResource{
		{ID: 1, Name: "test1", Status: "active", Count: 10},
		{ID: 2, Name: "test2", Status: "inactive", Count: 20},
		{ID: 3, Name: "test3", Status: "active", Count: 30},
		{ID: 4, Name: "other", Status: "active", Count: 40},
		{ID: 5, Name: "test5", Status: "active", Count: 50},
	}

	tests := []struct {
		name    string
		request *ResourceRequest
		want    interface{}
		wantErr bool
	}{
		{
			name: "No filtering or pagination",
			request: &ResourceRequest{
				URI:           "maas://test",
				Parameters:    map[string]string{},
				QueryParams:   map[string]string{},
				FilterOptions: NewFilterOptions(),
				PageOptions:   NewPaginationOptions(),
			},
			want:    resources,
			wantErr: false,
		},
		{
			name: "With filtering only",
			request: &ResourceRequest{
				URI:         "maas://test",
				Parameters:  map[string]string{},
				QueryParams: map[string]string{},
				FilterOptions: &FilterOptions{
					RootGroup: FilterGroup{
						Conditions: []FilterCondition{
							{Field: "Status", Operator: OperatorEquals, Value: "active"},
						},
						Groups:   []FilterGroup{},
						Operator: LogicalAnd,
					},
				},
				PageOptions: NewPaginationOptions(),
			},
			want: []testResource{
				{ID: 1, Name: "test1", Status: "active", Count: 10},
				{ID: 3, Name: "test3", Status: "active", Count: 30},
				{ID: 4, Name: "other", Status: "active", Count: 40},
				{ID: 5, Name: "test5", Status: "active", Count: 50},
			},
			wantErr: false,
		},
		{
			name: "With pagination only",
			request: &ResourceRequest{
				URI:           "maas://test",
				Parameters:    map[string]string{},
				QueryParams:   map[string]string{},
				FilterOptions: NewFilterOptions(),
				PageOptions: &PaginationOptions{
					Limit:  2,
					Offset: 1,
					Page:   1,
				},
			},
			want: &PaginatedResult{
				Items: []testResource{
					{ID: 2, Name: "test2", Status: "inactive", Count: 20},
					{ID: 3, Name: "test3", Status: "active", Count: 30},
				},
				TotalCount: 5,
				Limit:      2,
				Offset:     1,
				Page:       1,
				PageCount:  3, // (5+2-1)/2 = 3
			},
			wantErr: false,
		},
		{
			name: "With filtering and pagination",
			request: &ResourceRequest{
				URI:         "maas://test",
				Parameters:  map[string]string{},
				QueryParams: map[string]string{},
				FilterOptions: &FilterOptions{
					RootGroup: FilterGroup{
						Conditions: []FilterCondition{
							{Field: "Status", Operator: OperatorEquals, Value: "active"},
						},
						Groups:   []FilterGroup{},
						Operator: LogicalAnd,
					},
				},
				PageOptions: &PaginationOptions{
					Limit:  2,
					Offset: 1,
					Page:   1,
				},
			},
			want: &PaginatedResult{
				Items: []testResource{
					{ID: 3, Name: "test3", Status: "active", Count: 30},
					{ID: 4, Name: "other", Status: "active", Count: 40},
				},
				TotalCount: 4,
				Limit:      2,
				Offset:     1,
				Page:       1,
				PageCount:  2, // (4+2-1)/2 = 2.5 -> 2
			},
			wantErr: false,
		},
		{
			name: "Non-slice resource",
			request: &ResourceRequest{
				URI:           "maas://test",
				Parameters:    map[string]string{},
				QueryParams:   map[string]string{},
				FilterOptions: NewFilterOptions(),
				PageOptions:   NewPaginationOptions(),
			},
			want:    resources[0], // Single resource, not a slice
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var resource interface{}
			if tt.name == "Non-slice resource" {
				resource = resources[0]
			} else {
				resource = resources
			}

			got, err := processor.ProcessResource(ctx, resource, tt.request)
			if (err != nil) != tt.wantErr {
				t.Errorf("ProcessResource() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			// For paginated results, check metadata and items separately
			if paginated, ok := got.(*PaginatedResult); ok {
				wantPaginated := tt.want.(*PaginatedResult)

				// Check pagination metadata
				if paginated.TotalCount != wantPaginated.TotalCount ||
					paginated.Limit != wantPaginated.Limit ||
					paginated.Offset != wantPaginated.Offset ||
					paginated.Page != wantPaginated.Page ||
					paginated.PageCount != wantPaginated.PageCount {
					t.Errorf("ProcessResource() metadata = %+v, want %+v", paginated, wantPaginated)
					return
				}

				// Check items
				gotItems := paginated.Items.([]testResource)
				wantItems := wantPaginated.Items.([]testResource)
				if !reflect.DeepEqual(gotItems, wantItems) {
					t.Errorf("ProcessResource() items = %v, want %v", gotItems, wantItems)
				}
			} else if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("ProcessResource() = %v, want %v", got, tt.want)
			}
		})
	}
}
