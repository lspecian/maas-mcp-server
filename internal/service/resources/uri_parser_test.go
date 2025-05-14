package resources

import (
	"testing"
)

func TestParseURI(t *testing.T) {
	tests := []struct {
		name        string
		uri         string
		wantScheme  string
		wantResType string
		wantResID   string
		wantSubType string
		wantSubID   string
		wantErr     bool
	}{
		{
			name:        "Machine URI",
			uri:         "maas://machine/abc123",
			wantScheme:  "maas",
			wantResType: "machine",
			wantResID:   "abc123",
			wantSubType: "",
			wantSubID:   "",
			wantErr:     false,
		},
		{
			name:        "Machine with sub-resource",
			uri:         "maas://machine/abc123/power",
			wantScheme:  "maas",
			wantResType: "machine",
			wantResID:   "abc123",
			wantSubType: "power",
			wantSubID:   "",
			wantErr:     false,
		},
		{
			name:        "Machine with sub-resource and ID",
			uri:         "maas://machine/abc123/interfaces/eth0",
			wantScheme:  "maas",
			wantResType: "machine",
			wantResID:   "abc123",
			wantSubType: "interfaces",
			wantSubID:   "eth0",
			wantErr:     false,
		},
		{
			name:        "Subnet URI",
			uri:         "maas://subnet/123",
			wantScheme:  "maas",
			wantResType: "subnet",
			wantResID:   "123",
			wantSubType: "",
			wantSubID:   "",
			wantErr:     false,
		},
		{
			name:        "URI with query parameters",
			uri:         "maas://machine/abc123?filter=status&value=deployed",
			wantScheme:  "maas",
			wantResType: "machine",
			wantResID:   "abc123",
			wantSubType: "",
			wantSubID:   "",
			wantErr:     false,
		},
		{
			name:    "Invalid URI format",
			uri:     "invalid-uri",
			wantErr: true,
		},
		{
			name:    "Empty URI",
			uri:     "",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ParseURI(tt.uri)
			if (err != nil) != tt.wantErr {
				t.Errorf("ParseURI() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if err != nil {
				return
			}
			if got.Scheme != tt.wantScheme {
				t.Errorf("ParseURI() Scheme = %v, want %v", got.Scheme, tt.wantScheme)
			}
			if got.ResourceType != tt.wantResType {
				t.Errorf("ParseURI() ResourceType = %v, want %v", got.ResourceType, tt.wantResType)
			}
			if got.ResourceID != tt.wantResID {
				t.Errorf("ParseURI() ResourceID = %v, want %v", got.ResourceID, tt.wantResID)
			}
			if got.SubResourceType != tt.wantSubType {
				t.Errorf("ParseURI() SubResourceType = %v, want %v", got.SubResourceType, tt.wantSubType)
			}
			if got.SubResourceID != tt.wantSubID {
				t.Errorf("ParseURI() SubResourceID = %v, want %v", got.SubResourceID, tt.wantSubID)
			}
		})
	}
}

func TestMatchURI(t *testing.T) {
	tests := []struct {
		name       string
		uri        string
		pattern    string
		wantParams map[string]string
		wantErr    bool
	}{
		{
			name:    "Simple pattern match",
			uri:     "maas://machine/abc123",
			pattern: "maas://machine/{system_id}",
			wantParams: map[string]string{
				"system_id": "abc123",
			},
			wantErr: false,
		},
		{
			name:    "Pattern with sub-resource",
			uri:     "maas://machine/abc123/power",
			pattern: "maas://machine/{system_id}/power",
			wantParams: map[string]string{
				"system_id": "abc123",
			},
			wantErr: false,
		},
		{
			name:    "Pattern with sub-resource and ID",
			uri:     "maas://machine/abc123/interfaces/eth0",
			pattern: "maas://machine/{system_id}/interfaces/{interface_id}",
			wantParams: map[string]string{
				"system_id":    "abc123",
				"interface_id": "eth0",
			},
			wantErr: false,
		},
		{
			name:    "Pattern with optional parameter (present)",
			uri:     "maas://machine/abc123/tags/web-server",
			pattern: "maas://machine/{system_id}/tags/{tag_name?}",
			wantParams: map[string]string{
				"system_id": "abc123",
				"tag_name":  "web-server",
			},
			wantErr: false,
		},
		{
			name:    "Pattern with optional parameter (not present)",
			uri:     "maas://machine/abc123/tags",
			pattern: "maas://machine/{system_id}/tags/{tag_name?}",
			wantParams: map[string]string{
				"system_id": "abc123",
				"tag_name":  "",
			},
			wantErr: false,
		},
		{
			name:    "Pattern with enumerated values (matching)",
			uri:     "maas://machine/abc123/power/on",
			pattern: "maas://machine/{system_id}/power/{action:on|off}",
			wantParams: map[string]string{
				"system_id": "abc123",
				"action":    "on",
			},
			wantErr: false,
		},
		{
			name:    "Pattern with enumerated values (not matching)",
			uri:     "maas://machine/abc123/power/restart",
			pattern: "maas://machine/{system_id}/power/{action:on|off}",
			wantErr: true,
		},
		{
			name:    "URI doesn't match pattern",
			uri:     "maas://subnet/123",
			pattern: "maas://machine/{system_id}",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := MatchURI(tt.uri, tt.pattern)
			if (err != nil) != tt.wantErr {
				t.Errorf("MatchURI() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if err != nil {
				return
			}
			for k, v := range tt.wantParams {
				if got.Parameters[k] != v {
					t.Errorf("MatchURI() Parameters[%s] = %v, want %v", k, got.Parameters[k], v)
				}
			}
		})
	}
}

func TestValidateURI(t *testing.T) {
	tests := []struct {
		name    string
		uri     string
		pattern string
		wantErr bool
	}{
		{
			name:    "Valid URI",
			uri:     "maas://machine/abc123",
			pattern: "maas://machine/{system_id}",
			wantErr: false,
		},
		{
			name:    "Invalid URI",
			uri:     "maas://subnet/123",
			pattern: "maas://machine/{system_id}",
			wantErr: true,
		},
		{
			name:    "Valid URI with optional parameter",
			uri:     "maas://machine/abc123/tags",
			pattern: "maas://machine/{system_id}/tags/{tag_name?}",
			wantErr: false,
		},
		{
			name:    "Valid URI with enumerated value",
			uri:     "maas://machine/abc123/power/on",
			pattern: "maas://machine/{system_id}/power/{action:on|off}",
			wantErr: false,
		},
		{
			name:    "Invalid URI with enumerated value",
			uri:     "maas://machine/abc123/power/restart",
			pattern: "maas://machine/{system_id}/power/{action:on|off}",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateURI(tt.uri, tt.pattern)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateURI() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
