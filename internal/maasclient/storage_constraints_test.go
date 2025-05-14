package maasclient

import (
	"testing"

	"github.com/lspecian/maas-mcp-server/internal/models"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
)

func TestSetStorageConstraints(t *testing.T) {
	// Create a test client
	logger := logrus.New()
	logger.SetLevel(logrus.ErrorLevel)
	client := &MaasClient{
		logger: logger,
	}

	// Test cases
	tests := []struct {
		name      string
		systemID  string
		params    models.StorageConstraintParams
		expectErr bool
	}{
		{
			name:     "Valid parameters",
			systemID: "abc123",
			params: models.StorageConstraintParams{
				Constraints: []models.StorageConstraint{
					{
						Type:       models.SizeConstraint,
						Value:      "100G",
						Operator:   ">=",
						TargetType: "disk",
					},
				},
			},
			expectErr: false,
		},
		{
			name:      "Empty system ID",
			systemID:  "",
			params:    models.StorageConstraintParams{},
			expectErr: true,
		},
		{
			name:      "Empty constraints",
			systemID:  "abc123",
			params:    models.StorageConstraintParams{},
			expectErr: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := client.SetStorageConstraints(tc.systemID, tc.params)
			if tc.expectErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestGetStorageConstraints(t *testing.T) {
	// Create a test client
	logger := logrus.New()
	logger.SetLevel(logrus.ErrorLevel)
	client := &MaasClient{
		logger: logger,
	}

	// Test cases
	tests := []struct {
		name      string
		systemID  string
		expectErr bool
	}{
		{
			name:      "Valid system ID",
			systemID:  "abc123",
			expectErr: false,
		},
		{
			name:      "Empty system ID",
			systemID:  "",
			expectErr: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			params, err := client.GetStorageConstraints(tc.systemID)
			if tc.expectErr {
				assert.Error(t, err)
				assert.Nil(t, params)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, params)
				assert.NotEmpty(t, params.Constraints)
			}
		})
	}
}

func TestValidateStorageConstraints(t *testing.T) {
	// Create a test client
	logger := logrus.New()
	logger.SetLevel(logrus.ErrorLevel)
	client := &MaasClient{
		logger: logger,
	}

	// Test cases
	tests := []struct {
		name      string
		systemID  string
		params    models.StorageConstraintParams
		expectErr bool
	}{
		{
			name:     "Valid parameters",
			systemID: "abc123",
			params: models.StorageConstraintParams{
				Constraints: []models.StorageConstraint{
					{
						Type:       models.SizeConstraint,
						Value:      "100G",
						Operator:   ">=",
						TargetType: "disk",
					},
				},
			},
			expectErr: false,
		},
		{
			name:      "Empty system ID",
			systemID:  "",
			params:    models.StorageConstraintParams{},
			expectErr: true,
		},
		{
			name:      "Empty constraints",
			systemID:  "abc123",
			params:    models.StorageConstraintParams{},
			expectErr: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			valid, violations, err := client.ValidateStorageConstraints(tc.systemID, tc.params)
			if tc.expectErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.True(t, valid)
				assert.Empty(t, violations)
			}
		})
	}
}

func TestApplyStorageConstraints(t *testing.T) {
	// Create a test client
	logger := logrus.New()
	logger.SetLevel(logrus.ErrorLevel)
	client := &MaasClient{
		logger: logger,
	}

	// Test cases
	tests := []struct {
		name      string
		systemID  string
		params    models.StorageConstraintParams
		expectErr bool
	}{
		{
			name:     "Valid parameters",
			systemID: "abc123",
			params: models.StorageConstraintParams{
				Constraints: []models.StorageConstraint{
					{
						Type:       models.SizeConstraint,
						Value:      "100G",
						Operator:   ">=",
						TargetType: "disk",
					},
				},
			},
			expectErr: false,
		},
		{
			name:      "Empty system ID",
			systemID:  "",
			params:    models.StorageConstraintParams{},
			expectErr: true,
		},
		{
			name:      "Empty constraints",
			systemID:  "abc123",
			params:    models.StorageConstraintParams{},
			expectErr: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := client.ApplyStorageConstraints(tc.systemID, tc.params)
			if tc.expectErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestDeleteStorageConstraints(t *testing.T) {
	// Create a test client
	logger := logrus.New()
	logger.SetLevel(logrus.ErrorLevel)
	client := &MaasClient{
		logger: logger,
	}

	// Test cases
	tests := []struct {
		name      string
		systemID  string
		expectErr bool
	}{
		{
			name:      "Valid system ID",
			systemID:  "abc123",
			expectErr: false,
		},
		{
			name:      "Empty system ID",
			systemID:  "",
			expectErr: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := client.DeleteStorageConstraints(tc.systemID)
			if tc.expectErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}
