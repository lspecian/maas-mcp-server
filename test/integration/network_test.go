package integration

import (
	"net/http"
	"testing"

	"github.com/lspecian/maas-mcp-server/pkg/mcp"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestListSubnets(t *testing.T) {
	// Set up test server
	ts := NewTestServer(t)
	defer ts.Close()

	t.Run("ListAllSubnets", func(t *testing.T) {
		// Make request
		resp, respBody := ts.MakeRequest(t, http.MethodPost, "/api/v1/subnets", nil)

		// Verify response
		require.Equal(t, http.StatusOK, resp.StatusCode)

		var subnets []mcp.SubnetDetails
		ParseJSONResponse(t, respBody, &subnets)

		// Verify we got the expected subnets
		require.Len(t, subnets, 2)
		assert.Equal(t, 1, subnets[0].ID)
		assert.Equal(t, "192.168.1.0/24", subnets[0].CIDR)
		assert.Equal(t, 2, subnets[1].ID)
		assert.Equal(t, "10.0.0.0/24", subnets[1].CIDR)
	})

	t.Run("ListSubnetsWithFabricFilter", func(t *testing.T) {
		// Make request with fabric filter
		reqBody := mcp.ListSubnetsRequest{
			FabricID: 1,
		}
		resp, respBody := ts.MakeRequest(t, http.MethodPost, "/api/v1/subnets", reqBody)

		// Verify response
		require.Equal(t, http.StatusOK, resp.StatusCode)

		var subnets []mcp.SubnetDetails
		ParseJSONResponse(t, respBody, &subnets)

		// Verify we got the expected subnets (both are in fabric 1)
		require.Len(t, subnets, 2)
		for _, subnet := range subnets {
			assert.Equal(t, "fabric-1", subnet.Fabric)
		}
	})

	t.Run("ListSubnetsWithNonExistentFabric", func(t *testing.T) {
		// Make request with non-existent fabric
		reqBody := mcp.ListSubnetsRequest{
			FabricID: 999,
		}
		resp, respBody := ts.MakeRequest(t, http.MethodPost, "/api/v1/subnets", reqBody)

		// Verify response
		require.Equal(t, http.StatusOK, resp.StatusCode)

		var subnets []mcp.SubnetDetails
		ParseJSONResponse(t, respBody, &subnets)

		// Verify we got no subnets
		assert.Len(t, subnets, 0)
	})

	t.Run("ListSubnetsWithError", func(t *testing.T) {
		// Set mock to fail
		ts.MockClient.SetFailNextCall(true, "ListSubnets")

		// Make request
		resp, _ := ts.MakeRequest(t, http.MethodPost, "/api/v1/subnets", nil)

		// Verify response
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)

		// Reset mock
		ts.MockClient.SetFailNextCall(false, "")
	})
}

func TestGetSubnetDetails(t *testing.T) {
	// Set up test server
	ts := NewTestServer(t)
	defer ts.Close()

	t.Run("GetExistingSubnet", func(t *testing.T) {
		// Make request
		reqBody := mcp.GetSubnetDetailsRequest{
			SubnetID: 1,
		}
		resp, respBody := ts.MakeRequest(t, http.MethodPost, "/api/v1/subnets/details", reqBody)

		// Verify response
		require.Equal(t, http.StatusOK, resp.StatusCode)

		var subnet mcp.SubnetDetails
		ParseJSONResponse(t, respBody, &subnet)

		// Verify subnet details
		assert.Equal(t, 1, subnet.ID)
		assert.Equal(t, "192.168.1.0/24", subnet.CIDR)
		assert.Equal(t, "test-subnet-1", subnet.Name)
		assert.Equal(t, "default", subnet.Space)
		assert.Equal(t, "fabric-1", subnet.Fabric)
		assert.True(t, subnet.Managed)
	})

	t.Run("GetNonExistentSubnet", func(t *testing.T) {
		// Make request with non-existent subnet ID
		reqBody := mcp.GetSubnetDetailsRequest{
			SubnetID: 999,
		}
		resp, _ := ts.MakeRequest(t, http.MethodPost, "/api/v1/subnets/details", reqBody)

		// Verify response
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
	})

	t.Run("GetSubnetWithError", func(t *testing.T) {
		// Set mock to fail
		ts.MockClient.SetFailNextCall(true, "GetSubnet")

		// Make request
		reqBody := mcp.GetSubnetDetailsRequest{
			SubnetID: 1,
		}
		resp, _ := ts.MakeRequest(t, http.MethodPost, "/api/v1/subnets/details", reqBody)

		// Verify response
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)

		// Reset mock
		ts.MockClient.SetFailNextCall(false, "")
	})
}

func TestListVLANs(t *testing.T) {
	// Set up test server
	ts := NewTestServer(t)
	defer ts.Close()

	t.Run("ListVLANsForFabric", func(t *testing.T) {
		// Make request
		resp, respBody := ts.MakeRequest(t, http.MethodGet, "/api/v1/vlans/1", nil)

		// Verify response
		require.Equal(t, http.StatusOK, resp.StatusCode)

		var vlans []struct {
			ID         int    `json:"id"`
			Name       string `json:"name"`
			VID        int    `json:"vid"`
			FabricID   int    `json:"fabric_id"`
			FabricName string `json:"fabric_name,omitempty"`
		}
		ParseJSONResponse(t, respBody, &vlans)

		// Verify we got the expected VLANs
		require.Len(t, vlans, 2)
		assert.Equal(t, 1, vlans[0].ID)
		assert.Equal(t, "default", vlans[0].Name)
		assert.Equal(t, 1, vlans[0].VID)
		assert.Equal(t, 2, vlans[1].ID)
		assert.Equal(t, "vlan-10", vlans[1].Name)
		assert.Equal(t, 10, vlans[1].VID)
	})

	t.Run("ListVLANsForNonExistentFabric", func(t *testing.T) {
		// Make request with non-existent fabric ID
		resp, respBody := ts.MakeRequest(t, http.MethodGet, "/api/v1/vlans/999", nil)

		// Verify response
		require.Equal(t, http.StatusOK, resp.StatusCode)

		var vlans []struct {
			ID         int    `json:"id"`
			Name       string `json:"name"`
			VID        int    `json:"vid"`
			FabricID   int    `json:"fabric_id"`
			FabricName string `json:"fabric_name,omitempty"`
		}
		ParseJSONResponse(t, respBody, &vlans)

		// Verify we got no VLANs
		assert.Len(t, vlans, 0)
	})

	t.Run("ListVLANsWithError", func(t *testing.T) {
		// Set mock to fail
		ts.MockClient.SetFailNextCall(true, "ListVLANs")

		// Make request
		resp, _ := ts.MakeRequest(t, http.MethodGet, "/api/v1/vlans/1", nil)

		// Verify response
		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)

		// Reset mock
		ts.MockClient.SetFailNextCall(false, "")
	})
}
