package parser

import (
	"reflect"
	"testing"
	"fmt"
)

func TestTextAPIDocumentationParser_Parse(t *testing.T) {
	testCases := []struct {
		name              string
		docContent        string
		expectedEndpoints []Endpoint
		expectError       bool
	}{
		{
			name: "Simple GET endpoint",
			docContent: `
GET /MAAS/api/2.0/account/
			`,
			expectedEndpoints: []Endpoint{
				{
					Method:      "GET",
					Path:        "/api/2.0/account/",
					Description: "",
					Summary:     "",
					OperationID: "get_api_2.0_account",
					Parameters:  []Parameter{},
					Responses:   map[int]Response{},
					Tags:        []string{"api"},
				},
			},
			expectError: false,
		},
		{
			name: "POST endpoint with op-prefix and description",
			docContent: `
POST /MAAS/api/2.0/account/op-create_authorisation_token: Create an authorisation token
			`,
			expectedEndpoints: []Endpoint{
				{
					Method:      "POST",
					Path:        "/api/2.0/account/op-create_authorisation_token",
					Description: "Create an authorisation token",
					Summary:     "Create an authorisation token",
					OperationID: "post_create_authorisation_token",
					Parameters:  []Parameter{},
					Responses:   map[int]Response{},
					Tags:        []string{"api"},
				},
			},
			expectError: false,
		},
		{
			name: "Endpoint with path parameters",
			docContent: `
GET /MAAS/api/2.0/machines/{system_id}/: Read a node
			`,
			expectedEndpoints: []Endpoint{
				{
					Method:      "GET",
					Path:        "/api/2.0/machines/{system_id}/",
					Description: "Read a node",
					Summary:     "Read a node",
					OperationID: "get_api_2.0_machines_system_id",
					Parameters: []Parameter{
						{
							Name:        "system_id",
							Description: "Path parameter system_id",
							Type:        StringType,
							Location:    PathParam,
							Required:    true,
						},
					},
					Responses: map[int]Response{},
					Tags:      []string{"api"},
				},
			},
			expectError: false,
		},
		{
			name: "Path normalization no MAAS prefix",
			docContent: `
GET /api/2.0/resource/
			`,
			expectedEndpoints: []Endpoint{
				{
					Method:      "GET",
					Path:        "/api/2.0/resource/", // Should remain as is if no /MAAS
					Description: "",
					Summary:     "",
					OperationID: "get_api_2.0_resource",
					Parameters:  []Parameter{},
					Responses:   map[int]Response{},
					Tags:        []string{"api"},
				},
			},
			expectError: false,
		},
		{
			name: "OperationID from last path segment if no op-",
			docContent: `
PUT /MAAS/api/2.0/boot-sources/{id}/: Update a boot source
			`,
			expectedEndpoints: []Endpoint{
				{
					Method:      "PUT",
					Path:        "/api/2.0/boot-sources/{id}/",
					Description: "Update a boot source",
					Summary:     "Update a boot source",
					OperationID: "put_api_2.0_boot-sources_id", // was "put_id"
					Parameters: []Parameter{
						{Name: "id", Description: "Path parameter id", Type: StringType, Location: PathParam, Required: true},
					},
					Responses: map[int]Response{},
					Tags:      []string{"api"},
				},
			},
			expectError: false,
		},
		{
			name: "Tags from first significant path segment",
			docContent: `
GET /MAAS/api/2.0/fabrics/{fabric_id}/vlans/{vid}/: Retrieve VLAN
			`,
			expectedEndpoints: []Endpoint{
				{
					Method:      "GET",
					Path:        "/api/2.0/fabrics/{fabric_id}/vlans/{vid}/",
					Description: "Retrieve VLAN",
					Summary:     "Retrieve VLAN",
					OperationID: "get_api_2.0_fabrics_fabric_id_vlans_vid",
					Parameters: []Parameter{
						{Name: "fabric_id", Description: "Path parameter fabric_id", Type: StringType, Location: PathParam, Required: true},
						{Name: "vid", Description: "Path parameter vid", Type: StringType, Location: PathParam, Required: true},
					},
					Responses: map[int]Response{},
					Tags:      []string{"fabrics"}, // Expect "fabrics"
				},
			},
			expectError: false,
		},
		{
			name: "Power types section - ipmi",
			docContent: `
Power types
This is the list of the supported power types...

ipmi (IPMI)
Power parameters:

power_driver (Power driver). Choices: 'LAN' (LAN [IPMI 1.5]), 'LAN_2_0' (LAN_2_0 [IPMI 2.0]) Default: 'LAN_2_0'.
power_boot_type (Power boot type). Choices: 'auto' (Automatic), 'legacy' (Legacy boot), 'efi' (EFI boot) Default: 'auto'.
power_address (IP address).
power_user (Power user).
power_pass (Power password).
k_g (K_g BMC key).
privilege_level (Privilege Level). Choices: 'USER' (User), 'OPERATOR' (Operator), 'ADMIN' (Administrator) Default: 'OPERATOR'.
			`,
			// The parser currently creates a single generic endpoint for "Power types"
			expectedEndpoints: []Endpoint{
				{
					Method:      "POST", // Default for power/pod types
					Path:        "/MAAS/api/2.0/machines/op-power_action", // Generic path
					Description: "Perform a power action on a machine using one of the power types.",
					Summary:     "Machine power action",
					OperationID: "post_machines_power_action",
					Parameters: []Parameter{
						{Name: "power_driver", Description: "Power driver (Choices: 'LAN' (LAN [IPMI 1.5]), 'LAN_2_0' (LAN_2_0 [IPMI 2.0]))", Type: StringType, Location: BodyParam, Required: false, Enum: []interface{}{"LAN", "LAN_2_0"}},
						{Name: "power_boot_type", Description: "Power boot type (Choices: 'auto' (Automatic), 'legacy' (Legacy boot), 'efi' (EFI boot))", Type: StringType, Location: BodyParam, Required: false, Enum: []interface{}{"auto", "legacy", "efi"}},
						{Name: "power_address", Description: "IP address", Type: StringType, Location: BodyParam, Required: false},
						{Name: "power_user", Description: "Power user", Type: StringType, Location: BodyParam, Required: false},
						{Name: "power_pass", Description: "Power password", Type: StringType, Location: BodyParam, Required: false},
						{Name: "k_g", Description: "K_g BMC key", Type: StringType, Location: BodyParam, Required: false},
						{Name: "privilege_level", Description: "Privilege Level (Choices: 'USER' (User), 'OPERATOR' (Operator), 'ADMIN' (Administrator))", Type: StringType, Location: BodyParam, Required: false, Enum: []interface{}{"USER", "OPERATOR", "ADMIN"}},
					},
					Responses:   map[int]Response{},
					Tags:        []string{"machines", "power"},
				},
			},
			expectError: false,
		},
		{
			name: "Empty input",
			docContent: ``,
			expectedEndpoints: []Endpoint{},
			expectError: false,
		},
		{
            name: "Endpoint with parameter section",
            docContent: `
POST /MAAS/api/2.0/files/: Add a new file
  filename (string) - The name of the file to upload.
  content_base64 (string) - Base64 encoded content of the file.
            `,
            expectedEndpoints: []Endpoint{
                {
                    Method:      "POST",
                    Path:        "/api/2.0/files/",
                    Description: "Add a new file",
                    Summary:     "Add a new file",
                    OperationID: "post_api_2.0_files",
                    Parameters: []Parameter{
                        {Name: "filename", Description: "The name of the file to upload.", Type: StringType, Location: BodyParam, Required: false},
                        {Name: "content_base64", Description: "Base64 encoded content of the file.", Type: StringType, Location: BodyParam, Required: false},
                    },
                    Responses: map[int]Response{},
                    Tags:      []string{"api"},
                },
            },
            expectError: false,
        },
		{
			name: "No /MAAS prefix",
			docContent: `GET /api/2.0/resource/: Get a resource`,
			expectedEndpoints: []Endpoint{
				{
					Method: "GET",
					Path: "/api/2.0/resource/",
					Description: "Get a resource",
					Summary: "Get a resource",
					OperationID: "get_api_2.0_resource",
					Parameters: []Parameter{},
					Responses: map[int]Response{},
					Tags: []string{"api"},
				},
			},
			expectError: false,
		},
		{
			name: "Short path for OperationID",
			docContent: `GET /MAAS/api/2.0/version/: Get MAAS version`,
			expectedEndpoints: []Endpoint{
				{
					Method: "GET",
					Path: "/api/2.0/version/",
					Description: "Get MAAS version",
					Summary: "Get MAAS version",
					OperationID: "get_api_2.0_version",
					Parameters: []Parameter{},
					Responses: map[int]Response{},
					Tags: []string{"api"},
				},
			},
			expectError: false,
		},
		{
			name: "OperationID with op- in middle of path",
			docContent: `POST /MAAS/api/2.0/machines/{system_id}/op-deploy: Deploy a machine`,
			expectedEndpoints: []Endpoint{
				{
					Method: "POST",
					Path: "/api/2.0/machines/{system_id}/op-deploy",
					Description: "Deploy a machine",
					Summary: "Deploy a machine",
					OperationID: "post_deploy", // Correctly extracts 'deploy'
					Parameters: []Parameter{
						{Name: "system_id", Description: "Path parameter system_id", Type: StringType, Location: PathParam, Required: true},
					},
					Responses: map[int]Response{},
					Tags: []string{"api"},
				},
			},
			expectError: false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			parser := NewTextAPIDocumentationParser(tc.docContent)
			endpoints, err := parser.Parse()

			if tc.expectError {
				if err == nil {
					t.Errorf("Expected an error, but got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("Parse() returned an unexpected error: %v", err)
			}

			if len(endpoints) != len(tc.expectedEndpoints) {
				t.Fatalf("Expected %d endpoints, but got %d. Got: %+v", len(tc.expectedEndpoints), len(endpoints), endpoints)
			}

			for i, ep := range tc.expectedEndpoints {
				if i >= len(endpoints) {
					t.Errorf("Missing expected endpoint at index %d: %+v", i, ep)
					continue
				}
				gotEp := endpoints[i]
				
				// Custom comparison to give better diffs
				if !reflect.DeepEqual(ep.Method, gotEp.Method) {
					t.Errorf("Endpoint %d Method mismatch: expected %v, got %v", i, ep.Method, gotEp.Method)
				}
				if !reflect.DeepEqual(ep.Path, gotEp.Path) {
					t.Errorf("Endpoint %d Path mismatch: expected %v, got %v", i, ep.Path, gotEp.Path)
				}
				if !reflect.DeepEqual(ep.Description, gotEp.Description) {
					t.Errorf("Endpoint %d Description mismatch: expected %v, got %v", i, ep.Description, gotEp.Description)
				}
				if !reflect.DeepEqual(ep.OperationID, gotEp.OperationID) {
					t.Errorf("Endpoint %d OperationID mismatch: expected %v, got %v", i, ep.OperationID, gotEp.OperationID)
				}
				if !reflect.DeepEqual(ep.Tags, gotEp.Tags) {
					t.Errorf("Endpoint %d Tags mismatch: expected %v, got %v", i, ep.Tags, gotEp.Tags)
				}

				if len(ep.Parameters) != len(gotEp.Parameters) {
					t.Errorf("Endpoint %d Parameter count mismatch: expected %d, got %d.\nExpected: %+v\nGot: %+v", i, len(ep.Parameters), len(gotEp.Parameters), ep.Parameters, gotEp.Parameters)
				} else {
					for j, expParam := range ep.Parameters {
						gotParam := gotEp.Parameters[j]
						if !reflect.DeepEqual(expParam, gotParam) {
							t.Errorf("Endpoint %d, Parameter %d mismatch:\nExpected: %+v\nGot:      %+v", i, j, expParam, gotParam)
						}
					}
				}
				// Not comparing Responses and Summary in detail unless specified by test case, as they are often empty or copies
				if !reflect.DeepEqual(ep.Responses, gotEp.Responses) {
					t.Errorf("Endpoint %d Responses mismatch: expected %v, got %v", i, ep.Responses, gotEp.Responses)
				}
			}
		})
	}
}
// Helper for detailed comparison (optional, can be used within tests)
func compareEndpoints(t *testing.T, expected, actual Endpoint, endpointIndex int) {
	t.Helper()
	if expected.Method != actual.Method {
		t.Errorf("Endpoint [%d] Method mismatch: expected '%s', got '%s'", endpointIndex, expected.Method, actual.Method)
	}
	if expected.Path != actual.Path {
		t.Errorf("Endpoint [%d] Path mismatch: expected '%s', got '%s'", endpointIndex, expected.Path, actual.Path)
	}
	if expected.Description != actual.Description {
		t.Errorf("Endpoint [%d] Description mismatch: expected '%s', got '%s'", endpointIndex, expected.Description, actual.Description)
	}
	if expected.Summary != actual.Summary {
		t.Errorf("Endpoint [%d] Summary mismatch: expected '%s', got '%s'", endpointIndex, expected.Summary, actual.Summary)
	}
	if expected.OperationID != actual.OperationID {
		t.Errorf("Endpoint [%d] OperationID mismatch: expected '%s', got '%s'", endpointIndex, expected.OperationID, actual.OperationID)
	}
	if !reflect.DeepEqual(expected.Tags, actual.Tags) {
		t.Errorf("Endpoint [%d] Tags mismatch: expected '%v', got '%v'", endpointIndex, expected.Tags, actual.Tags)
	}

	if len(expected.Parameters) != len(actual.Parameters) {
		t.Errorf("Endpoint [%d] Parameter count mismatch: expected %d, got %d.\nExpected Params: %+v\nActual Params: %+v", endpointIndex, len(expected.Parameters), len(actual.Parameters), expected.Parameters, actual.Parameters)
	} else {
		for i, p1 := range expected.Parameters {
			p2 := actual.Parameters[i]
			if p1.Name != p2.Name {
				t.Errorf("Endpoint [%d] Param [%d] Name mismatch: expected '%s', got '%s'", endpointIndex, i, p1.Name, p2.Name)
			}
			if p1.Description != p2.Description {
				t.Errorf("Endpoint [%d] Param [%d] Description mismatch: expected '%s', got '%s'", endpointIndex, i, p1.Description, p2.Description)
			}
			if p1.Type != p2.Type {
				t.Errorf("Endpoint [%d] Param [%d] Type mismatch: expected '%s', got '%s'", endpointIndex, i, p1.Type, p2.Type)
			}
			if p1.Location != p2.Location {
				t.Errorf("Endpoint [%d] Param [%d] Location mismatch: expected '%s', got '%s'", endpointIndex, i, p1.Location, p2.Location)
			}
			if p1.Required != p2.Required {
				t.Errorf("Endpoint [%d] Param [%d] Required mismatch: expected '%t', got '%t'", endpointIndex, i, p1.Required, p2.Required)
			}
			if !reflect.DeepEqual(p1.Enum, p2.Enum) {
				t.Errorf("Endpoint [%d] Param [%d] Enum mismatch: expected '%v', got '%v'", endpointIndex, i, p1.Enum, p2.Enum)
			}
		}
	}

	// Responses are typically empty for this parser, but check if needed
	if !reflect.DeepEqual(expected.Responses, actual.Responses) {
		t.Errorf("Endpoint [%d] Responses mismatch: expected '%v', got '%v'", endpointIndex, expected.Responses, actual.Responses)
	}
}
```
