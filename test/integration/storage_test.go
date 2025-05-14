package integration

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestListBlockDevices(t *testing.T) {
	// Create a test server
	ts := NewTestServer(t)
	defer ts.Close()

	// Test cases
	tests := []struct {
		name           string
		machineID      string
		failOperation  bool
		expectedStatus int
	}{
		{
			name:           "Success",
			machineID:      "abc123",
			failOperation:  false,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Machine not found",
			machineID:      "nonexistent",
			failOperation:  true,
			expectedStatus: http.StatusInternalServerError, // This might need to be StatusNotFound depending on error handling
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Set up mock behavior
			if tc.failOperation {
				ts.MockClient.SetFailNextCall(true, "GetMachineBlockDevices")
			}

			// Make the request
			path := fmt.Sprintf("/api/v1/machines/%s/storage", tc.machineID)
			resp, body := ts.MakeRequest(t, http.MethodGet, path, nil)

			// Check the response
			assert.Equal(t, tc.expectedStatus, resp.StatusCode)

			if tc.expectedStatus == http.StatusOK {
				// Parse the response
				var response struct {
					BlockDevices []struct { // Changed from Devices to BlockDevices
						ID   string `json:"id"`
						Name string `json:"name"`
						Path string `json:"path"`
						// Add other fields from models.StorageContext if needed for assertions
						Size int64  `json:"size_bytes"`
						Type string `json:"type"`
					} `json:"block_devices"` // Changed JSON tag to block_devices
				}
				ParseJSONResponse(t, body, &response)

				// Verify the response contains the expected devices
				if tc.machineID == "abc123" {
					assert.Len(t, response.BlockDevices, 1)
					assert.Equal(t, "1", response.BlockDevices[0].ID)
					assert.Equal(t, "sda", response.BlockDevices[0].Name)
				} else if tc.machineID == "def456" { // This case is not in the provided test data for TestListBlockDevices
					assert.Len(t, response.BlockDevices, 2) // Mock data for def456 has 2 devices
				}
			}
		})
	}
}

func TestGetBlockDevice(t *testing.T) {
	// Create a test server
	ts := NewTestServer(t)
	defer ts.Close()

	// Test cases
	tests := []struct {
		name           string
		machineID      string
		deviceID       string
		failOperation  bool
		expectedStatus int
	}{
		{
			name:           "Success",
			machineID:      "abc123",
			deviceID:       "1",
			failOperation:  false,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Device not found",
			machineID:      "abc123",
			deviceID:       "999",
			failOperation:  true,                // This will make MockMaasClient.GetMachineBlockDevice return an error
			expectedStatus: http.StatusNotFound, // Service should map ErrNotFound to 404
		},
		{
			name:           "Invalid device ID",
			machineID:      "abc123",
			deviceID:       "invalid",
			failOperation:  false,
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Set up mock behavior
			if tc.failOperation {
				ts.MockClient.SetFailNextCall(true, "GetMachineBlockDevice")
			}

			// Make the request
			path := fmt.Sprintf("/api/v1/machines/%s/storage/%s", tc.machineID, tc.deviceID)
			resp, body := ts.MakeRequest(t, http.MethodGet, path, nil)

			// Check the response
			assert.Equal(t, tc.expectedStatus, resp.StatusCode)

			if tc.expectedStatus == http.StatusOK {
				// Parse the response
				var response struct {
					Device struct {
						ID   string `json:"id"`
						Name string `json:"name"`
						Path string `json:"path"`
					} `json:"device"`
				}
				ParseJSONResponse(t, body, &response)

				// Verify the response contains the expected device
				assert.Equal(t, tc.deviceID, response.Device.ID)
				assert.Equal(t, "sda", response.Device.Name)
				assert.Equal(t, "/dev/sda", response.Device.Path)
			}
		})
	}
}

func TestCreatePartition(t *testing.T) {
	// Create a test server
	ts := NewTestServer(t)
	defer ts.Close()

	// Test cases
	tests := []struct {
		name           string
		machineID      string
		deviceID       string
		params         map[string]interface{}
		failOperation  bool
		expectedStatus int
	}{
		{
			name:      "Success",
			machineID: "abc123",
			deviceID:  "1",
			params: map[string]interface{}{
				"size": 1024 * 1024 * 1024, // 1GB
			},
			failOperation:  false,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Missing size parameter",
			machineID:      "abc123",
			deviceID:       "1",
			params:         map[string]interface{}{},
			failOperation:  false,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:      "Invalid device ID",
			machineID: "abc123",
			deviceID:  "invalid",
			params: map[string]interface{}{
				"size": 1024 * 1024 * 1024,
			},
			failOperation:  false,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:      "Device not found",
			machineID: "abc123",
			deviceID:  "999",
			params: map[string]interface{}{
				"size": 1024 * 1024 * 1024,
			},
			failOperation:  true,
			expectedStatus: http.StatusNotFound, // Corrected from InternalServerError
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Set up mock behavior
			if tc.failOperation {
				ts.MockClient.SetFailNextCall(true, "CreateMachinePartition")
			}

			// Make the request
			path := fmt.Sprintf("/api/v1/machines/%s/storage/%s/partitions", tc.machineID, tc.deviceID)
			resp, body := ts.MakeRequest(t, http.MethodPost, path, tc.params)

			// Check the response
			assert.Equal(t, tc.expectedStatus, resp.StatusCode)

			if tc.expectedStatus == http.StatusOK {
				// Parse the response
				var response struct {
					Partition struct {
						ID   string `json:"id"`
						Size int64  `json:"size_bytes"`
						Path string `json:"path"`
					} `json:"partition"`
				}
				ParseJSONResponse(t, body, &response)

				// Verify the response contains the expected partition
				assert.NotEmpty(t, response.Partition.ID)
				assert.Equal(t, tc.params["size"], response.Partition.Size)
				assert.NotEmpty(t, response.Partition.Path)
			}
		})
	}
}

func TestUpdatePartition(t *testing.T) {
	// Create a test server
	ts := NewTestServer(t)
	defer ts.Close()

	// Test cases
	tests := []struct {
		name           string
		machineID      string
		deviceID       string
		partitionID    string
		params         map[string]interface{}
		failOperation  bool
		expectedStatus int
	}{
		{
			name:        "Success",
			machineID:   "abc123",
			deviceID:    "1",
			partitionID: "1",
			params: map[string]interface{}{
				"size": 2 * 1024 * 1024 * 1024, // 2GB
			},
			failOperation:  false,
			expectedStatus: http.StatusOK,
		},
		{
			name:        "Invalid partition ID",
			machineID:   "abc123",
			deviceID:    "1",
			partitionID: "invalid",
			params: map[string]interface{}{
				"size": 2 * 1024 * 1024 * 1024,
			},
			failOperation:  false,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:        "Partition not found",
			machineID:   "abc123",
			deviceID:    "1",
			partitionID: "999",
			params: map[string]interface{}{
				"size": 2 * 1024 * 1024 * 1024,
			},
			failOperation:  true,
			expectedStatus: http.StatusNotFound, // Corrected from InternalServerError
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Set up mock behavior
			if tc.failOperation {
				ts.MockClient.SetFailNextCall(true, "UpdateMachinePartition")
			}

			// Make the request
			path := fmt.Sprintf("/api/v1/machines/%s/storage/%s/partitions/%s", tc.machineID, tc.deviceID, tc.partitionID)
			resp, body := ts.MakeRequest(t, http.MethodPut, path, tc.params)

			// Check the response
			assert.Equal(t, tc.expectedStatus, resp.StatusCode)

			if tc.expectedStatus == http.StatusOK {
				// Parse the response
				var response struct {
					Partition struct {
						ID   string `json:"id"`
						Size int64  `json:"size_bytes"`
						Path string `json:"path"`
					} `json:"partition"`
				}
				ParseJSONResponse(t, body, &response)

				// Verify the response contains the expected partition
				assert.Equal(t, tc.partitionID, response.Partition.ID)
				assert.Equal(t, tc.params["size"], response.Partition.Size)
			}
		})
	}
}

func TestDeletePartition(t *testing.T) {
	// Create a test server
	ts := NewTestServer(t)
	defer ts.Close()

	// Test cases
	tests := []struct {
		name           string
		machineID      string
		deviceID       string
		partitionID    string
		failOperation  bool
		expectedStatus int
	}{
		{
			name:           "Success",
			machineID:      "abc123",
			deviceID:       "1",
			partitionID:    "1",
			failOperation:  false,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Invalid partition ID",
			machineID:      "abc123",
			deviceID:       "1",
			partitionID:    "invalid",
			failOperation:  false,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Partition not found",
			machineID:      "abc123",
			deviceID:       "1",
			partitionID:    "999",
			failOperation:  true,
			expectedStatus: http.StatusNotFound, // Corrected from InternalServerError
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Set up mock behavior
			if tc.failOperation {
				ts.MockClient.SetFailNextCall(true, "DeleteMachinePartition")
			}

			// Make the request
			path := fmt.Sprintf("/api/v1/machines/%s/storage/%s/partitions/%s", tc.machineID, tc.deviceID, tc.partitionID)
			resp, _ := ts.MakeRequest(t, http.MethodDelete, path, nil)

			// Check the response
			assert.Equal(t, tc.expectedStatus, resp.StatusCode)
		})
	}
}

func TestFormatPartition(t *testing.T) {
	// Create a test server
	ts := NewTestServer(t)
	defer ts.Close()

	// Test cases
	tests := []struct {
		name           string
		machineID      string
		deviceID       string
		partitionID    string
		params         map[string]interface{}
		failOperation  bool
		expectedStatus int
	}{
		{
			name:        "Success",
			machineID:   "abc123",
			deviceID:    "1",
			partitionID: "1",
			params: map[string]interface{}{
				"fstype": "ext4",
			},
			failOperation:  false,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Missing fstype parameter",
			machineID:      "abc123",
			deviceID:       "1",
			partitionID:    "1",
			params:         map[string]interface{}{},
			failOperation:  false,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:        "Invalid partition ID",
			machineID:   "abc123",
			deviceID:    "1",
			partitionID: "invalid",
			params: map[string]interface{}{
				"fstype": "ext4",
			},
			failOperation:  false,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:        "Partition not found",
			machineID:   "abc123",
			deviceID:    "1",
			partitionID: "999",
			params: map[string]interface{}{
				"fstype": "ext4",
			},
			failOperation:  true,
			expectedStatus: http.StatusNotFound, // Corrected from InternalServerError
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Set up mock behavior
			if tc.failOperation {
				ts.MockClient.SetFailNextCall(true, "FormatMachinePartition")
			}

			// Make the request
			path := fmt.Sprintf("/api/v1/machines/%s/storage/%s/partitions/%s/format", tc.machineID, tc.deviceID, tc.partitionID)
			resp, body := ts.MakeRequest(t, http.MethodPost, path, tc.params)

			// Check the response
			assert.Equal(t, tc.expectedStatus, resp.StatusCode)

			if tc.expectedStatus == http.StatusOK {
				// Parse the response
				var response struct {
					Filesystem struct {
						Type       string `json:"type"`
						MountPoint string `json:"mount_point,omitempty"`
					} `json:"filesystem"`
				}
				ParseJSONResponse(t, body, &response)

				// Verify the response contains the expected filesystem
				assert.Equal(t, tc.params["fstype"], response.Filesystem.Type)
			}
		})
	}
}
