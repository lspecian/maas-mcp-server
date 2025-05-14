package maasclient

import (
	"testing"

	"github.com/lspecian/maas-mcp-server/internal/models"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
)

func setupRAIDTestClient(t *testing.T) *MaasClient {
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)

	config := &models.AppConfig{
		MAASInstances: map[string]models.MAASInstanceConfig{
			"default": {
				APIURL: "http://localhost:5240/MAAS",
				APIKey: "test:test:test",
			},
		},
	}

	client := &MaasClient{
		logger: logger,
		config: config,
	}

	return client
}

func TestCreateRAID(t *testing.T) {
	client := setupRAIDTestClient(t)

	tests := []struct {
		name      string
		systemID  string
		params    models.RAIDParams
		wantErr   bool
		errString string
	}{
		{
			name:     "Valid RAID creation",
			systemID: "abc123",
			params: models.RAIDParams{
				Name:         "test-raid",
				Level:        models.RAID1,
				BlockDevices: []int{1, 2},
			},
			wantErr: false,
		},
		{
			name:     "Empty system ID",
			systemID: "",
			params: models.RAIDParams{
				Name:         "test-raid",
				Level:        models.RAID1,
				BlockDevices: []int{1, 2},
			},
			wantErr:   true,
			errString: "system ID is required",
		},
		{
			name:     "Empty RAID name",
			systemID: "abc123",
			params: models.RAIDParams{
				Level:        models.RAID1,
				BlockDevices: []int{1, 2},
			},
			wantErr:   true,
			errString: "invalid RAID parameters: RAID name is required",
		},
		{
			name:     "Empty RAID level",
			systemID: "abc123",
			params: models.RAIDParams{
				Name:         "test-raid",
				BlockDevices: []int{1, 2},
			},
			wantErr:   true,
			errString: "invalid RAID parameters: RAID level is required",
		},
		{
			name:     "No devices specified",
			systemID: "abc123",
			params: models.RAIDParams{
				Name:  "test-raid",
				Level: models.RAID1,
			},
			wantErr:   true,
			errString: "invalid RAID parameters: at least one block device or partition is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			raid, err := client.CreateRAID(tt.systemID, tt.params)

			if tt.wantErr {
				assert.Error(t, err)
				if tt.errString != "" {
					assert.Contains(t, err.Error(), tt.errString)
				}
				assert.Nil(t, raid)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, raid)
				assert.Equal(t, tt.params.Name, raid.Name)
				assert.Equal(t, tt.params.Level, raid.Level)
				assert.Equal(t, tt.systemID, raid.SystemID)
				assert.Equal(t, tt.params.BlockDevices, raid.BlockDevices)
			}
		})
	}
}

func TestDeleteRAID(t *testing.T) {
	client := setupRAIDTestClient(t)

	tests := []struct {
		name      string
		systemID  string
		raidID    int
		wantErr   bool
		errString string
	}{
		{
			name:     "Valid RAID deletion",
			systemID: "abc123",
			raidID:   1,
			wantErr:  false,
		},
		{
			name:      "Empty system ID",
			systemID:  "",
			raidID:    1,
			wantErr:   true,
			errString: "system ID is required",
		},
		{
			name:      "Invalid RAID ID",
			systemID:  "abc123",
			raidID:    0,
			wantErr:   true,
			errString: "valid RAID ID is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := client.DeleteRAID(tt.systemID, tt.raidID)

			if tt.wantErr {
				assert.Error(t, err)
				if tt.errString != "" {
					assert.Contains(t, err.Error(), tt.errString)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestGetRAID(t *testing.T) {
	client := setupRAIDTestClient(t)

	tests := []struct {
		name      string
		systemID  string
		raidID    int
		wantErr   bool
		errString string
	}{
		{
			name:     "Valid RAID retrieval",
			systemID: "abc123",
			raidID:   1,
			wantErr:  false,
		},
		{
			name:      "Empty system ID",
			systemID:  "",
			raidID:    1,
			wantErr:   true,
			errString: "system ID is required",
		},
		{
			name:      "Invalid RAID ID",
			systemID:  "abc123",
			raidID:    0,
			wantErr:   true,
			errString: "valid RAID ID is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			raid, err := client.GetRAID(tt.systemID, tt.raidID)

			if tt.wantErr {
				assert.Error(t, err)
				if tt.errString != "" {
					assert.Contains(t, err.Error(), tt.errString)
				}
				assert.Nil(t, raid)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, raid)
				assert.Equal(t, tt.raidID, raid.ID)
				assert.Equal(t, tt.systemID, raid.SystemID)
			}
		})
	}
}

func TestListRAIDs(t *testing.T) {
	client := setupRAIDTestClient(t)

	tests := []struct {
		name      string
		systemID  string
		wantErr   bool
		errString string
	}{
		{
			name:     "Valid RAID listing",
			systemID: "abc123",
			wantErr:  false,
		},
		{
			name:      "Empty system ID",
			systemID:  "",
			wantErr:   true,
			errString: "system ID is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			raids, err := client.ListRAIDs(tt.systemID)

			if tt.wantErr {
				assert.Error(t, err)
				if tt.errString != "" {
					assert.Contains(t, err.Error(), tt.errString)
				}
				assert.Nil(t, raids)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, raids)
				assert.Len(t, raids, 2) // We simulate 2 RAID arrays
				for _, raid := range raids {
					assert.Equal(t, tt.systemID, raid.SystemID)
				}
			}
		})
	}
}

func TestUpdateRAID(t *testing.T) {
	client := setupRAIDTestClient(t)

	tests := []struct {
		name      string
		systemID  string
		raidID    int
		params    models.RAIDUpdateParams
		wantErr   bool
		errString string
	}{
		{
			name:     "Valid RAID update - name",
			systemID: "abc123",
			raidID:   1,
			params: models.RAIDUpdateParams{
				Name: "updated-raid",
			},
			wantErr: false,
		},
		{
			name:     "Valid RAID update - add devices",
			systemID: "abc123",
			raidID:   1,
			params: models.RAIDUpdateParams{
				AddBlockDevices: []int{3, 4},
			},
			wantErr: false,
		},
		{
			name:     "Valid RAID update - remove devices",
			systemID: "abc123",
			raidID:   1,
			params: models.RAIDUpdateParams{
				RemBlockDevices: []int{1},
			},
			wantErr: false,
		},
		{
			name:      "Empty system ID",
			systemID:  "",
			raidID:    1,
			params:    models.RAIDUpdateParams{Name: "updated-raid"},
			wantErr:   true,
			errString: "system ID is required",
		},
		{
			name:      "Invalid RAID ID",
			systemID:  "abc123",
			raidID:    0,
			params:    models.RAIDUpdateParams{Name: "updated-raid"},
			wantErr:   true,
			errString: "valid RAID ID is required",
		},
		{
			name:      "Empty update params",
			systemID:  "abc123",
			raidID:    1,
			params:    models.RAIDUpdateParams{},
			wantErr:   true,
			errString: "invalid RAID update parameters: at least one field must be set for update",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			raid, err := client.UpdateRAID(tt.systemID, tt.raidID, tt.params)

			if tt.wantErr {
				assert.Error(t, err)
				if tt.errString != "" {
					assert.Contains(t, err.Error(), tt.errString)
				}
				assert.Nil(t, raid)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, raid)
				assert.Equal(t, tt.raidID, raid.ID)
				assert.Equal(t, tt.systemID, raid.SystemID)

				// Check if name was updated
				if tt.params.Name != "" {
					assert.Equal(t, tt.params.Name, raid.Name)
				}
			}
		})
	}
}
