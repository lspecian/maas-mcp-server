package resources

import (
	"fmt"
	"strconv"

	"github.com/lspecian/maas-mcp-server/internal/errors"
	"github.com/lspecian/maas-mcp-server/internal/logging"
	"github.com/lspecian/maas-mcp-server/internal/models"
	maasmodels "github.com/lspecian/maas-mcp-server/internal/models/maas"
)

// NetworkResourceMapper handles mapping between MAAS NetworkInterface and MCP NetworkContext
type NetworkResourceMapper struct {
	BaseResourceMapper
}

// NewNetworkResourceMapper creates a new network resource mapper
func NewNetworkResourceMapper(logger *logging.Logger) *NetworkResourceMapper {
	return &NetworkResourceMapper{
		BaseResourceMapper: BaseResourceMapper{
			Name:   "network",
			Logger: logger,
		},
	}
}

// MapToMCP maps a MAAS NetworkInterface to an MCP NetworkContext
func (m *NetworkResourceMapper) MapToMCP(maasResource interface{}) (interface{}, error) {
	iface, ok := maasResource.(*maasmodels.NetworkInterface)
	if !ok {
		return nil, errors.NewValidationError(
			fmt.Sprintf("Expected *maasmodels.NetworkInterface, got %T", maasResource),
			nil,
		)
	}

	// Validate the network interface
	if err := iface.Validate(); err != nil {
		return nil, errors.NewValidationError(
			fmt.Sprintf("Invalid MAAS NetworkInterface: %s", err.Error()),
			err,
		)
	}

	ctx := &models.NetworkContext{
		ID:         idToString(iface.ID),
		Name:       iface.Name,
		Type:       iface.Type,
		MACAddress: iface.MACAddress,
		Enabled:    iface.Enabled,
		Tags:       iface.Tags,
	}

	// Set VLAN info if available
	if iface.VLAN != nil {
		ctx.VLAN = iface.VLAN.Name
		ctx.VLANTag = iface.VLAN.VID
		ctx.MTU = iface.VLAN.MTU
	}

	// Set IP address and subnet info from the first link
	if len(iface.Links) > 0 {
		link := iface.Links[0]
		ctx.IPAddress = link.IPAddress
		if link.Subnet != nil {
			ctx.CIDR = link.Subnet.CIDR
			ctx.Subnet = link.Subnet.Name
		}
		// Set primary flag for the first link with a static IP
		if link.Mode == "static" && link.IPAddress != "" {
			ctx.Primary = true
		}
	}

	return ctx, nil
}

// MapToMaas maps an MCP NetworkContext to a MAAS NetworkInterface
func (m *NetworkResourceMapper) MapToMaas(mcpResource interface{}) (interface{}, error) {
	ctx, ok := mcpResource.(*models.NetworkContext)
	if !ok {
		return nil, errors.NewValidationError(
			fmt.Sprintf("Expected *models.NetworkContext, got %T", mcpResource),
			nil,
		)
	}

	// Validate the network context
	if err := ctx.Validate(); err != nil {
		return nil, errors.NewValidationError(
			fmt.Sprintf("Invalid MCP NetworkContext: %s", err.Error()),
			err,
		)
	}

	// Convert ID from string to int
	id, err := strconv.Atoi(ctx.ID)
	if err != nil {
		m.Logger.WithError(err).Warn("Failed to convert network ID to int, using 0")
		id = 0
	}

	iface := &maasmodels.NetworkInterface{
		ID:         id,
		Name:       ctx.Name,
		Type:       ctx.Type,
		Enabled:    ctx.Enabled,
		MACAddress: ctx.MACAddress,
		Tags:       ctx.Tags,
	}

	// Create VLAN if available
	if ctx.VLAN != "" {
		iface.VLAN = &maasmodels.VLAN{
			Name: ctx.VLAN,
			VID:  ctx.VLANTag,
			MTU:  ctx.MTU,
		}
		// Set a default VLAN ID if not available
		iface.VLANid = 1
	}

	// Create link if IP address is available
	if ctx.IPAddress != "" {
		link := maasmodels.LinkInfo{
			Mode:      "static",
			IPAddress: ctx.IPAddress,
		}

		// Create subnet if available
		if ctx.CIDR != "" {
			link.Subnet = &maasmodels.Subnet{
				Name: ctx.Subnet,
				CIDR: ctx.CIDR,
			}
		}

		iface.Links = []maasmodels.LinkInfo{link}
	}

	return iface, nil
}

// Helper function to convert int ID to string
func idToString(id int) string {
	return fmt.Sprintf("%d", id)
}
