package service

import (
	"context"
	"fmt"
	"net/http"

	"github.com/sirupsen/logrus"

	"github.com/lspecian/maas-mcp-server/internal/models"
)

// NetworkClient defines the interface for MAAS client operations needed by the network service
type NetworkClient interface {
	// ListSubnets retrieves all subnets
	ListSubnets() ([]models.Subnet, error)

	// GetSubnet retrieves details for a specific subnet
	GetSubnet(id int) (*models.Subnet, error)

	// ListVLANs retrieves VLANs for a specific fabric
	ListVLANs(fabricID int) ([]models.VLAN, error)
}

// NetworkService handles network management operations
type NetworkService struct {
	maasClient NetworkClient
	logger     *logrus.Logger
}

// NewNetworkService creates a new network service instance
func NewNetworkService(client NetworkClient, logger *logrus.Logger) *NetworkService {
	return &NetworkService{
		maasClient: client,
		logger:     logger,
	}
}

// ListSubnets retrieves a list of subnets with optional filtering
func (s *NetworkService) ListSubnets(ctx context.Context, filters map[string]string) ([]models.SubnetContext, error) {
	s.logger.WithFields(logrus.Fields{
		"filters": filters,
	}).Debug("Listing subnets")

	// Validate filters if needed
	if err := validateSubnetFilters(filters); err != nil {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    fmt.Sprintf("Invalid filters: %v", err),
		}
	}

	// Call MAAS client to list subnets
	subnets, err := s.maasClient.ListSubnets()
	if err != nil {
		s.logger.WithError(err).Error("Failed to list subnets from MAAS")
		return nil, mapClientError(err)
	}

	// Apply filters that can't be applied at the API level
	filteredSubnets := filterSubnets(subnets, filters)

	// Convert MAAS subnets to MCP context
	result := make([]models.SubnetContext, len(filteredSubnets))
	for i, subnet := range filteredSubnets {
		subnetContext := models.MaasSubnetToMCPContext(&subnet)
		result[i] = *subnetContext
	}

	s.logger.WithField("count", len(result)).Debug("Successfully retrieved subnets")
	return result, nil
}

// GetSubnetDetails retrieves details for a specific subnet
func (s *NetworkService) GetSubnetDetails(ctx context.Context, id int) (*models.SubnetContext, error) {
	s.logger.WithField("id", id).Debug("Getting subnet by ID")

	// Validate ID
	if id <= 0 {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Valid subnet ID is required",
		}
	}

	// Call MAAS client to get subnet
	subnet, err := s.maasClient.GetSubnet(id)
	if err != nil {
		s.logger.WithError(err).WithField("id", id).Error("Failed to get subnet from MAAS")
		return nil, mapClientError(err)
	}

	// Convert MAAS subnet to MCP context
	result := models.MaasSubnetToMCPContext(subnet)

	s.logger.WithField("id", id).Debug("Successfully retrieved subnet")
	return result, nil
}

// ListVLANs retrieves VLANs within a specific fabric
func (s *NetworkService) ListVLANs(ctx context.Context, fabricID int) ([]models.VLANContext, error) {
	s.logger.WithField("fabric_id", fabricID).Debug("Listing VLANs for fabric")

	// Validate fabric ID
	if fabricID <= 0 {
		return nil, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Valid fabric ID is required",
		}
	}

	// Call MAAS client to list VLANs
	vlans, err := s.maasClient.ListVLANs(fabricID)
	if err != nil {
		s.logger.WithError(err).WithField("fabric_id", fabricID).Error("Failed to list VLANs from MAAS")
		return nil, mapClientError(err)
	}

	// Convert MAAS VLANs to MCP context
	result := make([]models.VLANContext, len(vlans))
	for i, vlan := range vlans {
		vlanContext := models.MaasVLANToMCPContext(&vlan)
		result[i] = *vlanContext
	}

	s.logger.WithFields(logrus.Fields{
		"fabric_id": fabricID,
		"count":     len(result),
	}).Debug("Successfully retrieved VLANs")
	return result, nil
}

// Helper functions

// validateSubnetFilters validates subnet listing filters
func validateSubnetFilters(filters map[string]string) error {
	// Implement validation logic for filters
	// For now, accept all filters as valid
	return nil
}

// filterSubnets applies filters to subnets that couldn't be applied at the API level
func filterSubnets(subnets []models.Subnet, filters map[string]string) []models.Subnet {
	// If no filters, return all subnets
	if len(filters) == 0 {
		return subnets
	}

	// Apply filters
	result := make([]models.Subnet, 0, len(subnets))
	for _, subnet := range subnets {
		// Apply CIDR filter if provided
		if cidr, ok := filters["cidr"]; ok && cidr != "" && subnet.CIDR != cidr {
			continue
		}

		// Apply name filter if provided
		if name, ok := filters["name"]; ok && name != "" && subnet.Name != name {
			continue
		}

		// Apply VLAN filter if provided
		if vlanID, ok := filters["vlan_id"]; ok && vlanID != "" {
			if subnet.VLAN == nil || fmt.Sprintf("%d", subnet.VLAN.ID) != vlanID {
				continue
			}
		}

		// Apply space filter if provided
		if space, ok := filters["space"]; ok && space != "" && subnet.Space != space {
			continue
		}

		// Apply fabric_id filter if provided
		if fabricIDStr, ok := filters["fabric_id"]; ok && fabricIDStr != "" {
			fabricID, err := parseInt(fabricIDStr) // Using existing parseInt helper
			if err == nil {                        // Only filter if fabricIDStr is a valid integer
				if subnet.FabricID != fabricID {
					continue
				}
			}
			// If fabricIDStr is not a valid int, we might choose to ignore the filter or return an error.
			// For now, ignoring malformed fabric_id filter.
		}

		// Subnet passed all filters
		result = append(result, subnet)
	}

	return result
}
