package service_test

import (
	"os"
	"testing"

	"github.com/lspecian/maas-mcp-server/internal/service"
	"github.com/lspecian/maas-mcp-server/test/unit"
	"github.com/lspecian/maas-mcp-server/test/utils"

	"github.com/stretchr/testify/assert"
)

func TestExampleService(t *testing.T) {
	// Create a mock client using our test utilities
	mockClient := &utils.MockMachineClient{}

	// Set up the mock to return test data
	testMachine := utils.CreateTestMachine("abc123", "test-machine", "Ready")
	mockClient.On("GetMachine", "abc123").Return(&testMachine, nil)

	// Create the service with the mock client
	logger := unit.TestLogger()
	service := service.NewMachineService(mockClient, logger)

	// Create a test context
	ctx, cancel := utils.WithTestContext(t)
	defer cancel()

	// Call the service
	result, err := service.GetMachine(ctx, "abc123")

	// Assert the results
	assert.NoError(t, err)
	assert.NotNil(t, result)

	// Convert MachineContext to Machine for comparison
	assert.Equal(t, testMachine.SystemID, result.ID)
	assert.Equal(t, testMachine.Hostname, result.Name)
	assert.Equal(t, testMachine.Status, result.Status)

	// Verify that the mock was called as expected
	mockClient.AssertExpectations(t)
}

func TestExampleWithTempDir(t *testing.T) {
	// Use the WithTempDir helper to create a temporary directory
	utils.WithTempDir(t, func(dir string) {
		// Create a test file in the temporary directory
		filePath := utils.CreateTestFile(t, dir, "test.txt", "Hello, World!")

		// Read the file content
		content := utils.ReadTestFile(t, filePath)

		// Assert the content
		assert.Equal(t, "Hello, World!", content)

		// Assert that the file exists
		utils.AssertFileExists(t, filePath)
	})
}

func TestExampleWithTempFile(t *testing.T) {
	// Use the WithTempFile helper to create a temporary file
	filePath, cleanup := utils.WithTempFile(t, "Hello, World!")
	defer cleanup()

	// Read the file content
	content := utils.ReadTestFile(t, filePath)

	// Assert the content
	assert.Equal(t, "Hello, World!", content)

	// Assert that the file exists
	utils.AssertFileExists(t, filePath)
}

func TestExampleWithEnvVar(t *testing.T) {
	// Use the WithEnvVar helper to set an environment variable
	utils.WithEnvVar(t, "TEST_VAR", "test_value", func() {
		// Get the environment variable using os.Getenv
		value := os.Getenv("TEST_VAR")

		// Assert the value
		assert.Equal(t, "test_value", value)
	})
}

func TestExampleWithRetry(t *testing.T) {
	// Use the RetryUntil helper to retry a function until it succeeds
	success := utils.RetryUntil(t, func() bool {
		// This function will always return true
		return true
	}, 1000, 100)

	// Assert that the function succeeded
	assert.True(t, success)
}

func TestExampleWithFixtures(t *testing.T) {
	// Create test fixtures
	machine := utils.CreateTestMachine("abc123", "test-machine", "Ready")
	machineWithDetails := utils.CreateTestMachineWithDetails("def456", "test-machine-2", "Deployed")
	subnet := utils.CreateTestSubnet(1, "test-subnet", "192.168.1.0/24")
	vlan := utils.CreateTestVLAN(1, 1, "test-vlan")
	tag := utils.CreateTestTag("test-tag", "Test tag")
	blockDevice := utils.CreateTestBlockDevice(1, "sda", "/dev/sda", 1000000000)
	networkInterface := utils.CreateTestNetworkInterface(1, "eth0", "00:11:22:33:44:55")

	// Assert that the fixtures have the expected values
	assert.Equal(t, "abc123", machine.SystemID)
	assert.Equal(t, "test-machine", machine.Hostname)
	assert.Equal(t, "Ready", machine.Status)

	assert.Equal(t, "def456", machineWithDetails.SystemID)
	assert.Equal(t, "test-machine-2", machineWithDetails.Hostname)
	assert.Equal(t, "Deployed", machineWithDetails.Status)
	assert.NotEmpty(t, machineWithDetails.Interfaces)
	assert.NotEmpty(t, machineWithDetails.BlockDevices)

	assert.Equal(t, 1, subnet.ID)
	assert.Equal(t, "test-subnet", subnet.Name)
	assert.Equal(t, "192.168.1.0/24", subnet.CIDR)

	assert.Equal(t, 1, vlan.ID)
	assert.Equal(t, "test-vlan", vlan.Name)
	assert.Equal(t, 1, vlan.VID)

	assert.Equal(t, "test-tag", tag.Name)
	assert.Equal(t, "Test tag", tag.Description)

	assert.Equal(t, 1, blockDevice.ID)
	assert.Equal(t, "sda", blockDevice.Name)
	assert.Equal(t, "/dev/sda", blockDevice.Path)
	assert.Equal(t, int64(1000000000), blockDevice.Size)

	assert.Equal(t, 1, networkInterface.ID)
	assert.Equal(t, "eth0", networkInterface.Name)
	assert.Equal(t, "00:11:22:33:44:55", networkInterface.MACAddress)
}
