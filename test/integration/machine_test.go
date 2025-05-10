package integration

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/lspecian/maas-mcp-server/pkg/mcp"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestListMachines(t *testing.T) {
	// Set up test server
	ts := NewTestServer(t)
	defer ts.Close()

	t.Run("ListAllMachines", func(t *testing.T) {
		// Make request
		resp, respBody := ts.MakeRequest(t, http.MethodPost, "/api/v1/machines", nil)

		// Verify response
		require.Equal(t, http.StatusOK, resp.StatusCode)

		var machines []mcp.MachineSummary
		ParseJSONResponse(t, respBody, &machines)

		// Verify we got the expected machines
		require.Len(t, machines, 2)
		assert.Equal(t, "abc123", machines[0].SystemID)
		assert.Equal(t, "def456", machines[1].SystemID)
	})

	t.Run("ListMachinesWithFilters", func(t *testing.T) {
		// Make request with hostname filter
		reqBody := map[string]string{
			"hostname": "test-machine-1",
		}
		resp, respBody := ts.MakeRequest(t, http.MethodPost, "/api/v1/machines", reqBody)

		// Verify response
		require.Equal(t, http.StatusOK, resp.StatusCode)

		var machines []mcp.MachineSummary
		ParseJSONResponse(t, respBody, &machines)

		// Verify we got only the filtered machine
		require.Len(t, machines, 1)
		assert.Equal(t, "abc123", machines[0].SystemID)
		assert.Equal(t, "test-machine-1", machines[0].Hostname)
	})

	t.Run("ListMachinesWithError", func(t *testing.T) {
		// Set mock to fail
		ts.MockClient.SetFailNextCall(true, "ListMachines")

		// Make request
		resp, _ := ts.MakeRequest(t, http.MethodPost, "/api/v1/machines", nil)

		// Verify response
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)

		// Reset mock
		ts.MockClient.SetFailNextCall(false, "")
	})
}

func TestGetMachineDetails(t *testing.T) {
	// Set up test server
	ts := NewTestServer(t)
	defer ts.Close()

	t.Run("GetExistingMachine", func(t *testing.T) {
		// Make request
		reqBody := map[string]string{
			"system_id": "abc123",
		}
		resp, respBody := ts.MakeRequest(t, http.MethodPost, "/api/v1/machines/details", reqBody)

		// Verify response
		require.Equal(t, http.StatusOK, resp.StatusCode)

		var machine mcp.MachineDetails
		ParseJSONResponse(t, respBody, &machine)

		// Verify machine details
		assert.Equal(t, "abc123", machine.SystemID)
		assert.Equal(t, "test-machine-1", machine.Hostname)
		assert.Equal(t, "test-machine-1.maas", machine.FQDN)
		assert.Equal(t, "Ready", machine.Status)
		assert.Equal(t, 4, machine.CPUCount)
		assert.Equal(t, int64(8192), machine.MemoryMB)
		assert.Equal(t, "off", machine.PowerState)

		// Verify interfaces
		require.Len(t, machine.NetworkInterfaces, 1)
		assert.Equal(t, "eth0", machine.NetworkInterfaces[0].Name)
		assert.Equal(t, "52:54:00:12:34:56", machine.NetworkInterfaces[0].MACAddress)

		// Verify block devices
		require.Len(t, machine.BlockDevices, 1)
		assert.Equal(t, "sda", machine.BlockDevices[0].Name)
		assert.Equal(t, int64(107374182400), machine.BlockDevices[0].Size) // 100 GB
	})

	t.Run("GetNonExistentMachine", func(t *testing.T) {
		// Make request with non-existent system ID
		reqBody := map[string]string{
			"system_id": "nonexistent",
		}
		resp, _ := ts.MakeRequest(t, http.MethodPost, "/api/v1/machines/details", reqBody)

		// Verify response
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
	})

	t.Run("GetMachineWithError", func(t *testing.T) {
		// Set mock to fail
		ts.MockClient.SetFailNextCall(true, "GetMachine")

		// Make request
		reqBody := map[string]string{
			"system_id": "abc123",
		}
		resp, _ := ts.MakeRequest(t, http.MethodPost, "/api/v1/machines/details", reqBody)

		// Verify response
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)

		// Reset mock
		ts.MockClient.SetFailNextCall(false, "")
	})
}

func TestAllocateMachine(t *testing.T) {
	// Set up test server
	ts := NewTestServer(t)
	defer ts.Close()

	t.Run("AllocateMachineWithConstraints", func(t *testing.T) {
		// Make request
		reqBody := mcp.AllocateMachineRequest{
			MinCPUCount:  2,
			MinMemory:    4096,
			Tags:         []string{"test"},
			Architecture: "amd64/generic",
		}
		resp, respBody := ts.MakeRequest(t, http.MethodPost, "/api/v1/machines/allocate", reqBody)

		// Verify response
		require.Equal(t, http.StatusOK, resp.StatusCode)

		var machine mcp.MachineSummary
		ParseJSONResponse(t, respBody, &machine)

		// Verify allocated machine
		assert.Equal(t, "abc123", machine.SystemID)
		assert.Equal(t, "Allocated", machine.Status)
	})

	t.Run("AllocateMachineWithNoMatch", func(t *testing.T) {
		// Make request with constraints that won't match any machine
		reqBody := mcp.AllocateMachineRequest{
			MinCPUCount: 100, // No machine has this many CPUs
		}
		resp, _ := ts.MakeRequest(t, http.MethodPost, "/api/v1/machines/allocate", reqBody)

		// Verify response
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
	})

	t.Run("AllocateMachineWithError", func(t *testing.T) {
		// Set mock to fail
		ts.MockClient.SetFailNextCall(true, "AllocateMachine")

		// Make request
		reqBody := mcp.AllocateMachineRequest{
			MinCPUCount: 2,
		}
		resp, _ := ts.MakeRequest(t, http.MethodPost, "/api/v1/machines/allocate", reqBody)

		// Verify response
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)

		// Reset mock
		ts.MockClient.SetFailNextCall(false, "")
	})
}

func TestDeployMachine(t *testing.T) {
	// Set up test server
	ts := NewTestServer(t)
	defer ts.Close()

	// First allocate a machine
	t.Run("DeployAllocatedMachine", func(t *testing.T) {
		// Allocate a machine first
		allocReqBody := mcp.AllocateMachineRequest{
			MinCPUCount: 2,
			Tags:        []string{"test"},
		}
		allocResp, allocRespBody := ts.MakeRequest(t, http.MethodPost, "/api/v1/machines/allocate", allocReqBody)
		require.Equal(t, http.StatusOK, allocResp.StatusCode)

		var allocatedMachine mcp.MachineSummary
		ParseJSONResponse(t, allocRespBody, &allocatedMachine)

		// Now deploy the allocated machine
		deployReqBody := mcp.DeployMachineRequest{
			SystemID:     allocatedMachine.SystemID,
			DistroSeries: "focal",
			UserData:     "#!/bin/bash\necho 'Hello, World!'",
		}
		resp, respBody := ts.MakeRequest(t, http.MethodPost, "/api/v1/machines/deploy", deployReqBody)

		// Verify response
		require.Equal(t, http.StatusOK, resp.StatusCode)

		var deployedMachine mcp.MachineSummary
		ParseJSONResponse(t, respBody, &deployedMachine)

		// Verify deployed machine
		assert.Equal(t, allocatedMachine.SystemID, deployedMachine.SystemID)
		assert.Equal(t, "Deploying", deployedMachine.Status)
		// We can't check distro series here as it's not in the MachineSummary
	})

	t.Run("DeployNonAllocatedMachine", func(t *testing.T) {
		// Try to deploy a machine that's not allocated
		deployReqBody := mcp.DeployMachineRequest{
			SystemID:     "def456", // This machine is in "Deployed" state
			DistroSeries: "focal",
		}
		resp, _ := ts.MakeRequest(t, http.MethodPost, "/api/v1/machines/deploy", deployReqBody)

		// Verify response
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
	})

	t.Run("DeployMachineWithError", func(t *testing.T) {
		// Set mock to fail
		ts.MockClient.SetFailNextCall(true, "DeployMachine")

		// Make request
		deployReqBody := mcp.DeployMachineRequest{
			SystemID:     "abc123",
			DistroSeries: "focal",
		}
		resp, _ := ts.MakeRequest(t, http.MethodPost, "/api/v1/machines/deploy", deployReqBody)

		// Verify response
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)

		// Reset mock
		ts.MockClient.SetFailNextCall(false, "")
	})
}

func TestReleaseMachine(t *testing.T) {
	// Set up test server
	ts := NewTestServer(t)
	defer ts.Close()

	t.Run("ReleaseDeployedMachine", func(t *testing.T) {
		// Make request to release a deployed machine
		reqBody := mcp.ReleaseMachineRequest{
			SystemID: "def456", // This machine is in "Deployed" state
			Comment:  "Testing release",
		}
		resp, respBody := ts.MakeRequest(t, http.MethodPost, "/api/v1/machines/release", reqBody)

		// Verify response
		require.Equal(t, http.StatusOK, resp.StatusCode)

		var result map[string]string
		err := json.Unmarshal(respBody, &result)
		require.NoError(t, err)
		assert.Contains(t, result["message"], "released successfully")

		// Verify the machine is now in "Ready" state
		machineResp, machineRespBody := ts.MakeRequest(t, http.MethodPost, "/api/v1/machines/details", map[string]string{"system_id": "def456"})
		require.Equal(t, http.StatusOK, machineResp.StatusCode)

		var machine mcp.MachineDetails
		ParseJSONResponse(t, machineRespBody, &machine)
		assert.Equal(t, "Ready", machine.Status)
	})

	t.Run("ReleaseNonExistentMachine", func(t *testing.T) {
		// Make request with non-existent system ID
		reqBody := mcp.ReleaseMachineRequest{
			SystemID: "nonexistent",
		}
		resp, _ := ts.MakeRequest(t, http.MethodPost, "/api/v1/machines/release", reqBody)

		// Verify response
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
	})

	t.Run("ReleaseMachineWithError", func(t *testing.T) {
		// Set mock to fail
		ts.MockClient.SetFailNextCall(true, "ReleaseMachine")

		// Make request
		reqBody := mcp.ReleaseMachineRequest{
			SystemID: "abc123",
		}
		resp, _ := ts.MakeRequest(t, http.MethodPost, "/api/v1/machines/release", reqBody)

		// Verify response
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)

		// Reset mock
		ts.MockClient.SetFailNextCall(false, "")
	})
}

func TestGetMachinePowerState(t *testing.T) {
	// Set up test server
	ts := NewTestServer(t)
	defer ts.Close()

	t.Run("GetPowerStateForExistingMachine", func(t *testing.T) {
		// Make request
		reqBody := mcp.GetMachinePowerStateRequest{
			SystemID: "abc123",
		}
		resp, respBody := ts.MakeRequest(t, http.MethodPost, "/api/v1/machines/power-state", reqBody)

		// Verify response
		require.Equal(t, http.StatusOK, resp.StatusCode)

		var result map[string]string
		err := json.Unmarshal(respBody, &result)
		require.NoError(t, err)
		assert.Equal(t, "off", result["power_state"])
	})

	t.Run("GetPowerStateForNonExistentMachine", func(t *testing.T) {
		// Make request with non-existent system ID
		reqBody := mcp.GetMachinePowerStateRequest{
			SystemID: "nonexistent",
		}
		resp, _ := ts.MakeRequest(t, http.MethodPost, "/api/v1/machines/power-state", reqBody)

		// Verify response
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
	})

	t.Run("GetPowerStateWithError", func(t *testing.T) {
		// Set mock to fail
		ts.MockClient.SetFailNextCall(true, "GetMachine")

		// Make request
		reqBody := mcp.GetMachinePowerStateRequest{
			SystemID: "abc123",
		}
		resp, _ := ts.MakeRequest(t, http.MethodPost, "/api/v1/machines/power-state", reqBody)

		// Verify response
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)

		// Reset mock
		ts.MockClient.SetFailNextCall(false, "")
	})
}
