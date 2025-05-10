package service

import (
	"github.com/lspecian/maas-mcp-server/internal/maasclient"
	"github.com/lspecian/maas-mcp-server/internal/models"
)

// NetworkClientWrapper wraps the MaasClient to implement the NetworkClient interface
type NetworkClientWrapper struct {
	client *maasclient.MaasClient
}

// NewNetworkClientWrapper creates a new NetworkClientWrapper
func NewNetworkClientWrapper(client *maasclient.MaasClient) *NetworkClientWrapper {
	return &NetworkClientWrapper{
		client: client,
	}
}

// ListSubnets retrieves all subnets
func (w *NetworkClientWrapper) ListSubnets() ([]models.Subnet, error) {
	return w.client.ListSubnets()
}

// GetSubnet retrieves details for a specific subnet
func (w *NetworkClientWrapper) GetSubnet(id int) (*models.Subnet, error) {
	return w.client.GetSubnet(id)
}

// ListVLANs retrieves VLANs for a specific fabric
func (w *NetworkClientWrapper) ListVLANs(fabricID int) ([]models.VLAN, error) {
	return w.client.ListVLANs(fabricID)
}
