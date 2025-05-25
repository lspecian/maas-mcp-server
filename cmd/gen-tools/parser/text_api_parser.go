package parser

import (
	"fmt"
	"regexp"
	"strings"
)

// TextAPIDocumentationParser parses MAAS API documentation from a raw text string.
type TextAPIDocumentationParser struct {
	rawDocumentation string
}

// NewTextAPIDocumentationParser creates a new TextAPIDocumentationParser.
func NewTextAPIDocumentationParser(docContent string) *TextAPIDocumentationParser {
	return &TextAPIDocumentationParser{rawDocumentation: docContent}
}

// Parse extracts API endpoint data from the raw documentation string.
func (p *TextAPIDocumentationParser) Parse() ([]Endpoint, error) {
	// REMOVED: endpoints := []Endpoint{}
	lines := strings.Split(p.rawDocumentation, "\n")

	endpointRegex := regexp.MustCompile(`^(GET|POST|PUT|DELETE)\s+(/MAAS(/api/2.0)?/[^:\s]+)(?::\s*(.*))?`)
	pathParamRegex := regexp.MustCompile(`\{([^}]+)\}`)
	generalParamRegex := regexp.MustCompile(`^\s*([a-zA-Z0-9_]+)\s+(?:\(([^)]+)\))?\s*-\s*(.+)`)

	var currentEndpoint *Endpoint
	var collectedEndpoints []Endpoint

	for _, line := range lines { // Changed 'i, line' to '_, line' as 'i' is not used
		line = strings.TrimSpace(line)

		if currentEndpoint != nil {
			paramMatches := generalParamRegex.FindStringSubmatch(line)
			if paramMatches != nil {
				paramName := paramMatches[1]
				paramTypeHint := paramMatches[2] 
				paramDescription := paramMatches[3]

				paramType := StringType 
				if paramTypeHint != "" {
					hintLower := strings.ToLower(paramTypeHint)
					if strings.Contains(hintLower, "int") {
						paramType = IntegerType
					} else if strings.Contains(hintLower, "bool") {
						paramType = BooleanType
					} else if strings.Contains(hintLower, "array") || strings.Contains(hintLower, "list") {
						paramType = ArrayType
					}
				} else { 
					descLower := strings.ToLower(paramDescription)
					if strings.Contains(descLower, "boolean") || strings.Contains(descLower, "yes/no") {
						paramType = BooleanType
					} else if strings.Contains(descLower, "integer") || strings.Contains(descLower, "id of") {
						paramType = IntegerType
					} else if strings.Contains(descLower, "list of") || strings.Contains(descLower, "comma separated") {
						paramType = ArrayType
					}
				}
				
				location := QueryParam
				if currentEndpoint.Method == POST || currentEndpoint.Method == PUT || currentEndpoint.Method == PATCH {
					location = BodyParam
				}

				currentEndpoint.Parameters = append(currentEndpoint.Parameters, Parameter{
					Name:        paramName,
					Description: paramDescription,
					Type:        paramType,
					Location:    location,
					Required:    false, 
				})
				continue 
			} else if line == "" || endpointRegex.MatchString(line) || (strings.HasPrefix(line, "Power types") || strings.HasPrefix(line, "Pod types")) {
				if err := currentEndpoint.Validate(); err == nil {
					collectedEndpoints = append(collectedEndpoints, *currentEndpoint)
				} else {
					// Log validation error
				}
				currentEndpoint = nil 
			} else if currentEndpoint.Description == "" && line != "" { // Simplified condition
				currentEndpoint.Description += " " + line 
				currentEndpoint.Summary = currentEndpoint.Description 
				continue
			} else if line != "" { 
				currentEndpoint.Description += " " + line
				currentEndpoint.Summary = currentEndpoint.Description
				continue
			}
		}
		
		if line == "" && currentEndpoint == nil { 
			continue
		}

		matches := endpointRegex.FindStringSubmatch(line)
		if matches == nil {
			continue
		}

		if currentEndpoint != nil {
			if err := currentEndpoint.Validate(); err == nil {
				collectedEndpoints = append(collectedEndpoints, *currentEndpoint)
			} else {
				// Log validation error
			}
			currentEndpoint = nil
		}

		method := HTTPMethod(strings.ToUpper(matches[1]))
		fullPath := matches[2]
		description := ""
		if len(matches) > 4 {
			description = strings.TrimSpace(matches[4])
		}

		normalizedPath := strings.TrimPrefix(fullPath, "/MAAS")
		if normalizedPath == "" {
			normalizedPath = "/"
		}

		tags := []string{}
		pathSegmentsForTags := strings.Split(strings.Trim(normalizedPath, "/"), "/")
		if len(pathSegmentsForTags) > 0 {
			firstSegmentIndex := 0
			for i, segment := range pathSegmentsForTags { // Corrected loop variable 'i' usage
				if segment != "api" && segment != "2.0" && !strings.HasPrefix(segment, "{") {
					firstSegmentIndex = i
					break
				}
			}
			if firstSegmentIndex < len(pathSegmentsForTags) {
				tag := strings.ToLower(pathSegmentsForTags[firstSegmentIndex])
				if strings.HasPrefix(tag, "op-") && firstSegmentIndex+1 < len(pathSegmentsForTags) {
					tag = strings.ToLower(pathSegmentsForTags[firstSegmentIndex+1])
				} else if strings.HasPrefix(tag, "op-") {
					if firstSegmentIndex > 0 {
						prevSegment := strings.ToLower(pathSegmentsForTags[firstSegmentIndex-1])
						if prevSegment != "2.0" && prevSegment != "api" {
							tag = prevSegment
						} else {
							tag = strings.TrimPrefix(tag, "op-") 
						}
					} else {
						tag = strings.TrimPrefix(tag, "op-") 
					}
				}
                tag = strings.ReplaceAll(tag, "{", "")
                tag = strings.ReplaceAll(tag, "}", "")
				if tag != "" {
					tags = append(tags, tag)
				}
			}
		}

		var operationID string
		pathSegments := strings.Split(normalizedPath, "/")
		if len(pathSegments) > 0 {
			opIndex := -1
			for i, segment := range pathSegments { // Corrected loop variable 'i' usage
				if strings.HasPrefix(segment, "op-") {
					opIndex = i
					break
				}
			}

			if opIndex != -1 {
				operationID = strings.TrimPrefix(pathSegments[opIndex], "op-")
			} else {
				var idParts []string
				for _, segment := range pathSegments {
					if segment == "" || strings.HasPrefix(segment, "{") && strings.HasSuffix(segment, "}") {
						continue 
					}
					idParts = append(idParts, strings.ToLower(segment))
				}
				if len(idParts) == 0 && len(pathSegments) > 0 && len(pathSegments)-2 >=0 { // Added boundary check
					idParts = append(idParts, strings.ToLower(pathSegments[len(pathSegments)-2]))
				}
				if len(idParts) == 0 { 
					idParts = append(idParts, "root")
				}
				operationID = strings.Join(idParts, "_")
			}
			operationID = strings.ToLower(string(method)) + "_" + strings.ReplaceAll(strings.ReplaceAll(operationID, "{", ""), "}", "")
		}

		pathParams := []Parameter{}
		paramMatches := pathParamRegex.FindAllStringSubmatch(normalizedPath, -1)
		for _, match := range paramMatches {
			paramName := match[1]
			pathParams = append(pathParams, Parameter{
				Name:        paramName,
				Description: fmt.Sprintf("Path parameter %s", paramName),
				Type:        StringType, 
				Location:    PathParam,
				Required:    true,
			})
		}
		
		currentEndpoint = &Endpoint{
			Method:      method,
			Path:        normalizedPath,
			Description: description,
			Summary:     description, 
			OperationID: operationID,
			Parameters:  pathParams,
			Responses:   make(map[int]Response), 
			Tags:        tags,                   
		}
	} 

	if currentEndpoint != nil {
		if err := currentEndpoint.Validate(); err == nil {
			collectedEndpoints = append(collectedEndpoints, *currentEndpoint)
		} else {
			// Log validation error
		}
	}

	powerParams, err := p.parsePowerOrPodTypesSection("Power types")
	if err == nil && len(powerParams) > 0 {
		collectedEndpoints = append(collectedEndpoints, Endpoint{
			Method:      "POST", 
			Path:        "/MAAS/api/2.0/machines/op-power_action", 
			Description: "Perform a power action on a machine using one of the power types.",
			Summary:     "Machine power action",
			OperationID: "post_machines_power_action",
			Parameters:  powerParams,
			Tags:        []string{"machines", "power"},
		})
	}
	
	podParams, err := p.parsePowerOrPodTypesSection("Pod types")
	if err == nil && len(podParams) > 0 {
		collectedEndpoints = append(collectedEndpoints, Endpoint{
			Method:      "POST", 
			Path:        "/MAAS/api/2.0/pods/op-type_action", 
			Description: "Perform an action on a pod using one of the pod types.",
			Summary:     "Pod type action",
			OperationID: "post_pods_type_action",
			Parameters:  podParams,
			Tags:        []string{"pods", "types"},
		})
	}

	return collectedEndpoints, nil
}

// parsePowerOrPodTypesSection parses parameters from sections like "Power types" or "Pod types".
func (p *TextAPIDocumentationParser) parsePowerOrPodTypesSection(sectionTitle string) ([]Parameter, error) {
	params := []Parameter{}
	lines := strings.Split(p.rawDocumentation, "\n")
	inSection := false
	paramRegex := regexp.MustCompile(`^\s*([a-zA-Z0-9_]+)\s+\(([^)]+)\)`)
	choicesRegex := regexp.MustCompile(`^\s*Choices:\s*(.*)`)
	choiceValueRegex := regexp.MustCompile(`'([^']+)'\s*\(([^)]+)\)`)

	var currentParam *Parameter

	for _, line := range lines {
		trimmedLine := strings.TrimSpace(line)

		if strings.HasPrefix(trimmedLine, sectionTitle) {
			inSection = true
			currentParam = nil 
			continue
		}

		if !inSection {
			continue
		}

		if trimmedLine == "" && currentParam != nil { 
			params = append(params, *currentParam)
			currentParam = nil
			continue
		}
		if (strings.HasPrefix(trimmedLine, "GET") || strings.HasPrefix(trimmedLine, "POST") || strings.HasPrefix(trimmedLine, "PUT") || strings.HasPrefix(trimmedLine, "DELETE")) && inSection {
            if currentParam != nil { 
                params = append(params, *currentParam)
                currentParam = nil
            }
			inSection = false 
			break
		}

		matches := paramRegex.FindStringSubmatch(trimmedLine)
		if matches != nil {
			if currentParam != nil { 
				params = append(params, *currentParam)
			}
			paramName := matches[1]
			paramDescOrType := matches[2]
			
			paramType := StringType
			description := paramDescOrType
			if strings.Contains(strings.ToLower(paramDescOrType), "boolean") || strings.Contains(strings.ToLower(paramDescOrType), "yes/no") {
				paramType = BooleanType
			} else if strings.Contains(strings.ToLower(paramDescOrType), "integer") || strings.Contains(strings.ToLower(paramDescOrType), "id of") {
				paramType = IntegerType
			} else if strings.Contains(strings.ToLower(paramDescOrType), "list of") || strings.Contains(strings.ToLower(paramDescOrType), "comma separated") {
				paramType = ArrayType
			}

			currentParam = &Parameter{
				Name:        paramName,
				Description: description,
				Type:        paramType,
				Location:    BodyParam, 
				Required:    false,     
			}
		} else if currentParam != nil && choicesRegex.MatchString(trimmedLine) {
			choicesMatches := choicesRegex.FindStringSubmatch(trimmedLine)
			if len(choicesMatches) > 1 {
				choiceString := choicesMatches[1]
				enumValues := []interface{}{}
				
				individualChoices := choiceValueRegex.FindAllStringSubmatch(choiceString, -1)
				for _, choiceMatch := range individualChoices {
					if len(choiceMatch) > 1 {
						enumValues = append(enumValues, choiceMatch[1]) 
					}
				}
				if len(enumValues) > 0 {
					currentParam.Enum = enumValues
					currentParam.Description = fmt.Sprintf("%s (%s)", currentParam.Description, choiceString)
				}
			}
		}
	}
    if currentParam != nil { 
        params = append(params, *currentParam)
    }

	return params, nil
}

// End of parser file. All TODOs and example comments removed for stability.
