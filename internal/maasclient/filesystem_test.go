package maasclient

import (
	"testing"

	"github.com/lspecian/maas-mcp-server/internal/models"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
)

func setupTestClient(t *testing.T) *MaasClient {
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)

	config := &models.AppConfig{
		MAASInstances: make(map[string]models.MAASInstanceConfig),
	}
	config.MAASInstances["default"] = models.MAASInstanceConfig{
		APIURL: "http://test.maas",
		APIKey: "test:test:test",
	}

	client := &MaasClient{
		logger: logger,
		config: config,
	}

	return client
}

func TestCreateFilesystem(t *testing.T) {
	client := setupTestClient(t)

	tests := []struct {
		name       string
		systemID   string
		deviceID   string
		deviceType string
		params     models.FilesystemParams
		wantErr    bool
		errMsg     string
	}{
		{
			name:       "Valid filesystem creation",
			systemID:   "abc123",
			deviceID:   "1",
			deviceType: "block-device",
			params: models.FilesystemParams{
				FSType:     "ext4",
				Label:      "test-fs",
				MountPoint: "/mnt/test",
			},
			wantErr: false,
		},
		{
			name:       "Missing system ID",
			systemID:   "",
			deviceID:   "1",
			deviceType: "block-device",
			params: models.FilesystemParams{
				FSType: "ext4",
			},
			wantErr: true,
			errMsg:  "system ID is required",
		},
		{
			name:       "Missing device ID",
			systemID:   "abc123",
			deviceID:   "",
			deviceType: "block-device",
			params: models.FilesystemParams{
				FSType: "ext4",
			},
			wantErr: true,
			errMsg:  "device ID is required",
		},
		{
			name:       "Missing device type",
			systemID:   "abc123",
			deviceID:   "1",
			deviceType: "",
			params: models.FilesystemParams{
				FSType: "ext4",
			},
			wantErr: true,
			errMsg:  "device type is required",
		},
		{
			name:       "Missing filesystem type",
			systemID:   "abc123",
			deviceID:   "1",
			deviceType: "block-device",
			params:     models.FilesystemParams{},
			wantErr:    true,
			errMsg:     "invalid filesystem parameters: filesystem type is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fs, err := client.CreateFilesystem(tt.systemID, tt.deviceID, tt.deviceType, tt.params)
			if tt.wantErr {
				assert.Error(t, err)
				if tt.errMsg != "" {
					assert.Contains(t, err.Error(), tt.errMsg)
				}
				assert.Nil(t, fs)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, fs)
				assert.Equal(t, tt.params.FSType, fs.FSType)
				if tt.params.MountPoint != "" {
					assert.Equal(t, tt.params.MountPoint, fs.MountPoint)
				}
			}
		})
	}
}

func TestMountFilesystem(t *testing.T) {
	client := setupTestClient(t)

	tests := []struct {
		name         string
		systemID     string
		deviceID     string
		deviceType   string
		filesystemID int
		params       models.MountParams
		wantErr      bool
		errMsg       string
	}{
		{
			name:         "Valid filesystem mounting",
			systemID:     "abc123",
			deviceID:     "1",
			deviceType:   "block-device",
			filesystemID: 1,
			params: models.MountParams{
				MountPoint:   "/mnt/test",
				MountOptions: "defaults",
			},
			wantErr: false,
		},
		{
			name:         "Missing system ID",
			systemID:     "",
			deviceID:     "1",
			deviceType:   "block-device",
			filesystemID: 1,
			params: models.MountParams{
				MountPoint: "/mnt/test",
			},
			wantErr: true,
			errMsg:  "system ID is required",
		},
		{
			name:         "Missing device ID",
			systemID:     "abc123",
			deviceID:     "",
			deviceType:   "block-device",
			filesystemID: 1,
			params: models.MountParams{
				MountPoint: "/mnt/test",
			},
			wantErr: true,
			errMsg:  "device ID is required",
		},
		{
			name:         "Missing device type",
			systemID:     "abc123",
			deviceID:     "1",
			deviceType:   "",
			filesystemID: 1,
			params: models.MountParams{
				MountPoint: "/mnt/test",
			},
			wantErr: true,
			errMsg:  "device type is required",
		},
		{
			name:         "Invalid filesystem ID",
			systemID:     "abc123",
			deviceID:     "1",
			deviceType:   "block-device",
			filesystemID: 0,
			params: models.MountParams{
				MountPoint: "/mnt/test",
			},
			wantErr: true,
			errMsg:  "valid filesystem ID is required",
		},
		{
			name:         "Missing mount point",
			systemID:     "abc123",
			deviceID:     "1",
			deviceType:   "block-device",
			filesystemID: 1,
			params:       models.MountParams{},
			wantErr:      true,
			errMsg:       "invalid mount parameters: mount point is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := client.MountFilesystem(tt.systemID, tt.deviceID, tt.deviceType, tt.filesystemID, tt.params)
			if tt.wantErr {
				assert.Error(t, err)
				if tt.errMsg != "" {
					assert.Contains(t, err.Error(), tt.errMsg)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestUnmountFilesystem(t *testing.T) {
	client := setupTestClient(t)

	tests := []struct {
		name         string
		systemID     string
		deviceID     string
		deviceType   string
		filesystemID int
		wantErr      bool
		errMsg       string
	}{
		{
			name:         "Valid filesystem unmounting",
			systemID:     "abc123",
			deviceID:     "1",
			deviceType:   "block-device",
			filesystemID: 1,
			wantErr:      false,
		},
		{
			name:         "Missing system ID",
			systemID:     "",
			deviceID:     "1",
			deviceType:   "block-device",
			filesystemID: 1,
			wantErr:      true,
			errMsg:       "system ID is required",
		},
		{
			name:         "Missing device ID",
			systemID:     "abc123",
			deviceID:     "",
			deviceType:   "block-device",
			filesystemID: 1,
			wantErr:      true,
			errMsg:       "device ID is required",
		},
		{
			name:         "Missing device type",
			systemID:     "abc123",
			deviceID:     "1",
			deviceType:   "",
			filesystemID: 1,
			wantErr:      true,
			errMsg:       "device type is required",
		},
		{
			name:         "Invalid filesystem ID",
			systemID:     "abc123",
			deviceID:     "1",
			deviceType:   "block-device",
			filesystemID: 0,
			wantErr:      true,
			errMsg:       "valid filesystem ID is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := client.UnmountFilesystem(tt.systemID, tt.deviceID, tt.deviceType, tt.filesystemID)
			if tt.wantErr {
				assert.Error(t, err)
				if tt.errMsg != "" {
					assert.Contains(t, err.Error(), tt.errMsg)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestDeleteFilesystem(t *testing.T) {
	client := setupTestClient(t)

	tests := []struct {
		name         string
		systemID     string
		deviceID     string
		deviceType   string
		filesystemID int
		wantErr      bool
		errMsg       string
	}{
		{
			name:         "Valid filesystem deletion",
			systemID:     "abc123",
			deviceID:     "1",
			deviceType:   "block-device",
			filesystemID: 1,
			wantErr:      false,
		},
		{
			name:         "Missing system ID",
			systemID:     "",
			deviceID:     "1",
			deviceType:   "block-device",
			filesystemID: 1,
			wantErr:      true,
			errMsg:       "system ID is required",
		},
		{
			name:         "Missing device ID",
			systemID:     "abc123",
			deviceID:     "",
			deviceType:   "block-device",
			filesystemID: 1,
			wantErr:      true,
			errMsg:       "device ID is required",
		},
		{
			name:         "Missing device type",
			systemID:     "abc123",
			deviceID:     "1",
			deviceType:   "",
			filesystemID: 1,
			wantErr:      true,
			errMsg:       "device type is required",
		},
		{
			name:         "Invalid filesystem ID",
			systemID:     "abc123",
			deviceID:     "1",
			deviceType:   "block-device",
			filesystemID: 0,
			wantErr:      true,
			errMsg:       "valid filesystem ID is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := client.DeleteFilesystem(tt.systemID, tt.deviceID, tt.deviceType, tt.filesystemID)
			if tt.wantErr {
				assert.Error(t, err)
				if tt.errMsg != "" {
					assert.Contains(t, err.Error(), tt.errMsg)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestGetFilesystem(t *testing.T) {
	client := setupTestClient(t)

	tests := []struct {
		name         string
		systemID     string
		deviceID     string
		deviceType   string
		filesystemID int
		wantErr      bool
		errMsg       string
	}{
		{
			name:         "Valid filesystem retrieval",
			systemID:     "abc123",
			deviceID:     "1",
			deviceType:   "block-device",
			filesystemID: 1,
			wantErr:      false,
		},
		{
			name:         "Missing system ID",
			systemID:     "",
			deviceID:     "1",
			deviceType:   "block-device",
			filesystemID: 1,
			wantErr:      true,
			errMsg:       "system ID is required",
		},
		{
			name:         "Missing device ID",
			systemID:     "abc123",
			deviceID:     "",
			deviceType:   "block-device",
			filesystemID: 1,
			wantErr:      true,
			errMsg:       "device ID is required",
		},
		{
			name:         "Missing device type",
			systemID:     "abc123",
			deviceID:     "1",
			deviceType:   "",
			filesystemID: 1,
			wantErr:      true,
			errMsg:       "device type is required",
		},
		{
			name:         "Invalid filesystem ID",
			systemID:     "abc123",
			deviceID:     "1",
			deviceType:   "block-device",
			filesystemID: 0,
			wantErr:      true,
			errMsg:       "valid filesystem ID is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fs, err := client.GetFilesystem(tt.systemID, tt.deviceID, tt.deviceType, tt.filesystemID)
			if tt.wantErr {
				assert.Error(t, err)
				if tt.errMsg != "" {
					assert.Contains(t, err.Error(), tt.errMsg)
				}
				assert.Nil(t, fs)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, fs)
				assert.Equal(t, tt.filesystemID, fs.ID)
			}
		})
	}
}

func TestListFilesystems(t *testing.T) {
	client := setupTestClient(t)

	tests := []struct {
		name     string
		systemID string
		params   models.FilesystemListParams
		wantErr  bool
		errMsg   string
	}{
		{
			name:     "Valid filesystem listing",
			systemID: "abc123",
			params:   models.FilesystemListParams{},
			wantErr:  false,
		},
		{
			name:     "Valid filesystem listing with device type filter",
			systemID: "abc123",
			params: models.FilesystemListParams{
				DeviceType: "block-device",
			},
			wantErr: false,
		},
		{
			name:     "Missing system ID",
			systemID: "",
			params:   models.FilesystemListParams{},
			wantErr:  true,
			errMsg:   "system ID is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			filesystems, err := client.ListFilesystems(tt.systemID, tt.params)
			if tt.wantErr {
				assert.Error(t, err)
				if tt.errMsg != "" {
					assert.Contains(t, err.Error(), tt.errMsg)
				}
				assert.Nil(t, filesystems)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, filesystems)
				if tt.params.DeviceType == "block-device" {
					assert.Len(t, filesystems, 1)
				} else if tt.params.DeviceType == "partition" {
					assert.Len(t, filesystems, 1)
				} else {
					assert.Len(t, filesystems, 2)
				}
			}
		})
	}
}

func TestFormatAndMountFilesystem(t *testing.T) {
	client := setupTestClient(t)

	tests := []struct {
		name        string
		systemID    string
		deviceID    string
		deviceType  string
		fsParams    models.FilesystemParams
		mountParams models.MountParams
		wantErr     bool
		errMsg      string
	}{
		{
			name:       "Valid format and mount",
			systemID:   "abc123",
			deviceID:   "1",
			deviceType: "block-device",
			fsParams: models.FilesystemParams{
				FSType: "ext4",
				Label:  "test-fs",
			},
			mountParams: models.MountParams{
				MountPoint:   "/mnt/test",
				MountOptions: "defaults",
			},
			wantErr: false,
		},
		{
			name:       "Missing system ID",
			systemID:   "",
			deviceID:   "1",
			deviceType: "block-device",
			fsParams: models.FilesystemParams{
				FSType: "ext4",
			},
			mountParams: models.MountParams{
				MountPoint: "/mnt/test",
			},
			wantErr: true,
			errMsg:  "failed to create filesystem: system ID is required",
		},
		{
			name:       "Missing mount point",
			systemID:   "abc123",
			deviceID:   "1",
			deviceType: "block-device",
			fsParams: models.FilesystemParams{
				FSType: "ext4",
			},
			mountParams: models.MountParams{},
			wantErr:     true,
			errMsg:      "failed to mount filesystem: invalid mount parameters: mount point is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fs, err := client.FormatAndMountFilesystem(tt.systemID, tt.deviceID, tt.deviceType, tt.fsParams, tt.mountParams)
			if tt.wantErr {
				assert.Error(t, err)
				if tt.errMsg != "" {
					assert.Contains(t, err.Error(), tt.errMsg)
				}
				assert.Nil(t, fs)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, fs)
				assert.Equal(t, tt.fsParams.FSType, fs.FSType)
				assert.Equal(t, tt.mountParams.MountPoint, fs.MountPoint)
				if tt.mountParams.MountOptions != "" {
					assert.Equal(t, tt.mountParams.MountOptions, fs.MountOptions)
				}
			}
		})
	}
}
