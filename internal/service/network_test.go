package service

import (
	"context"
	"errors"
	"testing"

	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/lspecian/maas-mcp-server/internal/models"
)

// MockNetworkClient is a mock implementation of the NetworkClient interface
type MockNetworkClient struct {
	mock.Mock
}

func (m *MockNetworkClient) ListSubnets() ([]models.Subnet, error) {
	args := m.Called()
	return args.Get(0).([]models.Subnet), args.Error(1)
}

func (m *MockNetworkClient) GetSubnet(id int) (*models.Subnet, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Subnet), args.Error(1)
}

func (m *MockNetworkClient) ListVLANs(fabricID int) ([]models.VLAN, error) {
	args := m.Called(fabricID)
	return args.Get(0).([]models.VLAN), args.Error(1)
}

func setupNetworkService() (*NetworkService, *MockNetworkClient) {
	mockClient := new(MockNetworkClient)
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)
	service := NewNetworkService(mockClient, logger)
	return service, mockClient
}

func TestListSubnets(t *testing.T) {
	// Setup
	service, mockClient := setupNetworkService()
	ctx := context.Background()

	// Test case 1: Successful retrieval
	mockSubnets := []models.Subnet{
		{
			ID:   1,
			Name: "subnet1",
			CIDR: "192.168.1.0/24",
			VLAN: &models.VLAN{
				ID:   1,
				Name: "vlan1",
				VID:  100,
			},
			Space:      "default",
			GatewayIP:  "192.168.1.1",
			DNSServers: []string{"8.8.8.8"},
			Managed:    true,
		},
		{
			ID:   2,
			Name: "subnet2",
			CIDR: "10.0.0.0/24",
			VLAN: &models.VLAN{
				ID:   2,
				Name: "vlan2",
				VID:  200,
			},
			Space:      "default",
			GatewayIP:  "10.0.0.1",
			DNSServers: []string{"8.8.4.4"},
			Managed:    true,
		},
	}

	mockClient.On("ListSubnets").Return(mockSubnets, nil)

	// Execute
	result, err := service.ListSubnets(ctx, nil)

	// Verify
	assert.NoError(t, err)
	assert.Len(t, result, 2)
	assert.Equal(t, "1", result[0].ID)
	assert.Equal(t, "subnet1", result[0].Name)
	assert.Equal(t, "192.168.1.0/24", result[0].CIDR)
	assert.Equal(t, "vlan1", result[0].VLAN)
	assert.Equal(t, 100, result[0].VLANTag)
	assert.Equal(t, "default", result[0].Space)
	assert.Equal(t, "192.168.1.1", result[0].GatewayIP)
	assert.Equal(t, []string{"8.8.8.8"}, result[0].DNSServers)
	assert.True(t, result[0].Managed)

	// Test case 2: Error from client
	mockClient.On("ListSubnets").Return([]models.Subnet{}, errors.New("client error"))

	// Execute
	result, err = service.ListSubnets(ctx, nil)

	// Verify
	assert.Error(t, err)
	assert.Nil(t, result)
}

func TestGetSubnetDetails(t *testing.T) {
	// Setup
	service, mockClient := setupNetworkService()
	ctx := context.Background()

	// Test case 1: Successful retrieval
	mockSubnet := &models.Subnet{
		ID:   1,
		Name: "subnet1",
		CIDR: "192.168.1.0/24",
		VLAN: &models.VLAN{
			ID:   1,
			Name: "vlan1",
			VID:  100,
		},
		Space:      "default",
		GatewayIP:  "192.168.1.1",
		DNSServers: []string{"8.8.8.8"},
		Managed:    true,
	}

	mockClient.On("GetSubnet", 1).Return(mockSubnet, nil)

	// Execute
	result, err := service.GetSubnetDetails(ctx, 1)

	// Verify
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "1", result.ID)
	assert.Equal(t, "subnet1", result.Name)
	assert.Equal(t, "192.168.1.0/24", result.CIDR)
	assert.Equal(t, "vlan1", result.VLAN)
	assert.Equal(t, 100, result.VLANTag)
	assert.Equal(t, "default", result.Space)
	assert.Equal(t, "192.168.1.1", result.GatewayIP)
	assert.Equal(t, []string{"8.8.8.8"}, result.DNSServers)
	assert.True(t, result.Managed)

	// Test case 2: Invalid ID
	result, err = service.GetSubnetDetails(ctx, 0)
	assert.Error(t, err)
	assert.Nil(t, result)

	// Test case 3: Error from client
	mockClient.On("GetSubnet", 2).Return(nil, errors.New("client error"))

	// Execute
	result, err = service.GetSubnetDetails(ctx, 2)

	// Verify
	assert.Error(t, err)
	assert.Nil(t, result)
}

func TestListVLANs(t *testing.T) {
	// Setup
	service, mockClient := setupNetworkService()
	ctx := context.Background()

	// Test case 1: Successful retrieval
	mockVLANs := []models.VLAN{
		{
			ID:         1,
			Name:       "vlan1",
			VID:        100,
			MTU:        1500,
			FabricID:   1,
			FabricName: "fabric1",
			DHCPOn:     true,
			Primary:    true,
		},
		{
			ID:         2,
			Name:       "vlan2",
			VID:        200,
			MTU:        1500,
			FabricID:   1,
			FabricName: "fabric1",
			DHCPOn:     false,
			Primary:    false,
		},
	}

	mockClient.On("ListVLANs", 1).Return(mockVLANs, nil)

	// Execute
	result, err := service.ListVLANs(ctx, 1)

	// Verify
	assert.NoError(t, err)
	assert.Len(t, result, 2)
	assert.Equal(t, "1", result[0].ID)
	assert.Equal(t, "vlan1", result[0].Name)
	assert.Equal(t, 100, result[0].VID)
	assert.Equal(t, 1500, result[0].MTU)
	assert.Equal(t, "fabric1", result[0].Fabric)
	assert.Equal(t, "1", result[0].FabricID)
	assert.True(t, result[0].DHCPEnabled)
	assert.True(t, result[0].Primary)

	// Test case 2: Invalid fabric ID
	result, err = service.ListVLANs(ctx, 0)
	assert.Error(t, err)
	assert.Nil(t, result)

	// Test case 3: Error from client
	mockClient.On("ListVLANs", 2).Return([]models.VLAN{}, errors.New("client error"))

	// Execute
	result, err = service.ListVLANs(ctx, 2)

	// Verify
	assert.Error(t, err)
	assert.Nil(t, result)
}

func TestFilterSubnets(t *testing.T) {
	// Setup
	subnets := []models.Subnet{
		{
			ID:   1,
			Name: "subnet1",
			CIDR: "192.168.1.0/24",
			VLAN: &models.VLAN{
				ID:   1,
				Name: "vlan1",
			},
			Space: "default",
		},
		{
			ID:   2,
			Name: "subnet2",
			CIDR: "10.0.0.0/24",
			VLAN: &models.VLAN{
				ID:   2,
				Name: "vlan2",
			},
			Space: "dmz",
		},
	}

	// Test case 1: No filters
	result := filterSubnets(subnets, nil)
	assert.Len(t, result, 2)

	// Test case 2: Filter by CIDR
	filters := map[string]string{"cidr": "192.168.1.0/24"}
	result = filterSubnets(subnets, filters)
	assert.Len(t, result, 1)
	assert.Equal(t, "subnet1", result[0].Name)

	// Test case 3: Filter by name
	filters = map[string]string{"name": "subnet2"}
	result = filterSubnets(subnets, filters)
	assert.Len(t, result, 1)
	assert.Equal(t, "subnet2", result[0].Name)

	// Test case 4: Filter by VLAN ID
	filters = map[string]string{"vlan_id": "1"}
	result = filterSubnets(subnets, filters)
	assert.Len(t, result, 1)
	assert.Equal(t, "subnet1", result[0].Name)

	// Test case 5: Filter by space
	filters = map[string]string{"space": "dmz"}
	result = filterSubnets(subnets, filters)
	assert.Len(t, result, 1)
	assert.Equal(t, "subnet2", result[0].Name)

	// Test case 6: Multiple filters
	filters = map[string]string{"space": "default", "cidr": "192.168.1.0/24"}
	result = filterSubnets(subnets, filters)
	assert.Len(t, result, 1)
	assert.Equal(t, "subnet1", result[0].Name)

	// Test case 7: No matches
	filters = map[string]string{"space": "nonexistent"}
	result = filterSubnets(subnets, filters)
	assert.Len(t, result, 0)
}
