package maasclient_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/lspecian/maas-mcp-server/internal/maasclient"
	"github.com/lspecian/maas-mcp-server/internal/models"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
)

// TestMaasClientWithMockServer tests the MAAS client with a mock HTTP server
func TestMaasClientWithMockServer(t *testing.T) {
	// Create a mock HTTP server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Check the request path and respond accordingly
		if r.URL.Path == "/MAAS/api/2.0/machines/" {
			// Return a sample machine list
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`[
				{
					"system_id": "abc123",
					"hostname": "test-machine-1",
					"fqdn": "test-machine-1.maas",
					"status_name": "Ready",
					"architecture": "amd64/generic",
					"power_state": "off",
					"power_type": "ipmi",
					"zone": {"name": "default"},
					"pool": {"name": "default"},
					"tag_names": ["test", "virtual"]
				},
				{
					"system_id": "def456",
					"hostname": "test-machine-2",
					"fqdn": "test-machine-2.maas",
					"status_name": "Deployed",
					"architecture": "amd64/generic",
					"power_state": "on",
					"power_type": "ipmi",
					"zone": {"name": "default"},
					"pool": {"name": "default"},
					"tag_names": ["test", "physical"]
				}
			]`))
			return
		} else if r.URL.Path == "/MAAS/api/2.0/machines/abc123/" {
			// Return a specific machine
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{
				"system_id": "abc123",
				"hostname": "test-machine-1",
				"fqdn": "test-machine-1.maas",
				"status_name": "Ready",
				"architecture": "amd64/generic",
				"power_state": "off",
				"power_type": "ipmi",
				"zone": {"name": "default"},
				"pool": {"name": "default"},
				"tag_names": ["test", "virtual"]
			}`))
			return
		} else if r.URL.Path == "/MAAS/api/2.0/machines/nonexistent/" {
			// Return a 404 for non-existent machine
			w.WriteHeader(http.StatusNotFound)
			w.Write([]byte(`{"error": "Machine not found"}`))
			return
		}

		// Default response for unhandled paths
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	// Create a test configuration with the mock server URL
	cfg := &models.AppConfig{
		MAASInstances: make(map[string]models.MAASInstanceConfig),
	}
	cfg.MAASInstances["default"] = models.MAASInstanceConfig{
		APIURL: server.URL + "/MAAS",
		APIKey: "consumer:token:secret",
	}

	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)

	// Create a new client
	client, err := maasclient.NewMaasClient(cfg, logger)
	assert.NoError(t, err)
	assert.NotNil(t, client)

	// Test ListMachines
	t.Run("ListMachines", func(t *testing.T) {
		machines, err := client.ListMachines(nil)
		assert.NoError(t, err)
		assert.Len(t, machines, 2)
		assert.Equal(t, "abc123", machines[0].SystemID)
		assert.Equal(t, "test-machine-1", machines[0].Hostname)
		assert.Equal(t, "def456", machines[1].SystemID)
		assert.Equal(t, "test-machine-2", machines[1].Hostname)
	})

	// Test GetMachine
	t.Run("GetMachine", func(t *testing.T) {
		machine, err := client.GetMachine("abc123")
		assert.NoError(t, err)
		assert.NotNil(t, machine)
		assert.Equal(t, "abc123", machine.SystemID)
		assert.Equal(t, "test-machine-1", machine.Hostname)
	})

	// Test GetMachine with non-existent ID
	t.Run("GetMachineNonExistent", func(t *testing.T) {
		machine, err := client.GetMachine("nonexistent")
		assert.Error(t, err)
		assert.Nil(t, machine)
	})

	// Test GetMachine with empty ID
	t.Run("GetMachineEmptyID", func(t *testing.T) {
		machine, err := client.GetMachine("")
		assert.Error(t, err)
		assert.Nil(t, machine)
		assert.Contains(t, err.Error(), "system ID is required")
	})

	// Test GetMachineWithDetails
	t.Run("GetMachineWithDetails", func(t *testing.T) {
		ctx := context.Background()
		machine, err := client.GetMachineWithDetails(ctx, "abc123", true)
		assert.NoError(t, err)
		assert.NotNil(t, machine)
		assert.Equal(t, "abc123", machine.SystemID)
	})
}

// TestEnvironmentVariableHandling tests the handling of environment variables
func TestEnvironmentVariableHandling(t *testing.T) {
	// Skip this test in CI environments where we can't modify environment variables
	if os.Getenv("CI") != "" {
		t.Skip("Skipping test in CI environment")
	}

	// Save original environment variables
	originalAPIURL := os.Getenv("MAAS_API_URL")
	originalAPIKey := os.Getenv("MAAS_API_KEY")
	defer func() {
		// Restore original environment variables
		os.Setenv("MAAS_API_URL", originalAPIURL)
		os.Setenv("MAAS_API_KEY", originalAPIKey)
	}()

	// Set test environment variables
	os.Setenv("MAAS_API_URL", "http://env-test-maas:5240/MAAS")
	os.Setenv("MAAS_API_KEY", "consumer:token:secret") // Must be in correct format

	// Create a test configuration with the environment variables
	cfg := &models.AppConfig{
		MAASInstances: make(map[string]models.MAASInstanceConfig),
	}
	// Add a default instance with the environment variables
	cfg.MAASInstances["default"] = models.MAASInstanceConfig{
		APIURL: os.Getenv("MAAS_API_URL"),
		APIKey: os.Getenv("MAAS_API_KEY"),
	}

	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)

	// Create a new client
	client, err := maasclient.NewMaasClient(cfg, logger)
	assert.NoError(t, err)
	assert.NotNil(t, client)

	// We can't directly access the config field as it's unexported
	// But we can verify the client was created successfully
}

// TestMissingEnvironmentVariables tests the behavior when environment variables are missing
func TestMissingEnvironmentVariables(t *testing.T) {
	// Skip this test in CI environments where we can't modify environment variables
	if os.Getenv("CI") != "" {
		t.Skip("Skipping test in CI environment")
	}

	// Save original environment variables
	originalAPIURL := os.Getenv("MAAS_API_URL")
	originalAPIKey := os.Getenv("MAAS_API_KEY")
	defer func() {
		// Restore original environment variables
		os.Setenv("MAAS_API_URL", originalAPIURL)
		os.Setenv("MAAS_API_KEY", originalAPIKey)
	}()

	// Clear environment variables
	os.Unsetenv("MAAS_API_URL")
	os.Unsetenv("MAAS_API_KEY")

	// Create a test configuration without MAAS instances
	cfg := &models.AppConfig{
		MAASInstances: make(map[string]models.MAASInstanceConfig),
	}

	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)

	// Create a new client - it should fail due to missing configuration
	client, err := maasclient.NewMaasClient(cfg, logger)
	assert.Error(t, err)
	assert.Nil(t, client)
	assert.Contains(t, err.Error(), "no valid MAAS instance configuration found")
}
