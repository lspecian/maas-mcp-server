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
		resp, respBody := ts.MakeRequest(t, http.MethodGet, "/api/v1/machines", nil) // Changed to GET

		// Verify response
		require.Equal(t, http.StatusOK, resp.StatusCode)

		var responseData struct {
			Machines []mcp.MachineSummary `json:"machines"`
		}
		ParseJSONResponse(t, respBody, &responseData)

		// Verify we got the expected machines
		require.Len(t, responseData.Machines, 2)
		foundAbc123 := false
		foundDef456 := false
		for _, m := range responseData.Machines {
			if m.SystemID == "abc123" {
				foundAbc123 = true
			}
			if m.SystemID == "def456" {
				foundDef456 = true
			}
		}
		assert.True(t, foundAbc123, "Machine abc123 not found")
		assert.True(t, foundDef456, "Machine def456 not found")
	})

	t.Run("ListMachinesWithFilters", func(t *testing.T) {
		// Make request with hostname filter
		// reqBody := map[string]string{ // Unused after changing to GET
		// 	"hostname": "test-machine-1",
		// }
		// For GET request with filters, filters should be query parameters
		// However, the handler ListMachines extracts filters from c.Request.URL.Query()
		// So, we need to construct the URL with query params for GET.
		// For simplicity in this step, assuming the test helper MakeRequest handles map for GET query params.
		// If not, this will need adjustment to build a URL string with query params.
		resp, respBody := ts.MakeRequest(t, http.MethodGet, "/api/v1/machines?hostname=test-machine-1", nil) // Changed to GET with query param

		// Verify response
		require.Equal(t, http.StatusOK, resp.StatusCode)

		var responseData struct {
			Machines []mcp.MachineSummary `json:"machines"`
		}
		ParseJSONResponse(t, respBody, &responseData)

		// Verify we got only the filtered machine
		require.Len(t, responseData.Machines, 1)
		assert.Equal(t, "abc123", responseData.Machines[0].SystemID)
		assert.Equal(t, "test-machine-1", responseData.Machines[0].Hostname)
	})

	t.Run("ListMachinesWithError", func(t *testing.T) {
		// Set mock to fail
		ts.MockClient.SetFailNextCall(true, "ListMachines")

		// Make request
		resp, _ := ts.MakeRequest(t, http.MethodGet, "/api/v1/machines", nil) // Changed to GET

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
		systemID := "abc123"
		url := "/api/v1/machines/" + systemID
		resp, respBody := ts.MakeRequest(t, http.MethodGet, url, nil) // Changed to GET, updated URL, nil body

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
		systemID := "nonexistent"
		url := "/api/v1/machines/" + systemID
		resp, _ := ts.MakeRequest(t, http.MethodGet, url, nil) // Changed to GET, updated URL, nil body

		// Verify response
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
	})

	t.Run("GetMachineWithError", func(t *testing.T) {
		// Set mock to fail
		ts.MockClient.SetFailNextCall(true, "GetMachine")

		// Make request
		systemID := "abc123"
		url := "/api/v1/machines/" + systemID
		resp, _ := ts.MakeRequest(t, http.MethodGet, url, nil) // Changed to GET, updated URL, nil body

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
		reqBody := map[string]string{ // Changed to map[string]string
			"min_cpu_count": "2",    // Value as string
			"min_memory":    "4096", // Value as string
			"tags":          "test", // Comma-separated if multiple, or single
			"architecture":  "amd64/generic",
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
		reqBody := map[string]string{ // Changed to map[string]string
			"min_cpu_count": "100", // Value as string
		}
		resp, _ := ts.MakeRequest(t, http.MethodPost, "/api/v1/machines/allocate", reqBody)

		// Verify response
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
	})

	t.Run("AllocateMachineWithError", func(t *testing.T) {
		// Set mock to fail
		ts.MockClient.SetFailNextCall(true, "AllocateMachine")

		// Make request
		reqBody := map[string]string{ // Changed to map[string]string
			"min_cpu_count": "2", // Value as string
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
			SystemID:     allocatedMachine.SystemID, // SystemID in body is okay, handler uses path param
			DistroSeries: "focal",
			UserData:     "#!/bin/bash\necho 'Hello, World!'",
		}
		url := "/api/v1/machines/" + allocatedMachine.SystemID + "/deploy"
		resp, respBody := ts.MakeRequest(t, http.MethodPost, url, deployReqBody)

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
		url := "/api/v1/machines/def456/deploy"
		resp, _ := ts.MakeRequest(t, http.MethodPost, url, deployReqBody)

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
		url := "/api/v1/machines/abc123/deploy"
		resp, _ := ts.MakeRequest(t, http.MethodPost, url, deployReqBody)

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
		url := "/api/v1/machines/def456/release"
		resp, respBody := ts.MakeRequest(t, http.MethodPost, url, reqBody)

		// Verify response
		require.Equal(t, http.StatusOK, resp.StatusCode)

		var result map[string]string
		err := json.Unmarshal(respBody, &result)
		require.NoError(t, err)
		assert.Contains(t, result["message"], "released successfully")

		// Verify the machine is now in "Ready" state
		detailUrl := "/api/v1/machines/def456"
		machineResp, machineRespBody := ts.MakeRequest(t, http.MethodGet, detailUrl, nil) // Changed to GET for details
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
		url := "/api/v1/machines/nonexistent/release"
		resp, _ := ts.MakeRequest(t, http.MethodPost, url, reqBody)

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
		url := "/api/v1/machines/abc123/release"
		resp, _ := ts.MakeRequest(t, http.MethodPost, url, reqBody)

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
		systemID := "abc123"
		url := "/api/v1/machines/" + systemID + "/power"
		resp, respBody := ts.MakeRequest(t, http.MethodGet, url, nil) // Changed to GET, updated URL, nil body

		// Verify response
		require.Equal(t, http.StatusOK, resp.StatusCode)

		var result map[string]string
		err := json.Unmarshal(respBody, &result)
		require.NoError(t, err)
		assert.Equal(t, "off", result["power_state"])
	})

	t.Run("GetPowerStateForNonExistentMachine", func(t *testing.T) {
		// Make request with non-existent system ID
		systemID := "nonexistent"
		url := "/api/v1/machines/" + systemID + "/power"
		resp, _ := ts.MakeRequest(t, http.MethodGet, url, nil) // Changed to GET, updated URL, nil body

		// Verify response
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
	})

	t.Run("GetPowerStateWithError", func(t *testing.T) {
		// Set mock to fail
		ts.MockClient.SetFailNextCall(true, "GetMachine")

		// Make request
		systemID := "abc123" // Define systemID for URL construction
		url := "/api/v1/machines/" + systemID + "/power"
		// reqBody is not needed for GET request if systemID is in path
		resp, _ := ts.MakeRequest(t, http.MethodGet, url, nil) // Changed to GET, updated URL, nil body

		// Verify response
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)

		// Reset mock
		ts.MockClient.SetFailNextCall(false, "")
	})
}
