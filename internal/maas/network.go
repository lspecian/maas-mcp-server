package maas

import (
	"fmt"
	"time"

	"github.com/canonical/gomaasclient/client"
	"github.com/canonical/gomaasclient/entity"
	"github.com/sirupsen/logrus"

	"github.com/lspecian/maas-mcp-server/internal/maas/common"
	"github.com/lspecian/maas-mcp-server/internal/models"
)

// networkClient implements the common.NetworkClient interface
type networkClient struct {
	client *client.Client
	logger *logrus.Logger
	retry  common.RetryFunc
}

// newNetworkClient creates a new network client
func newNetworkClient(client *client.Client, logger *logrus.Logger, retry common.RetryFunc) common.NetworkClient {
	return &networkClient{
		client: client,
		logger: logger,
		retry:  retry,
	}
}

// GetSubnet retrieves subnet details.
func (n *networkClient) GetSubnet(id int) (*models.Subnet, error) {
	var entitySubnet *entity.Subnet
	operation := func() error {
		var err error
		entitySubnet, err = n.client.Subnet.Get(id)
		if err != nil {
			n.logger.Errorf("MAAS API error getting subnet %d: %v", id, err)
			return fmt.Errorf("maas API error getting subnet %d: %w", id, err)
		}
		return nil
	}

	err := n.retry(operation, 3, 2*time.Second)
	if err != nil {
		return nil, err
	}
	var modelSubnet models.Subnet
	modelSubnet.FromEntity(entitySubnet)
	return &modelSubnet, nil
}

// ListSubnets retrieves all subnets.
func (n *networkClient) ListSubnets() ([]models.Subnet, error) {
	var entitySubnets []entity.Subnet
	operation := func() error {
		var err error
		entitySubnets, err = n.client.Subnets.Get()
		if err != nil {
			n.logger.Errorf("MAAS API error listing subnets: %v", err)
			return fmt.Errorf("maas API error listing subnets: %w", err)
		}
		return nil
	}

	err := n.retry(operation, 3, 2*time.Second)
	if err != nil {
		return nil, err
	}
	modelSubnets := make([]models.Subnet, len(entitySubnets))
	for i, es := range entitySubnets {
		var ms models.Subnet
		ms.FromEntity(&es)
		modelSubnets[i] = ms
	}
	return modelSubnets, nil
}

// ListVLANs retrieves VLANs for a specific fabric.
func (n *networkClient) ListVLANs(fabricID int) ([]models.VLAN, error) {
	var entityVLANs []entity.VLAN
	operation := func() error {
		var err error
		// gomaasclient.VLANs.Get() takes fabricID
		entityVLANs, err = n.client.VLANs.Get(fabricID)
		if err != nil {
			n.logger.Errorf("MAAS API error listing VLANs for fabric %d: %v", fabricID, err)
			return fmt.Errorf("MAAS API error listing VLANs for fabric %d: %w", fabricID, err)
		}
		return nil
	}

	err := n.retry(operation, 3, 2*time.Second)
	if err != nil {
		return nil, err
	}

	modelVLANs := make([]models.VLAN, len(entityVLANs))
	for i, ev := range entityVLANs {
		var mv models.VLAN
		mv.FromEntity(&ev)
		modelVLANs[i] = mv
	}
	return modelVLANs, nil
}

// GetMachineInterfaces retrieves network interfaces for a specific machine.
// This is not directly part of NetworkClient but useful for machine details.
func (n *networkClient) GetMachineInterfaces(systemID string) ([]models.NetworkInterface, error) {
	var entityInterfaces []entity.NetworkInterface
	operation := func() error {
		var err error
		entityInterfaces, err = n.client.NetworkInterfaces.Get(systemID)
		if err != nil {
			n.logger.Errorf("MAAS API error getting network interfaces for machine %s: %v", systemID, err)
			return fmt.Errorf("maas API error getting network interfaces for machine %s: %w", systemID, err)
		}
		return nil
	}

	err := n.retry(operation, 3, 2*time.Second)
	if err != nil {
		return nil, err
	}
	modelInterfaces := make([]models.NetworkInterface, len(entityInterfaces))
	for i, ei := range entityInterfaces {
		var mi models.NetworkInterface
		mi.FromEntity(&ei)
		modelInterfaces[i] = mi
	}
	return modelInterfaces, nil
}
