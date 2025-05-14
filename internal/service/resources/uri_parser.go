package resources

import (
	"fmt"
	"net/url"
	"regexp"
	"strings"
)

// URIPattern represents a parsed URI pattern with parameter definitions
type URIPattern struct {
	Scheme          string
	ResourceType    string
	ResourceID      string
	SubResourceType string
	SubResourceID   string
	QueryParams     map[string]string
	Pattern         string
}

// URIParameter represents a parameter in a URI pattern
type URIParameter struct {
	Name       string
	IsOptional bool
	Values     []string // For enumerated parameters
}

// URIParseResult represents the result of parsing a URI against a pattern
type URIParseResult struct {
	Scheme          string
	ResourceType    string
	ResourceID      string
	SubResourceType string
	SubResourceID   string
	QueryParams     map[string]string
	Parameters      map[string]string
	Pattern         string
}

// ParseURI parses a URI string into its components
func ParseURI(uri string) (*URIPattern, error) {
	// Split the URI into scheme and path
	parts := strings.SplitN(uri, "://", 2)
	if len(parts) != 2 {
		return nil, fmt.Errorf("invalid URI format: %s", uri)
	}

	scheme := parts[0]
	path := parts[1]

	// Parse query parameters if any
	pathAndQuery := strings.SplitN(path, "?", 2)
	path = pathAndQuery[0]
	queryParams := make(map[string]string)

	if len(pathAndQuery) > 1 {
		query := pathAndQuery[1]
		queryValues, err := url.ParseQuery(query)
		if err != nil {
			return nil, fmt.Errorf("invalid query parameters: %w", err)
		}

		for key, values := range queryValues {
			if len(values) > 0 {
				queryParams[key] = values[0]
			}
		}
	}

	// Split the path into segments
	segments := strings.Split(path, "/")
	if len(segments) == 0 {
		return nil, fmt.Errorf("invalid URI path: %s", path)
	}

	// Extract resource type and ID
	resourceType := segments[0]
	resourceID := ""
	subResourceType := ""
	subResourceID := ""

	if len(segments) > 1 {
		resourceID = segments[1]
	}

	// Extract sub-resource type and ID if present
	if len(segments) > 2 {
		subResourceType = segments[2]
	}

	if len(segments) > 3 {
		subResourceID = segments[3]
	}

	return &URIPattern{
		Scheme:          scheme,
		ResourceType:    resourceType,
		ResourceID:      resourceID,
		SubResourceType: subResourceType,
		SubResourceID:   subResourceID,
		QueryParams:     queryParams,
		Pattern:         uri,
	}, nil
}

// ExtractParameters extracts parameters from a URI pattern
func ExtractParameters(pattern string) ([]URIParameter, error) {
	// Regular expression to match parameters in the pattern
	// Matches {param_name}, {param_name?}, and {param_name:value1|value2}
	re := regexp.MustCompile(`\{([^{}:]+)(\?)?(?::([^{}]+))?\}`)
	matches := re.FindAllStringSubmatch(pattern, -1)

	parameters := make([]URIParameter, 0, len(matches))
	for _, match := range matches {
		param := URIParameter{
			Name:       match[1],
			IsOptional: match[2] == "?",
		}

		// If there are enumerated values
		if len(match) > 3 && match[3] != "" {
			param.Values = strings.Split(match[3], "|")
		}

		parameters = append(parameters, param)
	}

	return parameters, nil
}

// MatchURI matches a URI against a pattern and extracts parameter values
func MatchURI(uri string, pattern string) (*URIParseResult, error) {
	// Parse the URI
	parsedURI, err := ParseURI(uri)
	if err != nil {
		return nil, err
	}

	// Extract parameters from the pattern
	parameters, err := ExtractParameters(pattern)
	if err != nil {
		return nil, err
	}

	// Create a regular expression from the pattern
	regexPattern := pattern
	paramMap := make(map[string]string)

	// Replace parameters with regex capture groups
	for _, param := range parameters {
		var replacement string
		if len(param.Values) > 0 {
			// For enumerated parameters, create a group with alternatives
			replacement = fmt.Sprintf("(?P<%s>%s)", param.Name, strings.Join(param.Values, "|"))
		} else if param.IsOptional {
			// For optional parameters
			replacement = fmt.Sprintf("(?P<%s>[^/]*)?", param.Name)
		} else {
			// For required parameters
			replacement = fmt.Sprintf("(?P<%s>[^/]+)", param.Name)
		}

		// Escape curly braces for regex
		paramPattern := fmt.Sprintf("\\{%s", param.Name)
		if param.IsOptional {
			paramPattern += "\\?"
		}
		if len(param.Values) > 0 {
			paramPattern += fmt.Sprintf(":%s", strings.Join(param.Values, "\\|"))
		}
		paramPattern += "\\}"

		regexPattern = regexp.MustCompile(paramPattern).ReplaceAllString(regexPattern, replacement)
	}

	// Convert the pattern to a regex
	regexPattern = "^" + regexp.QuoteMeta(regexPattern) + "$"
	regexPattern = strings.Replace(regexPattern, "\\(\\?P<", "(?P<", -1)
	regexPattern = strings.Replace(regexPattern, "\\)", ")", -1)
	regexPattern = strings.Replace(regexPattern, "\\|", "|", -1)

	// Create the regex
	re, err := regexp.Compile(regexPattern)
	if err != nil {
		return nil, fmt.Errorf("invalid pattern: %w", err)
	}

	// Match the URI against the pattern
	match := re.FindStringSubmatch(uri)
	if match == nil {
		return nil, fmt.Errorf("URI does not match pattern: %s", pattern)
	}

	// Extract parameter values
	for i, name := range re.SubexpNames() {
		if i != 0 && name != "" {
			paramMap[name] = match[i]
		}
	}

	return &URIParseResult{
		Scheme:          parsedURI.Scheme,
		ResourceType:    parsedURI.ResourceType,
		ResourceID:      parsedURI.ResourceID,
		SubResourceType: parsedURI.SubResourceType,
		SubResourceID:   parsedURI.SubResourceID,
		QueryParams:     parsedURI.QueryParams,
		Parameters:      paramMap,
		Pattern:         pattern,
	}, nil
}

// ValidateURI validates a URI against a pattern
func ValidateURI(uri string, pattern string) error {
	_, err := MatchURI(uri, pattern)
	return err
}
