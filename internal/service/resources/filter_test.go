package resources

import (
	"reflect"
	"testing"
)

func TestParseFilterParams(t *testing.T) {
	tests := []struct {
		name        string
		queryParams map[string]string
		want        *FilterOptions
		wantErr     bool
	}{
		{
			name:        "Empty query params",
			queryParams: map[string]string{},
			want:        NewFilterOptions(),
			wantErr:     false,
		},
		{
			name: "Valid filter",
			queryParams: map[string]string{
				"filter": "name eq 'test' and status ne 'failed'",
			},
			want: &FilterOptions{
				RootGroup: FilterGroup{
					Conditions: []FilterCondition{
						{Field: "name", Operator: OperatorEquals, Value: "test"},
						{Field: "status", Operator: OperatorNotEquals, Value: "failed"},
					},
					Groups:   []FilterGroup{},
					Operator: LogicalAnd,
				},
			},
			wantErr: false,
		},
		{
			name: "Invalid filter format",
			queryParams: map[string]string{
				"filter": "invalid",
			},
			want:    nil,
			wantErr: true,
		},
		{
			name: "Invalid operator",
			queryParams: map[string]string{
				"filter": "name invalid 'test'",
			},
			want:    nil,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ParseFilterParams(tt.queryParams)
			if (err != nil) != tt.wantErr {
				t.Errorf("ParseFilterParams() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if tt.wantErr {
				return
			}

			// Compare conditions length
			if len(got.RootGroup.Conditions) != len(tt.want.RootGroup.Conditions) {
				t.Errorf("ParseFilterParams() got %v conditions, want %v",
					len(got.RootGroup.Conditions), len(tt.want.RootGroup.Conditions))
				return
			}

			// Compare each condition
			for i, cond := range got.RootGroup.Conditions {
				wantCond := tt.want.RootGroup.Conditions[i]
				if cond.Field != wantCond.Field ||
					cond.Operator != wantCond.Operator ||
					cond.Value != wantCond.Value {
					t.Errorf("ParseFilterParams() condition %d = %v, want %v",
						i, cond, wantCond)
				}
			}

			if got.RootGroup.Operator != tt.want.RootGroup.Operator {
				t.Errorf("ParseFilterParams() operator = %v, want %v",
					got.RootGroup.Operator, tt.want.RootGroup.Operator)
			}
		})
	}
}

type testResource struct {
	ID     int    `json:"id"`
	Name   string `json:"name"`
	Status string `json:"status"`
	Count  int    `json:"count"`
}

func TestApplyFilters(t *testing.T) {
	resources := []testResource{
		{ID: 1, Name: "test1", Status: "active", Count: 10},
		{ID: 2, Name: "test2", Status: "inactive", Count: 20},
		{ID: 3, Name: "test3", Status: "active", Count: 30},
		{ID: 4, Name: "other", Status: "active", Count: 40},
	}

	tests := []struct {
		name    string
		filters *FilterOptions
		want    []testResource
		wantErr bool
	}{
		{
			name: "Filter by equals",
			filters: &FilterOptions{
				RootGroup: FilterGroup{
					Conditions: []FilterCondition{
						{Field: "Status", Operator: OperatorEquals, Value: "active"},
					},
					Groups:   []FilterGroup{},
					Operator: LogicalAnd,
				},
			},
			want: []testResource{
				{ID: 1, Name: "test1", Status: "active", Count: 10},
				{ID: 3, Name: "test3", Status: "active", Count: 30},
				{ID: 4, Name: "other", Status: "active", Count: 40},
			},
			wantErr: false,
		},
		{
			name: "Filter by not equals",
			filters: &FilterOptions{
				RootGroup: FilterGroup{
					Conditions: []FilterCondition{
						{Field: "Status", Operator: OperatorNotEquals, Value: "active"},
					},
					Groups:   []FilterGroup{},
					Operator: LogicalAnd,
				},
			},
			want: []testResource{
				{ID: 2, Name: "test2", Status: "inactive", Count: 20},
			},
			wantErr: false,
		},
		{
			name: "Filter by greater than",
			filters: &FilterOptions{
				RootGroup: FilterGroup{
					Conditions: []FilterCondition{
						{Field: "Count", Operator: OperatorGreaterThan, Value: 20},
					},
					Groups:   []FilterGroup{},
					Operator: LogicalAnd,
				},
			},
			want: []testResource{
				{ID: 3, Name: "test3", Status: "active", Count: 30},
				{ID: 4, Name: "other", Status: "active", Count: 40},
			},
			wantErr: false,
		},
		{
			name: "Filter by contains",
			filters: &FilterOptions{
				RootGroup: FilterGroup{
					Conditions: []FilterCondition{
						{Field: "Name", Operator: OperatorContains, Value: "test"},
					},
					Groups:   []FilterGroup{},
					Operator: LogicalAnd,
				},
			},
			want: []testResource{
				{ID: 1, Name: "test1", Status: "active", Count: 10},
				{ID: 2, Name: "test2", Status: "inactive", Count: 20},
				{ID: 3, Name: "test3", Status: "active", Count: 30},
			},
			wantErr: false,
		},
		{
			name: "Multiple conditions with AND",
			filters: &FilterOptions{
				RootGroup: FilterGroup{
					Conditions: []FilterCondition{
						{Field: "Status", Operator: OperatorEquals, Value: "active"},
						{Field: "Count", Operator: OperatorGreaterThan, Value: 20},
					},
					Groups:   []FilterGroup{},
					Operator: LogicalAnd,
				},
			},
			want: []testResource{
				{ID: 3, Name: "test3", Status: "active", Count: 30},
				{ID: 4, Name: "other", Status: "active", Count: 40},
			},
			wantErr: false,
		},
		{
			name: "Multiple conditions with OR",
			filters: &FilterOptions{
				RootGroup: FilterGroup{
					Conditions: []FilterCondition{
						{Field: "Status", Operator: OperatorEquals, Value: "inactive"},
						{Field: "Name", Operator: OperatorEquals, Value: "other"},
					},
					Groups:   []FilterGroup{},
					Operator: LogicalOr,
				},
			},
			want: []testResource{
				{ID: 2, Name: "test2", Status: "inactive", Count: 20},
				{ID: 4, Name: "other", Status: "active", Count: 40},
			},
			wantErr: false,
		},
		{
			name:    "Nil filters",
			filters: nil,
			want:    resources,
			wantErr: false,
		},
		{
			name: "Empty filters",
			filters: &FilterOptions{
				RootGroup: FilterGroup{
					Conditions: []FilterCondition{},
					Groups:     []FilterGroup{},
					Operator:   LogicalAnd,
				},
			},
			want:    resources,
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ApplyFilters(resources, tt.filters)
			if (err != nil) != tt.wantErr {
				t.Errorf("ApplyFilters() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			gotResources, ok := got.([]testResource)
			if !ok {
				t.Errorf("ApplyFilters() returned type %T, want []testResource", got)
				return
			}

			if !reflect.DeepEqual(gotResources, tt.want) {
				t.Errorf("ApplyFilters() = %v, want %v", gotResources, tt.want)
			}
		})
	}
}
