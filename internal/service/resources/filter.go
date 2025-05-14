package resources

import (
	"fmt"
	"reflect"
	"strconv"
	"strings"

	"github.com/lspecian/maas-mcp-server/internal/errors"
)

// FilterOperator represents a comparison operator for filtering
type FilterOperator string

const (
	// Comparison operators
	OperatorEquals             FilterOperator = "eq"
	OperatorNotEquals          FilterOperator = "ne"
	OperatorGreaterThan        FilterOperator = "gt"
	OperatorGreaterThanOrEqual FilterOperator = "gte"
	OperatorLessThan           FilterOperator = "lt"
	OperatorLessThanOrEqual    FilterOperator = "lte"
	OperatorContains           FilterOperator = "contains"
	OperatorStartsWith         FilterOperator = "startswith"
	OperatorEndsWith           FilterOperator = "endswith"
	OperatorIn                 FilterOperator = "in"
	OperatorNotIn              FilterOperator = "notin"
)

// LogicalOperator represents a logical operator for combining filters
type LogicalOperator string

const (
	LogicalAnd LogicalOperator = "and"
	LogicalOr  LogicalOperator = "or"
)

// FilterCondition represents a single filter condition
type FilterCondition struct {
	Field    string
	Operator FilterOperator
	Value    interface{}
}

// FilterGroup represents a group of filter conditions combined with a logical operator
type FilterGroup struct {
	Conditions []FilterCondition
	Groups     []FilterGroup
	Operator   LogicalOperator
}

// FilterOptions represents the filtering options for a resource request
type FilterOptions struct {
	RootGroup FilterGroup
}

// NewFilterOptions creates a new FilterOptions instance
func NewFilterOptions() *FilterOptions {
	return &FilterOptions{
		RootGroup: FilterGroup{
			Conditions: []FilterCondition{},
			Groups:     []FilterGroup{},
			Operator:   LogicalAnd,
		},
	}
}

// ParseFilterParams parses filter parameters from query parameters
func ParseFilterParams(queryParams map[string]string) (*FilterOptions, error) {
	filterOptions := NewFilterOptions()

	// Check for filter parameter
	filterParam, hasFilter := queryParams["filter"]
	if !hasFilter || filterParam == "" {
		return filterOptions, nil
	}

	// Parse the filter string
	rootGroup, err := parseFilterString(filterParam)
	if err != nil {
		return nil, errors.NewValidationError(fmt.Sprintf("Invalid filter parameter: %s", err.Error()), err)
	}

	filterOptions.RootGroup = rootGroup
	return filterOptions, nil
}

// parseFilterString parses a filter string into a FilterGroup
func parseFilterString(filterStr string) (FilterGroup, error) {
	// Simple parsing for now - format: field operator value [logical_op field operator value]...
	// Example: "name eq 'test' and status ne 'failed'"

	parts := strings.Split(filterStr, " ")
	if len(parts) < 3 {
		return FilterGroup{}, fmt.Errorf("invalid filter format: %s", filterStr)
	}

	group := FilterGroup{
		Conditions: []FilterCondition{},
		Groups:     []FilterGroup{},
		Operator:   LogicalAnd,
	}

	for i := 0; i < len(parts); i += 4 {
		if i+2 >= len(parts) {
			return FilterGroup{}, fmt.Errorf("incomplete filter condition at position %d", i)
		}

		field := parts[i]
		opStr := parts[i+1]
		value := parts[i+2]

		// Remove quotes if present
		if strings.HasPrefix(value, "'") && strings.HasSuffix(value, "'") {
			value = value[1 : len(value)-1]
		} else if strings.HasPrefix(value, "\"") && strings.HasSuffix(value, "\"") {
			value = value[1 : len(value)-1]
		}

		// Parse operator
		op := FilterOperator(opStr)
		if !isValidOperator(op) {
			return FilterGroup{}, fmt.Errorf("invalid operator: %s", opStr)
		}

		// Add condition
		condition := FilterCondition{
			Field:    field,
			Operator: op,
			Value:    value,
		}
		group.Conditions = append(group.Conditions, condition)

		// Check if there's a logical operator next
		if i+3 < len(parts) {
			logOpStr := parts[i+3]
			logOp := LogicalOperator(logOpStr)
			if logOp != LogicalAnd && logOp != LogicalOr {
				return FilterGroup{}, fmt.Errorf("invalid logical operator: %s", logOpStr)
			}
			group.Operator = logOp
		}
	}

	return group, nil
}

// isValidOperator checks if the given operator is valid
func isValidOperator(op FilterOperator) bool {
	validOperators := []FilterOperator{
		OperatorEquals, OperatorNotEquals,
		OperatorGreaterThan, OperatorGreaterThanOrEqual,
		OperatorLessThan, OperatorLessThanOrEqual,
		OperatorContains, OperatorStartsWith, OperatorEndsWith,
		OperatorIn, OperatorNotIn,
	}

	for _, validOp := range validOperators {
		if op == validOp {
			return true
		}
	}
	return false
}

// ApplyFilters applies filter conditions to a slice of resources
func ApplyFilters(resources interface{}, filters *FilterOptions) (interface{}, error) {
	if filters == nil || len(filters.RootGroup.Conditions) == 0 && len(filters.RootGroup.Groups) == 0 {
		return resources, nil
	}

	// Get the slice value
	sliceValue := reflect.ValueOf(resources)
	if sliceValue.Kind() != reflect.Slice {
		return nil, fmt.Errorf("resources must be a slice")
	}

	// Create a new slice to hold filtered results
	resultSlice := reflect.MakeSlice(sliceValue.Type(), 0, sliceValue.Len())

	// Iterate through the slice and apply filters
	for i := 0; i < sliceValue.Len(); i++ {
		item := sliceValue.Index(i)
		if evaluateFilterGroup(item, filters.RootGroup) {
			resultSlice = reflect.Append(resultSlice, item)
		}
	}

	return resultSlice.Interface(), nil
}

// evaluateFilterGroup evaluates a filter group against a resource
func evaluateFilterGroup(resource reflect.Value, group FilterGroup) bool {
	if len(group.Conditions) == 0 && len(group.Groups) == 0 {
		return true
	}

	// Evaluate conditions
	conditionResults := make([]bool, len(group.Conditions))
	for i, condition := range group.Conditions {
		conditionResults[i] = evaluateCondition(resource, condition)
	}

	// Evaluate nested groups
	groupResults := make([]bool, len(group.Groups))
	for i, nestedGroup := range group.Groups {
		groupResults[i] = evaluateFilterGroup(resource, nestedGroup)
	}

	// Combine results based on logical operator
	if group.Operator == LogicalOr {
		// OR: Any condition or group must be true
		for _, result := range conditionResults {
			if result {
				return true
			}
		}
		for _, result := range groupResults {
			if result {
				return true
			}
		}
		return false
	} else {
		// AND: All conditions and groups must be true
		for _, result := range conditionResults {
			if !result {
				return false
			}
		}
		for _, result := range groupResults {
			if !result {
				return false
			}
		}
		return true
	}
}

// evaluateCondition evaluates a filter condition against a resource
func evaluateCondition(resource reflect.Value, condition FilterCondition) bool {
	// Handle pointer indirection
	if resource.Kind() == reflect.Ptr {
		if resource.IsNil() {
			return false
		}
		resource = resource.Elem()
	}

	// For maps, access by key
	if resource.Kind() == reflect.Map {
		fieldValue := resource.MapIndex(reflect.ValueOf(condition.Field))
		if !fieldValue.IsValid() {
			return false
		}
		return compareValues(fieldValue, condition.Operator, condition.Value)
	}

	// For structs, access by field name
	if resource.Kind() == reflect.Struct {
		// Try to find the field (case-insensitive)
		fieldValue := findField(resource, condition.Field)
		if !fieldValue.IsValid() {
			return false
		}
		return compareValues(fieldValue, condition.Operator, condition.Value)
	}

	return false
}

// findField finds a field in a struct by name (case-insensitive)
func findField(structValue reflect.Value, fieldName string) reflect.Value {
	// Try exact match first
	fieldValue := structValue.FieldByName(fieldName)
	if fieldValue.IsValid() {
		return fieldValue
	}

	// Try case-insensitive match
	fieldNameLower := strings.ToLower(fieldName)
	structType := structValue.Type()
	for i := 0; i < structType.NumField(); i++ {
		field := structType.Field(i)
		if strings.ToLower(field.Name) == fieldNameLower {
			return structValue.Field(i)
		}

		// Check JSON tag
		jsonTag := field.Tag.Get("json")
		if jsonTag != "" {
			jsonName := strings.Split(jsonTag, ",")[0]
			if strings.ToLower(jsonName) == fieldNameLower {
				return structValue.Field(i)
			}
		}
	}

	return reflect.Value{}
}

// compareValues compares a field value against a condition value using the specified operator
func compareValues(fieldValue reflect.Value, operator FilterOperator, conditionValue interface{}) bool {
	// Handle pointer indirection
	if fieldValue.Kind() == reflect.Ptr {
		if fieldValue.IsNil() {
			return false
		}
		fieldValue = fieldValue.Elem()
	}

	// Convert condition value to appropriate type
	typedValue, err := convertToType(conditionValue, fieldValue.Type())
	if err != nil {
		return false
	}

	// Perform comparison based on operator
	switch operator {
	case OperatorEquals:
		return reflect.DeepEqual(fieldValue.Interface(), typedValue)
	case OperatorNotEquals:
		return !reflect.DeepEqual(fieldValue.Interface(), typedValue)
	case OperatorGreaterThan:
		return compareGreaterThan(fieldValue, typedValue)
	case OperatorGreaterThanOrEqual:
		return compareGreaterThanOrEqual(fieldValue, typedValue)
	case OperatorLessThan:
		return compareLessThan(fieldValue, typedValue)
	case OperatorLessThanOrEqual:
		return compareLessThanOrEqual(fieldValue, typedValue)
	case OperatorContains:
		return compareContains(fieldValue, typedValue)
	case OperatorStartsWith:
		return compareStartsWith(fieldValue, typedValue)
	case OperatorEndsWith:
		return compareEndsWith(fieldValue, typedValue)
	case OperatorIn:
		return compareIn(fieldValue, typedValue)
	case OperatorNotIn:
		return !compareIn(fieldValue, typedValue)
	default:
		return false
	}
}

// convertToType converts a value to the specified type
func convertToType(value interface{}, targetType reflect.Type) (interface{}, error) {
	// Handle string conversion
	if strValue, ok := value.(string); ok {
		switch targetType.Kind() {
		case reflect.String:
			return strValue, nil
		case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
			intVal, err := strconv.ParseInt(strValue, 10, 64)
			if err != nil {
				return nil, err
			}
			return intVal, nil
		case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
			uintVal, err := strconv.ParseUint(strValue, 10, 64)
			if err != nil {
				return nil, err
			}
			return uintVal, nil
		case reflect.Float32, reflect.Float64:
			floatVal, err := strconv.ParseFloat(strValue, 64)
			if err != nil {
				return nil, err
			}
			return floatVal, nil
		case reflect.Bool:
			boolVal, err := strconv.ParseBool(strValue)
			if err != nil {
				return nil, err
			}
			return boolVal, nil
		case reflect.Slice:
			if targetType.Elem().Kind() == reflect.String {
				// Handle string slice
				values := strings.Split(strValue, ",")
				for i := range values {
					values[i] = strings.TrimSpace(values[i])
				}
				return values, nil
			}
		}
	}

	// If types already match, return as is
	valueType := reflect.TypeOf(value)
	if valueType.AssignableTo(targetType) {
		return value, nil
	}

	return nil, fmt.Errorf("cannot convert %v to %v", valueType, targetType)
}

// compareGreaterThan compares if fieldValue > typedValue
func compareGreaterThan(fieldValue reflect.Value, typedValue interface{}) bool {
	switch fieldValue.Kind() {
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return fieldValue.Int() > reflect.ValueOf(typedValue).Int()
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return fieldValue.Uint() > reflect.ValueOf(typedValue).Uint()
	case reflect.Float32, reflect.Float64:
		return fieldValue.Float() > reflect.ValueOf(typedValue).Float()
	case reflect.String:
		return fieldValue.String() > reflect.ValueOf(typedValue).String()
	default:
		return false
	}
}

// compareGreaterThanOrEqual compares if fieldValue >= typedValue
func compareGreaterThanOrEqual(fieldValue reflect.Value, typedValue interface{}) bool {
	switch fieldValue.Kind() {
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return fieldValue.Int() >= reflect.ValueOf(typedValue).Int()
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return fieldValue.Uint() >= reflect.ValueOf(typedValue).Uint()
	case reflect.Float32, reflect.Float64:
		return fieldValue.Float() >= reflect.ValueOf(typedValue).Float()
	case reflect.String:
		return fieldValue.String() >= reflect.ValueOf(typedValue).String()
	default:
		return false
	}
}

// compareLessThan compares if fieldValue < typedValue
func compareLessThan(fieldValue reflect.Value, typedValue interface{}) bool {
	switch fieldValue.Kind() {
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return fieldValue.Int() < reflect.ValueOf(typedValue).Int()
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return fieldValue.Uint() < reflect.ValueOf(typedValue).Uint()
	case reflect.Float32, reflect.Float64:
		return fieldValue.Float() < reflect.ValueOf(typedValue).Float()
	case reflect.String:
		return fieldValue.String() < reflect.ValueOf(typedValue).String()
	default:
		return false
	}
}

// compareLessThanOrEqual compares if fieldValue <= typedValue
func compareLessThanOrEqual(fieldValue reflect.Value, typedValue interface{}) bool {
	switch fieldValue.Kind() {
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return fieldValue.Int() <= reflect.ValueOf(typedValue).Int()
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return fieldValue.Uint() <= reflect.ValueOf(typedValue).Uint()
	case reflect.Float32, reflect.Float64:
		return fieldValue.Float() <= reflect.ValueOf(typedValue).Float()
	case reflect.String:
		return fieldValue.String() <= reflect.ValueOf(typedValue).String()
	default:
		return false
	}
}

// compareContains checks if fieldValue contains typedValue
func compareContains(fieldValue reflect.Value, typedValue interface{}) bool {
	if fieldValue.Kind() == reflect.String {
		return strings.Contains(fieldValue.String(), reflect.ValueOf(typedValue).String())
	}
	return false
}

// compareStartsWith checks if fieldValue starts with typedValue
func compareStartsWith(fieldValue reflect.Value, typedValue interface{}) bool {
	if fieldValue.Kind() == reflect.String {
		return strings.HasPrefix(fieldValue.String(), reflect.ValueOf(typedValue).String())
	}
	return false
}

// compareEndsWith checks if fieldValue ends with typedValue
func compareEndsWith(fieldValue reflect.Value, typedValue interface{}) bool {
	if fieldValue.Kind() == reflect.String {
		return strings.HasSuffix(fieldValue.String(), reflect.ValueOf(typedValue).String())
	}
	return false
}

// compareIn checks if fieldValue is in a list of values
func compareIn(fieldValue reflect.Value, typedValue interface{}) bool {
	// If typedValue is a string, split it by comma
	if strValue, ok := typedValue.(string); ok {
		values := strings.Split(strValue, ",")
		for _, val := range values {
			val = strings.TrimSpace(val)
			if fieldValue.String() == val {
				return true
			}
		}
		return false
	}

	// If typedValue is a slice
	sliceValue := reflect.ValueOf(typedValue)
	if sliceValue.Kind() == reflect.Slice {
		for i := 0; i < sliceValue.Len(); i++ {
			if reflect.DeepEqual(fieldValue.Interface(), sliceValue.Index(i).Interface()) {
				return true
			}
		}
	}

	return false
}
