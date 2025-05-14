package models

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestSimpleStorageConstraint_Validate(t *testing.T) {
	tests := []struct {
		name        string
		constraint  SimpleStorageConstraint
		expectErr   bool
		expectedMsg string
	}{
		{
			name: "Valid constraint - MinSize",
			constraint: SimpleStorageConstraint{
				MinSize: 1024 * 1024 * 100, // 100MB
			},
			expectErr: false,
		},
		{
			name: "Valid constraint - DiskType",
			constraint: SimpleStorageConstraint{
				DiskType: "ssd",
			},
			expectErr: false,
		},
		{
			name: "Valid constraint - Count",
			constraint: SimpleStorageConstraint{
				Count: 2,
			},
			expectErr: false,
		},
		{
			name: "Valid constraint - All fields",
			constraint: SimpleStorageConstraint{
				MinSize:  1024 * 1024 * 200, // 200MB
				DiskType: "hdd",
				Count:    4,
			},
			expectErr: false,
		},
		{
			name:        "Invalid constraint - Empty",
			constraint:  SimpleStorageConstraint{},
			expectErr:   true,
			expectedMsg: "at least one storage constraint must be specified",
		},
		{
			name: "Invalid constraint - Invalid DiskType",
			constraint: SimpleStorageConstraint{
				DiskType: "nvme",
			},
			expectErr:   true,
			expectedMsg: "invalid disk type: nvme",
		},
		{
			name: "Invalid constraint - Negative Count",
			constraint: SimpleStorageConstraint{
				Count: -1,
			},
			expectErr:   true,
			expectedMsg: "count cannot be negative",
		},
		{
			name: "Valid constraint - DiskType any",
			constraint: SimpleStorageConstraint{
				DiskType: "any",
			},
			expectErr: false,
		},
		{
			name: "Invalid constraint - MinSize > MaxSize",
			constraint: SimpleStorageConstraint{
				MinSize: 100, MaxSize: 50,
			},
			expectErr:   true,
			expectedMsg: "max_size_bytes cannot be less than min_size_bytes",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := tc.constraint.Validate()
			if tc.expectErr {
				assert.Error(t, err)
				assert.EqualError(t, err, tc.expectedMsg)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestSimpleStorageConstraint_ToStorageConstraints(t *testing.T) {
	tests := []struct {
		name                string
		simpleConstraint    SimpleStorageConstraint
		expectedConstraints []StorageConstraint
	}{
		{
			name: "MinSize only",
			simpleConstraint: SimpleStorageConstraint{
				MinSize: 100 * 1024 * 1024, // 100MB
			},
			expectedConstraints: []StorageConstraint{
				{Type: SizeConstraint, Value: fmt.Sprintf("%d", 100*1024*1024), Operator: "gte"}, // TargetType removed, Operator corrected
			},
		},
		{
			name: "DiskType only (ssd)",
			simpleConstraint: SimpleStorageConstraint{
				DiskType: "ssd",
			},
			expectedConstraints: []StorageConstraint{
				{Type: TypeConstraint, Value: "ssd"}, // TargetType and Operator removed (defaults)
			},
		},
		{
			name: "DiskType only (any)",
			simpleConstraint: SimpleStorageConstraint{
				DiskType: "any", // "any" or empty should not produce a type constraint
			},
			expectedConstraints: []StorageConstraint{},
		},
		{
			name: "Count only",
			simpleConstraint: SimpleStorageConstraint{
				Count: 2,
			},
			expectedConstraints: []StorageConstraint{
				{Type: CountConstraint, Value: "2", Operator: "gte"}, // TargetType removed
			},
		},
		{
			name: "All fields",
			simpleConstraint: SimpleStorageConstraint{
				MinSize:  200 * 1024 * 1024, // 200MB
				DiskType: "hdd",
				Count:    4,
			},
			expectedConstraints: []StorageConstraint{
				{Type: SizeConstraint, Value: fmt.Sprintf("%d", 200*1024*1024), Operator: "gte"},
				{Type: TypeConstraint, Value: "hdd"},
				{Type: CountConstraint, Value: "4", Operator: "gte"},
			},
		},
		{
			name:                "Empty constraint",
			simpleConstraint:    SimpleStorageConstraint{},
			expectedConstraints: []StorageConstraint{},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			constraints := tc.simpleConstraint.ToStorageConstraints()
			assert.ElementsMatch(t, tc.expectedConstraints, constraints)
		})
	}
}
