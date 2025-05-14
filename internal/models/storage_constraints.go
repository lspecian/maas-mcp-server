package models

import (
	"fmt"
	"strconv"
	"strings"
)

// StorageConstraintType defines the type of a storage constraint.
type StorageConstraintType string

// Defines the various types of storage constraints.
const (
	SizeConstraint       StorageConstraintType = "size"
	TypeConstraint       StorageConstraintType = "type" // For disk type like SSD, HDD
	TagConstraint        StorageConstraintType = "tag"
	CountConstraint      StorageConstraintType = "count" // For number of disks
	ModelConstraint      StorageConstraintType = "model"
	SerialConstraint     StorageConstraintType = "serial"
	PathConstraint       StorageConstraintType = "path"
	IOPSConstraint       StorageConstraintType = "iops"
	ThroughputConstraint StorageConstraintType = "throughput_mbps"
	NameConstraint       StorageConstraintType = "name" // For constraint set name, if applicable
	IDConstraint         StorageConstraintType = "id"   // For constraint ID, if managed by MAAS
)

// StorageConstraint represents a single rule for storage selection.
type StorageConstraint struct {
	Type       StorageConstraintType `json:"type"`                  // e.g., "size", "tag", "disk_type"
	Value      string                `json:"value"`                 // Value for the constraint (e.g., "100G", "ssd", "fast-disk-tag")
	Operator   string                `json:"operator,omitempty"`    // e.g., "eq", "neq", "gt", "gte", "lt", "lte", "contains" (defaults to "eq" or appropriate for type)
	TargetType string                `json:"target_type,omitempty"` // e.g., "disk", "partition" (defaults to "disk")
}

// Validate checks the StorageConstraint for basic validity.
func (sc *StorageConstraint) Validate() error {
	switch sc.Type {
	case SizeConstraint, TypeConstraint, TagConstraint, CountConstraint, ModelConstraint, SerialConstraint, PathConstraint, IOPSConstraint, ThroughputConstraint, NameConstraint, IDConstraint:
		// Valid type
	default:
		if sc.Type == "" {
			return fmt.Errorf("storage constraint type is required")
		}
		return fmt.Errorf("unknown storage constraint type: %s", sc.Type)
	}

	if sc.Value == "" {
		return fmt.Errorf("storage constraint value is required for type %s", sc.Type)
	}

	// TODO: Add more specific validation for Value and Operator based on Type
	// For example, for SizeConstraint, Value should be parseable as a size.
	// For CountConstraint, Value should be an integer.
	// Operator validation could also be added here.

	return nil
}

// StorageConstraintParams is used for setting or updating storage constraints.
type StorageConstraintParams struct {
	Constraints []StorageConstraint `json:"constraints"`
}

// Validate checks the StorageConstraintParams for basic validity.
func (scp *StorageConstraintParams) Validate() error {
	if scp == nil {
		return fmt.Errorf("StorageConstraintParams cannot be nil")
	}
	if len(scp.Constraints) == 0 {
		// For operations like Set, Validate, Apply, at least one constraint is typically expected.
		return fmt.Errorf("at least one storage constraint is required")
	}
	for i, constraint := range scp.Constraints {
		if err := constraint.Validate(); err != nil {
			return fmt.Errorf("invalid constraint at index %d: %w", i, err)
		}
	}
	return nil
}

// SimpleStorageConstraint defines a simplified view for basic storage criteria.
// This can be used as input and then converted to a list of specific StorageConstraint items.
type SimpleStorageConstraint struct {
	MinSize           int64    `json:"min_size_bytes,omitempty"`      // Minimum size in bytes
	MaxSize           int64    `json:"max_size_bytes,omitempty"`      // Maximum size in bytes
	DiskType          string   `json:"disk_type,omitempty"`           // Desired disk type (e.g., "SSD", "HDD", "NVMe")
	Tags              []string `json:"tags,omitempty"`                // List of required MAAS tags for the storage device
	Count             int      `json:"count,omitempty"`               // Minimum number of disks matching other criteria
	Performance       string   `json:"performance,omitempty"`         // Abstract performance tier (e.g., "high", "standard") - for potential future use
	Name              string   `json:"name,omitempty"`                // A name for this constraint set
	ID                string   `json:"id,omitempty"`                  // An identifier for this constraint set
	Path              string   `json:"path,omitempty"`                // Specific device path
	Model             string   `json:"model,omitempty"`               // Specific disk model
	Serial            string   `json:"serial,omitempty"`              // Specific disk serial number
	MinIOPS           int64    `json:"min_iops,omitempty"`            // Minimum IOPS
	MinThroughputMBps int64    `json:"min_throughput_mbps,omitempty"` // Minimum throughput in MB/s
}

// Validate checks the SimpleStorageConstraint for basic validity.
func (ssc *SimpleStorageConstraint) Validate() error {
	if ssc.MinSize == 0 && ssc.MaxSize == 0 && ssc.DiskType == "" && len(ssc.Tags) == 0 &&
		ssc.Count == 0 && ssc.Performance == "" && ssc.Name == "" && ssc.ID == "" &&
		ssc.Path == "" && ssc.Model == "" && ssc.Serial == "" &&
		ssc.MinIOPS == 0 && ssc.MinThroughputMBps == 0 {
		return fmt.Errorf("at least one storage constraint must be specified")
	}

	if ssc.MinSize < 0 {
		return fmt.Errorf("min_size_bytes cannot be negative")
	}
	if ssc.MaxSize < 0 {
		return fmt.Errorf("max_size_bytes cannot be negative")
	}
	if ssc.MaxSize > 0 && ssc.MinSize > 0 && ssc.MaxSize < ssc.MinSize {
		return fmt.Errorf("max_size_bytes cannot be less than min_size_bytes")
	}
	if ssc.Count < 0 {
		return fmt.Errorf("count cannot be negative")
	}
	if ssc.MinIOPS < 0 {
		return fmt.Errorf("min_iops cannot be negative")
	}
	if ssc.MinThroughputMBps < 0 {
		return fmt.Errorf("min_throughput_mbps cannot be negative")
	}

	// Example validation for DiskType - adjust validTypes as needed
	if ssc.DiskType != "" && ssc.DiskType != "any" {
		validTypes := map[string]bool{"ssd": true, "hdd": true} // Example valid types
		if !validTypes[strings.ToLower(ssc.DiskType)] {
			return fmt.Errorf("invalid disk type: %s", ssc.DiskType)
		}
	}
	return nil
}

// ToStorageConstraints converts a SimpleStorageConstraint into a slice of StorageConstraint items.
func (ssc *SimpleStorageConstraint) ToStorageConstraints() []StorageConstraint {
	var constraints []StorageConstraint

	if ssc.MinSize > 0 {
		constraints = append(constraints, StorageConstraint{
			Type:     SizeConstraint,
			Value:    strconv.FormatInt(ssc.MinSize, 10),
			Operator: "gte", // Greater than or equal to
		})
	}
	if ssc.MaxSize > 0 {
		constraints = append(constraints, StorageConstraint{
			Type:     SizeConstraint,
			Value:    strconv.FormatInt(ssc.MaxSize, 10),
			Operator: "lte", // Less than or equal to
		})
	}
	if ssc.DiskType != "" && strings.ToLower(ssc.DiskType) != "any" { // Skip if "any"
		constraints = append(constraints, StorageConstraint{
			Type:  TypeConstraint,
			Value: strings.ToLower(ssc.DiskType),
		})
	}
	for _, tag := range ssc.Tags {
		if tag != "" {
			constraints = append(constraints, StorageConstraint{
				Type:  TagConstraint,
				Value: tag,
			})
		}
	}
	if ssc.Count > 0 {
		constraints = append(constraints, StorageConstraint{
			Type:     CountConstraint,
			Value:    strconv.Itoa(ssc.Count),
			Operator: "gte",
		})
	}
	if ssc.Path != "" {
		constraints = append(constraints, StorageConstraint{Type: PathConstraint, Value: ssc.Path})
	}
	if ssc.Model != "" {
		constraints = append(constraints, StorageConstraint{Type: ModelConstraint, Value: ssc.Model})
	}
	if ssc.Serial != "" {
		constraints = append(constraints, StorageConstraint{Type: SerialConstraint, Value: ssc.Serial})
	}
	if ssc.MinIOPS > 0 {
		constraints = append(constraints, StorageConstraint{Type: IOPSConstraint, Value: strconv.FormatInt(ssc.MinIOPS, 10), Operator: "gte"})
	}
	if ssc.MinThroughputMBps > 0 {
		constraints = append(constraints, StorageConstraint{Type: ThroughputConstraint, Value: strconv.FormatInt(ssc.MinThroughputMBps, 10), Operator: "gte"})
	}
	// Name, ID, and Performance are not directly translated to individual rules here,
	// they are more metadata for the SimpleStorageConstraint itself or for higher-level grouping.

	return constraints
}

// StorageConstraintContextItem represents a single storage constraint for display/context purposes.
type StorageConstraintContextItem struct {
	Type       string `json:"type"`
	Value      string `json:"value"`
	Operator   string `json:"operator,omitempty"`
	TargetType string `json:"target_type,omitempty"`
}

// StorageConstraintContext is used for returning storage constraint information via MCP.
type StorageConstraintContext struct {
	Constraints []StorageConstraintContextItem `json:"constraints"`
}

// MaasStorageConstraintsToMCPContext converts MAAS/internal StorageConstraintParams to MCP StorageConstraintContext.
// This is a placeholder name; the actual conversion logic will depend on how MAAS returns constraints.
// For now, it's a direct mapping from StorageConstraintParams.
func MaasStorageConstraintsToMCPContext(params *StorageConstraintParams) *StorageConstraintContext {
	if params == nil {
		return &StorageConstraintContext{Constraints: []StorageConstraintContextItem{}}
	}
	contextItems := make([]StorageConstraintContextItem, len(params.Constraints))
	for i, c := range params.Constraints {
		contextItems[i] = StorageConstraintContextItem{
			Type:       string(c.Type),
			Value:      c.Value,
			Operator:   c.Operator,
			TargetType: c.TargetType,
		}
	}
	return &StorageConstraintContext{Constraints: contextItems}
}
